import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const artDir = join(root, 'public/assets/card-art')
const fontDir = join(root, 'public/assets/fonts')
const outputDir = join(root, 'public/assets/cards')
const tempDir = join(root, '.tmp-card-assets')

const width = 750
const height = 1050
const COLORS = {
  charcoal: '#1E2227',
  obsidian: '#0D0F12',
  fjord: '#18303C',
  bone: '#EAE2D0',
  aurora: '#46E3A8',
  axe: '#FF7A3D',
  sword: '#46E3A8',
  spear: '#A970FF',
}
const HERO_THEMES = {
  ravenfeeder: { primary: '#182B3A', secondary: '#425D70' },
  berserker: { primary: '#842E2A', secondary: '#9B413A' },
  shieldMaiden: { primary: '#26577A', secondary: '#396887' },
  jarl: { primary: '#725615', secondary: '#7C5E1A' },
}
const RANK_FONT = join(fontDir, 'Bravyn Runeskald.ttf')
const LABEL_FONT = join(fontDir, 'Inter-SemiBold.ttf')

mkdirSync(outputDir, { recursive: true })
for (const file of readdirSync(outputDir)) {
  if (file.endsWith('.png') || file === 'manifest.json') unlinkSync(join(outputDir, file))
}
rmSync(tempDir, { recursive: true, force: true })
mkdirSync(tempDir, { recursive: true })

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

const pngData = (filePath) => `data:image/png;base64,${readFileSync(filePath).toString('base64')}`
const removeFlatBackground = (fileName) => {
  const input = join(artDir, fileName)
  const output = join(tempDir, `transparent-${fileName}`)
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
  if (result.status !== 0) throw new Error(`Could not remove the background from ${fileName}: ${result.stderr}`)
  return output
}
const image = (href, x, y, w, h, extra = '') => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" ${extra}/>`
const line = (x1, y1, x2, y2, color, strokeWidth = 2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" ${extra}/>`

const art = {
  night: pngData(join(artDir, 'night-field.png')),
  axe: pngData(removeFlatBackground('axe-emblem.png')),
  sword: pngData(removeFlatBackground('sword-emblem.png')),
  spear: pngData(removeFlatBackground('spear-emblem.png')),
  bloodsworn: pngData(removeFlatBackground('bloodsworn-emblem.png')),
  shieldWall: pngData(removeFlatBackground('shield-wall-emblem.png')),
  ravenfeeder: pngData(join(artDir, 'ravenfeeder.png')),
  berserker: pngData(join(artDir, 'berserker.png')),
  shieldMaiden: pngData(join(artDir, 'shield-maiden.png')),
  jarl: pngData(join(artDir, 'jarl.png')),
  cardBack: pngData(join(artDir, 'card-back-art.png')),
}

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
const rotated = (content) => `<g transform="matrix(-1 0 0 -1 ${width} ${height})">${content}</g>`

const glowDefs = (accent) => `
  <defs>
    <clipPath id="cardClip"><rect x="10" y="10" width="730" height="1030" rx="30"/></clipPath>
    <filter id="accentGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <style>.accent{stroke:${accent};fill:none;stroke-linejoin:miter;stroke-linecap:square}</style>`

const frameRails = (primary, accent) => `
  <rect x="23" y="23" width="704" height="3" fill="${primary}"/><rect x="23" y="1024" width="704" height="3" fill="${primary}"/>
  <rect x="23" y="23" width="3" height="1004" fill="${primary}"/><rect x="724" y="23" width="3" height="1004" fill="${primary}"/>
  <rect x="37" y="37" width="676" height="2" fill="${accent}"/><rect x="37" y="1011" width="676" height="2" fill="${accent}"/>
  <rect x="37" y="37" width="2" height="976" fill="${accent}"/><rect x="711" y="37" width="2" height="976" fill="${accent}"/>`

const angularCorners = (color) => `
  <rect x="55" y="55" width="88" height="3" fill="${color}"/><rect x="55" y="55" width="3" height="88" fill="${color}"/>
  <rect x="607" y="55" width="88" height="3" fill="${color}"/><rect x="692" y="55" width="3" height="88" fill="${color}"/>
  <rect x="55" y="992" width="88" height="3" fill="${color}"/><rect x="55" y="907" width="3" height="88" fill="${color}"/>
  <rect x="607" y="992" width="88" height="3" fill="${color}"/><rect x="692" y="907" width="3" height="88" fill="${color}"/>`

const nightFrame = (accent) => `${glowDefs(accent)}
  <g clip-path="url(#cardClip)">
    <rect width="750" height="1050" fill="${COLORS.obsidian}"/>
    ${image(art.night, 0, 0, 750, 1050, 'opacity="0.72"')}
    <rect width="750" height="1050" fill="${COLORS.fjord}" opacity="0.14"/>
    ${frameRails(COLORS.bone, accent)}
    ${angularCorners(accent)}
  </g>`

const sagaFrame = (theme) => `${glowDefs(theme.secondary)}
  <g clip-path="url(#cardClip)">
    <rect width="750" height="1050" fill="${COLORS.bone}"/>
    ${frameRails(theme.primary, theme.secondary)}
    <rect x="175" y="45" width="400" height="2" fill="${theme.secondary}"/><rect x="175" y="1003" width="400" height="2" fill="${theme.secondary}"/>
    ${angularCorners(theme.primary)}
  </g>`

const rankAdjustments = {
  '1': { size: 100, dx: -2 },
  '4': { size: 94, dx: 1 },
  '6': { size: 90, dx: 0 },
  '9': { size: 90, dx: 0 },
  '10': { size: 80, dx: 2 },
  S: { size: 92, dx: 0 },
  B: { size: 88, dx: 0 },
  R: { size: 88, dx: 0 },
  J: { size: 92, dx: 0 },
}

const pipImage = (href, x, y, size) => image(href, x - size / 2, y - size / 2, size, size)
const specialCornerBadge = (special, x = 92, y = 224) => special ? pipImage(art[special], x, y, 54) : ''

const corner = ({ rank, weapon, accent, special, flipped = false, hero = false }) => {
  const value = String(rank)
  const adjustment = rankAdjustments[value] || { size: 92, dx: 0 }
  const rankImage = textImage(value, 92 + adjustment.dx, 102, {
    w: value === '10' ? 132 : 104,
    h: 118,
    size: adjustment.size,
    color: accent,
    font: RANK_FONT,
  })
  const weaponMark = hero ? '' : pipImage(art[weapon], 92, 170, 58)
  const group = `<g>${rankImage}${weaponMark}${specialCornerBadge(special)}</g>`
  return flipped ? rotated(group) : group
}

const pipPositions = {
  1: [[375, 525]],
  2: [[375, 330], [375, 720]],
  3: [[375, 300], [375, 525], [375, 750]],
  4: [[255, 345], [495, 345], [255, 705], [495, 705]],
  5: [[255, 315], [495, 315], [375, 525], [255, 735], [495, 735]],
  6: [[255, 300], [495, 300], [255, 525], [495, 525], [255, 750], [495, 750]],
  7: [[255, 285], [495, 285], [255, 505], [375, 525], [495, 505], [255, 765], [495, 765]],
  8: [[255, 275], [495, 275], [255, 435], [495, 435], [255, 615], [495, 615], [255, 775], [495, 775]],
  9: [[245, 275], [375, 275], [505, 275], [245, 525], [375, 525], [505, 525], [245, 775], [375, 775], [505, 775]],
  10: [[250, 260], [500, 260], [250, 390], [500, 390], [250, 525], [500, 525], [250, 660], [500, 660], [250, 790], [500, 790]],
}

const specialRail = (title, rule, accent) => {
  const content = `<g>
    ${line(220, 202, 530, 202, accent, 1.5, 'opacity="0.8"')}
    ${textImage(title, 375, 222, { w: 360, h: 30, size: 17, color: COLORS.bone, kerning: 4 })}
    ${textImage(rule, 375, 249, { w: 430, h: 25, size: 11, color: accent, kerning: 2 })}
  </g>`
  return `${content}${rotated(content)}`
}

const standardCardSvg = ({ weapon, rank, category }) => {
  const accent = COLORS[weapon]
  const isBloodsworn = category === 'bloodsworn'
  const isShieldWall = category === 'shield_wall'
  const pips = pipPositions[rank].map(([x, y]) => pipImage(art[weapon], x, y, 140)).join('')
  const suitLabel = textImage(weapon.toUpperCase(), 375, 955, { w: 220, h: 28, size: 12, color: COLORS.bone, kerning: 6 })
  const specialKey = isBloodsworn ? 'bloodsworn' : isShieldWall ? 'shieldWall' : undefined
  const faceLabel = isBloodsworn
    ? specialRail('BLOODSWORN', 'JOIN WITH NEXT WARRIOR', accent)
    : isShieldWall
      ? specialRail('SHIELD WALL', 'BREAK ANY CHAIN BONUSES', accent)
      : suitLabel
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${nightFrame(accent)}
    <g clip-path="url(#cardClip)">
      ${corner({ rank, weapon, accent, special: specialKey })}
      ${corner({ rank, weapon, accent, special: specialKey, flipped: true })}
      ${pips}
      ${faceLabel}
    </g>
  </svg>`
}

const heroDetails = {
  ravenfeeder: { rank: 'R', label: 'RAVENFEEDER', ability: 'UNSUITED  ·  12 STRENGTH', artKey: 'ravenfeeder', theme: HERO_THEMES.ravenfeeder },
  berserker: { rank: 'B', label: 'BERSERKER', ability: 'WIN THIS CLASH  ·  LOSE THE NEXT', artKey: 'berserker', theme: HERO_THEMES.berserker },
  'shield-maiden': { rank: 'S', label: 'SHIELD MAIDEN', ability: 'VENGEANCE  ·  GAIN THE PREVIOUS DEFEAT MARGIN', artKey: 'shieldMaiden', theme: HERO_THEMES.shieldMaiden },
  jarl: { rank: 'J', label: 'JARL', ability: 'LEAD BY EXAMPLE  ·  NEXT +3 WIN / +2 TIE / +1 LOSS', artKey: 'jarl', theme: HERO_THEMES.jarl },
}

const heroCardSvg = ({ id }) => {
  const hero = heroDetails[id]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${sagaFrame(hero.theme)}
    <g clip-path="url(#cardClip)">
      ${corner({ rank: hero.rank, accent: hero.theme.primary, hero: true })}
      ${corner({ rank: hero.rank, accent: hero.theme.primary, hero: true, flipped: true })}
      ${image(art[hero.artKey], 73, 118, 604, 754)}
      <rect x="120" y="850" width="510" height="112" rx="8" fill="${COLORS.bone}" opacity="0.93"/>
      ${line(245, 869, 505, 869, hero.theme.secondary, 2)}
      ${textImage(hero.label, 375, 895, { w: 500, h: 42, size: hero.label.length > 12 ? 25 : 29, color: COLORS.charcoal, kerning: 5 })}
      ${textImage(hero.ability, 375, 934, { w: 590, h: 30, size: hero.ability.length > 42 ? 10 : 12, color: COLORS.fjord, kerning: 1.5 })}
      ${line(280, 959, 470, 959, hero.theme.secondary, 2)}
    </g>
  </svg>`
}

const cardBackSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><clipPath id="backClip"><rect x="10" y="10" width="730" height="1030" rx="30"/></clipPath></defs>
  <g clip-path="url(#backClip)">
    <rect width="750" height="1050" fill="${COLORS.obsidian}"/>
    ${image(art.cardBack, 10, 10, 730, 1030)}
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
    writePng(id, standardCardSvg({ weapon, rank, category }))
    cards.push({ id, name, category, printedStrength: rank, file: `${id}.png` })
  }
}

const heroes = [
  { id: 'ravenfeeder', name: 'Ravenfeeder', strength: 12 },
  { id: 'berserker', name: 'Berserker', strength: 11 },
  { id: 'shield-maiden', name: 'Shield Maiden', strength: 11 },
  { id: 'jarl', name: 'Jarl', strength: 11 },
]
for (const hero of heroes) {
  for (let copy = 1; copy <= 3; copy += 1) {
    const id = `${hero.id}-${copy}`
    writePng(id, heroCardSvg(hero))
    cards.push({ id, name: hero.name, category: 'hero', printedStrength: hero.strength, file: `${id}.png` })
  }
}

writePng('card-back', cardBackSvg())
writeFileSync(join(outputDir, 'manifest.json'), `${JSON.stringify({
  width,
  height,
  cardBack: 'card-back.png',
  generatedAssets: readdirSync(artDir).sort(),
  cards,
}, null, 2)}\n`)
rmSync(tempDir, { recursive: true, force: true })
console.log(`Generated ${cards.length} branded card fronts and ${join(outputDir, 'card-back.png')}`)
