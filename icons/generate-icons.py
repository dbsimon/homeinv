"""Generate PWA icon PNGs for Find My Item — v2 clean design."""
import math, os
from PIL import Image, ImageDraw

def draw_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size
    bg_r = round(s * 0.225)
    pad = round(s * 0.10) if maskable else 0
    inner = s - pad * 2

    # Blue rounded background
    draw.rounded_rectangle(
        [pad, pad, pad + inner, pad + inner],
        radius=bg_r, fill="#2563eb"
    )

    # --- Storage box (white, centered) ---
    box_w = round(s * 0.48)
    box_h = round(s * 0.42)
    box_x = pad + (inner - box_w) // 2
    box_y = pad + round(s * 0.225)
    box_r = round(s * 0.06)

    # Box body
    draw.rounded_rectangle(
        [box_x, box_y, box_x + box_w, box_y + box_h],
        radius=box_r, fill="#ffffff"
    )

    # Box lid (slightly elevated, same width, 40% of height)
    lid_h = round(box_h * 0.45)
    lid_gap = round(s * 0.02)
    lid_y = box_y - lid_h + lid_gap
    draw.rounded_rectangle(
        [box_x, lid_y, box_x + box_w, lid_y + lid_h],
        radius=box_r, fill="#ffffff"
    )
    # Cover bottom corners of lid so they don't peek
    draw.rectangle(
        [box_x + round(s * 0.02), lid_y + lid_h - box_r,
         box_x + box_w - round(s * 0.02), lid_y + lid_h],
        fill="#ffffff"
    )

    # Lid handle (small rounded pill on top of lid)
    handle_w = round(box_w * 0.25)
    handle_h = round(s * 0.025)
    handle_x = box_x + (box_w - handle_w) // 2
    handle_y = lid_y + round(lid_h * 0.25)
    draw.rounded_rectangle(
        [handle_x, handle_y, handle_x + handle_w, handle_y + handle_h],
        radius=handle_h // 2, fill=(37, 99, 235, 70)
    )

    # Gap shadow line between lid and body
    shadow_y = box_y + round(s * 0.014)
    draw.line(
        [box_x + box_r, shadow_y, box_x + box_w - box_r, shadow_y],
        fill=(37, 99, 235, 25), width=max(2, round(s * 0.008))
    )

    # --- Bold checkmark inside the box ---
    ck_w = round(box_w * 0.55)
    ck_h = round(box_h * 0.38)
    ck_x = box_x + (box_w - ck_w) // 2 + round(s * 0.01)
    ck_y = box_y + (box_h - ck_h) // 2 + round(s * 0.02)
    ck_lw = max(5, round(s * 0.04))

    # Checkmark path: short down-right stroke, then long up-right stroke
    # Points relative to ck_x, ck_y
    pts = [
        (ck_x, ck_y + ck_h * 0.55),
        (ck_x + ck_w * 0.35, ck_y + ck_h),
        (ck_x + ck_w, ck_y),
    ]
    draw.line(pts, fill="#2563eb", width=ck_lw, joint="curve")

    # --- Small magnifying glass in corner (search/find cue) ---
    mg_x = box_x + box_w - round(s * 0.11)
    mg_y = box_y + round(s * 0.07)
    mg_r = round(s * 0.048)
    mg_lw = max(3, round(s * 0.025))

    # Glass circle
    draw.ellipse(
        [mg_x - mg_r, mg_y - mg_r, mg_x + mg_r, mg_y + mg_r],
        outline="#2563eb", width=mg_lw
    )
    # Handle (45-degree line)
    import math
    angle = -math.pi / 4
    hx1 = mg_x + mg_r * 0.85 * math.cos(angle)
    hy1 = mg_y + mg_r * 0.85 * math.sin(angle)
    hx2 = mg_x + (mg_r + round(s * 0.055)) * 0.85 * math.cos(angle)
    hy2 = mg_y + (mg_r + round(s * 0.055)) * 0.85 * math.sin(angle)
    draw.line([(hx1, hy1), (hx2, hy2)], fill="#2563eb", width=mg_lw)

    return img

icons_dir = os.path.dirname(os.path.abspath(__file__))
specs = [
    (180, False, "apple-touch-icon.png"),
    (192, False, "icon-192.png"),
    (512, False, "icon-512.png"),
    (512, True,  "icon-512-maskable.png"),
]

for sz, mk, fname in specs:
    img = draw_icon(sz, mk)
    path = os.path.join(icons_dir, fname)
    img.save(path, "PNG")
    print(f"Saved: {fname} ({sz}x{sz}{' maskable' if mk else ''})")

print("Done.")
