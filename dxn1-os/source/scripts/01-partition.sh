#!/bin/bash
# =============================================================================
# Stage 01 — Target disk partitioning
# -----------------------------------------------------------------------------
# Partitions the target block device for a DXN1-OS install. Three profiles:
#
#   --profile 5gb      (default) 1 GiB swap + ~4 GiB root. Total ~5 GiB.
#                       Designed for USB sticks, DriveDroid images, embedded
#                       SD cards, and any system with extremely limited
#                       writable storage.
#
#   --profile full     Uses the entire device. Swap = min(1/8 of device, 8 GiB).
#                       Root = remainder. Good for desktop installs.
#
#   --profile manual   Leaves the partition table alone and expects the user to
#                       point --root-part and --swap-part at pre-prepared
#                       partitions.
#
# After partitioning, this stage also formats the partitions (ext4 + swap),
# labels them, and writes a /dev/disk/by-partlabel symlink mapping for stage 06.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/config/environment"

# ---------------------------------------------------------------------------
# Logging helpers.
# ---------------------------------------------------------------------------
if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[%s]%s %s\n'  "${C_B}" "$(date +%H:%M:%S)" "${C_0}" "$*"; }
success() { printf '%s✓ %s%s%s\n'   "${C_G}" "$*" "${C_0}"; }
warn()    { printf '%s! %s%s%s\n'   "${C_Y}" "$*" "${C_0}" >&2; }
die()     { printf '%s✗ %s%s%s\n'   "${C_R}" "$*" "${C_0}" >&2; exit 1; }
trap 'die "Stage 01 aborted at line $LINENO (exit $?)"' ERR

# ---------------------------------------------------------------------------
# Arg parsing.
# ---------------------------------------------------------------------------
PROFILE="5gb"
DISK="${DXN1_DISK}"
ROOT_PART=""
SWAP_PART=""
FORCE=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)    PROFILE="$2"; shift 2 ;;
        --disk)       DISK="$2"; shift 2 ;;
        --root-part)  ROOT_PART="$2"; shift 2 ;;
        --swap-part)  SWAP_PART="$2"; shift 2 ;;
        --force)      FORCE=1; shift ;;
        -h|--help)
            sed -n '2,30p' "$0"; exit 0 ;;
        *) die "Unknown arg: $1" ;;
    esac
done

# ---------------------------------------------------------------------------
# Safety: refuse to touch the default sentinel device.
# ---------------------------------------------------------------------------
if [[ "${DISK}" == "/dev/null" ]]; then
    die "Refusing to operate on the default device sentinel. Pass --disk /dev/sdX."
fi
if [[ ! -b "${DISK}" ]]; then
    die "Target is not a block device: ${DISK}"
fi
if [[ "${DISK}" =~ ^/dev/(sd|nvme|vd|loop|mmcblk) ]]; then :; else
    die "Target device '${DISK}' does not look like a disk (sd/nvme/vd/loop/mmcblk)."
fi

# Refuse whole-disk wipe if the disk is in use by the host (mounted or LVM).
if lsblk -no MOUNTPOINT "${DISK}" 2>/dev/null | grep -q .; then
    die "Device ${DISK} has mounted partitions. Unmount them and retry."
fi

# ---------------------------------------------------------------------------
# Helper: partition number → partition device path (handles NVMe / mmcblk).
# ---------------------------------------------------------------------------
part_dev() {
    local disk="$1" num="$2"
    if [[ "${disk}" =~ nvme[0-9]+n[0-9]+$ || "${disk}" =~ mmcblk[0-9]+$ ]]; then
        echo "${disk}p${num}"
    else
        echo "${disk}${num}"
    fi
}

# ---------------------------------------------------------------------------
# 5 GB minimal-install profile.
# ---------------------------------------------------------------------------
create_5gb_partition() {
    log "Creating 5GB minimal-install partition layout on ${DISK}…"

    # 1 MiB BIOS boot + ESP at 1 MiB → 513 MiB (so the disk boots under both
    # BIOS and UEFI without re-partitioning).
    # 2: 1 GiB swap.
    # 3: root = remainder up to 5 GiB total.
    local swap_start="514MiB"
    local swap_end="1530MiB"     # +1 GiB
    local root_end="5G"

    parted --script -s "${DISK}" mklabel gpt
    parted --script -s "${DISK}" mkpart primary 1MiB 513MiB \
        name 1 'dxn1-boot' set 1 esp on
    parted --script -s "${DISK}" mkpart primary linux-swap \
        "${swap_start}" "${swap_end}" name 2 'dxn1-swap'
    parted --script -s "${DISK}" mkpart primary ext4 \
        "${swap_end}" "${root_end}" name 3 'dxn1-root'
    parted --script -s "${DISK}" set 3 boot on

    local boot_p swap_p root_p
    boot_p="$(part_dev "${DISK}" 1)"
    swap_p="$(part_dev "${DISK}" 2)"
    root_p="$(part_dev "${DISK}" 3)"

    # Wait for the kernel to re-read the partition table.
    udevadm settle 2>/dev/null || sleep 1
    [[ -b "${root_p}" ]] || partprobe "${DISK}" || true
    udevadm settle 2>/dev/null || sleep 1

    mkfs.vfat -F32 -n DXN1BOOT "${boot_p}"
    mkswap -L "${LFS_SWAP_LABEL}" "${swap_p}"
    mkfs.ext4 -F -L "${LFS_ROOT_LABEL}" -m 1 -O ^has_journal "${root_p}"

    ROOT_PART="${root_p}"; SWAP_PART="${swap_p}"
    success "5 GB layout created (boot=${boot_p}, swap=${swap_p}, root=${root_p})."
}

# ---------------------------------------------------------------------------
# Full-disk profile.
# ---------------------------------------------------------------------------
create_full_partition() {
    log "Creating full-disk layout on ${DISK}…"
    local disk_bytes disk_gb swap_gb
    disk_bytes=$(blockdev --getsize64 "${DISK}")
    disk_gb=$(( disk_bytes / 1024 / 1024 / 1024 ))
    swap_gb=$(( disk_gb / 8 ))
    (( swap_gb > 8 )) && swap_gb=8
    (( swap_gb < 1 )) && swap_gb=1
    local swap_end="${swap_gb}GiB"

    parted --script -s "${DISK}" mklabel gpt
    parted --script -s "${DISK}" mkpart primary 1MiB 513MiB \
        name 1 'dxn1-boot' set 1 esp on
    parted --script -s "${DISK}" mkpart primary linux-swap 514MiB "${swap_end}" \
        name 2 'dxn1-swap'
    parted --script -s "${DISK}" mkpart primary ext4 "${swap_end}" 100% \
        name 3 'dxn1-root' set 3 boot on

    udevadm settle 2>/dev/null || sleep 1
    partprobe "${DISK}" 2>/dev/null || true
    udevadm settle 2>/dev/null || sleep 1

    local boot_p swap_p root_p
    boot_p="$(part_dev "${DISK}" 1)"
    swap_p="$(part_dev "${DISK}" 2)"
    root_p="$(part_dev "${DISK}" 3)"

    mkfs.vfat -F32 -n DXN1BOOT "${boot_p}"
    mkswap -L "${LFS_SWAP_LABEL}" "${swap_p}"
    mkfs.ext4 -F -L "${LFS_ROOT_LABEL}" -m 1 "${root_p}"

    ROOT_PART="${root_p}"; SWAP_PART="${swap_p}"
    success "Full-disk layout created (${disk_gb} GiB, swap=${swap_gb} GiB)."
}

# ---------------------------------------------------------------------------
# Manual profile: do not touch partitions; only validate & format.
# ---------------------------------------------------------------------------
validate_manual() {
    [[ -n "${ROOT_PART}" ]] || die "Manual profile requires --root-part /dev/sdXN."
    [[ -b "${ROOT_PART}" ]] || die "--root-part is not a block device: ${ROOT_PART}"
    if [[ -n "${SWAP_PART}" ]]; then
        [[ -b "${SWAP_PART}" ]] || die "--swap-part is not a block device: ${SWAP_PART}"
    fi

    if [[ ${FORCE} -ne 1 ]]; then
        warn "About to format root=${ROOT_PART}"
        [[ -z "${SWAP_PART}" ]] || warn "               swap=${SWAP_PART}"
        read -r -p "Type the device name to confirm: " confirm
        [[ "${confirm}" == "${ROOT_PART}" ]] || die "Confirmation mismatch — aborting."
    fi
    mkfs.ext4 -F -L "${LFS_ROOT_LABEL}" -m 1 "${ROOT_PART}"
    if [[ -n "${SWAP_PART}" ]]; then
        mkswap -L "${LFS_SWAP_LABEL}" "${SWAP_PART}"
    fi
    success "Manual partitions formatted."
}

# ---------------------------------------------------------------------------
# Dispatch.
# ---------------------------------------------------------------------------
case "${PROFILE}" in
    5gb)    create_5gb_partition ;;
    full)   create_full_partition ;;
    manual) validate_manual ;;
    *)      die "Unknown profile: ${PROFILE} (use 5gb|full|manual)" ;;
esac

# Persist state for stages 06 (install) and 08 (usb-flash).
cat > "${DXN1_STATE_DIR}/disk-layout.env" <<EOF
# Generated by scripts/01-partition.sh — do not edit.
DXN1_DISK="${DISK}"
DXN1_ROOT_PART="${ROOT_PART}"
DXN1_SWAP_PART="${SWAP_PART}"
DXN1_BOOT_PART="$(part_dev "${DISK}" 1 2>/dev/null || echo "")"
DXN1_PROFILE="${PROFILE}"
DXN1_ROOT_LABEL="${LFS_ROOT_LABEL}"
DXN1_SWAP_LABEL="${LFS_SWAP_LABEL}"
EOF

printf '%s\n' "$(date -Is)" > "${DXN1_STATE_DIR}/stage-01.done"
success "Stage 01 complete. Root: ${ROOT_PART}, Swap: ${SWAP_PART:-none}"
