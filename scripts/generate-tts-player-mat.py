from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "tts/assets/norse-kode-player-mat-base.png"
INTER_FONT = ROOT / "public/assets/fonts/Inter-SemiBold.ttf"
OVERLAY = ROOT / "tts/assets/.norse-kode-player-mat-overlay.svg"
OUTPUT = ROOT / "tts/assets/norse-kode-player-mat.png"
WIDTH, HEIGHT = 2048, 768
CARD_WIDTH, CARD_HEIGHT = 252, 353
CARD_CENTERS = [301, 662, 1024, 1386, 1747]
SLOT_TOP = 208
CLASH_Y = 607
TRACK_CENTERS = [1120, 1260, 1400, 1540, 1680]
OATH_CENTERS = [800, 1248]
OATH_Y = 700

COLORS = {
    "charcoal": "#0D0F12",
    "bone": "#EAE2D0",
    "aurora": "#46E3A8",
}


def corner_marks(x, y, width, height, inset=12, tick=28):
    return f'''<path d="M{x+inset} {y+inset+tick}V{y+inset}H{x+inset+tick} M{x+width-inset-tick} {y+height-inset}H{x+width-inset}V{y+height-inset-tick}" fill="none" stroke="{COLORS['aurora']}" stroke-opacity=".68" stroke-width="3"/>'''


def card_slot_svg(center, index):
    left = center - CARD_WIDTH // 2
    return f'''<rect x="{left}" y="{SLOT_TOP}" width="{CARD_WIDTH}" height="{CARD_HEIGHT}" rx="12" fill="{COLORS['charcoal']}" fill-opacity=".22" stroke="{COLORS['bone']}" stroke-opacity=".62" stroke-width="2"/>
{corner_marks(left, SLOT_TOP, CARD_WIDTH, CARD_HEIGHT)}
<text x="{center}" y="{SLOT_TOP+31}" text-anchor="middle" fill="{COLORS['bone']}" fill-opacity=".9" font-family="Inter NK" font-size="18" font-weight="600">{index}</text>'''


def clash_svg(center):
    return f'''<circle cx="{center}" cy="{CLASH_Y}" r="31" fill="{COLORS['charcoal']}" fill-opacity=".22" stroke="{COLORS['bone']}" stroke-opacity=".62" stroke-width="2"/>
<path d="M{center-12} {CLASH_Y-19}H{center+12}" stroke="{COLORS['aurora']}" stroke-opacity=".7" stroke-width="3"/>
<text x="{center}" y="{CLASH_Y+6}" text-anchor="middle" fill="{COLORS['bone']}" fill-opacity=".9" font-family="Inter NK" font-size="11" font-weight="600" letter-spacing="1">CLASH</text>'''


def track_svg(center, index):
    return f'''<circle cx="{center}" cy="139" r="25" fill="{COLORS['charcoal']}" fill-opacity=".22" stroke="{COLORS['bone']}" stroke-opacity=".62" stroke-width="2"/>
<path d="M{center-9} 156H{center+9}" stroke="{COLORS['aurora']}" stroke-opacity=".7" stroke-width="3"/>
<text x="{center}" y="147" text-anchor="middle" fill="{COLORS['bone']}" fill-opacity=".92" font-family="Inter NK" font-size="19" font-weight="600">{index}</text>'''


def oath_svg(center, index):
    left = center - 74
    top = OATH_Y - 20
    return f'''<rect x="{left}" y="{top}" width="148" height="48" rx="12" fill="{COLORS['charcoal']}" fill-opacity=".22" stroke="{COLORS['bone']}" stroke-opacity=".62" stroke-width="2"/>
<path d="M{left+12} {top+21}V{top+12}H{left+29}" stroke="{COLORS['aurora']}" stroke-opacity=".7" stroke-width="3" fill="none"/>
<text x="{center}" y="{OATH_Y+10}" text-anchor="middle" fill="{COLORS['bone']}" fill-opacity=".92" font-family="Inter NK" font-size="14" font-weight="600" letter-spacing="1.5">OATH {index}</text>'''


def create_overlay():
    font_uri = INTER_FONT.resolve().as_uri()
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">
<style>@font-face {{ font-family: "Inter NK"; src: url("{font_uri}") format("truetype"); font-weight: 600; }}</style>
<!-- Functional guides placed directly over the original wood and iron mat. -->
<text x="1010" y="147" text-anchor="end" fill="{COLORS['bone']}" fill-opacity=".88" font-family="Inter NK" font-size="16" font-weight="600" letter-spacing="2">WINS</text>
''']

    for index, center in enumerate(TRACK_CENTERS, 1):
        parts.append(track_svg(center, index))

    for index, center in enumerate(CARD_CENTERS, 1):
        parts.append(card_slot_svg(center, index))
        parts.append(clash_svg(center))

    for index, center in enumerate(OATH_CENTERS, 1):
        parts.append(oath_svg(center, index))

    parts.append("</svg>")
    OVERLAY.write_text("".join(parts))


def main():
    for source in (BASE, INTER_FONT):
        if not source.exists():
            raise SystemExit(f"Missing player mat source: {source}")

    create_overlay()
    subprocess.run([
        "magick", str(BASE), "-background", "none", str(OVERLAY),
        "-compose", "over", "-composite", "-strip", str(OUTPUT),
    ], check=True)
    OVERLAY.unlink(missing_ok=True)
    print(f"Built player battle mat at {OUTPUT}")


if __name__ == "__main__":
    main()
