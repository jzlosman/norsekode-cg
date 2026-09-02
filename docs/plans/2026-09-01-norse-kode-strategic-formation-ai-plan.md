# Norse Kode Strategic Formation AI Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Replace the TTS solo AI’s descending-strength formation and automatic Blood Oaths with exhaustive strategic simulation over every legal formation and oath plan.

**Architecture:** Extract the existing TTS clash calculation into a data-only resolver shared by live play and AI simulation. Generate all permutations and legal Bloodsworn oath assignments for both known hands, simulate every matchup, score robustness and efficiency metrics, then randomly select among near-equal top plans. Keep TTS object lookup, card movement, logs, and UI updates outside the simulation loop.

**Tech Stack:** Tabletop Simulator Lua, Node.js/Vitest source contract tests, generated TTS save JSON.

---

### Task 1: Add executable Lua AI tests

**Files:**
- Create: `scripts/tts-lua-ai.test.ts`
- Modify: `package.json`

1. Add a test harness that loads the data-only Lua section with stubbed TTS globals.
2. Add a failing test for a pure skirmish simulation entry point.
3. Add failing tests for 120 unique five-card permutations and legal sworn/unsworn Bloodsworn plans.
4. Add a failing test proving selection can reject the descending-strength formation and preserve a declined oath.
5. Run the focused tests and confirm failures are due to missing strategic-AI functions.

### Task 2: Extract the pure combat resolver

**Files:**
- Modify: `tts/norse-kode.lua`
- Test: `scripts/tts-lua-ai.test.ts`

1. Parameterize chain calculation, entry building, comparison, and clash resolution over plain simulation state.
2. Keep `resolveClash()` as a live-state wrapper so the host flow and resolution output shape remain compatible.
3. Implement `simulateSkirmish` by repeatedly invoking the same resolver without logs or TTS object calls.
4. Run focused and existing tests after each refactor step.

### Task 3: Generate and evaluate plans

**Files:**
- Modify: `tts/norse-kode.lua`
- Test: `scripts/tts-lua-ai.test.ts`

1. Generate all unique card-order permutations.
2. Expand each order into every legal Bloodsworn oath assignment, excluding final-position oaths.
3. Simulate each AI plan against every opponent plan.
4. Record wins, ties, losses, worst score margin, 3–0 and 3–1 rates, Bloodsworn efficiency, and Berserker waste.
5. Rank plans using expected result with worst-case protection and deterministic tie-break fields.

### Task 4: Select and commit a strategic plan

**Files:**
- Modify: `tts/norse-kode.lua`
- Test: `scripts/tts-lua-ai.test.ts`
- Modify: `scripts/tts-save.test.ts`

1. Build a near-optimal candidate pool within a small utility tolerance.
2. Use injectable randomness in tests and `math.random` in TTS to choose from that pool.
3. Replace descending-strength formation in `aiCommitFormation` with the selected plan.
4. Persist the plan’s oath map so `aiChooseOaths` no longer swears automatically.
5. Add concise diagnostic logging without revealing the hidden formation.

### Task 5: Document, build, and verify

**Files:**
- Modify: `tts/README.md`
- Regenerate: `tts/build/Norse Kode.json`

1. Document exhaustive strategic formation and oath selection while keeping draft AI explicitly basic.
2. Run focused Lua AI tests, the full Vitest suite, TypeScript/Vite build, TTS build, and TTS validation.
3. Review the final diff for hidden-information leaks, mutation of live state during simulation, and stale basic-AI wording.
