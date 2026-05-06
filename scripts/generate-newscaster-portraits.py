#!/usr/bin/env python3
"""
Generate GNN newscaster character portraits for Star Freight Tycoon.
Produces 5 newscaster types: anchor, science, finance, fashion, field.

Uses direct OpenAI gpt-image-1 API, same pipeline as generate-portraits.py.
Output: assets-source/portraits/newscaster/<name>.png (flattened to #0a0a1a bg)
"""

import base64
import io
import os
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = PROJECT_ROOT / "assets-source" / "portraits" / "newscaster"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_api_key():
    env_file = PROJECT_ROOT / ".mcp" / "image-gen-mcp" / ".env"
    env = os.environ.copy()
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    return env.get("PROVIDERS__OPENAI__API_KEY", env.get("OPENAI_API_KEY", ""))


BG_COLOR = (10, 10, 26)  # #0a0a1a — matches game theme


def flatten_to_opaque(img_bytes, output_path):
    from PIL import Image

    img = Image.open(io.BytesIO(img_bytes))
    if img.mode == "RGBA":
        bg = Image.new("RGB", img.size, BG_COLOR)
        bg.paste(img, mask=img.split()[3])
        img = bg
        print("  ⬛ Flattened RGBA → RGB (composited onto #0a0a1a)")
    elif img.mode != "RGB":
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()
    with open(output_path, "wb") as f:
        f.write(png_bytes)
    return png_bytes


# Same STYLE_BASE as generate-portraits.py (MOO2 / Star Control retro pixel art)
STYLE_BASE = (
    "Retro 16-bit pixel art character portrait in the style of Master of Orion II and Star Control. "
    "Dark space background using deep indigo and midnight blue (#0a0a1a, #111128). "
    "Dramatic teal/cyan neon rim lighting and glow highlights (#00ffcc). "
    "Visible chunky pixels, limited color palette (max 32 colors), dithering for shading. "
    "Head and shoulders bust, square composition, game avatar icon framing. "
    "SNES/Sega Genesis era pixel art quality. Moody sci-fi lighting. "
    "ABSOLUTELY NO text, NO words, NO letters, NO names, NO labels, NO UI elements in the image. "
    "Pure character portrait only."
)

NEWSCASTERS = {
    "anchor": {
        "desc": (
            "Stellara Vex, lead news anchor alien for the Galactic News Network. "
            "Humanoid alien with smooth cobalt-blue iridescent skin, slightly elongated graceful head, "
            "large almond-shaped silver eyes with bioluminescent glow, silver-white swept hair. "
            "Crisp navy double-breasted suit with gold GNN lapel pin, holographic earpiece. "
            "Professional, authoritative expression. Studio spotlight backdrop."
        ),
        "filename": "anchor.png",
    },
    "science": {
        "desc": (
            "Dr. Krill Vexx, science and technology correspondent. "
            "Small classic grey alien with large smooth grey head, huge glossy black almond eyes, "
            "tiny slit nostrils, intellectually curious expression. "
            "White lab coat over turtleneck, small circular wire-rimmed spectacles. "
            "Datapad hologram visible. Teal-green science-desk backdrop."
        ),
        "filename": "science.png",
    },
    "finance": {
        "desc": (
            "Sterling Hawkes, markets analyst for GNN. "
            "Exotic bird alien with vibrant tropical plumage in electric blues and golds, "
            "sleek swept-back feather-crest, sharp raptor eyes, confident cocky grin. "
            "Pinstriped power suit with red suspenders and pocket square, gold tie clip. "
            "80s Wall Street energy. Holographic stock chart visible."
        ),
        "filename": "finance.png",
    },
    "fashion": {
        "desc": (
            "CHIC-9, style and culture correspondent for GNN. "
            "Sleek chrome humanoid robot with elegant elongated frame, "
            "large compound optical sensors arranged like dramatic eye makeup, "
            "articulated joints with couture-style plating. "
            "Chic structured jacket with chrome details. Dramatic pose. "
            "Neon-pink and violet studio lighting backdrop."
        ),
        "filename": "fashion.png",
    },
    "field": {
        "desc": (
            "Grix Vander, field reporter for GNN. "
            "Rugged bipedal lizard alien with green-grey scales, bright amber slit-pupil eyes, "
            "athletic build, slightly wind-blown head frills. "
            "Worn tactical field vest with logo patches, directional microphone. "
            "Outdoor colony backdrop with dramatic sky. Slightly disheveled but focused."
        ),
        "filename": "field.png",
    },
}


def main():
    try:
        import openai
    except ImportError:
        import subprocess
        print("Installing openai package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai"])
        import openai

    api_key = load_api_key()
    if not api_key:
        print("ERROR: No OpenAI API key found in .mcp/image-gen-mcp/.env")
        sys.exit(1)

    client = openai.OpenAI(api_key=api_key)
    results = {}

    items = list(NEWSCASTERS.items())
    for i, (key, info) in enumerate(items):
        out_path = OUTPUT_DIR / info["filename"]
        if out_path.exists():
            print(f"[{i+1}/{len(items)}] Skipping {key} — already exists")
            results[key] = True
            continue

        prompt = f"{info['desc']} {STYLE_BASE}"
        print(f"\n{'='*60}")
        print(f"[{i+1}/{len(items)}] Generating: {key} → {info['filename']}")
        print(f"{'='*60}")

        try:
            result = client.images.generate(
                model="gpt-image-1",
                prompt=prompt,
                n=1,
                size="1024x1024",
                quality="medium",
            )

            if result.data and result.data[0].b64_json:
                img_data = base64.b64decode(result.data[0].b64_json)
                img_data = flatten_to_opaque(img_data, str(out_path))
                size_kb = len(img_data) / 1024
                print(f"  ✓ Saved {info['filename']} ({size_kb:.1f} KB)")
                results[key] = True
            else:
                print(f"  ✗ No image data returned for {key}")
                results[key] = False

        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            results[key] = False
            if "rate" in str(e).lower() or "429" in str(e):
                print("  Rate limited, waiting 30s...")
                time.sleep(30)
            continue

        if i < len(items) - 1:
            time.sleep(1.5)

    print(f"\n{'='*60}")
    print("GENERATION SUMMARY")
    print(f"{'='*60}")
    for key, ok in results.items():
        status = "✓" if ok else "✗"
        print(f"  {status} {key}: {NEWSCASTERS[key]['filename']}")

    generated = [f for f in OUTPUT_DIR.iterdir() if f.suffix == ".png"]
    print(f"\nTotal files in {OUTPUT_DIR}: {len(generated)}")
    return all(results.values())


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
