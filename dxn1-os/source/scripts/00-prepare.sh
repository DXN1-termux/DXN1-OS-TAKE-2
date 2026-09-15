#!/bin/bash
# =============================================================================
# Stage 00 — Host preparation
# -----------------------------------------------------------------------------
# Verifies the build host has the tools, libraries, and free disk required by
# the rest of the pipeline. Creates the build directory tree, fetches source
# tarball indices, and provisions the unprivileged `lfs` build user used by
# stage 02 (the LFS bootstrap).
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/config/environment"

# ---------------------------------------------------------------------------
# Colour / logging helpers.
# ---------------------------------------------------------------------------
if [[ -t 2 ]]; then
    C_R=$'\033[31m'; C_G=$'\033[32m'; C_Y=$'\033[33m'; C_B=$'\033[34m'; C_0=$'\033[0m'
else C_R=""; C_G=""; C_Y=""; C_B=""; C_0=""; fi
log()     { printf '%s[%s]%s %s\n'  "${C_B}" "$(date +%H:%M:%S)" "${C_0}" "$*"; }
success() { printf '%s✓ %s%s%s\n'   "${C_G}" "$*" "${C_0}"; }
warn()    { printf '%s! %s%s%s\n'   "${C_Y}" "$*" "${C_0}" >&2; }
die()     { printf '%s✗ %s%s%s\n'   "${C_R}" "$*" "${C_0}" >&2; exit 1; }

trap 'die "Stage 00 aborted at line $LINENO (exit $?)"' ERR

# ---------------------------------------------------------------------------
# 1. Required host tools. Each entry: "binary|description|version_flag".
# ---------------------------------------------------------------------------
HOST_TOOLS=(
    "bash|POSIX shell|bash --version|5"
    "gcc|C compiler|gcc --version|12"
    "g++|C++ compiler|g++ --version|12"
    "make|build tool|make --version|4.2"
    "patch|source patcher|patch --version|2.7"
    "bison|parser generator|bison --version|3.4"
    "flex|lexer generator|flex --version|2.6"
    "gawk|awk|gawk --version|5.0"
    "perl|scripting|perl --version|5.36"
    "python3|scripting|python3 --version|3.11"
    "wget|download|wget --version|1.21"
    "xorriso|ISO creation|xorriso --version|1.5"
    "mksquashfs|squashfs|mksquashfs -version|4.5"
    "parted|partitioner|parted --version|3.4"
    "grub-mkrescue|bootloader|grub-mkrescue --version|2.06"
    "dialog|TUI|dialog --version|1.3"
    "bc|calculator|bc --version|1.07"
    "mkfs.ext4|filesystem|mkfs.ext4 -V 2>&1|1.46"
)

log "Verifying host build prerequisites…"
missing=0
for entry in "${HOST_TOOLS[@]}"; do
    IFS='|' read -r bin desc ver_cmd min_ver <<< "$entry"
    if ! command -v "${bin}" >/dev/null 2>&1; then
        warn "Missing host tool: ${bin} (${desc})"
        missing=$((missing + 1))
        continue
    fi
    # Don't enforce version parse strictly — just confirm it runs.
    if ! eval "${ver_cmd}" >/dev/null 2>&1; then
        warn "${bin} present but '${ver_cmd}' failed."
        missing=$((missing + 1))
    fi
done
[[ ${missing} -eq 0 ]] || die "Host is missing ${missing} required tool(s). Install them and re-run."

# Required kernel features (tmpfs, devtmpfs)
if ! grep -q ' devtmpfs ' /proc/filesystems 2>/dev/null; then
    die "Host kernel lacks devtmpfs support."
fi
if ! grep -q ' tmpfs ' /proc/filesystems 2>/dev/null; then
    die "Host kernel lacks tmpfs support."
fi
success "Host tools OK."

# ---------------------------------------------------------------------------
# 2. Disk space check.  LFS needs ~10 GiB for bootstrap + ~15 GiB for full build.
# ---------------------------------------------------------------------------
required_gb=25
free_kb=$(df -k "${DXN1_OUT%/*}" 2>/dev/null | awk 'NR==2 {print $4}' || df -k / | awk 'NR==2 {print $4}')
free_gb=$(( free_kb / 1024 / 1024 ))
log "Free disk in ${DXN1_OUT%/*}: ${free_gb} GiB (need ${required_gb} GiB)"
if [[ ${free_gb} -lt ${required_gb} ]]; then
    die "Insufficient disk space: ${free_gb} GiB free, need ≥ ${required_gb} GiB."
fi
success "Disk space OK."

# ---------------------------------------------------------------------------
# 3. Create the build directory tree.
# ---------------------------------------------------------------------------
log "Creating build directories under ${DXN1_OUT}…"
for d in \
    "${DXN1_OUT}" "${DXN1_SOURCES}" "${DXN1_STATE_DIR}" \
    "${DXN1_LOG_DIR}" "${DXN1_TC_DIR}" "${DXN1_ROOTFS}" \
    "${DXN1_KERNEL_DIR}" "${DXN1_ISO_DIR}" "${DXN1_TARBALL_CACHE}" \
    "${DXN1_ROOTFS}/proc" "${DXN1_ROOTFS}/sys" "${DXN1_ROOTFS}/dev" \
    "${DXN1_ROOTFS}/etc" "${DXN1_ROOTFS}/var/log"; do
    mkdir -p "${d}"
done
chmod 1777 "${DXN1_ROOTFS}/tmp" 2>/dev/null || true
success "Build tree created."

# ---------------------------------------------------------------------------
# 4. Provision the `lfs` user.
# ---------------------------------------------------------------------------
log "Provisioning unprivileged build user '${LFS_USER}'…"
if ! getent group "${LFS_GROUP}" >/dev/null 2>&1; then
    groupadd -f "${LFS_GROUP}"
fi
if ! id -u "${LFS_USER}" >/dev/null 2>&1; then
    useradd -m -d "${LFS_HOME}" -g "${LFS_GROUP}" -s /bin/bash \
            -c "DXN1-OS build user" "${LFS_USER}"
fi

# Make the build tree owned by the lfs user so stages 02–04 can run
# unprivileged and drop suid bits safely.
chown -R "${LFS_USER}:${LFS_GROUP}" "${DXN1_OUT}"

# A bash profile that sets up the toolchain environment for the lfs user.
cat > "${LFS_HOME}/.bash_profile" <<'EOF'
set +h
umask 022
export LFS=/mnt/dxn1
export LC_ALL=POSIX
export LFS_TGT=$(uname -m)-lfs-linux-gnu
export PATH=/tools/bin:/bin:/usr/bin
export MAKEFLAGS="-j$(nproc)"
EOF
chown "${LFS_USER}:${LFS_GROUP}" "${LFS_HOME}/.bash_profile"
success "User '${LFS_USER}' ready."

# ---------------------------------------------------------------------------
# 5. Fetch the upstream source index (LFS wget-list) if not already present.
# ---------------------------------------------------------------------------
WGETLIST="${DXN1_SOURCES}/wget-list"
if [[ ! -s "${WGETLIST}" ]]; then
    log "Fetching LFS wget-list (package URLs)…"
    if wget -q -O "${WGETLIST}.tmp" \
        "https://sources.buildroot.net/wget-list-${LFS_VERSION}"; then
        mv "${WGETLIST}.tmp" "${WGETLIST}"
        success "wget-list cached (${WGETLIST})."
    else
        rm -f "${WGETLIST}.tmp"
        warn "Could not fetch wget-list. Stage 02 will fetch each tarball directly."
    fi
else
    success "wget-list already cached."
fi

# ---------------------------------------------------------------------------
# 6. Write the stage-0 done marker.
# ---------------------------------------------------------------------------
printf '%s\n' "$(date -Is)" > "${DXN1_STATE_DIR}/stage-00.done"
success "Stage 00 complete."
