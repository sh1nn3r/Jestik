"""Scrape product facts and the category tree from ergodirect.com.

Collects only factual data (name, brand, SKU/MPN, price, availability, category
path, spec lines). Images and ErgoDirect's marketing copy are NOT republished;
the spec lines are kept as input for writing original descriptions.

Resumable: re-running skips products already in data/ergodirect.jsonl.

    python scrape_ergodirect.py [--limit N] [--delay 1.0]
"""
import argparse
import json
import re

from common import DATA_DIR, bullet_facts, fetch, read_jsonl, strip_tags

SITEMAP = "https://www.ergodirect.com/sitemap.xml"
OUT = DATA_DIR / "ergodirect.jsonl"
PRODUCT_URL = re.compile(r"^https://www\.ergodirect\.com/\d+-[^/]+\.html$")


def product_urls(delay):
    r = fetch(SITEMAP, delay)
    urls = re.findall(r"<loc>([^<]+)</loc>", r.text)
    return [u for u in urls if PRODUCT_URL.match(u)]


def tab(html, name):
    m = re.search(rf'id="{name}"[^>]*role="tabpanel"[^>]*>(.*?)(?=<div class="tab-pane|role="tabpanel"|$)',
                  html, re.S)
    return m.group(1) if m else ""


def parse(url, html):
    product, crumbs = None, []
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        if data.get("@type") == "Product":
            product = data
        elif data.get("@type") == "BreadcrumbList":
            crumbs = [i["name"] for i in data.get("itemListElement", [])][1:]
    if not product:
        return None
    offer = product.get("offers") or {}
    if isinstance(offer, list):
        offer = offer[0] if offer else {}
    brand = product.get("brand") or {}

    specs = {}
    spec_html = tab(html, "specifications-tab")
    for k, v in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>\s*<td[^>]*>(.*?)</td>", spec_html, re.S):
        k, v = strip_tags(k), strip_tags(v)
        if k and v and len(k) < 60:
            specs[k] = v

    facts = bullet_facts(tab(html, "highlights-tab")) + bullet_facts(tab(html, "description-tab"))
    return {
        "source": "ergodirect",
        "source_url": url,
        "name": strip_tags(product.get("name", "")),
        "brand": brand.get("name") if isinstance(brand, dict) else str(brand),
        "sku": product.get("sku") or product.get("mpn"),
        "mpn": product.get("mpn"),
        "price": offer.get("price"),
        "currency": offer.get("priceCurrency", "USD"),
        "in_stock": "InStock" in str(offer.get("availability", "")),
        "category_path": crumbs,
        "specs": specs,
        "facts": list(dict.fromkeys(facts)),  # de-duplicate, keep order
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--delay", type=float, default=1.0)
    args = ap.parse_args()

    done = {r["source_url"] for r in read_jsonl(OUT)}
    urls = [u for u in product_urls(args.delay) if u not in done]
    if args.limit:
        urls = urls[: args.limit]
    print(f"{len(done)} already scraped, {len(urls)} to go")

    with open(OUT, "a", encoding="utf-8") as f:
        for n, url in enumerate(urls, 1):
            r = fetch(url, args.delay)
            row = parse(r.url, r.text) if r else None
            if row:
                row["source_url"] = url
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
                f.flush()
            if n % 50 == 0:
                print(f"  {n}/{len(urls)}")
    print("done ->", OUT)


if __name__ == "__main__":
    main()
