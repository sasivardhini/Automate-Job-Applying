#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

# Create icons in different sizes
sizes = [16, 48, 128]
bg_color = (0, 115, 177)  # LinkedIn blue
emoji = "🤖"

for size in sizes:
    # Create image
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Save
    img.save(f'icon{size}.png')
    print(f"Created icon{size}.png")

print("Icons created successfully!")
