#!/bin/sh
# DXN1-OS package build recipe: dxn1-store 1.0
# The DXN1-OS app store — GUI front-end for dxn1-pkg
# Browse, search, install, and remove packages with a click.
set -e

PKG="dxn1-store"
VER="1.0"

echo "[recipe] building ${PKG}-${VER} (app store)..."

# dxn1-store is a Python/GTK app that wraps dxn1-pkg
# It reads the repo index from /var/lib/dxn1-pkg/repo/index.txt

mkdir -p "$DESTDIR/usr/bin"
mkdir -p "$DESTDIR/usr/share/dxn1/store"
mkdir -p "$DESTDIR/usr/share/applications"
mkdir -p "$DESTDIR/usr/share/icons/hicolor/256x256/apps"

# the store binary (Python script)
cat > "$DESTDIR/usr/bin/dxn1-store" <<'PYEOF'
#!/usr/bin/env python3
"""DXN1-OS App Store — GUI front-end for dxn1-pkg."""
import os, sys, json, subprocess, tkinter as tk
from tkinter import ttk, messagebox

REPO_INDEX = "/var/lib/dxn1-pkg/repo/index.txt"
INSTALLED_DB = "/var/lib/dxn1-pkg/installed.db"

def load_packages():
    pkgs = []
    try:
        with open(REPO_INDEX) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = [p.strip() for p in line.split("|")]
                if len(parts) >= 5:
                    pkgs.append({"name": parts[0], "version": parts[1],
                                 "category": parts[2], "desc": parts[3], "size": parts[4]})
    except FileNotFoundError:
        pass
    return pkgs

def is_installed(name):
    try:
        with open(INSTALLED_DB) as f:
            return name in [l.split("\t")[0] for l in f]
    except FileNotFoundError:
        return False

class StoreApp:
    def __init__(self, root):
        self.root = root
        root.title("DXN1-OS App Store")
        root.geometry("900x600")
        root.configure(bg="#060a08")
        self.packages = load_packages()
        self.build_ui()

    def build_ui(self):
        # header
        header = ttk.Frame(self.root)
        header.pack(fill="x", padx=10, pady=5)
        ttk.Label(header, text="DXN1-OS App Store", font=("Monospace", 16, "bold"),
                  foreground="#34d399", background="#060a08").pack(side="left")
        # search
        self.search = tk.StringVar()
        self.search.trace("w", self.filter)
        ttk.Entry(header, textvariable=self.search, width=30).pack(side="right")

        # package list
        self.tree = ttk.Treeview(self.root, columns=("name","version","category","desc","status"),
                                 show="headings", height=20)
        for c in ("name","version","category","desc","status"):
            self.tree.heading(c, text=c.capitalize())
            self.tree.column(c, width=120 if c != "desc" else 300)
        self.tree.pack(fill="both", expand=True, padx=10, pady=5)

        # buttons
        btns = ttk.Frame(self.root)
        btns.pack(fill="x", padx=10, pady=5)
        ttk.Button(btns, text="Install", command=self.install).pack(side="left")
        ttk.Button(btns, text="Remove", command=self.remove).pack(side="left")
        ttk.Button(btns, text="Refresh", command=self.refresh).pack(side="left")

        self.populate()

    def populate(self, filter_text=""):
        self.tree.delete(*self.tree.get_children())
        for p in self.packages:
            if filter_text and filter_text.lower() not in p["name"].lower() and filter_text.lower() not in p["desc"].lower():
                continue
            status = "installed" if is_installed(p["name"]) else "available"
            self.tree.insert("", "end", values=(p["name"], p["version"], p["category"], p["desc"], status))

    def filter(self, *args):
        self.populate(self.search.get())

    def selected_pkg(self):
        sel = self.tree.selection()
        if not sel:
            return None
        return self.tree.item(sel[0])["values"][0]

    def install(self):
        pkg = self.selected_pkg()
        if not pkg:
            return
        if messagebox.askyesno("Install", f"Install {pkg}?"):
            subprocess.run(["dxn1-pkg", "install", str(pkg)])
            self.populate(self.search.get())

    def remove(self):
        pkg = self.selected_pkg()
        if not pkg:
            return
        if messagebox.askyesno("Remove", f"Remove {pkg}?"):
            subprocess.run(["dxn1-pkg", "remove", str(pkg)])
            self.populate(self.search.get())

    def refresh(self):
        subprocess.run(["dxn1-pkg", "update"])
        self.packages = load_packages()
        self.populate(self.search.get())

if __name__ == "__main__":
    root = tk.Tk()
    style = ttk.Style()
    style.theme_use("clam")
    app = StoreApp(root)
    root.mainloop()
PYEOF
chmod +x "$DESTDIR/usr/bin/dxn1-store"

# desktop entry
cat > "$DESTDIR/usr/share/applications/dxn1-store.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=App Store
Comment=DXN1-OS Package Manager
Exec=dxn1-store
Icon=appstore
Terminal=false
Categories=System;PackageManager;
EOF

# icon
cp /usr/share/dxn1/assets/apps/appstore.png "$DESTDIR/usr/share/icons/hicolor/256x256/apps/appstore.png"

# manifest
cat > "$DESTDIR/MANIFEST" <<EOF
/usr/bin/dxn1-store
/usr/share/applications/dxn1-store.desktop
/usr/share/icons/hicolor/256x256/apps/appstore.png
EOF

echo "[recipe] ${PKG}-${VER} built (app store GUI)"
