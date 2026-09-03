import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const sourceDir = join(root, 'public/assets/cards')
const watcherSourceDir = join(root, 'public/assets/watchers')
const outputDir = join(root, 'tts/assets')
execFileSync(process.execPath, [join(here, 'generate-watcher-card-assets.mjs')], { stdio: 'inherit' })
const manifest = JSON.parse(readFileSync(join(sourceDir, 'manifest.json'), 'utf8'))
const watcherManifest = JSON.parse(readFileSync(join(watcherSourceDir, 'manifest.json'), 'utf8'))
const atlasColumns = 7
const atlasRows = Math.ceil(manifest.cards.length / atlasColumns)
const watcherAtlasColumns = 5
const watcherAtlasRows = Math.ceil(watcherManifest.cards.length / watcherAtlasColumns)
const atlasPath = join(outputDir, 'norse-kode-deck.png')
const watcherAtlasPath = join(outputDir, 'norse-kode-watchers.png')
const playerMatGenerator = join(here, 'generate-tts-player-mat.py')
const tableGenerator = join(here, 'generate-tts-table.py')

mkdirSync(outputDir, { recursive: true })
copyFileSync(join(sourceDir, manifest.cardBack), join(outputDir, 'card-back.png'))
execFileSync('python3', [tableGenerator], { stdio: 'inherit' })

const cardPaths = manifest.cards.map((card) => join(sourceDir, card.file))
execFileSync('magick', [
  'montage',
  ...cardPaths,
  '-background', 'none',
  '-tile', `${atlasColumns}x${atlasRows}`,
  '-geometry', `${manifest.width}x${manifest.height}+0+0`,
  atlasPath,
], { stdio: 'inherit' })
const watcherCardPaths = watcherManifest.cards.map((card) => join(watcherSourceDir, card.file))
execFileSync('magick', [
  'montage',
  ...watcherCardPaths,
  '-background', 'none',
  '-tile', `${watcherAtlasColumns}x${watcherAtlasRows}`,
  '-geometry', `${watcherManifest.width}x${watcherManifest.height}+0+0`,
  watcherAtlasPath,
], { stdio: 'inherit' })

const assetManifest = {
  source: 'public/assets/cards/manifest.json',
  watcherSource: 'public/assets/watchers/manifest.json',
  atlas: {
    file: 'norse-kode-deck.png',
    width: manifest.width * atlasColumns,
    height: manifest.height * atlasRows,
    columns: atlasColumns,
    rows: atlasRows,
  },
  watcherAtlas: {
    file: 'norse-kode-watchers.png',
    width: watcherManifest.width * watcherAtlasColumns,
    height: watcherManifest.height * watcherAtlasRows,
    columns: watcherAtlasColumns,
    rows: watcherAtlasRows,
  },
  fateCoin: {
    north: 'fate-coin-north.png',
    south: 'fate-coin-south.png',
  },
  cardBack: 'card-back.png',
  cards: manifest.cards.map((card, index) => ({
    ...card,
    atlasIndex: index,
    ttsCardId: 100 + index,
  })),
  watchers: watcherManifest.cards.map((card, index) => ({
    ...card,
    atlasIndex: index,
    ttsCardId: 200 + index,
  })),
}

writeFileSync(join(outputDir, 'asset-manifest.json'), `${JSON.stringify(assetManifest, null, 2)}\n`)
execFileSync('python3', [playerMatGenerator], { stdio: 'inherit' })
console.log(`Built ${assetManifest.cards.length}-card battle atlas at ${atlasPath}`)
console.log(`Built ${assetManifest.watchers.length}-card Watcher atlas at ${watcherAtlasPath}`)
