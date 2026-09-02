# Norse Kode Prototype Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build a fast, pass-and-play browser prototype for repeatedly testing Norse Kode's open draft, secret formation, Blood Oath, and sequential clash loop.

**Architecture:** Keep card definitions and all combat resolution in a pure TypeScript game module. React owns interaction state and renders phase-specific controls, while CSS supplies a compact Norse playing-card table with strong readability. Playtest history is serializable from the game state rather than persisted remotely.

**Tech Stack:** Vite, React, TypeScript, Vitest, CSS.

---

### Task 1: Scaffold the browser app and test harness

- Add Vite/React/TypeScript package and compiler configuration.
- Add Vitest test script.
- Add `PRODUCT.md` with confirmed prototype constraints and explicit unresolved decisions.
- Create the initial engine test file before any engine implementation.

### Task 2: Implement the data-driven rules core

- Create `src/game/types.ts` for card, config, game-state, clash, and log types.
- Create `src/game/cards.ts` for the 42 battle cards and 10 reserved God cards.
- Create `src/game/config.ts` for all balance and unresolved behavior switches.
- Create `src/game/engine.ts` with deck setup, drawing/recycling, chain computation, draft transitions, oath-aware clash resolution, skirmish stopping, and playtest event capture.
- Cover chain bonuses, Shield Wall reset, Bloodsworn consumption, Ravenfeeder ties, Berserker penalty, ties, missing warriors, and deck recycle with Vitest.

### Task 3: Build the playtest UI

- Create `src/App.tsx` with a stateful pass-and-play shell.
- Render draft pool and turn status, both public hands, formation builders, private oath controls, reveal flow, clash area, and combat log.
- Support Play Mode and Debug Mode, reset, config controls, next-skirmish flow, and export of playtest JSON.

### Task 4: Apply the visual system

- Create `src/styles.css` with a dark timber/iron table surface, cream card faces, Norse red/amber accents, crisp SVG weapon marks, responsive layout, focus states, and readable resolution details.
- Keep the first viewport about the current decision and the five-position battle line rather than decorative hero art.

### Task 5: Verify

- Run `npm test` and `npm run build`.
- Run the Impeccable detector once against changed UI files.
- Inspect the Vite production output and report any remaining unresolved design questions honestly.
