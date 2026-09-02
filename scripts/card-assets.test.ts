import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BATTLE_CARDS } from '../src/game/cards'

const cardAssetsDirectory = new URL('../public/assets/cards/', import.meta.url)

describe('battle card assets', () => {
  it('has a PNG asset for every battle card ID', () => {
    const missingAssetIds = BATTLE_CARDS
      .filter((card) => !existsSync(new URL(`${card.id}.png`, cardAssetsDirectory)))
      .map((card) => card.id)

    expect(missingAssetIds).toEqual([])
  })
})
