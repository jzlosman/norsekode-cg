# Norse Kode Solo AI Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Add a basic solo mode in which one human claims a side and a lightweight Lua AI controls the other side through drafting, formation, oaths, and clash resolution.

**Architecture:** Keep the existing TTS Lua controller authoritative. Represent the AI as a virtual `AI` side rather than a TTS player color, so it never requires a seat or private hand. The AI will choose the highest-strength legal draft card, arrange its cards by strength, swear available Bloodsworn cards, and use the existing host-controlled reveal flow.

**Tech Stack:** Tabletop Simulator Lua, generated TTS save JSON, Vitest.

---

### Task 1: Add failing save/source contract tests

**Files:**
- Modify: `scripts/tts-save.test.ts`

Assert that the embedded default Lua source enables solo mode and contains the AI automation entry points.

### Task 2: Add solo-side state and AI draft automation

**Files:**
- Modify: `tts/norse-kode.lua`

Add `CONFIG.soloMode`, virtual-AI helpers, automatic AI-side assignment at `START WAR`, hidden AI draft-card placement, highest-strength draft selection, and scheduling after asynchronous deck dealing and human picks.

### Task 3: Add AI formation and oath automation

**Files:**
- Modify: `tts/norse-kode.lua`

Place the AI cards into its five formation slots face-down, commit the AI line, and choose legal Blood Oaths. Ensure AI cards are not exposed through player-hand APIs and that human side guards remain enforced.

### Task 4: Make solo UI visibility safe and document behavior

**Files:**
- Modify: `tts/norse-kode.lua`
- Modify: `tts/README.md`

Hide AI-only oath controls from human players, log which side the AI controls, and document claiming one side plus disabling `soloMode` for normal multiplayer.

### Task 5: Regenerate and verify artifacts

**Files:**
- Regenerate: `tts/build/Norse Kode.json`
- Update: `/Users/jzaborowski/Library/Tabletop Simulator/Saves/Viking War/Norse Kode.json`

Run focused tests, full tests, TTS validation, JSON parsing, and Lua syntax validation if `luac` is available.
