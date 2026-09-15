#!/bin/bash
# =============================================================================
# DXN1-OS installer — post-install configuration
# -----------------------------------------------------------------------------
# Runs after the rootfs has been copied onto the target disk (stage 06).
# Responsibilities:
#   * Set the system timezone (default UTC).
#   * Generate the system locale(s).
#   * Set the keyboard layout (vconsole.conf).
#   * Install / refresh GRUB if requested.
#   * Re-generate /etc/fstab with the live UUIDs.
#   * Mark the install complete in /etc/dxn1-install-info.
# =============================================================================
set -euo pipefail

if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[%s]%s %s\n'  "${C_B}" "$(date +%H:%M:%S)" "${C_0}" "$*"; }
success() { printf '%s✓ %s%s%s\n'   "${C_G}" "$*" "${C_0}"; }
warn()    { printf '%s! %s%s%s\n'   "${C_Y}" "$*" "${C_0}" >&2; }
die()     { printf '%s✗ %s%s%s\n'   "${C_R}" "$*" "${C_0}" >&2; exit 1; }

ROOT="${1:-}"
TIMEZONE="${TIMEZONE:-UTC}"
LOCALE="${LOCALE:-C.UTF-8}"
KEYMAP="${KEYMAP:-us}"
HOSTNAME="${HOSTNAME:-dxn1-os}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --root)      ROOT="$2"; shift 2 ;;
        --timezone)  TIMEZONE="$2"; shift 2 ;;
        --locale)    LOCALE="$2"; shift 2 ;;
        --keymap)    KEYMAP="$2"; shift 2 ;;
        --hostname)  HOSTNAME="$2"; shift 2 ;;
        -h|--help)   sed -n '2,20p' "$0"; exit 0 ;;
        *) die "Unknown arg: $1" ;;
    esac
done

[[ -n "${ROOT}" ]]            || die "--root <dir> is required."
[[ -d "${ROOT}"               ]] || die "Target root does not exist: ${ROOT}"
[[ -d "${ROOT}/usr/bin" ]]     || die "Not a populated rootfs: ${ROOT}"

log "Post-install config on ${ROOT} (tz=${TIMEZONE}, locale=${LOCALE})"

# ---------------------------------------------------------------------------
# 1. Hostname.
# ---------------------------------------------------------------------------
echo "${HOSTNAME}" > "${ROOT}/etc/hostname"
success "Hostname: ${HOSTNAME}"

# ---------------------------------------------------------------------------
# 2. Timezone.
# ---------------------------------------------------------------------------
if [[ -f "${ROOT}/usr/share/zoneinfo/$(dirname "${TIMEZONE}")/$(basename "${TIMEZONE}")" ]]; then
    ln -sf "/usr/share/zoneinfo/${TIMEZONE}" "${ROOT}/etc/localtime"
    success "Timezone: ${TIMEZONE}"
elif [[ "${TIMEZONE}" == "UTC" ]]; then
    ln -sf /usr/share/zoneinfo/Etc/UTC "${ROOT}/etc/localtime" 2>/dev/null || \
        warn "UTC zoneinfo not present; system will default to kernel RTC."
else
    warn "Timezone ${TIMEZONE} not available — leaving at UTC."
    ln -sf /usr/share/zoneinfo/Etc/UTC "${ROOT}/etc/localtime" 2>/dev/null || true
fi

# Write /etc/timezone for tools that read it.
echo "${TIMEZONE}" > "${ROOT}/etc/timezone"

# ---------------------------------------------------------------------------
# 3. Locale.
# ---------------------------------------------------------------------------
install -d -m 0755 "${ROOT}/etc"
cat > "${ROOT}/etc/locale.conf" <<EOF
LANG=${LOCALE}
LC_COLLATE=C
EOF

# Build the locale definition if localedef is installed in the target.
if [[ -x "${ROOT}/usr/bin/localedef" ]]; then
    log "Generating locale ${LOCALE}…"
    chroot "${ROOT}" /usr/bin/localedef -i "${LOCALE%.*}" -f UTF-8 "${LOCALE}" 2>/dev/null \
        || warn "localedef failed for ${LOCALE} (continuing — /etc/locale.conf still set)."
fi

# ---------------------------------------------------------------------------
# 4. Console keymap.
# ---------------------------------------------------------------------------
cat > "${ROOT}/etc/vconsole.conf" <<EOF
KEYMAP=${KEYMAP}
FONT=eurlatgr
EOF
success "vconsole.conf: KEYMAP=${KEYMAP}"

# ---------------------------------------------------------------------------
# 5. Re-generate fstab with live UUIDs (defensive — stage 06 already does
#    this, but we re-do it in case partitions were re-labelled).
# ---------------------------------------------------------------------------
ROOT_PART=$(findmnt -no SOURCE "${ROOT}" 2>/dev/null || true)
if [[ -n "${ROOT_PART}" ]] && [[ -b "${ROOT_PART}" ]]; then
    ROOT_UUID=$(blkid -s UUID -o value "${ROOT_PART}")
    {
        echo "# /etc/fstab — finalized by DXN1-OS post-install ($(date -Is))"
        echo "# <fs>                       <mount>  <type>  <opts>                    <dump> <pass>"
        echo "UUID=${ROOT_UUID}             /        ext4    defaults,noatime          0      1"
        echo "proc                          /proc    proc    defaults                  0      0"
        echo "sysfs                         /sys     sysfs   defaults                  0      0"
        echo "devtmpfs                      /dev     devtmpfs mode=0755,nosuid          0      0"
        echo "tmpfs                         /run     tmpfs   defaults,nosuid,nodev     0      0"
        echo "tmpfs                         /tmp     tmpfs   defaults,nosuid,nodev     0      0"
    } > "${ROOT}/etc/fstab.tmp"

    # Append any swap that's currently on.
    while read -r dev _ _ _ _; do
        if [[ -b "${dev}" ]]; then
            suuid=$(blkid -s UUID -o value "${dev}")
            echo "UUID=${suuid}                 swap     swap    pri=1                     0      0" >> "${ROOT}/etc/fstab.tmp"
        fi
    done < <(swapon --show=NAME 2>/dev/null || true)

    mv "${ROOT}/etc/fstab.tmp" "${ROOT}/etc/fstab"
    chmod 0644 "${ROOT}/etc/fstab"
    success "fstab finalized (root UUID=${ROOT_UUID})"
fi

# ---------------------------------------------------------------------------
# 6. Install marker.
# ---------------------------------------------------------------------------
cat > "${ROOT}/etc/dxn1-install-info" <<EOF
DXN1_OS_NAME=DXN1-OS
DXN1_OS_VERSION=${LFS_VERSION:-1.0}
INSTALL_DATE=$(date -Is)
INSTALL_HOST=$(hostname -f 2>/dev/null || hostname)
INSTALL_KERNEL=$(uname -r)
TIMEZONE=${TIMEZONE}
LOCALE=${LOCALE}
EOF
chmod 0644 "${ROOT}/etc/dxn1-install-info"

# ---------------------------------------------------------------------------
# 7. (Optional) Install GRUB into the target — only if requested and the
# binary exists.
# ---------------------------------------------------------------------------
if [[ "${INSTALL_GRUB:-0}" == "1" ]]; then
    if [[ -x "${ROOT}/usr/sbin/grub-install" ]]; then
        log "Installing GRUB into target…"
        DISK=$(findmnt -no SOURCE "${ROOT}" 2>/dev/null | sed 's/[0-9]*$//')
        for sub in dev proc sys run; do
            mount --bind "/${sub}" "${ROOT}/${sub}" 2>/dev/null || true
        done
        if [[ -d /sys/firmware/efi ]]; then
            install -d -m 0755 "${ROOT}/boot/efi"
            # Find the ESP on the target disk.
            ESP_PART=$(lsblk -no NAME,PARTTYPENAME "$(findmnt -no SOURCE "${ROOT}")" 2>/dev/null | awk '/c12a7328/{print $1}' | head -n1 || true)
            if [[ -n "${ESP_PART}" ]] && [[ -b "/dev/${ESP_PART}" ]]; then
                mount "/dev/${ESP_PART}" "${ROOT}/boot/efi"
                chroot "${ROOT}" /usr/sbin/grub-install \
                    --target=x86_64-efi \
                    --efi-directory=/boot/efi \
                    --bootloader-id=DXN1-OS --recheck
                umount "${ROOT}/boot/efi" 2>/dev/null || true
            fi
        else
            chroot "${ROOT}" /usr/sbin/grub-install \
                --target=i386-pc --boot-directory=/boot "${DISK}"
        fi
        for sub in dev proc sys run; do
            umount "${ROOT}/${sub}" 2>/dev/null || true
        done
        success "GRUB installed into target."
    else
        warn "grub-install not present on target — skipping."
    fi
fi

sync
success "Post-install complete on ${ROOT}."
