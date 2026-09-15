#!/bin/bash
# =============================================================================
# Driver class — GPU
# -----------------------------------------------------------------------------
# Builds & installs the DXN1-OS GPU userspace stack:
#   * libdrm (DRM userspace library)
#   * mesa   (OpenGL, Vulkan, OpenCL — provides the amdgpu/radeonsi/nouveau/
#             iris/crocus/zink driver backends)
#   * xf86-video-amdgpu / xf86-video-nouveau / xf86-video-intel (Xorg DDX)
#
# Kernel-side drivers (amdgpu, nouveau, i915, radeon) are already built into
# the kernel by stage 03 (see config/kernel.config); this script loads them
# and verifies the device nodes appear.
# =============================================================================
set -euo pipefail

if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[gpu]%s %s\n'   "${C_B}" "${C_0}" "$*"; }
ok()      { printf '%s[gpu]✓ %s%s\n'  "${C_G}" "${C_0}" "$*"; }
warn()    { printf '%s[gpu]! %s%s\n'  "${C_Y}" "${C_0}" "$*" >&2; }
die()     { printf '%s[gpu]✗ %s%s\n'  "${C_R}" "${C_0}" "$*" >&2; exit 1; }

SRC="/usr/src"
PKGS=(libdrm-2.4.123 mesa-24.2.0)
STAMP_DIR=/var/lib/dxn1/state
mkdir -p "${STAMP_DIR}"

build_pkg() {
    local name="$1" version="$2"; shift 2
    local stamp="${STAMP_DIR}/drv-${name}.stamp"
    [[ -f "${stamp}" ]] && { ok "skip ${name}-${version} (cached)"; return 0; }
    local srcdir="${SRC}/${name}-${version}"
    [[ -d "${srcdir}" ]] || { warn "no source for ${name}-${version}"; return 1; }
    log "building ${name}-${version}…"
    cd "${srcdir}"
    "$@" || die "build failed: ${name}-${version}"
    date -Is > "${stamp}"
    ok "built ${name}-${version}"
}

# ---------------------------------------------------------------------------
# 1. libdrm
# ---------------------------------------------------------------------------
build_pkg libdrm 2.4.123 \
    "mkdir -p build && cd build && \
     meson setup --prefix=/usr --libdir=/usr/lib \
       -Dintel=true -Dradeon=true -Damdgpu=true -Dnouveau=true \
       -Dvmwgfx=true -Domap=false -Dexynos=false -Dfreedreno=false \
       -Dvc4=false -Detnaviv=false -Dtests=false .. && \
     ninja && ninja install"

# ---------------------------------------------------------------------------
# 2. mesa
# ---------------------------------------------------------------------------
build_pkg mesa 24.2.0 \
    "mkdir -p build && cd build && \
     meson setup --prefix=/usr --libdir=/usr/lib \
       -Dgallium-drivers=iris,crocus,radeonsi,r600,nouveau,svga,swrast,zink \
       -Dvulkan-drivers=amd,intel,swrast \
       -Dgallium-va=true -Dgallium-vdpau=true -Dgallium-opencl=icd \
       -Dgbm=true -Degl=true -Dgles1=false -Dgles2=true \
       -Dglx=dri -Dplatforms=x11,wayland \
       -Dllvm=enabled -Dvalgrind=disabled -Dtests=false .. && \
     ninja && ninja install"

# ---------------------------------------------------------------------------
# 3. Probe the GPU & load the appropriate kernel module(s).
# ---------------------------------------------------------------------------
log "Probing PCI display controllers…"
declare -a GPU_DRIVERS=()
while read -r _ vendor device _; do
    # Normalize to lowercase hex.
    vendor=$(echo "${vendor}" | tr 'A-F' 'a-f')
    case "${vendor}" in
        1002) GPU_DRIVERS+=(amdgpu radeon) ;;   # AMD
        10de) GPU_DRIVERS+=(nouveau)        ;;   # NVIDIA
        8086) GPU_DRIVERS+=(i915)           ;;   # Intel
        *)    ;;
    esac
done < <(lspci -d ::0300 -mn 2>/dev/null | awk '{print $3, $4}')

# Deduplicate.
GPU_DRIVERS=($(printf '%s\n' "${GPU_DRIVERS[@]}" | sort -u))

if [[ ${#GPU_DRIVERS[@]} -eq 0 ]]; then
    warn "no PCI display controller detected — loading fallback fbdev."
    modprobe fbdev 2>/dev/null || true
else
    for drv in "${GPU_DRIVERS[@]}"; do
        if modprobe "${drv}" 2>/dev/null; then
            ok "loaded kernel module: ${drv}"
        else
            warn "could not load ${drv}"
        fi
    done
fi

# ---------------------------------------------------------------------------
# 4. Verify /dev/dri exists (KMS is up).
# ---------------------------------------------------------------------------
if [[ -d /dev/dri ]]; then
    ok "/dev/dri present ($(ls /dev/dri 2>/dev/null | tr '\n' ' '))"
else
    warn "/dev/dri missing — KMS may not have initialised; userspace GPU acceleration will be unavailable."
fi

# Add the rendering group if missing.
getent group render >/dev/null 2>&1 || groupadd -r render 2>/dev/null || true
ok "GPU driver class complete."
