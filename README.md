# Norse Kode

A browser-based, pass-and-play prototype for testing Norse Kode's core loop:

**Draft → Predict → Form → Reveal → Resolve**

## Browser rules harness

```bash
npm install
npm run dev
```

Then open the Vite URL. Use **Play mode** for the intended hidden-formation flow or **Debug mode** to inspect both lines and chain calculations. The combat log and JSON export are designed for repeated playtesting.

## Tabletop Simulator multiplayer mod

The primary multiplayer playtest experience lives in [`tts/`](tts/). It uses the existing card art with a Lua controller for shuffling, the ten-card draft, private formation slots, Blood Oaths, clash resolution, scoring, and the public playtest log.

```bash
npm run build:tts
```

See [`tts/README.md`](tts/README.md) for asset hosting, TTS import, and multiplayer instructions.

## Source and asset hosting

The public [`jzlosman/norsekode-cg`](https://github.com/jzlosman/norsekode-cg) repository contains the browser prototype, TTS controller, reproducible card sources, generated deck atlas, board textures, player mats, markers, and card back. TTS saves use raw GitHub asset URLs pinned to a specific commit for stable multiplayer loading.

## Card artwork

The 42-card battle deck lives in `public/assets/cards/` as individual 750×1050 PNG fronts plus `card-back.png`. The ten Watcher fronts live separately in `public/assets/watchers/` with their own manifest and are bundled into a separate TTS Watcher deck atlas. Source illustrations are in `public/assets/card-art/`; both layouts are reproducible with ImageMagick:

```bash
npm run generate:cards
npm run generate:watchers
```

The generator builds a branded **Night & Saga** deck: dark suit cards with runic ranks and familiar illustrated weapon pips, plus color-coded bone cinematic-etching Hero cards. Shield Maiden uses **Vengeance** as a primary warrior, drawing on the previous numeric defeat margin; Jarl uses **Lead by Example** to strengthen the next entry based on his Clash result, even when Bloodsworn consumes him.

## Verify

```bash
npm test
npm run build
```

## Prototype notes

- `src/game/cards.ts` contains the 42 Battle Cards and the browser prototype's reserved God/Mythos placeholders.
- `src/game/config.ts` contains balance and unresolved behavior switches.
- `src/game/engine.ts` is the pure, data-driven rules core.
- `tts/norse-kode.lua` owns the playable Watcher rules, timing, private choices, and TTS resolution; set `CONFIG.godCardsEnabled = true` there to play them.
- The browser prototype remains decorative/disabled until its separate engine/UI port is requested.
- Shield Maiden and Jarl are active, configurable Hero abilities.
