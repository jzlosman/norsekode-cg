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

## Card artwork

The generated deck lives in `public/assets/cards/` as 42 individual 750×1050 PNG fronts plus `card-back.png`. Source illustrations are in `public/assets/card-art/`; the layout is reproducible with ImageMagick:

```bash
npm run generate:cards
```

The generator keeps the number cards deliberately close to a traditional pip deck, uses suit-tinted paper and restrained corner marks, and reserves richer portraits for the four hero types. Shield Maiden uses **Vengeance** as a primary warrior, drawing on the previous numeric defeat margin; Skald uses **Responsive Song** to strengthen the next entry based on his Clash result, even when Bloodsworn consumes him.

## Verify

```bash
npm test
npm run build
```

## Prototype notes

- `src/game/cards.ts` contains the 42 Battle Cards and 10 reserved God/Mythos cards.
- `src/game/config.ts` contains balance and unresolved behavior switches.
- `src/game/engine.ts` is the pure, data-driven rules core.
- God cards are decorative and disabled by default.
- Shield Maiden and Skald are active, configurable Hero abilities.
