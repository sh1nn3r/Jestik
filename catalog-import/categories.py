"""Map scraped category paths onto Jestik's main collections and clean brand names."""
import re

# (collection title, regex matched against "category path + product name", lowercase)
MAIN_COLLECTIONS = [
    ("Chairs", r"\bchairs?\b|seating|\bstools?\b"),
    ("Chair Accessories", r"caster|arm pads?|chair arms?|\bcushions?\b|headrest|lumbar"),
    ("Keyboards", r"keyboards?(?! tray| platform| arm| drawer| shel)|keypads?"),
    ("Split Keyboards", r"\bsplit\b"),
    ("Mice", r"\bmouse\b|\bmice\b|trackball|touchpad"),
    ("Vertical Mice", r"vertical mouse|vertical mice|handshoe"),
    ("Keyboard Trays", r"keyboard (tray|platform|arm|drawer|shel)"),
    ("Monitor Arms", r"monitor (arm|mount)|lcd arm|multi.?monitor|flat panel (arm|desk)|desk mount|dual monitor|triple monitor|quad monitor"),
    ("Monitor Stands", r"monitor (stand|riser)"),
    ("Laptop & Tablet Mounts", r"laptop|tablet|ipad"),
    ("TV & Display Mounts", r"\btv\b|television|display mount|display & tv|digital signage|video wall|ceiling mount|wall mounts?\b(?!.*workstation)"),
    ("Projector Mounts", r"projector"),
    ("Sit-Stand Desks", r"sit.?stand desk|desks? and tables|adjustable (desk|table)|standing desk|height adjustable table"),
    ("Desk Converters", r"desk converter|sit.?stand workstation|workfit|desktop sit"),
    ("Wall Mount Workstations", r"wall mount workstation|wall workstation"),
    ("Carts", r"\bcarts?\b"),
    ("Medical & Healthcare", r"medical|healthcare|telehealth"),
    ("Point of Sale Mounts", r"point.of.sales?|\bpos\b"),
    ("Footrests", r"foot ?rest"),
    ("Anti-Fatigue Mats", r"anti.?fatigue|\bmats?\b"),
    ("Document Holders", r"document holder|copy holder"),
    ("Wrist Rests", r"wrist ?rest"),
    ("CPU Holders", r"cpu holder"),
    ("Computer Glasses", r"eyewear|glasses|gunnar"),
    ("Adaptive & Accessibility", r"adaptive|\bada\b|switch(es)?\b|speech generating|accessib"),
    ("Lighting", r"\blight(ing)?\b|\blamps?\b"),
    ("Air Purifiers", r"air (filter|purif)"),
    ("Cable Management", r"cable"),
    ("Mounting Accessories", r"accessor|adapter|mounting kit|extension|pole|bracket"),
]
_COMPILED = [(t, re.compile(p)) for t, p in MAIN_COLLECTIONS]

BRAND_NAMES = {
    "workrite ergonomics": "Workrite",
    "goldtouch": "Goldtouch",
    "om seating chairs": "Office Master",
    "chief mounts": "Chief",
    "peerless mounts": "Peerless-AV",
    "neutral posture chairs": "Neutral Posture",
    "hat design works (innovative)": "HAT Design Works",
    "loctek / flexispot": "Flexispot",
}

# Brand collections shown in the theme header (smart collections on Vendor)
BRAND_COLLECTIONS = ["Kinesis", "Humanscale", "Workrite", "Evoluent", "Ergotron"]


def clean_brand(name):
    name = (name or "").strip()
    return BRAND_NAMES.get(name.lower(), name)


def main_collections(product):
    text = " ".join(product.get("category_path") or []) + " " + " ".join(product.get("tags") or []) \
        + " " + (product.get("product_type") or "") + " " + product["name"]
    text = text.lower()
    found = [title for title, rx in _COMPILED if rx.search(text)]
    return found or ["Accessories"]


# Source stores' own house-brand items, bundles (ED-... part numbers) and services
_HOUSE = re.compile(r"ergodirect|ask ?ergo", re.I)
_HOUSE_SKU = re.compile(r"^ED[A-Z]?-", re.I)
_SERVICES = re.compile(r"gift.card|on-site-installation|workstation-evaluation")


def is_house_item(product):
    skus = [v.get("sku") or "" for v in product.get("variants") or []] + [product.get("sku") or ""]
    return bool(_HOUSE.search(f"{product.get('brand') or ''} {product['name']}")
                or any(_HOUSE_SKU.match(s) for s in skus)
                or _SERVICES.search(product.get("source_url", "")))
