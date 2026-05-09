import os
import subprocess

output_dir = "/Users/ianlintner/Projects/spacebiz/public/portraits/rooms"
os.makedirs(output_dir, exist_ok=True)

base_style = "clean modern game art style with pixel-art influences, high contrast teal and amber rim lighting, detailed, isometric or atmospheric perspective, 2D game background, high quality"

prompts = {
    "advancedTerminal": f"A highly advanced space station terminal room, sleek white and chrome surfaces, glowing holographic data screens, high-tech seating, busy but clean, {base_style}",
    "cargoWarehouse": f"A massive cargo warehouse on a space station, stacked high with glowing crates and shipping containers, robotic forklifts, industrial shelving, amber warning lights, {base_style}",
    "customsBureau": f"A strict customs bureau checkpoint on a space station, security scanners, glass booths, neon signage, orderly lines, sterile environment, {base_style}",
    "foodTerminal": f"A vibrant food terminal and cafeteria on a space station, neon food signs, hydroponic plants, dining tables, diverse futuristic vending machines, busy atmosphere, {base_style}",
    "fuelDepot": f"An industrial fuel depot, massive glowing fuel tanks, thick reinforced pipes pumping volatile liquids, green and amber hazard lights, heavy machinery, {base_style}",
    "hazmatTerminal": f"A hazardous materials terminal, reinforced containment units, warning symbols, decontamination showers, heavy metal doors, green glowing toxic materials, {base_style}",
    "improvedTerminal": f"An improved commercial terminal, comfortable seating, large panoramic windows looking out at space, holographic flight schedules, clean metallic design, {base_style}",
    "luxuryTerminal": f"A high-end luxury terminal, velvet seating, gold accents, dim atmospheric lighting, VIP lounges, grand panoramic windows with a view of a nebula, elegant, {base_style}",
    "marketExchange": f"A bustling market exchange room, chaotic trading boards with glowing numbers, merchants haggling, dense stalls stacked with exotic alien goods, vibrant, {base_style}",
    "medicalTerminal": f"A sterile medical terminal, glowing blue regeneration pods, clean white walls, robotic surgical arms, holographic vitals monitors, calming atmosphere, {base_style}",
    "oreProcessing": f"A gritty ore processing room, molten rock flowing through heavy industrial machinery, thick metal crushers, orange sparks flying, dark and industrial, {base_style}",
    "passengerLounge": f"A comfortable passenger lounge on a space station, curved seating, potted alien plants, boarding gates, soft lighting, calm and inviting, {base_style}",
    "repairBay": f"A busy ship repair bay, welding torches sparking, scattered tools, heavy robotic arms, spaceship parts, greasy floors, structural scaffolds, {base_style}",
    "researchLab": f"A high-tech sci-fi science lab on a space station, advanced research equipment, holographic displays showing DNA sequences and star maps, clean laboratory tables, {base_style}",
    "securityOffice": f"A high-security space station office, reinforced armor plating, multiple surveillance screens showing camera feeds, weapon racks, stern and intimidating, {base_style}",
    "simpleTerminal": f"A basic bare-bones space station terminal, hard metal benches, worn out floor plating, flickering neon signs, a bit gritty but functional, {base_style}",
    "techTerminal": f"A cutting edge computing terminal, massive server banks with blinking lights, data cables running across the ceiling, hacker atmosphere, cool blue and cyan lighting, {base_style}",
    "tradeOffice": f"A sleek corporate trade office, dark polished desks, 3D holographic galaxy maps displaying trade routes, sharp business aesthetic, panoramic window, {base_style}"
}

env = os.environ.copy()
env["AZURE_OPENAI_ENDPOINT"] = "https://lintnerian-7181-resource.openai.azure.com/"
env["AZURE_OPENAI_API_KEY"] = "REDACTED_AZURE_KEY"

for p_type, prompt in prompts.items():
    print(f"Generating {p_type}...")
    output_path = os.path.join(output_dir, f"room-{p_type}.png")
    cmd = [
        "python3", os.path.expanduser("~/Projects/ai-pixel-art-image-generation/scripts/generate_image.py"),
        "--prompt", prompt,
        "--size", "1024x1024",
        "--provider", "azure",
        "--deployment", "gpt-image-2",
        "--output", output_path
    ]
    subprocess.run(cmd, env=env, check=True)

print("Done generating rooms.")
