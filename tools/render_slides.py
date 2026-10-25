"""Extract every slide from the source PDF as WebP for the website.

Each PDF page holds one scanned slide (a JPEG about 760px wide) plus a page
number outside it. We take the embedded image itself, so the page margins
and numbers are dropped and nothing is upscaled.

Usage (run with -I because the PDF is untrusted input):
    python -I tools/render_slides.py <source.pdf>

Writes:
    public/slides/NNN.webp         full slide
    public/slides/thumbs/NNN.webp  320px-wide thumbnail
    content/slides.json            slide count and image sizes
"""

import io
import json
import sys
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SLIDES_DIR = ROOT / "public" / "slides"
THUMBS_DIR = SLIDES_DIR / "thumbs"
MANIFEST = ROOT / "content" / "slides.json"

QUALITY = 82
THUMB_WIDTH = 320


def slide_image(doc: pymupdf.Document, page: pymupdf.Page) -> Image.Image:
    """The page's largest embedded image, or a rendered page as a fallback."""
    images = page.get_images(full=True)
    if images:
        xref = max(images, key=lambda img: img[2] * img[3])[0]
        data = doc.extract_image(xref)["image"]
        return Image.open(io.BytesIO(data)).convert("RGB")
    pix = page.get_pixmap(dpi=96)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    THUMBS_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(sys.argv[1])
    slides = []
    for i, page in enumerate(doc):
        n = i + 1
        name = f"{n:03d}.webp"
        img = slide_image(doc, page)
        img.save(SLIDES_DIR / name, "WEBP", quality=QUALITY, method=6)

        thumb = img.copy()
        thumb.thumbnail((THUMB_WIDTH, THUMB_WIDTH))
        thumb.save(THUMBS_DIR / name, "WEBP", quality=75, method=6)

        slides.append({"n": n, "w": img.width, "h": img.height})
        if n % 50 == 0:
            print(f"{n}/{doc.page_count}")

    MANIFEST.write_text(
        json.dumps({"count": len(slides), "slides": slides}, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"Done: {len(slides)} slides")


if __name__ == "__main__":
    main()
