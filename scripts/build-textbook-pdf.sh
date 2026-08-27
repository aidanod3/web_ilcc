#!/bin/bash
# Build a copy-paste-able textbook PDF: original scanned pages + an invisible
# text layer produced by a vision model (qwen2.5vl via Ollama on chimera).
#
# Why not tesseract: on this phone-scanned book it mangles code listings
# ("// ex@8@2.c", "£(&x) 5;", empty function bodies). qwen2.5vl:7b reads them
# verbatim (~10 s/page on an RTX 3090).
#
# Inputs:  $1 = original scan PDF
#          $2 = dir of per-page .txt from scripts/vlm-book.py (pg-001.txt …)
#          $3 = output PDF
# Uses ocrmypdf's --sidecar-less path: we render each page's text as an
# invisible overlay with reportlab and merge with pikepdf.
set -euo pipefail
SRC="$1"; TXT="$2"; OUT="$3"
python3 - "$SRC" "$TXT" "$OUT" <<'PY'
import sys, os, re, io
import pikepdf
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

src, txtdir, out = sys.argv[1:4]
pdf = pikepdf.open(src)
overlay = io.BytesIO()
c = None
for i, page in enumerate(pdf.pages, start=1):
    w = float(page.mediabox[2] - page.mediabox[0]); h = float(page.mediabox[3] - page.mediabox[1])
    if c is None: c = canvas.Canvas(overlay, pagesize=(w, h))
    else: c.setPageSize((w, h))
    p = os.path.join(txtdir, f"pg-{i:03d}.txt")
    text = open(p).read() if os.path.exists(p) else ""
    # Strip markdown fences/table pipes so copied text is clean prose/code.
    text = re.sub(r"^```.*$", "", text, flags=re.M).replace("|", " ")
    c.setFont("Courier", 6)
    # Invisible text (render mode 3) laid out top-to-bottom so selection order is sane.
    t = c.beginText(18, h - 18); t.setTextRenderMode(3); t.setLeading(7.2)
    for line in text.split("\n"):
        for sub in (simpleSplit(line, "Courier", 6, w - 36) or [""]):
            t.textLine(sub)
    c.drawText(t)
    c.showPage()
c.save()
ov = pikepdf.open(io.BytesIO(overlay.getvalue()))
for page, opage in zip(pdf.pages, ov.pages):
    page.add_overlay(opage)
pdf.save(out, linearize=True)
print("wrote", out, "pages", len(pdf.pages))
PY
pdftotext -f 120 -l 120 "$OUT" - | head -20
