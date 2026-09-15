#!/bin/bash
# =============================================================================
# DXN1-OS installer — partitioner
# -----------------------------------------------------------------------------
# Interactive / scriptable partitioning front-end. Implements three profiles
# (5gb / full / manual) and produces the disk-layout.env file that the stage 06
# install script consumes.
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

# ---------------------------------------------------------------------------
PROFILE="5gb"
DISK="${DXN1_DISK}"
ROOT_PART=""
SWAP_PART=""
FORCE=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)   PROFILE="$2"; shift 2 ;;
        --disk)      DISK="$2"; shift 2 ;;
        --root-part) ROOT_PART="$2"; shift 2 ;;
        --swap-part) SWAP_PART="$2"; shift 2 ;;
        --force|-y)  FORCE=1; shift ;;
        -h|--help)   sed -n '2,30p' "$0"; exit 0 ;;
        *) die "Unknown arg: $1" ;;
    esac
done

[[ "${DISK}" != "/dev/null" ]] || die "Refusing to operate on sentinel device — pass --disk /dev/sdX."
[[ -b "${DISK}" ]]             || die "Not a block device: ${DISK}"
if lsblk -no MOUNTPOINT "${DISK}" 2>/dev/null | grep -q .; then
    die "Target has mounted partitions."
fi

# NVMe / mmcblk → partition device naming helper.
part_dev() {
    local disk="$1" num="$2"
    if [[ "${disk}" =~ nvme[0-9]+n[0-9]+$ || "${disk}" =~ mmcblk[0-9]+$ ]]; then
        echo "${disk}p${num}"
    else
        echo "${disk}${num}"
    fi
}

confirm_wipe() {
    if [[ ${FORCE} -ne 1 ]]; then
        warn "ALL DATA ON ${DISK} WILL BE DESTROYED."
        read -r -p "Type the device name ($(basename "${DISK}")) to confirm: " ans
        [[ "${ans}" == "$(basename "${DISK}")" ]] || die "Confirmation mismatch."
    fi
}

# ---------------------------------------------------------------------------
# 5 GB minimal install: 1 MiB BIOS boot + ESP, 1 GiB swap, ~3 GiB root.
# ---------------------------------------------------------------------------
create_5gb_partition() {
    confirm_wipe
    log "5 GB partition profile on ${DISK}…"
    parted --script -s "${DISK}" mklabel gpt
    parted --script -s "${DISK}" mkpart primary 1MiB 513MiB \
        name 1 'dxn1-boot' set 1 esp on
    parted --script -s "${DISK}" mkpart primary linux-swap 514MiB 1530MiB \
        name 2 'dxn1-swap'
    parted --script -s "${DISK}" mkpart primary ext4 1530MiB 5G \
        name 3 'dxn1-root' set 3 boot on

    udevadm settle 2>/dev/null || sleep 1
    partprobe "${DISK}" 2>/dev/null || true
    udevadm settle 2>/dev/null || sleep 1

    local boot_p swap_p root_p
    boot_p="$(part_dev "${DISK}" 1)"
    swap_p="$(part_dev "${DISK}" 2)"
    root_p="$(part_dev "${DISK}" 3)"

    mkfs.vfat -F32 -n DXN1BOOT    "${boot_p}"
    mkswap      -L "${LFS_SWAP_LABEL}" "${swap_p}"
    mkfs.ext4   -F -L "${LFS_ROOT_LABEL}" -m 1 -O ^has_journal "${root_p}"

    ROOT_PART="${root_p}"; SWAP_PART="${swap_p}"
    success "5 GB layout ready."
}

# ---------------------------------------------------------------------------
# Full disk: 512 MiB ESP, swap = 1/8 disk (max 8 GiB), root = remainder.
# ---------------------------------------------------------------------------
create_full_partition() {
    confirm_wipe
    log "Full-disk partition profile on ${DISK}…"
    local bytes gb swap_gb
    bytes=$(blockdev --getsize64 "${DISK}")
    gb=$(( bytes / 1024 / 1024 / 1024 ))
    swap_gb=$(( gb / 8 ))
    (( swap_gb > 8 )) && swap_gb=8
    (( swap_gb < 1 )) && swap_gb=1

    parted --script -s "${DISK}" mklabel gpt
    parted --script -s "${DISK}" mkpart primary 1MiB 513MiB \
        name 1 'dxn1-boot' set 1 esp on
    parted --script -s "${DISK}" mkpart primary linux-swap 514MiB "${swap_gb}GiB" \
        name 2 'dxn1-swap'
    parted --script -s "${DISK}" mkpart primary ext4 "${swap_gb}GiB" 100% \
        name 3 'dxn1-root' set 3 boot on

    udevadm settle 2>/dev/null || sleep 1
    partprobe "${DISK}" 2>/dev/null || true
    udevadm settle 2>/dev/null || sleep 1

    local boot_p swap_p root_p
    boot_p="$(part_dev "${DISK}" 1)"
    swap_p="$(part_dev "${DISK}" 2)"
    root_p="$(part_dev "${DISK}" 3)"

    mkfs.vfat -F32 -n DXN1BOOT    "${boot_p}"
    mkswap      -L "${LFS_SWAP_LABEL}" "${swap_p}"
    mkfs.ext4   -F -L "${LFS_ROOT_LABEL}" -m 1 "${root_p}"

    ROOT_PART="${root_p}"; SWAP_PART="${swap_p}"
    success "Full-disk layout ready (${gb} GiB, swap=${swap_gb} GiB)."
}

# ---------------------------------------------------------------------------
# Manual: expect pre-existing partitions and just format them.
# ---------------------------------------------------------------------------
use_manual() {
    [[ -n "${ROOT_PART}" ]] || die "Manual profile requires --root-part /dev/sdXN."
    [[ -b "${ROOT_PART}"   ]] || die "Not a block device: ${ROOT_PART}"
    if [[ -n "${SWAP_PART}" ]]; then
        [[ -b "${SWAP_PART}" ]] || die "--swap-part is not a block device: ${SWAP_PART}"
    fi
    confirm_wipe
    mkfs.ext4 -F -L "${LFS_ROOT_LABEL}" -m 1 "${ROOT_PART}"
    if [[ -n "${SWAP_PART}" ]]; then
        mkswap -L "${LFS_SWAP_LABEL}" "${SWAP_PART}"
    fi
    success "Manual partitions formatted."
}

case "${PROFILE}" in
    5gb)    create_5gb_partition ;;
    full)   create_full_partition ;;
    manual) use_manual ;;
    *)      die "Unknown profile: ${PROFILE}" ;;
esac

# Persist state.
cat > "${DXN1_STATE_DIR}/disk-layout.env" <<EOF
DXN1_DISK="${DISK}"
DXN1_ROOT_PART="${ROOT_PART}"
DXN1_SWAP_PART="${SWAP_PART}"
DXN1_BOOT_PART="$(part_dev "${DISK}" 1 2>/dev/null || echo "")"
DXN1_PROFILE="${PROFILE}"
DXN1_ROOT_LABEL="${LFS_ROOT_LABEL}"
DXN1_SWAP_LABEL="${LFS_SWAP_LABEL}"
EOF

success "Partitioning complete: root=${ROOT_PART}, swap=${SWAP_PART:-none}"
