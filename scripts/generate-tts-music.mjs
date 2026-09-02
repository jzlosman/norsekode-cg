import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'tts/music-playlist.json'), 'utf8'))
const sourceDir = process.env.NORSE_KODE_MUSIC_SOURCE_DIR
const outputDir = process.env.NORSE_KODE_MUSIC_OUTPUT_DIR ?? join(root, 'tts/assets/music')

if (!sourceDir) {
  throw new Error('Set NORSE_KODE_MUSIC_SOURCE_DIR to the directory containing the Voiceless Edda WAV masters.')
}

mkdirSync(outputDir, { recursive: true })

for (const [index, track] of manifest.tracks.entries()) {
  const input = join(sourceDir, track.source)
  const output = join(outputDir, track.file)
  if (!existsSync(input)) throw new Error(`Missing WAV master: ${input}`)

  const args = [
    '-y',
    '-v', 'error',
    '-i', input,
    '-map_metadata', '-1',
    '-vn',
    '-codec:a', 'libmp3lame',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-id3v2_version', '3',
    '-metadata', `title=${track.title}`,
    '-metadata', `artist=${manifest.artist}`,
    '-metadata', `album=${manifest.album}`,
    '-metadata', `track=${index + 1}/${manifest.tracks.length}`,
    output,
  ]
  const result = spawnSync('ffmpeg', args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`Could not generate ${track.file}: ${result.stderr}`)
  console.log(`Generated ${track.file}`)
}
