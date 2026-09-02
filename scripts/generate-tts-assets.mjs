import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const sourceDir = join(root, 'public/assets/cards')
const outputDir = join(root, 'tts/assets')
const manifest = JSON.parse(readFileSync(join(sourceDir, 'manifest.json'), 'utf8'))
const atlasColumns = 7
const atlasRows = Math.ceil(manifest.cards.length / atlasColumns)
const atlasPath = join(outputDir, 'norse-kode-deck.png')
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

const assetManifest = {
  source: 'public/assets/cards/manifest.json',
  atlas: {
    file: 'norse-kode-deck.png',
    width: manifest.width * atlasColumns,
    height: manifest.height * atlasRows,
    columns: atlasColumns,
    rows: atlasRows,
  },
  cardBack: 'card-back.png',
  cards: manifest.cards.map((card, index) => ({
    ...card,
    atlasIndex: index,
    ttsCardId: 100 + index,
  })),
}

writeFileSync(join(outputDir, 'asset-manifest.json'), `${JSON.stringify(assetManifest, null, 2)}\n`)
execFileSync('python3', [playerMatGenerator], { stdio: 'inherit' })
console.log(`Built ${assetManifest.cards.length}-card TTS atlas at ${atlasPath}`)
