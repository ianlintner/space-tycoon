#!/usr/bin/env python3
"""
Generate GNN newscaster character portrait images via MCP image-gen server.
Produces 5 distinct newscaster characters for the Galactic News Network:
anchor, science correspondent, finance analyst, fashion correspondent, field reporter.
"""

import json
import os
import select
import subprocess
import sys
import time
from pathlib import Path

OUTPUT_DIR = Path("/Users/ianlintner/Projects/spacebiz/assets-source/portraits/newscaster")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Shared style suffix for all newscaster prompts
STYLE_BASE = (
    "Bust portrait, 3/4 view composition, dark deep-space backdrop with subtle nebula gradient, "
    "clean modern game art style with pixel-art influences, high contrast rim lighting, "
    "professional news broadcast aesthetic. No text. PNG with transparent background."
)

# 5 distinct newscaster characters
NEWSCASTERS = {
    "anchor": {
        "desc": (
            "Stellara Vex, lead news anchor alien for the Galactic News Network. "
            "Humanoid alien with smooth cobalt-blue iridescent skin, slightly elongated graceful head, "
            "large almond-shaped silver eyes with a subtle bioluminescent glow. "
            "Wearing a crisp navy double-breasted suit with a white collar and gold GNN lapel pin. "
            "Professional, authoritative expression. Silver-white swept hair. "
            "Holographic earpiece glowing faint blue. Studio spotlight rim lighting, cool blue tones. "
        ),
        "filename": "anchor.png",
    },
    "science": {
        "desc": (
            "Dr. Krill Vexx, science and technology correspondent for GNN. "
            "Small classic grey alien with a large smooth grey head, huge glossy black almond eyes, "
            "tiny slit nostrils, thin lips curved in an intellectually curious expression. "
            "Wearing a white lab coat over a turtleneck, small circular wire-rimmed spectacles, "
            "a datapad hologram flickering in the background. Excited/curious expression. "
            "Cool teal-green science-desk rim lighting. "
        ),
        "filename": "science.png",
    },
    "finance": {
        "desc": (
            "Sterling Hawkes, markets analyst for GNN. "
            "Exotic bird alien: vibrant tropical plumage in electric blues and golds, "
            "sleek swept-back feather-crest, sharp intelligent eyes, a confident cocky grin. "
            "Wearing a pinstriped power suit with red suspenders and pocket square, "
            "a gold credit-chip tie clip, 80s Wall Street energy. "
            "Holding a holographic stock chart in one hand. Warm amber-gold rim lighting. "
        ),
        "filename": "finance.png",
    },
    "fashion": {
        "desc": (
            "CHIC-9, style and culture correspondent for GNN. "
            "Sleek chrome humanoid robot with an elegant elongated frame, "
            "large compound optical sensors arranged like dramatic eye makeup, "
            "visible articulated joints with couture-style plating, "
            "a holographic fascinator hat projecting from the head unit. "
            "Wearing an impossibly chic structured jacket with chrome details. "
            "Dramatic pose, chin slightly raised, neon-pink and violet studio lighting. "
        ),
        "filename": "fashion.png",
    },
    "field": {
        "desc": (
            "Grix Vander, field reporter for GNN. "
            "Rugged bipedal lizard alien with green-grey scales, bright amber slit-pupil eyes, "
            "athletic build, slightly wind-blown head frills. "
            "Wearing a worn tactical field vest with GNN logo patches, a pressed collar shirt. "
            "Holding a sleek directional microphone with a GNN flag. "
            "Outdoor colony backdrop with dust and dramatic sky. Warm orange-amber rim lighting. "
            "Slightly disheveled but focused and professional expression. "
        ),
        "filename": "field.png",
    },
}

server_cmd = [
    "/bin/zsh",
    "-lc",
    "exec /Users/ianlintner/Projects/spacebiz/.mcp/image-gen-mcp/start-mcp.sh",
]


def start_server():
    return subprocess.Popen(
        server_cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )


def send(proc, msg):
    body = json.dumps(msg).encode("utf-8")
    header = f"Content-Length: {len(body)}\r\n\r\n".encode("ascii")
    proc.stdin.write(header + body)
    proc.stdin.flush()


def read_exact(proc, n, timeout=120):
    buf = b""
    end = time.time() + timeout
    fd = proc.stdout.fileno()
    while len(buf) < n and time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.5)
        if not r:
            continue
        chunk = os.read(fd, n - len(buf))
        if not chunk:
            break
        buf += chunk
    return buf


def recv(proc, timeout=120):
    end = time.time() + timeout
    data = b""
    fd = proc.stdout.fileno()

    while b"\r\n\r\n" not in data and time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.5)
        if not r:
            continue
        chunk = os.read(fd, 1)
        if not chunk:
            break
        data += chunk

    if b"\r\n\r\n" not in data:
        return None

    header_bytes, rest = data.split(b"\r\n\r\n", 1)
    headers = {}
    for line in header_bytes.decode("ascii", "replace").split("\r\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()

    if "content-length" not in headers:
        return None

    n = int(headers["content-length"])
    body = rest
    if len(body) < n:
        body += read_exact(proc, n - len(body), timeout=timeout)

    if len(body) < n:
        return None

    return json.loads(body[:n].decode("utf-8", "replace"))


def generate_portrait(proc, character_key, character_info, req_id):
    prompt = f"{character_info['desc']} {STYLE_BASE}"
    out_path = OUTPUT_DIR / character_info["filename"]

    print(f"\n{'='*60}")
    print(f"Generating: {character_key} → {out_path.name}")
    print(f"{'='*60}")

    send(
        proc,
        {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/call",
            "params": {
                "name": "generate_image",
                "arguments": {
                    "prompt": prompt,
                    "size": "1024x1024",
                    "quality": "high",
                    "style": "vivid",
                    "output_format": "png",
                    "background": "transparent",
                },
            },
        },
    )

    gen_resp = recv(proc, timeout=180)
    if not gen_resp or "result" not in gen_resp:
        print(f"  ✗ Failed to generate {character_key}")
        return False

    # Extract image URL from response
    payload = None
    content = gen_resp.get("result", {}).get("content")
    if isinstance(content, list) and content:
        text_items = [
            c.get("text")
            for c in content
            if isinstance(c, dict) and c.get("type") == "text"
        ]
        if text_items:
            try:
                payload = json.loads(text_items[0])
            except Exception:
                payload = {"raw_text": text_items[0]}

    if payload is None:
        payload = gen_resp.get("result", {})

    image_url = payload.get("image_url") if isinstance(payload, dict) else None

    if image_url and image_url.startswith("file://"):
        src = Path(image_url.replace("file://", ""))
        if src.exists():
            out_path.write_bytes(src.read_bytes())
            print(f"  ✓ Saved: {out_path}")
            return True
        else:
            print(f"  ✗ File URL not found: {src}")
            return False
    else:
        print(f"  ✗ No file URL returned for {character_key}")
        print(f"    Payload: {json.dumps(payload, indent=2)[:500]}")
        return False


def main():
    print("Starting MCP image-gen server...")
    proc = start_server()

    results = {}

    try:
        # Initialize
        send(
            proc,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {"name": "newscaster-portrait-gen", "version": "1.0.0"},
                },
            },
        )
        init_resp = recv(proc, timeout=20)
        if not init_resp or "result" not in init_resp:
            print("✗ Failed to initialize MCP server")
            sys.exit(1)
        print("✓ MCP server initialized")

        send(proc, {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

        # Generate each newscaster portrait
        req_id = 10
        for character_key, character_info in NEWSCASTERS.items():
            ok = generate_portrait(proc, character_key, character_info, req_id)
            results[character_key] = ok
            req_id += 1

    except Exception as e:
        print(f"Error: {e}")
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

    # Summary
    print(f"\n{'='*60}")
    print("GENERATION SUMMARY")
    print(f"{'='*60}")
    for character_key, ok in results.items():
        status = "✓" if ok else "✗"
        print(f"  {status} {character_key}: {NEWSCASTERS[character_key]['filename']}")

    generated = [f for f in OUTPUT_DIR.iterdir() if f.suffix == ".png"]
    print(f"\nTotal files in {OUTPUT_DIR}: {len(generated)}")

    return all(results.values())


if __name__ == "__main__":
    ok = main()
    sys.exit(0 if ok else 1)
