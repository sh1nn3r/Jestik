"""Build a JSONL file of productSet inputs for a Shopify bulk import
(bulkOperationRunMutation). Skips products already in the store (by SKU or
handle, from data/store_variants.jsonl), creates everything as DRAFT.

    python build_shopify_bulk.py   ->  data/shopify_bulk.jsonl
"""
import csv
import json
import re
from collections import defaultdict

from common import DATA_DIR

# Jestik's existing hand-picked collections (handle -> id)
EXISTING = {
    "chairs": "gid://shopify/Collection/266815209577", "chair-accessories": "gid://shopify/Collection/270220951657",
    "keyboards": "gid://shopify/Collection/458715078", "split-keyboards": "gid://shopify/Collection/270316830825",
    "mouse": "gid://shopify/Collection/266815340649", "vertical-mouse": "gid://shopify/Collection/270333771881",
    "keyboard-trays": "gid://shopify/Collection/270317027433", "monitor-arms": "gid://shopify/Collection/270334066793",
    "single-monitor-arm": "gid://shopify/Collection/270333935721", "dual-monitor-arm": "gid://shopify/Collection/270333968489",
    "triple-monitor-arm": "gid://shopify/Collection/270334001257", "quad-monitor-arm": "gid://shopify/Collection/270334034025",
    "desks": "gid://shopify/Collection/266815373417", "accessories": "gid://shopify/Collection/266815406185",
    "wall-mount": "gid://shopify/Collection/271357444201",
}
MAIN_TO_EXISTING = {
    "Chairs": ["chairs"], "Chair Accessories": ["chair-accessories"], "Keyboards": ["keyboards"],
    "Split Keyboards": ["split-keyboards"], "Mice": ["mouse"], "Vertical Mice": ["vertical-mouse"],
    "Keyboard Trays": ["keyboard-trays"], "Monitor Arms": ["monitor-arms"], "Sit-Stand Desks": ["desks"],
    "Desk Converters": ["desks"], "Accessories": ["accessories"], "Footrests": ["accessories"],
    "Anti-Fatigue Mats": ["accessories"], "Document Holders": ["accessories"], "Wrist Rests": ["accessories"],
    "CPU Holders": ["accessories"], "Cable Management": ["accessories"], "Lighting": ["accessories"],
    "Mounting Accessories": ["accessories"],
}
ARM_TYPES = [("quad", "quad-monitor-arm"), ("triple", "triple-monitor-arm"), ("dual", "dual-monitor-arm"), ("single", "single-monitor-arm")]


def main():
    store = [json.loads(l) for l in open(DATA_DIR / "store_variants.jsonl")]
    store_skus = {(v.get("sku") or "").strip().upper() for v in store} - {""}
    store_handles = {v["product"]["handle"] for v in store}

    rows = list(csv.DictReader(open(DATA_DIR / "shopify_products.csv", encoding="utf-8")))
    by_handle = defaultdict(list)
    for r in rows:
        by_handle[r["Handle"]].append(r)

    out, skipped = [], 0
    for handle, rs in by_handle.items():
        head = rs[0]
        variants = [r for r in rs if r["Variant Price"] or r["Variant SKU"] or r["Option1 Value"]]
        if handle in store_handles or any((r["Variant SKU"] or "").strip().upper() in store_skus for r in variants):
            skipped += 1
            continue
        tags = [t.strip() for t in head["Tags"].split(",") if t.strip()]
        cols = {h for t in tags for h in MAIN_TO_EXISTING.get(t, [])}
        if "Monitor Arms" in tags:
            low = head["Title"].lower()
            for word, h in ARM_TYPES:
                if word in low:
                    cols.add(h)
                    break
        names = [head[f"Option{i} Name"] for i in (1, 2, 3) if head[f"Option{i} Name"]] or ["Title"]
        opt_values = defaultdict(list)
        vlist = []
        for r in variants:
            ov = []
            for i, n in enumerate(names, 1):
                val = r[f"Option{i} Value"] or "Default Title"
                if val not in opt_values[n]:
                    opt_values[n].append(val)
                ov.append({"optionName": n, "name": val})
            v = {"optionValues": ov, "inventoryItem": {"tracked": False}, "taxable": True}
            if r["Variant Price"]:
                v["price"] = r["Variant Price"]
            if r["Variant SKU"]:
                v["sku"] = r["Variant SKU"]
            vlist.append(v)
        # drop duplicate option combinations (Shopify rejects them)
        seen, uniq = set(), []
        for v in vlist:
            key = tuple(o["name"] for o in v["optionValues"])
            if key not in seen:
                seen.add(key)
                uniq.append(v)
        files = [{"originalSource": r["Image Src"], "alt": r["Image Alt Text"] or head["Title"], "contentType": "IMAGE"}
                 for r in sorted((r for r in rs if r["Image Src"]), key=lambda r: int(r["Image Position"] or 99))]
        inp = {
            "title": head["Title"], "handle": handle, "descriptionHtml": head["Body (HTML)"],
            "vendor": head["Vendor"], "productType": head["Type"], "tags": tags, "status": "DRAFT",
            "seo": {"title": head["SEO Title"], "description": head["SEO Description"]},
            "productOptions": [{"name": n, "values": [{"name": x} for x in opt_values[n]]} for n in names],
            "variants": uniq,
        }
        if files:
            inp["files"] = files[:8]
        if cols:
            inp["collections"] = sorted(EXISTING[h] for h in cols)
        out.append({"input": inp})

    with open(DATA_DIR / "shopify_bulk.jsonl", "w", encoding="utf-8") as f:
        for o in out:
            f.write(json.dumps(o, ensure_ascii=False) + "\n")
    print(f"{len(out)} products to create, {skipped} already in store; "
          f"{sum(1 for o in out if 'files' in o['input'])} with images")


if __name__ == "__main__":
    main()
