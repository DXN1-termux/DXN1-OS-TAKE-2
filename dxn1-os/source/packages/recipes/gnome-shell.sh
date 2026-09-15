#!/bin/sh
# DXN1-OS package build recipe: GNOME Shell 46
# Optional desktop environment — install with: dxn1-pkg install gnome-shell
# https://gitlab.gnome.org/GNOME/gnome-shell
set -e

PKG="gnome-shell"
VER="46.0"

echo "[recipe] building ${PKG}-${VER} (optional desktop)..."

# GNOME is a large meta-package. On DXN1-OS we install it as a bundle
# of prebuilt components (from the LFS build, stage 04).
# This recipe orchestrates the GNOME stack installation.

DEPENDS="xorg-server wayland pipewire mesa fontconfig noto-fonts gtk3 glib2"
echo "    dependencies: $DEPENDS"

# verify deps are installed
for dep in $DEPENDS; do
    if ! pkg-config --exists "$dep" 2>/dev/null; then
        echo "    [!] missing dependency: $dep (run: dxn1-pkg install $dep)"
    fi
done

# GNOME core components (built in LFS stage 04, staged here)
COMPONENTS="
    glib-2.80.0
    gtk-4.14.0
    gnome-shell-46.0
    mutter-46.0
    gnome-control-center-46.0
    gnome-settings-daemon-46.0
    gnome-session-46.0
    gdm-46.0
    nautilus-46.0
    gnome-terminal-3.52.0
    gedit-46.0
    gnome-system-monitor-46.0
    gnome-software-46.0
"

for comp in $COMPONENTS; do
    name="${comp%-*}"
    ver="${comp##*-}"
    echo "    staging $name-$ver..."
    # In a real build, this would fetch + configure + make + install each.
    # Here we reference the prebuilt artifacts from the LFS chroot.
    SRC="/var/cache/dxn1-pkg/gnome/${comp}.tar.xz"
    if [ -f "$SRC" ]; then
        tar xf "$SRC" -C "$DESTDIR/"
    else
        echo "      (prebuilt artifact expected at $SRC — run build.sh --stage 04)"
    fi
done

# default desktop marker
mkdir -p "$DESTDIR/etc/dxn1"
echo "gnome" > "$DESTDIR/etc/dxn1/desktop-env"

# enable gdm (GNOME Display Manager) as the login manager
mkdir -p "$DESTDIR/etc/init.d"
cat > "$DESTDIR/etc/init.d/gdm" <<'EOF'
#!/bin/sh
# GDM service for DXN1-OS
case "$1" in
    start) /usr/sbin/gdm3 ;;
    stop)  killall gdm3 ;;
    restart) $0 stop; sleep 1; $0 start ;;
    status) pgrep -x gdm3 > /dev/null && echo "running" || echo "stopped" ;;
esac
EOF
chmod +x "$DESTDIR/etc/init.d/gdm"

echo "[recipe] ${PKG}-${VER} staged (GNOME desktop environment)"
echo "    set as default via: echo gnome > /etc/dxn1/desktop-env"
echo "    enable gdm:         /etc/init.d/gdm start"
