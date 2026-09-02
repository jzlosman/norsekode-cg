import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const artDir = join(root, 'public/assets/card-art')
const outputDir = join(root, 'public/assets/cards')
const tempDir = join(root, '.tmp-card-assets')
const width = 750
const height = 1050
const paper = '#f4ead7'
const ink = '#241d19'
const mutedInk = '#6f5e4d'
const accentColors = {
  axe: '#963c34',
  sword: '#466a79',
  spear: '#aa7d32',
  none: '#5e4d6e',
}
const paperTints = {
  axe: '#f2e0da',
  sword: '#e1ebed',
  spear: '#f3e8cf',
  none: '#ebe3ef',
}

mkdirSync(outputDir, { recursive: true })
for (const file of readdirSync(outputDir)) {
  if (file.endsWith('.png') || file === 'manifest.json') unlinkSync(join(outputDir, file))
}
mkdirSync(tempDir, { recursive: true })

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const pngData = (filePath) => `data:image/png;base64,${readFileSync(filePath).toString('base64')}`

const removeFlatBackground = (fileName, opacity = 1) => {
  const input = join(artDir, fileName)
  const output = join(tempDir, `transparent-${fileName}`)
  const finalOutput = opacity === 1 ? output : join(tempDir, `fade-${opacity}-${fileName}`)
  const background = execFileSync('magick', [input, '-format', '%[pixel:p{0,0}]', 'info:'], { encoding: 'utf8' }).trim()
  const result = spawnSync('magick', [
    input,
    '-alpha', 'on',
    '-bordercolor', background,
    '-border', '1',
    '-fuzz', '8%',
    '-fill', 'none',
    '-draw', 'color 1,1 floodfill',
    '-shave', '1x1',
    output,
  ], { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`Could not remove background from ${fileName}: ${result.stderr}`)
  }
  if (opacity !== 1) {
    const faded = spawnSync('magick', [output, '-channel', 'A', '-evaluate', 'multiply', String(opacity), '+channel', finalOutput], { encoding: 'utf8' })
    if (faded.status !== 0) throw new Error(`Could not fade ${fileName}: ${faded.stderr}`)
  }
  return finalOutput
}

const art = {
  axe: pngData(removeFlatBackground('axe-emblem.png')),
  sword: pngData(removeFlatBackground('sword-emblem.png')),
  spear: pngData(removeFlatBackground('spear-emblem.png')),
  bloodsworn: pngData(removeFlatBackground('bloodsworn-emblem.png')),
  shield_wall: pngData(removeFlatBackground('shield-wall-emblem.png')),
  ravenfeeder: pngData(removeFlatBackground('ravenfeeder.png')),
  berserker: pngData(removeFlatBackground('berserker.png')),
  shield_maiden: pngData(removeFlatBackground('shield-maiden.png')),
  skald: pngData(removeFlatBackground('skald.png')),
  cardBack: pngData(join(artDir, 'card-back-art.png')),
}

const image = (href, x, y, w, h, extra = '') => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" ${extra}/>`
const withDefaultFill = (defaultFill, extra) => /\bfill=/.test(extra) ? '' : `fill="${defaultFill}"`
const text = (content, x, y, size, extra = '') => `<text x="${x}" y="${y}" font-family="Georgia, Times New Roman, serif" font-size="${size}px" ${withDefaultFill(ink, extra)} ${extra}>${escapeXml(content)}</text>`
const sansText = (content, x, y, size, extra = '') => `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}px" ${withDefaultFill(mutedInk, extra)} ${extra}>${escapeXml(content)}</text>`
const line = (x1, y1, x2, y2, color, strokeWidth = 2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}"/>`

const cardFrame = (accent, paperFill = paper) => `
  <defs>
    <clipPath id="cardClip"><rect x="10" y="10" width="730" height="1030" rx="30"/></clipPath>
  </defs>
  <g clip-path="url(#cardClip)">
    <rect width="750" height="1050" fill="${paperFill}"/>
    <rect x="17" y="17" width="716" height="1016" rx="26" fill="none" stroke="${accent}" stroke-width="6"/>
    <rect x="31" y="31" width="688" height="988" rx="18" fill="none" stroke="${ink}" stroke-width="2"/>
    <path d="M58 145V58h87 M692 145V58h-87 M58 905v87h87 M692 905v87h-87" fill="none" stroke="${accent}" stroke-width="4"/>
    <path d="M72 117l18-18 18 18-18 18z M678 117l-18-18-18 18 18 18z M72 933l18 18 18-18-18-18z M678 933l-18 18-18-18 18-18z" fill="none" stroke="${accent}" stroke-width="2"/>
  </g>
`

const corner = ({ rank, weapon, accent, special, flipped = false }) => {
  const markY = 20
  const specialY = 82
  const mark = weapon !== 'none'
    ? image(art[weapon], -29, markY, 58, 58)
    : `<circle cx="0" cy="${markY + 28}" r="21" fill="none" stroke="${accent}" stroke-width="2"/><path d="M0 ${markY + 10}l4 13 13 5-13 4-4 14-4-14-13-4 13-5z" fill="none" stroke="${accent}" stroke-width="2"/>`
  const specialMark = special ? image(art[special], -17, specialY, 34, 34) : ''
  const transform = flipped ? 'matrix(-1 0 0 -1 750 1050) translate(100 111)' : 'translate(100 111)'
  return `<g transform="${transform}">
    ${text(String(rank), 0, 0, 84, `font-weight="700" text-anchor="middle" fill="${accent}"`)}
    ${mark}
    ${specialMark}
  </g>`
}

const pipImage = (href, x, y, size) => image(href, x - size / 2, y - size / 2, size, size)

const pipPositions = {
  1: [[375, 525]],
  2: [[375, 325], [375, 725]],
  3: [[375, 300], [375, 525], [375, 750]],
  4: [[255, 350], [495, 350], [255, 700], [495, 700]],
  5: [[255, 325], [495, 325], [375, 525], [255, 725], [495, 725]],
  6: [[255, 310], [495, 310], [255, 525], [495, 525], [255, 740], [495, 740]],
  7: [[255, 300], [495, 300], [255, 525], [375, 525], [495, 525], [255, 750], [495, 750]],
  8: [[255, 285], [495, 285], [255, 430], [495, 430], [255, 620], [495, 620], [255, 765], [495, 765]],
  9: [[255, 285], [375, 285], [495, 285], [255, 525], [375, 525], [495, 525], [255, 765], [375, 765], [495, 765]],
  10: [[250, 275], [500, 275], [250, 400], [500, 400], [250, 525], [500, 525], [250, 650], [500, 650], [250, 775], [500, 775]],
}

const standardCardSvg = ({ weapon, rank, category, name }) => {
  const accent = accentColors[weapon]
  const isBloodsworn = category === 'bloodsworn'
  const isShieldWall = category === 'shield_wall'
  const pipArt = art[weapon]
  const pips = pipPositions[rank].map(([x, y]) => pipImage(pipArt, x, y, 140)).join('')
  const special = isBloodsworn ? 'bloodsworn' : isShieldWall ? 'shield_wall' : undefined
  const specialLabel = isBloodsworn ? 'BLOODSWORN' : isShieldWall ? 'SHIELD WALL' : weapon.toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${cardFrame(accent, paperTints[weapon])}
    <g clip-path="url(#cardClip)">
      ${corner({ rank, weapon, accent, special })}
      ${corner({ rank, weapon, accent, special, flipped: true })}
      ${pips}
      ${isBloodsworn || isShieldWall ? `<g>${sansText(`${specialLabel}  ·  ${weapon.toUpperCase()}`, 375, 235, 12, `text-anchor="middle" font-weight="700" letter-spacing="4" fill="${accent}"`)}<g transform="matrix(-1 0 0 -1 750 1050)">${sansText(`${specialLabel}  ·  ${weapon.toUpperCase()}`, 375, 235, 12, `text-anchor="middle" font-weight="700" letter-spacing="4" fill="${accent}"`)}</g></g>` : sansText(specialLabel, 375, 976, 12, `text-anchor="middle" font-weight="700" letter-spacing="4" fill="${accent}"`)}
    </g>
  </svg>`
}

const heroDetails = {
  ravenfeeder: { label: 'RAVENFEEDER', ability: 'UNSUITED  ·  12 STRENGTH', artKey: 'ravenfeeder' },
  berserker: { label: 'BERSERKER', ability: 'WIN THIS CLASH  ·  LOSE THE NEXT', artKey: 'berserker' },
  'shield-maiden': { label: 'SHIELD MAIDEN', ability: 'PRIMARY  ·  + PREVIOUS FINAL DEFEAT MARGIN', artKey: 'shield_maiden' },
  skald: { label: 'SKALD', ability: 'CONSUMED OK  ·  NEXT +3 WIN / +2 TIE / +1 LOSS', artKey: 'skald' },
}

const heroCardSvg = ({ id, name, strength }) => {
  const hero = heroDetails[id]
  const accent = id === 'berserker' ? accentColors.axe : id === 'ravenfeeder' ? accentColors.sword : id === 'shield-maiden' ? accentColors.spear : accentColors.none
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${cardFrame(accent, paperTints.none)}
    <g clip-path="url(#cardClip)">
      ${corner({ rank: strength, weapon: 'none', accent })}
      ${corner({ rank: strength, weapon: 'none', accent, flipped: true })}
      ${sansText('HERO', 375, 78, 12, `text-anchor="middle" font-weight="700" letter-spacing="5" fill="${accent}"`)}
      ${line(298, 105, 452, 105, accent, 1)}
      <rect x="69" y="178" width="612" height="638" rx="12" fill="${paperTints.none}" stroke="${accent}" stroke-width="2"/>
      ${image(art[hero.artKey], 82, 188, 586, 615)}
      ${text(hero.label, 375, 920, hero.label.length > 13 ? 19 : 23, `text-anchor="middle" font-weight="700" letter-spacing="2"`)}
      ${sansText(hero.ability, 375, 950, 10, `text-anchor="middle" font-weight="700" letter-spacing="1.5" fill="${accent}"`)}
      ${sansText('THE SAGA REMEMBERS', 375, 982, 9, `text-anchor="middle" font-weight="700" letter-spacing="3" fill="${mutedInk}"`)}
    </g>
  </svg>`
}

const cardBackSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><clipPath id="backClip"><rect x="10" y="10" width="730" height="1030" rx="30"/></clipPath></defs>
  <g clip-path="url(#backClip)">
    <rect width="750" height="1050" fill="#241b17"/>
    ${image(art.cardBack, 10, 10, 730, 1030)}
    <rect x="19" y="19" width="712" height="1012" rx="24" fill="none" stroke="#f0ddbb" stroke-width="3"/>
  </g>
</svg>`

const writePng = (fileName, svg) => {
  const svgPath = join(tempDir, `${fileName}.svg`)
  const outputPath = join(outputDir, `${fileName}.png`)
  writeFileSync(svgPath, svg)
  const result = spawnSync('magick', [svgPath, '-background', 'none', '-define', 'png:color-type=6', outputPath], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`Could not render ${fileName}: ${result.stderr}`)
}

const cards = []
for (const weapon of ['axe', 'sword', 'spear']) {
  for (let rank = 1; rank <= 10; rank += 1) {
    const category = rank === 5 ? 'bloodsworn' : rank === 6 ? 'shield_wall' : 'standard'
    const plural = weapon === 'sword' ? 'Swords' : `${weapon[0].toUpperCase()}${weapon.slice(1)}s`
    const name = rank === 5 ? `Bloodsworn of ${plural}` : rank === 6 ? `${weapon[0].toUpperCase()}${weapon.slice(1)} Shield Wall` : `${weapon[0].toUpperCase()}${weapon.slice(1)} ${rank}`
    const id = `${weapon}-${rank}`
    writePng(id, standardCardSvg({ weapon, rank, category, name }))
    cards.push({ id, name, category, printedStrength: rank, file: `${id}.png` })
  }
}

const heroes = [
  { id: 'ravenfeeder', name: 'Ravenfeeder', strength: 12 },
  { id: 'berserker', name: 'Berserker', strength: 11 },
  { id: 'shield-maiden', name: 'Shield Maiden', strength: 11 },
  { id: 'skald', name: 'Skald', strength: 11 },
]
for (const hero of heroes) {
  for (let copy = 1; copy <= 3; copy += 1) {
    const id = `${hero.id}-${copy}`
    writePng(id, heroCardSvg(hero))
    cards.push({ id, name: hero.name, category: 'hero', printedStrength: hero.strength, file: `${id}.png` })
  }
}
writePng('card-back', cardBackSvg())
writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify({ width, height, cardBack: 'card-back.png', generatedAssets: readdirSync(artDir).sort(), cards }, null, 2) + '\n')
rmSync(tempDir, { recursive: true, force: true })
console.log(`Generated ${cards.length} card fronts and ${join(outputDir, 'card-back.png')}`)
