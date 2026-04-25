#!/usr/bin/env python3
"""Generate a 512x512 PNG icon for Bizarre OS Restaurant Edition."""
import struct, zlib, sys, os

def png_chunk(tag, data):
    c = struct.pack('>I', len(data)) + tag + data
    return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

def make_png(size=512):
    # Colors: warm gold background, dark text/shape
    BG   = (201, 169,  97)   # gold
    DARK = ( 74,  60,  31)   # dark brown
    WHITE= (255, 255, 255)

    pixels = []
    cx, cy = size // 2, size // 2
    r_outer = int(size * 0.44)
    r_inner = int(size * 0.32)

    for y in range(size):
        row = []
        for x in range(size):
            dx, dy = x - cx, y - cy
            d = (dx*dx + dy*dy) ** 0.5
            # Outer circle filled dark
            if d <= r_outer:
                if d <= r_inner:
                    # Inner: white "B" approximated as a filled lighter area
                    row.extend(WHITE)
                else:
                    row.extend(DARK)
            else:
                row.extend(BG)
        pixels.append(bytes(row))

    # Draw a simple "B" letter in the inner circle using dark pixels
    # We'll re-render with a crude bitmap B
    font_b = [
        "11110000",
        "10001000",
        "10001000",
        "11110000",
        "10001000",
        "10001000",
        "11110000",
        "00000000",
    ]

    cell = int(size * 0.04)
    letter_w = 8 * cell
    letter_h = 8 * cell
    ox = cx - letter_w // 2 + cell
    oy = cy - letter_h // 2

    pixel_grid = []
    for y in range(size):
        row = []
        for x in range(size):
            dx, dy = x - cx, y - cy
            d = (dx*dx + dy*dy) ** 0.5
            if d > r_outer:
                row.extend(BG)
            elif d > r_inner:
                row.extend(DARK)
            else:
                # Check if in letter B
                lx = x - ox
                ly = y - oy
                fi = ly // cell
                fj = lx // cell
                in_b = (0 <= fi < 8 and 0 <= fj < 8 and font_b[fi][fj] == '1')
                row.extend(DARK if in_b else WHITE)
        pixel_grid.append(bytes(row))

    # Build PNG
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    raw = b''
    for row in pixel_grid:
        raw += b'\x00' + row
    compressed = zlib.compress(raw, 9)

    data = (
        b'\x89PNG\r\n\x1a\n'
        + png_chunk(b'IHDR', ihdr)
        + png_chunk(b'IDAT', compressed)
        + png_chunk(b'IEND', b'')
    )
    return data

out = os.path.join(os.path.dirname(__file__), '..', 'desktop', 'assets', 'icon.png')
with open(out, 'wb') as f:
    f.write(make_png(512))
print(f"Icon written to {os.path.abspath(out)}")
