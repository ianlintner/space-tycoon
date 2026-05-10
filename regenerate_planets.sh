#!/bin/bash
set -e

output_dir="/Users/ianlintner/Projects/spacebiz/public/portraits/planets"
mkdir -p "$output_dir"

base_style="clean modern game art style with pixel-art influences, high contrast teal and amber rim lighting, 2D game background, dark space background with stars, dramatic lighting, high quality"

declare -A prompts=(
    ["agricultural"]="A verduous agricultural planet from orbit, lush green continents, geometric farming plains, wispy white clouds, twin small moons in background, $base_style"
    ["coreWorld"]="An advanced, heavily populated core world from orbit, glowing city lights spreading across continents like veins of neon energy, orbital rings, bustling space traffic, $base_style"
    ["frontier"]="A rugged frontier planet from orbit, sparse settlements, vast dusty plains and rugged mountains, harsh untamed wilderness, atmospheric haze, pioneer spirit, $base_style"
    ["luxuryWorld"]="A stunning luxury resort planet from orbit, crystal clear azure oceans, bright pink bio-luminescent coral reefs, orbital leisure stations, pastel atmospheric glow, $base_style"
    ["manufacturing"]="An industrial manufacturing planet from orbit, planetary surface covered in mega-factories, glowing orange furnace light, thick smog clouds, orbital shipyards, $base_style"
    ["mining"]="A barren rocky mining planet from orbit, massive strip mines, deep craters, glowing magma seams, giant excavation platforms and orbital elevators, dusty atmosphere, $base_style"
    ["techWorld"]="A high-tech research and technology planet from orbit, surface dotted with glowing data grids and satellite arrays, strange energy phenomena in the atmosphere, futuristic, $base_style"
)

export AZURE_OPENAI_ENDPOINT="https://lintnerian-7181-resource.openai.azure.com/"
export AZURE_OPENAI_API_KEY="REDACTED_AZURE_KEY"

for type in "${!prompts[@]}"; do
    echo "Generating $type..."
    python3 ~/Projects/ai-pixel-art-image-generation/scripts/generate_image.py \
        --prompt "${prompts[$type]}" \
        --size 1024x1024 \
        --provider azure \
        --deployment gpt-image-2 \
        --output "$output_dir/planet-$type.png"
done
