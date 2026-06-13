#!/usr/bin/env python3
"""
compress-images.py — ONE-TIME image optimisation for Hawih work photos.

NOT part of the idempotent HTML pipeline and NOT wired into CI — image
re-encoding is generational-lossy, so it must only run deliberately.
The >5% guard below makes an accidental re-run a no-op (a freshly
compressed JPEG re-encoded at the same quality won't shrink another
5%, so the original is kept).

What it does to referenced work JPEGs under assets/img/work/:
  - downscale so the longest side is <= MAX_DIM (work showcases ship at
    up to 3581px for tiles/heroes that never display above ~1600px)
  - re-encode JPEG at QUALITY with optimize + progressive
  - keep the result only if it's >5% smaller than the original
Skips the macOS "* 2.jpeg" duplicates and the unreferenced
"showcase-raw*" originals (those are deleted separately).

Usage:
  python3 scripts/compress-images.py            # apply
  python3 scripts/compress-images.py --dry-run  # report only
"""
from __future__ import annotations

import argparse
import glob
import os
import sys
from PIL import Image

MAX_DIM = 1920
QUALITY = 82
MIN_GAIN = 0.05  # only keep re-encode if >=5% smaller


def is_skippable(path: str) -> bool:
    base = os.path.basename(path)
    return " 2." in base or base.startswith("showcase-raw")


def process(path: str, dry: bool) -> tuple[int, int]:
    """Return (orig_bytes, new_bytes). new==orig means unchanged."""
    orig = os.path.getsize(path)
    try:
        with Image.open(path) as im:
            im.load()
            fmt = im.format
            if fmt != "JPEG":
                return orig, orig
            w, h = im.size
            longest = max(w, h)
            work = im
            if longest > MAX_DIM:
                scale = MAX_DIM / longest
                work = im.resize(
                    (round(w * scale), round(h * scale)),
                    Image.LANCZOS,
                )
            if work.mode not in ("RGB", "L"):
                work = work.convert("RGB")
            tmp = path + ".tmp"
            work.save(tmp, "JPEG", quality=QUALITY,
                      optimize=True, progressive=True)
            new = os.path.getsize(tmp)
            # Keep only if a meaningful win.
            if new < orig * (1 - MIN_GAIN):
                if dry:
                    os.remove(tmp)
                else:
                    os.replace(tmp, path)
                return orig, new
            os.remove(tmp)
            return orig, orig
    except Exception as e:  # noqa: BLE001
        print(f"  ! {path}: {e}", file=sys.stderr)
        return orig, orig


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = os.path.join(os.path.dirname(__file__), "..")
    paths = sorted(glob.glob(os.path.join(root, "assets/img/work/*/*.jpeg")))
    paths = [p for p in paths if not is_skippable(p)]

    t_orig = t_new = 0
    changed = 0
    for p in paths:
        o, n = process(p, args.dry_run)
        t_orig += o
        t_new += n
        if n < o:
            changed += 1
            rel = os.path.relpath(p, root)
            print(f"  ~ {rel}: {o//1024} KB -> {n//1024} KB")
    verb = "would shrink" if args.dry_run else "shrank"
    print(f"\n{changed}/{len(paths)} jpegs {verb}; "
          f"{t_orig//1024} KB -> {t_new//1024} KB "
          f"(saved {(t_orig-t_new)//1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
