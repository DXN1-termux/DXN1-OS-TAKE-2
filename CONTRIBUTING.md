# Contributing to DXN1-OS

Thanks for your interest in DXN1-OS! This is a community-driven minimal Linux — contributions welcome.

## Ways to contribute

- 🐛 **Bug reports** — boot failures, installer issues, driver problems
- ✨ **Features** — see the [roadmap](README.md#roadmap) in the README
- 📦 **Drivers** — add support for new hardware (GPU/NIC/WiFi/audio)
- 📝 **Docs** — improve INSTALL.md, BUILD.md, DRIVERS.md
- 🌍 **Translations** — the TUI installer supports i18n
- 🧪 **Testing** — boot the ISO on real hardware and report what works

## Getting started

```bash
git clone https://github.com/DXN1-termux/DXN1-OS-TAKE-2.git
cd DXN1-OS-TAKE-2

# build the ISO from source (see README.md#build-from-source)
python3 scripts/build-initramfs.py dxn1-os/build/initramfs-staging \
  dxn1-os/build/busybox-static dxn1-os/build/initramfs.img
python3 scripts/build-iso-real.py

# run the distribution website
bun install && bun run dev
```

## Code structure

```
scripts/              # build tooling (Python — no cpio/xorriso needed)
  build-initramfs.py  # cpio newc + gzip builder
  build-iso-real.py   # pycdlib ISO assembler with El Torito boot
  gen-deploy-key.py   # SSH deploy key generator

dxn1-os/
  build/              # build artifacts (gitignored where large)
    initramfs-staging/  # the live rootfs (init, installer, updater, /etc)
    kernel-extract/     # extracted Debian kernel
    busybox-static      # downloaded static busybox
  source/             # the LFS source tree (committed)
    scripts/00-08      # 9-stage LFS pipeline
    config/kernel.config
    drivers/{gpu,network,audio,input,wifi}/build.sh
    packages/dxn1-pkg
    live-boot/         # init, installer, updater (baked into the ISO)

src/                  # Next.js distribution website
  app/                 # routes + API
  components/dxn1/     # UI components
  lib/dxn1-data.ts     # driver matrix, features, boot lines

.github/workflows/
  release.yml          # GitHub Actions release workflow
```

## Making changes

### To the live-boot system (init, installer, updater)

1. Edit files in `dxn1-os/build/initramfs-staging/`
2. Syntax-check with busybox: `./busybox-static sh -n <file>`
3. Rebuild the initramfs: `python3 scripts/build-initramfs.py ...`
4. Rebuild the ISO: `python3 scripts/build-iso-real.py`
5. Test in QEMU: `qemu-system-x86_64 -bios OVMF_CODE.fd -cdrom public/dxn1-assets/dxn1-os-1.0.iso -m 512`

### To the website

1. Edit files in `src/`
2. `bun run lint` must pass
3. `bun run dev` to preview at http://localhost:3000

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(installer): add btrfs support to the auto-5gb mode
fix(iso): correct El Torito boot catalog offset
docs(readme): add QEMU quickstart
chore(build): bump busybox to 1.36.1
```

## Pull requests

1. Fork the repo, create a branch: `git checkout -b feat/my-feature`
2. Make your changes, commit with conventional messages
3. Push and open a PR against `main`
4. Include a clear description of what changed + how you tested it

## Releases

Releases are automated via GitHub Actions. To cut a new release:

```bash
git tag v1.1
git push origin v1.1
# → workflow builds ISO + source ZIP, publishes GitHub Release
```

On an installed system, users run `dxn1-update` to pull the new release.

## Code of conduct

Be excellent to each other. No harassment, no personal attacks, no spam. Engineering focus.

## Questions?

Open a [Discussion](https://github.com/DXN1-termux/DXN1-OS-TAKE-2/discussions) — happy to help.

---

Copyright (c) 2025 DXN1 Project · GPL-2.0
