import { describe, expect, it } from 'vitest'
import { BATTLE_CARDS } from './cards'
import { DEFAULT_CONFIG } from './config'
import { beginSkirmish, computeChainBonuses, createWar, draftCard, lockFormation, reorderFormation, revealOaths, resolveClash, resolveCurrentClash } from './engine'
import type { Card } from './types'

const card = (overrides: Partial<Card>): Card => ({
  id: 'test',
  name: 'Test warrior',
  category: 'standard',
  weaponType: 'axe',
  printedStrength: 1,
  rank: 1,
  abilityType: 'none',
  abilityConfig: {},
  isHero: false,
  isGod: false,
  ...overrides,
})

describe('chain calculation', () => {
  it('increments consecutive same-weapon bonuses from the original formation', () => {
    const formation = [
      card({ id: 'a2', weaponType: 'axe', printedStrength: 2 }),
      card({ id: 'a5', weaponType: 'axe', printedStrength: 5, category: 'bloodsworn' }),
      card({ id: 'a8', weaponType: 'axe', printedStrength: 8 }),
      card({ id: 's7', weaponType: 'sword', printedStrength: 7 }),
      card({ id: 's10', weaponType: 'sword', printedStrength: 10 }),
    ]

    expect(computeChainBonuses(formation, DEFAULT_CONFIG)).toEqual([0, 1, 2, 0, 1])
  })
})

describe('clash resolution', () => {
  it('combines a sworn Bloodsworn with the following warrior and consumes the partner', () => {
    const left = [
      card({ id: 'a4', weaponType: 'axe', printedStrength: 4 }),
      card({ id: 'a5', weaponType: 'axe', printedStrength: 5, category: 'bloodsworn' }),
      card({ id: 'a8', weaponType: 'axe', printedStrength: 8 }),
      card({ id: 's2', weaponType: 'sword', printedStrength: 2 }),
    ]
    const right = [card({ id: 's10', weaponType: 'sword', printedStrength: 10 })]

    const result = resolveClash({
      leftFormation: left,
      rightFormation: right,
      leftCursor: 1,
      rightCursor: 0,
      leftOaths: { a5: true },
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(result.leftEntry!.cardIds).toEqual(['a5', 'a8'])
    expect(result.leftEntry!.consumedCardIds).toEqual(['a8'])
    expect(result.leftEntry!.finalStrength).toBe(16)
    expect(result.nextLeftCursor).toBe(3)
  })

  it('lets a weaponed warrior win a numeric tie against Ravenfeeder', () => {
    const ravenfeeder = card({ id: 'raven', name: 'Ravenfeeder', weaponType: 'none', printedStrength: 12, abilityType: 'ravenfeeder', isHero: true })
    const axe = card({ id: 'a10', weaponType: 'axe', printedStrength: 10 })

    const result = resolveClash({
      leftFormation: [ravenfeeder],
      rightFormation: [card({ id: 'a3', weaponType: 'axe', printedStrength: 3 }), card({ id: 'a4', weaponType: 'axe', printedStrength: 4 }), axe],
      leftCursor: 0,
      rightCursor: 2,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(result.winner).toBe('right')
    expect(result.rightEntry!.finalStrength).toBe(12)
  })

  it('makes Berserker win now and records an automatic loss for its owner next', () => {
    const berserker = card({ id: 'berserker', name: 'Berserker', printedStrength: 11, abilityType: 'berserker', isHero: true, weaponType: 'none' })
    const result = resolveClash({
      leftFormation: [berserker],
      rightFormation: [card({ id: 'a1', printedStrength: 1 })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(result.winner).toBe('left')
    expect(result.nextPenalty).toEqual('left')
    expect(result.logs.join(' ')).toContain('Berserker wins automatically')
  })

  it('resets the opposing chain after Shield Wall disrupts its current entry', () => {
    const left = [
      card({ id: 'a3', weaponType: 'axe', printedStrength: 3 }),
      card({ id: 'a4', weaponType: 'axe', printedStrength: 4 }),
      card({ id: 'a9', weaponType: 'axe', printedStrength: 9 }),
      card({ id: 'a8', weaponType: 'axe', printedStrength: 8 }),
    ]
    const shield = card({ id: 's6', name: 'Sword Shield Wall', category: 'shield_wall', weaponType: 'sword', printedStrength: 6 })
    const disrupted = resolveClash({
      leftFormation: left,
      rightFormation: [shield],
      leftCursor: 2,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(disrupted.leftEntry!.finalStrength).toBe(9)
    expect(disrupted.nextLeftChainBreaks).toEqual([3])
    const next = resolveClash({
      leftFormation: left,
      rightFormation: [shield, card({ id: 's1', weaponType: 'sword', printedStrength: 1 })],
      leftCursor: disrupted.nextLeftCursor,
      rightCursor: disrupted.nextRightCursor,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: disrupted.nextLeftChainBreaks,
      rightChainBreaks: disrupted.nextRightChainBreaks,
      config: DEFAULT_CONFIG,
    })
    expect(next.leftEntry!.finalStrength).toBe(8)
    expect(next.leftEntry!.breakdown[0].chainBonus).toBe(0)
  })

  it('does not let a final-position Bloodsworn swear an unavailable partner', () => {
    const result = resolveClash({
      leftFormation: [card({ id: 'a5', category: 'bloodsworn', printedStrength: 5 })],
      rightFormation: [card({ id: 's1', weaponType: 'sword', printedStrength: 1 })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: { a5: true },
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(result.leftEntry!.cardIds).toEqual(['a5'])
    expect(result.leftEntry!.isBloodswornCombo).toBe(false)
  })

  it('activates a consumed Hero ability only when the configuration allows it', () => {
    const bloodsworn = card({ id: 'a5', category: 'bloodsworn', printedStrength: 5 })
    const consumedBerserker = card({ id: 'berserker', name: 'Berserker', printedStrength: 11, abilityType: 'berserker', isHero: true, weaponType: 'none' })
    const opponent = card({ id: 's16', weaponType: 'sword', printedStrength: 16 })
    const result = resolveClash({
      leftFormation: [bloodsworn, consumedBerserker],
      rightFormation: [opponent],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: { a5: true },
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: { ...DEFAULT_CONFIG, consumedAbilityActivates: true },
    })

    expect(result.winner).toBe('left')
    expect(result.nextPenalty).toBe('left')
    expect(result.logs.join(' ')).toContain('Berserker wins automatically')
  })

  it('turns a queued Berserker penalty into the next automatic loss', () => {
    const result = resolveClash({
      leftFormation: [card({ id: 'a1', printedStrength: 1 })],
      rightFormation: [card({ id: 's10', weaponType: 'sword', printedStrength: 10 })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      leftPenalty: true,
      rightPenalty: false,
      config: DEFAULT_CONFIG,
    })

    expect(result.winner).toBe('right')
    expect(result.nextPenalties).toEqual({ left: false, right: false })
    expect(result.logs.join(' ')).toContain('Berserker penalty')
  })
})

describe('hero momentum abilities', () => {
  it('gives Shield Maiden the previous numeric margin of defeat', () => {
    const defeat = resolveClash({
      leftFormation: [card({ id: 'a2', printedStrength: 2 })],
      rightFormation: [card({ id: 's8', weaponType: 'sword', printedStrength: 8 })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(defeat.nextDefeatMargins).toEqual({ left: 6, right: 0 })

    const vengeance = resolveClash({
      leftFormation: [card({ id: 'shield-maiden', name: 'Shield Maiden', weaponType: 'none', printedStrength: 11, abilityType: 'shield_maiden', isHero: true })],
      rightFormation: [card({ id: 's16', weaponType: 'sword', printedStrength: 16 })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      previousDefeatMargins: defeat.nextDefeatMargins,
      config: DEFAULT_CONFIG,
    })

    expect(vengeance.leftEntry!.breakdown[0].abilityBonus).toBe(6)
    expect(vengeance.leftEntry!.finalStrength).toBe(17)
    expect(vengeance.logs.join(' ')).toContain('Vengeance adds +6')
    expect(vengeance.winner).toBe('left')
  })

  it('logs Hero bonuses when the opponent has no warrior', () => {
    const result = resolveClash({
      leftFormation: [card({ id: 'shield-maiden', name: 'Shield Maiden', weaponType: 'none', printedStrength: 11, abilityType: 'shield_maiden', isHero: true })],
      rightFormation: [],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      previousDefeatMargins: { left: 6, right: 0 },
      config: DEFAULT_CONFIG,
    })
    expect(result.logs.join(' ')).toContain('Vengeance adds +6')
  })

  it('records zero Vengeance when a special rule alone caused the loss', () => {
    const result = resolveClash({
      leftFormation: [card({ id: 'a16', printedStrength: 16 })],
      rightFormation: [card({ id: 'berserker', name: 'Berserker', weaponType: 'none', printedStrength: 11, abilityType: 'berserker', isHero: true })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(result.winner).toBe('right')
    expect(result.nextDefeatMargins).toEqual({ left: 0, right: 0 })
  })

  it('publishes Jarl cards instead of Skald cards', () => {
    const jarls = BATTLE_CARDS.filter((battleCard) => battleCard.abilityType === 'jarl')

    expect(jarls).toHaveLength(3)
    expect(jarls.map(({ id, name, abilityType }) => ({ id, name, abilityType }))).toEqual([
      { id: 'jarl-1', name: 'Jarl', abilityType: 'jarl' },
      { id: 'jarl-2', name: 'Jarl', abilityType: 'jarl' },
      { id: 'jarl-3', name: 'Jarl', abilityType: 'jarl' },
    ])
    expect(BATTLE_CARDS.some((battleCard) => battleCard.name === 'Skald' || battleCard.abilityType === ('skald' as Card['abilityType']))).toBe(false)
  })

  it.each([
    ['win', 1, 3],
    ['tie', 11, 2],
    ['loss', 12, 1],
  ])('queues Jarl Lead by Example after a %s', (_, opposingStrength, expectedBonus) => {
    const result = resolveClash({
      leftFormation: [card({ id: 'jarl', name: 'Jarl', weaponType: 'none', printedStrength: 11, abilityType: 'jarl', isHero: true })],
      rightFormation: [card({ id: `opponent-${opposingStrength}`, weaponType: 'none', printedStrength: opposingStrength })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(result.nextSongBonuses.left).toBe(expectedBonus)
    expect(result.logs.join(' ')).toContain(`Jarl Lead by Example queues +${expectedBonus}`)
  })

  it('suppresses a penalized Jarl bonus unless penalty ability suppression is disabled', () => {
    const input = {
      leftFormation: [card({ id: 'jarl', name: 'Jarl', weaponType: 'none', printedStrength: 11, abilityType: 'jarl' as const, isHero: true })],
      rightFormation: [card({ id: 'a1', printedStrength: 1 })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      leftPenalty: true,
      rightPenalty: false,
    }
    const suppressed = resolveClash({ ...input, config: DEFAULT_CONFIG })
    expect(suppressed.winner).toBe('right')
    expect(suppressed.nextSongBonuses.left).toBe(0)

    const allowed = resolveClash({ ...input, config: { ...DEFAULT_CONFIG, berserkerPenaltySuppressesAbilities: false } })
    expect(allowed.nextSongBonuses.left).toBe(1)
  })

  it('triggers Jarl when Bloodsworn consumes him and applies Lead by Example once', () => {
    const bloodsworn = card({ id: 'a5', category: 'bloodsworn', printedStrength: 5 })
    const jarl = card({ id: 'jarl', name: 'Jarl', weaponType: 'none', printedStrength: 11, abilityType: 'jarl', isHero: true })
    const nextWarrior = card({ id: 'a4', printedStrength: 4 })
    const leftFormation = [bloodsworn, jarl, nextWarrior]
    const rightFormation = [card({ id: 's10', weaponType: 'sword', printedStrength: 10 }), card({ id: 's8', weaponType: 'sword', printedStrength: 8 })]
    const lead = resolveClash({
      leftFormation,
      rightFormation,
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: { a5: true },
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      config: DEFAULT_CONFIG,
    })

    expect(lead.leftEntry!.isJarl).toBe(true)
    expect(lead.winner).toBe('left')
    expect(lead.nextSongBonuses.left).toBe(3)

    const inspired = resolveClash({
      leftFormation,
      rightFormation,
      leftCursor: lead.nextLeftCursor,
      rightCursor: lead.nextRightCursor,
      leftOaths: { a5: true },
      rightOaths: {},
      leftChainBreaks: lead.nextLeftChainBreaks,
      rightChainBreaks: lead.nextRightChainBreaks,
      songBonuses: lead.nextSongBonuses,
      previousDefeatMargins: lead.nextDefeatMargins,
      config: DEFAULT_CONFIG,
    })

    expect(inspired.leftEntry!.breakdown[0].abilityBonus).toBe(3)
    expect(inspired.leftEntry!.finalStrength).toBe(7)
    expect(inspired.nextSongBonuses.left).toBe(0)
    expect(inspired.logs.join(' ')).toContain('Jarl Lead by Example adds +3')
  })

  it('stacks Lead by Example with Vengeance and keeps both through Shield Wall suppression', () => {
    const shieldMaiden = card({ id: 'shield-maiden', name: 'Shield Maiden', weaponType: 'none', printedStrength: 11, abilityType: 'shield_maiden', isHero: true })
    const stacked = resolveClash({
      leftFormation: [shieldMaiden],
      rightFormation: [card({ id: 's19', weaponType: 'sword', printedStrength: 19 })],
      leftCursor: 0,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      songBonuses: { left: 3, right: 0 },
      previousDefeatMargins: { left: 6, right: 0 },
      config: DEFAULT_CONFIG,
    })
    expect(stacked.leftEntry!.breakdown[0].abilityBonus).toBe(9)
    expect(stacked.leftEntry!.finalStrength).toBe(20)

    const shieldWall = card({ id: 's6', name: 'Sword Shield Wall', category: 'shield_wall', weaponType: 'sword', printedStrength: 6 })
    const protectedSong = resolveClash({
      leftFormation: [card({ id: 'a1', printedStrength: 1 }), card({ id: 'a8', printedStrength: 8 })],
      rightFormation: [shieldWall],
      leftCursor: 1,
      rightCursor: 0,
      leftOaths: {},
      rightOaths: {},
      leftChainBreaks: [],
      rightChainBreaks: [],
      songBonuses: { left: 3, right: 0 },
      config: DEFAULT_CONFIG,
    })
    expect(protectedSong.leftEntry!.breakdown[0].chainBonus).toBe(0)
    expect(protectedSong.leftEntry!.breakdown[0].abilityBonus).toBe(3)
    expect(protectedSong.leftEntry!.finalStrength).toBe(11)
  })
})

describe('war state transitions', () => {
  it('alternates an open draft and enters formation only after both players have five cards', () => {
    let state = createWar(DEFAULT_CONFIG, () => 0.75)
    expect(state.phase).toBe('DRAFT')
    expect(state.draftTurn).toBe('right')

    for (let pick = 0; pick < 10; pick += 1) {
      state = draftCard(state, state.draftPool[0].id)
    }

    expect(state.phase).toBe('FORMATION')
    expect(state.hands.left).toHaveLength(5)
    expect(state.hands.right).toHaveLength(5)
    expect(state.formations.left).toHaveLength(5)
  })

  it('requires both formation locks before oath reveal can begin', () => {
    let state = createWar(DEFAULT_CONFIG, () => 0.25)
    for (let pick = 0; pick < 10; pick += 1) state = draftCard(state, state.draftPool[0].id)
    state = lockFormation(state, 'left')
    expect(state.phase).toBe('FORMATION_LOCKED')
    expect(state.locked).toEqual({ left: true, right: false })
    state = lockFormation(state, 'right')
    expect(state.phase).toBe('OATH_REVEAL')
    expect(revealOaths(state).phase).toBe('CLASH_RESOLUTION')
  })

  it('rejects inactive formation changes unless debug access is explicitly allowed', () => {
    let state = createWar(DEFAULT_CONFIG, () => 0.25)
    for (let pick = 0; pick < 10; pick += 1) state = draftCard(state, state.draftPool[0].id)
    const original = state.formations.right.map((warrior) => warrior.id)
    const blocked = reorderFormation(state, 'right', 0, 1)
    expect(blocked.formations.right.map((warrior) => warrior.id)).toEqual(original)
    const debugEdit = reorderFormation(state, 'right', 0, 1, true)
    expect(debugEdit.formations.right.map((warrior) => warrior.id)).not.toEqual(original)
  })

  it('recycles discard without dropping the cards still in the battle deck', () => {
    const initial = createWar(DEFAULT_CONFIG, () => 0.25)
    const recycled = beginSkirmish({
      ...initial,
      battleDeck: initial.battleDeck.slice(0, 2),
      discard: initial.battleDeck.slice(2, 12),
    }, 'left', () => 0)
    expect(recycled.draftPool).toHaveLength(10)
    expect(recycled.battleDeck).toHaveLength(2)
    expect(recycled.discard).toHaveLength(0)
  })

  it('returns all ten drafted cards to discard when a Skirmish completes', () => {
    const initial = createWar({ ...DEFAULT_CONFIG, clashesToWinSkirmish: 1 }, () => 0.25)
    let state = initial
    for (let pick = 0; pick < 10; pick += 1) state = draftCard(state, state.draftPool[0].id)
    state = lockFormation(state, 'left')
    state = lockFormation(state, 'right')
    state = revealOaths(state)
    state = resolveCurrentClash(state)
    expect(state.phase).toBe('SKIRMISH_COMPLETE')
    expect(state.discard).toHaveLength(10)
  })
})
