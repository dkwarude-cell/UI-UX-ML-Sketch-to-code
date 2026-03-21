import argparse
import json
import random
import string
from pathlib import Path
from typing import Dict, List, Tuple

from playwright.sync_api import sync_playwright
from tqdm import tqdm

# Basic component snippets to assemble random Tailwind layouts
SECTIONS = [
    "hero", "features", "stats", "cta", "pricing", "faq", "testimonials", "gallery", "form",
    "dashboard-cards", "sidebar-nav", "table", "kanban", "modal", "login", "register",
]

COLOR_PALETTES = [
    ["sky-600", "sky-50", "gray-900"],
    ["violet-600", "violet-50", "slate-900"],
    ["emerald-600", "emerald-50", "gray-900"],
    ["amber-600", "amber-50", "gray-900"],
]

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <script src=\"https://cdn.tailwindcss.com\"></script>
  <style>body {{ font-family: 'Inter', system-ui, -apple-system, sans-serif; }}</style>
  <title>{title}</title>
</head>
<body class=\"bg-{bg} text-{fg}\">
  <div class=\"min-h-screen flex flex-col\">
    {body}
  </div>
</body>
</html>
"""


def rand_word(n: int = 6) -> str:
    return "".join(random.choices(string.ascii_letters, k=n)).title()


def random_section() -> str:
    sec = random.choice(SECTIONS)
    primary, surface, text = random.choice(COLOR_PALETTES)
    if sec == "hero":
        return f"<section class='px-12 py-16 bg-{surface}'><div class='max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center'><div><p class='text-{primary} font-semibold mb-2'>New</p><h1 class='text-4xl font-bold mb-4'>{rand_word()} {rand_word()}</h1><p class='text-lg text-gray-600 mb-6'>Lorem ipsum dolor sit amet.</p><div class='flex gap-3'><button class='px-5 py-3 bg-{primary} text-white rounded-lg shadow'>Get started</button><button class='px-5 py-3 border border-{primary} text-{primary} rounded-lg'>Learn more</button></div></div><div class='h-72 bg-white/60 border border-gray-200 rounded-2xl shadow-inner'></div></div></section>"
    if sec == "features":
        cards = "".join([
            f"<div class='p-6 bg-white/80 rounded-xl border border-gray-200 shadow-sm'><div class='h-10 w-10 rounded-full bg-{primary}/10 mb-4'></div><h3 class='font-semibold text-lg mb-2'>{rand_word()}</h3><p class='text-gray-600 text-sm'>Short copy.</p></div>"
            for _ in range(4)
        ])
        return f"<section class='px-12 py-14 bg-{surface}'><div class='max-w-6xl mx-auto grid md:grid-cols-4 gap-5'>{cards}</div></section>"
    if sec == "pricing":
        tiers = "".join([
            f"<div class='p-6 rounded-2xl border border-gray-200 bg-white/80 shadow'><p class='text-sm text-gray-500 mb-2'>Plan</p><h3 class='text-3xl font-bold mb-4'>$ {(i+1)*19}</h3><ul class='space-y-2 text-sm text-gray-600'><li>Feature A</li><li>Feature B</li><li>Feature C</li></ul><button class='mt-6 w-full px-4 py-2 bg-{primary} text-white rounded-lg'>Choose</button></div>"  # noqa: E501
            for i in range(3)
        ])
        return f"<section class='px-12 py-14 bg-{surface}'><div class='max-w-5xl mx-auto grid md:grid-cols-3 gap-6'>{tiers}</div></section>"
    if sec == "login":
        return f"<section class='min-h-screen flex items-center justify-center bg-{surface}'><div class='w-full max-w-md p-8 bg-white/80 rounded-2xl shadow border border-gray-200'><h2 class='text-2xl font-bold mb-6'>Sign in</h2><form class='space-y-4'><div><label class='text-sm text-gray-600'>Email</label><input class='mt-1 w-full px-3 py-2 border rounded-lg' /></div><div><label class='text-sm text-gray-600'>Password</label><input type='password' class='mt-1 w-full px-3 py-2 border rounded-lg' /></div><button class='w-full py-3 bg-{primary} text-white rounded-lg'>Login</button></form></div></section>"  # noqa: E501
    # default fallback: simple cards
    cards = "".join([
        f"<div class='p-4 bg-white/80 rounded-xl border border-gray-200 shadow-sm h-32'></div>"
        for _ in range(6)
    ])
    return f"<section class='px-12 py-14 bg-{surface}'><div class='max-w-6xl mx-auto grid md:grid-cols-3 gap-6'>{cards}</div></section>"


def build_html() -> str:
    num_sections = random.randint(2, 6)
    sections: List[str] = [random_section() for _ in range(num_sections)]
    primary, surface, text = random.choice(COLOR_PALETTES)
    title = f"{rand_word()} {rand_word()}"
    body = "\n".join(sections)
    return HTML_TEMPLATE.format(title=title, bg=f"{surface}", fg=f"{text}", body=body)


def render_and_capture(samples: int, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = out_dir / "synthetic.jsonl"
    if jsonl_path.exists():
        print("[collect] synthetic.jsonl already done; skipping")
        return

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        records: List[Dict[str, str]] = []

        for i in tqdm(range(samples), desc="rendering", unit="sample"):
            html = build_html()
            page.set_content(html, wait_until="networkidle")
            img_path = out_dir / f"synthetic_{i:05d}.png"
            page.screenshot(path=str(img_path), full_page=True)
            records.append({"image_path": str(img_path), "html": html})

        browser.close()

    with jsonl_path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec) + "\n")
    print(f"[collect] wrote {len(records)} samples -> {jsonl_path}")


def append_self_collected(raw_dir: Path) -> None:
    self_path = raw_dir / "self_collected.jsonl"
    if not self_path.exists():
        return
    synth_path = raw_dir / "synthetic.jsonl"
    if not synth_path.exists():
        return
    with synth_path.open("a", encoding="utf-8") as out_f, self_path.open("r", encoding="utf-8") as in_f:
        lines = in_f.readlines()
        if lines:
            out_f.writelines(lines)
            print(f"[collect] appended {len(lines)} self-collected rows to synthetic.jsonl")


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect synthetic wireframe->HTML pairs")
    parser.add_argument("--samples", type=int, default=10000, help="Number of synthetic samples to render")
    parser.add_argument("--out", type=str, default="ml/data/raw", help="Output directory for jsonl and images")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    render_and_capture(args.samples, out_dir)
    append_self_collected(out_dir)


if __name__ == "__main__":
    main()
