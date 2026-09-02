import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BATTLE_CARDS } from '../src/game/cards'

const cardAssetsDirectory = new URL('../public/assets/cards/', import.meta.url)
const fontsDirectory = new URL('../public/assets/fonts/', import.meta.url)
const brandDirectory = new URL('../public/assets/brand/', import.meta.url)
const cardManifest = new URL('manifest.json', cardAssetsDirectory)
const generatorSource = new URL('./generate-card-assets.mjs', import.meta.url)

const approvedBrandSourceHashes = new Map<URL, string>([
  [new URL('Bravyn Runeskald.ttf', fontsDirectory), 'fba2a50213023eafc014ed772a96f85a47ae4a0465371515b372f599ecc21864'],
  [new URL('Bravyn Runeskald LICENSE.txt', fontsDirectory), 'c702e8c8e5bccc9bd2f1671c041963130747cd6368f940e804a258670be55505'],
  [new URL('Inter-SemiBold.ttf', fontsDirectory), '78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3'],
  [new URL('Inter LICENSE.txt', fontsDirectory), '262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a'],
  [new URL('README.md', fontsDirectory), '057b1e0a5645c7a45a5c305b04c1fd5ee989d09814f6ff40805a76225d8e609a'],
  [new URL('norse-kode-logomark-cream.svg', brandDirectory), '5da677793dd4d5510c7cd6a88dcf353394abd11b74899df58fcaf6ff301692c5'],
])

function expectNonEmptyFile(file: URL) {
  expect(existsSync(file), `${file.pathname} should exist`).toBe(true)
  expect(statSync(file).size, `${file.pathname} should not be empty`).toBeGreaterThan(0)
}

function expectValidSfntFont(file: URL) {
  expectNonEmptyFile(file)

  const signature = readFileSync(file).subarray(0, 4)
  const isTrueType = signature.equals(Buffer.from([0x00, 0x01, 0x00, 0x00]))
  const textSignature = signature.toString('ascii')

  expect(isTrueType || textSignature === 'OTTO' || textSignature === 'true', `${file.pathname} should have a valid sfnt signature`).toBe(true)
}

describe('battle card assets', () => {
  it('generates the branded 42-card manifest with Jarl in the final Hero slot', () => {
    const manifest = JSON.parse(readFileSync(cardManifest, 'utf8'))
    const ids = manifest.cards.map((card: { id: string }) => card.id)

    expect(manifest).toMatchObject({ width: 750, height: 1050, cardBack: 'card-back.png' })
    expect(ids).toHaveLength(42)
    expect(ids.slice(-12)).toEqual([
      'ravenfeeder-1', 'ravenfeeder-2', 'ravenfeeder-3',
      'berserker-1', 'berserker-2', 'berserker-3',
      'shield-maiden-1', 'shield-maiden-2', 'shield-maiden-3',
      'jarl-1', 'jarl-2', 'jarl-3',
    ])
    expect(ids.some((id: string) => id.startsWith('skald-'))).toBe(false)
  })

  it('declares the approved Night and Saga generator language', () => {
    const source = readFileSync(generatorSource, 'utf8')

    for (const token of ['#1E2227', '#0D0F12', '#18303C', '#EAE2D0', '#46E3A8', '#FF7A3D', '#A970FF']) {
      expect(source).toContain(token)
    }
    for (const phrase of ['Bravyn Runeskald.ttf', 'Inter-SemiBold.ttf', 'night-field.png', 'JOIN WITH NEXT WARRIOR', 'BREAK ANY CHAIN BONUSES', 'LEAD BY EXAMPLE']) {
      expect(source).toContain(phrase)
    }
  })

  it('keeps fronts logo-free and preserves the established weapon and special emblems', () => {
    const source = readFileSync(generatorSource, 'utf8')

    expect(source).not.toContain('nkMark')
    for (const asset of [
      'axe-emblem.png',
      'sword-emblem.png',
      'spear-emblem.png',
      'bloodsworn-emblem.png',
      'shield-wall-emblem.png',
    ]) {
      expect(source).toContain(asset)
    }
    expect(source).toContain('specialCornerBadge')
  })

  it('has a PNG asset for every battle card ID', () => {
    const missingAssetIds = BATTLE_CARDS
      .filter((card) => !existsSync(new URL(`${card.id}.png`, cardAssetsDirectory)))
      .map((card) => card.id)

    expect(missingAssetIds).toEqual([])
  })

  it('bundles the approved brand source files byte-for-byte', () => {
    for (const [file, approvedHash] of approvedBrandSourceHashes) {
      expectNonEmptyFile(file)
      expect(createHash('sha256').update(readFileSync(file)).digest('hex'), `${file.pathname} should match the approved SHA-256`).toBe(approvedHash)
    }
  })

  it('bundles valid sfnt font files', () => {
    expectValidSfntFont(new URL('Bravyn Runeskald.ttf', fontsDirectory))
    expectValidSfntFont(new URL('Inter-SemiBold.ttf', fontsDirectory))
  })

  it('bundles a safe, single-rooted cream NK logomark SVG', () => {
    const logo = new URL('norse-kode-logomark-cream.svg', brandDirectory)
    expectNonEmptyFile(logo)

    const source = readFileSync(logo, 'utf8')
    const documentRoot = source.replace(/^\uFEFF?\s*<\?xml[^?]*\?>\s*/i, '').trim()

    expect(documentRoot).toMatch(/^<svg(?:\s|>)/i)
    expect(source.match(/<svg(?:\s|>)/gi) ?? []).toHaveLength(1)
    expect(documentRoot).toMatch(/<\/svg>\s*$/i)
    expect(source).not.toMatch(/<script(?:\s|>)/i)
    expect(source).not.toMatch(/javascript\s*:/i)
    expect(source).not.toMatch(/<foreignObject(?:\s|>)/i)
    expect(source).not.toMatch(/\b(?:href|xlink:href)\s*=\s*["']\s*https?:\/\//i)
  })
})
