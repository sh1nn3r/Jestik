"""Scrape product facts from askergoworks.com via Shopify's public products.json.

Keeps factual fields only (title, vendor, type, tags, variants/SKUs/prices,
spec lines). Images and AskErgoWorks' marketing copy are NOT republished.

    python scrape_askergoworks.py
"""
from common import DATA_DIR, bullet_facts, fetch, write_jsonl

BASE = "https://askergoworks.com"
OUT = DATA_DIR / "askergoworks.jsonl"


def main():
    rows, page = [], 1
    while True:
        r = fetch(f"{BASE}/products.json?limit=250&page={page}")
        products = r.json().get("products", []) if r else []
        if not products:
            break
        for p in products:
            rows.append({
                "source": "askergoworks",
                "source_url": f"{BASE}/products/{p['handle']}",
                "name": p["title"],
                "brand": p.get("vendor"),
                "product_type": p.get("product_type"),
                "category_path": [c for c in [p.get("product_type")] + list(p.get("tags") or [])[:1] if c],
                "tags": p.get("tags") or [],
                "options": [o["name"] for o in p.get("options", []) if o["name"] != "Title"],
                "variants": [{
                    "title": v["title"],
                    "options": [v.get("option1"), v.get("option2"), v.get("option3")],
                    "sku": v.get("sku"),
                    "price": v.get("price"),
                    "grams": v.get("grams"),
                    "available": v.get("available"),
                } for v in p.get("variants", [])],
                "facts": bullet_facts(p.get("body_html")),
            })
        print(f"  page {page}: {len(rows)} products")
        page += 1
    write_jsonl(OUT, rows)
    print("done ->", OUT)


if __name__ == "__main__":
    main()
