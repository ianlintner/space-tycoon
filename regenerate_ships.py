import os
import subprocess

output_dir = "/Users/ianlintner/Projects/spacebiz/public/ships/portraits"
os.makedirs(output_dir, exist_ok=True)

base_style = "clean modern game art style with pixel-art influences, high contrast teal and amber rim lighting, dark space background, detailed 2D spaceship design"

prompts = {
    "armoredFreighter": f"A heavily armored space freighter, thick metal plating, industrial aesthetic, glowing thrusters, bulky and defensible, {base_style}",
    "bulkFreighter": f"A massive bulk freighter spaceship, modular cargo containers attached to a central spine, slow and heavy, industrial, {base_style}",
    "cargoShuttle": f"A small utilitarian cargo shuttle, boxy design, bright yellow and grey hazard stripes, short range transport, {base_style}",
    "colonyShip": f"An enormous generational colony ship, rotating habitat rings, smooth white hull, glowing blue biosphere domes, {base_style}",
    "diplomaticYacht": f"A sleek diplomatic space yacht, polished chrome and gold trim, aerodynamic elegant design, glowing engines, {base_style}",
    "fastCourier": f"A nimble and extremely fast courier spaceship, dart-like angular shape, large glowing engine exhaust, stealthy dark grey and red, {base_style}",
    "luxuryLiner": f"A massive luxury passenger star-liner, elegant flowing lines, observation decks with glowing warm lights, premium cruise ship in space, {base_style}",
    "megaHauler": f"An ultra-massive interstellar mega-hauler, colossal structural beams towing thousands of crates, immense scale, heavy industrial, {base_style}",
    "mixedHauler": f"A versatile mixed hauler ship, asymmetrical design, various attachments for liquid and solid cargo, rugged workhorse, {base_style}",
    "passengerShuttle": f"A commercial passenger space shuttle, aerodynamic wings, row of lit passenger windows, sleek and functional, {base_style}",
    "refrigeratedHauler": f"A specialized refrigerated space hauler, glowing blue coolant tanks, frosted white hull plating, specialized cargo holds, {base_style}",
    "starLiner": f"A modern commercial star-liner, multi-deck structure, bright glowing neon trims, corporate passenger transport, {base_style}",
    "tug": f"A chunky, high-powered space tug ship, massive front clamps and tractor beam emitters, disproportionately large engines, industrial yellow, {base_style}"
}

env = os.environ.copy()
env["AZURE_OPENAI_ENDPOINT"] = "https://lintnerian-7181-resource.openai.azure.com/"
env["AZURE_OPENAI_API_KEY"] = "REDACTED_AZURE_KEY"

for p_type, prompt in prompts.items():
    print(f"Generating {p_type}...")
    output_path = os.path.join(output_dir, f"{p_type}.png")
    cmd = [
        "python3", os.path.expanduser("~/Projects/ai-pixel-art-image-generation/scripts/generate_image.py"),
        "--prompt", prompt,
        "--size", "1024x1024",
        "--provider", "azure",
        "--deployment", "gpt-image-2",
        "--output", output_path
    ]
    subprocess.run(cmd, env=env, check=True)

print("Done generating ships.")
