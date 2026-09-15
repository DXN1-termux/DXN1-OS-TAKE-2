#!/bin/bash
# =============================================================================
# Driver class — Input
# -----------------------------------------------------------------------------
# Builds & installs the DXN1-OS input stack:
#   * libevdev — kernel evdev wrapper.
#   * mtdev    — multitouch translation.
#   * libinput — Wayland/Xorg input library (trackpads, touchscreens, etc.).
#   * xf86-input-evdev, xf86-input-synaptics — Xorg DDX drivers (legacy).
#
# Kernel-side: CONFIG_INPUT_EVDEV, CONFIG_MOUSE_PS2_SYNAPTICS,
# CONFIG_TOUCHSCREEN_ELAN, CONFIG_INPUT_UINPUT (already set in kernel.config).
# =============================================================================
set -euo pipefail

if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[inp]%s %s\n'   "${C_B}" "${C_0}" "$*"; }
ok()      { printf '%s[inp]✓ %s%s\n'  "${C_G}" "${C_0}" "$*"; }
warn()    { printf '%s[inp]! %s%s\n'  "${C_Y}" "${C_0}" "$*" >&2; }
die()     { printf '%s[inp]✗ %s%s\n'  "${C_R}" "${C_0}" "$*" >&2; exit 1; }

SRC=/usr/src
STAMP_DIR=/var/lib/dxn1/state
mkdir -p "${STAMP_DIR}"

build_pkg() {
    local name="$1" version="$2"; shift 2
    local stamp="${STAMP_DIR}/drv-${name}.stamp"
    [[ -f "${stamp}" ]] && { ok "skip ${name}-${version}"; return 0; }
    local srcdir="${SRC}/${name}-${version}"
    [[ -d "${srcdir}" ]] || { warn "no source for ${name}-${version}"; return 1; }
    log "building ${name}-${version}…"
    cd "${srcdir}"
    "$@" || die "build failed: ${name}-${version}"
    date -Is > "${stamp}"
    ok "built ${name}-${version}"
}

# ---------------------------------------------------------------------------
# Build userspace input libraries.
# ---------------------------------------------------------------------------
build_pkg libevdev 1.13.2 \
    "./configure --prefix=/usr --libdir=/usr/lib --disable-static && \
     make && make install"

build_pkg mtdev 1.1.7 \
    "./configure --prefix=/usr --libdir=/usr/lib --disable-static && \
     make && make install"

build_pkg libinput 1.26.2 \
    "mkdir -p build && cd build && \
     meson setup --prefix=/usr --libdir=/usr/lib \
       -Ddebug-gui=false -Dtests=false -Ddocumentation=false \
       -Dlibwacom=enabled .. && \
     ninja && ninja install"

# Xorg DDX drivers — only built if Xorg is installed.
if pkg-config --exists xorg-server 2>/dev/null; then
    build_pkg xorg-driver-input-evdev 2.10.6 \
        "./configure --prefix=/usr && make && make install"
    build_pkg xorg-driver-input-synaptics 1.9.2 \
        "./configure --prefix=/usr && make && make install"
else
    warn "Xorg not present — skipping X DDX drivers."
fi

# ---------------------------------------------------------------------------
# Load input kernel modules & create uinput.
# ---------------------------------------------------------------------------
log "loading input kernel modules…"
for mod in evdev mousedev psmouse atkbd \
           synaptics_i2c synaptics_usb \
           elan_i2c usbhid hid-generic hid-apple hid-logitech hid-logitech-dj \
           uinput; do
    modprobe "${mod}" 2>/dev/null && ok "loaded ${mod}" || true
done

# uinput is required by libinput's gesture support.
[[ -c /dev/uinput ]] || mknod -m 0660 /dev/uinput c 10 223 2>/dev/null || true
chown root:input /dev/uinput 2>/dev/null || true

# ---------------------------------------------------------------------------
# Final check: enumerate input devices.
# ---------------------------------------------------------------------------
if [[ -d /dev/input ]]; then
    DEVS=$(ls /dev/input 2>/dev/null | tr '\n' ' ')
    ok "input devices: ${DEVS:-none}"
    [[ -c /dev/input/event0 ]] && ok "evdev event0 present"
else
    warn "/dev/input missing — no input devices enumerated yet."
fi

# Add the input group if missing.
getent group input >/dev/null 2>&1 || groupadd -r input 2>/dev/null || true
ok "Input driver class complete."
