# Norse Kode Tabletop Simulator Mod Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Turn Norse Kode's browser prototype into a multiplayer Tabletop Simulator mod where players physically draft, place hidden formations, reveal clashes, and let Lua automate bookkeeping and rules resolution.

**Architecture:** Keep `src/game/engine.ts` as the behavioral reference. Add a self-contained `tts/` package with a Lua runtime, an importable TTS save generator, reproducible card-atlas generation, and setup documentation. The TTS table owns the physical experience; its Lua state tracks card GUIDs, phases, private oaths, formations, clash cursors, penalties, scoring, and the playtest log.

**Tech Stack:** Tabletop Simulator Lua scripting, TTS save JSON, Node.js build scripts, ImageMagick for atlas composition, existing PNG card assets, generated board texture.

---

### Task 1: Define the TTS package and save-generator contract

**Files:**
- Create: `tts/README.md`
- Create: `tts/assets/asset-manifest.json`
- Create: `scripts/tts-save.mjs`
- Create: `scripts/generate-tts-assets.mjs`
- Modify: `package.json`

**Step 1: Define the artifact contract**

Specify that `tts/assets/` contains the board texture, 42-card atlas, and card back; `tts/norse-kode.lua` is the editable script source; and `tts/build/Norse Kode.json` is generated for TTS import. The save generator accepts `NORSE_KODE_ASSET_BASE_URL` and emits a clear placeholder when no public URL is configured.

**Step 2: Add build scripts**

Add `build:tts-assets`, `build:tts-save`, and `build:tts` scripts. Keep generation deterministic and never overwrite source card artwork.

**Step 3: Run the contract smoke check**

Run: `npm run build:tts -- --help`
Expected: The command is available and documents the asset URL requirement.

---

### Task 2: Create failing validation tests

**Files:**
- Create: `scripts/tts-save.test.ts`

**Step 1: Write failing tests**

Cover the required generated save behavior:

- 42 unique card IDs appear in the custom deck.
- The custom deck uses a 7×6 atlas and a card back.
- The save includes the board, deck, host panel, and two player panels.
- The save embeds the Lua script and references all required host/player callback names.
- The default build uses an explicit asset URL placeholder rather than silently emitting broken relative paths.

**Step 2: Run the focused tests**

Run: `npm test -- scripts/tts-save.test.ts`
Expected: FAIL because the save builder does not exist yet.

---

### Task 3: Implement reproducible TTS assets and save generation

**Files:**
- Create: `tts/assets/norse-kode-table.png`
- Create: `scripts/generate-tts-assets.mjs`
- Create: `scripts/tts-save.mjs`
- Create: `tts/build/Norse Kode.json`
- Modify: `package.json`

**Step 1: Build the card atlas**

Use the existing manifest and 42 card fronts to create a 7-column × 6-row atlas without changing the individual card assets. Emit a manifest mapping each card ID to its atlas index and TTS `CardID`.

**Step 2: Build the TTS save**

Generate a valid save containing:

- A custom board tile using the generated texture.
- A `DeckCustom` with all 42 cards and stable GUIDs.
- Two player panels with claim/commit buttons.
- A host control panel with start, oath reveal, clash reveal, and next-skirmish buttons.
- Stable snap positions for ten draft cards and two five-slot formation rows.
- Lua script and UI XML embedded in the save.

**Step 3: Run the generator**

Run: `npm run build:tts`
Expected: assets and `tts/build/Norse Kode.json` are generated.

**Step 4: Run the focused tests**

Run: `npm test -- scripts/tts-save.test.ts`
Expected: PASS.

---

### Task 4: Port the multiplayer game flow into Lua

**Files:**
- Create: `tts/norse-kode.lua`

**Step 1: Add card metadata and persistent state**

Port the 42 battle-card definitions and current v0.1 configuration. Track north/south player assignments, draft pool, private hands, committed formations, oaths, cursors, chain breaks, penalties, wins, tokens, discard cards, and the public playtest log.

**Step 2: Add side claiming and host guards**

Players claim North or South once. Host-only callbacks reject unauthorized setup, oath reveal, clash resolution, and next-skirmish actions. Player callbacks reject actions from the wrong side or wrong phase.

**Step 3: Add automated War and draft setup**

Shuffle the custom deck, recycle discard when needed, deal ten face-up cards to the central pool, enforce alternating draft turns, and send drafted cards to the active player's private hand.

**Step 4: Add formation commit**

Read the five numbered board slots for the claiming player, require one tracked card in each slot, lock the cards face-down, and advance only when both lines are committed.

**Step 5: Add private oath controls**

Expose player-specific oath buttons only for Bloodsworn slots. Store selections privately and reveal them publicly only after the host presses Reveal Oaths.

**Step 6: Add clash resolution**

Port the existing resolver behavior: chain bonuses, Bloodsworn partner consumption, Shield Wall current/future chain effects, Berserker wins and queued penalties, Ravenfeeder tie behavior, weapon tie-breaks, no-winner ties, early exhaustion, skirmish tokens, and War completion.

**Step 7: Add physical reveal and logging**

Flip only the current clash entries, move consumed cards to discard, preserve unrevealed cards face-down, display plain-language math and outcomes, and keep a public log on the TTS UI.

---

### Task 5: Document setup and multiplayer playtesting

**Files:**
- Modify: `tts/README.md`
- Create: `tts/PLAYTEST_CHECKLIST.md`

**Step 1: Document asset hosting**

Explain that TTS clients need reachable HTTPS asset URLs. Document a GitHub Pages/raw-host workflow and the generated save's `NORSE_KODE_ASSET_BASE_URL` override. Explain how to import the generated save and save it as a Workshop mod.

**Step 2: Document the player flow**

Explain seating, claiming a side, drafting, placing cards in slots, committing, private oath selection, host resolution, and starting another War.

**Step 3: Add a playtest checklist**

Include a two-player happy path and targeted edge cases for Bloodsworn, Shield Wall, Berserker, Ravenfeeder, ties, and early skirmish completion.

---

### Task 6: Generate and validate the importable artifacts

**Files:**
- Generated: `tts/assets/*`
- Generated: `tts/build/Norse Kode.json`

**Step 1: Validate image outputs**

Check the atlas dimensions, board dimensions, and card-back dimensions with ImageMagick identify.

**Step 2: Validate save JSON**

Parse the generated save with Node, confirm the embedded script/XML are strings, confirm all GUIDs are unique, and confirm all referenced asset URLs are present.

**Step 3: Validate Lua syntax when available**

Run `luac -p tts/norse-kode.lua` if `luac` is installed; otherwise report that runtime verification requires opening the save in TTS.

---

### Task 7: Run full verification

**Files:**
- Existing browser engine and tests

**Step 1: Run browser tests**

Run: `npm test`
Expected: all existing rules tests and TTS generator tests pass.

**Step 2: Run the production build**

Run: `npm run build`
Expected: the browser rules/debug harness still builds.

**Step 3: Run the TTS build**

Run: `npm run build:tts`
Expected: deterministic TTS artifacts are regenerated without errors.

**Step 4: Review generated diff and status**

Confirm only the new TTS package, plan, generated board asset, and intended package scripts are present. Do not commit or publish a Workshop item without explicit user approval.
