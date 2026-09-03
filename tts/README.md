# Norse Kode · Tabletop Simulator

This directory contains the multiplayer tabletop version of Norse Kode. TTS is the primary playtest experience; the browser app remains a deterministic rules/debug reference.

## What is included

- `norse-kode.lua` — editable TTS controller
- `norse-kode-ui.xml` — public status/log UI and private Blood Oath controls
- `assets/norse-kode-table-base.png` — wood-and-iron board substrate
- `board-layout.json` — measured card wells shared by the board generator and TTS save
- `assets/norse-kode-table.png` — original wood-and-iron board with mapped draft, draw, and face-up discard wells
- `assets/norse-kode-battlefield-table.png` — top-down frozen battlefield texture for the Custom Rectangle table
- `assets/norse-kode-fjord-sky.png` — 360° snowy-fjord custom background
- `assets/norse-kode-deck.png` — 42-card, 7×6 battle deck atlas
- `assets/norse-kode-watchers.png` — 10-card, 5×2 Watcher deck atlas
- `assets/fate-coin-north.png` / `assets/fate-coin-south.png` — two-sided Gods Decide tie-break coin
- `assets/card-back.png` — shared card back
- `assets/norse-kode-player-mat-base.png` — generated base art for the player mat
- `assets/norse-kode-player-mat.png` — natural wood-and-iron player mat with card guides, ordered Blood Oath spaces, Clash spaces, and five-win track
- `music-playlist.json` — ordered Voiceless Edda track metadata and URL-safe filenames
- `assets/music/*.mp3` — nine 192 kbps TTS soundtrack files generated from the external WAV masters
- `assets/norse-kode-music-console.png` — wood, iron, and runestone skin for the physical music controls
- `assets/norse-clash-token.png` / `assets/norse-skirmish-token.png` — generated thematic combat markers
- `assets/oath-yes.png` / `assets/oath-no.png` — generated red Blood Oath marker artwork
- `asset-urls.json` — immutable public URLs baked into the generated save
- `build/Norse Kode.json` — generated TTS save file
- `PLAYTEST_CHECKLIST.md` — recommended multiplayer test cases

## Build the mod

From the repository root:

```bash
npm run build:tts
```

The default save uses immutable raw GitHub URLs from `tts/asset-urls.json` for the custom battlefield table, snowy-fjord background, board, cards, player mat, music console and soundtrack, combat markers, and oath markers. They point to the public [`jzlosman/norsekode-cg`](https://github.com/jzlosman/norsekode-cg) repository and are pinned to an asset commit so later changes cannot silently alter an existing TTS save.

Generate the soundtrack from the owner's external WAV directory without copying the masters into Git:

```bash
NORSE_KODE_MUSIC_SOURCE_DIR="/path/to/Voiceless Edda/Spotify Upload Ready" npm run generate:tts-music
```

When assets change, regenerate them, commit and push that asset revision, replace the commit hash in `asset-urls.json`, rebuild the save, and commit the updated configuration. Layout changes require importing the rebuilt `Norse Kode.json`; an in-progress TTS save is not repositioned automatically. Provide temporary URL overrides with either one shared base URL:

```bash
NORSE_KODE_ASSET_BASE_URL=https://example.com/norse-kode/ npm run build:tts
```

or individual files:

```bash
NORSE_KODE_TABLE_URL=https://... \\
NORSE_KODE_TABLE_SURFACE_URL=https://... \\
NORSE_KODE_SKY_URL=https://... \\
NORSE_KODE_CARDS_URL=https://... \\
NORSE_KODE_WATCHERS_URL=https://... \\
NORSE_KODE_FATE_NORTH_URL=https://... \\
NORSE_KODE_FATE_SOUTH_URL=https://... \\
NORSE_KODE_CARD_BACK_URL=https://... \\
NORSE_KODE_MANIFEST_URL=https://... \\
NORSE_KODE_PLAYER_MAT_URL=https://... \\
NORSE_KODE_MUSIC_CONSOLE_URL=https://... \\
NORSE_KODE_MUSIC_BASE_URL=https://.../music/ \\
NORSE_KODE_CLASH_TOKEN_URL=https://... \\
NORSE_KODE_SKIRMISH_TOKEN_URL=https://... \\
NORSE_KODE_OATH_YES_URL=https://... \\
NORSE_KODE_OATH_NO_URL=https://... \\
npm run build:tts
```

TTS uses the custom tabletop, custom background, board, battle and Watcher deck atlases, Gods Decide coin, card-back, player mat, music, and marker URLs. The manifest URL is retained in the save's Rules field for debugging and asset provenance; Lua has the card metadata embedded so it does not need to fetch the manifest.

## Load in TTS

1. Copy `tts/build/Norse Kode.json` into your TTS local saves directory.
2. Open TTS and load the **Norse Kode** save.
3. For solo play, sit in any one color and click **CLAIM NORTH** or **CLAIM SOUTH**. The unclaimed side is controlled by the solo AI. For multiplayer, have two players sit in any two colors and claim opposite sides.
4. To play Watchers, edit `CONFIG.godCardsEnabled = true` in the embedded Lua controller. Leave it false for the original ruleset.
5. The host clicks **START WAR**.
6. Save the loaded table as a local save and optionally upload it to the Workshop for friends.

### Physical music console

The locked **VOICELESS EDDA** console beside Host Controls drives TTS's global Music Player. Loading the save remains silent. The host can click **PLAY**, **PAUSE**, **|<**, **>|**, or **SHUF ON/OFF**; the first valid click loads the nine-track album in order. Hover the console or a control to see the current track and loading status. Non-host clicks cannot change playback. Repeat remains available in TTS's native Music menu.

Typical save locations:

- macOS: `~/Library/Tabletop Simulator/Saves/`
- Windows: `%USERPROFILE%/Documents/My Games/Tabletop Simulator/Saves/`
- Linux: `~/.local/share/Tabletop Simulator/Saves/`

## Multiplayer flow

### Watchers

When enabled, the separate Watcher deck and its active-card altar sit in the board's upper utility area. No Watchers appear in Skirmishes 1–2; one card is automatically revealed in Skirmishes 3–6; two cards are automatically revealed in Skirmishes 7–8. All revealed cards remain face-up beside the deck for inspection and return to it between Skirmishes. The board also has a dedicated Gods Decide coin altar; the coin appears there only when an exact tie reaches the final Fate decision. BEFORE · DRAFT effects modify the draft's later calculations; BEFORE · CLASH 1 effects are consumed by the first Clash.

Thor, Týr, and Odin add +1 Strength to the matching weapon. Njörðr reverses the weapon tie-break triangle. Fimbulwinter removes all weapon-chain bonuses for the Skirmish. The Norns prevent the Berserker penalty caused by the next Berserker trigger. Heimdall keeps formation position 3 face-up. If final Strength ties, the higher natural primary number wins; if the natural entry values also tie, the Gods Decide coin awards North or South so a final Clash cannot remain unresolved.

After both lines lock, Loki and Skaði require each player to choose an enemy slot privately and seal it. Loki swaps the two selected warriors into the selected enemy positions and recalculates chains. Skaði applies -2 Strength to each selected warrior for its Clash. Frigg optionally lets each player privately view one enemy card; the card is returned face-down with no changes allowed. These interactions are enforced in Lua and must finish before Blood Oaths.

### Draft

The host starts the War from the screen-space control panel. The board groups ten face-up draft cards into two tight rows of five. A separate utility column holds the face-down draw pile above a face-up discard pile. The board artwork, dealt-card positions, Watcher/Fate altars, and sixteen snap points all come from `board-layout.json`. The script shuffles the 42-card deck, deals the draft, and assigns a random first drafter. The active player clicks **TAKE** on one card. The card goes to that player's private TTS hand and the turn alternates automatically. In solo mode, the AI automatically drafts the highest-strength legal card when its turn arrives and keeps its cards face-down.

### Formation

After both players have five cards, arrange the cards on your full player battle mat. Drop the cards on the formation row; each drop is assigned to the nearest available card-sized slot and turns face-down automatically. If cards land together, **COMMIT** sorts all five cards into the numbered slots and spaces them evenly. The circular marker below each slot is the Clash-win space for that card. Each mat also has two ordered Blood Oath marker slots. The script requires all five cards to be on the mat, centers them exactly, locks them, and keeps the line hidden from the opponent.

In solo mode, the AI considers all 120 card orders plus every legal sworn/unsworn Bloodsworn state. It simulates each plan against every legal formation and oath state available to the known opposing hand. Plans are scored by expected result, worst matchup, decisive wins, Bloodsworn efficiency, and wasted Berserker triggers. The search runs in small batches across TTS frames, then randomly selects among near-equal leaders so the AI does not become deterministic.

### Oaths and clashes

After both lines commit, each human player sees only their own private Blood Oath controls. The AI's Blood Oaths are already part of its selected formation plan, so it can deliberately decline an oath. Human buttons are labeled **SWEAR SLOT N** or **UNSWEAR SLOT N**; this is an optional choice, not a warning. The host clicks **REVEAL OATHS**, then **REVEAL NEXT CLASH** for each sequential clash. All phase, player, and host controls live in the readable screen-space panel; the table grid is reserved for the draw pile, discard pile, and draft cards.

Each reveal flips only the active slot(s). Lua calculates chain bonuses, Bloodsworn partner consumption, Shield Wall disruption, Berserker effects and penalties, Ravenfeeder ties, Shield Maiden Vengeance, Jarl Lead by Example, weapon tie-breaks, ties, and Clash wins. Compact numeric expressions such as `5+2+2` appear above the resolved cards. A thematic Clash marker is automatically taken from the unlimited **Clash Token Bag** and placed in the marker space behind the winning card.

**Shield Maiden — Vengeance:** when she is the primary warrior and her side lost the previous Clash, she gains the numeric margin of defeat using final displayed Strength. A consumed Shield Maiden does not trigger Vengeance. First position, ties, and losses caused only by a special rule or tie-break grant +0. The default is uncapped.

**Jarl — Lead by Example:** Jarl queues +3 after a win, +2 after a tie, or +1 after a loss for his side's next Clash entry. He leads when he is the primary warrior or when a Bloodsworn consumes him. The bonus applies once, stacks with Vengeance, and is not removed by Shield Wall. Legacy `skald-*` cards from older saves resolve as Jarl.

After the final Clash—or as soon as a side reaches three Clash wins—the result stays on the table in **SKIRMISH READY**. The host checks the revealed cards, math, and Clash marker, then clicks **END SKIRMISH**. That returns all temporary Clash markers to the bag and moves all ten cards face-up to the labeled discard well; no Skirmish-win card stack is created. The winner receives one thematic Skirmish marker on the next space of their five-space Victory Track. The winner's opponent drafts first in the next Skirmish. The first side to five wins the War; starting a new War recycles the used cards and victory markers.

When Blood Oaths are revealed, each player receives up to two red **YES** or **NO** markers in their own ordered **OATH 1 / OATH 2** placeholder slots on their player mat. The row never identifies which card produced a marker; markers remain ordered by reveal order.

## Editing rules

The default TTS configuration mirrors `src/game/config.ts`:

- 5 Skirmish wins to reduce the opponent's population to zero and win a War
- 10-card open draft
- 5-card formations
- 3 Clash wins to take a Skirmish
- +1 per same-weapon chain step
- Bloodsworn strength 5
- Shield Wall strength 6
- Ravenfeeder strength 12
- Shield Maiden Vengeance is uncapped
- Jarl Lead by Example grants +3 after a win, +2 after a tie, or +1 after a loss
- Watchers disabled by default; enable with `CONFIG.godCardsEnabled = true` in `tts/norse-kode.lua`

The solo draft AI still takes the highest printed-strength legal card; strategic drafting is a separate future step. Formation search behavior is tunable through the `ai*` fields in `CONFIG`, including the near-optimal randomization tolerance, worst-case weight, and per-frame search batch size.

Edit `tts/norse-kode.lua` for a TTS-only experiment. `CONFIG.soloMode` is enabled by default for local testing; set it to `false` to require two human players. Update the TypeScript engine and its tests first when changing the canonical rules, then port the same behavior into Lua.
