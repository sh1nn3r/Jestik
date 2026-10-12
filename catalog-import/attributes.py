"""Derive filterable product attributes (screens, mount, connection, ...) from title + description text.

Each attribute becomes a product metafield in the `specs` namespace so Shopify Search & Discovery
can expose it as a filter group on collection pages.
"""
import re

from categories import main_collections
from common import strip_tags
from categories import MAIN_COLLECTIONS

CATEGORY_NAMES = {name for name, _ in MAIN_COLLECTIONS}

# Metafield key -> (filter label, applicable categories or None for all)
ATTRIBUTES = {
    "category": ("Product type", None),
    "screens": ("Screens", {"Monitor Arms", "Monitor Stands", "TV & Display Mounts", "Carts"}),
    "mount": ("Mounting", {"Monitor Arms", "Monitor Stands", "TV & Display Mounts", "Laptop & Tablet Mounts", "Projector Mounts", "Keyboard Trays", "CPU Holders", "Point of Sale Mounts", "Medical & Healthcare"}),
    "motion": ("Adjustment", {"Monitor Arms", "TV & Display Mounts", "Laptop & Tablet Mounts"}),
    "weight_capacity": ("Weight capacity", {"Monitor Arms", "Monitor Stands", "TV & Display Mounts", "Laptop & Tablet Mounts", "Projector Mounts", "Carts", "Desk Converters", "Sit-Stand Desks", "Chairs"}),
    "screen_size": ("Screen size", {"Monitor Arms", "Monitor Stands", "TV & Display Mounts", "Carts"}),
    "chair_style": ("Chair style", {"Chairs"}),
    "chair_features": ("Chair features", {"Chairs"}),
    "layout": ("Layout", {"Keyboards", "Split Keyboards"}),
    "connection": ("Connection", {"Keyboards", "Split Keyboards", "Mice", "Adaptive & Accessibility"}),
    "switch_type": ("Switches", {"Keyboards", "Split Keyboards"}),
    "mouse_style": ("Mouse style", {"Mice", "Adaptive & Accessibility"}),
    "hand": ("Hand", {"Mice", "Keyboard Trays"}),
    "lift": ("Lift type", {"Sit-Stand Desks", "Desk Converters"}),
    "desk_width": ("Desk width", {"Sit-Stand Desks", "Desk Converters"}),
    "tray_part": ("Tray component", {"Keyboard Trays"}),
    "color": ("Color / finish", None),
}

COLORS = [("Black", r"\bblack|\bmatte black|\bbk\b"), ("White", r"\bwhite\b"), ("Silver", r"\bsilver|aluminum finish|polished aluminum"),
          ("Gray", r"\bgr[ae]y\b|graphite|charcoal"), ("Wood", r"\bwalnut|\boak\b|maple|cherry|bamboo|wood grain|teak"), ("Blue", r"\bblue\b"), ("Red", r"\bred\b")]


def _all(text, pairs):
    return [label for label, pat in pairs if re.search(pat, text)]


def _first(text, pairs):
    hits = _all(text, pairs)
    return hits[:1]


def _bucket(value, edges, unit):
    lo = 0
    for e in edges:
        if value <= e:
            return f"Up to {e} {unit}" if lo == 0 else f"{lo}–{e} {unit}"
        lo = e
    return f"Over {edges[-1]} {unit}"


def _max_num(text, pattern):
    nums = [float(m) for m in re.findall(pattern, text)]
    return max(nums) if nums else None


def derive(title, body_html, ptype=None):
    """Return {key: [values]} for one product."""
    body = strip_tags(body_html or "")
    t = title.lower()
    text = f"{title} \n {body}".lower()
    cats = [ptype] if ptype in CATEGORY_NAMES else []
    if not cats:
        cats = main_collections({"name": title, "tags": [], "category_path": [], "product_type": ""})[:1] or ["Accessories"]
    cat = cats[0]
    out = {"category": [cat]}

    def want(key):
        scope = ATTRIBUTES[key][1]
        return scope is None or cat in scope

    if want("screens"):
        m = None
        for label, pat in [("6+", r"\b(six|6|eight|8)[- ](monitor|screen|display)|\bhexa\b"), ("4", r"\b(quad|four|4)[- ]?(monitor|screen|display|arm)|\bquad\b|2x2"),
                           ("3", r"\b(triple|three|3)[- ]?(monitor|screen|display|arm)|\btriple\b"), ("2", r"\b(dual|double|two|2)[- ]?(monitor|screen|display|arm)|\bdual\b"),
                           ("1", r"\b(single|one|1)[- ]?(monitor|screen|display|arm)|\bsingle\b")]:
            if re.search(pat, t):
                m = label
                break
        if not m and cat in {"TV & Display Mounts", "Monitor Arms"}:
            m = "1"
        if m:
            out["screens"] = [m]
    if want("mount"):
        out["mount"] = _all(text, [("Desk clamp", r"c-clamp|\bclamp\b|desk clamp|edge clamp"), ("Grommet", r"grommet|through[- ]desk|bolt[- ]through"),
                                   ("Wall", r"\bwall[- ]?mount|\bwall\b"), ("Ceiling", r"ceiling"), ("Freestanding", r"freestanding|free-standing|desk stand|weighted base|\bstand\b"),
                                   ("Pole / post", r"\bpole\b|\bpost\b"), ("Track / slatwall", r"slatwall|\btrack\b|rail"), ("Cart / mobile", r"\bcart\b|mobile|casters|wheels"),
                                   ("Under-desk", r"under[- ]desk|under the desk|underdesk")])
        if cat == "Keyboard Trays":
            out["mount"] = [v for v in out["mount"] if v in {"Track / slatwall", "Under-desk", "Desk clamp"}] or ["Under-desk"]
    if want("motion"):
        if re.search(r"gas spring|spring[- ]?(balanced|loaded|arm)|dynamic|counterbalance|articulating|full[- ]motion|swing arm|extension arm", text):
            out["motion"] = ["Full motion"]
        elif re.search(r"\btilt(ing)?\b", t):
            out["motion"] = ["Tilt"]
        elif re.search(r"\bfixed\b|\bstatic\b|low[- ]profile", t):
            out["motion"] = ["Fixed / static"]
        elif re.search(r"\btilt\b|swivel|pivot", text):
            out["motion"] = ["Tilt & swivel"]
    if want("weight_capacity"):
        lb = _max_num(text, r"(\d{1,4}(?:\.\d)?)\s*(?:lbs?|pounds)\b")
        if lb and 2 <= lb <= 1500:
            edges = [250, 300, 400] if cat == "Chairs" else [10, 20, 35, 75, 150]
            if cat == "Chairs" and lb < 150:
                lb = None
            if lb:
                out["weight_capacity"] = [_bucket(lb, edges, "lb")]
    if want("screen_size"):
        inch = _max_num(text, r"(\d{2,3})(?:\"|”|″|''|-inch| inch|in\b)")
        if inch and 10 <= inch <= 120:
            out["screen_size"] = [_bucket(inch, [24, 32, 49, 65, 85], "in")]
    if want("chair_style"):
        out["chair_style"] = _first(text if "chair" in t or "stool" in t else t,
                                    [("Sit-stand / perch", r"sit[- ]stand|perch|leaning"), ("Kneeling", r"kneel"), ("Saddle", r"saddle"),
                                     ("Drafting / stool", r"drafting|\bstool\b|counter height|extended height"), ("Big & tall", r"big (?:&|and) tall|heavy[- ]duty|bariatric|24/7|24 hour|intensive use"),
                                     ("Executive", r"executive|high[- ]back leather"), ("Gaming", r"gaming"), ("Guest / side", r"guest|side chair|stacking|stack chair|visitor"),
                                     ("Task", r"task|office chair|ergonomic chair|mesh chair|chair")]) or ["Task"]
        out["chair_features"] = _all(text, [("Headrest", r"headrest|head rest"), ("Adjustable arms", r"adjustable arm|4d arm|3d arm|height[- ]adjustable arm"),
                                            ("Mesh back", r"mesh back|mesh seat|mesh chair|\bmesh\b"), ("Lumbar support", r"lumbar"), ("Seat slider", r"seat slider|seat depth"),
                                            ("Synchro tilt", r"synchro"), ("Leather", r"\bleather\b")])
    if want("layout"):
        out["layout"] = _first(text if "keyboard" in t else t,
                               [("Split", r"\bsplit\b|separated|two[- ]piece"), ("Contoured", r"contour|advantage|concave"), ("One-handed", r"one[- ]hand|single[- ]hand|half[- ]?keyboard"),
                                ("Compact / tenkeyless", r"compact|tenkeyless|\btkl\b|mini\b|60%|65%|75%|no numeric|without numeric"), ("Numeric keypad", r"keypad|numpad|10[- ]key"),
                                ("Large print / high visibility", r"large print|big key|high visibility|large key"), ("Full-size", r"full[- ]size|full size|numeric")]) or ["Full-size"]
    if want("connection"):
        out["connection"] = _all(text, [("Bluetooth", r"bluetooth"), ("Wireless (USB receiver)", r"wireless|2\.4\s?ghz|receiver|dongle"), ("Wired USB", r"\bwired\b|usb cable|usb-?c? cord|\bcable\b")])
        if "Bluetooth" in out["connection"] and "Wireless (USB receiver)" in out["connection"] and not re.search(r"2\.4|receiver|dongle", text):
            out["connection"].remove("Wireless (USB receiver)")
        if not out["connection"]:
            out["connection"] = ["Wired USB"]
    if want("switch_type"):
        out["switch_type"] = ["Mechanical"] if re.search(r"mechanical|cherry mx|gateron|kailh|hot[- ]?swap", text) else ["Membrane / scissor"]
    if want("mouse_style"):
        out["mouse_style"] = _first(text, [("Vertical", r"vertical"), ("Trackball", r"trackball|track ball"), ("Touchpad", r"touchpad|trackpad|glidepoint"),
                                           ("Roller bar", r"roller ?mouse|rollerbar|roller bar|bar mouse"), ("Pen / stylus", r"pen mouse|penclic|stylus"),
                                           ("Joystick", r"joystick"), ("Gaming", r"gaming"), ("Standard", r"mouse|mice")]) or ["Standard"]
    if want("hand"):
        h = _all(text, [("Left", r"\bleft[- ]hand|\bleft\b"), ("Right", r"\bright[- ]hand|\bright\b"), ("Ambidextrous", r"ambidextrous|either hand|left or right|reversible|symmetrical")])
        out["hand"] = ["Ambidextrous"] if "Ambidextrous" in h or len(h) == 2 else h
    if want("lift"):
        out["lift"] = _first(text, [("Electric", r"electric|motor|programmable|memory preset"), ("Hand crank", r"crank"), ("Gas spring / manual", r"gas|pneumatic|spring[- ]assist|counterbalance|lever|manual")])
    if want("desk_width"):
        w = _max_num(t, r"(\d{2})(?:\"|”|″|-inch| inch| in\b|w\b)")
        if w and 20 <= w <= 96:
            out["desk_width"] = [_bucket(w, [36, 48, 60, 72], "in")]
    if want("tray_part"):
        has_arm, has_plat = re.search(r"\barm\b|mechanism|track", t), re.search(r"platform|tray|board|surface|system", t)
        out["tray_part"] = ["Complete system"] if (has_arm and has_plat) or "system" in t else ["Arm / mechanism"] if has_arm else ["Platform only"] if has_plat else ["Accessory"]
    out["color"] = _all(t, COLORS) or _all(text[:600], COLORS)[:2]
    return {k: v for k, v in out.items() if v}
