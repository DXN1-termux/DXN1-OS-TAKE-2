#!/bin/bash
# =============================================================================
# Stage 05 — Driver stack build
# -----------------------------------------------------------------------------
# Builds the DXN1-OS userspace driver stack and the in-tree kernel modules
# that need a separate build pass (mostly out-of-tree firmware loaders and
# mesa). Each driver class lives in drivers/<class>/build.sh and is invoked
# here with a chroot into the stage 04 rootfs.
#
#   gpu      — mesa, libdrm, amdgpu/nouveau/i915 module load helpers
#   network  — wired NIC modules + ethtool
#   audio    — alsa-lib, alsa-utils, pipewire, snd-hda-intel
#   input    — libinput, evdev, synaptics X drivers
#   wifi     — iwd, wpa_supplicant, iwlwifi/ath/brcm firmware
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
trap 'die "Stage 05 aborted at line $LINENO (exit $?)"' ERR

# Class → driver script path.
declare -a DRIVERS=(
    "gpu|drivers/gpu/build.sh"
    "network|drivers/network/build.sh"
    "audio|drivers/audio/build.sh"
    "input|drivers/input/build.sh"
    "wifi|drivers/wifi/build.sh"
)

# Verify rootfs exists (stage 04 must have completed).
[[ -d "${DXN1_ROOTFS}/usr/bin" ]] || die "Rootfs not ready: ${DXN1_ROOTFS}. Run stage 04 first."
[[ -d "${DXN1_ROOTFS}/tools"  ]] || die "Toolchain bind-mount missing."

# Bind-mount host /dev /proc /sys so the chroot can talk to modprobe/udev.
log "Preparing chroot for driver builds…"
mount --bind /dev  "${DXN1_ROOTFS}/dev"  2>/dev/null || true
mount --bind /proc "${DXN1_ROOTFS}/proc" 2>/dev/null || true
mount --bind /sys  "${DXN1_ROOTFS}/sys"  2>/dev/null || true
mount --bind /tools "${DXN1_ROOTFS}/tools" 2>/dev/null || true
# Driver scripts need access to the source tree to copy tarballs in.
mount --bind "${SCRIPT_DIR}" "${DXN1_ROOTFS}/usr/src/dxn1" 2>/dev/null || true

cleanup() {
    log "Tearing down stage-05 chroot mounts…"
    for m in dev proc sys tools usr/src/dxn1; do
        umount -R "${DXN1_ROOTFS}/${m}" 2>/dev/null || true
    done
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Run each driver build script inside the chroot.
# ---------------------------------------------------------------------------
for entry in "${DRIVERS[@]}"; do
    IFS='|' read -r class relpath <<< "$entry"
    local_path="${SCRIPT_DIR}/${relpath}"
    [[ -x "${local_path}" ]] || die "Driver script not executable: ${local_path}"

    # Copy the driver script into the chroot /tmp so it survives the boundary.
    install -D -m 0755 "${local_path}" "${DXN1_ROOTFS}/tmp/driver-${class}.sh"

    log "Building driver class: ${class}"
    local logfile="${DXN1_LOG_DIR}/stage-05-${class}.log"
    : > "${logfile}"

    if ! chroot "${DXN1_ROOTFS}" /tools/bin/env -i \
            HOME=/root TERM="${TERM:-linux}" \
            PATH=/tools/bin:/usr/bin:/bin:/usr/sbin:/sbin \
            DXN1_ROOTFS=/ DXN1_IN_CHROOT=1 \
            /bin/bash /tmp/driver-${class}.sh >> "${logfile}" 2>&1; then
        tail -n 40 "${logfile}" >&2
        die "Driver build failed: ${class} (see ${logfile})"
    fi

    success "Driver class '${class}' built (log: ${logfile})"
    rm -f "${DXN1_ROOTFS}/tmp/driver-${class}.sh"
done

# ---------------------------------------------------------------------------
# Finalise: build a modules.dep + modprobe aliases database.
# ---------------------------------------------------------------------------
log "Regenerating modules.dep…"
if [[ -x "${DXN1_ROOTFS}/sbin/depmod" ]]; then
    KVER=$(ls "${DXN1_ROOTFS}/lib/modules" 2>/dev/null | head -n1 || true)
    if [[ -n "${KVER}" ]]; then
        chroot "${DXN1_ROOTFS}" /sbin/depmod -a "${KVER}" 2>&1 | tee -a "${DXN1_LOG_DIR}/stage-05-depmod.log"
        success "modules.dep regenerated for ${KVER}."
    fi
fi

# Blacklist drivers that are known-bad in DXN1-OS.
install -d -m 0755 "${DXN1_ROOTFS}/etc/modprobe.d"
cat > "${DXN1_ROOTFS}/etc/modprobe.d/dxn1-blacklist.conf" <<'EOF'
# DXN1-OS driver blacklist.
# Disables drivers that conflict with the supported set.
blacklist nouveau        # replaced by amdgpu on dual-GPU laptops where applicable
blacklist rivafb
blacklist nvidiafb
EOF

printf '%s\n' "$(date -Is)" > "${DXN1_STATE_DIR}/stage-05.done"
success "Stage 05 complete. All driver classes built."
