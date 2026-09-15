#!/bin/bash
# =============================================================================
# DXN1-OS — Main build orchestrator
# =============================================================================
# Drives the full LFS build pipeline by invoking scripts/00..08 in order.
# Each stage script is self-contained: it sources config/environment and does
# its own logging, error handling, and idempotency checks.
#
# Usage:
#   sudo ./build.sh --all                  # run every stage, 00 → 08
#   sudo ./build.sh --stage 03             # run a single stage by number
#   sudo ./build.sh --from 04 --to 07      # run a range of stages
#   sudo ./build.sh --list                 # list available stages
#   sudo ./build.sh --clean                # wipe build output directory
#   ./build.sh --help
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Locate the source tree (this script's directory) and source the environment.
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_ENV="${SCRIPT_DIR}/config/environment"

if [[ ! -r "${CONFIG_ENV}" ]]; then
    echo "FATAL: config/environment not found at ${CONFIG_ENV}" >&2
    exit 1
fi
# shellcheck disable=SC1090
source "${CONFIG_ENV}"

# ---------------------------------------------------------------------------
# Colour helpers — honour NO_COLOR.
# ---------------------------------------------------------------------------
if [[ -n "${NO_COLOR:-}" ]] || [[ ! -t 1 ]]; then
    C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_BOLD=""; C_RESET=""
else
    C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
    C_BLUE=$'\033[34m'; C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
fi

log()     { printf '%s[%s]%s %s\n'   "${C_BLUE}"   "${STAMP:-}"  "${C_RESET}" "$*"; }
success() { printf '%s✓ [%s]%s %s\n' "${C_GREEN}"  "${STAMP:-}"  "${C_RESET}" "$*"; }
warn()    { printf '%s! [%s]%s %s\n' "${C_YELLOW}" "${STAMP:-}"  "${C_RESET}" "$*" >&2; }
error()   { printf '%s✗ [%s]%s %s\n' "${C_RED}"    "${STAMP:-}"  "${C_RESET}" "$*" >&2; }
die()     { error "$*"; exit 1; }

STAMP() { date +%H:%M:%S; }
export -f log success warn error STAMP
export C_RED C_GREEN C_YELLOW C_BLUE C_BOLD C_RESET

# ---------------------------------------------------------------------------
# Stage table.  Each entry: number|name|script path|description.
# ---------------------------------------------------------------------------
declare -a STAGE_TABLE=(
    "00|prepare|scripts/00-prepare.sh|Verify host deps, create lfs user, set up build dirs"
    "01|partition|scripts/01-partition.sh|Partition target disk (5GB / full / manual)"
    "02|bootstrap|scripts/02-bootstrap.sh|Build LFS cross toolchain (binutils, gcc, glibc)"
    "03|kernel|scripts/03-build-kernel.sh|Configure & build the Linux kernel"
    "04|system|scripts/04-build-system.sh|Build base userland (coreutils, bash, util-linux)"
    "05|drivers|scripts/05-drivers.sh|Build & install driver modules"
    "06|install|scripts/06-install.sh|Install DXN1-OS to target disk"
    "07|iso|scripts/07-create-iso.sh|Create bootable ISO with squashfs rootfs"
    "08|usb|scripts/08-usb-flash.sh|Flash ISO to USB or DriveDroid image"
)

stage_exists() {
    local n="$1"
    for entry in "${STAGE_TABLE[@]}"; do
        if [[ "${entry%%|*}" == "${n}" ]]; then return 0; fi
    done
    return 1
}

stage_script() {
    local n="$1"
    for entry in "${STAGE_TABLE[@]}"; do
        if [[ "${entry%%|*}" == "${n}" ]]; then
            local rest="${entry#*|}"; rest="${rest#*|}"
            echo "${rest%%|*}"
            return 0
        fi
    done
    return 1
}

stage_name() {
    local n="$1"
    for entry in "${STAGE_TABLE[@]}"; do
        if [[ "${entry%%|*}" == "${n}" ]]; then
            local rest="${entry#*|}"
            echo "${rest%%|*}"
            return 0
        fi
    done
    return 1
}

stage_desc() {
    local n="$1"
    for entry in "${STAGE_TABLE[@]}"; do
        if [[ "${entry%%|*}" == "${n}" ]]; then
            local rest="${entry#*|}"; rest="${rest#*|}"; rest="${rest#*|}"
            echo "${rest}"
            return 0
        fi
    done
    return 1
}

list_stages() {
    printf '%sStage table:%s\n' "${C_BOLD}" "${C_RESET}"
    printf '  %-4s %-10s %s\n' "NUM" "NAME" "DESCRIPTION"
    for entry in "${STAGE_TABLE[@]}"; do
        IFS='|' read -r num name _ desc <<< "$entry"
        printf '  %-4s %-10s %s\n' "$num" "$name" "$desc"
    done
}

# ---------------------------------------------------------------------------
# Pre-flight checks.
# ---------------------------------------------------------------------------
check_root() {
    if [[ $EUID -ne 0 ]]; then
        die "This script must be run as root (try: sudo $0 $*)."
    fi
}

check_stage_dir() {
    local script
    script="$(stage_script "$1")" || die "Unknown stage: $1"
    [[ -x "${SCRIPT_DIR}/${script}" ]] || die "Stage script not executable: ${script}"
}

run_stage() {
    local n="$1"
    local name desc script
    name="$(stage_name "$n")"
    desc="$(stage_desc "$n")"
    script="$(stage_script "$n")"
    local path="${SCRIPT_DIR}/${script}"

    echo
    printf '%s════════════════════════════════════════════════════════════════%s\n' "${C_BOLD}" "${C_RESET}"
    printf '%sStage %s — %s%s%s\n' "${C_BOLD}" "$n" "${C_RESET}${C_BLUE}" "$name" "${C_RESET}"
    printf '%s%s%s\n' "${C_BOLD}" "$desc" "${C_RESET}"
    printf '%s════════════════════════════════════════════════════════════════%s\n' "${C_BOLD}" "${C_RESET}"
    echo

    STAMP="$(date +%H:%M:%S)"
    log "Launching ${script}"
    local start_ts end_ts rc
    start_ts=$(date +%s)
    set +e
    bash "${path}" "${STAGE_EXTRA_ARGS[@]:-}"
    rc=$?
    set -e
    end_ts=$(date +%s)
    local elapsed=$(( end_ts - start_ts ))

    if [[ $rc -ne 0 ]]; then
        die "Stage ${n} (${name}) failed with exit code ${rc} after ${elapsed}s."
    fi
    STAMP="$(date +%H:%M:%S)"
    success "Stage ${n} (${name}) completed in ${elapsed}s."
    # Record a stamp file so subsequent runs can skip.
    mkdir -p "${DXN1_STATE_DIR}"
    printf '%s\n' "$(date -Is)" > "${DXN1_STATE_DIR}/stage-${n}.done"
}

clean_build() {
    warn "This will recursively delete ${DXN1_OUT}. Continue? [y/N]"
    read -r ans
    if [[ "${ans,,}" != "y" ]]; then die "Aborted."; fi
    rm -rf "${DXN1_OUT}"
    success "Cleaned ${DXN1_OUT}"
}

# ---------------------------------------------------------------------------
# Argument parser.
# ---------------------------------------------------------------------------
ACTION=""
STAGE_FROM=""
STAGE_TO=""
STAGE_EXTRA_ARGS=()

usage() {
    cat <<EOF
DXN1-OS build orchestrator — usage:

  $0 --all                       Run every stage 00 → 08.
  $0 --stage N                   Run a single stage (e.g. --stage 03).
  $0 --from N --to M             Run a contiguous range of stages.
  $0 --list                      List all stages.
  $0 --clean                     Wipe the build output directory.
  $0 --help                      Show this message.

Additional arguments after the recognized flags are passed verbatim to each
invoked stage script (e.g. --stage 01 --disk /dev/sdb).

Environment overrides (see config/environment):
  LFS=${LFS:-/mnt/dxn1}
  DXN1_OUT=${DXN1_OUT:-/var/lib/dxn1/build}
  MAKEFLAGS=${MAKEFLAGS:--j$(nproc)}
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all)     ACTION="all";     shift ;;
        --stage)   ACTION="stage";   STAGE_FROM="$2"; STAGE_TO="$2"; shift 2 ;;
        --from)    STAGE_FROM="$2"; shift 2 ;;
        --to)      STAGE_TO="$2"; shift 2 ;;
        --list)    ACTION="list"; shift ;;
        --clean)   ACTION="clean"; shift ;;
        --help|-h) ACTION="help"; shift ;;
        --*)       STAGE_EXTRA_ARGS+=("$1"); shift ;;
        *)         STAGE_EXTRA_ARGS+=("$1"); shift ;;
    esac
done

if [[ -z "${ACTION}" && -n "${STAGE_FROM}" && -n "${STAGE_TO}" ]]; then
    ACTION="range"
fi

case "${ACTION}" in
    list)  list_stages; exit 0 ;;
    help)  usage; exit 0 ;;
    clean) check_root; clean_build; exit 0 ;;
    stage|range|all) ;;
    "")    usage; die "No action specified (try --help)." ;;
    *)     die "Unknown action: ${ACTION}" ;;
esac

check_root

if [[ "${ACTION}" == "all" ]]; then
    STAGE_FROM="00"; STAGE_TO="08"
elif [[ "${ACTION}" == "range" ]]; then
    [[ -n "${STAGE_TO}" ]] || STAGE_TO="${STAGE_FROM}"
fi

# ---------------------------------------------------------------------------
# Execute the requested range.
# ---------------------------------------------------------------------------
log "DXN1-OS build v${LFS_VERSION} starting at $(date -Is)"
log "Build output : ${DXN1_OUT}"
log "Source tree  : ${SCRIPT_DIR}"
log "MAKEFLAGS    : ${MAKEFLAGS}"
log "Stages       : ${STAGE_FROM} → ${STAGE_TO}"
echo

START=$(date +%s)
for n in $(seq -w "${STAGE_FROM}" "${STAGE_TO}" 2>/dev/null || seq -s ' ' -w "${STAGE_FROM}" "${STAGE_TO}"); do
    n=$(printf '%02d' "$((10#${n}))")
    if ! stage_exists "${n}"; then
        warn "Skipping unknown stage ${n}."
        continue
    fi
    check_stage_dir "${n}"
    run_stage "${n}"
done
END=$(date +%s)

echo
success "DXN1-OS build finished in $((END - START))s."
success "Outputs are in ${DXN1_OUT}"
if [[ -f "${DXN1_OUT}/${DXN1_ISO}" ]]; then
    success "ISO: ${DXN1_OUT}/${DXN1_ISO} ($(du -h "${DXN1_OUT}/${DXN1_ISO}" | cut -f1))"
fi
