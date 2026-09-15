#!/bin/bash
# =============================================================================
# Driver class — Network (wired)
# -----------------------------------------------------------------------------
# The wired NIC kernel drivers (e1000, e1000e, igb, ixgbe, r8169, tg3, sky2,
# atl1c, alx) are built into the kernel by stage 03 (CONFIG_E1000 etc.). This
# script:
#   * Probes the system for each supported NIC vendor/device.
#   * Loads the matching module.
#   * Brings up the primary NIC and (optionally) starts dhcpcd.
#   * Installs ethtool + mii-tool helper.
# =============================================================================
set -euo pipefail

if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[net]%s %s\n'   "${C_B}" "${C_0}" "$*"; }
ok()      { printf '%s[net]✓ %s%s\n'  "${C_G}" "${C_0}" "$*"; }
warn()    { printf '%s[net]! %s%s\n'  "${C_Y}" "${C_0}" "$*" >&2; }
die()     { printf '%s[net]✗ %s%s\n'  "${C_R}" "${C_0}" "$*" >&2; exit 1; }

# PCI vendor codes → driver name. IDs from pci.ids (Ethernet controller class).
declare -A PCI_DRIVERS=(
    [8086]="e1000 e1000e igb igbvf ixgb ixgbe"   # Intel
    [10ec]="r8169"                               # Realtek
    [14e4]="tg3 bnx2 bnx2x"                      # Broadcom
    [11ab]="sky2 skge"                           # Marvell
    [1969]="atl1c alx atl1 atl1e"                # Atheros/Qualcomm
)

log "Probing PCI ethernet controllers…"
loaded=0
while read -r _ vendor device _; do
    vendor=$(echo "${vendor}" | tr 'A-F' 'a-f')
    if [[ -n "${PCI_DRIVERS[${vendor}]:-}" ]]; then
        for drv in ${PCI_DRIVERS[${vendor}]}; do
            if modprobe "${drv}" 2>/dev/null; then
                ok "loaded ${drv} (vendor ${vendor})"
                loaded=$((loaded + 1))
            fi
        done
    fi
done < <(lspci -d ::0200 -mn 2>/dev/null | awk '{print $3, $4}')

[[ ${loaded} -gt 0 ]] || warn "no known wired NIC driver matched a PCI device."

# ---------------------------------------------------------------------------
# Bring up the first non-loopback NIC. Prefer eth0 → en* → first eth iface.
# ---------------------------------------------------------------------------
NIC=""
if ip link show eth0 >/dev/null 2>&1; then
    NIC=eth0
else
    NIC=$(ip -o link show 2>/dev/null | awk -F': ' '$2 != "lo" {print $2; exit}' | cut -d@ -f1)
fi

if [[ -n "${NIC}" ]]; then
    log "bringing up ${NIC}…"
    ip link set "${NIC}" up
    if command -v ethtool >/dev/null 2>&1; then
        ethtool -s "${NIC}" wol d 2>/dev/null || true
    fi
    # DHCP if dhcpcd exists; otherwise leave manual config to the network service.
    if command -v dhcpcd >/dev/null 2>&1; then
        dhcpcd -b -q "${NIC}" 2>/dev/null && ok "DHCP started on ${NIC}"
    fi
    ok "primary NIC: ${NIC} ($(cat /sys/class/net/${NIC}/address 2>/dev/null || echo unknown))"
else
    warn "no network interface found"
fi

ok "Network driver class complete."
