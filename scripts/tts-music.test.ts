import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
    expect(source).toContain('NORSE_KODE_MUSIC_OUTPUT_DIR')
    expect(source).toContain("'libmp3lame'")
    expect(source).toContain("'192k'")
    expect(source).toContain("'48000'")
    expect(source).toContain("'-metadata', `artist=${manifest.artist}`")
    expect(source).toContain("'-metadata', `album=${manifest.album}`")
    expect(source).toContain("'-metadata', `track=${index + 1}/${manifest.tracks.length}`")
  })

  it('produces probeable stereo 48 kHz files with the required bitrate and tags', () => {
    const generator = readFileSync(generatorFile, 'utf8')
    expect(generator).toContain('NORSE_KODE_MUSIC_OUTPUT_DIR')
    if (!generator.includes('NORSE_KODE_MUSIC_OUTPUT_DIR')) return

    const workspace = mkdtempSync(join(tmpdir(), 'norse-kode-music-'))
    const sourceDir = join(workspace, 'wav')
    const outputDir = join(workspace, 'mp3')
    mkdirSync(sourceDir)
    try {
      const seedWav = join(sourceDir, expectedTracks[0][0])
      execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '0.2', seedWav])
      for (const [source] of expectedTracks.slice(1)) copyFileSync(seedWav, join(sourceDir, source))
      execFileSync(process.execPath, [fileURLToPath(generatorFile)], {
        env: {
          ...process.env,
          NORSE_KODE_MUSIC_SOURCE_DIR: sourceDir,
          NORSE_KODE_MUSIC_OUTPUT_DIR: outputDir,
        },
      })

      for (const [index, [, file, title]] of expectedTracks.entries()) {
        const output = join(outputDir, file)
        const probe = JSON.parse(execFileSync('ffprobe', [
          '-v', 'error',
          '-select_streams', 'a:0',
          '-show_entries', 'stream=codec_name,sample_rate,channels,bit_rate:format_tags=title,artist,album,track',
          '-of', 'json',
          output,
        ], { encoding: 'utf8' }))
        expect(probe.streams[0]).toMatchObject({ codec_name: 'mp3', sample_rate: '48000', channels: 2, bit_rate: '192000' })
        expect(probe.format.tags).toMatchObject({ title, artist: 'Norse Kode', album: 'Voiceless Edda', track: `${index + 1}/9` })
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})
