#!/usr/bin/env python3
"""
import_helloprint.py — replace the Hawih CRM print catalog with the HelloPrint
clone (design/QA), or add it alongside.

Steps (in order):
  1. BACK UP the current CRM catalog to a JSON file (always, unless --no-backup).
  2. Optionally PURGE the existing print catalog — reversible soft-delete:
        --purge          erase EVERY print item (empties the storefront)
        --purge-tag TAG  erase only items tagged TAG (e.g. a previous import)
     (omit to keep the current catalog and just add the clone.)
  3. IMPORT the scraped HelloPrint catalog (categories + items, tagged 'helloprint').
  4. UPLOAD each product's image (real HelloPrint mockup webp shipped in the repo).

IMAGE NOTE: the CRM's global `accepted_file_formats` setting usually omits webp,
so the shared upload validator (is_valid_file_to_upload) rejects the .webp
mockups with HTTP 415 "File type not allowed." Two ways around it:
  - EITHER add 'webp' to Settings → File formats in the CRM, then this step works;
  - OR run the companion uploader, which transcodes each webp to PNG on the way
    out (PNG is always accepted) and needs no CRM setting change:
        PRINT_IMPORT_TOKEN='...' node scripts/upload_images_png.mjs
    In that case run the import with --no-images and do the images via node.

Stdlib only (urllib) — no pip install. Needs the CRM `print_import_token`.

Usage:
    export PRINT_IMPORT_TOKEN='<the print_import_token you set in the CRM>'
    python3 scripts/import_helloprint.py --purge            # wipe + clone + images
    python3 scripts/import_helloprint.py --purge --no-images  # wipe + clone; images via node
    python3 scripts/import_helloprint.py                    # add clone (no wipe)
    python3 scripts/import_helloprint.py --dry-run          # show plan, send nothing
    python3 scripts/import_helloprint.py --no-images        # skip image upload

To UNDO a purge later: the items are soft-deleted (deleted=1); restore from the
backup JSON or flip them back in the DB. Nothing is hard-deleted.
"""
import argparse
import json
import mimetypes
import os
import ssl
import sys
import urllib.request
import urllib.error
import urllib.parse
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
STORE_ROOT = os.path.dirname(HERE)  # scripts/.. == store repo root
DEFAULT_PAYLOAD = os.path.join(HERE, "helloprint-import-payload.json")


def die(msg, code=1):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(code)


def _ctx(insecure):
    return ssl._create_unverified_context() if insecure else None


def get_json(url, token=None, insecure=False):
    req = urllib.request.Request(url, method="GET")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, context=_ctx(insecure), timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def post_json(url, token, body, insecure=False):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, context=_ctx(insecure), timeout=180) as r:
        return json.loads(r.read().decode("utf-8"))


def post_multipart(url, token, fields, file_field, file_path, insecure=False):
    boundary = "----hawih" + uuid.uuid4().hex
    ctype, _ = mimetypes.guess_type(file_path)
    ctype = ctype or "application/octet-stream"
    with open(file_path, "rb") as fh:
        blob = fh.read()
    parts = []
    for k, val in fields.items():
        parts += [("--" + boundary).encode(),
                  ('Content-Disposition: form-data; name="%s"' % k).encode(), b"", str(val).encode()]
    parts += [("--" + boundary).encode(),
              ('Content-Disposition: form-data; name="%s"; filename="%s"' % (file_field, os.path.basename(file_path))).encode(),
              ("Content-Type: " + ctype).encode(), b"", blob, ("--" + boundary + "--").encode(), b""]
    body = b"\r\n".join(parts)
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "multipart/form-data; boundary=" + boundary)
    req.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(req, context=_ctx(insecure), timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    ap = argparse.ArgumentParser(description="Replace/append the Hawih CRM print catalog with the HelloPrint clone.")
    ap.add_argument("--crm", default="https://crm.hawih.com.sa")
    ap.add_argument("--token", default=os.environ.get("PRINT_IMPORT_TOKEN", ""))
    ap.add_argument("--payload", default=DEFAULT_PAYLOAD)
    ap.add_argument("--store-dir", default=STORE_ROOT, help="store repo root (resolves image_file paths)")
    ap.add_argument("--purge", action="store_true", help="wipe EVERY print item first (reversible soft-delete)")
    ap.add_argument("--purge-tag", default="", help="wipe only items with this print_import_tag")
    ap.add_argument("--no-backup", action="store_true")
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--insecure", action="store_true")
    args = ap.parse_args()
    base = args.crm.rstrip("/") + "/index.php/print_api"

    if not os.path.exists(args.payload):
        die("payload not found: %s (run: node scripts/scrape-helloprint.mjs)" % args.payload)
    payload = json.load(open(args.payload, encoding="utf-8"))
    cats, items = payload.get("categories", []), payload.get("items", [])
    print("Payload: %d categories, %d items (tag=%s)" % (len(cats), len(items), payload.get("tag")))
    print("Target : %s" % base)
    print("Plan   : %s backup -> %s -> import -> %s images"
          % ("skip" if args.no_backup else "do",
             ("PURGE ALL" if args.purge else ("purge tag=" + args.purge_tag) if args.purge_tag else "no purge"),
             "skip" if args.no_images else "upload"))

    if args.dry_run:
        print("[dry-run] nothing sent.")
        return
    if not args.token:
        die("no token. Set PRINT_IMPORT_TOKEN or pass --token, and set the same value "
            "as the CRM `print_import_token` setting first.")

    # 1) backup
    if not args.no_backup:
        try:
            snap = get_json(base + "/catalog", insecure=args.insecure)
            path = os.path.join(HERE, "helloprint-backup-catalog.json")
            json.dump(snap, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            print("backup: saved current catalog (%d items) -> %s" % (len(snap.get("items", [])), path))
        except Exception as e:
            die("backup failed (%s). Refusing to continue; pass --no-backup to override." % e)

    # 2) purge (reversible)
    if args.purge or args.purge_tag:
        url = base + "/purge" + ("?tag=" + urllib.parse.quote(args.purge_tag) if args.purge_tag else "")
        try:
            r = post_json(url, args.token, {}, args.insecure)
            print("purge: soft-deleted %s items (scope=%s) — reversible" % (r.get("deleted"), r.get("scope")))
        except urllib.error.HTTPError as e:
            die("purge failed HTTP %s: %s" % (e.code, e.read().decode("utf-8", "replace")))

    # 3) import
    try:
        r = post_json(base + "/import", args.token, {"categories": cats, "items": items}, args.insecure)
    except urllib.error.HTTPError as e:
        die("import failed HTTP %s: %s" % (e.code, e.read().decode("utf-8", "replace")))
    if not r.get("success"):
        die("import rejected: " + json.dumps(r, ensure_ascii=False))
    it = r.get("items", {})
    print("import: created=%s updated=%s failed=%s" % (it.get("created"), it.get("updated"), it.get("failed")))
    for x in r.get("results", []):
        if x.get("status") == "error":
            print("  ! %s: %s" % (x.get("slug"), x.get("message")))

    # 4) images (real webp files shipped in the repo → uploaded as-is)
    if args.no_images:
        print("images: skipped (--no-images)")
        return
    url = base + "/import_image"
    ok = miss = fail = 0
    webp_rejected = False
    for item in items:
        rel = item.get("image_file")
        if not rel:
            continue
        fp = os.path.join(args.store_dir, rel)
        if not os.path.exists(fp):
            miss += 1
            continue
        try:
            rr = post_multipart(url, args.token, {"slug": item["slug"]}, "image", fp, args.insecure)
            ok += 1 if rr.get("success") else 0
            fail += 0 if rr.get("success") else 1
        except urllib.error.HTTPError as e:
            fail += 1
            body = e.read().decode("utf-8", "replace") if hasattr(e, "read") else ""
            if e.code == 415 and "not allowed" in body.lower():
                webp_rejected = True
            print("  ! image %s: HTTP %s" % (item["slug"], e.code))
        except urllib.error.URLError as e:
            fail += 1
            print("  ! image %s: %s" % (item["slug"], e))
    print("images: uploaded=%d missing=%d failed=%d" % (ok, miss, fail))
    if webp_rejected:
        print("HINT: the CRM rejected webp (File type not allowed). Either add 'webp' to "
              "Settings -> File formats, or upload images as PNG instead:\n"
              "      PRINT_IMPORT_TOKEN='...' node scripts/upload_images_png.mjs")
    print("Done. In the CRM, filter Items by print_import_tag = 'helloprint' to manage the set.")


if __name__ == "__main__":
    main()
