#!/bin/bash
# =============================================================================
# Stage 08 — Flash ISO to USB / DriveDroid image
# -----------------------------------------------------------------------------
# Writes a built ISO (stage 07) onto a block device or into a DriveDroid-
# compatible raw image file. Includes:
#
#   * Pre-flight: confirms the ISO exists & its SHA-256 matches (if .sha256 is
#     present alongside it).
#   * dd with bs=4M conv=fsync (large block + durable write).
#   * post-write sync + verify pass: re-reads the target and compares its
#     SHA-256 against the source ISO.
#   * DriveDroid mode: produces a sparse image file with the ISO embedded, and
#     emits a small README describing how to import it into the DriveDroid
#     Android app.
#
# Usage:
#   sudo ./scripts/08-usb-flash.sh --iso <path> --device /dev/sdX
#   sudo ./scripts/08-usb-flash.sh --iso <path> --drivedroid
#   sudo ./scripts/08-usb-flash.sh --iso <path> --image <out.img>
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
trap 'die "Stage 08 aborted at line $LINENO (exit $?)"' ERR

# ---------------------------------------------------------------------------
# Arg parsing.
# ---------------------------------------------------------------------------
ISO_PATH=""
TARGET_DEVICE=""
DRIVEDROID=0
RAW_IMAGE=""
FORCE=0
BLOCK_SIZE="4M"

usage() {
    sed -n '2,30p' "$0"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --iso)         ISO_PATH="$2"; shift 2 ;;
        --device)      TARGET_DEVICE="$2"; shift 2 ;;
        --drivedroid)  DRIVEDROID=1; shift ;;
        --image)       RAW_IMAGE="$2"; shift 2 ;;
        --bs)          BLOCK_SIZE="$2"; shift 2 ;;
        --force|-y)    FORCE=1; shift ;;
        -h|--help)     usage ;;
        *) die "Unknown arg: $1" ;;
    esac
done

# ---------------------------------------------------------------------------
# Validate the ISO.
# ---------------------------------------------------------------------------
[[ -n "${ISO_PATH}" ]] || die "--iso <path> is required."
[[ -f "${ISO_PATH}" ]] || die "ISO not found: ${ISO_PATH}"
[[ -s "${ISO_PATH}" ]] || die "ISO is empty: ${ISO_PATH}"

# If both --device and --drivedroid / --image given, that's a usage error.
if [[ -n "${TARGET_DEVICE}" ]] && [[ ${DRIVEDROID} -eq 1 ]]; then
    die "--device and --drivedroid are mutually exclusive."
fi
if [[ -n "${TARGET_DEVICE}" ]] && [[ -n "${RAW_IMAGE}" ]]; then
    die "--device and --image are mutually exclusive."
fi
if [[ -z "${TARGET_DEVICE}" ]] && [[ ${DRIVEDROID} -eq 0 ]] && [[ -z "${RAW_IMAGE}" ]]; then
    die "No target specified. Use --device, --image, or --drivedroid."
fi

# Compute the source ISO SHA-256 (or load it from the .sha256 sidecar if present).
compute_sha() {
    local f="$1"
    if [[ -f "${f}.sha256" ]]; then
        awk '{print $1}' "${f}.sha256"
    else
        sha256sum "${f}" | awk '{print $1}'
    fi
}

log "Verifying source ISO…"
SRC_SIZE=$(stat -c '%s' "${ISO_PATH}")
SRC_SHA=$(compute_sha "${ISO_PATH}")
log "  path : ${ISO_PATH}"
log "  size : $(numfmt --to=iec ${SRC_SIZE} 2>/dev/null || echo "${SRC_SIZE} bytes")"
log "  sha256: ${SRC_SHA}"

if [[ -f "${ISO_PATH}.sha256" ]]; then
    expected=$(awk '{print $1}' "${ISO_PATH}.sha256")
    if [[ "${expected}" != "${SRC_SHA}" ]]; then
        die "ISO SHA-256 mismatch (sidecar vs actual). ISO may be corrupt."
    fi
    success "ISO SHA-256 verified against sidecar."
fi

# ---------------------------------------------------------------------------
# Flash helper — used by both device and image targets.
# ---------------------------------------------------------------------------
flash_target() {
    local target="$1"
    log "Flashing ${ISO_PATH} → ${target} (bs=${BLOCK_SIZE}, conv=fsync)…"

    if [[ ${FORCE} -eq 0 ]]; then
        warn "ALL DATA ON ${target} WILL BE DESTROYED."
        read -r -p "Type the target name to confirm: " confirm
        [[ "${confirm}" == "$(basename "${target}")" ]] \
            || die "Confirmation mismatch — aborting."
    fi

    # The actual dd call. bs=4M conv=fsync ensures the kernel flushes each
    # block before moving on — this prevents the slow USB tail problem.
    dd if="${ISO_PATH}" of="${target}" \
       bs="${BLOCK_SIZE}" \
       conv=fsync status=progress 2>&1
    sync

    success "Wrote $(numfmt --to=iec "${SRC_SIZE}" 2>/dev/null || echo "${SRC_SIZE} bytes") to ${target}."
}

# ---------------------------------------------------------------------------
# Verify helper — re-reads the target and compares its hash.
# ---------------------------------------------------------------------------
verify_target() {
    local target="$1"
    log "Verifying write (re-reading ${target} and comparing SHA-256)…"

    # If the target is a block device, drop caches first to force a real read.
    if [[ -b "${target}" ]]; then
        sync
        echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || \
            warn "(could not drop page cache — verification may be cache-hot)"
    fi

    local got_sha
    got_sha=$(dd if="${target}" bs="${BLOCK_SIZE}" count=$((SRC_SIZE / (4*1024*1024) + 1)) \
              status=none 2>/dev/null | \
              head -c "${SRC_SIZE}" | sha256sum | awk '{print $1}')

    if [[ "${got_sha}" == "${SRC_SHA}" ]]; then
        success "Verified: SHA-256 matches source ISO."
    else
        die "Verify FAILED.\n  expected: ${SRC_SHA}\n  got     : ${got_sha}"
    fi
}

# ---------------------------------------------------------------------------
# Block-device mode.
# ---------------------------------------------------------------------------
if [[ -n "${TARGET_DEVICE}" ]]; then
    [[ -b "${TARGET_DEVICE}" ]] || die "Not a block device: ${TARGET_DEVICE}"

    # Refuse to write to a mounted or in-use device.
    if lsblk -no MOUNTPOINT "${TARGET_DEVICE}" 2>/dev/null | grep -q .; then
        die "Target device has mounted partitions. Unmount and retry."
    fi
    # Refuse the system disk (where / is mounted) — protects the build host.
    root_disk=$(findmnt -no SOURCE / 2>/dev/null | sed 's/[0-9]*$//' || true)
    if [[ -n "${root_disk}" ]] && [[ "${TARGET_DEVICE}" == "${root_disk}" ]]; then
        die "Refusing to flash the running system's root disk (${TARGET_DEVICE})."
    fi

    flash_target "${TARGET_DEVICE}"
    verify_target "${TARGET_DEVICE}"

# ---------------------------------------------------------------------------
# Raw image file mode (covers --image and --drivedroid).
# ---------------------------------------------------------------------------
else
    if [[ ${DRIVEDROID} -eq 1 ]]; then
        RAW_IMAGE="${DXN1_OUT}/${DXN1_DRIVEDROID_IMG}"
    fi
    [[ -n "${RAW_IMAGE}" ]] || die "No image output path resolved."

    log "Creating image file: ${RAW_IMAGE}"
    # Make it sparse — exactly the size of the ISO. dd will allocate on write.
    if [[ ! -e "${RAW_IMAGE}" ]]; then
        truncate -s "${SRC_SIZE}" "${RAW_IMAGE}"
    elif [[ "$(stat -c '%s' "${RAW_IMAGE}")" -lt "${SRC_SIZE}" ]]; then
        truncate -s "${SRC_SIZE}" "${RAW_IMAGE}"
    fi
    flash_target "${RAW_IMAGE}"
    verify_target "${RAW_IMAGE}"

    # If DriveDroid mode, emit the small README DriveDroid expects to import.
    if [[ ${DRIVEDROID} -eq 1 ]]; then
        cat > "${RAW_IMAGE}.import.txt" <<EOF
DriveDroid image — DXN1-OS ${LFS_VERSION}
=================================================
Image file:  ${RAW_IMAGE}
Size:        $(numfmt --to=iec "${SRC_SIZE}")
SHA-256:     ${SRC_SHA}

Import steps in DriveDroid (Android):
  1. Open DriveDroid → "Images" tab → + → "Create writable image"
  2. Pick "Import from file" and select $(basename "${RAW_IMAGE}")
  3. Name the image "DXN1-OS ${LFS_VERSION}".
  4. Tap the image → "Writeable USB" → boot your PC from the phone.
  5. If your PC fails to enumerate, switch DriveDroid to "Read-only USB"
     mode (the ISO is read-only by design).

Note: This image is a *raw* ISO9660 image; DriveDroid will expose it to the
host PC as a USB mass-storage device with the boot sector already embedded.
EOF
        success "DriveDroid import notes: ${RAW_IMAGE}.import.txt"
    fi

    # Optionally gzip the image for distribution.
    if [[ -n "${DXN1_COMPRESS_IMAGE:-}" ]]; then
        log "Compressing ${RAW_IMAGE} with gzip…"
        gzip -kf "${RAW_IMAGE}"
        success "Compressed image: ${RAW_IMAGE}.gz"
    fi
fi

# Final sync — make sure the kernel has flushed all writes.
sync
sync
sync

printf '%s\n' "$(date -Is)" > "${DXN1_STATE_DIR}/stage-08.done"
success "Stage 08 complete."
