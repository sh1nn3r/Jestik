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
from collections import Counter

from common import DATA_DIR, read_jsonl, slugify
DESCRIPTIONS = DATA_DIR / "descriptions.json"


def product_key(p):
    return f"{p['source']}:{p['source_url']}"

COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value",
    "Variant SKU", "Variant Grams", "Variant Inventory Tracker", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Variant Price", "Variant Requires Shipping", "Variant Taxable",
    "Status",
]


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
    products = read_jsonl(DATA_DIR / "ergodirect.jsonl") + read_jsonl(DATA_DIR / "askergoworks.jsonl")

    rows, seen_skus, seen_handles = [], set(), set()
    collections = Counter()
    images = []
    for p in products:
        variants = p.get("variants") or [{
            "title": "Default Title", "options": [None, None, None],
            "sku": p.get("sku"), "price": p.get("price"), "grams": None,
        }]
        skus = {(v.get("sku") or "").strip().upper() for v in variants} - {""}
        if skus & seen_skus:  # same product already imported from the other source
            continue
        seen_skus |= skus

        handle = slugify(f"{p.get('brand') or ''} {p['name']}")
        while handle in seen_handles:
            handle += "-2"
        seen_handles.add(handle)

        tags = [c for c in p.get("category_path", []) if c] + [t for t in p.get("tags", []) if t]
        tags = list(dict.fromkeys(tags))
        collections.update(tags)
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
                    "Vendor": p.get("brand") or "",
                    "Type": (p.get("category_path") or [""])[-1],
                    "Tags": ", ".join(tags),
                    "Published": "FALSE",
                    "Status": "draft",
                })
            rows.append(row)
        images.append({"handle": handle, "brand": p.get("brand"), "sku": ";".join(sorted(skus)),
                       "title": p["name"]})

    with open(DATA_DIR / "shopify_products.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, COLUMNS)
        w.writeheader()
        w.writerows(rows)
    with open(DATA_DIR / "collections.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Collection title", "Rule: product tag equals", "Product count"])
        for tag, count in collections.most_common():
            w.writerow([tag, tag, count])
    with open(DATA_DIR / "image_sourcing.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, ["handle", "brand", "sku", "title"])
        w.writeheader()
        w.writerows(images)

    with_body = sum(1 for r in rows if r["Body (HTML)"])
    print(f"{len(images)} products / {len(rows)} rows, {with_body} with descriptions, "
          f"{len(collections)} collections")


if __name__ == "__main__":
    main()
