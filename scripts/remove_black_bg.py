import os
import math
from PIL import Image, ImageDraw, ImageFilter

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
minions_dir = os.path.join(base_dir, "assets", "minions")
fx_dir = os.path.join(base_dir, "assets", "fx")

def clean_black_background(img_path, out_path=None, threshold=28, edge_feather=2):
    """
    Flood-fills from the corners and borders to remove outer black background,
    while preserving dark details inside the sprite itself.
    """
    if out_path is None:
        out_path = img_path

    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    gray = img.convert("L")
    gray_pix = gray.load()

    # Step 1: Create a binary mask where True = dark pixel (luminance < threshold)
    # Use flood fill from all 4 borders
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)

    # We will do BFS flood fill from the borders for any connected dark pixel (< threshold)
    visited = bytearray(w * h)
    queue = []

    def get_lum(x, y):
        return gray_pix[x, y]

    # Seed all border pixels that are dark
    for x in range(w):
        if get_lum(x, 0) <= threshold:
            queue.append((x, 0))
            visited[0 * w + x] = 1
        if get_lum(x, h - 1) <= threshold:
            queue.append((x, h - 1))
            visited[(h - 1) * w + x] = 1

    for y in range(h):
        if get_lum(0, y) <= threshold and not visited[y * w + 0]:
            queue.append((0, y))
            visited[y * w + 0] = 1
        if get_lum(w - 1, y) <= threshold and not visited[y * w + (w - 1)]:
            queue.append((w - 1, y))
            visited[y * w + (w - 1)] = 1

    # BFS
    head = 0
    while head < len(queue):
        cx, cy = queue[head]
        head += 1

        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    if get_lum(nx, ny) <= threshold:
                        visited[idx] = 1
                        queue.append((nx, ny))

    # visited contains 1 for all exterior background pixels!
    # Convert visited to alpha channel: background = 0, sprite = 255
    alpha = Image.new("L", (w, h), 255)
    alpha_pix = alpha.load()
    for y in range(h):
        for x in range(w):
            if visited[y * w + x]:
                alpha_pix[x, y] = 0

    # Soften alpha edges to avoid jagged edges
    if edge_feather > 0:
        # Slight box blur on alpha for smooth transition
        alpha_blurred = alpha.filter(ImageFilter.GaussianBlur(radius=1.2))
        # Where original was 0 and lum is low, keep 0
        img.putalpha(alpha_blurred)
    else:
        img.putalpha(alpha)

    img.save(out_path, "PNG")
    print(f"[CLEANED] {os.path.basename(out_path)} - Size: {img.size}")

def make_lightning_vertical(img_path, out_path=None):
    """
    Rotates fx_lightning by -44 degrees so that the lightning runs vertically,
    cleans the background, and saves as transparent PNG.
    """
    if out_path is None:
        out_path = img_path

    img = Image.open(img_path).convert("RGBA")
    # Rotate by -44 degrees to make the diagonal bolt vertical
    # expand=True to keep entire bolt
    rotated = img.rotate(-44, expand=True, resample=Image.BICUBIC)
    
    # Now clean black background using flood fill
    w, h = rotated.size
    gray = rotated.convert("L")
    gray_pix = gray.load()

    visited = bytearray(w * h)
    queue = []
    threshold = 30

    for x in range(w):
        if gray_pix[x, 0] <= threshold:
            queue.append((x, 0))
            visited[0 * w + x] = 1
        if gray_pix[x, h - 1] <= threshold:
            queue.append((x, h - 1))
            visited[(h - 1) * w + x] = 1

    for y in range(h):
        if gray_pix[0, y] <= threshold and not visited[y * w + 0]:
            queue.append((0, y))
            visited[y * w + 0] = 1
        if gray_pix[w - 1, y] <= threshold and not visited[y * w + (w - 1)]:
            queue.append((w - 1, y))
            visited[y * w + (w - 1)] = 1

    head = 0
    while head < len(queue):
        cx, cy = queue[head]
        head += 1
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    if gray_pix[nx, ny] <= threshold:
                        visited[idx] = 1
                        queue.append((nx, ny))

    alpha = Image.new("L", (w, h), 255)
    alpha_pix = alpha.load()
    for y in range(h):
        for x in range(w):
            if visited[y * w + x]:
                # Also fade very dark near-background pixels
                lum = gray_pix[x, y]
                alpha_pix[x, y] = 0
            else:
                lum = gray_pix[x, y]
                if lum < 50:
                    alpha_pix[x, y] = int((lum / 50.0) * 255)

    alpha_blurred = alpha.filter(ImageFilter.GaussianBlur(radius=1.0))
    rotated.putalpha(alpha_blurred)

    # Crop to non-transparent bbox
    bbox = rotated.getbbox()
    if bbox:
        rotated = rotated.crop(bbox)

    rotated.save(out_path, "PNG")
    print(f"[VERTICAL LIGHTNING] Saved {os.path.basename(out_path)} - Size: {rotated.size}")

if __name__ == "__main__":
    print("=== Processing Boss Minions Sprite Images (Removing Black BG) ===")
    minion_files = [
        "minion_ambrosia_flask.png",
        "minion_hydra_head.png",
        "minion_thunder_drum.png",
        "minion_taotie_meat.png",
        "minion_gorgon_shadow.png",
        "minion_titan_pillar.png",
        "minion_garuda_viper.png"
    ]
    for mf in minion_files:
        p = os.path.join(minions_dir, mf)
        if os.path.exists(p):
            clean_black_background(p, threshold=32)

    print("\n=== Processing Boss FX & Burst Shards (Removing Black BG) ===")
    fx_files = [
        "fx_rock_shard.png",
        "fx_cluster_bomb.png",
        "fx_feather_shard.png"
    ]
    for ff in fx_files:
        p = os.path.join(fx_dir, ff)
        if os.path.exists(p):
            clean_black_background(p, threshold=32)

    print("\n=== Orienting Lightning Bolt Vertically (縱向) ===")
    lightning_path = os.path.join(fx_dir, "fx_lightning.png")
    if os.path.exists(lightning_path):
        make_lightning_vertical(lightning_path)

    print("\n=== All Image Processing Completed! ===")
