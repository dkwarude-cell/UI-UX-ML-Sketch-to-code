import argparse
import asyncio
import base64
import io
import json
import logging
import os
import random
import re
import threading
import time
from pathlib import Path
from typing import Dict, List

import cv2
import httpx
import numpy as np
from PIL import Image
from datasets import load_dataset
from playwright.async_api import async_playwright

from .collector import DataCollector

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

TAILWIND_COLORS = [
    "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow",
    "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
]

TEMPLATES = {
    "landing_page": """<!DOCTYPE html><html><head><script src=\"https://cdn.tailwindcss.com\"></script></head>
    <body class=\"bg-{bg}-50 min-h-screen text-{color}-900\">
      <nav class=\"bg-{nav_bg}-600 text-white shadow px-6 py-4 flex justify-between items-center\"> <div class=\"font-bold text-lg\">{brand}</div> <div class=\"space-x-4 text-sm\"><a class=\"hover:underline\">Features</a><a class=\"hover:underline\">Pricing</a><a class=\"hover:underline\">Docs</a></div> <button class=\"bg-white text-{nav_bg}-700 px-4 py-2 rounded-lg font-semibold\">Sign up</button> </nav>
      <section class=\"max-w-4xl mx-auto py-20 text-center space-y-4\">
        <p class=\"text-{color}-500 font-semibold\">{eyebrow}</p>
        <h1 class=\"text-{size}xl font-bold leading-tight\">{headline}</h1>
        <p class=\"text-gray-600 max-w-2xl mx-auto\">{subhead}</p>
        <div class=\"flex justify-center gap-3 mt-6\">
          <button class=\"bg-{color}-600 text-white px-8 py-3 rounded-lg shadow-lg\">{cta}</button>
          <button class=\"border border-{color}-300 text-{color}-700 px-6 py-3 rounded-lg\">{cta2}</button>
        </div>
      </section>
    </body></html>""",
    "dashboard": """<!DOCTYPE html><html><head><script src=\"https://cdn.tailwindcss.com\"></script></head>
    <body class=\"bg-{bg}-100 min-h-screen text-{color}-900\">
      <div class=\"flex\">
        <aside class=\"w-64 bg-white shadow-md h-screen p-6 space-y-4\"> <div class=\"font-bold text-xl\">{brand}</div> <div class=\"space-y-2 text-sm\">{sidebar}</div> </aside>
        <main class=\"flex-1 p-8 space-y-6\">
          <header class=\"flex justify-between items-center\"><h1 class=\"text-2xl font-bold\">Overview</h1><button class=\"bg-{color}-600 text-white px-4 py-2 rounded-lg\">New</button></header>
          <div class=\"grid grid-cols-3 gap-4\">{cards}</div>
          <div class=\"bg-white rounded-2xl shadow p-6\">{table}</div>
        </main>
      </div>
    </body></html>""",
    "login_form": """<!DOCTYPE html><html><head><script src=\"https://cdn.tailwindcss.com\"></script></head>
    <body class=\"bg-{bg}-50 min-h-screen flex items-center justify-center\">
      <div class=\"w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4\">
        <h1 class=\"text-2xl font-bold text-center\">Sign in</h1>
        <div class=\"space-y-3\">
          <label class=\"text-sm text-gray-600\">Email</label><input class=\"w-full border rounded-lg px-3 py-2\" placeholder=\"you@example.com\"/>
          <label class=\"text-sm text-gray-600\">Password</label><input type=\"password\" class=\"w-full border rounded-lg px-3 py-2\" placeholder=\"••••••\"/>
          <button class=\"w-full bg-{color}-600 text-white py-2 rounded-lg font-semibold\">Continue</button>
        </div>
      </div>
    </body></html>""",
    "pricing_table": """<!DOCTYPE html><html><head><script src=\"https://cdn.tailwindcss.com\"></script></head>
    <body class=\"bg-white min-h-screen text-{color}-900\">
      <section class=\"max-w-5xl mx-auto py-16 px-6\">
        <h1 class=\"text-3xl font-bold text-center\">Pricing</h1>
        <div class=\"grid grid-cols-3 gap-6 mt-8\">{tiers}</div>
      </section>
    </body></html>""",
    "blog_post": """<!DOCTYPE html><html><head><script src=\"https://cdn.tailwindcss.com\"></script></head>
    <body class=\"bg-{bg}-50 min-h-screen text-{color}-900\">
      <main class=\"max-w-4xl mx-auto py-16 px-6\">
        <p class=\"text-{color}-500 font-semibold\">{eyebrow}</p>
        <h1 class=\"text-4xl font-bold mb-4\">{headline}</h1>
        <article class=\"prose prose-lg\">{paragraphs}</article>
      </main>
    </body></html>""",
    "ecommerce_card": """<!DOCTYPE html><html><head><script src=\"https://cdn.tailwindcss.com\"></script></head>
    <body class=\"bg-{bg}-50 min-h-screen text-{color}-900\">
      <section class=\"max-w-6xl mx-auto py-12 px-6\">
        <h2 class=\"text-3xl font-bold mb-6\">Featured</h2>
        <div class=\"grid grid-cols-3 gap-5\">{products}</div>
      </section>
    </body></html>""",
    "settings_page": """<!DOCTYPE html><html><head><script src=\"https://cdn.tailwindcss.com\"></script></head>
    <body class=\"bg-{bg}-50 min-h-screen text-{color}-900\">
      <main class=\"max-w-4xl mx-auto py-14 px-6 space-y-6\">
        <h1 class=\"text-3xl font-bold\">Settings</h1>
        <div class=\"bg-white shadow rounded-2xl p-6 space-y-4\">{forms}</div>
        <button class=\"bg-{color}-600 text-white px-6 py-2 rounded-lg\">Save changes</button>
      </main>
    </body></html>""",
    "404_page": """<!DOCTYPE html><html><head><script src=\"https://cdn.tailwindcss.com\"></script></head>
    <body class=\"bg-{bg}-50 min-h-screen flex items-center justify-center text-{color}-900\">
      <div class=\"text-center space-y-4\">
        <p class=\"text-{color}-500 font-semibold\">{eyebrow}</p>
        <h1 class=\"text-6xl font-black\">404</h1>
        <p class=\"text-gray-600\">{subhead}</p>
        <button class=\"bg-{color}-600 text-white px-6 py-3 rounded-lg\">Go back</button>
      </div>
    </body></html>""",
}


def retry(fn, attempts=3, base=1.5):
    for i in range(attempts):
        try:
            return fn()
        except Exception as e:
            wait = base ** i
            logger.warning("retry %s/%s failed: %s", i + 1, attempts, e)
            time.sleep(wait)
    raise


def image_to_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def wireframe_image(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert("RGB"))
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)
    edges_rgb = cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB)
    white_bg = np.full_like(edges_rgb, 255)
    combined = 255 - edges_rgb
    return Image.fromarray(combined)


def render_playwright_pairs(pairs_out: Path, target: int = 3000):
    async def _run():
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page(viewport={"width": 1280, "height": 720})
            collected = 0
            with pairs_out.open("a", encoding="utf-8") as f:
                while collected < target:
                    html = build_random_template()
                    await page.set_content(html)
                    buf = await page.screenshot(full_page=True)
                    img = Image.open(io.BytesIO(buf))
                    wire = wireframe_image(img)
                    # desktop
                    f.write(json.dumps({"image": save_temp_image(img), "html": html}) + "\n")
                    f.write(json.dumps({"image": save_temp_image(wire), "html": html}) + "\n")
                    # mobile shot
                    await page.set_viewport_size({"width": 375, "height": 812})
                    await page.set_content(html)
                    buf2 = await page.screenshot(full_page=True)
                    img2 = Image.open(io.BytesIO(buf2))
                    wire2 = wireframe_image(img2)
                    f.write(json.dumps({"image": save_temp_image(img2), "html": html}) + "\n")
                    f.write(json.dumps({"image": save_temp_image(wire2), "html": html}) + "\n")
                    collected += 2
            await browser.close()
    asyncio.run(_run())


def save_temp_image(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def build_random_template() -> str:
    name, tpl = random.choice(list(TEMPLATES.items()))
    color = random.choice(TAILWIND_COLORS)
    nav_bg = random.choice(TAILWIND_COLORS)
    bg = random.choice(["white", "slate", "gray", "zinc", "stone"])
    headline = random.choice([
        "Design to code in seconds", "Ship UI faster", "Beautiful dashboards in a click", "Sketch to production HTML",
    ])
    subhead = random.choice([
        "Turn your wireframes into responsive Tailwind UIs automatically.",
        "AI-powered frontend generation for your team.",
        "Stop hand-coding boilerplate, focus on product.",
    ])
    brand = random.choice(["SketchToCode", "UI Forge", "ShipRight", "Feather UI"])
    eyebrow = random.choice(["New", "Update", "Changelog", "Release"])
    cta = random.choice(["Get started", "Try now", "Generate", "Launch demo"])
    cta2 = random.choice(["View docs", "See pricing", "Watch video"])
    size = random.choice([4, 5, 6])

    sidebar = "".join(
        [f"<div class='px-3 py-2 rounded-lg hover:bg-{color}-50 cursor-pointer'>Item {i}</div>" for i in range(1, 7)]
    )
    cards = "".join(
        [
            f"<div class='bg-white rounded-2xl shadow p-4 space-y-2'><p class='text-sm text-gray-500'>Metric {i}</p><p class='text-2xl font-bold'>{random.randint(10,999)}</p></div>"
            for i in range(1, 4)
        ]
    )
    table_rows = "".join(
        [
            f"<tr class='border-b'><td class='py-2'>Row {i}</td><td class='py-2'>Status</td><td class='py-2 text-right'>{random.randint(1,100)}</td></tr>"
            for i in range(1, 6)
        ]
    )
    table = f"<table class='w-full text-left'><thead><tr><th>Name</th><th>Status</th><th class='text-right'>Value</th></tr></thead><tbody>{table_rows}</tbody></table>"
    tiers = "".join(
        [
            f"<div class='border rounded-2xl p-6 shadow-sm space-y-3'><p class='text-sm text-gray-500'>{t}</p><p class='text-3xl font-bold'>${random.randint(9,99)}</p><ul class='space-y-1 text-sm text-gray-600'><li>Feature A</li><li>Feature B</li><li>Feature C</li></ul><button class='w-full bg-{color}-600 text-white py-2 rounded-lg'>Choose</button></div>"
            for t in ["Starter", "Pro", "Enterprise"]
        ]
    )
    paragraphs = "".join([
        "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis a metus ac nulla consequat aliquet id quis turpis.</p>"
        for _ in range(4)
    ])
    products = "".join(
        [
            f"<div class='bg-white rounded-2xl shadow p-4 space-y-2'><div class='h-40 bg-{bg}-200 rounded-xl'></div><p class='font-semibold'>Product {i}</p><p class='text-{color}-600 font-bold'>${random.randint(10,199)}</p><button class='w-full bg-{color}-600 text-white py-2 rounded-lg'>Add</button></div>"
            for i in range(1, 7)
        ]
    )
    forms = "".join(
        [
            f"<div class='space-y-1'><label class='text-sm text-gray-600'>Field {i}</label><input class='w-full border rounded-lg px-3 py-2' placeholder='Value {i}'/></div>"
            for i in range(1, 6)
        ]
    )
    return tpl.format(
        bg=bg,
        nav_bg=nav_bg,
        brand=brand,
        eyebrow=eyebrow,
        headline=headline,
        subhead=subhead,
        cta=cta,
        cta2=cta2,
        size=size,
        color=color,
        sidebar=sidebar,
        cards=cards,
        table=table,
        tiers=tiers,
        paragraphs=paragraphs,
        products=products,
        forms=forms,
    )


def download_huggingface_pairs(out_path: Path, min_pairs: int = 1000) -> int:
    total = 0
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        # WebSight
        try:
            ds2 = retry(lambda: load_dataset("HuggingFaceM4/WebSight", split="train[:8000]"))
            for ex in ds2:
                img = ex["image"].convert("RGB")
                html = ex["text"]
                f.write(json.dumps({"image": image_to_base64(img), "html": html}) + "\n")
                total += 1
        except Exception as e:
            logger.warning("WebSight download failed: %s", e)
        # Design2Code
        try:
            ds3 = retry(lambda: load_dataset("SALT-NLP/Design2Code", split="train"))
            for ex in ds3:
                img = ex["image"].convert("RGB")
                html = ex.get("html") or ex.get("code") or ""
                f.write(json.dumps({"image": image_to_base64(img), "html": html}) + "\n")
                total += 1
        except Exception as e:
            logger.warning("Design2Code download failed: %s", e)
        # HTML code completion (no images) -> create placeholder gray block
        try:
            ds4 = retry(lambda: load_dataset("christopherthompson81/html_code_completion", split="train[:3000]"))
            for ex in ds4:
                html = ex.get("completion") or ex.get("text") or ""
                img = Image.new("RGB", (512, 512), color=(245, 245, 245))
                f.write(json.dumps({"image": image_to_base64(img), "html": html}) + "\n")
                total += 1
        except Exception as e:
            logger.warning("HTML code completion download failed: %s", e)
        # The Stack HTML chunk
        try:
            ds1 = retry(lambda: load_dataset("bigcode/the-stack", data_files="data/html/chunk_0*.parquet", split="train[:5000]"))
            for ex in ds1:
                html = ex.get("content") or ""
                img = Image.new("RGB", (512, 512), color=(240, 240, 240))
                f.write(json.dumps({"image": image_to_base64(img), "html": html}) + "\n")
                total += 1
        except Exception as e:
            logger.warning("The Stack HTML download failed: %s", e)
    logger.info("HuggingFace sources collected %s pairs", total)
    return total


def run_github_scraper(out_path: Path, limit: int = 500):
    async def _run():
        queries = [
            "tailwind landing page html",
            "tailwind dashboard template html",
            "tailwind components html",
        ]
        headers = {"Accept": "application/vnd.github+json"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            collected = 0
            with out_path.open("a", encoding="utf-8") as f:
                for q in queries:
                    if collected >= limit:
                        break
                    search_url = f"https://api.github.com/search/code?q={q}+language:HTML&per_page=30"
                    try:
                        sr = await client.get(search_url, headers=headers)
                        if sr.status_code >= 400:
                            logger.warning("GitHub search failed %s", sr.text)
                            continue
                        items = sr.json().get("items", [])
                        for item in items:
                            if collected >= limit:
                                break
                            raw_url = item.get("html_url", "").replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
                            await asyncio.sleep(1)
                            try:
                                rr = await client.get(raw_url, headers=headers)
                                if rr.status_code >= 400:
                                    continue
                                html = rr.text
                                if "tailwind" not in html or len(html) < 500:
                                    continue
                                if not is_parseable(html):
                                    continue
                                img = Image.new("RGB", (512, 512), color=(255, 255, 255))
                                f.write(json.dumps({"image": image_to_base64(img), "html": html}) + "\n")
                                collected += 1
                            except Exception:
                                continue
                    except Exception as e:
                        logger.warning("GitHub query failed: %s", e)
    asyncio.run(_run())


def is_parseable(html: str) -> bool:
    from bs4 import BeautifulSoup

    try:
        BeautifulSoup(html, "html.parser")
        return True
    except Exception:
        return False


def load_pairs_to_db(path: Path, collector: DataCollector, max_pairs: int = None) -> int:
    total = 0
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            if max_pairs and total >= max_pairs:
                break
            try:
                row = json.loads(line)
                img_b64 = row.get("image")
                html = row.get("html", "")
                if not img_b64 or not html:
                    continue
                collector.handle_pair(img_b64, html, time.time(), "bootstrap")
                total += 1
            except Exception as e:
                logger.debug("skip row: %s", e)
    return total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-pairs", type=int, default=1000)
    parser.add_argument("--sources", nargs="*", default=["huggingface", "synthetic", "github"], choices=["huggingface", "synthetic", "github"])
    args = parser.parse_args()

    data_root = Path("ml/data/raw")
    data_root.mkdir(parents=True, exist_ok=True)

    collector = DataCollector()
    threads: List[threading.Thread] = []

    hf_path = data_root / "huggingface_pairs.jsonl"
    synth_path = data_root / "synthetic_pairs.jsonl"
    gh_path = data_root / "github_pairs.jsonl"

    # HuggingFace first (blocking)
    total_pairs = 0
    if "huggingface" in args.sources:
        total_pairs += download_huggingface_pairs(hf_path, min_pairs=args.min_pairs)
        total_pairs += load_pairs_to_db(hf_path, collector)

    def run_synth():
        try:
            render_playwright_pairs(synth_path)
            load_pairs_to_db(synth_path, collector)
        except Exception as e:
            logger.warning("Synthetic gen failed: %s", e)

    def run_github():
        try:
            run_github_scraper(gh_path)
            load_pairs_to_db(gh_path, collector)
        except Exception as e:
            logger.warning("GitHub scrape failed: %s", e)

    if "synthetic" in args.sources:
        t = threading.Thread(target=run_synth, daemon=True)
        t.start()
        threads.append(t)
    if "github" in args.sources:
        t = threading.Thread(target=run_github, daemon=True)
        t.start()
        threads.append(t)

    logger.info("Bootstrap: %s pairs loaded so far", total_pairs)
    if total_pairs < args.min_pairs:
        logger.info("Waiting for minimum pairs %s", args.min_pairs)
        while total_pairs < args.min_pairs and any(t.is_alive() for t in threads):
            time.sleep(5)
            total_pairs = collector._count_pairs()
            logger.info("Bootstrap progress: %s/%s", total_pairs, args.min_pairs)

    for t in threads:
        t.join(timeout=2)

    logger.info("Bootstrap complete with %s pairs", collector._count_pairs())


if __name__ == "__main__":
    main()
