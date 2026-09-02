# Norse Kode Card Brand Redesign Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Rebuild the 42-card Norse Kode deck around the approved Night & Saga brand system, rename Skald to Jarl/Lead by Example without changing mechanics, and produce verified browser and TTS artifacts.

**Architecture:** Keep gameplay rules pure and preserve the 42-card order. Rename public Hero contracts to Jarl while retaining Lua aliases for legacy `skald-*` TTS cards. Refactor the card generator around explicit brand tokens, bundled rank typography, reusable SVG marks, generated atmospheric/portrait sources, and deterministic ImageMagick composition; then regenerate browser cards and TTS artifacts locally before a separate approved hosted-asset publication step.

**Tech Stack:** TypeScript/Vitest, Lua/Fengari, Node.js ESM, SVG, ImageMagick, Python/Pillow TTS asset scripts, OpenAI image generation.

---

### Task 1: Record the approved visual system

**Files:**
- Create: `docs/plans/2026-09-02-card-brand-redesign-design.md`
- Create: `docs/plans/2026-09-02-card-brand-redesign-implementation-plan.md`

**Step 1: Verify the design captures every approved decision**

Check for Night suit cards, Saga Hero cards, Axe/Sword/Spear color mapping, Bravyn ranks, geometric SVG pips, Bloodsworn/Shield Wall rule lines, Jarl/Lead by Example, cinematic illuminated-etching portraits, and legacy TTS compatibility.

**Step 2: Commit the planning artifacts**

```bash
git add docs/plans/2026-09-02-card-brand-redesign-*.md
git commit -m "docs: specify branded card redesign"
```

### Task 2: Rename Skald to Jarl in the browser rules core

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/config.ts`
- Modify: `src/game/cards.ts`
- Modify: `src/game/engine.ts`
- Test: `src/game/engine.test.ts`

**Step 1: Write failing tests**

Update/add tests that require:

- The Hero card is `{ id: 'jarl', name: 'Jarl', abilityType: 'jarl' }`.
- Win/tie/loss carryover remains +3/+2/+1.
- A consumed Jarl triggers the bonus.
- The application and queue logs say `Lead by Example`.
- Berserker penalty suppression, Vengeance stacking, and Shield Wall interaction remain unchanged.

**Step 2: Run the focused test and observe the expected failures**

```bash
npx vitest run src/game/engine.test.ts -t 'Jarl|Lead by Example|hero momentum'
```

Expected: FAIL because the current card/type/log contracts still use Skald/Responsive Song.

**Step 3: Implement the public rename**

- Replace `abilityType: 'skald'` with `'jarl'`.
- Rename `isSkald` to `isJarl` and `skald*Bonus` config keys to `jarl*Bonus`.
- Keep `songBonuses`/`songBonus` state names because they describe generic carryover and preserve saved-state shape.
- Replace user-facing logs with `Jarl Lead by Example ...`.
- Do not change the +3/+2/+1 arithmetic or consumed-partner detection.

**Step 4: Run focused and full browser tests**

```bash
npx vitest run src/game/engine.test.ts
npm test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/game
git commit -m "feat: replace Skald with Jarl"
```

### Task 3: Rename the TTS Hero while preserving old saves

**Files:**
- Modify: `tts/norse-kode.lua`
- Test: `scripts/tts-lua-ai.test.lua`
- Test: `scripts/tts-save.test.ts`

**Step 1: Write failing Lua/save assertions**

Require:

- New cards use `jarl-1..3`, `name = "Jarl"`, and `ability = "jarl"`.
- `CARD_DATA["skald-1..3"]` remain aliases to their corresponding Jarl metadata.
- Detailed and optimized simulations preserve +3/+2/+1, consumed-Bloodsworn activation, penalty suppression, Vengeance stacking, and Shield Wall behavior.
- Logs say `Lead by Example`.
- Embedded-save tests expect `jarlWinBonus = 3` and Jarl ability metadata.

**Step 2: Run focused tests and observe failure**

```bash
npx vitest run scripts/tts-lua-ai.test.ts -t 'hero momentum abilities|state migration'
npx vitest run scripts/tts-save.test.ts -t 'strategic formation|solo AI'
```

Expected: FAIL against current Skald identifiers.

**Step 3: Implement Jarl and aliases**

- Rename runtime identifiers to `isJarl`/`jarl*Bonus`/`ability = "jarl"`.
- Generate `jarl-*` metadata in the unchanged Hero slot/order.
- After generating Jarl records, assign legacy `skald-*` table aliases for old GMNotes.
- Keep saved `songBonuses` fields and state version unchanged.
- Update all user-facing Lua logs.

**Step 4: Verify Lua oracle parity**

```bash
npm run test:lua-ai
npx vitest run scripts/tts-save.test.ts
```

Expected: all scenarios PASS.

**Step 5: Commit**

```bash
git add tts/norse-kode.lua scripts/tts-lua-ai.test.lua scripts/tts-save.test.ts
git commit -m "feat: add Jarl to TTS with Skald compatibility"
```

### Task 4: Add brand source assets and a failing card-art contract

**Files:**
- Create: `public/assets/fonts/Bravyn Runeskald.ttf`
- Create: `public/assets/fonts/Bravyn Runeskald LICENSE.txt`
- Create: `public/assets/fonts/Inter-SemiBold.ttf`
- Create: `public/assets/fonts/Inter LICENSE.txt`
- Create: `public/assets/brand/norse-kode-logomark-cream.svg`
- Create: `scripts/card-assets.test.ts`
- Modify: `package.json`

**Step 1: Write the failing artifact test first**

The test should read the generated manifest/PNG headers and assert:

- 42 cards at 750×1050.
- Three `jarl-*` entries and no `skald-*` entries.
- Jarl remains in the former Skald atlas position so CardIDs stay stable.
- Bundled rank font/license and exact NK SVG exist.
- Generator source references Bravyn, all five canonical brand colors, the three luminous suit colors, `JOIN WITH NEXT WARRIOR`, and `BREAK ANY CHAIN BONUSES`.

**Step 2: Run and observe failure**

```bash
npx vitest run scripts/card-assets.test.ts
```

Expected: FAIL because the current manifest/generator still uses Skald and old styling.

**Step 3: Add licensed sources**

- Copy the user-provided Bravyn font and commercial-use notice.
- Add a bundled Inter cut under its OFL license for reproducible labels.
- Download/copy the exact owned NK cream logomark from `norsekodemusic.com`.
- Add `scripts/card-assets.test.ts` to the normal Vitest suite; do not make tests regenerate repository files.

**Step 4: Commit**

```bash
git add public/assets/fonts public/assets/brand scripts/card-assets.test.ts package.json package-lock.json
git commit -m "chore: add reproducible Norse Kode brand assets"
```

### Task 5: Generate cinematic source artwork

**Files:**
- Create: `public/assets/card-art/night-field.png`
- Replace: `public/assets/card-art/shield-maiden.png`
- Replace: `public/assets/card-art/berserker.png`
- Replace: `public/assets/card-art/ravenfeeder.png`
- Create: `public/assets/card-art/jarl.png`
- Remove after replacement: `public/assets/card-art/skald.png`

**Step 1: Generate one neutral Night texture**

Use image generation for a 5:7, near-black/fjord, low-contrast atmospheric aurora texture with no scenery, text, frame, rune, or bright focal point. It must remain quiet beneath pips.

**Step 2: Generate the Shield Maiden style anchor**

Condition on the existing portrait. Create a bone-background cinematic illuminated etching: painted expression and mist plus engraved armor/hair contours and restrained aurora rim light. No text, frame, full card, or suit color.

**Step 3: Inspect the revised prompt and output**

Reject drift toward photorealism, white-line inversion, fantasy gloss, or a hard rectangular background. Make at most one targeted revision.

**Step 4: Generate Berserker, Ravenfeeder, and Jarl**

Condition each existing Hero on the approved Shield Maiden style anchor. Jarl replaces the musician with an authoritative Norse leader, cloak, brooch, and calm command; no instrument, crown, text, or modern insignia.

**Step 5: Build a four-portrait contact sheet and inspect once**

Check shared crop, bone edge color, line density, mint-light discipline, facial differentiation, and readability at card size. Apply one bounded correction batch if needed.

**Step 6: Commit approved source art**

```bash
git add public/assets/card-art
git commit -m "art: add Night texture and Saga Hero portraits"
```

### Task 6: Rebuild the card generator around brand tokens and SVG geometry

**Files:**
- Modify: `scripts/generate-card-assets.mjs`
- Modify: `public/assets/cards/manifest.json` (generated)
- Replace: `public/assets/cards/*.png` (generated)
- Test: `scripts/card-assets.test.ts`

**Step 1: Add generator-level brand tokens**

Define canonical dark/bone colors, luminous/ink suit pairs, frame dimensions, line weights, rank offsets, and typography paths in one token object.

**Step 2: Add reusable SVG atoms**

Implement:

- Exact NK mark.
- Angular axe, sword, and spear pip glyphs.
- Night and Saga frame skeletons.
- Oath-knot and Shield Wall structural marks.
- Mirrored rank image placement and mirrored special rails.

Use one icon grid/stroke system. Do not generate pips with AI.

**Step 3: Render Bravyn ranks reproducibly**

Use the bundled TTF through ImageMagick to rasterize/crop transparent rank glyphs, cache by rank/color, and embed them in SVG. Apply optical width/offset tokens for 4, 6, 9, and 10. Keep labels/rules in bundled Inter.

**Step 4: Implement Night standard cards**

Use obsidian/fjord texture, bone structural frame, suit rail, luminous rank, geometric pips, and current pip coordinates. Preserve mirrored corners and card order.

**Step 5: Implement Bloodsworn and Shield Wall variants**

Keep ranks/pip counts while adding the approved sigils, structural layouts, and exact mirrored copy:

- `JOIN WITH NEXT WARRIOR`
- `BREAK ANY CHAIN BONUSES`

**Step 6: Implement Saga Hero cards**

Use bone field, charcoal/fjord neutral frame, S/B/R/J ranks, dissolving portrait treatment, exact NK mark, and concise ability rails. Replace Skald output/manifest entries with Jarl without changing the Hero's atlas index.

**Step 7: Generate cards and run the failing contract to green**

```bash
npm run generate:cards
npx vitest run scripts/card-assets.test.ts
npm test
```

Expected: PASS with 42 cards and Jarl outputs.

**Step 8: Create one representative contact sheet**

Include standard 1/5/6/10 for each suit plus all four Heroes and the back. Inspect at full size and thumbnail size for frame consistency, contrast, pip/rank readability, special recognition, copy overflow, and family cohesion. Make one bounded correction batch and regenerate once.

**Step 9: Commit generator and browser assets**

```bash
git add scripts/generate-card-assets.mjs scripts/card-assets.test.ts public/assets/cards
git commit -m "feat: generate branded Night and Saga deck"
```

### Task 7: Update documentation and browser-facing terminology

**Files:**
- Modify: `README.md`
- Modify: `PRODUCT.md`
- Modify: `tts/README.md`
- Modify: `tts/PLAYTEST_CHECKLIST.md`

**Step 1: Replace public Skald terminology**

Document Jarl/Lead by Example and remove public Responsive Song wording while retaining a migration note for old `skald-*` TTS cards.

**Step 2: Document generator prerequisites and art system**

Document ImageMagick, bundled fonts/licenses, source art locations, `npm run generate:cards`, and the Night/Saga taxonomy.

**Step 3: Run a stale-term check**

```bash
rg -n 'Skald|Responsive Song|PLACEHOLDER|skald-' README.md PRODUCT.md tts src scripts public/assets/cards/manifest.json
```

Expected: only explicit backward-compatibility aliases/tests may contain `skald-*`; no public-facing stale names remain.

**Step 4: Commit**

```bash
git add README.md PRODUCT.md tts/README.md tts/PLAYTEST_CHECKLIST.md
git commit -m "docs: document Jarl and branded deck system"
```

### Task 8: Rebuild local TTS artifacts and verify the branch

**Files:**
- Replace: `tts/assets/card-back.png`
- Replace: `tts/assets/norse-kode-deck.png`
- Modify: `tts/assets/asset-manifest.json`
- Replace: `tts/build/Norse Kode.json`
- Do not modify yet: `tts/asset-urls.json`

**Step 1: Rebuild TTS assets locally**

```bash
npm run build:tts-assets
```

**Step 2: Build the save with temporary/local test URLs if necessary**

Do not point `asset-urls.json` at unpublished GitHub content. Build/validate structural content first.

```bash
npm run build:tts-save
npm run verify:tts
```

**Step 3: Run complete verification**

```bash
npm test
npm run test:lua-ai
npm run build
npm run verify:tts
```

Expected: all tests pass; browser build succeeds; save validates with 42 cards/15 objects.

**Step 4: Review generated diffs and request code review**

Check card order, atlas geometry, generated save Lua/UI, new card back reuse, and absence of accidental hosted URL changes.

**Step 5: Commit local generated TTS artifacts**

```bash
git add tts/assets tts/build/Norse\ Kode.json
git commit -m "build: regenerate branded TTS deck"
```

### Task 9: Remote hosted-asset rollout — explicit approval gate

**Files:**
- Modify after approval: `tts/asset-urls.json`
- Replace after approval: `tts/build/Norse Kode.json`

**Step 1: Explain the local result and wait for explicit approval**

Report visual changes, gameplay-name migration, tests, image-generation limitations, and TTS rollout effects. Do not push assets or change remote URLs before approval.

**Step 2: After approval, publish the exact generated asset revision**

Push the feature/assets commit to the approved GitHub repository, capture its immutable commit SHA, and verify every raw asset byte against local files.

**Step 3: Pin URLs and rebuild without regenerating assets**

Replace all nine commit hashes in `tts/asset-urls.json`, then run only:

```bash
npm run build:tts-save
npm run verify:tts
```

Do not rerun nondeterministic table/player-mat generation between publishing and hash verification.

**Step 4: Verify hosted bytes and generated save URLs**

Fetch all nine URLs, compare SHA-256 to local files, and assert the generated save contains no prior commit URLs.

**Step 5: Commit/push the final URL configuration only with approval**

```bash
git add tts/asset-urls.json tts/build/Norse\ Kode.json
git commit -m "build: publish branded Norse Kode assets"
git push origin feature/card-brand-redesign
```
