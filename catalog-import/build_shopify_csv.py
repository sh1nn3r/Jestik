"""Build a Shopify product import CSV (Admin > Products > Import) plus a
collections list from the scraped data and the AI-written descriptions.

Products are imported as DRAFT with no images, so you can review copy, set
your own prices and add manufacturer-supplied images before publishing.

    python build_shopify_csv.py [--markup 1.0]

Output: data/shopify_products.csv, data/collections.csv, data/image_sourcing.csv
"""
import argparse
import csv
import json
import re
from collections import Counter

from categories import BRAND_COLLECTIONS, clean_brand, is_house_item, main_collections
from common import DATA_DIR, read_jsonl, slugify
DESCRIPTIONS = DATA_DIR / "descriptions.json"


def product_key(p):
    return f"{p['source']}:{p['source_url']}"

COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value",
    "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Variant Price", "Variant Requires Shipping", "Variant Taxable",
    "Image Src", "Image Position", "Image Alt Text", "SEO Title", "SEO Description",
    "Status",
]


def seo_title(title, brand):
    t = title if not brand or brand.lower() in title.lower() else f"{brand} {title}"
    t = f"{t} | Jestik"
    return t if len(t) <= 70 else t[:67].rsplit(" ", 1)[0] + "…"


def seo_description(body_html, title):
    m = re.search(r"<p>(.*?)</p>", body_html or "", re.S)
    text = re.sub(r"<[^>]+>", "", m.group(1) if m else "") or f"Shop {title} at Jestik."
    text = re.sub(r"\s+", " ", text).strip() + " Free shipping on everything."
    return text if len(text) <= 155 else text[:152].rsplit(" ", 1)[0] + "…"


def load_images():
    images = {}
    for name in ("images_ergodirect.json", "images_askergoworks.json"):
        path = DATA_DIR / name
        if path.exists():
            images.update(json.loads(path.read_text()))
    return images


def price(value, markup):
    try:
        return f"{float(value) * markup:.2f}"
    except (TypeError, ValueError):
        return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--markup", type=float, default=1.0, help="multiply source prices, e.g. 0.95")
    args = ap.parse_args()

    descriptions = json.loads(DESCRIPTIONS.read_text()) if DESCRIPTIONS.exists() else {}
    img_map = load_images()
    products = read_jsonl(DATA_DIR / "ergodirect.jsonl") + read_jsonl(DATA_DIR / "askergoworks.jsonl")

    rows, seen_skus, seen_handles = [], set(), set()
    collections, vendors = Counter(), Counter()
    images = []
    skipped = 0
    for p in products:
        if is_house_item(p):
            skipped += 1
            continue
        variants = p.get("variants") or [{
            "title": "Default Title", "options": [None, None, None],
            "sku": p.get("sku"), "price": p.get("price"), "grams": None,
        }]
        skus = {(v.get("sku") or "").strip().upper() for v in variants} - {""}
        if skus & seen_skus:  # same product already imported from the other source
            continue
        seen_skus |= skus

        brand = clean_brand(p.get("brand"))
        name_l = p["name"].lower()
        handle = slugify(p["name"] if not brand or name_l.startswith(brand.lower()) or brand.lower() in name_l else f"{brand} {p['name']}")
        while handle in seen_handles:
            handle += "-2"
        seen_handles.add(handle)

        tags = main_collections(p)
        collections.update(tags)
        vendors[brand] += 1
        body = descriptions.get(product_key(p), "")
        option_names = (p.get("options") or []) + [None, None, None]

        for n, v in enumerate(variants):
            opts = (v.get("options") or []) + [None, None, None]
            row = dict.fromkeys(COLUMNS, "")
            row.update({
                "Handle": handle,
                "Variant SKU": v.get("sku") or "",
                "Variant Grams": v.get("grams") or "",
                "Variant Inventory Policy": "deny",
                "Variant Fulfillment Service": "manual",
                "Variant Price": price(v.get("price"), args.markup),
                "Variant Requires Shipping": "TRUE",
                "Variant Taxable": "TRUE",
            })
            if option_names[0]:
                for i in range(3):
                    if option_names[i]:
                        row[f"Option{i+1} Name"] = option_names[i] if n == 0 else ""
                        row[f"Option{i+1} Value"] = opts[i] or ""
            else:
                row["Option1 Name"] = "Title" if n == 0 else ""
                row["Option1 Value"] = "Default Title"
            if n == 0:
                row.update({
                    "Title": p["name"],
                    "Body (HTML)": body,
                    "Vendor": brand,
                    "Type": tags[0],
                    "Tags": ", ".join(tags),
                    "Published": "FALSE",
                    "Status": "draft",
                    "SEO Title": seo_title(p["name"], brand),
                    "SEO Description": seo_description(body, p["name"]),
                })
            rows.append(row)
        for pos, src in enumerate(img_map.get(p["source_url"], [])[:8], 1):
            if pos == 1:
                rows[-len(variants)]["Image Src"] = src
                rows[-len(variants)]["Image Position"] = 1
                rows[-len(variants)]["Image Alt Text"] = p["name"]
            else:
                extra = dict.fromkeys(COLUMNS, "")
                extra.update({"Handle": handle, "Image Src": src, "Image Position": pos, "Image Alt Text": p["name"]})
                rows.append(extra)
        images.append({"handle": handle, "brand": brand, "sku": ";".join(sorted(skus)),
                       "title": p["name"]})

    with open(DATA_DIR / "shopify_products.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, COLUMNS)
        w.writeheader()
        w.writerows(rows)
    with open(DATA_DIR / "collections.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Collection title", "Rule column", "Rule: equals", "Product count"])
        for tag, count in collections.most_common():
            w.writerow([tag, "TAG", tag, count])
        for brand in BRAND_COLLECTIONS:
            w.writerow([brand, "VENDOR", brand, vendors[brand]])
    with open(DATA_DIR / "image_sourcing.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, ["handle", "brand", "sku", "title"])
        w.writeheader()
        w.writerows(images)

    with_body = sum(1 for r in rows if r["Body (HTML)"])
    print(f"{len(images)} products / {len(rows)} rows, {with_body} with descriptions, "
          f"{len(collections)} collections, {skipped} house-brand/service items skipped")


if __name__ == "__main__":
    main()
