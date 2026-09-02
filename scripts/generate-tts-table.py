from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "tts/assets/norse-kode-table-base.png"
OVERLAY = ROOT / "tts/assets/.norse-kode-table-overlay.svg"
OUTPUT = ROOT / "tts/assets/norse-kode-table.png"
WIDTH, HEIGHT = 1448, 1086

# Six evenly spaced board columns. The first column is the draw/discard column;
# columns 2-6 hold the ten-card draft in two rows.
COLUMN_CENTERS = [136, 371, 606, 841, 1076, 1312]
ROW_CENTERS = [263, 823]
SLOT_WIDTH = 175
SLOT_HEIGHT = 300


def slot_svg(center, row, label):
    left = center - SLOT_WIDTH // 2
    top = ROW_CENTERS[row] - SLOT_HEIGHT // 2
    return f'''<rect x="{left+8}" y="{top+10}" width="{SLOT_WIDTH}" height="{SLOT_HEIGHT}" rx="20" fill="#000" fill-opacity=".78" filter="url(#shadow)"/>
<rect x="{left}" y="{top}" width="{SLOT_WIDTH}" height="{SLOT_HEIGHT}" rx="20" fill="url(#slot)" stroke="url(#gold)" stroke-width="7"/>
<rect x="{left+15}" y="{top+15}" width="{SLOT_WIDTH-30}" height="{SLOT_HEIGHT-30}" rx="12" fill="none" stroke="#a87a32" stroke-width="4" stroke-dasharray="16 11" opacity=".95"/>
<text x="{center}" y="{top-16}" text-anchor="middle" fill="#e8c873" font-family="Arial,sans-serif" font-size="16" font-weight="bold" letter-spacing="2">{label}</text>'''


def create_overlay():
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">
<defs>
  <filter id="shadow" x="-30%" y="-20%" width="160%" height="150%"><feGaussianBlur stdDeviation="9"/><feComponentTransfer><feFuncA type="linear" slope=".7"/></feComponentTransfer><feOffset dy="9"/></filter>
  <linearGradient id="slot" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#17100b" stop-opacity=".96"/><stop offset="1" stop-color="#050403" stop-opacity=".92"/></linearGradient>
  <linearGradient id="gold" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f1cf77"/><stop offset=".5" stop-color="#a86f24"/><stop offset="1" stop-color="#f1cf77"/></linearGradient>
</defs>''']

    parts.append(slot_svg(COLUMN_CENTERS[0], 0, "DRAW PILE"))
    parts.append(slot_svg(COLUMN_CENTERS[0], 1, "DISCARD"))
    for column, center in enumerate(COLUMN_CENTERS[1:], 1):
        for row in range(2):
            parts.append(slot_svg(center, row, f"SLOT {column}"))

    parts.append('</svg>')
    OVERLAY.write_text("".join(parts))


def main():
    if not BASE.exists():
        raise SystemExit(f"Missing board base image: {BASE}")
    create_overlay()
    subprocess.run([
        "magick", str(BASE), "-background", "none", str(OVERLAY),
        "-compose", "over", "-composite", str(OUTPUT),
    ], check=True)
    OVERLAY.unlink(missing_ok=True)
    print(f"Built board with a 2x6 mapped grid at {OUTPUT}")


if __name__ == "__main__":
    main()
