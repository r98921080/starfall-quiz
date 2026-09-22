import os
import glob
from PIL import Image, ImageFilter, ImageEnhance

brain_dir = r"C:\Users\何任軒\.gemini\antigravity\brain\0aebb052-5a91-4cfe-8c2a-504992895c22"
scratch_dir = r"C:\Users\何任軒\.gemini\antigravity\scratch\starfall-quiz"
fx_dir = os.path.join(scratch_dir, "assets", "fx")
bg_dir = os.path.join(scratch_dir, "assets", "backgrounds")
enemy_dir = os.path.join(scratch_dir, "assets", "enemies")

os.makedirs(fx_dir, exist_ok=True)
os.makedirs(bg_dir, exist_ok=True)
os.makedirs(enemy_dir, exist_ok=True)

def find_latest_img(pattern):
    matches = glob.glob(os.path.join(brain_dir, pattern))
    if not matches:
        raise FileNotFoundError(f"No match for pattern: {pattern}")
    matches.sort(key=os.path.getmtime, reverse=True)
    return matches[0]

def black_to_alpha(img_path, out_path, threshold=20):
    """Converts a glowing effect on black background to transparent PNG with smooth alpha."""
    img = Image.open(img_path).convert("RGBA")
    r, g, b, _ = img.split()
    # Compute max(r, g, b)
    # Using grayscale luminance or max
    gray = img.convert("L")
    # Transform gray to alpha: if < threshold -> 0, else ramp up to 255
    alpha = gray.point(lambda p: 0 if p < threshold else min(255, int(((p - threshold) / (255 - threshold)) ** 0.85 * 255)))
    img.putalpha(alpha)
    img.save(out_path, "PNG")
    print(f"Saved: {out_path} ({img.size})")

def white_to_alpha(img_path, out_path, threshold=215):
    """Removes white/light background from sprite."""
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()
    new_data = []
    for item in datas:
        # item is (r, g, b, a)
        r, g, b = item[0], item[1], item[2]
        # if almost white/light gray
        if r > threshold and g > threshold and b > threshold and abs(r - g) < 20 and abs(g - b) < 20:
            new_data.append((r, g, b, 0))
        elif r > threshold - 30 and g > threshold - 30 and b > threshold - 30 and abs(r - g) < 20 and abs(g - b) < 20:
            # edge fade
            fade = int(255 * (1.0 - (min(r, g, b) - (threshold - 30)) / 30.0))
            new_data.append((r, g, b, max(0, min(255, fade))))
        else:
            new_data.append(item)
    img.putdata(new_data)
    img.save(out_path, "PNG")
    print(f"Saved: {out_path} ({img.size})")

print("Processing FX images...")
black_to_alpha(find_latest_img("fx_lightning_bolt*.jpg"), os.path.join(fx_dir, "fx_lightning.png"), threshold=15)
black_to_alpha(find_latest_img("fx_fire_meteor*.jpg"), os.path.join(fx_dir, "fx_fire_meteor.png"), threshold=18)
black_to_alpha(find_latest_img("fx_glacial_crystal*.jpg"), os.path.join(fx_dir, "fx_glacial_crystal.png"), threshold=15)
black_to_alpha(find_latest_img("fx_golden_feather*.jpg"), os.path.join(fx_dir, "fx_golden_feather.png"), threshold=18)
black_to_alpha(find_latest_img("fx_void_blackhole*.jpg"), os.path.join(fx_dir, "fx_void_blackhole.png"), threshold=15)
black_to_alpha(find_latest_img("fx_holy_spear*.jpg"), os.path.join(fx_dir, "fx_holy_spear.png"), threshold=15)
white_to_alpha(find_latest_img("fx_toxic_acid_orb*.jpg"), os.path.join(fx_dir, "fx_toxic_acid_orb.png"), threshold=220)

print("Processing Enemies...")
black_to_alpha(find_latest_img("enemy_charger*.jpg"), os.path.join(enemy_dir, "enemy_charger.png"), threshold=25)
white_to_alpha(find_latest_img("enemy_bomber*.jpg"), os.path.join(enemy_dir, "enemy_bomber.png"), threshold=210)

print("Processing Backgrounds...")
# Stage 1: User's media_1790002114529.jpg
user_bg1 = os.path.join(brain_dir, ".user_uploaded", "media_1790002114529.jpg")
img1 = Image.open(user_bg1)
img1.save(os.path.join(bg_dir, "bg_stage_1.jpg"), quality=92)
print("Saved bg_stage_1.jpg")

# Stage 2 to 5: AI generated 9:16 images
for stg_num, pattern in [
    (2, "bg_stage_2_thunder*.jpg"),
    (3, "bg_stage_3_medusa*.jpg"),
    (4, "bg_stage_4_taotie*.jpg"),
    (5, "bg_stage_5_atlas*.jpg"),
]:
    f = find_latest_img(pattern)
    im = Image.open(f)
    im.save(os.path.join(bg_dir, f"bg_stage_{stg_num}.jpg"), quality=92)
    print(f"Saved bg_stage_{stg_num}.jpg")

# Process collage media_1790002101750.jpg for stages 6 to 10
user_collage = os.path.join(brain_dir, ".user_uploaded", "media_1790002101750.jpg")
col = Image.open(user_collage)

# Quad 1: Top-Left (0, 0, 512, 512) -> Golden Celestial Palace
q_top_left = col.crop((0, 0, 512, 512))
# Quad 2: Top-Right (512, 0, 1024, 512) -> Thunder night
q_top_right = col.crop((512, 0, 1024, 512))
# Quad 3: Bottom-Left (0, 512, 512, 1024) -> Crimson Sunset Lava
q_bot_left = col.crop((0, 512, 512, 1024))
# Quad 4: Bottom-Right (512, 512, 1024, 1024) -> Deep Cosmic Dragon Skeleton
q_bot_right = col.crop((512, 512, 1024, 1024))

def make_9_16(crop_img, tint=None):
    """Extends a 512x512 quadrant image into a 576x1024 vertical 9:16 background."""
    w_crop, h_crop = crop_img.size
    # We want 576x1024
    # Resize crop to fill width
    target_w, target_h = 576, 1024
    scaled = crop_img.resize((target_w, int(h_crop * (target_w / w_crop))), Image.Resampling.LANCZOS)
    new_h = scaled.size[1]
    
    bg = Image.new("RGB", (target_w, target_h), (10, 15, 30))
    y_offset = (target_h - new_h) // 2
    bg.paste(scaled, (0, y_offset))
    
    if y_offset > 0:
        top_slice = scaled.crop((0, 0, target_w, min(new_h, y_offset))).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(10))
        bot_slice = scaled.crop((0, max(0, new_h - (target_h - (y_offset + new_h))), target_w, new_h)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(10))
        bg.paste(top_slice, (0, 0))
        bg.paste(bot_slice, (0, y_offset + new_h))
    
    if tint == "emerald": # Stage 7 Hydra
        r, g, b = bg.split()
        r = r.point(lambda p: int(p * 0.35))
        g = g.point(lambda p: min(255, int(p * 1.35 + 25)))
        b = b.point(lambda p: int(p * 0.85))
        bg = Image.merge("RGB", (r, g, b))
    elif tint == "volcanic": # Stage 8 Cyclops
        r, g, b = bg.split()
        r = r.point(lambda p: min(255, int(p * 1.3 + 30)))
        g = g.point(lambda p: int(p * 0.65))
        b = b.point(lambda p: int(p * 0.35))
        bg = Image.merge("RGB", (r, g, b))
    elif tint == "sakura": # Stage 9 Tamamo
        r, g, b = bg.split()
        r = r.point(lambda p: min(255, int(p * 1.25 + 25)))
        g = g.point(lambda p: int(p * 0.75))
        b = b.point(lambda p: min(255, int(p * 1.35 + 30)))
        bg = Image.merge("RGB", (r, g, b))
        
    return bg

# Stage 6: Athena (Golden Celestial Pantheon from Top-Left)
bg_stg_6 = make_9_16(q_top_left)
bg_stg_6.save(os.path.join(bg_dir, "bg_stage_6.jpg"), quality=92)
print("Saved bg_stage_6.jpg")

# Stage 7: Hydra (Toxic Emerald Cosmic Swamp)
bg_stg_7 = make_9_16(q_bot_right, tint="emerald")
bg_stg_7.save(os.path.join(bg_dir, "bg_stage_7.jpg"), quality=92)
print("Saved bg_stage_7.jpg")

# Stage 8: Cyclops (Volcanic Star Forge from Bottom-Left)
bg_stg_8 = make_9_16(q_bot_left, tint="volcanic")
bg_stg_8.save(os.path.join(bg_dir, "bg_stage_8.jpg"), quality=92)
print("Saved bg_stage_8.jpg")

# Stage 9: Tamamo (Twilight Foxfire Sakura from Top-Right)
bg_stg_9 = make_9_16(q_top_right, tint="sakura")
bg_stg_9.save(os.path.join(bg_dir, "bg_stage_9.jpg"), quality=92)
print("Saved bg_stage_9.jpg")

# Stage 10: Tiamat (Cosmic Skeletal Dragon Galaxy from Bottom-Right)
bg_stg_10 = make_9_16(q_bot_right)
bg_stg_10.save(os.path.join(bg_dir, "bg_stage_10.jpg"), quality=92)
print("Saved bg_stage_10.jpg")

print("All 10 stage backgrounds and VFX processed successfully!")
