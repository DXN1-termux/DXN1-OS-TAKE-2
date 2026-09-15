#!/bin/bash
# =============================================================================
# Driver class — Wireless (Wi-Fi + Bluetooth)
# -----------------------------------------------------------------------------
# Builds & installs the DXN1-OS wireless userspace stack:
#   * iwd            — Intel Wireless Daemon (modern WPA supplicant).
#   * wpa_supplicant — fallback supplicant for non-iwd chips.
#   * crda           — regulatory domain agent.
#
# Kernel-side: CONFIG_IWLWIFI, CONFIG_ATH9K, CONFIG_ATH10K, CONFIG_ATH11K,
# CONFIG_BRCMFMAC, CONFIG_RT2800USB, CONFIG_RTL_CARDS, CONFIG_BT, etc.
# (all set in config/kernel.config). Linux firmware blobs are required for
# most modern chips; this script copies them into /lib/firmware.
# =============================================================================
set -euo pipefail

if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[wifi]%s %s\n'  "${C_B}" "${C_0}" "$*"; }
ok()      { printf '%s[wifi]✓ %s%s\n' "${C_G}" "${C_0}" "$*"; }
warn()    { printf '%s[wifi]! %s%s\n' "${C_Y}" "${C_0}" "$*" >&2; }
die()     { printf '%s[wifi]✗ %s%s\n' "${C_R}" "${C_0}" "$*" >&2; exit 1; }

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
# Install linux-firmware blobs.
# ---------------------------------------------------------------------------
FW_DIR=/lib/firmware
mkdir -p "${FW_DIR}"
if [[ -d "${SRC}/linux-firmware-20240811" ]]; then
    log "copying wireless firmware blobs…"
    for sub in iwlwifi-* iwlwifi-*.ucode ath* brcm/* rtlwifi/* rt2870.bin \
               mediatek/MT*.bin intel/ibt-*; do
        cp -a "${SRC}/linux-firmware-20240811/${sub}" "${FW_DIR}/" 2>/dev/null || true
    done
    ok "firmware installed in ${FW_DIR}"
else
    warn "linux-firmware source not present; wireless may be limited to no-FW chips."
fi

# ---------------------------------------------------------------------------
# Build userspace wireless tools.
# ---------------------------------------------------------------------------
build_pkg iwd 2.20 \
    "./configure --prefix=/usr --libdir=/usr/lib --sysconfdir=/etc \
       --disable-systemd --disable-manual-pages \
       --enable-dbus-policy --enable-wired && \
     make && make install"

build_pkg wpa_supplicant 2.11 \
    "cd wpa_supplicant && \
     cp defconfig .config && \
     echo 'CONFIG_DRIVER_NL80211=y' >> .config && \
     echo 'CONFIG_DRIVER_WEXT=y'    >> .config && \
     echo 'CONFIG_IEEE80211N=y'     >> .config && \
     echo 'CONFIG_IEEE80211AC=y'    >> .config && \
     echo 'CONFIG_CTRL_IFACE_DBUS=y' >> .config && \
     make && make BINDIR=/usr/bin install"

# ---------------------------------------------------------------------------
# Probe & load wireless kernel modules per detected PCI/USB device.
# ---------------------------------------------------------------------------
log "probing wireless devices…"
loaded=0

# PCI wireless.
while read -r _ vendor device _; do
    vendor=$(echo "${vendor}" | tr 'A-F' 'a-f')
    case "${vendor}" in
        8086) for m in iwlwifi iwldvm iwlmvm; do modprobe "${m}" 2>/dev/null && ok "loaded ${m}" && loaded=$((loaded+1)) || true; done ;;
        168c) for m in ath9k ath9k_pci ath9k_htc ath10k_pci ath11k_pci; do modprobe "${m}" 2>/dev/null && ok "loaded ${m}" && loaded=$((loaded+1)) || true; done ;;
        14e4) for m in brcmfmac brcmsmac; do modprobe "${m}" 2>/dev/null && ok "loaded ${m}" && loaded=$((loaded+1)) || true; done ;;
        10ec) for m in rtl8723be rtl8188ee rtl8192ce rtl8192cu rtw88_8822be rtw89_8852be; do modprobe "${m}" 2>/dev/null && ok "loaded ${m}" && loaded=$((loaded+1)) || true; done ;;
    esac
done < <(lspci -d ::0280 -mn 2>/dev/null | awk '{print $3, $4}')

# USB wireless.
while read -r _ vendor _; do
    vendor=$(echo "${vendor}" | tr 'A-F' 'a-f')
    case "${vendor}" in
        0cf3|04ca) modprobe ath9k_htc 2>/dev/null && ok "loaded ath9k_htc" && loaded=$((loaded+1)) || true ;;
        148f)      modprobe rt2800usb 2>/dev/null && ok "loaded rt2800usb" && loaded=$((loaded+1)) || true ;;
    esac
done < <(lsusb 2>/dev/null | awk '{print $6}' | sort -u)

[[ ${loaded} -gt 0 ]] || warn "no known wireless driver matched a device."

# ---------------------------------------------------------------------------
# Bluetooth.
# ---------------------------------------------------------------------------
log "loading bluetooth stack…"
for mod in bluetooth btusb btintel btbcm btrtl rfcomm bnep hidp; do
    modprobe "${mod}" 2>/dev/null && ok "loaded ${mod}" || true
done
if command -v bluetoothd >/dev/null 2>&1; then
    bluetoothd -n &>/var/log/dxn1/bluetooth.log &
    ok "bluetoothd started"
fi

# Set a default regulatory domain (world) — the user can override via /etc/conf.
iw reg set 00 2>/dev/null || true
ok "Wireless driver class complete."
