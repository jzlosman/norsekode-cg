# TTS Music Console Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Convert the nine owned WAV masters into hosted MP3s and add a skinned, host-controlled physical music console to the generated TTS save.

**Architecture:** A JSON music manifest owns album order, display titles, and URL-safe filenames. A dedicated Node script invokes `ffmpeg` to generate MP3 derivatives; save generation combines the manifest with one hosted music base URL and embeds the resulting playlist in Global Lua. A locked Custom Tile hosts four Lua-driven object buttons backed by TTS's global `MusicPlayer` API.

**Tech Stack:** Node.js ESM, ffmpeg/ffprobe, TTS JSON, Lua, Vitest, ImageMagick, OpenAI image generation.

---

### Task 1: Define and test the music manifest

**Files:**
- Create: `tts/music-playlist.json`
- Create: `scripts/generate-tts-music.mjs`
- Modify: `package.json`
- Modify: `scripts/tts-save.test.ts`

1. Add failing tests for nine tracks, exact album order, URL-safe unique filenames, and the conversion command contract.
2. Run `npm test -- scripts/tts-save.test.ts` and confirm failure.
3. Add the manifest and a generator that requires `NORSE_KODE_MUSIC_SOURCE_DIR`, validates every WAV, and invokes ffmpeg with `libmp3lame`, 192 kbps stereo output, 48 kHz sampling, ID3 title/artist/album/track metadata, and stripped unrelated metadata.
4. Add `generate:tts-music` to `package.json`.
5. Run the targeted test and conversion; inspect duration, codecs, bitrate, tags, and total size with `ffprobe`.

### Task 2: Design the physical console texture

**Files:**
- Create: `tts/assets/norse-kode-music-console.png`

1. Generate one text-free 2:1 skin using board/player-mat assets as style references.
2. Normalize it to 1024×512, strip metadata, and inspect at tabletop scale.
3. Verify no embedded labels conflict with TTS button overlays.

### Task 3: Generate the console object and hosted playlist

**Files:**
- Modify: `scripts/tts-save.mjs`
- Modify: `scripts/build-tts-save.mjs`
- Modify: `tts/asset-urls.json`
- Modify: `scripts/tts-save.test.ts`

1. Add failing tests for a unique locked music-console Custom Tile, position/scale, console texture URL, embedded nine-track playlist, immutable base URL support, and no autoplay.
2. Run targeted tests and confirm failure.
3. Add `musicConsole` and `musicBase` URL resolution plus environment overrides.
4. Render `MUSIC_PLAYLIST` from the manifest into Global Lua.
5. Add the console object beside Host Controls and pass its GUID to Lua.
6. Run targeted tests until green.

### Task 4: Implement MusicPlayer controls in Lua

**Files:**
- Modify: `tts/norse-kode.lua`
- Modify: `scripts/tts-save.test.ts`
- Modify: `scripts/tts-lua-ai.test.lua` if the harness needs MusicPlayer stubs

1. Add failing source-contract and Lua harness tests for host-only initialization, silent load, play/pause, previous, next, shuffle, status description, loading feedback, and missing-console recovery.
2. Run targeted tests and confirm failure.
3. Implement four object buttons and lightweight periodic status refresh without coupling to game phases.
4. Stub only the required MusicPlayer behavior in the Lua harness.
5. Run targeted JS and Lua tests until green.

### Task 5: Validate, document, publish, and rebuild

**Files:**
- Modify: `scripts/validate-tts.mjs`
- Modify: `tts/README.md`
- Modify: `tts/PLAYTEST_CHECKLIST.md`
- Modify: `tts/asset-urls.json`
- Regenerate: `tts/build/Norse Kode.json`

1. Add validation for the console object, MP3 files, HTTPS playlist URLs, nine tracks, and the new expected top-level object count.
2. Document host controls, loading behavior, music source override, and cache-safe asset updates.
3. Run all tests, web build, TTS build, MP3 inspection, and save validation.
4. Commit and publish MP3s/texture on the feature branch.
5. Pin immutable URLs to that commit, rebuild the save, verify hosted bytes match local files, and commit the generated save.
6. Perform a read-only code review, fast-forward `main`, rerun verification, and push only after all checks are green.
