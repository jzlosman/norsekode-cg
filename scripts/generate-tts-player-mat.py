from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "tts/assets/norse-kode-player-mat-base.png"
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


def create_overlay():
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">
<defs>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/><feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer><feOffset dy="7"/></filter>
  <linearGradient id="slot" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#231712" stop-opacity=".88"/><stop offset="1" stop-color="#090807" stop-opacity=".72"/></linearGradient>
  <linearGradient id="gold" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f1cf77"/><stop offset=".5" stop-color="#b17a2f"/><stop offset="1" stop-color="#f1cf77"/></linearGradient>
</defs>
<rect x="100" y="87" width="1848" height="91" rx="28" fill="#0b0807" fill-opacity=".68" stroke="#b17a2f" stroke-width="3"/>
<text x="170" y="123" text-anchor="start" fill="#e8c873" font-family="Georgia,serif" font-size="27" letter-spacing="5">VICTORY TRACK</text>
<text x="170" y="156" text-anchor="start" fill="#d8c4a1" font-family="Arial,sans-serif" font-size="18" letter-spacing="2">FIRST TO 5 WINS · POPULATION</text>
''']

    for index, center in enumerate(TRACK_CENTERS, 1):
        parts.append(f'''<circle cx="{center}" cy="139" r="28" fill="#060505" fill-opacity=".7" stroke="url(#gold)" stroke-width="6"/>
<path d="M {center-13} 128 L {center} 119 L {center+13} 128 L {center+10} 151 L {center} 160 L {center-10} 151 Z" fill="none" stroke="#d9ae56" stroke-width="2" opacity=".8"/>
<text x="{center}" y="148" text-anchor="middle" fill="#f5e7c2" font-family="Georgia,serif" font-size="18">{index}</text>''')

    parts.append('<path d="M 155 187 H 1893" stroke="#b17a2f" stroke-opacity=".7" stroke-width="3"/>')
    for index, center in enumerate(CARD_CENTERS, 1):
        left = center - CARD_WIDTH // 2
        parts.append(f'''<rect x="{left+5}" y="{SLOT_TOP+8}" width="{CARD_WIDTH}" height="{CARD_HEIGHT}" rx="18" fill="#000" fill-opacity=".7" filter="url(#shadow)"/>
<rect x="{left}" y="{SLOT_TOP}" width="{CARD_WIDTH}" height="{CARD_HEIGHT}" rx="18" fill="url(#slot)" stroke="#d6a54c" stroke-width="6"/>
<rect x="{left+14}" y="{SLOT_TOP+14}" width="{CARD_WIDTH-28}" height="{CARD_HEIGHT-28}" rx="11" fill="none" stroke="#8b6b3a" stroke-width="3" stroke-dasharray="11 9" opacity=".9"/>
<text x="{center}" y="{SLOT_TOP+34}" text-anchor="middle" fill="#e8c873" font-family="Arial,sans-serif" font-size="17" letter-spacing="2">SLOT {index}</text>
<circle cx="{center}" cy="{CLASH_Y}" r="34" fill="#060505" fill-opacity=".88" stroke="url(#gold)" stroke-width="6"/>
<path d="M {center-15} {CLASH_Y-5} L {center} {CLASH_Y-20} L {center+15} {CLASH_Y-5} L {center+10} {CLASH_Y+15} L {center} {CLASH_Y+25} L {center-10} {CLASH_Y+15} Z" fill="none" stroke="#d9ae56" stroke-width="3"/>
<text x="{center}" y="{CLASH_Y+6}" text-anchor="middle" fill="#f5e7c2" font-family="Arial,sans-serif" font-size="12" letter-spacing="1">CLASH</text>''')

    parts.append('''<text x="1024" y="653" text-anchor="middle" fill="#d8c4a1" font-family="Arial,sans-serif" font-size="17" letter-spacing="2">PLACE THE WINNING CLASH TOKEN IN THE MARKER BELOW ITS CARD</text>''')
    parts.append(f'''<text x="1024" y="{OATH_Y-24}" text-anchor="middle" fill="#e8c873" font-family="Arial,sans-serif" font-size="16" font-weight="bold" letter-spacing="3">BLOOD OATH</text>''')
    for index, center in enumerate(OATH_CENTERS, 1):
        left = center - 74
        parts.append(f'''<rect x="{left+5}" y="{OATH_Y-14}" width="148" height="48" rx="22" fill="#000" fill-opacity=".72" filter="url(#shadow)"/>
<rect x="{left}" y="{OATH_Y-20}" width="148" height="48" rx="22" fill="url(#slot)" stroke="url(#gold)" stroke-width="5"/>
<rect x="{left+10}" y="{OATH_Y-10}" width="128" height="28" rx="14" fill="none" stroke="#8b6b3a" stroke-width="2" stroke-dasharray="9 7"/>
<text x="{center}" y="{OATH_Y+7}" text-anchor="middle" fill="#f5e7c2" font-family="Arial,sans-serif" font-size="14" font-weight="bold" letter-spacing="2">OATH {index}</text>''')
    parts.append('</svg>')
    OVERLAY.write_text("".join(parts))


def main():
    if not BASE.exists():
        raise SystemExit(f"Missing generated base mat: {BASE}")
    create_overlay()
    subprocess.run([
        "magick", str(BASE), "-background", "none", str(OVERLAY),
        "-compose", "over", "-composite", str(OUTPUT),
    ], check=True)
    OVERLAY.unlink(missing_ok=True)
    print(f"Built player battle mat at {OUTPUT}")


if __name__ == "__main__":
    main()
