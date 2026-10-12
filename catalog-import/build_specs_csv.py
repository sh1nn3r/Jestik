"""Build a Shopify overwrite CSV that sets Type + specs.* metafields for every product."""
import csv
import json
from collections import defaultdict

from attributes import ATTRIBUTES, derive
from common import DATA_DIR

S = "/tmp/claude-0/-home-user-Jestik/86e90a2f-06ae-54c4-b7e6-037a10d85a61/scratchpad/"
COLLECTION_CATEGORY = {
    "chairs": "Chairs", "standard-chairs": "Chairs", "sit-stand-chairs": "Chairs", "side-chairs": "Chairs", "drafting-chairs": "Chairs", "headrest-chairs": "Chairs",
    "chair-accessories": "Chair Accessories", "keyboard-trays": "Keyboard Trays", "split-keyboards": "Keyboards", "keyboards": "Keyboards",
    "vertical-mouse": "Mice", "mouse": "Mice", "single-monitor-arm": "Monitor Arms", "dual-monitor-arm": "Monitor Arms", "triple-monitor-arm": "Monitor Arms",
    "quad-monitor-arm": "Monitor Arms", "monitor-arms": "Monitor Arms", "monitor-stands": "Monitor Stands", "sit-stand-desks": "Sit-Stand Desks",
    "desk-converters": "Desk Converters", "desks": "Sit-Stand Desks", "tv-display-mounts": "TV & Display Mounts", "laptop-tablet-mounts": "Laptop & Tablet Mounts",
}
SKIP_TYPES = {"Patches"}
KEYS = [k for k in ATTRIBUTES if k not in ("category", "desk_width")]


def main():
    prods, variants = {}, defaultdict(list)
    for line in open(S + "variants.jsonl"):
        o = json.loads(line)
        (variants[o["__parentId"]].append(o) if "__parentId" in o else prods.__setitem__(o["id"], o))
    desc = {json.loads(l)["id"]: json.loads(l).get("descriptionHtml", "") for l in open(S + "full.jsonl") if "__parentId" not in l}
    cols, members = {}, defaultdict(list)
    for line in open(S + "colmem.jsonl"):
        o = json.loads(line)
        (members[o["__parentId"]].append(o["id"]) if "__parentId" in o else cols.__setitem__(o["id"], o["handle"]))
    by_product = defaultdict(set)
    for cid, pids in members.items():
        for pid in pids:
            by_product[pid].add(cols[cid])
    new_types = {r["Handle"]: r["Type"] for r in csv.DictReader(open(DATA_DIR / "shopify_products_NEW.csv")) if r["Title"]}

    header = ["Handle", "Title", "Type", "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value", "Variant SKU"]
    header += [f"{ATTRIBUTES[k][0]} (product.metafields.specs.{k})" for k in KEYS]
    rows, filled = [], defaultdict(int)
    for pid, p in prods.items():
        if p.get("productType") in SKIP_TYPES or "garrett" in p["handle"]:
            continue
        ptype = new_types.get(p["handle"])
        if not ptype:
            hits = [COLLECTION_CATEGORY[h] for h in by_product[pid] if h in COLLECTION_CATEGORY]
            ptype = next((c for c in ["Chairs", "Keyboard Trays", "Monitor Arms", "Keyboards", "Mice", "Desk Converters", "Sit-Stand Desks", "Monitor Stands", "TV & Display Mounts", "Laptop & Tablet Mounts", "Chair Accessories"] if c in hits), None)
        attrs = derive(p["title"], desc.get(pid, ""), ptype)
        names = [o["name"] for o in sorted(p["options"], key=lambda o: o["position"])]
        for i, v in enumerate(variants[pid]):
            vals = {so["name"]: so["value"] for so in v["selectedOptions"]}
            row = {"Handle": p["handle"], "Variant SKU": v.get("sku") or ""}
            for n, name in enumerate(names[:3], 1):
                row[f"Option{n} Value"] = vals.get(name, "")
                if i == 0:
                    row[f"Option{n} Name"] = name
            if i == 0:
                row["Title"] = p["title"]
                row["Type"] = attrs["category"][0]
                for k in KEYS:
                    if attrs.get(k):
                        row[f"{ATTRIBUTES[k][0]} (product.metafields.specs.{k})"] = "; ".join(attrs[k])
                        filled[k] += 1
            rows.append(row)
    with open(DATA_DIR / "product_specs.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)
    print(len(prods), "products,", len(rows), "rows")
    print(dict(filled))


if __name__ == "__main__":
    main()
