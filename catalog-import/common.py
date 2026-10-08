"""Shared helpers for the catalog import scripts."""
import html
import json
import re
import time
from pathlib import Path

import requests

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

USER_AGENT = "Mozilla/5.0 (compatible; JestikCatalogBot/1.0; +https://www.jestik.com)"

_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT
_last_request = 0.0


def fetch(url, delay=1.0, retries=3):
    """GET a URL politely: at most one request per `delay` seconds, with retries."""
    global _last_request
    for attempt in range(retries):
        wait = delay - (time.time() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.time()
        try:
            r = _session.get(url, timeout=30)
            if r.status_code == 200:
                return r
            if r.status_code in (404, 410):
                return None
        except requests.RequestException:
            pass
        time.sleep(2 ** (attempt + 1))
    return None


def strip_tags(s):
    s = re.sub(r"<(br|/li|/p|/h\d|/tr)[^>]*>", "\n", s or "", flags=re.I)
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    return re.sub(r"[ \t\xa0]+", " ", s).strip()


def bullet_facts(fragment):
    """Split an HTML fragment into short factual lines (used as input for writing
    original copy -- these lines are never published verbatim)."""
    lines = [l.strip(" -•*\t") for l in strip_tags(fragment).split("\n")]
    return [l for l in lines if 3 < len(l) < 300]


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:200]


def write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def read_jsonl(path):
    path = Path(path)
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]
