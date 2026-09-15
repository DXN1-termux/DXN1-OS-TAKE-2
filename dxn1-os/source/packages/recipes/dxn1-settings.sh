#!/bin/sh
# DXN1-OS package build recipe: dxn1-settings 1.0
# The DXN1-OS settings app — system configuration GUI
set -e

PKG="dxn1-settings"
VER="1.0"

echo "[recipe] building ${PKG}-${VER} (settings app)..."

mkdir -p "$DESTDIR/usr/bin"
mkdir -p "$DESTDIR/usr/share/applications"
mkdir -p "$DESTDIR/usr/share/icons/hicolor/256x256/apps"

cat > "$DESTDIR/usr/bin/dxn1-settings" <<'PYEOF'
#!/usr/bin/env python3
"""DXN1-OS Settings — system configuration GUI."""
import os, sys, subprocess, tkinter as tk
from tkinter import ttk, messagebox, filedialog

class SettingsApp:
    def __init__(self, root):
        self.root = root
        root.title("DXN1-OS Settings")
        root.geometry("700x500")
        root.configure(bg="#060a08")

        nb = ttk.Notebook(root)
        nb.pack(fill="both", expand=True, padx=10, pady=10)

        self.tab_system(nb)
        self.tab_network(nb)
        self.tab_display(nb)
        self.tab_users(nb)
        self.tab_about(nb)

    def tab_system(self, nb):
        f = ttk.Frame(nb); nb.add(f, text="System")
        ttk.Label(f, text="Hostname:", font=("Monospace", 11)).grid(row=0, column=0, padx=10, pady=10, sticky="w")
        self.hostname = tk.StringVar(value=open("/etc/hostname").read().strip())
        ttk.Entry(f, textvariable=self.hostname, width=20).grid(row=0, column=1, padx=5)
        ttk.Button(f, text="Apply", command=lambda: self.apply_hostname()).grid(row=0, column=2)
        ttk.Label(f, text="Timezone:", font=("Monospace", 11)).grid(row=1, column=0, padx=10, pady=10, sticky="w")
        self.tz = tk.StringVar(value=os.path.realpath("/etc/localtime").split("/")[-1] if os.path.exists("/etc/localtime") else "UTC")
        ttk.Entry(f, textvariable=self.tz, width=20).grid(row=1, column=1)
        ttk.Button(f, text="Apply", command=lambda: subprocess.run(["ln", "-sf", f"/usr/share/zoneinfo/{self.tz.get()}", "/etc/localtime"])).grid(row=1, column=2)

    def tab_network(self, nb):
        f = ttk.Frame(nb); nb.add(f, text="Network")
        ttk.Label(f, text="Network interfaces:", font=("Monospace", 12, "bold")).pack(pady=10)
        out = subprocess.check_output(["ip", "-br", "addr"], text=True)
        ttk.Label(f, text=out, font=("Monospace", 10), justify="left").pack(padx=10)
        ttk.Button(f, text="Connect (DHCP)", command=lambda: subprocess.run(["dhcpcd"])).pack(pady=5)

    def tab_display(self, nb):
        f = ttk.Frame(nb); nb.add(f, text="Display")
        ttk.Label(f, text="Desktop environment:", font=("Monospace", 11)).pack(pady=10)
        de = tk.StringVar(value=self.read_de())
        for option in ["none", "gnome", "plasma", "dxn1-wm"]:
            ttk.Radiobutton(f, text=option, variable=de, value=option).pack(anchor="w", padx=20)
        ttk.Button(f, text="Apply (reboot to take effect)",
                   command=lambda: self.set_de(de.get())).pack(pady=10)

    def tab_users(self, nb):
        f = ttk.Frame(nb); nb.add(f, text="Users")
        ttk.Label(f, text="User accounts:", font=("Monospace", 12, "bold")).pack(pady=10)
        users = [l.split(":")[0] for l in open("/etc/passwd") if int(l.split(":")[2]) >= 1000 or l.split(":")[0] == "root"]
        for u in users[:10]:
            ttk.Label(f, text=f"  • {u}", font=("Monospace", 10)).pack(anchor="w", padx=20)
        ttk.Button(f, text="Add user", command=lambda: subprocess.run(["adduser"])).pack(pady=5)

    def tab_about(self, nb):
        f = ttk.Frame(nb); nb.add(f, text="About")
        ver = open("/etc/dxn1-release").read() if os.path.exists("/etc/dxn1-release") else "DXN1-OS"
        ttk.Label(f, text=ver, font=("Monospace", 11), justify="left").pack(pady=20, padx=20)
        ttk.Label(f, text=f"Kernel: {__import__('os').uname().release}", font=("Monospace", 10)).pack(padx=20)
        ttk.Label(f, text="(c) DXN1 Project — GPLv2+", font=("Monospace", 9)).pack(side="bottom", pady=10)

    def read_de(self):
        try:
            return open("/etc/dxn1/desktop-env").read().strip()
        except FileNotFoundError:
            return "none"

    def set_de(self, de):
        os.makedirs("/etc/dxn1", exist_ok=True)
        open("/etc/dxn1/desktop-env", "w").write(de)
        messagebox.showinfo("Applied", f"Desktop set to {de}. Reboot to apply.")

    def apply_hostname(self):
        h = self.hostname.get()
        open("/etc/hostname", "w").write(h + "\n")
        subprocess.run(["hostname", h])
        messagebox.showinfo("Applied", f"Hostname set to {h}")

if __name__ == "__main__":
    root = tk.Tk()
    ttk.Style().theme_use("clam")
    SettingsApp(root)
    root.mainloop()
PYEOF
chmod +x "$DESTDIR/usr/bin/dxn1-settings"

cat > "$DESTDIR/usr/share/applications/dxn1-settings.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Settings
Comment=DXN1-OS System Settings
Exec=dxn1-settings
Icon=settings
Terminal=false
Categories=System;Settings;
EOF

cp /usr/share/dxn1/assets/apps/settings.png "$DESTDIR/usr/share/icons/hicolor/256x256/apps/settings.png"

cat > "$DESTDIR/MANIFEST" <<EOF
/usr/bin/dxn1-settings
/usr/share/applications/dxn1-settings.desktop
/usr/share/icons/hicolor/256x256/apps/settings.png
EOF

echo "[recipe] ${PKG}-${VER} built (settings app)"
