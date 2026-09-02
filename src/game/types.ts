export type PlayerId = 'left' | 'right'
export type WeaponType = 'axe' | 'sword' | 'spear' | 'none'
export type CardCategory = 'standard' | 'bloodsworn' | 'shield_wall' | 'hero' | 'god'
export type AbilityType = 'none' | 'ravenfeeder' | 'berserker' | 'shield_maiden' | 'jarl' | 'placeholder'
export type Phase =
  | 'WAR_SETUP'
  | 'SKIRMISH_SETUP'
  | 'GOD_REVEAL'
  | 'DRAFT'
  | 'FORMATION'
  | 'FORMATION_LOCKED'
  | 'OATH_REVEAL'
  | 'CLASH_RESOLUTION'
  | 'SKIRMISH_COMPLETE'
  | 'WAR_COMPLETE'

export interface Card {
  id: string
  name: string
  category: CardCategory
  weaponType: WeaponType
  printedStrength: number
  rank: number | null
  abilityType: AbilityType
  abilityConfig: Record<string, unknown>
  isHero: boolean
  isGod: boolean
}

export interface GameConfig {
  skirmishesToWin: number
  draftPoolSize: number
  cardsPerPlayer: number
  clashesToWinSkirmish: number
  chainBonusStep: number
  bloodswornStrength: number
  shieldWallStrength: number
  ravenfeederStrength: number
  weaponAdvantageMode: 'tie-break-only' | 'strength'
  weaponTriangle: Record<WeaponType, WeaponType | null>
  shieldWallCancelsCurrentChain: boolean
  shieldWallBreaksFutureChain: boolean
  bloodswornAddsChainBonuses: boolean
  consumedAbilityActivates: boolean
  shieldMaidenVengeanceCap: number | null
  jarlWinBonus: number
  jarlTieBonus: number
  jarlLossBonus: number
  berserkerPenaltySuppressesAbilities: boolean
  tieBehavior: 'no-winner' | 'left-wins'
  godCardsEnabled: boolean
  recycleDiscard: boolean
}

export interface CardBreakdown {
  cardId: string
  cardName: string
  printedStrength: number
  chainBonus: number
  abilityBonus: number
  effectiveStrength: number
  chainSuppressed: boolean
}

export interface ClashEntry {
  primaryIndex: number | null
  endIndex: number | null
  cardIds: string[]
  consumedCardIds: string[]
  cards: Card[]
  breakdown: CardBreakdown[]
  printedStrength: number
  chainBonus: number
  abilityBonus: number
  vengeanceBonus: number
  songBonus: number
  finalStrength: number
  isBloodswornCombo: boolean
  isShieldWall: boolean
  isBerserker: boolean
  isRavenfeeder: boolean
  isShieldMaiden: boolean
  isJarl: boolean
}

export interface ClashResolution {
  winner: PlayerId | 'tie'
  leftEntry: ClashEntry | null
  rightEntry: ClashEntry | null
  nextLeftCursor: number
  nextRightCursor: number
  nextLeftChainBreaks: number[]
  nextRightChainBreaks: number[]
  nextPenalties: Record<PlayerId, boolean>
  nextPenalty: PlayerId | null
  nextDefeatMargins: Record<PlayerId, number>
  nextSongBonuses: Record<PlayerId, number>
  logs: string[]
  edgeCases: string[]
}

export interface SkirmishRecord {
  skirmish: number
  winner: PlayerId | 'tie'
  finalScore: Record<PlayerId, number>
  draftLeader: PlayerId
  draftedCards: Record<PlayerId, string[]>
  formations: Record<PlayerId, string[]>
  oaths: Record<PlayerId, Record<string, boolean>>
  clashesPlayed: number
  unrevealedCards: Record<PlayerId, string[]>
  clashes: ClashResolution[]
  edgeCases: string[]
}

export interface GameState {
  config: GameConfig
  phase: Phase
  skirmishNumber: number
  tokens: Record<PlayerId, number>
  leader: PlayerId
  draftTurn: PlayerId
  draftPool: Card[]
  hands: Record<PlayerId, Card[]>
  formations: Record<PlayerId, Card[]>
  oaths: Record<PlayerId, Record<string, boolean>>
  locked: Record<PlayerId, boolean>
  activeFormationPlayer: PlayerId
  currentGod: Card | null
  battleDeck: Card[]
  godDeck: Card[]
  discard: Card[]
  currentClash: number
  cursors: Record<PlayerId, number>
  chainBreaks: Record<PlayerId, number[]>
  penalties: Record<PlayerId, boolean>
  previousDefeatMargins: Record<PlayerId, number>
  songBonuses: Record<PlayerId, number>
  clashWins: Record<PlayerId, number>
  currentResolution: ClashResolution | null
  clashes: ClashResolution[]
  log: string[]
  edgeCases: string[]
  lastSkirmishWinner: PlayerId | 'tie' | null
  history: SkirmishRecord[]
}

export interface ResolveClashInput {
  leftFormation: Card[]
  rightFormation: Card[]
  leftCursor: number
  rightCursor: number
  leftOaths: Record<string, boolean>
  rightOaths: Record<string, boolean>
  leftChainBreaks: number[]
  rightChainBreaks: number[]
  leftPenalty?: boolean
  rightPenalty?: boolean
  previousDefeatMargins?: Record<PlayerId, number>
  songBonuses?: Record<PlayerId, number>
  config: GameConfig
}
