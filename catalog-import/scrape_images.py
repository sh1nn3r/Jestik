"""Add product image URLs to the scraped catalogs (use only with the source
store's permission -- ErgoDirect approved reuse of its product content).

    python scrape_images.py ergodirect     # re-reads each product page (resumable)
    python scrape_images.py askergoworks   # one pass over products.json

Writes data/images_<source>.json  {source_url: [image urls, largest first]}
"""
import json
import re
import sys

from common import DATA_DIR, fetch, read_jsonl


def ergodirect():
    out = DATA_DIR / "images_ergodirect.json"
    done = json.loads(out.read_text()) if out.exists() else {}
    rows = [r for r in read_jsonl(DATA_DIR / "ergodirect.jsonl") if r["source_url"] not in done]
    print(f"{len(done)} done, {len(rows)} to go")
    for n, r in enumerate(rows, 1):
        page = fetch(r["source_url"])
        imgs = []
        if page:
            for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page.text, re.S):
                try:
                    data = json.loads(block)
                except ValueError:
                    continue
                if data.get("@type") == "Product":
                    im = data.get("image") or []
                    imgs = [im] if isinstance(im, str) else list(im)
            # gallery images (large versions) beyond the JSON-LD ones
            for u in re.findall(r'(?:src|href|data-src)="((?:https://www\.ergodirect\.com)?/images/[^"]+/large/[^"]+\.(?:jpg|jpeg|png|webp))"', page.text, re.I):
                imgs.append(u if u.startswith("http") else "https://www.ergodirect.com" + u)
        # keep large versions, de-duplicate, drop thumbnails
        imgs = [u for u in dict.fromkeys(imgs) if "/medium/" not in u and "/small/" not in u]
        done[r["source_url"]] = imgs
        if n % 50 == 0:
            out.write_text(json.dumps(done))
            print(f"  {n}/{len(rows)}", flush=True)
    out.write_text(json.dumps(done))
    print("done ->", out)


def askergoworks():
    out = DATA_DIR / "images_askergoworks.json"
    done, page = {}, 1
    while True:
        r = fetch(f"https://askergoworks.com/products.json?limit=250&page={page}")
        products = r.json().get("products", []) if r else []
        if not products:
            break
        for p in products:
            done[f"https://askergoworks.com/products/{p['handle']}"] = [i["src"] for i in p.get("images", [])]
        page += 1
    out.write_text(json.dumps(done))
    print(len(done), "products ->", out)


if __name__ == "__main__":
    {"ergodirect": ergodirect, "askergoworks": askergoworks}[sys.argv[1]]()
