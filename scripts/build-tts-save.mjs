import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTtsSave, loadSource, DEFAULT_ASSET_BASE_URL } from './tts-save.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = join(root, 'tts/build')
const outputPath = join(outputDir, 'Norse Kode.json')
const configuredUrls = JSON.parse(readFileSync(join(root, 'tts/steam-cloud-assets.json'), 'utf8'))
const assetBaseUrl = process.env.NORSE_KODE_ASSET_BASE_URL
const envUrls = {
  table: process.env.NORSE_KODE_TABLE_URL,
  cards: process.env.NORSE_KODE_CARDS_URL,
  back: process.env.NORSE_KODE_CARD_BACK_URL,
  manifest: process.env.NORSE_KODE_MANIFEST_URL,
  playerMat: process.env.NORSE_KODE_PLAYER_MAT_URL,
  clashToken: process.env.NORSE_KODE_CLASH_TOKEN_URL,
  skirmishToken: process.env.NORSE_KODE_SKIRMISH_TOKEN_URL,
  oathYes: process.env.NORSE_KODE_OATH_YES_URL,
  oathNo: process.env.NORSE_KODE_OATH_NO_URL,
}
const assetUrls = Object.fromEntries(Object.entries(envUrls).filter(([, value]) => value))
const localGeneratedUrls = {
  playerMat: join(root, 'tts/assets/norse-kode-player-mat.png'),
  clashToken: join(root, 'tts/assets/norse-clash-token.png'),
  skirmishToken: join(root, 'tts/assets/norse-skirmish-token.png'),
}
const options = assetBaseUrl
  ? { assetBaseUrl, assetUrls, ...loadSource() }
  : { assetUrls: { ...localGeneratedUrls, ...configuredUrls, ...assetUrls }, ...loadSource() }

mkdirSync(outputDir, { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(buildTtsSave(options), null, 2)}\n`)
console.log(`Wrote ${outputPath}`)
if (!assetBaseUrl && Object.keys(configuredUrls).length === 0) {
  console.warn(`Using the placeholder asset URL (${DEFAULT_ASSET_BASE_URL}). Configure TTS asset URLs before sharing the save.`)
}
