#!/bin/bash
# =============================================================================
# Driver class — Audio
# -----------------------------------------------------------------------------
# Builds & installs the DXN1-OS audio stack:
#   * alsa-lib  — kernel→userspace ABI for ALSA.
#   * alsa-utils — amixer, aplay, alsamixer, alsactl (for state save/restore).
#   * pipewire   — modern media server (replaces pulseaudio + jack).
#   * wireplumber — pipewire session manager.
#
# The kernel-side snd-hda-intel, snd-usb-audio, snd-intel8x0, etc. are
# already built (CONFIG_SND_HDA_INTEL=y) by stage 03. This script loads
# them and unmutes the master channel.
# =============================================================================
set -euo pipefail

if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[aud]%s %s\n'   "${C_B}" "${C_0}" "$*"; }
ok()      { printf '%s[aud]✓ %s%s\n'  "${C_G}" "${C_0}" "$*"; }
warn()    { printf '%s[aud]! %s%s\n'  "${C_Y}" "${C_0}" "$*" >&2; }
die()     { printf '%s[aud]✗ %s%s\n'  "${C_R}" "${C_0}" "$*" >&2; exit 1; }

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
# Build userspace.
# ---------------------------------------------------------------------------
build_pkg alsa-lib 1.2.12 \
    "./configure --prefix=/usr --libdir=/usr/lib --disable-static && \
     make && make install"

build_pkg alsa-utils 1.2.12 \
    "./configure --prefix=/usr --libdir=/usr/lib --disable-alsaconf \
       --with-udev-rules-dir=/lib/udev/rules.d && \
     make && make install"

build_pkg pipewire 1.2.1 \
    "mkdir -p build && cd build && \
     meson setup --prefix=/usr --libdir=/usr/lib \
       -Dalsa=enabled -Dsession-managers=wireplumber \
       -Dpulseaudio=enabled -Djack=disabled -Dv4l2=disabled \
       -Dsystemd=disabled -Dtests=disabled .. && \
     ninja && ninja install"

build_pkg wireplumber 0.5.5 \
    "mkdir -p build && cd build && \
     meson setup --prefix=/usr --libdir=/usr/lib -Dsystemd=disabled .. && \
     ninja && ninja install"

# Make pipewire's pulseaudio replacement the system-wide pulse daemon.
ln -sfn /usr/bin/pipewire /usr/bin/pipewire-pulse 2>/dev/null || true

# ---------------------------------------------------------------------------
# Load the kernel sound subsystem + HDA drivers.
# ---------------------------------------------------------------------------
log "loading kernel sound modules…"
for mod in snd snd-timer snd-pcm snd-rawmidi snd-seq-device snd-hwdep \
           snd-hda-core snd-hda-codec snd-hda-intel snd-hda-codec-realtek \
           snd-hda-codec-conexant snd-hda-codec-hdmi snd-hda-generic \
           snd-usb-audio snd-ac97-codec snd-intel8x0; do
    if modprobe "${mod}" 2>/dev/null; then
        ok "loaded ${mod}"
    fi
done

# ---------------------------------------------------------------------------
# Unmute the master channel and save the default ALSA state.
# ---------------------------------------------------------------------------
if command -v amixer >/dev/null 2>&1; then
    log "unmuting master + PCM…"
    amixer -q set Master unmute 2>/dev/null || true
    amixer -q set Master 75%  2>/dev/null || true
    amixer -q set PCM    unmute 2>/dev/null || true
    amixer -q set PCM    75%  2>/dev/null || true
    amixer -q set Speaker unmute 2>/dev/null || true
    amixer -q set Headphone unmute 2>/dev/null || true

    if [[ -d /var/lib/alsa ]]; then
        alsactl store 2>/dev/null && ok "alsa state saved"
    fi
fi

# Probe a sound card.
if [[ -d /proc/asound ]] && [[ -n "$(ls /proc/asound 2>/dev/null | grep -E '^card[0-9]+$')" ]]; then
    ok "ALSA cards: $(ls /proc/asound | grep -E '^card[0-9]+$' | tr '\n' ' ')"
else
    warn "no ALSA sound card detected — audio may not work."
fi

ok "Audio driver class complete."
