"""Write ORIGINAL product descriptions with Claude from the scraped facts.

The model is given only factual attributes (name, brand, SKU, category, spec
lines) and is told to write fresh copy, not to paraphrase the source. Uses the
Message Batches API (50% cheaper, results usually within an hour).

    pip install anthropic
    export ANTHROPIC_API_KEY=...
    python write_descriptions.py submit     # creates the batch
    python write_descriptions.py collect    # polls until done, saves results

Output: data/descriptions.json  {product_key: "<html>"}
"""
import json
import sys
import time

import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

from common import DATA_DIR, read_jsonl

MODEL = "claude-opus-5-5"
OUT = DATA_DIR / "descriptions.json"
STATE = DATA_DIR / "batch_state.json"

SYSTEM = """You write product descriptions for Jestik, an online store for ergonomic office products.

You will receive factual attributes for one product. Write a brand-new description in Jestik's own voice:
- Use only the facts provided. Do not invent dimensions, certifications, warranties or claims.
- Do not copy or closely paraphrase any sentence from the facts; they are reference notes, not copy.
- Format as HTML: one <p> of 2-3 sentences on who the product is for and the main benefit,
  then a <ul> of 4-8 short <li> items covering the key specifications, then optionally one closing <p>.
- No headings, no prices, no mention of other retailers, no emojis.
Return only the HTML."""


def product_key(p):
    return f"{p['source']}:{p['source_url']}"


def load_products():
    return read_jsonl(DATA_DIR / "ergodirect.jsonl") + read_jsonl(DATA_DIR / "askergoworks.jsonl")


def facts_prompt(p):
    lines = [f"Product name: {p['name']}", f"Brand: {p.get('brand') or 'unknown'}"]
    if p.get("sku"):
        lines.append(f"Model / SKU: {p['sku']}")
    if p.get("category_path"):
        lines.append("Category: " + " > ".join(p["category_path"]))
    if p.get("variants") and len(p["variants"]) > 1:
        lines.append("Available options: " + ", ".join(v["title"] for v in p["variants"][:20]))
    for k, v in (p.get("specs") or {}).items():
        lines.append(f"{k}: {v}")
    lines.append("Reference notes:")
    lines += [f"- {f}" for f in p.get("facts", [])[:40]]
    return "\n".join(lines)


def submit():
    done = json.loads(OUT.read_text()) if OUT.exists() else {}
    products = [p for p in load_products() if product_key(p) not in done]
    if not products:
        print("Nothing to do.")
        return
    client = anthropic.Anthropic()
    id_map = {}
    requests = []
    for i, p in enumerate(products):
        cid = f"p{i:06d}"
        id_map[cid] = product_key(p)
        requests.append(Request(
            custom_id=cid,
            params=MessageCreateParamsNonStreaming(
                model=MODEL,
                max_tokens=2000,
                output_config={"effort": "low"},
                system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
                messages=[{"role": "user", "content": facts_prompt(p)}],
            ),
        ))
    batch = client.messages.batches.create(requests=requests)
    STATE.write_text(json.dumps({"batch_id": batch.id, "id_map": id_map}))
    print(f"Submitted batch {batch.id} with {len(requests)} products")


def collect():
    state = json.loads(STATE.read_text())
    client = anthropic.Anthropic()
    while True:
        batch = client.messages.batches.retrieve(state["batch_id"])
        if batch.processing_status == "ended":
            break
        print(f"{batch.processing_status}: {batch.request_counts.processing} still processing")
        time.sleep(60)

    done = json.loads(OUT.read_text()) if OUT.exists() else {}
    failed = 0
    for result in client.messages.batches.results(state["batch_id"]):
        msg = result.result.message if result.result.type == "succeeded" else None
        if msg is None or msg.stop_reason == "refusal":
            failed += 1
            continue
        text = next((b.text for b in msg.content if b.type == "text"), "").strip()
        if text:
            done[state["id_map"][result.custom_id]] = text
    OUT.write_text(json.dumps(done, ensure_ascii=False, indent=1))
    print(f"Saved {len(done)} descriptions ({failed} failed -- re-run 'submit' to retry them)")


if __name__ == "__main__":
    {"submit": submit, "collect": collect}[sys.argv[1] if len(sys.argv) > 1 else "submit"]()
