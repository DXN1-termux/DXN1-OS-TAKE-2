#!/bin/bash
# =============================================================================
# Stage 03 — Kernel build
# -----------------------------------------------------------------------------
# Builds the Linux kernel against the stage 02 toolchain. Produces:
#
#   ${DXN1_KERNEL_DIR}/bzImage            Compressed kernel image
#   ${DXN1_KERNEL_DIR}/System.map        Symbol map
#   ${DXN1_KERNEL_DIR}/config             Final .config used
#   ${DXN1_KERNEL_DIR}/modules.tar.xz    All in-tree =m modules, installable
#                                        into the target rootfs
#
# The DXN1-OS kernel config excerpt (config/kernel.config) is concatenated onto
# `make defconfig` and then run through `make olddefconfig` to fill gaps.
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
trap 'die "Stage 03 aborted at line $LINENO (exit $?)"' ERR

LINUX_VERSION="6.10.5"
SRC_DIR="${DXN1_SOURCES}/linux-${LINUX_VERSION}"
STAMP="${DXN1_STATE_DIR}/stage-03.stamp"

# Reuse the tarball cached by stage 02 if present, otherwise fetch it now.
if [[ ! -d "${SRC_DIR}" ]]; then
    log "Fetching linux-${LINUX_VERSION}…"
    tbz="${DXN1_TARBALL_CACHE}/linux-${LINUX_VERSION}.tar.xz"
    if [[ ! -s "${tbz}" ]]; then
        wget -q -O "${tbz}" "${KERNEL_MIRROR}/linux-${LINUX_VERSION}.tar.xz"
    fi
    mkdir -p "${DXN1_SOURCES}"
    tar -xf "${tbz}" -C "${DXN1_SOURCES}"
fi

if [[ -f "${STAMP}" ]] && [[ -s "${DXN1_KERNEL_DIR}/bzImage" ]]; then
    success "Kernel already built — skipping (rm ${STAMP} to rebuild)."
    exit 0
fi

mkdir -p "${DXN1_KERNEL_DIR}"
cd "${SRC_DIR}"

# Make sure we have a clean tree.
log "Cleaning source tree…"
make mrproper >/dev/null

# ---------------------------------------------------------------------------
# 1. Build a baseline config, then merge in DXN1-OS overrides.
# ---------------------------------------------------------------------------
log "Generating baseline x86_64 defconfig…"
make ARCH=x86_64 defconfig >/dev/null

# Append DXN1-OS overrides.
log "Merging DXN1-OS kernel.config overrides…"
cat "${SCRIPT_DIR}/config/kernel.config" >> .config

# Resolve new symbols to their defaults.
log "Resolving config deltas (olddefconfig)…"
make ARCH=x86_64 olddefconfig >/dev/null

# Save the final config so it's reproducible.
cp .config "${DXN1_KERNEL_DIR}/config"

# ---------------------------------------------------------------------------
# 2. Kernel build.
# ---------------------------------------------------------------------------
log "Building kernel (${MAKEFLAGS})…"
make ARCH=x86_64 "${MAKEFLAGS}" \
     CC="/tools/bin/${LFS_TGT}-gcc" \
     HOSTCC=gcc HOSTCXX=g++ \
     bzImage modules 2>&1 | tee "${DXN1_LOG_DIR}/kernel-build.log"

# Copy the build artefacts.
cp arch/x86/boot/bzImage "${DXN1_KERNEL_DIR}/bzImage"
cp System.map            "${DXN1_KERNEL_DIR}/System.map"
success "Kernel image: ${DXN1_KERNEL_DIR}/bzImage ($(du -h "${DXN1_KERNEL_DIR}/bzImage" | cut -f1))"

# ---------------------------------------------------------------------------
# 3. Module install → tarball.
# ---------------------------------------------------------------------------
log "Packing modules into ${DXN1_KERNEL_DIR}/modules.tar.xz…"
MODULES_DIR="$(mktemp -d)"
trap 'rm -rf "${MODULES_DIR}"' EXIT

make ARCH=x86_64 \
     CC="/tools/bin/${LFS_TGT}-gcc" \
     INSTALL_MOD_PATH="${MODULES_DIR}" \
     modules_install >/dev/null

# Stray build symlinks pointing to the build host can break the install.
find "${MODULES_DIR}" -name 'build' -o -name 'source' | xargs -r rm -f

# Compress.
tar -c -C "${MODULES_DIR}" --owner=0 --group=0 \
    --use-compress-program='xz -T0' \
    -f "${DXN1_KERNEL_DIR}/modules.tar.xz" lib/modules

success "Modules: ${DXN1_KERNEL_DIR}/modules.tar.xz ($(du -h "${DXN1_KERNEL_DIR}/modules.tar.xz" | cut -f1))"

# ---------------------------------------------------------------------------
# 4. Verify the kernel has the essentials for booting DXN1-OS.
# ---------------------------------------------------------------------------
log "Verifying kernel config has DXN1-OS essentials…"
check() {
    local sym="$1"
    if ! grep -q "^${sym}=y" .config && ! grep -q "^${sym}=m" .config; then
        die "Kernel config missing required symbol: ${sym}"
    fi
}
check CONFIG_64BIT
check CONFIG_EXT4_FS
check CONFIG_BLK_DEV_INITRD
check CONFIG_SQUASHFS
check CONFIG_ISO9660_FS
check CONFIG_DRM_AMDGPU
check CONFIG_DRM_I915
check CONFIG_E1000
check CONFIG_R8169
check CONFIG_IWLWIFI
check CONFIG_SND_HDA_INTEL
check CONFIG_USB_STORAGE
success "Kernel config verified."

printf '%s\n' "$(date -Is)" > "${STAMP}"
printf '%s\n' "$(date -Is)" > "${DXN1_STATE_DIR}/stage-03.done"
success "Stage 03 complete."
