import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

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
const image = (href, x, y, w, h, extra = '') => `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" ${extra}/>`
const line = (x1, y1, x2, y2, color, strokeWidth = 2, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" ${extra}/>`

const art = {
  night: pngData(join(artDir, 'night-field.png')),
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

const nkMark = (x, y, markHeight, color, opacity = 1) => {
  const scale = markHeight / 1874
  const markWidth = 1085 * scale
  return `<g transform="translate(${x - markWidth / 2} ${y - markHeight / 2}) scale(${scale})" fill="${color}" stroke="${color}" stroke-width="38" stroke-linejoin="miter" opacity="${opacity}">
    <polygon points="122.65,407.02 214.20,499.35 214.31,1106.37 122.68,1200.09"/>
    <polygon points="122.65,407.02 971.70,1263.68 971.56,1397.50 122.65,540.84"/>
    <polygon points="467.52,82.56 559.97,172.14 559.80,1738.70 467.31,1643.41"/>
    <polygon points="559.97,782.77 941.44,407.67 941.55,541.48 559.97,916.58"/>
  </g>`
}

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

const nightFrame = (accent, segmented = false) => `${glowDefs(accent)}
  <g clip-path="url(#cardClip)">
    <rect width="750" height="1050" fill="${COLORS.obsidian}"/>
    ${image(art.night, 0, 0, 750, 1050, 'opacity="0.72"')}
    <rect width="750" height="1050" fill="${COLORS.fjord}" opacity="0.14"/>
    ${frameRails(COLORS.bone, accent)}
    ${segmented ? `<rect x="185" y="51" width="380" height="2" fill="${accent}"/><rect x="185" y="997" width="380" height="2" fill="${accent}"/><rect x="51" y="220" width="2" height="610" fill="${accent}"/><rect x="697" y="220" width="2" height="610" fill="${accent}"/>` : ''}
    ${angularCorners(accent)}
    ${nkMark(375, 67, 34, COLORS.bone, 0.8)}
    ${nkMark(375, 983, 34, COLORS.bone, 0.8)}
  </g>`

const sagaFrame = () => `${glowDefs(COLORS.aurora)}
  <g clip-path="url(#cardClip)">
    <rect width="750" height="1050" fill="${COLORS.bone}"/>
    ${frameRails(COLORS.charcoal, COLORS.fjord)}
    <rect x="175" y="45" width="400" height="1" fill="${COLORS.aurora}"/><rect x="175" y="1004" width="400" height="1" fill="${COLORS.aurora}"/>
    ${angularCorners(COLORS.charcoal)}
    ${nkMark(375, 67, 34, COLORS.aurora, 0.9)}
    ${nkMark(375, 983, 34, COLORS.aurora, 0.9)}
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

const pipGlyph = (weapon, x, y, size, accent, opacity = 1) => {
  const s = size / 100
  const common = `stroke-linejoin="miter" stroke-linecap="square" opacity="${opacity}"`
  const glow = `<circle cx="0" cy="0" r="37" fill="${accent}" opacity="0.08" filter="url(#accentGlow)"/>`
  let shape
  if (weapon === 'axe') {
    shape = `<path d="M0 -43V44 M0 -30L-15 -40L-42 -31L-34 -7L-13 1L0 -6L13 1L34 -7L42 -31L15 -40Z" fill="none" stroke="${accent}" stroke-width="5" ${common}/><path d="M0 -31V43 M-13 1H13" fill="none" stroke="${COLORS.bone}" stroke-width="5" ${common}/>`
  } else if (weapon === 'sword') {
    shape = `<path d="M0 -47L12 -31L5 25H-5L-12 -31Z" fill="none" stroke="${accent}" stroke-width="5" ${common}/><path d="M-24 24H24 M-9 24L-7 42H7L9 24" fill="none" stroke="${COLORS.bone}" stroke-width="5" ${common}/><path d="M0 -38V21" stroke="${COLORS.bone}" stroke-width="3" ${common}/>`
  } else {
    shape = `<path d="M0 -49L15 -29L0 -11L-15 -29Z" fill="none" stroke="${accent}" stroke-width="5" ${common}/><path d="M0 -12V45 M-11 15L0 5L11 15" fill="none" stroke="${COLORS.bone}" stroke-width="5" ${common}/>`
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">${glow}${shape}</g>`
}

const corner = ({ rank, weapon, accent, flipped = false, hero = false }) => {
  const value = String(rank)
  const adjustment = rankAdjustments[value] || { size: 92, dx: 0 }
  const rankImage = textImage(value, 92 + adjustment.dx, 102, {
    w: value === '10' ? 132 : 104,
    h: 118,
    size: adjustment.size,
    color: hero ? COLORS.charcoal : accent,
    font: RANK_FONT,
  })
  const mark = hero
    ? nkMark(92, 170, 36, COLORS.fjord, 0.9)
    : pipGlyph(weapon, 92, 170, 53, accent, 1)
  const group = `<g>${rankImage}${mark}</g>`
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
  const pips = pipPositions[rank].map(([x, y]) => pipGlyph(weapon, x, y, rank >= 8 ? 66 : 76, accent)).join('')
  const suitLabel = textImage(weapon.toUpperCase(), 375, 955, { w: 220, h: 28, size: 12, color: COLORS.bone, kerning: 6 })
  const special = isBloodsworn
    ? `${specialRail('BLOODSWORN', 'JOIN WITH NEXT WARRIOR', accent)}
       <g><polygon points="375,458 432,525 375,592 318,525" fill="${accent}"/><polygon points="375,468 423,525 375,582 327,525" fill="${COLORS.obsidian}"/><polygon points="375,485 409,525 375,565 341,525" fill="${COLORS.bone}"/><polygon points="375,494 401,525 375,556 349,525" fill="${COLORS.obsidian}"/><rect x="295" y="523" width="32" height="4" fill="${accent}"/><rect x="423" y="523" width="32" height="4" fill="${accent}"/></g>`
    : isShieldWall
      ? `${specialRail('SHIELD WALL', 'BREAK ANY CHAIN BONUSES', accent)}
         <rect x="185" y="279" width="380" height="3" fill="${accent}"/><rect x="185" y="769" width="380" height="3" fill="${accent}"/><rect x="185" y="279" width="3" height="493" fill="${accent}"/><rect x="562" y="279" width="3" height="493" fill="${accent}"/>
         <rect x="205" y="504" width="340" height="2" fill="${COLORS.bone}"/><rect x="205" y="544" width="340" height="2" fill="${COLORS.bone}"/>`
      : suitLabel
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${nightFrame(accent, isShieldWall)}
    <g clip-path="url(#cardClip)">
      ${corner({ rank, weapon, accent })}
      ${corner({ rank, weapon, accent, flipped: true })}
      ${pips}
      ${special}
    </g>
  </svg>`
}

const heroDetails = {
  ravenfeeder: { rank: 'R', label: 'RAVENFEEDER', ability: 'UNSUITED  ·  12 STRENGTH', artKey: 'ravenfeeder' },
  berserker: { rank: 'B', label: 'BERSERKER', ability: 'WIN THIS CLASH  ·  LOSE THE NEXT', artKey: 'berserker' },
  'shield-maiden': { rank: 'S', label: 'SHIELD MAIDEN', ability: 'VENGEANCE  ·  GAIN THE PREVIOUS DEFEAT MARGIN', artKey: 'shieldMaiden' },
  jarl: { rank: 'J', label: 'JARL', ability: 'LEAD BY EXAMPLE  ·  NEXT +3 WIN / +2 TIE / +1 LOSS', artKey: 'jarl' },
}

const heroCardSvg = ({ id }) => {
  const hero = heroDetails[id]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${sagaFrame()}
    <g clip-path="url(#cardClip)">
      ${corner({ rank: hero.rank, accent: COLORS.charcoal, hero: true })}
      ${corner({ rank: hero.rank, accent: COLORS.charcoal, hero: true, flipped: true })}
      ${image(art[hero.artKey], 73, 118, 604, 754)}
      <rect x="120" y="850" width="510" height="112" rx="8" fill="${COLORS.bone}" opacity="0.93"/>
      ${line(245, 869, 505, 869, COLORS.fjord, 1.5)}
      ${textImage(hero.label, 375, 895, { w: 500, h: 42, size: hero.label.length > 12 ? 25 : 29, color: COLORS.charcoal, kerning: 5 })}
      ${textImage(hero.ability, 375, 934, { w: 590, h: 30, size: hero.ability.length > 42 ? 10 : 12, color: COLORS.fjord, kerning: 1.5 })}
      ${line(280, 959, 470, 959, COLORS.aurora, 1.5, 'opacity="0.8"')}
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
