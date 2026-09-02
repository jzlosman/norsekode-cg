import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BATTLE_CARDS } from '../src/game/cards'

const cardAssetsDirectory = new URL('../public/assets/cards/', import.meta.url)
const fontsDirectory = new URL('../public/assets/fonts/', import.meta.url)
const brandDirectory = new URL('../public/assets/brand/', import.meta.url)

function expectNonEmptyFile(file: URL) {
  expect(existsSync(file), `${file.pathname} should exist`).toBe(true)
  expect(statSync(file).size, `${file.pathname} should not be empty`).toBeGreaterThan(0)
}

describe('battle card assets', () => {
  it('has a PNG asset for every battle card ID', () => {
    const missingAssetIds = BATTLE_CARDS
      .filter((card) => !existsSync(new URL(`${card.id}.png`, cardAssetsDirectory)))
      .map((card) => card.id)

    expect(missingAssetIds).toEqual([])
  })

  it('bundles the Bravyn display font and commercial-use notice', () => {
    expectNonEmptyFile(new URL('Bravyn Runeskald.ttf', fontsDirectory))
    expectNonEmptyFile(new URL('Bravyn Runeskald LICENSE.txt', fontsDirectory))
  })

  it('bundles the Inter Semibold font and full SIL OFL license', () => {
    expectNonEmptyFile(new URL('Inter-SemiBold.ttf', fontsDirectory))
    expectNonEmptyFile(new URL('Inter LICENSE.txt', fontsDirectory))
  })

  it('bundles the exact owned cream NK logomark as SVG', () => {
    const logo = new URL('norse-kode-logomark-cream.svg', brandDirectory)
    expectNonEmptyFile(logo)

    const source = readFileSync(logo, 'utf8').toLowerCase()
    expect(source).toContain('<svg')
    expect(source).not.toContain('<html')
  })
})
