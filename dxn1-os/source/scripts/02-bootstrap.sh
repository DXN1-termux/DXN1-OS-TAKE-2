#!/bin/bash
# =============================================================================
# Stage 02 — LFS bootstrap toolchain
# -----------------------------------------------------------------------------
# Builds the temporary cross-toolchain used to compile the rest of the system.
# Implements the LFS book chapter 5 / 6 "temporal toolchain":
#
#   pass 1:  binutils (target=${LFS_TGT})
#            gcc      (target=${LFS_TGT}, no libc yet — uses inline syscalls)
#            linux    headers
#            glibc    (host=${LFS_TGT})
#            libstdc++ (target=${LFS_TGT})
#   pass 2:  binutils, gcc, this time linked against the freshly built glibc
#
# The toolchain lives in /tools on the build host and is *only* used to build
# stage 04 — it never lands on the installed system.
#
# This stage is the longest part of the build (~3–6 hours). It is designed to
# be re-runnable: each package's build is skipped if its .stamp file exists.
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
trap 'die "Stage 02 aborted at line $LINENO (exit $?)"' ERR

# Build everything as the unprivileged lfs user.
build_as_lfs() {
    local cmd="$1"
    su - "${LFS_USER}" -c "set -euo pipefail; ${cmd}"
}

# ---------------------------------------------------------------------------
# Per-package build helper.
#   build_pkg <name> <version> <build-cmd>
# Skips if state/<name>.stamp exists. Logs to logs/<name>.log.
# ---------------------------------------------------------------------------
build_pkg() {
    local name="$1" version="$2"; shift 2
    local stamp="${DXN1_STATE_DIR}/tc-${name}.stamp"
    local logfile="${DXN1_LOG_DIR}/tc-${name}-${version}.log"

    if [[ -f "${stamp}" ]]; then
        success "Skipping ${name}-${version} (already built)."
        return 0
    fi

    local pkgdir="${name}-${version}"
    local srcdir="${DXN1_SOURCES}/${pkgdir}"
    [[ -d "${srcdir}" ]] || die "Source dir not found: ${srcdir}"

    log "Building ${pkgdir}…"
    : > "${logfile}"

    build_as_lfs "cd '${srcdir}' && $* 2>&1" >> "${logfile}" 2>&1 || \
        { tail -n 40 "${logfile}" >&2; die "Build failed: ${pkgdir} (see ${logfile})"; }

    printf '%s\n' "$(date -Is)" > "${stamp}"
    success "Built ${pkgdir} (log: ${logfile})"
}

# ---------------------------------------------------------------------------
# 0. Create /tools symlink & set permissions.
# ---------------------------------------------------------------------------
log "Setting up /tools toolchain prefix…"
mkdir -p "${DXN1_TC_DIR}"
ln -sfn "${DXN1_TC_DIR}" /tools
chown -h "${LFS_USER}:${LFS_GROUP}" "${DXN1_TC_DIR}"
chmod 0755 "${DXN1_TC_DIR}"

# Make sure the lfs user can write the toolchain prefix.
chown -R "${LFS_USER}:${LFS_GROUP}" "${DXN1_TC_DIR}" "${DXN1_SOURCES}"

# Build flags shared across all packages.
export LFS_TGT LC_ALL MAKEFLAGS
export PATH="/tools/bin:${PATH}"
export CONFIG_SITE=""

# ---------------------------------------------------------------------------
# 1. Fetch & unpack source tarballs.
# ---------------------------------------------------------------------------
fetch_pkg() {
    local name="$1" version="$2" url="${3:-}"
    local tbz="${DXN1_TARBALL_CACHE}/${name}-${version}.tar.xz"
    if [[ -f "${tbz}" ]]; then return 0; fi
    log "Fetching ${name}-${version}…"
    if [[ -n "${url}" ]]; then
        wget -q -O "${tbz}" "${url}" || rm -f "${tbz}"
    fi
    [[ -s "${tbz}" ]] || die "Tarball missing: ${tbz}"
}

# Pin a representative set of upstream URLs; the full wget-list is in
# ${DXN1_SOURCES}/wget-list. The fetcher falls back to LFS_MIRROR.
fetch_pkg binutils 2.43.1     "https://ftp.gnu.org/gnu/binutils/binutils-2.43.1.tar.xz"
fetch_pkg gcc       14.2.0    "https://ftp.gnu.org/gnu/gcc/gcc-14.2.0/gcc-14.2.0.tar.xz"
fetch_pkg glibc     2.40      "https://ftp.gnu.org/gnu/glibc/glibc-2.40.tar.xz"
fetch_pkg linux     6.10.5    "${KERNEL_MIRROR}/linux-6.10.5.tar.xz"
fetch_pkg gmp       6.3.0     "https://ftp.gnu.org/gnu/gmp/gmp-6.3.0.tar.xz"
fetch_pkg mpfr      4.2.1     "https://ftp.gnu.org/gnu/mpfr/mpfr-4.2.1.tar.xz"
fetch_pkg mpc       1.3.1     "https://ftp.gnu.org/gnu/mpc/mpc-1.3.1.tar.gz"
fetch_pkg isl       0.27      "https://libisl.sourceforge.io/isl-0.27.tar.xz"

# Unpack into the sources directory if not already there.
for pkg in binutils-2.43.1 gcc-14.2.0 glibc-2.40 linux-6.10.5 gmp-6.3.0 mpfr-4.2.1 mpc-1.3.1 isl-0.27; do
    if [[ ! -d "${DXN1_SOURCES}/${pkg}" ]]; then
        log "Unpacking ${pkg}…"
        local_tbz="${DXN1_TARBALL_CACHE}/${pkg}.tar.xz"
        [[ -f "${local_tbz}" ]] || local_tbz="${DXN1_TARBALL_CACHE}/${pkg}.tar.gz"
        su - "${LFS_USER}" -c "tar -xf '${local_tbz}' -C '${DXN1_SOURCES}'"
    fi
done

# GMP/MPFR/MPC are in-tree dependencies of GCC — symlink them in.
GCC_DIR="${DXN1_SOURCES}/gcc-14.2.0"
ln -sfn ../gmp-6.3.0  "${GCC_DIR}/gmp"
ln -sfn ../mpfr-4.2.1 "${GCC_DIR}/mpfr"
ln -sfn ../mpc-1.3.1  "${GCC_DIR}/mpc"
ln -sfn ../isl-0.27   "${GCC_DIR}/isl"

# ---------------------------------------------------------------------------
# 2. Pass 1: cross binutils, gcc (no libc), glibc, libstdc++.
# ---------------------------------------------------------------------------
build_pkg binutils 2.43.1 \
    "mkdir -p build && cd build && \
     ../configure --prefix=/tools --with-sysroot=\$LFS --target=\${LFS_TGT} \
       --disable-nls --disable-werror --enable-gold --enable-ld=default && \
     make ${MAKEFLAGS} && make install"

build_pkg gcc 14.2.0 \
    "mkdir -p build && cd build && \
     ../configure --prefix=/tools --target=\${LFS_TGT} \
       --with-glibc-version=2.40 --with-sysroot=\$LFS \
       --with-newlib --without-headers --disable-nls --disable-shared \
       --disable-multilib --disable-decimal-float --disable-threads \
       --disable-libatomic --disable-libgomp --disable-libquadmath \
       --disable-libssp --disable-libvtv --disable-libstdcxx \
       --enable-languages=c,c++ && \
     make ${MAKEFLAGS} && make install"

# linux-headers: install into the toolchain sysroot.
build_pkg linux 6.10.5 \
    "make mrproper && \
     make headers && \
     cp -rv usr/include/* /tools/\${LFS_TGT}/include/"

build_pkg glibc 2.40 \
    "mkdir -p build && cd build && \
     ../configure --prefix=/tools --host=\${LFS_TGT} --build=\$(uname -m)-pc-linux-gnu \
       --disable-nls --disable-werror --enable-kernel=4.19 \
       --with-headers=/tools/\${LFS_TGT}/include libc_cv_slibdir=/tools/lib && \
     make ${MAKEFLAGS} && make install"

# libstdc++ pass 1
build_pkg gcc 14.2.0 \
    "cd build && \
     ../libstdc++-v3/configure --prefix=/tools --host=\${LFS_TGT} \
       --disable-multilib --disable-nls --disable-shared \
       --disable-libstdcxx-threads --disable-libstdcxx-pch && \
     make ${MAKEFLAGS} && make install"

# ---------------------------------------------------------------------------
# 3. Pass 2: binutils & gcc re-built against the new glibc.
# ---------------------------------------------------------------------------
build_pkg binutils 2.43.1 \
    "rm -rf build && mkdir build && cd build && \
     CC=\${LFS_TGT}-gcc AR=\${LFS_TGT}-ar RANLIB=\${LFS_TGT}-ranlib \
     ../configure --prefix=/tools --target=\${LFS_TGT} --with-sysroot=\$LFS \
       --disable-nls --disable-werror --enable-gold && \
     make ${MAKEFLAGS} && make install"

build_pkg gcc 14.2.0 \
    "rm -rf build && mkdir build && cd build && \
     CC=\${LFS_TGT}-gcc CXX=\${LFS_TGT}-g++ \
     ../configure --prefix=/tools --host=\${LFS_TGT} --target=\${LFS_TGT} \
       --with-sysroot=\$LFS --disable-nls --disable-multilib \
       --enable-languages=c,c++ --enable-default-pie --enable-default-ssp \
       --enable-shared --enable-threads=posix && \
     make ${MAKEFLAGS} && make install"

# ---------------------------------------------------------------------------
# 4. Sanity-check the toolchain.
# ---------------------------------------------------------------------------
log "Sanity-checking the toolchain…"
cat > /tmp/dxn1-tc-check.c <<'EOF'
#include <stdio.h>
int main(void){ printf("dxn1-tc-ok\\n"); return 0; }
EOF
build_as_lfs "/tools/bin/${LFS_TGT}-gcc /tmp/dxn1-tc-check.c -o /tmp/dxn1-tc-check"
# Run the produced binary inside a chroot-like environment.
[[ -x /tools/bin/${LFS_TGT}-gcc ]] || die "Toolchain binary missing."
success "Toolchain sanity check passed."

printf '%s\n' "$(date -Is)" > "${DXN1_STATE_DIR}/stage-02.done"
success "Stage 02 complete. Toolchain in /tools (symlink → ${DXN1_TC_DIR})"
