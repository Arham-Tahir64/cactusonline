"""Crop approved alpha portraits into consistent, web-ready avatar canvases."""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "src" / "assets" / "avatars"
SOURCES = {
    "ranger": "ranger.png",
    "maverick": "maverick.png",
    "sage": "sage.png",
    "prospector": "prospector.png",
    "vaquera": "vaquera-v2.png",
    "outlaw": "outlaw.png",
    "botanist": "botanist.png",
    "drifter": "drifter.png",
}


def alpha_crop(image: Image.Image) -> Image.Image:
    alpha_bounds = image.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise ValueError("Avatar has no visible pixels")
    return image.crop(alpha_bounds)


def prepare(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    portrait = alpha_crop(image)
    portrait.thumbnail((480, 500), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    x = (canvas.width - portrait.width) // 2
    y = canvas.height - portrait.height
    canvas.alpha_composite(portrait, (x, y))
    canvas.save(destination, "WEBP", quality=90, method=6)


def prepare_bust(source: Path, destination: Path) -> None:
    portrait = alpha_crop(Image.open(source).convert("RGBA"))
    bust_height = max(1, int(portrait.height * 0.64))
    bust = portrait.crop((0, 0, portrait.width, bust_height))
    bust.thumbnail((500, 500), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.alpha_composite(bust, ((canvas.width - bust.width) // 2, canvas.height - bust.height))
    canvas.save(destination, "WEBP", quality=90, method=6)


for avatar_id, filename in SOURCES.items():
    full_portrait = ROOT / f"{avatar_id}.webp"
    alpha_source = ROOT / filename
    if alpha_source.exists():
        prepare(alpha_source, full_portrait)
    prepare_bust(full_portrait, ROOT / f"{avatar_id}-bust.webp")
    print(f"Prepared {avatar_id}.webp and {avatar_id}-bust.webp")
