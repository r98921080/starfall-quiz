import os
from PIL import Image, ImageFilter

def clean_sprite_bg(img_path, threshold=52, edge_feather=1.5):
    """
    Flood-fills from the borders using color distance from the corner background color
    to remove outer dark/black background, while preserving dark details inside the sprite itself.
    """
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    pix = img.load()

    # Get sample corner colors to determine background reference
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    bg_r = sum(pix[cx, cy][0] for cx, cy in corners) / len(corners)
    bg_g = sum(pix[cx, cy][1] for cx, cy in corners) / len(corners)
    bg_b = sum(pix[cx, cy][2] for cx, cy in corners) / len(corners)

    def color_dist(x, y):
        r, g, b, _ = pix[x, y]
        return ((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2) ** 0.5

    # BFS from all 4 borders
    visited = bytearray(w * h)
    queue = []

    # Border seeds
    for x in range(w):
        for y in (0, h - 1):
            if color_dist(x, y) <= threshold and not visited[y * w + x]:
                visited[y * w + x] = 1
                queue.append((x, y))

    for y in range(h):
        for x in (0, w - 1):
            if color_dist(x, y) <= threshold and not visited[y * w + x]:
                visited[y * w + x] = 1
                queue.append((x, y))

    head = 0
    while head < len(queue):
        cx, cy = queue[head]
        head += 1

        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    if color_dist(nx, ny) <= threshold:
                        visited[idx] = 1
                        queue.append((nx, ny))

    # Convert visited to alpha channel (0 = background, 255 = sprite)
    alpha = Image.new("L", (w, h), 255)
    alpha_pix = alpha.load()
    for y in range(h):
        for x in range(w):
            if visited[y * w + x]:
                alpha_pix[x, y] = 0

    if edge_feather > 0:
        alpha_blurred = alpha.filter(ImageFilter.GaussianBlur(radius=edge_feather))
        img.putalpha(alpha_blurred)
    else:
        img.putalpha(alpha)

    img.save(img_path, "PNG")
    print(f"[CLEANED] {os.path.basename(img_path)} -> Corner pixel: {img.getpixel((0,0))}")

if __name__ == "__main__":
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    boss_dir = os.path.join(base, "assets", "bosses")
    targets = [
        "boss_1_bowser.png",
        "boss_mini_zelda.png",
        "boss_2_ganon.png"
    ]
    for filename in targets:
        p = os.path.join(boss_dir, filename)
        if os.path.exists(p):
            clean_sprite_bg(p, threshold=55, edge_feather=1.2)
        else:
            print(f"[MISSING] Not found: {p}")
