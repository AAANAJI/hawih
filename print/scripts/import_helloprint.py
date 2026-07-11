#!/usr/bin/env python3
"""
import_helloprint.py — load the HelloPrint DESIGN-QA catalog into the Hawih CRM.

This pushes the tagged HelloPrint comparison catalog (categories, products,
options, prices — every item tagged 'helloprint') into the CRM via the
token-gated Print_api endpoints, so the whole set is selectable/manageable
from the CRM Items admin (filter the `print_import_tag` column = 'helloprint').

You DO NOT need this to view the comparison in the store — the store already
renders the catalog under `?qa=helloprint` from a baked snapshot. Run this only
when you want the items to live in the CRM for management.

Stdlib only (urllib) — no pip install required.

Usage:
    export PRINT_IMPORT_TOKEN='<the print_import_token you set in the CRM>'
    python3 scripts/import_helloprint.py                 # categories + items + images
    python3 scripts/import_helloprint.py --no-images     # skip image upload
    python3 scripts/import_helloprint.py --dry-run        # print, send nothing
    python3 scripts/import_helloprint.py --crm https://crm.hawih.com.sa

Images: the generic tiles are SVG; import_image accepts raster only, so each
tile is converted to PNG at run time using the first available of
rsvg-convert / inkscape / ImageMagick (convert|magick) / cairosvg. If none is
installed, image upload is skipped with a notice (the store QA view is
unaffected — it uses the baked SVGs).
"""
import argparse
import json
import mimetypes
import os
import shutil
import ssl
import subprocess
import sys
import tempfile
import urllib.request
import urllib.error
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
STORE_ROOT = os.path.dirname(HERE)  # scripts/.. == store repo root
DEFAULT_PAYLOAD = os.path.join(HERE, "helloprint-import-payload.json")


def die(msg, code=1):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(code)


def post_json(url, token, body, insecure=False):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer " + token)
    ctx = ssl._create_unverified_context() if insecure else None
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def post_multipart(url, token, fields, file_field, file_path, insecure=False):
    boundary = "----hawih" + uuid.uuid4().hex
    ctype, _ = mimetypes.guess_type(file_path)
    ctype = ctype or "application/octet-stream"
    with open(file_path, "rb") as fh:
        file_bytes = fh.read()
    parts = []
    for k, v in fields.items():
        parts.append(("--" + boundary).encode())
        parts.append(('Content-Disposition: form-data; name="%s"' % k).encode())
        parts.append(b"")
        parts.append(str(v).encode("utf-8"))
    parts.append(("--" + boundary).encode())
    parts.append(
        ('Content-Disposition: form-data; name="%s"; filename="%s"'
         % (file_field, os.path.basename(file_path))).encode()
    )
    parts.append(("Content-Type: " + ctype).encode())
    parts.append(b"")
    parts.append(file_bytes)
    parts.append(("--" + boundary + "--").encode())
    parts.append(b"")
    body = b"\r\n".join(parts)
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "multipart/form-data; boundary=" + boundary)
    req.add_header("Authorization", "Bearer " + token)
    ctx = ssl._create_unverified_context() if insecure else None
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---- SVG → PNG conversion (first available tool wins) ----------------------
_CONVERTER = "unchecked"


def _pick_converter():
    if shutil.which("rsvg-convert"):
        return ("rsvg-convert", lambda s, p: ["rsvg-convert", "-w", "800", "-h", "800", s, "-o", p])
    if shutil.which("inkscape"):
        return ("inkscape", lambda s, p: ["inkscape", s, "--export-type=png", "-w", "800", "-h", "800", "-o", p])
    for magick in ("magick", "convert"):
        if shutil.which(magick):
            cmd = [magick] if magick == "convert" else [magick, "convert"]
            return (magick, lambda s, p, _c=cmd: _c + ["-background", "white", "-density", "160", s, p])
    try:
        import cairosvg  # noqa: F401
        return ("cairosvg", None)
    except Exception:
        return (None, None)


def svg_to_png(svg_path, out_png):
    global _CONVERTER
    if _CONVERTER == "unchecked":
        _CONVERTER = _pick_converter()
    name, builder = _CONVERTER
    if not name:
        return False
    try:
        if name == "cairosvg":
            import cairosvg
            cairosvg.svg2png(url=svg_path, write_to=out_png, output_width=800, output_height=800, background_color="white")
        else:
            subprocess.run(builder(svg_path, out_png), check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return os.path.exists(out_png) and os.path.getsize(out_png) > 0
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser(description="Import the HelloPrint design-QA catalog into the Hawih CRM.")
    ap.add_argument("--crm", default="https://crm.hawih.com.sa", help="CRM base URL")
    ap.add_argument("--token", default=os.environ.get("PRINT_IMPORT_TOKEN", ""), help="print_import_token (or env PRINT_IMPORT_TOKEN)")
    ap.add_argument("--payload", default=DEFAULT_PAYLOAD, help="path to helloprint-import-payload.json")
    ap.add_argument("--store-dir", default=STORE_ROOT, help="store repo root (resolves item image_file paths)")
    ap.add_argument("--no-images", action="store_true", help="skip image upload")
    ap.add_argument("--dry-run", action="store_true", help="print what would be sent; send nothing")
    ap.add_argument("--insecure", action="store_true", help="skip TLS verification (debug only)")
    args = ap.parse_args()

    if not os.path.exists(args.payload):
        die("payload not found: " + args.payload + " (run: node scripts/gen-helloprint-catalog.mjs)")
    with open(args.payload, encoding="utf-8") as fh:
        payload = json.load(fh)
    cats, items = payload.get("categories", []), payload.get("items", [])
    print("Payload: %d categories, %d items (tag=%s)" % (len(cats), len(items), payload.get("tag")))

    if args.dry_run:
        print("[dry-run] POST %s/index.php/print_api/import  (categories+items)" % args.crm)
        if not args.no_images:
            print("[dry-run] then POST /print_api/import_image for each item (SVG→PNG)")
        return

    if not args.token:
        die("no token. Set PRINT_IMPORT_TOKEN or pass --token. In the CRM set the "
            "`print_import_token` setting to the same value first.")

    import_url = args.crm.rstrip("/") + "/index.php/print_api/import"
    print("→ %s" % import_url)
    try:
        res = post_json(import_url, args.token, {"categories": cats, "items": items}, args.insecure)
    except urllib.error.HTTPError as e:
        die("import failed HTTP %s: %s" % (e.code, e.read().decode("utf-8", "replace")))
    except urllib.error.URLError as e:
        die("import request failed: %s" % e)
    if not res.get("success"):
        die("import rejected: " + json.dumps(res, ensure_ascii=False))
    ci, it = res.get("categories", {}), res.get("items", {})
    print("  categories: created=%s existing=%s" % (ci.get("created"), ci.get("existing")))
    print("  items: created=%s updated=%s failed=%s" % (it.get("created"), it.get("updated"), it.get("failed")))
    for r in res.get("results", []):
        if r.get("status") == "error":
            print("  ! %s: %s" % (r.get("slug"), r.get("message")))

    if args.no_images:
        print("images: skipped (--no-images)")
        return

    img_url = args.crm.rstrip("/") + "/index.php/print_api/import_image"
    ok = skip = fail = 0
    tmp = tempfile.mkdtemp(prefix="hp-png-")
    try:
        for item in items:
            rel = item.get("image_file")
            if not rel:
                continue
            svg = os.path.join(args.store_dir, rel)
            if not os.path.exists(svg):
                skip += 1
                continue
            png = os.path.join(tmp, item["slug"] + ".png")
            if not svg_to_png(svg, png):
                skip += 1
                continue
            try:
                r = post_multipart(img_url, args.token, {"slug": item["slug"]}, "image", png, args.insecure)
                if r.get("success"):
                    ok += 1
                else:
                    fail += 1
            except urllib.error.HTTPError as e:
                fail += 1
                print("  ! image %s: HTTP %s" % (item["slug"], e.code))
            except urllib.error.URLError as e:
                fail += 1
                print("  ! image %s: %s" % (item["slug"], e))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    if _CONVERTER != "unchecked" and _CONVERTER[0] is None:
        print("images: no SVG→PNG converter found (install librsvg / inkscape / imagemagick / cairosvg). "
              "Skipped %d — the store QA view still shows the tiles from its baked SVGs." % skip)
    else:
        print("images: uploaded=%d skipped=%d failed=%d" % (ok, skip, fail))
    print("Done. In the CRM, filter Items by print_import_tag = 'helloprint' to manage the set.")


if __name__ == "__main__":
    main()
