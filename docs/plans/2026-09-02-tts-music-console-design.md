# TTS Music Console Design

## Goal

Add Norse Kode's nine-track *Voiceless Edda* soundtrack to the TTS save through a compact physical, host-controlled music console.

## Audio and hosting

- Convert the owner's 48 kHz stereo WAV masters to 192 kbps MP3 with `ffmpeg`.
- Preserve the album sequence inferred from the source export order:
  1. Ginnungagap — The Yawning Silence
  2. Askr and Embla — The New Beginning
  3. Hamr — The Vessel
  4. Hugr — Beyond the Body
  5. Fylgja — The One Who Walks Before
  6. Hamingja — Luck of the Bloodline
  7. Fimbulvetr — The Long Winter
  8. Ragnarök — The Doom of the Gods
  9. Líf and Lífþrasir — The Next New Beginning
- Keep WAV masters outside Git. Commit URL-safe MP3 derivatives under `tts/assets/music/`.
- Pin the published music base and console texture to immutable raw GitHub commit URLs.
- Use TTS's global `MusicPlayer`; do not depend on SoundCloud redirects or expiring stream URLs.

## Physical console

The console is a locked, low-profile 2:1 Custom Tile beside Host Controls. Its skin uses dark natural wood, charcoal stone, an iron rim, restrained knotwork, cream control markings, muted gold dividers, and a small aurora-green status accent. It must read clearly at tabletop scale without competing with the board.

Four large physical controls are attached with TTS object buttons:

- `|<` previous
- `PLAY` / `PAUSE`
- `>|` next
- `SHUF` shuffle toggle

Repeat remains available through TTS's native Music menu to avoid crowding the physical object. The console description reports the current track and status. Button label plus color communicates state; color alone is never required.

## Behavior

- Loading the save is silent.
- The first valid host control action initializes the playlist.
- Play/pause preserves position; previous/next preserve playing or paused intent.
- Shuffle defaults off and can be toggled by the host.
- Non-host clicks receive concise permission feedback.
- Loading and failure states are reflected in the console description and button availability.
- Music state is independent of War, Skirmish, and Clash phases.

## Boundaries

- No screen-space music panel.
- No decorative marketing copy.
- No autoplay.
- No WAV masters in the repository.
- No SoundCloud integration in v1.
