import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const manifestFile = new URL('../tts/music-playlist.json', import.meta.url)
const generatorFile = new URL('./generate-tts-music.mjs', import.meta.url)

const expectedTracks = [
  ['Ginnungagap - The Yawning Silence.wav', '01-ginnungagap-the-yawning-silence.mp3', 'Ginnungagap — The Yawning Silence'],
  ['Askr and Embla - The New Beginning.wav', '02-askr-and-embla-the-new-beginning.mp3', 'Askr and Embla — The New Beginning'],
  ['Hamr - The Vessel.wav', '03-hamr-the-vessel.mp3', 'Hamr — The Vessel'],
  ['Hugr - Beyond the Body.wav', '04-hugr-beyond-the-body.mp3', 'Hugr — Beyond the Body'],
  ['Fylgja - The One Who Walks Before.wav', '05-fylgja-the-one-who-walks-before.mp3', 'Fylgja — The One Who Walks Before'],
  ['Hamingja - Luck of the Bloodline.wav', '06-hamingja-luck-of-the-bloodline.mp3', 'Hamingja — Luck of the Bloodline'],
  ['Fimbulvetr - The Long Winter.wav', '07-fimbulvetr-the-long-winter.mp3', 'Fimbulvetr — The Long Winter'],
  ['Ragnarök - The Doom of the Gods.wav', '08-ragnarok-the-doom-of-the-gods.mp3', 'Ragnarök — The Doom of the Gods'],
  ['Líf and Lífþrasir - The Next New Beginning.wav', '09-lif-and-lifthrasir-the-next-new-beginning.mp3', 'Líf and Lífþrasir — The Next New Beginning'],
]

describe('TTS music assets', () => {
  it('defines the complete Voiceless Edda playlist in album order', () => {
    expect(existsSync(manifestFile)).toBe(true)
    if (!existsSync(manifestFile)) return

    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
    expect(manifest).toMatchObject({ artist: 'Norse Kode', album: 'Voiceless Edda', bitrateKbps: 192 })
    expect(manifest.tracks.map((track: any) => [track.source, track.file, track.title])).toEqual(expectedTracks)
    expect(new Set(manifest.tracks.map((track: any) => track.file)).size).toBe(9)
    expect(manifest.tracks.every((track: any) => /^[0-9]{2}-[a-z0-9-]+\.mp3$/.test(track.file))).toBe(true)
  })

  it('generates tagged 192 kbps MP3s from an explicit external source directory', () => {
    expect(existsSync(generatorFile)).toBe(true)
    if (!existsSync(generatorFile)) return

    const source = readFileSync(generatorFile, 'utf8')
    expect(source).toContain('NORSE_KODE_MUSIC_SOURCE_DIR')
    expect(source).toContain("'libmp3lame'")
    expect(source).toContain("'192k'")
    expect(source).toContain("'48000'")
    expect(source).toContain("'-metadata', `artist=${manifest.artist}`")
    expect(source).toContain("'-metadata', `album=${manifest.album}`")
    expect(source).toContain("'-metadata', `track=${index + 1}/${manifest.tracks.length}`")
  })
})
