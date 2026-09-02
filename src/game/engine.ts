import { BATTLE_CARDS, GOD_CARDS } from './cards'
import { DEFAULT_CONFIG } from './config'
import type {
  Card,
  CardBreakdown,
  ClashEntry,
  ClashResolution,
  GameConfig,
  GameState,
  PlayerId,
  ResolveClashInput,
  SkirmishRecord,
} from './types'

export const otherPlayer = (player: PlayerId): PlayerId => player === 'left' ? 'right' : 'left'

export const shuffle = <T,>(items: T[], random: () => number = Math.random): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export const computeChainBonuses = (formation: Card[], config: GameConfig, chainBreaks: number[] = []): number[] => {
  const breaks = new Set(chainBreaks)
  const bonuses: number[] = []
  let chainLength = 0
  let previousWeapon = 'none'

  formation.forEach((card, index) => {
    if (breaks.has(index) || card.weaponType === 'none' || card.weaponType !== previousWeapon) {
      chainLength = card.weaponType === 'none' ? 0 : 1
    } else {
      chainLength += 1
    }

    bonuses[index] = card.weaponType === 'none' ? 0 : (chainLength - 1) * config.chainBonusStep
    previousWeapon = card.weaponType
  })

  return bonuses
}

const isBloodsworn = (card: Card): boolean => card.category === 'bloodsworn'
const isShieldWall = (card: Card): boolean => card.category === 'shield_wall'
const printedStrengthFor = (card: Card, config: GameConfig): number => {
  if (isBloodsworn(card)) return config.bloodswornStrength
  if (isShieldWall(card)) return config.shieldWallStrength
  if (card.abilityType === 'ravenfeeder') return config.ravenfeederStrength
  return card.printedStrength
}

interface BuildEntryOptions {
  formation: Card[]
  cursor: number
  oaths: Record<string, boolean>
  chainBonuses: number[]
  suppressChainAt?: number[]
  previousDefeatMargin?: number
  songBonus?: number
  config: GameConfig
}

const buildEntry = ({ formation, cursor, oaths, chainBonuses, suppressChainAt = [], previousDefeatMargin = 0, songBonus = 0, config }: BuildEntryOptions): ClashEntry | null => {
  const primary = formation[cursor]
  if (!primary) return null

  const cards = [primary]
  const consumedCardIds: string[] = []
  const canSwear = isBloodsworn(primary) && Boolean(oaths[primary.id]) && Boolean(formation[cursor + 1])
  if (canSwear) {
    cards.push(formation[cursor + 1])
    consumedCardIds.push(formation[cursor + 1].id)
  }

  const suppressed = new Set(suppressChainAt)
  const isShieldMaiden = primary.abilityType === 'shield_maiden'
  const vengeanceBonus = isShieldMaiden
    ? config.shieldMaidenVengeanceCap === null
      ? previousDefeatMargin
      : Math.min(previousDefeatMargin, config.shieldMaidenVengeanceCap)
    : 0
  const entryAbilityBonus = songBonus + vengeanceBonus
  const breakdown: CardBreakdown[] = cards.map((card, offset) => {
    const formationIndex = cursor + offset
    const chainSuppressed = suppressed.has(formationIndex)
    const chainBonus = chainSuppressed || (canSwear && !config.bloodswornAddsChainBonuses)
      ? 0
      : chainBonuses[formationIndex] ?? 0
    const printedStrength = printedStrengthFor(card, config)
    const abilityBonus = offset === 0 ? entryAbilityBonus : 0
    return {
      cardId: card.id,
      cardName: card.name,
      printedStrength,
      chainBonus,
      abilityBonus,
      effectiveStrength: printedStrength + chainBonus + abilityBonus,
      chainSuppressed,
    }
  })

  const abilityCards = cards.filter((_, index) => index === 0 || config.consumedAbilityActivates)
  const isSkald = primary.abilityType === 'skald' || Boolean(canSwear && cards[1]?.abilityType === 'skald')
  return {
    primaryIndex: cursor,
    endIndex: cursor + cards.length - 1,
    cardIds: cards.map((card) => card.id),
    consumedCardIds,
    cards,
    breakdown,
    printedStrength: breakdown.reduce((sum, item) => sum + item.printedStrength, 0),
    chainBonus: breakdown.reduce((sum, item) => sum + item.chainBonus, 0),
    abilityBonus: breakdown.reduce((sum, item) => sum + item.abilityBonus, 0),
    vengeanceBonus,
    songBonus,
    finalStrength: breakdown.reduce((sum, item) => sum + item.effectiveStrength, 0),
    isBloodswornCombo: canSwear,
    isShieldWall: isShieldWall(primary),
    isBerserker: abilityCards.some((card) => card.abilityType === 'berserker'),
    isRavenfeeder: abilityCards.some((card) => card.abilityType === 'ravenfeeder'),
    isShieldMaiden,
    isSkald,
  }
}

const entrySummary = (entry: ClashEntry, logs: string[]): void => {
  entry.breakdown.forEach((item) => {
    const chainText = item.chainBonus ? ` + ${item.chainBonus} chain` : ''
    const abilityText = item.abilityBonus ? ` + ${item.abilityBonus} ability` : ''
    const suppressedText = item.chainSuppressed ? ' (chain suppressed)' : ''
    logs.push(`${item.cardName}: ${item.printedStrength}${chainText}${abilityText} = ${item.effectiveStrength}${suppressedText}`)
  })
  if (entry.vengeanceBonus > 0) logs.push(`Shield Maiden Vengeance adds +${entry.vengeanceBonus}.`)
  if (entry.songBonus > 0) logs.push(`Responsive Song adds +${entry.songBonus}.`)
  if (entry.isBloodswornCombo) {
    logs.push(`Bloodsworn combined with ${entry.cards[1].name}; ${entry.finalStrength} total. ${entry.cards[1].name} is consumed.`)
  }
}

const uniqueSorted = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b)

const compareEntries = (left: ClashEntry, right: ClashEntry, config: GameConfig, logs: string[], edgeCases: string[]): PlayerId | 'tie' => {
  if (left.finalStrength !== right.finalStrength) return left.finalStrength > right.finalStrength ? 'left' : 'right'

  if (left.isRavenfeeder && !right.isRavenfeeder && right.cards.some((card) => card.weaponType !== 'none')) {
    logs.push('A weaponed warrior ties Ravenfeeder and defeats him.')
    return 'right'
  }
  if (right.isRavenfeeder && !left.isRavenfeeder && left.cards.some((card) => card.weaponType !== 'none')) {
    logs.push('A weaponed warrior ties Ravenfeeder and defeats him.')
    return 'left'
  }

  const leftWeapon = left.cards[0].weaponType
  const rightWeapon = right.cards[0].weaponType
  if (config.weaponAdvantageMode === 'tie-break-only' && leftWeapon !== 'none' && rightWeapon !== 'none') {
    if (config.weaponTriangle[leftWeapon] === rightWeapon) {
      logs.push(`${left.cards[0].name} wins the weapon tie-break.`)
      return 'left'
    }
    if (config.weaponTriangle[rightWeapon] === leftWeapon) {
      logs.push(`${right.cards[0].name} wins the weapon tie-break.`)
      return 'right'
    }
  }

  edgeCases.push('tied Clash')
  logs.push(`Tied Clash: neither player earns the Clash (${config.tieBehavior}).`)
  return config.tieBehavior === 'left-wins' ? 'left' : 'tie'
}

type ClashResolutionWithoutCarryover = Omit<ClashResolution, 'nextDefeatMargins' | 'nextSongBonuses'>

const addHeroCarryover = (
  resolution: ClashResolutionWithoutCarryover,
  config: GameConfig,
  suppressedSongSides: Record<PlayerId, boolean>,
): ClashResolution => {
  const nextDefeatMargins: Record<PlayerId, number> = { left: 0, right: 0 }
  if (resolution.leftEntry && resolution.rightEntry) {
    if (resolution.winner === 'left') {
      nextDefeatMargins.right = Math.max(0, resolution.leftEntry.finalStrength - resolution.rightEntry.finalStrength)
    } else if (resolution.winner === 'right') {
      nextDefeatMargins.left = Math.max(0, resolution.rightEntry.finalStrength - resolution.leftEntry.finalStrength)
    }
  }

  const songFor = (side: PlayerId, entry: ClashEntry | null): number => {
    if (!entry?.isSkald || suppressedSongSides[side]) return 0
    if (resolution.winner === side) return config.skaldWinBonus
    if (resolution.winner === 'tie') return config.skaldTieBonus
    return config.skaldLossBonus
  }

  const nextSongBonuses = {
    left: songFor('left', resolution.leftEntry),
    right: songFor('right', resolution.rightEntry),
  }
  if (nextSongBonuses.left > 0) resolution.logs.push(`Skald Responsive Song queues +${nextSongBonuses.left} for Player 1's next entry.`)
  if (nextSongBonuses.right > 0) resolution.logs.push(`Skald Responsive Song queues +${nextSongBonuses.right} for Player 2's next entry.`)

  return {
    ...resolution,
    nextDefeatMargins,
    nextSongBonuses,
  }
}

export const resolveClash = (input: ResolveClashInput): ClashResolution => {
  const {
    leftFormation,
    rightFormation,
    leftCursor,
    rightCursor,
    leftOaths,
    rightOaths,
    leftChainBreaks,
    rightChainBreaks,
    config,
  } = input
  const logs: string[] = []
  const edgeCases: string[] = []
  const previousDefeatMargins = input.previousDefeatMargins ?? { left: 0, right: 0 }
  const songBonuses = input.songBonuses ?? { left: 0, right: 0 }
  const nextPenalties: Record<PlayerId, boolean> = {
    left: Boolean(input.leftPenalty),
    right: Boolean(input.rightPenalty),
  }

  const leftBonuses = computeChainBonuses(leftFormation, config, leftChainBreaks)
  const rightBonuses = computeChainBonuses(rightFormation, config, rightChainBreaks)
  const leftEntry = buildEntry({
    formation: leftFormation,
    cursor: leftCursor,
    oaths: leftOaths,
    chainBonuses: leftBonuses,
    previousDefeatMargin: previousDefeatMargins.left,
    songBonus: songBonuses.left,
    config,
  })
  const rightEntry = buildEntry({
    formation: rightFormation,
    cursor: rightCursor,
    oaths: rightOaths,
    chainBonuses: rightBonuses,
    previousDefeatMargin: previousDefeatMargins.right,
    songBonus: songBonuses.right,
    config,
  })
  const nextLeftCursor = leftEntry ? (leftEntry.endIndex ?? leftCursor) + 1 : leftCursor
  const nextRightCursor = rightEntry ? (rightEntry.endIndex ?? rightCursor) + 1 : rightCursor
  let nextLeftChainBreaks = [...leftChainBreaks]
  let nextRightChainBreaks = [...rightChainBreaks]
  const suppressedSongSides: Record<PlayerId, boolean> = { left: false, right: false }
  const finish = (resolution: ClashResolutionWithoutCarryover): ClashResolution => addHeroCarryover(resolution, config, suppressedSongSides)

  if (!leftEntry && !rightEntry) {
    edgeCases.push('Skirmish ending without three wins due to no warriors remaining')
    logs.push('Neither battle line has a warrior available. The Skirmish ends without three wins.')
    nextPenalties.left = false
    nextPenalties.right = false
    return finish({
      winner: 'tie', leftEntry, rightEntry, nextLeftCursor, nextRightCursor,
      nextLeftChainBreaks, nextRightChainBreaks, nextPenalties, nextPenalty: null, logs, edgeCases,
    })
  }
  if (!leftEntry || !rightEntry) {
    const winner = leftEntry ? 'left' : 'right'
    if (leftEntry) entrySummary(leftEntry, logs)
    if (rightEntry) entrySummary(rightEntry, logs)
    logs.push(`${winner === 'left' ? 'Player 1' : 'Player 2'} has the only available warrior and wins this Clash automatically.`)
    edgeCases.push('player running out of warriors')
    nextPenalties.left = false
    nextPenalties.right = false
    return finish({
      winner, leftEntry, rightEntry, nextLeftCursor, nextRightCursor,
      nextLeftChainBreaks, nextRightChainBreaks, nextPenalties,
      nextPenalty: null, logs, edgeCases,
    })
  }

  const leftSuppressedBonus = leftEntry.isShieldWall ? rightEntry.breakdown.reduce((sum, item) => sum + item.chainBonus, 0) : 0
  const rightSuppressedBonus = rightEntry.isShieldWall ? leftEntry.breakdown.reduce((sum, item) => sum + item.chainBonus, 0) : 0
  if (leftEntry.isShieldWall) {
    logs.push(`Shield Wall cancels +${leftSuppressedBonus} opposing chain bonus for this Clash.`)
    if (config.shieldWallCancelsCurrentChain) {
      rightEntry.breakdown.forEach((item) => {
        item.chainSuppressed = true
        item.chainBonus = 0
        item.effectiveStrength = item.printedStrength + item.abilityBonus
      })
      rightEntry.chainBonus = 0
      rightEntry.finalStrength = rightEntry.printedStrength + rightEntry.abilityBonus
    }
    if (config.shieldWallBreaksFutureChain && rightEntry.endIndex !== null) {
      nextRightChainBreaks = uniqueSorted([...nextRightChainBreaks, rightEntry.endIndex + 1])
      logs.push('The opposing weapon chain breaks after this position.')
    }
  }
  if (rightEntry.isShieldWall) {
    logs.push(`Shield Wall cancels +${rightSuppressedBonus} opposing chain bonus for this Clash.`)
    if (config.shieldWallCancelsCurrentChain) {
      leftEntry.breakdown.forEach((item) => {
        item.chainSuppressed = true
        item.chainBonus = 0
        item.effectiveStrength = item.printedStrength + item.abilityBonus
      })
      leftEntry.chainBonus = 0
      leftEntry.finalStrength = leftEntry.printedStrength + leftEntry.abilityBonus
    }
    if (config.shieldWallBreaksFutureChain && leftEntry.endIndex !== null) {
      nextLeftChainBreaks = uniqueSorted([...nextLeftChainBreaks, leftEntry.endIndex + 1])
      logs.push('The opposing weapon chain breaks after this position.')
    }
  }

  entrySummary(leftEntry, logs)
  entrySummary(rightEntry, logs)

  const leftPenaltyActive = Boolean(input.leftPenalty)
  const rightPenaltyActive = Boolean(input.rightPenalty)
  const penaltiesActive = leftPenaltyActive || rightPenaltyActive
  const abilitiesAllowedThroughPenalty = penaltiesActive && !config.berserkerPenaltySuppressesAbilities && (leftEntry.isBerserker || rightEntry.isBerserker)
  if (penaltiesActive && !abilitiesAllowedThroughPenalty) {
    if (config.berserkerPenaltySuppressesAbilities) {
      suppressedSongSides.left = leftPenaltyActive
      suppressedSongSides.right = rightPenaltyActive
    }
    logs.push(`${leftPenaltyActive && rightPenaltyActive ? 'Both players' : leftPenaltyActive ? 'Player 1' : 'Player 2'} automatically loses this Clash because of the Berserker penalty.`)
    edgeCases.push('Berserker penalty when the Skirmish ends immediately')
    if (leftPenaltyActive && rightPenaltyActive) {
      logs.push('Both penalties apply; the Clash is tied.')
      return finish({
        winner: 'tie', leftEntry, rightEntry, nextLeftCursor, nextRightCursor,
        nextLeftChainBreaks, nextRightChainBreaks, nextPenalties: { left: false, right: false }, nextPenalty: null, logs, edgeCases,
      })
    }
    const winner = leftPenaltyActive ? 'right' : 'left'
    nextPenalties.left = false
    nextPenalties.right = false
    return finish({
      winner, leftEntry, rightEntry, nextLeftCursor, nextRightCursor,
      nextLeftChainBreaks, nextRightChainBreaks, nextPenalties,
      nextPenalty: null, logs, edgeCases,
    })
  }
  if (abilitiesAllowedThroughPenalty) {
    logs.push('Berserker penalty is active, but this prototype setting allows the Hero ability to trigger.')
    nextPenalties.left = false
    nextPenalties.right = false
  }

  const leftBerserker = leftEntry.isBerserker
  const rightBerserker = rightEntry.isBerserker
  if (leftBerserker || rightBerserker) {
    edgeCases.push('Berserker interaction')
    if (leftBerserker && rightBerserker) {
      logs.push('Berserker vs. Berserker: both automatic wins cancel into a tied Clash.')
      nextPenalties.left = true
      nextPenalties.right = true
      return finish({
        winner: 'tie', leftEntry, rightEntry, nextLeftCursor, nextRightCursor,
        nextLeftChainBreaks, nextRightChainBreaks, nextPenalties, nextPenalty: null, logs, edgeCases,
      })
    }
    const winner = leftBerserker ? 'left' : 'right'
    nextPenalties[winner] = true
    logs.push('Berserker wins automatically.')
    return finish({
      winner, leftEntry, rightEntry, nextLeftCursor, nextRightCursor,
      nextLeftChainBreaks, nextRightChainBreaks, nextPenalties,
      nextPenalty: winner, logs, edgeCases,
    })
  }

  const winner = compareEntries(leftEntry, rightEntry, config, logs, edgeCases)
  const leftIsBloodsworn = leftEntry.cards[0].category === 'bloodsworn'
  const rightIsBloodsworn = rightEntry.cards[0].category === 'bloodsworn'
  if (leftIsBloodsworn && rightIsBloodsworn) edgeCases.push('Bloodsworn vs. Bloodsworn')
  if (leftIsBloodsworn && rightEntry.isShieldWall || rightIsBloodsworn && leftEntry.isShieldWall) {
    edgeCases.push('Shield Wall vs. Bloodsworn')
  }
  if (leftSuppressedBonus > 0 || rightSuppressedBonus > 0) {
    edgeCases.push('Shield Wall interrupting a long chain')
  }
  if (leftEntry.isRavenfeeder || rightEntry.isRavenfeeder) {
    if (leftEntry.isRavenfeeder && rightEntry.isRavenfeeder) edgeCases.push('Ravenfeeder vs. Ravenfeeder')
    if (Math.max(leftEntry.finalStrength, rightEntry.finalStrength) >= config.ravenfeederStrength) edgeCases.push('Ravenfeeder outcome')
  }

  return finish({
    winner, leftEntry, rightEntry, nextLeftCursor, nextRightCursor,
    nextLeftChainBreaks, nextRightChainBreaks, nextPenalties,
    nextPenalty: nextPenalties.left && !nextPenalties.right ? 'left' : nextPenalties.right && !nextPenalties.left ? 'right' : null,
    logs, edgeCases,
  })
}

const drawFromDeck = (deck: Card[], discard: Card[], amount: number, config: GameConfig, random: () => number): { drawn: Card[]; deck: Card[]; discard: Card[] } => {
  let workingDeck = [...deck]
  let workingDiscard = [...discard]
  if (workingDeck.length < amount && config.recycleDiscard && workingDiscard.length) {
    workingDeck = shuffle([...workingDeck, ...workingDiscard], random)
    workingDiscard = []
  }
  const drawn = workingDeck.splice(0, amount)
  return { drawn, deck: workingDeck, discard: workingDiscard }
}

export const beginSkirmish = (state: GameState, leader: PlayerId, random: () => number = Math.random): GameState => {
  const drawn = drawFromDeck(state.battleDeck, state.discard, state.config.draftPoolSize, state.config, random)
  const god = state.config.godCardsEnabled ? state.godDeck[0] ?? null : null
  const godDeck = state.config.godCardsEnabled ? state.godDeck.slice(1) : state.godDeck
  return {
    ...state,
    phase: state.config.godCardsEnabled ? 'GOD_REVEAL' : 'DRAFT',
    leader,
    draftTurn: leader,
    draftPool: drawn.drawn,
    hands: { left: [], right: [] },
    formations: { left: [], right: [] },
    oaths: { left: {}, right: {} },
    locked: { left: false, right: false },
    activeFormationPlayer: 'left',
    currentGod: god,
    godDeck,
    battleDeck: drawn.deck,
    discard: drawn.discard,
    currentClash: 1,
    cursors: { left: 0, right: 0 },
    chainBreaks: { left: [], right: [] },
    penalties: { left: false, right: false },
    previousDefeatMargins: { left: 0, right: 0 },
    songBonuses: { left: 0, right: 0 },
    clashWins: { left: 0, right: 0 },
    currentResolution: null,
    clashes: [],
    log: state.log.concat([`Skirmish ${state.skirmishNumber}: ${leader === 'left' ? 'Player 1' : 'Player 2'} drafts first.`]),
    edgeCases: [],
    lastSkirmishWinner: null,
  }
}

export const createWar = (config: GameConfig = DEFAULT_CONFIG, random: () => number = Math.random): GameState => {
  const starter: GameState = {
    config,
    phase: 'WAR_SETUP',
    skirmishNumber: 1,
    tokens: { left: 0, right: 0 },
    leader: 'left',
    draftTurn: 'left',
    draftPool: [],
    hands: { left: [], right: [] },
    formations: { left: [], right: [] },
    oaths: { left: {}, right: {} },
    locked: { left: false, right: false },
    activeFormationPlayer: 'left',
    currentGod: null,
    battleDeck: shuffle(BATTLE_CARDS, random),
    godDeck: shuffle(GOD_CARDS, random),
    discard: [],
    currentClash: 1,
    cursors: { left: 0, right: 0 },
    chainBreaks: { left: [], right: [] },
    penalties: { left: false, right: false },
    previousDefeatMargins: { left: 0, right: 0 },
    songBonuses: { left: 0, right: 0 },
    clashWins: { left: 0, right: 0 },
    currentResolution: null,
    clashes: [],
    log: ['War setup complete. The battle deck is ready.'],
    edgeCases: [],
    lastSkirmishWinner: null,
    history: [],
  }
  const leader = random() < 0.5 ? 'left' : 'right'
  return beginSkirmish(starter, leader, random)
}

export const advanceGodReveal = (state: GameState): GameState => state.phase === 'GOD_REVEAL'
  ? { ...state, phase: 'DRAFT', log: state.log.concat([`Mythos revealed: ${state.currentGod?.name ?? 'none'} (decorative in v0.1).`]) }
  : state

export const draftCard = (state: GameState, cardId: string): GameState => {
  if (state.phase !== 'DRAFT' || state.hands[state.draftTurn].length >= state.config.cardsPerPlayer) return state
  const selected = state.draftPool.find((card) => card.id === cardId)
  if (!selected) return state
  const nextPool = state.draftPool.filter((card) => card.id !== cardId)
  const player = state.draftTurn
  const nextHands = { ...state.hands, [player]: [...state.hands[player], selected] }
  const nextTurn = otherPlayer(player)
  const draftComplete = nextHands.left.length === state.config.cardsPerPlayer && nextHands.right.length === state.config.cardsPerPlayer
  return {
    ...state,
    phase: draftComplete ? 'FORMATION' : 'DRAFT',
    draftPool: nextPool,
    hands: nextHands,
    formations: draftComplete ? { left: [...nextHands.left], right: [...nextHands.right] } : state.formations,
    draftTurn: nextTurn,
    activeFormationPlayer: 'left',
    log: state.log.concat([`${player === 'left' ? 'Player 1' : 'Player 2'} drafted ${selected.name}.`]),
  }
}

export const reorderFormation = (state: GameState, player: PlayerId, from: number, to: number, allowInactive = false): GameState => {
  if (!['FORMATION', 'FORMATION_LOCKED'].includes(state.phase) || state.locked[player] || (!allowInactive && state.activeFormationPlayer !== player)) return state
  if (from < 0 || to < 0 || from >= state.formations[player].length || to >= state.formations[player].length) return state
  const formation = [...state.formations[player]]
  const [moved] = formation.splice(from, 1)
  formation.splice(to, 0, moved)
  return { ...state, formations: { ...state.formations, [player]: formation } }
}

export const setOath = (state: GameState, player: PlayerId, cardId: string, sworn: boolean, allowInactive = false): GameState => {
  if (!['FORMATION', 'FORMATION_LOCKED'].includes(state.phase) || state.locked[player] || (!allowInactive && state.activeFormationPlayer !== player)) return state
  const index = state.formations[player].findIndex((card) => card.id === cardId)
  const card = state.formations[player][index]
  if (!card || !isBloodsworn(card) || index === state.formations[player].length - 1) return state
  return { ...state, oaths: { ...state.oaths, [player]: { ...state.oaths[player], [cardId]: sworn } } }
}

export const lockFormation = (state: GameState, player: PlayerId, allowInactive = false): GameState => {
  if (!['FORMATION', 'FORMATION_LOCKED'].includes(state.phase) || state.locked[player] || (!allowInactive && state.activeFormationPlayer !== player)) return state
  const locked = { ...state.locked, [player]: true }
  const bothLocked = locked.left && locked.right
  return {
    ...state,
    phase: bothLocked ? 'OATH_REVEAL' : 'FORMATION_LOCKED',
    locked,
    activeFormationPlayer: otherPlayer(player),
    log: state.log.concat([`${player === 'left' ? 'Player 1' : 'Player 2'} locked a battle line.`]),
  }
}

export const revealOaths = (state: GameState): GameState => {
  if (state.phase !== 'OATH_REVEAL') return state
  const oathText = (player: PlayerId) => Object.entries(state.oaths[player]).filter(([, sworn]) => sworn).map(([id]) => state.formations[player].find((card) => card.id === id)?.name ?? id).join(', ')
  return {
    ...state,
    phase: 'CLASH_RESOLUTION',
    log: state.log.concat([`Blood Oaths revealed. Player 1: ${oathText('left') || 'none'}. Player 2: ${oathText('right') || 'none'}.`]),
  }
}

const addRecord = (state: GameState, winner: PlayerId | 'tie'): SkirmishRecord => ({
  skirmish: state.skirmishNumber,
  winner,
  finalScore: { ...state.clashWins },
  draftLeader: state.leader,
  draftedCards: { left: state.hands.left.map((card) => card.id), right: state.hands.right.map((card) => card.id) },
  formations: { left: state.formations.left.map((card) => card.id), right: state.formations.right.map((card) => card.id) },
  oaths: { left: { ...state.oaths.left }, right: { ...state.oaths.right } },
  clashesPlayed: state.clashes.length,
  unrevealedCards: {
    left: state.formations.left.slice(state.cursors.left).map((card) => card.id),
    right: state.formations.right.slice(state.cursors.right).map((card) => card.id),
  },
  clashes: state.clashes,
  edgeCases: [...state.edgeCases],
})

export const resolveCurrentClash = (state: GameState): GameState => {
  if (state.phase !== 'CLASH_RESOLUTION') return state
  const resolution = resolveClash({
    leftFormation: state.formations.left,
    rightFormation: state.formations.right,
    leftCursor: state.cursors.left,
    rightCursor: state.cursors.right,
    leftOaths: state.oaths.left,
    rightOaths: state.oaths.right,
    leftChainBreaks: state.chainBreaks.left,
    rightChainBreaks: state.chainBreaks.right,
    leftPenalty: state.penalties.left,
    rightPenalty: state.penalties.right,
    previousDefeatMargins: state.previousDefeatMargins,
    songBonuses: state.songBonuses,
    config: state.config,
  })
  const clashWins = { ...state.clashWins }
  if (resolution.winner !== 'tie') clashWins[resolution.winner] += 1
  const clashes = [...state.clashes, resolution]
  const log = state.log.concat([`— Clash ${state.currentClash} —`, ...resolution.logs, resolution.winner === 'tie' ? 'No Clash victory awarded.' : `${resolution.winner === 'left' ? 'Player 1' : 'Player 2'} wins the Clash ${state.currentClash}.`])
  const edgeCases = [...new Set([...state.edgeCases, ...resolution.edgeCases])]
  if (state.formations.left.filter((card) => card.category === 'bloodsworn').length > 1 || state.formations.right.filter((card) => card.category === 'bloodsworn').length > 1) {
    edgeCases.push('multiple Bloodsworns in one formation')
  }
  const hasWinner = Object.values(clashWins).some((wins) => wins >= state.config.clashesToWinSkirmish)
  const noWarriorsRemain = !resolution.leftEntry && !resolution.rightEntry
  const maxClashesReached = state.currentClash >= state.config.cardsPerPlayer
  if (hasWinner || noWarriorsRemain || maxClashesReached) {
    const winner = hasWinner
      ? Object.entries(clashWins).find(([, wins]) => wins >= state.config.clashesToWinSkirmish)?.[0] as PlayerId
      : clashWins.left === clashWins.right ? 'tie' : clashWins.left > clashWins.right ? 'left' : 'right'
    const tokens = winner === 'tie' ? state.tokens : { ...state.tokens, [winner]: state.tokens[winner] + 1 }
    const winnerName = winner === 'tie' ? 'No player' : winner === 'left' ? 'Player 1' : 'Player 2'
    const penaltyLog = (resolution.nextPenalties.left || resolution.nextPenalties.right) ? ' A Berserker penalty was queued, but the Skirmish ended immediately.' : ''
    const completedState: GameState = {
      ...state,
      phase: tokens.left >= state.config.skirmishesToWin || tokens.right >= state.config.skirmishesToWin ? 'WAR_COMPLETE' : 'SKIRMISH_COMPLETE',
      clashWins,
      tokens,
      cursors: { left: resolution.nextLeftCursor, right: resolution.nextRightCursor },
      chainBreaks: { left: resolution.nextLeftChainBreaks, right: resolution.nextRightChainBreaks },
      penalties: resolution.nextPenalties,
      previousDefeatMargins: resolution.nextDefeatMargins,
      songBonuses: resolution.nextSongBonuses,
      currentResolution: resolution,
      clashes,
      log: log.concat([`${winnerName} takes Skirmish ${state.skirmishNumber} (${clashWins.left}–${clashWins.right}).${penaltyLog}`]),
      edgeCases,
      lastSkirmishWinner: winner,
      discard: [...state.discard, ...state.hands.left, ...state.hands.right, ...state.draftPool],
    }
    return { ...completedState, history: [...state.history, addRecord(completedState, winner)] }
  }

  return {
    ...state,
    currentClash: state.currentClash + 1,
    cursors: { left: resolution.nextLeftCursor, right: resolution.nextRightCursor },
    chainBreaks: { left: resolution.nextLeftChainBreaks, right: resolution.nextRightChainBreaks },
    penalties: resolution.nextPenalties,
    previousDefeatMargins: resolution.nextDefeatMargins,
    songBonuses: resolution.nextSongBonuses,
    clashWins,
    currentResolution: resolution,
    clashes,
    log,
    edgeCases,
  }
}

export const beginNextSkirmish = (state: GameState, random: () => number = Math.random): GameState => {
  if (state.phase !== 'SKIRMISH_COMPLETE') return state
  const leader = state.lastSkirmishWinner === 'left' ? 'right'
    : state.lastSkirmishWinner === 'right' ? 'left'
      : otherPlayer(state.leader)
  return beginSkirmish({ ...state, skirmishNumber: state.skirmishNumber + 1 }, leader, random)
}
