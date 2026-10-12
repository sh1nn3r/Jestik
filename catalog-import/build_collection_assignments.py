"""Map newly imported products (by handle) to the store's existing manual collections."""
import csv
import json
from collections import defaultdict

from build_shopify_bulk import ARM_TYPES, DATA_DIR, EXISTING, MAIN_TO_EXISTING

# Mounting parts have their own smart collection; keep them out of the general Accessories grid.
MAP = {k: v for k, v in MAIN_TO_EXISTING.items() if k != "Mounting Accessories"}
MAP["Wall Mount Workstations"] = ["wall-mount"]


def main():
    out = defaultdict(list)
    for row in csv.DictReader(open(DATA_DIR / "shopify_products_NEW.csv", encoding="utf-8")):
        if not row["Title"]:
            continue
        tags = [t.strip() for t in row["Tags"].split(",")]
        cols = {h for t in tags for h in MAP.get(t, [])}
        if "Monitor Arms" in tags:
            low = row["Title"].lower()
            for word, h in ARM_TYPES:
                if word in low:
                    cols.add(h)
                    break
        for h in cols:
            out[EXISTING[h]].append(row["Handle"])
    json.dump(out, open(DATA_DIR / "collection_assignments.json", "w"), indent=1)
    for gid, hs in out.items():
        name = next(k for k, v in EXISTING.items() if v == gid)
        print(f"{name:20} {len(hs)}")


if __name__ == "__main__":
    main()
