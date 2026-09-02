import type { Card, WeaponType } from './types'

const weaponNames: Record<Exclude<WeaponType, 'none'>, string> = {
  axe: 'Axe',
  sword: 'Sword',
  spear: 'Spear',
}

const makeStandardCards = (): Card[] => {
  const cards: Card[] = []
  for (const weaponType of ['axe', 'sword', 'spear'] as const) {
    for (let rank = 1; rank <= 10; rank += 1) {
      const category = rank === 5 ? 'bloodsworn' : rank === 6 ? 'shield_wall' : 'standard'
      const name = rank === 5
        ? `Bloodsworn of ${weaponNames[weaponType]}s`
        : rank === 6
          ? `${weaponNames[weaponType]} Shield Wall`
          : `${weaponNames[weaponType]} ${rank}`
      cards.push({
        id: `${weaponType}-${rank}`,
        name,
        category,
        weaponType,
        printedStrength: rank,
        rank,
        abilityType: 'none',
        abilityConfig: {},
        isHero: false,
        isGod: false,
      })
    }
  }
  return cards
}

const makeHeroCards = (): Card[] => {
  const heroes: Array<Pick<Card, 'id' | 'name' | 'printedStrength' | 'abilityType'>> = [
    { id: 'ravenfeeder', name: 'Ravenfeeder', printedStrength: 12, abilityType: 'ravenfeeder' },
    { id: 'berserker', name: 'Berserker', printedStrength: 11, abilityType: 'berserker' },
    { id: 'shield-maiden', name: 'Shield Maiden', printedStrength: 11, abilityType: 'shield_maiden' },
    { id: 'jarl', name: 'Jarl', printedStrength: 11, abilityType: 'jarl' },
  ]

  return heroes.flatMap((hero) => Array.from({ length: 3 }, (_, index) => ({
    ...hero,
    id: `${hero.id}-${index + 1}`,
    category: 'hero' as const,
    weaponType: 'none' as const,
    rank: null,
    abilityConfig: {},
    isHero: true,
    isGod: false,
  })))
}

export const BATTLE_CARDS: Card[] = [...makeStandardCards(), ...makeHeroCards()]

export const GOD_CARDS: Card[] = [
  'Odin',
  'Thor',
  'Loki',
  'Týr',
  'Freyja',
  'Freyr',
  'Heimdall',
  'Njörðr',
  'Hel',
  'The Norns',
].map((name, index) => ({
  id: `god-${index + 1}`,
  name,
  category: 'god',
  weaponType: 'none',
  printedStrength: 0,
  rank: null,
  abilityType: 'none',
  abilityConfig: { effect: 'disabled' },
  isHero: false,
  isGod: true,
}))

export const getCard = (cards: Card[], id: string): Card | undefined => cards.find((card) => card.id === id)
