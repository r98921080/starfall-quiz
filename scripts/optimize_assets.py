import os
from PIL import Image

ASSETS_DIR = 'assets'

def optimize_assets():
    total_before = 0
    total_after = 0
    count = 0

    for root, dirs, files in os.walk(ASSETS_DIR):
        for fname in files:
            fpath = os.path.join(root, fname)
            ext = os.path.splitext(fname)[1].lower()
            if ext not in ['.png', '.jpg', '.jpeg']:
                continue

            size_before = os.path.getsize(fpath)
            total_before += size_before

            try:
                with Image.open(fpath) as img:
                    w, h = img.size
                    rel_dir = os.path.relpath(root, ASSETS_DIR).replace('\\', '/')

                    # Determine target max dimension based on category
                    if rel_dir == 'player':
                        max_dim = 320
                    elif rel_dir == 'enemies':
                        max_dim = 256
                    elif rel_dir == 'bosses':
                        max_dim = 480
                    elif rel_dir in ['minions', 'fx']:
                        max_dim = 256
                    elif rel_dir == 'icons/weapons':
                        max_dim = 160
                    elif rel_dir == 'icons':
                        max_dim = 512
                    elif rel_dir == 'backgrounds':
                        max_dim = 1024
                    else:
                        max_dim = 512

                    # Calculate new size preserving aspect ratio
                    if max(w, h) > max_dim:
                        scale = max_dim / float(max(w, h))
                        new_w = max(1, int(round(w * scale)))
                        new_h = max(1, int(round(h * scale)))
                        img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    else:
                        img_resized = img.copy()

                    if ext == '.png':
                        # Ensure real PNG format (fixes weapon_17..25 which were JPEGs with .png extension)
                        if img_resized.mode not in ('RGBA', 'RGB', 'P'):
                            img_resized = img_resized.convert('RGBA')
                        # Use adaptive palette quantization (256 colors with alpha) if file is still large, or save optimized RGBA
                        # Let's quantize RGBA to 256 colors with fastoctree/libimagequant or save optimized RGBA
                        # Actually, quantizing RGBA in Pillow with method=Image.Quantize.FASTOCTREE shrinks PNGs by 70% with virtually zero visual loss!
                        if img_resized.mode == 'RGBA':
                            quantized = img_resized.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
                            quantized.save(fpath, format='PNG', optimize=True)
                        else:
                            img_resized = img_resized.convert('RGB').quantize(colors=256)
                            img_resized.save(fpath, format='PNG', optimize=True)
                    else:
                        # JPEG
                        if img_resized.mode != 'RGB':
                            img_resized = img_resized.convert('RGB')
                        img_resized.save(fpath, format='JPEG', quality=82, optimize=True)

                size_after = os.path.getsize(fpath)
                total_after += size_after
                count += 1
                print(f"[{rel_dir}/{fname}] {w}x{h} ({size_before//1024}KB) -> {img_resized.size[0]}x{img_resized.size[1]} ({size_after//1024}KB)")
            except Exception as e:
                print(f"ERROR processing {fpath}: {e}")
                total_after += size_before

    print(f"\nProcessed {count} images.")
    print(f"Total before: {total_before / (1024*1024):.2f} MB")
    print(f"Total after : {total_after / (1024*1024):.2f} MB")

if __name__ == '__main__':
    optimize_assets()
