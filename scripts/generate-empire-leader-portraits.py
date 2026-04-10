#!/usr/bin/env python3
"""
Generate 20 empire leader portrait images for Star Freight Tycoon.
Style: 16/32-bit retro pixel art with dark space backgrounds and neon glow accents.
Matches the game's visual identity (deep blue-purple backgrounds, teal/cyan highlights).

Run from the project root: python3 scripts/generate-empire-leader-portraits.py
"""
import base64
import os
import re
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "portraits", "leaders")
LEADERS_TS = os.path.join(PROJECT_ROOT, "src", "data", "empireLeaderPortraits.ts")

# Load env from .mcp/image-gen-mcp/.env
env_file = os.path.join(PROJECT_ROOT, ".mcp", "image-gen-mcp", ".env")
env = os.environ.copy()
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Style constants ─────────────────────────────────────────────────────────

STYLE_BASE = (
    "16-bit retro pixel art character portrait, "
    "dark space background with deep blue-purple tones (#0a0a1a to #111128), "
    "subtle neon teal/cyan glow highlights (#00ffcc), "
    "visible pixel texture with careful anti-aliasing, limited color palette with dithering, "
    "SNES/Genesis-era quality pixel art, head and shoulders bust composition, "
    "dramatic rim lighting in teal/cyan, monospace-HUD aesthetic, "
    "reminiscent of Master of Orion II and Star Control character portraits. "
    "256x256 icon-friendly, facing slightly left. NO smooth gradients, NO photorealism. "
    "This is an EMPIRE LEADER — regal, powerful, authoritative presence."
)

# ── Parse empireLeaderPortraits.ts to get leader info ───────────────────────

def parse_leaders():
    """Extract leader definitions from empireLeaderPortraits.ts."""
    with open(LEADERS_TS, "r") as f:
        content = f.read()

    pattern = (
        r'id:\s*"(leader-\d+)".*?'
        r'label:\s*"([^"]+)".*?'
        r'category:\s*"([^"]+)".*?'
        r'species:\s*"([^"]+)".*?'
        r'archetype:\s*"([^"]+)".*?'
        r'bio:\s*"([^"]+)".*?'
        r'appearance:\s*\n?\s*"([^"]+)"'
    )

    entries = []
    for m in re.finditer(pattern, content, re.DOTALL):
        entries.append({
            "id": m.group(1),
            "label": m.group(2),
            "category": m.group(3),
            "species": m.group(4),
            "archetype": m.group(5),
            "bio": m.group(6),
            "appearance": m.group(7),
        })
    return entries


# ── Archetype-specific visual descriptions ──────────────────────────────────

ARCHETYPE_VISUALS = {
    "emperor": "regal sovereign with crown or diadem, imperial robes, commanding gaze, symbols of absolute power",
    "hiveMind": "collective consciousness avatar, neural connections visible, alien hive-being, bio-organic crown, otherworldly presence",
    "technocrat": "cybernetic administrator, data-streams and holographic interfaces, chrome implants, clinical precision",
    "warlord": "battle-hardened military commander, scarred, heavy armor with trophies, weapons visible, fierce expression",
    "plutarch": "wealthy merchant-ruler, expensive attire, gold and jewels, symbols of commerce, smug or calculating expression",
    "council": "diplomatic representative, formal ceremonial attire, diplomatic sash or insignia, composed demeanor",
    "prophet": "mystical spiritual leader, glowing eyes, ethereal robes, surrounded by mystical energy or symbols",
    "overseer": "authoritarian governor, surveillance tech, military-industrial aesthetic, stern and watchful",
}


def build_prompt(entry):
    """Build a generation prompt for a leader entry."""
    species = entry["species"]
    label = entry["label"]
    archetype = entry["archetype"]
    appearance = entry["appearance"]

    archetype_visual = ARCHETYPE_VISUALS.get(archetype, "powerful leader with commanding presence")

    prompt = (
        f"{appearance}. "
        f"{archetype_visual}. "
        f"Character: {label}, {species} empire leader. "
        f"{STYLE_BASE}"
    )
    return prompt


def main():
    leaders = parse_leaders()
    print(f"Found {len(leaders)} leader definitions in empireLeaderPortraits.ts")

    if not leaders:
        print("ERROR: No leader definitions found. Check the file path and format.")
        sys.exit(1)

    # Check which already exist
    existing = set()
    if os.path.isdir(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith(".png"):
                existing.add(f.replace(".png", ""))

    to_generate = [p for p in leaders if p["id"] not in existing]

    if not to_generate:
        print("All leader portraits already exist!")
        return

    print(f"Need to generate {len(to_generate)} portraits (skipping {len(existing)} existing)")

    # Import and setup OpenAI
    try:
        import openai
    except ImportError:
        import subprocess
        print("Installing openai package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai"])
        import openai

    api_key = env.get("PROVIDERS__OPENAI__API_KEY", env.get("OPENAI_API_KEY", ""))
    if not api_key:
        print("ERROR: No OpenAI API key found in .env")
        sys.exit(1)

    client = openai.OpenAI(api_key=api_key)

    success_count = 0
    fail_count = 0

    for i, entry in enumerate(to_generate):
        pid = entry["id"]
        prompt = build_prompt(entry)
        print(f"\n[{i+1}/{len(to_generate)}] Generating {pid} ({entry['label']}, {entry['species']} {entry['archetype']})...")
        print(f"  Prompt: {prompt[:150]}...")

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
                output_path = os.path.join(OUTPUT_DIR, f"{pid}.png")
                with open(output_path, "wb") as f:
                    f.write(img_data)
                print(f"  Saved {pid}.png ({len(img_data)} bytes)")
                success_count += 1
            elif result.data and result.data[0].url:
                import urllib.request
                output_path = os.path.join(OUTPUT_DIR, f"{pid}.png")
                urllib.request.urlretrieve(result.data[0].url, output_path)
                print(f"  Saved {pid}.png (from URL)")
                success_count += 1
            else:
                print(f"  No image data returned for {pid}")
                fail_count += 1

        except Exception as e:
            print(f"  ERROR: {e}")
            fail_count += 1
            if "rate" in str(e).lower() or "429" in str(e):
                print("  Rate limited, waiting 30s...")
                time.sleep(30)
            continue

        # Brief pause between requests
        if i < len(to_generate) - 1:
            time.sleep(1.5)

    print(f"\n{'='*60}")
    print(f"Done! Generated: {success_count}, Failed: {fail_count}")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
