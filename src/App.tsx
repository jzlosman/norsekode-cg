import { useMemo, useState } from 'react'
import { DEFAULT_CONFIG } from './game/config'
import {
  advanceGodReveal,
  beginNextSkirmish,
  createWar,
  draftCard,
  computeChainBonuses,
  lockFormation,
  reorderFormation,
  resolveCurrentClash,
  revealOaths,
  setOath,
} from './game/engine'
import type { Card, ClashEntry, GameConfig, GameState, PlayerId, WeaponType } from './game/types'
import './styles.css'

const players: PlayerId[] = ['left', 'right']
const playerName = (player: PlayerId): string => player === 'left' ? 'Player 1' : 'Player 2'
const isFormationPhase = (phase: GameState['phase']): boolean => ['FORMATION', 'FORMATION_LOCKED'].includes(phase)
const cardAssetPath = (card: Card): string => `/assets/cards/${card.id}.png`

function WeaponIcon({ weapon, size = 24 }: { weapon: WeaponType; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
  if (weapon === 'axe') {
    return <svg {...common}><path d="M6.5 4.5v15M6.5 6.5h8.2c2.1 0 3.3 1.1 3.3 3s-1.2 3-3.3 3H6.5M6.5 12.5h6.1c2.1 0 3.3 1.1 3.3 3s-1.2 3-3.3 3H6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  }
  if (weapon === 'sword') {
    return <svg {...common}><path d="m5.5 4.5 12 12M16.7 4.5H19v2.3M6.7 16.7l-2.2 2.2M8.2 14.8l-3 3M5.5 19.2l-.7-.7M7.5 17.2l-.7-.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  }
  if (weapon === 'spear') {
    return <svg {...common}><path d="M5 19 18.6 5.4M15.6 4.5h4v4M4 16.2l3.8 3.8M5.8 14.4l3.8 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  }
  return <svg {...common}><circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.5" /><path d="m12 4.5 1.1 4.4L17.5 8l-3.4 3.1 3.4 3.1-4.4-.9L12 17.5l-1.1-4.2-4.4.9 3.4-3.1L6.5 8l4.4.9L12 4.5Z" fill="currentColor" /></svg>
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return <svg className="chevron" viewBox="0 0 16 16" aria-hidden="true"><path d={direction === 'left' ? 'm10 3-5 5 5 5' : 'm6 3 5 5-5 5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function SettingsIcon() {
  return <svg className="settings-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.6 1.8h2.8l.4 1.5a5 5 0 0 1 1.1.7l1.5-.4 1.4 2.4-1.1 1.1a5 5 0 0 1 0 1.4l1.1 1.1-1.4 2.4-1.5-.4a5 5 0 0 1-1.1.7l-.4 1.5H6.6l-.4-1.5a5 5 0 0 1-1.1-.7l-1.5.4-1.4-2.4 1.1-1.1a5 5 0 0 1 0-1.4L2.2 6l1.4-2.4 1.5.4a5 5 0 0 1 1.1-.7l.4-1.5Z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /><circle cx="8" cy="7.8" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
}

function CardView({
  card,
  chainBonus,
  oath,
  oathVisible = false,
  hidden = false,
  compact = false,
  consumed = false,
}: {
  card: Card
  chainBonus?: number
  oath?: boolean
  oathVisible?: boolean
  hidden?: boolean
  compact?: boolean
  consumed?: boolean
}) {
  if (hidden) {
    return <div className={`playing-card card-back ${compact ? 'compact' : ''}`} aria-label="Unrevealed warrior"><img className="card-asset" src="/assets/cards/card-back.png" alt="Unrevealed warrior" /></div>
  }
  return <div className={`playing-card suit-${card.weaponType} category-${card.category} ${compact ? 'compact' : ''} ${consumed ? 'consumed' : ''}`}>
    <img className="card-asset" src={cardAssetPath(card)} alt={card.name} />
    <div className="card-overlay" aria-hidden="true">
      {chainBonus !== undefined && <span className="chain-badge">+{chainBonus} chain</span>}
      {oathVisible && oath !== undefined && <span className={`oath-badge ${oath ? 'is-sworn' : 'is-unsworn'}`}>{oath ? 'Oath sworn' : 'Oath untaken'}</span>}
      {consumed && <span className="consumed-stamp">Consumed</span>}
    </div>
  </div>
}

function PhaseRail({ phase }: { phase: GameState['phase'] }) {
  const active = phase === 'DRAFT' ? 0 : isFormationPhase(phase) || phase === 'OATH_REVEAL' ? 1 : phase === 'CLASH_RESOLUTION' || phase === 'SKIRMISH_COMPLETE' ? 2 : phase === 'WAR_COMPLETE' ? 3 : 0
  const steps = ['Draft', 'Form', 'Resolve', 'War']
  return <div className="phase-rail" aria-label="Game phases">
    {steps.map((step, index) => <div className={`phase-step ${index === active ? 'active' : ''} ${index < active ? 'complete' : ''}`} key={step}>
      <span className="phase-dot">{index < active ? '✓' : String(index + 1).padStart(2, '0')}</span><span>{step}</span>
    </div>)}
  </div>
}

function Scoreboard({ state }: { state: GameState }) {
  return <section className="scoreboard" aria-label="War score">
    <div className="score-player"><span className="score-label">PLAYER 1</span><strong>{state.tokens.left}</strong><span className="score-divider">/ {state.config.skirmishesToWin} wins</span></div>
    <div className="score-center"><span className="sigil">ᛟ</span><span>War {state.skirmishNumber}</span></div>
    <div className="score-player right"><span className="score-label">PLAYER 2</span><strong>{state.tokens.right}</strong><span className="score-divider">/ {state.config.skirmishesToWin} wins</span></div>
  </section>
}

function DraftPanel({ state, onDraft }: { state: GameState; onDraft: (id: string) => void }) {
  const canDraft = state.phase === 'DRAFT'
  const awaitingGod = state.phase === 'GOD_REVEAL'
  return <section className="panel draft-panel">
    <div className="panel-heading"><div><span className="section-kicker">Open selection</span><h2>Choose your warriors</h2></div><span className="pool-count">{state.draftPool.length} in pool</span></div>
    <div className="turn-callout"><span className="turn-pip" />{awaitingGod ? <><strong>Mythos revealed.</strong><span>Advance above to begin the open draft.</span></> : canDraft ? <><strong>{playerName(state.draftTurn)} picks now.</strong><span>Every card is known. The formation is not.</span></> : <><strong>Draft complete.</strong><span>Both battle lines are ready to be formed.</span></>}</div>
    <div className="draft-pool">
      {state.draftPool.map((card) => <button key={card.id} className="draft-card-button" onClick={() => onDraft(card.id)} disabled={!canDraft} aria-label={`Draft ${card.name}`}><CardView card={card} compact /><span className="draft-action">Select</span></button>)}
    </div>
    <div className="drafted-summary">
      {players.map((player) => <div className="drafted-row" key={player}><span className="summary-label">{playerName(player)}'s hand</span><div className="mini-hand">{state.hands[player].map((card) => <span className={`mini-card suit-${card.weaponType}`} key={card.id} title={card.name}><span>{card.rank ?? card.printedStrength}</span><WeaponIcon weapon={card.weaponType} size={15} /></span>)}</div><span className="hand-count">{state.hands[player].length}/{state.config.cardsPerPlayer}</span></div>)}
    </div>
  </section>
}

function FormationPlayer({ state, player, viewMode, onMove, onOath, onLock }: { state: GameState; player: PlayerId; viewMode: 'play' | 'debug'; onMove: (player: PlayerId, from: number, to: number) => void; onOath: (player: PlayerId, id: string, sworn: boolean) => void; onLock: (player: PlayerId) => void }) {
  const hidden = viewMode === 'play' && (state.locked[player] || state.activeFormationPlayer !== player)
  const editable = isFormationPhase(state.phase) && !state.locked[player] && (viewMode === 'debug' || state.activeFormationPlayer === player)
  const bonuses = computeChainBonuses(state.formations[player], state.config)
  return <div className={`formation-player ${state.locked[player] ? 'locked' : ''}`}>
    <div className="formation-header"><div><span className="section-kicker">{player === 'left' ? 'North line' : 'South line'}</span><h3>{playerName(player)}</h3></div><span className={`lock-status ${state.locked[player] ? 'locked-status' : ''}`}>{state.locked[player] ? 'Line locked' : editable ? 'Arrange in secret' : 'Waiting'}</span></div>
    {hidden ? <div className="hidden-formation"><div className="hidden-rune">ᛉ</div><strong>{state.locked[player] ? 'Formation locked' : 'Formation hidden'}</strong><span>{state.locked[player] ? `Pass the screen to ${playerName(state.activeFormationPlayer)}.` : `${playerName(state.activeFormationPlayer)} is arranging their line.`}</span></div> : <>
      <div className="formation-slots">
        {state.formations[player].map((card, index) => <div className="formation-slot" key={card.id}>
          <span className="slot-number">0{index + 1}</span>
          <CardView card={card} chainBonus={bonuses[index]} oath={state.oaths[player][card.id]} />
          {editable && <div className="slot-controls"><button onClick={() => onMove(player, index, index - 1)} disabled={index === 0} aria-label={`Move ${card.name} left`}><Chevron direction="left" /></button><button onClick={() => onMove(player, index, index + 1)} disabled={index === state.formations[player].length - 1} aria-label={`Move ${card.name} right`}><Chevron direction="right" /></button></div>}
          {editable && card.category === 'bloodsworn' && index < state.formations[player].length - 1 && <div className="oath-controls"><span>Blood Oath</span><button className={state.oaths[player][card.id] ? 'selected' : ''} onClick={() => onOath(player, card.id, true)}>Sworn</button><button className={state.oaths[player][card.id] === false ? 'selected muted' : ''} onClick={() => onOath(player, card.id, false)}>Untaken</button></div>}
        </div>)}
      </div>
      {editable && <button className="primary-action lock-button" onClick={() => onLock(player)}>Lock {playerName(player)}'s formation <span>→</span></button>}
    </>}
  </div>
}

function FormationPanel({ state, viewMode, onMove, onOath, onLock, onOathsReveal }: { state: GameState; viewMode: 'play' | 'debug'; onMove: (player: PlayerId, from: number, to: number) => void; onOath: (player: PlayerId, id: string, sworn: boolean) => void; onLock: (player: PlayerId) => void; onOathsReveal: () => void }) {
  const ready = state.phase === 'OATH_REVEAL'
  return <section className="panel formation-panel">
    <div className="panel-heading"><div><span className="section-kicker">Secret arrangement</span><h2>Set the battle lines</h2></div><span className="pool-count">Positions 01—05</span></div>
    <div className="formation-note"><span className="note-mark">i</span><span>Chain bonuses follow original position. A locked line cannot be rearranged.</span></div>
    <div className="formation-stack">
      {players.map((player) => <FormationPlayer key={player} state={state} player={player} viewMode={viewMode} onMove={onMove} onOath={onOath} onLock={onLock} />)}
    </div>
    {ready && <div className="oath-reveal-callout"><div><span className="section-kicker">Both lines committed</span><h3>Reveal the Blood Oaths</h3><p>No formation changes after this point.</p></div><button className="primary-action" onClick={onOathsReveal}>Reveal oaths <span>→</span></button></div>}
  </section>
}

function EntryReadout({ entry, title, isWinner }: { entry: ClashEntry | null; title: string; isWinner: boolean }) {
  if (!entry) return <div className="entry-readout empty-entry"><span className="entry-title">{title}</span><strong>No warrior available</strong><span>Automatic Clash loss.</span></div>
  return <div className={`entry-readout ${isWinner ? 'winning-entry' : ''}`}>
    <div className="entry-title-row"><span className="entry-title">{title}</span>{isWinner && <span className="winner-tag">Clash winner</span>}</div>
    <div className="entry-cards">{entry.cards.map((card, index) => <div className="entry-card" key={card.id}><CardView card={card} chainBonus={entry.breakdown[index].chainBonus} consumed={index > 0} oathVisible={false} /></div>)}</div>
    <div className="entry-math">{entry.breakdown.map((item) => <span key={item.cardId}>{item.printedStrength}{item.chainBonus ? ` + ${item.chainBonus}` : ''}{item.abilityBonus ? ` + ${item.abilityBonus}` : ''}</span>)}<b>= {entry.finalStrength}</b></div>
    {entry.isBloodswornCombo && <span className="entry-caption">Bloodsworn oath · partner consumed</span>}
  </div>
}

function BattleLine({ state, player, viewMode }: { state: GameState; player: PlayerId; viewMode: 'play' | 'debug' }) {
  const revealed = useMemo(() => new Set(state.clashes.flatMap((clash) => {
    const entry = player === 'left' ? clash.leftEntry : clash.rightEntry
    return entry?.cardIds ?? []
  })), [state.clashes, player])
  const bonuses = computeChainBonuses(state.formations[player], state.config, state.chainBreaks[player])
  return <div className="battle-line"><div className="battle-line-heading"><span>{playerName(player)}</span><span>{state.clashWins[player]} wins</span></div><div className="battle-line-slots">{state.formations[player].map((card, index) => <div className="battle-slot" key={card.id}><span>0{index + 1}</span><CardView card={card} chainBonus={bonuses[index]} hidden={viewMode === 'play' && !revealed.has(card.id)} consumed={revealed.has(card.id) && state.clashes.some((clash) => (player === 'left' ? clash.leftEntry : clash.rightEntry)?.consumedCardIds.includes(card.id))} compact /></div>)}</div></div>
}

function OathSummary({ state }: { state: GameState }) {
  const oathCards = players.flatMap((player) => state.formations[player].filter((card) => card.category === 'bloodsworn').map((card) => ({ player, card })))
  if (!oathCards.length) return null
  return <div className="oath-summary"><span className="oath-summary-label">Blood Oaths revealed</span>{oathCards.map(({ player, card }) => <span className={`oath-result ${state.oaths[player][card.id] ? 'sworn' : 'untaken'}`} key={card.id}><b>{playerName(player)}</b> · {state.oaths[player][card.id] ? 'Sworn' : 'Untaken'}</span>)}</div>
}

function ClashPanel({ state, viewMode, onClash, onNextSkirmish }: { state: GameState; viewMode: 'play' | 'debug'; onClash: () => void; onNextSkirmish: () => void }) {
  const resolution = state.currentResolution
  const winner = resolution?.winner
  return <section className="panel clash-panel">
    <div className="panel-heading"><div><span className="section-kicker">Sequential reveal</span><h2>{state.phase === 'CLASH_RESOLUTION' ? `Clash ${state.currentClash}` : 'The lines collide'}</h2></div><span className="clash-score">{state.clashWins.left} — {state.clashWins.right}</span></div>
    <div className="battle-lines"><BattleLine state={state} player="left" viewMode={viewMode} /><div className="versus-mark">VS</div><BattleLine state={state} player="right" viewMode={viewMode} /></div>
    <OathSummary state={state} />
    {resolution ? <div className="resolution-readout"><div className="readout-heading"><span>Resolution readout</span><span className={`result-chip ${winner === 'tie' ? 'tie' : ''}`}>{winner === 'tie' ? 'Tied Clash' : `${playerName(winner!)} wins`}</span></div><div className="entry-grid"><EntryReadout entry={resolution.leftEntry} title="Player 1 entry" isWinner={winner === 'left'} /><EntryReadout entry={resolution.rightEntry} title="Player 2 entry" isWinner={winner === 'right'} /></div><div className="resolution-note">{resolution.logs[resolution.logs.length - 1]}</div></div> : <div className="ready-to-reveal"><span className="reveal-rune">ᛏ</span><div><strong>Both lines are locked.</strong><span>Reveal one Clash at a time. Unrevealed warriors stay hidden.</span></div></div>}
    {state.phase === 'CLASH_RESOLUTION' && <button className="primary-action reveal-button" onClick={onClash}>{resolution ? `Reveal Clash ${state.currentClash}` : 'Reveal Clash 1'} <span>→</span></button>}
    {state.phase === 'SKIRMISH_COMPLETE' && <div className="complete-callout"><div><span className="section-kicker">Skirmish complete</span><h3>{state.lastSkirmishWinner === 'tie' ? 'The lines held.' : `${playerName(state.lastSkirmishWinner!)} takes the Skirmish.`}</h3><p>Final score {state.clashWins.left} — {state.clashWins.right}. Unrevealed warriors were not exposed.</p></div><button className="primary-action" onClick={onNextSkirmish}>Next skirmish <span>→</span></button></div>}
    {state.phase === 'WAR_COMPLETE' && <div className="war-complete"><span className="war-rune">ᛟ</span><div><span className="section-kicker">War won</span><h3>{playerName(state.tokens.left >= state.config.skirmishesToWin ? 'left' : 'right')} holds the high seat.</h3><p>Start another War to test the line again.</p></div></div>}
  </section>
}

function LogPanel({ state, onExport }: { state: GameState; onExport: () => void }) {
  return <aside className="log-column"><section className="log-panel"><div className="panel-heading log-heading"><div><span className="section-kicker">Playtest record</span><h2>Combat log</h2></div><span className="log-count">{state.log.length} events</span></div><div className="log-list" aria-live="polite">{state.log.slice().reverse().map((line, index) => <p key={`${line}-${index}`} className={line.startsWith('—') ? 'log-clash' : ''}>{line}</p>)}</div><button className="secondary-action export-button" onClick={onExport}>Export playtest JSON <span>↓</span></button></section><section className="edge-panel"><div className="panel-heading"><div><span className="section-kicker">Questions to review</span><h2>Edge cases</h2></div><span className="log-count">{state.edgeCases.length}</span></div>{state.edgeCases.length ? <ul>{state.edgeCases.map((edge) => <li key={edge}>{edge}</li>)}</ul> : <p className="empty-copy">Unusual interactions will appear here as the War unfolds.</p>}</section></aside>
}

function SettingsPanel({ config, open, onToggle, onConfigChange, onNewWar }: { config: GameConfig; open: boolean; onToggle: () => void; onConfigChange: (config: GameConfig) => void; onNewWar: () => void }) {
  return <div className="settings-wrap"><button className="settings-trigger" onClick={onToggle} aria-expanded={open}><SettingsIcon /> Prototype settings <span className="trigger-chevron">{open ? '−' : '+'}</span></button>{open && <div className="settings-panel"><div><span className="section-kicker">Balance levers</span><h2>Playtest settings</h2><p>Changes apply when you start a new War.</p></div><label>Skirmishes to win<input type="number" min="1" max="9" value={config.skirmishesToWin} onChange={(event) => onConfigChange({ ...config, skirmishesToWin: Math.max(1, Number(event.target.value) || 1) })} /></label><label className="checkbox-label"><input type="checkbox" checked={config.godCardsEnabled} onChange={(event) => onConfigChange({ ...config, godCardsEnabled: event.target.checked })} /> Reveal a decorative Mythos card</label><label>Tie fallback<select value={config.tieBehavior} onChange={(event) => onConfigChange({ ...config, tieBehavior: event.target.value as GameConfig['tieBehavior'] })}><option value="no-winner">No player earns it</option><option value="left-wins">Player 1 wins ties</option></select></label><button className="secondary-action" onClick={onNewWar}>Start new War</button></div>}</div>
}

function App() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG)
  const [state, setState] = useState<GameState>(() => createWar(DEFAULT_CONFIG))
  const [viewMode, setViewMode] = useState<'play' | 'debug'>('play')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const update = (next: GameState) => setState(next)
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ current: state, skirmishes: state.history }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'norse-kode-playtest.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const handleNewWar = () => update(createWar(config))

  return <div className="app-shell">
    <header className="topbar"><div className="brand-lockup"><span className="brand-mark">ᛟ</span><div><strong>NORSE KODE</strong><span>Battle card prototype · v0.1</span></div></div><div className="top-actions"><div className="mode-switch" role="group" aria-label="View mode"><button className={viewMode === 'play' ? 'active' : ''} onClick={() => setViewMode('play')}>Play mode</button><button className={viewMode === 'debug' ? 'active' : ''} onClick={() => setViewMode('debug')}>Debug mode</button></div><SettingsPanel config={config} open={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} onConfigChange={setConfig} onNewWar={handleNewWar} /></div></header>
    <main className="main-content"><div className="intro-row"><div><h1>The lines are known.<br /><em>The order is not.</em></h1><p>Draft openly. Form in secret. Let the clash tell you who read the other line best.</p></div><PhaseRail phase={state.phase} /></div>
      <Scoreboard state={state} />
      {state.phase === 'GOD_REVEAL' && <section className="mythos-banner"><div className="mythos-seal">ᛟ</div><div><span className="section-kicker">Decorative Mythos · no effect in v0.1</span><h2>{state.currentGod?.name ?? 'Fate'} watches this Skirmish.</h2><p>Divine rules are reserved for a later playtest.</p></div><button className="primary-action" onClick={() => update(advanceGodReveal(state))}>Enter the draft <span>→</span></button></section>}
      <div className="workspace"><div className="primary-column">{state.phase === 'DRAFT' || state.phase === 'GOD_REVEAL' ? <DraftPanel state={state} onDraft={(id) => update(draftCard(state, id))} /> : <FormationPanel state={state} viewMode={viewMode} onMove={(player, from, to) => update(reorderFormation(state, player, from, to, viewMode === 'debug'))} onOath={(player, id, sworn) => update(setOath(state, player, id, sworn, viewMode === 'debug'))} onLock={(player) => update(lockFormation(state, player, viewMode === 'debug'))} onOathsReveal={() => update(revealOaths(state))} />}{['CLASH_RESOLUTION', 'SKIRMISH_COMPLETE', 'WAR_COMPLETE'].includes(state.phase) && <ClashPanel state={state} viewMode={viewMode} onClash={() => update(resolveCurrentClash(state))} onNextSkirmish={() => update(beginNextSkirmish(state))} />}</div><LogPanel state={state} onExport={handleExport} /></div>
    </main><footer><span>Draft → Predict → Form → Reveal → Resolve</span><span>Prototype for playtesting · no Gods active</span></footer>
  </div>
}

export default App
