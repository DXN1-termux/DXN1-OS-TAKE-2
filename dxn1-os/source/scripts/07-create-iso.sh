#!/bin/bash
# =============================================================================
# Stage 07 — Create bootable ISO
# -----------------------------------------------------------------------------
# Produces the bootable DXN1-OS installer ISO at
#   ${DXN1_ISO_DIR}/${DXN1_ISO}
#
# The ISO is BIOS + UEFI hybrid-bootable:
#   * BIOS boot via isolinux (ldlinux.c32, isolinux.bin)
#   * UEFI boot via grub-mkrescue with grub-efi-amd64
#
# The rootfs is shipped as a squashfs image (`rootfs.sqfs`) mounted by the
# initrd/initramfs at boot, so the ISO stays small (the squashfs typically
# compresses the ~2 GiB rootfs down to ~700 MiB).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/config/environment"

if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[%s]%s %s\n'  "${C_B}" "$(date +%H:%M:%S)" "${C_0}" "$*"; }
success() { printf '%s✓ %s%s%s\n'   "${C_G}" "$*" "${C_0}"; }
warn()    { printf '%s! %s%s%s\n'   "${C_Y}" "$*" "${C_0}" >&2; }
die()     { printf '%s✗ %s%s%s\n'   "${C_R}" "$*" "${C_0}" >&2; exit 1; }
trap 'die "Stage 07 aborted at line $LINENO (exit $?)"' ERR

ISO_DIR="${DXN1_ISO_DIR}"
WORK_DIR="$(mktemp -d -t dxn1-iso.XXXXXX)"
trap 'rm -rf "${WORK_DIR}"' EXIT

ISO_PATH="${ISO_DIR}/${DXN1_ISO}"
SQFS_PATH="${ISO_DIR}/rootfs.sqfs"

mkdir -p "${ISO_DIR}"
[[ -d "${DXN1_ROOTFS}/usr/bin" ]] || die "Rootfs not built. Run stage 04 first."

# ---------------------------------------------------------------------------
# 1. Build a squashfs image of the rootfs. Exclude transient pseudo-filesystems.
# ---------------------------------------------------------------------------
log "Building squashfs from ${DXN1_ROOTFS}…"
# Strip the bind-mounted /tools and pseudo-fs from the squashfs; they'd be
# useless on the booted ISO.
EXCLUDE_FILE="$(mktemp -t dxn1-excludes.XXXXXX)"
cat > "${EXCLUDE_FILE}" <<'EOF'
proc
sys
dev
run
tmp
tools
var/cache/dxn1/build
var/lib/dxn1/state
EOF

mksquashfs "${DXN1_ROOTFS}" "${SQFS_PATH}" \
    -comp zstd -Xcompression-level 19 -b 1M \
    -noappend -no-progress -ef "${EXCLUDE_FILE}" \
    2>&1 | tail -n 5
rm -f "${EXCLUDE_FILE}"
success "squashfs: ${SQFS_PATH} ($(du -h "${SQFS_PATH}" | cut -f1))"

# ---------------------------------------------------------------------------
# 2. Stage the ISO directory tree.
# ---------------------------------------------------------------------------
log "Staging ISO tree at ${WORK_DIR}…"
install -d -m 0755 "${WORK_DIR}/isolinux" "${WORK_DIR}/boot/grub" \
                   "${WORK_DIR}/EFI/BOOT"  "${WORK_DIR}/dxn1"

# Kernel + initramfs (the squashfs IS the rootfs, mounted by init).
install -D -m 0644 "${DXN1_KERNEL_DIR}/bzImage" "${WORK_DIR}/boot/vmlinuz"
install -D -m 0644 "${DXN1_KERNEL_DIR}/config"  "${WORK_DIR}/boot/config"
cp -a "${SQFS_PATH}" "${WORK_DIR}/dxn1/rootfs.sqfs"

# ---------------------------------------------------------------------------
# 3. Build a tiny initramfs that mounts the squashfs and pivots to it.
# ---------------------------------------------------------------------------
INITRAMFS_DIR="$(mktemp -d -t dxn1-initramfs.XXXXXX)"
install -d -m 0755 "${INITRAMFS_DIR}/bin" "${INITRAMFS_DIR}/dev" \
                   "${INITRAMFS_DIR}/proc" "${INITRAMFS_DIR}/sys" \
                   "${INITRAMFS_DIR}/mnt/root"

# Busybox provides everything we need.
if [[ -x "${DXN1_ROOTFS}/bin/busybox" ]]; then
    install -D -m 0755 "${DXN1_ROOTFS}/bin/busybox" "${INITRAMFS_DIR}/bin/busybox"
elif command -v busybox >/dev/null 2>&1; then
    install -D -m 0755 "$(command -v busybox)" "${INITRAMFS_DIR}/bin/busybox"
else
    die "busybox not available for initramfs."
fi
for applet in sh mount umount switch_root mkdir mknod sleep cat echo losetup; do
    ln -sf busybox "${INITRAMFS_DIR}/bin/${applet}"
done

cat > "${INITRAMFS_DIR}/init" <<'EOF'
#!/bin/busybox sh
set -eu
/bin/busybox --install -s /bin
mount -t proc none /proc
mount -t sysfs none /sys
mount -t devtmpfs none /dev 2>/dev/null || mdev -s

# Find the squashfs by label or by scanning block devices.
SQFS=""
for dev in /dev/sr0 /dev/sda1 /dev/sdb1 /dev/nvme0n1p1 /dev/mmcblk0p1; do
    [ -e "${dev}" ] || continue
    if losetup -f -r -P "${dev}" 2>/dev/null; then :; fi
    mount -t iso9660 -o ro "${dev}" /mnt/root 2>/dev/null || continue
    if [ -e /mnt/root/dxn1/rootfs.sqfs ]; then
        SQFS=/mnt/root/dxn1/rootfs.sqfs
        break
    fi
    umount /mnt/root 2>/dev/null || true
done

[ -n "${SQFS}" ] || { echo "DXN1-OS: no squashfs found, dropping to shell."; exec /bin/sh; }

mkdir -p /mnt/ro /mnt/rw
losetup /dev/loop0 "${SQFS}"
mount -t squashfs -o ro /dev/loop0 /mnt/ro
mount -t tmpfs -o size=512M none /mnt/rw

# Overlay would need overlayfs; for simplicity, mount ro + tmpfs on top of
# selected writable dirs (this is the installer ISO, writable layers are not
# required to run the installer).
mount --bind /mnt/rw /mnt/ro/run 2>/dev/null || true
mount --bind /mnt/rw /mnt/ro/tmp 2>/dev/null || true

echo "DXN1-OS: switching to rootfs…"
exec switch_root /mnt/ro /sbin/init
EOF
chmod 0755 "${INITRAMFS_DIR}/init"

# Pack the initramfs as a gzip-compressed cpio (newc format).
( cd "${INITRAMFS_DIR}" && find . -print0 | \
    cpio --null -o --format=newc 2>/dev/null | \
    gzip -9 ) > "${WORK_DIR}/boot/initramfs.img"
rm -rf "${INITRAMFS_DIR}"
success "initramfs: $(du -h "${WORK_DIR}/boot/initramfs.img" | cut -f1)"

# ---------------------------------------------------------------------------
# 4. isolinux config (BIOS boot path).
# ---------------------------------------------------------------------------
cat > "${WORK_DIR}/isolinux/isolinux.cfg" <<'EOF'
SERIAL 0 115200
UI menu.c32
PROMPT 0
TIMEOUT 50
DEFAULT dxn1

MENU TITLE DXN1-OS 1.0 — installer

LABEL dxn1
    MENU LABEL DXN1-OS 1.0 (default)
    KERNEL /boot/vmlinuz
    APPEND initrd=/boot/initramfs.img root=live:LABEL=DXN1OS_1.0 quiet net.ifnames=0

LABEL dxn1-nomodeset
    MENU LABEL DXN1-OS 1.0 (no modeset, recovery)
    KERNEL /boot/vmlinuz
    APPEND initrd=/boot/initramfs.img root=live:LABEL=DXN1OS_1.0 nomodeset 3

LABEL hdt
    MENU LABEL Hardware Detection Tool
    KERNEL hdt.c32

LABEL reboot
    MENU LABEL Reboot
    COM32 reboot.c32
EOF

# Copy isolinux files. They live in /usr/lib/syslinux/ or /usr/lib/ISOLINUX/.
ISOLINUX_DIR=""
for d in /usr/lib/ISOLINUX /usr/lib/syslinux/bios /usr/share/syslinux \
         /usr/lib/syslinux/modules/bios; do
    [[ -f "${d}/isolinux.bin" ]] && ISOLINUX_DIR="${d}" && break
done
[[ -n "${ISOLINUX_DIR}" ]] || die "isolinux.bin not found. Install the syslinux package."
for f in isolinux.bin ldlinux.c32 menu.c32 libutil.c32 libcom32.c32 reboot.c32 \
         hdt.c32 libmenu.c32 vesamenu.c32; do
    [[ -f "${ISOLINUX_DIR}/${f}" ]] && cp "${ISOLINUX_DIR}/${f}" "${WORK_DIR}/isolinux/"
done

# ---------------------------------------------------------------------------
# 5. grub config (UEFI boot path).
# ---------------------------------------------------------------------------
cat > "${WORK_DIR}/boot/grub/grub.cfg" <<'EOF'
set default=0
set timeout=5
insmod all_video
insmod ext2
insmod iso9660
insmod loopback

serial --unit=0 --speed=115200
terminal_input serial console
terminal_output serial console

menuentry "DXN1-OS 1.0 (default)" {
    linux /boot/vmlinuz root=live:LABEL=DXN1OS_1.0 quiet net.ifnames=0
    initrd /boot/initramfs.img
}
menuentry "DXN1-OS 1.0 (no modeset, recovery)" {
    linux /boot/vmlinuz root=live:LABEL=DXN1OS_1.0 nomodeset 3
    initrd /boot/initramfs.img
}
menuentry "Reboot" { reboot }
menuentry "Power off" { halt }
EOF

# ---------------------------------------------------------------------------
# 6. Assemble the ISO with xorriso (asPI/UEFI hybrid).
# ---------------------------------------------------------------------------
log "Assembling ISO with xorriso…"
xorriso -as mkisofs \
    -r -V "${DXN1_ISO_LABEL}" \
    -publisher "${DXN1_ISO_PUBLISHER}" \
    -J -joliet-long \
    -isohybrid-mbr "${ISOLINUX_DIR}/isohdpfx.bin" \
    -b isolinux/isolinux.bin \
    -c isolinux/boot.cat \
    -no-emul-boot -boot-load-size 4 -boot-info-table \
    -eltorito-alt-boot \
    -e EFI/BOOT/BOOTX64.EFI \
    -no-emul-boot -isohybrid-gpt-basdat \
    -o "${ISO_PATH}" "${WORK_DIR}" 2>&1 | tail -n 20 || \
    die "xorriso failed."

# Generate UEFI boot image if grub-mkstandalone is present.
if command -v grub-mkstandalone >/dev/null 2>&1; then
    log "Building UEFI boot image (BOOTX64.EFI)…"
    install -d "${WORK_DIR}/EFI/BOOT"
    grub-mkstandalone -O x86_64-efi \
        --modules="part_gpt part_msdos fat ext2 iso9660 linux normal" \
        --install-modules="part_gpt part_msdos fat ext2 iso9660 linux normal" \
        --boot-directory=/boot \
        -o "${WORK_DIR}/EFI/BOOT/BOOTX64.EFI" \
        "${WORK_DIR}/boot/grub/grub.cfg"
    # Re-assemble to include the EFI binary.
    xorriso -as mkisofs \
        -r -V "${DXN1_ISO_LABEL}" \
        -publisher "${DXN1_ISO_PUBLISHER}" \
        -J -joliet-long \
        -isohybrid-mbr "${ISOLINUX_DIR}/isohdpfx.bin" \
        -b isolinux/isolinux.bin \
        -c isolinux/boot.cat \
        -no-emul-boot -boot-load-size 4 -boot-info-table \
        -eltorito-alt-boot -e EFI/BOOT/BOOTX64.EFI \
        -no-emul-boot -isohybrid-gpt-basdat \
        -o "${ISO_PATH}" "${WORK_DIR}" 2>&1 | tail -n 5 || \
        die "xorriso (UEFI) failed."
fi

# ---------------------------------------------------------------------------
# 7. Generate the SHA-256 manifest.
# ---------------------------------------------------------------------------
sha256sum "${ISO_PATH}" > "${ISO_PATH}.sha256"
success "ISO: ${ISO_PATH} ($(du -h "${ISO_PATH}" | cut -f1))"
success "SHA256: ${ISO_PATH}.sha256"

printf '%s\n' "$(date -Is)" > "${DXN1_STATE_DIR}/stage-07.done"
success "Stage 07 complete."
