import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "tts/assets/norse-kode-table-base.png"
LAYOUT_FILE = ROOT / "tts/board-layout.json"
INTER_FONT = ROOT / "public/assets/fonts/Inter-SemiBold.ttf"
OVERLAY = ROOT / "tts/assets/.norse-kode-table-overlay.svg"
OUTPUT = ROOT / "tts/assets/norse-kode-table.png"

COLORS = {
    "charcoal": "#0D0F12",
    "bone": "#EAE2D0",
    "aurora": "#46E3A8",
}


def rect_from_center(point, card_size):
    return {
        "x": point["x"] - card_size["width"] / 2,
        "y": point["y"] - card_size["height"] / 2,
        "width": card_size["width"],
        "height": card_size["height"],
    }


def slot_svg(point, card_size):
    rect = rect_from_center(point, card_size)
    x, y, width, height = rect["x"], rect["y"], rect["width"], rect["height"]
    inset = 10
    tick = 24
    return f'''<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="10" fill="{COLORS['charcoal']}" fill-opacity=".22" stroke="{COLORS['bone']}" stroke-opacity=".62" stroke-width="2"/>
<path d="M{x+inset} {y+inset+tick}V{y+inset}H{x+inset+tick} M{x+width-inset-tick} {y+height-inset}H{x+width-inset}V{y+height-inset-tick}" fill="none" stroke="{COLORS['aurora']}" stroke-opacity=".68" stroke-width="2.5"/>'''


def label_svg(point, card_size, label, below=False):
    edge = point["y"] + card_size["height"] / 2 if below else point["y"] - card_size["height"] / 2
    baseline = edge + 30 if below else edge - 15
    return f'''<text x="{point['x']}" y="{baseline}" text-anchor="middle" fill="{COLORS['bone']}" fill-opacity=".92" font-family="Inter NK" font-size="16" font-weight="600" letter-spacing="3">{label}</text>'''


def altar_svg(point, card_size):
    rect = rect_from_center(point, card_size)
    x, y, width, height = rect["x"], rect["y"], rect["width"], rect["height"]
    inset = 7
    return f'''<rect x="{x - 8}" y="{y - 8}" width="{width + 16}" height="{height + 16}" rx="16" fill="{COLORS['charcoal']}" fill-opacity=".18" stroke="{COLORS['bone']}" stroke-opacity=".28" stroke-width="2" stroke-dasharray="8 9"/>
<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="10" fill="{COLORS['charcoal']}" fill-opacity=".22" stroke="{COLORS['aurora']}" stroke-opacity=".58" stroke-width="2.5"/>
<path d="M{x+inset} {y+inset+24}V{y+inset}H{x+inset+24} M{x+width-inset-24} {y+height-inset}H{x+width-inset}V{y+height-inset-24}" fill="none" stroke="{COLORS['aurora']}" stroke-opacity=".84" stroke-width="3"/>'''


def fate_altar_svg(point):
    x, y = point["x"], point["y"]
    return f'''<circle cx="{x}" cy="{y}" r="82" fill="{COLORS['charcoal']}" fill-opacity=".28" stroke="{COLORS['bone']}" stroke-opacity=".38" stroke-width="2" stroke-dasharray="7 8"/>
<circle cx="{x}" cy="{y}" r="68" fill="none" stroke="{COLORS['aurora']}" stroke-opacity=".78" stroke-width="3"/>
<path d="M{x-36} {y}H{x+36} M{x} {y-36}V{y+36}" stroke="{COLORS['bone']}" stroke-opacity=".32" stroke-width="2"/>
<text x="{x}" y="{y+108}" text-anchor="middle" fill="{COLORS['bone']}" fill-opacity=".92" font-family="Inter NK" font-size="15" font-weight="600" letter-spacing="2">GODS DECIDE</text>'''


def create_overlay(layout):
    width = layout["canvas"]["width"]
    height = layout["canvas"]["height"]
    card_size = layout["cardSize"]
    font_uri = INTER_FONT.resolve().as_uri()

    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
<style>@font-face {{ font-family: "Inter NK"; src: url("{font_uri}") format("truetype"); font-weight: 600; }}</style>
<!-- Functional card guides placed directly over the original wood and iron board. -->
''']

    for point in layout["draft"]:
        parts.append(slot_svg(point, card_size))

    for label, point, below in (("DRAW", layout["draw"], False), ("DISCARD", layout["discard"], True)):
        parts.append(slot_svg(point, card_size))
        parts.append(label_svg(point, card_size, label, below))

    parts.append(altar_svg(layout["watcherActive"], card_size))
    parts.append(altar_svg(layout["watcherActive2"], card_size))
    parts.append(altar_svg(layout["watcherDeck"], card_size))
    parts.append(fate_altar_svg(layout["fateCoin"]))
    altar_center_x = (layout["watcherActive"]["x"] + layout["watcherDeck"]["x"]) / 2
    parts.append(f'''<text x="{altar_center_x}" y="{layout["watcherActive"]["y"] + 35}" text-anchor="middle" fill="{COLORS['bone']}" fill-opacity=".9" font-family="Inter NK" font-size="15" font-weight="600" letter-spacing="2">WATCHER ALTAR</text>
<text x="{altar_center_x}" y="{layout["watcherActive"]["y"] + 60}" text-anchor="middle" fill="{COLORS['aurora']}" fill-opacity=".9" font-family="Inter NK" font-size="12" font-weight="600" letter-spacing="1.5">ACTIVE · DECK</text>''')

    parts.append("</svg>")
    OVERLAY.write_text("".join(parts))


def main():
    for source in (BASE, LAYOUT_FILE, INTER_FONT):
        if not source.exists():
            raise SystemExit(f"Missing board source: {source}")

    layout = json.loads(LAYOUT_FILE.read_text())
    create_overlay(layout)
    subprocess.run([
        "magick", str(BASE), "-background", "none", str(OVERLAY),
        "-compose", "over", "-composite", "-strip", str(OUTPUT),
    ], check=True)
    OVERLAY.unlink(missing_ok=True)
    print(f"Built measured 2x5 draft board at {OUTPUT}")


if __name__ == "__main__":
    main()
