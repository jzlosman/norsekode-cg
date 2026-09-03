import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const artDir = join(root, 'public/assets/card-art')
const fontDir = join(root, 'public/assets/fonts')
const outputDir = join(root, 'public/assets/watchers')
const tempDir = join(root, '.tmp-watcher-assets')

const width = 750
const height = 1050
const COLORS = {
  charcoal: '#1E2227',
  fjord: '#18303C',
  bone: '#EAE2D0',
}
const WATCHER_THEMES = {
  thor: { primary: '#5C3C39', secondary: '#8C625C' },
  tyr: { primary: '#3C5360', secondary: '#6D828B' },
  odin: { primary: '#47465A', secondary: '#77758C' },
  loki: { primary: '#674244', secondary: '#95706C' },
  heimdall: { primary: '#5E553A', secondary: '#8C805C' },
  frigg: { primary: '#4B5A62', secondary: '#78888E' },
  skadi: { primary: '#4E6170', secondary: '#7D929C' },
  njordr: { primary: '#446466', secondary: '#739092' },
  'the-norns': { primary: '#5D5165', secondary: '#887D91' },
  fimbulwinter: { primary: '#50646E', secondary: '#7A9098' },
}
const WATCHER_CARDS = [
  { id: 'watcher-thor', name: 'Thor', title: 'Favor of the Axe', timing: 'BEFORE · DRAFT', rules: 'Axe warriors +1 Strength.', effect: 'Axe warriors gain +1 Strength.', artKey: 'thor', theme: WATCHER_THEMES.thor },
  { id: 'watcher-tyr', name: 'Týr', title: 'Favor of the Sword', timing: 'BEFORE · DRAFT', rules: 'Sword warriors +1 Strength.', effect: 'Sword warriors gain +1 Strength.', artKey: 'tyr', theme: WATCHER_THEMES.tyr },
  { id: 'watcher-odin', name: 'Odin', title: 'Favor of the Spear', timing: 'BEFORE · DRAFT', rules: 'Spear warriors +1 Strength.', effect: 'Spear warriors gain +1 Strength.', artKey: 'odin', theme: WATCHER_THEMES.odin },
  { id: 'watcher-loki', name: 'Loki', title: 'A Better Offer', timing: 'AFTER · FORM LOCK', rules: 'Each player secretly picks 1 enemy slot. Swap those warriors; keep positions. Recalculate chains.', effect: 'After formations lock, each player secretly chooses one position in the enemy line. The two selected warriors swap armies and occupy those exact positions. Recalculate chains.', artKey: 'loki', theme: WATCHER_THEMES.loki },
  { id: 'watcher-heimdall', name: 'Heimdall', title: 'All-Seeing', timing: 'DURING · FORMATION', rules: 'Position 3 face-up in both lines.', effect: 'Position 3 is played face-up in both formations.', artKey: 'heimdall', theme: WATCHER_THEMES.heimdall },
  { id: 'watcher-frigg', name: 'Frigg', title: 'Foreknowledge', timing: 'AFTER · FORM LOCK', rules: 'Each player secretly views 1 enemy card. No changes.', effect: 'After formations lock, each player may secretly look at one enemy card. No changes afterward.', artKey: 'frigg', theme: WATCHER_THEMES.frigg },
  { id: 'watcher-skadi', name: 'Skaði', title: 'The Hunt', timing: 'AFTER · FORM LOCK', rules: 'Each player chooses 1 enemy slot. That warrior −2 Strength this Clash.', effect: 'After formations lock, each player chooses one enemy position. That warrior gets -2 Strength for its Clash.', artKey: 'skadi', theme: WATCHER_THEMES.skadi },
  { id: 'watcher-njordr', name: 'Njörðr', title: 'Turning Tide', timing: 'BEFORE · DRAFT', rules: 'Reverse the weapon triangle.', effect: 'Reverse the normal weapon triangle.', artKey: 'njordr', theme: WATCHER_THEMES.njordr },
  { id: 'watcher-the-norns', name: 'The Norns', title: 'Fate Favors the Frenzied', timing: 'BEFORE · CLASH 1', rules: 'Berserkers do not auto-lose the following Clash.', effect: 'Berserkers do not cause the following Clash to be automatically lost.', artKey: 'the-norns', theme: WATCHER_THEMES['the-norns'] },
  { id: 'watcher-fimbulwinter', name: 'Fimbulwinter', title: 'Frozen Ranks', timing: 'BEFORE · DRAFT', rules: 'No weapon-chain bonuses this Skirmish.', effect: 'No weapon-chain bonuses this skirmish.', artKey: 'fimbulwinter', theme: WATCHER_THEMES.fimbulwinter }
]
const RANK_FONT = join(fontDir, 'Bravyn Runeskald.ttf')
const LABEL_FONT = join(fontDir, 'Inter-SemiBold.ttf')

mkdirSync(outputDir, { recursive: true })
for (const file of readdirSync(outputDir)) {
  if (file.endsWith('.png') || file === 'manifest.json') unlinkSync(join(outputDir, file))
}
rmSync(tempDir, { recursive: true, force: true })
mkdirSync(tempDir, { recursive: true })

const pngData = (filePath) => `data:image/png;base64,${readFileSync(filePath).toString('base64')}`
const image = (href, x, y, w, h, extra = '') => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" ${extra}/>`
const artImage = (href, x, y, w, h) => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>`
const line = (x1, y1, x2, y2, color, strokeWidth = 2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" ${extra}/>`
const prepareWatcherArt = (artKey) => {
  const input = join(artDir, `${artKey}.png`)
  const mask = join(tempDir, `mask-${artKey}.png`)
  const alphaOutput = join(tempDir, `art-alpha-${artKey}.png`)
  const output = join(tempDir, `art-${artKey}.png`)
  const maskResult = spawnSync('magick', [input, '-colorspace', 'gray', '-negate', '-level', '10%,70%', mask], { encoding: 'utf8' })
  if (maskResult.status !== 0) throw new Error(`Could not create the art mask for ${artKey}: ${maskResult.stderr}`)
  const artResult = spawnSync('magick', [input, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', '-define', 'png:color-type=6', alphaOutput], { encoding: 'utf8' })
  if (artResult.status !== 0) throw new Error(`Could not create the harmonized art layer for ${artKey}: ${artResult.stderr}`)
  const flattenResult = spawnSync('magick', [alphaOutput, '-background', COLORS.bone, '-flatten', '-resize', '658x790^', '-gravity', 'center', '-extent', '658x790', '-define', 'png:color-type=6', output], { encoding: 'utf8' })
  if (flattenResult.status !== 0) throw new Error(`Could not flatten the harmonized art for ${artKey}: ${flattenResult.stderr}`)
  return output
}
const art = Object.fromEntries(WATCHER_CARDS.map((watcher) => [watcher.artKey, pngData(prepareWatcherArt(watcher.artKey))]))

const textCache = new Map()
const rasterText = (content, { w, h, size, color, font = LABEL_FONT, kerning = 0 }) => {
  const key = createHash('sha1').update(JSON.stringify({ content, w, h, size, color, font, kerning })).digest('hex')
  if (!textCache.has(key)) {
    const output = join(tempDir, `text-${key}.png`)
    const result = spawnSync('magick', [
      '-size', `${w}x${h}`,
      'xc:none',
      '-font', font,
      '-pointsize', String(size),
      '-kerning', String(kerning),
      '-fill', color,
      '-gravity', 'center',
      '-annotate', '+0+0', content,
      '-define', 'png:color-type=6',
      output,
    ], { encoding: 'utf8' })
    if (result.status !== 0) throw new Error(`Could not render text "${content}": ${result.stderr}`)
    textCache.set(key, pngData(output))
  }
  return textCache.get(key)
}

const textImage = (content, x, y, options) => image(rasterText(content, options), x - options.w / 2, y - options.h / 2, options.w, options.h)
const wrapText = (value, maxCharacters) => {
  const lines = []
  let lineText = ''
  for (const word of value.split(/\s+/)) {
    const candidate = lineText ? `${lineText} ${word}` : word
    if (lineText && candidate.length > maxCharacters) {
      lines.push(lineText)
      lineText = word
    } else {
      lineText = candidate
    }
  }
  if (lineText) lines.push(lineText)
  return lines
}
const glowDefs = (accent) => `
  <defs>
    <clipPath id="cardClip"><rect x="10" y="10" width="730" height="1030" rx="30"/></clipPath>
  </defs>
  <style>.accent{stroke:${accent};fill:none;stroke-linejoin:miter;stroke-linecap:square}</style>`

const sagaFrame = (theme) => `${glowDefs(theme.secondary)}
  <g clip-path="url(#cardClip)">
    <rect width="750" height="1050" fill="${COLORS.bone}"/>
    <rect x="20" y="20" width="710" height="1010" rx="27" fill="${theme.primary}"/>
    <rect x="23" y="23" width="704" height="1004" rx="24" fill="${COLORS.bone}"/>
  </g>`

const watcherCardSvg = (watcher) => {
  const effectLines = wrapText(watcher.rules, watcher.rules.length > 65 ? 42 : 50)
  const bodySize = watcher.rules.length > 65 ? 20 : 22
  const nameSize = watcher.name.length > 9 ? 36 : 48
  const titleSize = watcher.title.length > 23 ? 17 : 20
  const bodyStart = 980 - (effectLines.length - 1) * 22
  const body = effectLines.map((content, index) => textImage(content, 375, bodyStart + index * 22, {
    w: 590,
    h: 26,
    size: bodySize,
    color: COLORS.fjord,
    kerning: 0,
  })).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${sagaFrame(watcher.theme)}
    <g clip-path="url(#cardClip)">
      ${textImage('WATCHER', 375, 68, { w: 150, h: 20, size: 10, color: watcher.theme.secondary, kerning: 3 })}
      ${artImage(art[watcher.artKey], 46, 98, 658, 790)}
      <rect x="60" y="760" width="630" height="230" rx="8" fill="${COLORS.bone}" opacity="0.98"/>
      ${line(205, 784, 545, 784, watcher.theme.secondary, 2)}
      ${textImage(watcher.name.toUpperCase(), 375, 823, { w: 600, h: 58, size: nameSize, color: COLORS.charcoal, font: RANK_FONT, kerning: 1 })}
      ${textImage(watcher.title.toUpperCase(), 375, 858, { w: 600, h: 32, size: titleSize, color: watcher.theme.primary, kerning: 1.5 })}
      <rect x="242" y="875" width="266" height="26" rx="13" fill="${watcher.theme.secondary}" opacity="0.15"/>
      ${textImage(watcher.timing, 375, 888, { w: 250, h: 20, size: 13, color: watcher.theme.primary, kerning: 1.2 })}
      ${line(240, 910, 510, 910, watcher.theme.secondary, 1.5)}
      ${body}
    </g>
  </svg>`
}

const writePng = (fileName, svg) => {
  const svgPath = join(tempDir, `${fileName}.svg`)
  const outputPath = join(outputDir, `${fileName}.png`)
  writeFileSync(svgPath, svg)
  const result = spawnSync('magick', [svgPath, '-background', 'none', '-define', 'png:color-type=6', outputPath], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`Could not render ${fileName}: ${result.stderr}`)
}

for (const watcher of WATCHER_CARDS) writePng(watcher.id, watcherCardSvg(watcher))

writeFileSync(join(outputDir, 'manifest.json'), `${JSON.stringify({
  width,
  height,
  cardBack: '../cards/card-back.png',
  generatedAssets: WATCHER_CARDS.map((watcher) => `${watcher.artKey}.png`).sort(),
  cards: WATCHER_CARDS.map(({ theme, artKey, ...watcher }) => ({
    ...watcher,
    category: 'god',
    printedStrength: 0,
    file: `${watcher.id}.png`,
  })),
}, null, 2)}\n`)
rmSync(tempDir, { recursive: true, force: true })
console.log(`Generated ${WATCHER_CARDS.length} Watcher card fronts in ${outputDir}`)
