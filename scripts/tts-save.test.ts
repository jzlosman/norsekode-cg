import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { imagePointToLocal, imagePointToWorld, loadBoardLayout } from './tts-board-layout.mjs'
import { buildTtsSave, loadSource } from './tts-save.mjs'

const assetBaseUrl = 'https://example.com/norse-kode/'
const boardLayoutFile = new URL('../tts/board-layout.json', import.meta.url)
const tableGeneratorFile = new URL('./generate-tts-table.py', import.meta.url)
const playerMatGeneratorFile = new URL('./generate-tts-player-mat.py', import.meta.url)
const tokenAssetFiles = [
  'norse-clash-token.png',
  'norse-skirmish-token.png',
  'oath-yes.png',
  'oath-no.png',
].map((name) => new URL(`../tts/assets/${name}`, import.meta.url))

const allContainedCards = (save: any) => {
  const deck = save.ObjectStates.find((object: any) => object.Name === 'DeckCustom')
  return deck.ContainedObjects
}

describe('TTS save generation', () => {
  it('embeds the basic solo AI controller mode', () => {
    const save = buildTtsSave({ ...loadSource() })

    expect(save.LuaScript).toContain('soloMode = true')
    expect(save.LuaScript).toContain('aiDraftCard')
    expect(save.LuaScript).toContain('aiCommitFormation')
    expect(save.LuaScript).toContain('AI drafted a hidden warrior.')
    expect(save.LuaScript).toContain('function setFaceDown(card)')
    expect(save.LuaScript).toContain('function setFaceUp(card)')
    expect(save.LuaScript).toContain('card.setRotation({ x = 0, y = 180, z = 180 })')
    expect(save.LuaScript).toContain('ensureFaceUp(card)')
    expect(save.LuaScript).toContain('Solo mode requires one human side')
    expect(save.LuaScript).toContain('Solo mode allows only one human side')
    expect(save.LuaScript).toContain('AI could not find a drafted card object')
  })

  it('embeds exhaustive strategic formation and Blood Oath search', () => {
    const save = buildTtsSave({ ...loadSource() })
    const formationAi = save.LuaScript.slice(
      save.LuaScript.indexOf('function aiCommitFormation'),
      save.LuaScript.indexOf('function scheduleAiTurn'),
    )

    expect(save.LuaScript).toContain('function generateFormationPlans')
    expect(save.LuaScript).toContain('function simulateSkirmish')
    expect(save.LuaScript).toContain('function evaluateFormationPlan')
    expect(save.LuaScript).toContain('function createStrategicFormationSearch')
    expect(save.LuaScript).toContain('function advanceStrategicFormationSearch')
    expect(save.LuaScript).toContain('function continueAiFormationSearch')
    expect(save.LuaScript).toContain('aiNearOptimalTolerance = 0.03')
    expect(save.LuaScript).toContain('aiSearchMatchupsPerFrame = 120')
    expect(save.LuaScript).toContain('shieldMaidenVengeanceCap = nil')
    expect(save.LuaScript).toContain('jarlWinBonus = 3')
    expect(save.LuaScript).toContain('jarlTieBonus = 2')
    expect(save.LuaScript).toContain('jarlLossBonus = 1')
    expect(save.LuaScript).toContain('ability = "shield_maiden"')
    expect(save.LuaScript).toContain('{ id = "jarl", name = "Jarl", strength = 11, ability = "jarl" }')
    expect(save.LuaScript).toContain('isJarl = primary.ability == "jarl"')
    expect(save.LuaScript).toContain('cards["skald-" .. copy] = cards["jarl-" .. copy]')
    expect(save.LuaScript).not.toContain('skaldWinBonus')
    expect(save.LuaScript).not.toContain('isSkald')
    expect(save.LuaScript).not.toContain('ability = "skald"')
    expect(save.LuaScript).toContain('function addHeroCarryover')
    expect(formationAi).not.toContain('table.sort(formation')
    expect(formationAi).not.toContain('STATE.oaths[side][guid] = true')
  })

  it('uses a custom battlefield table and matching fjord background', () => {
    const save = buildTtsSave({ assetBaseUrl, luaScript: '-- test lua', uiXml: '<!-- test ui -->' })

    expect(save.Table).toBe('Table_Custom')
    expect(save.TableURL).toBe(`${assetBaseUrl}norse-kode-battlefield-table.png`)
    expect(save.Sky).toBe('Sky_Museum')
    expect(save.SkyURL).toBe(`${assetBaseUrl}norse-kode-fjord-sky.png`)
  })

  it('adds a locked physical music console and embeds the ordered hosted playlist', () => {
    const save = buildTtsSave({ assetBaseUrl, ...loadSource() })
    const musicConsole = save.ObjectStates.find((object: any) => object.Nickname === 'Voiceless Edda Music Console')

    expect(musicConsole).toMatchObject({
      Name: 'Custom_Tile',
      GUID: 'm00001',
      Locked: true,
      Transform: { posX: 4.6, posY: 1.1, posZ: 16, rotY: 0, scaleX: 0.8, scaleZ: 0.625 },
      CustomImage: { ImageURL: `${assetBaseUrl}norse-kode-music-console.png` },
    })
    expect(save.LuaScript).toContain('MUSIC_CONSOLE_GUID = "m00001"')
    expect(save.LuaScript).toContain('MUSIC_PLAYLIST = {')
    expect(save.LuaScript).toContain(`url = "${assetBaseUrl}music/01-ginnungagap-the-yawning-silence.mp3"`)
    expect(save.LuaScript).toContain('title = "Ginnungagap — The Yawning Silence"')
    expect(save.LuaScript).toContain(`url = "${assetBaseUrl}music/09-lif-and-lifthrasir-the-next-new-beginning.mp3"`)
    expect(save.LuaScript.indexOf('01-ginnungagap')).toBeLessThan(save.LuaScript.indexOf('09-lif-and-lifthrasir'))
    expect(save.LuaScript).toContain('function installMusicConsole')
    expect(save.LuaScript).toContain('function musicTogglePlay')
    expect(save.LuaScript).toContain('function musicPrevious')
    expect(save.LuaScript).toContain('function musicNext')
    expect(save.LuaScript).toContain('function musicToggleShuffle')
    expect(save.LuaScript).toContain('MusicPlayer.setPlaylist(MUSIC_PLAYLIST)')
    expect(save.LuaScript).toContain('MusicPlayer.getCurrentAudioclip()')
    expect(save.LuaScript).toContain('musicConsole.setDescription')
    const onLoad = save.LuaScript.slice(save.LuaScript.indexOf('function onLoad'), save.LuaScript.indexOf('function onSave'))
    expect(onLoad).toContain('installMusicConsole()')
    expect(onLoad).not.toContain('MusicPlayer.play()')

    const overridden = buildTtsSave({
      assetUrls: {
        musicConsole: 'https://assets.example/console.png',
        musicBase: 'https://audio.example/album',
      },
      luaScript: '-- test lua',
      uiXml: '<!-- test ui -->',
    })
    const overriddenConsole = overridden.ObjectStates.find((object: any) => object.Nickname === 'Voiceless Edda Music Console')
    expect(overriddenConsole.CustomImage.ImageURL).toBe('https://assets.example/console.png')
    expect(overridden.LuaScript).toContain('url = "https://audio.example/album/01-ginnungagap-the-yawning-silence.mp3"')
  })

  it('builds one 42-card custom deck from the existing card manifest', () => {
    const save = buildTtsSave({ assetBaseUrl, luaScript: '-- test lua', uiXml: '<!-- test ui -->' })
    const deck = save.ObjectStates.find((object: any) => object.Name === 'DeckCustom')
    const cards = allContainedCards(save)

    expect(cards).toHaveLength(42)
    expect(new Set(cards.map((card: any) => card.GMNotes)).size).toBe(42)
    expect(deck.DeckIDs).toEqual(Array.from({ length: 42 }, (_, index) => 100 + index))
    expect(cards.map((card: any) => card.CardID)).toEqual(deck.DeckIDs)
    expect(deck.CustomDeck['1']).toMatchObject({
      FaceURL: `${assetBaseUrl}norse-kode-deck.png`,
      BackURL: `${assetBaseUrl}card-back.png`,
      NumWidth: 7,
      NumHeight: 6,
    })
    expect(deck.Transform.rotZ).toBe(180)
  })

  it('builds a separate ten-card Watcher deck with its own atlas', () => {
    const save = buildTtsSave({ assetBaseUrl, ...loadSource() })
    const watcherDeck = save.ObjectStates.find((object: any) => object.Nickname === 'Norse Kode Watcher Deck')
    const cards = watcherDeck.ContainedObjects

    expect(cards).toHaveLength(10)
    expect(cards.map((card: any) => card.GMNotes)).toEqual([
      'watcher-thor', 'watcher-tyr', 'watcher-odin', 'watcher-loki', 'watcher-heimdall',
      'watcher-frigg', 'watcher-skadi', 'watcher-njordr', 'watcher-the-norns', 'watcher-fimbulwinter',
    ])
    expect(watcherDeck.DeckIDs).toEqual(Array.from({ length: 10 }, (_, index) => 200 + index))
    expect(watcherDeck.CustomDeck['2']).toMatchObject({
      FaceURL: `${assetBaseUrl}norse-kode-watchers.png`,
      BackURL: `${assetBaseUrl}card-back.png`,
      NumWidth: 5,
      NumHeight: 2,
    })
    expect(save.LuaScript).toContain('WATCHER_DECK_GUID = "d00002"')
    expect(save.LuaScript).toContain('godCardsEnabled = false')
    expect(save.XmlUI).toContain('id="watcher-reveal-controls"')
    expect(save.XmlUI).toContain('id="north-watcher-panel"')
    expect(save.XmlUI).toContain('id="south-watcher-panel"')
    expect(save.XmlUI).toContain('onClick="chooseWatcherSlot"')
    expect(save.XmlUI).toContain('onClick="finishWatcherChoice"')
    expect(save.LuaScript).toContain('card.setInvisibleTo({ opponentColor })')
  })

  it('places the board and control mats above the TTS tabletop surface', () => {
    const save = buildTtsSave({ assetBaseUrl, luaScript: '-- test lua', uiXml: '<!-- test ui -->' })
    const objects = save.ObjectStates

    expect(objects.find((object: any) => object.Nickname === 'Norse Kode Board').Transform.posY).toBeGreaterThan(0.9)
    expect(objects.find((object: any) => object.Nickname === 'North Player Mat').Transform.posY).toBeGreaterThan(0.9)
    expect(objects.find((object: any) => object.Nickname === 'South Player Mat').Transform.posY).toBeGreaterThan(0.9)
    expect(objects.find((object: any) => object.Nickname === 'Host Controls').Transform.posY).toBeGreaterThan(0.9)
  })

  it('uses a board large enough for the formation rows and readable player mats', () => {
    const save = buildTtsSave({ assetBaseUrl, ...loadSource() })
    const board = save.ObjectStates.find((object: any) => object.Nickname === 'Norse Kode Board')
    const north = save.ObjectStates.find((object: any) => object.Nickname === 'North Player Mat')
    const south = save.ObjectStates.find((object: any) => object.Nickname === 'South Player Mat')
    const hostControls = save.ObjectStates.find((object: any) => object.Nickname === 'Host Controls')

    expect(board.Transform.scaleX).toBe(8)
    expect(board.Transform.scaleZ).toBe(6.8)
    expect(board.Transform.rotY).toBe(0)
    expect(north.Name).toBe('Custom_Tile')
    expect(south.Name).toBe('Custom_Tile')
    expect(north.Transform.scaleX).toBeCloseTo(3.3)
    expect(north.Transform.scaleZ).toBeCloseTo(3.6)
    expect(north.Transform.scaleX / north.Transform.scaleZ).toBeCloseTo(0.9167, 3)
    expect(save.LuaScript).toContain('SLOT_X = { -6, -3, 0, 3, 6 }')
    expect(save.LuaScript).toContain('SLOT_Z = { north = -11.2, south = 11.2 }')
    expect(save.LuaScript).toContain('scale = { x = 8, z = 6.8 }')
    expect(save.LuaScript).toContain('PLAYER_MAT_SCALE_Z = 3.6')
    expect(save.LuaScript).toContain('return { x = SLOT_X[index], y = 1.35, z = SLOT_Z[side] }')
    expect(save.LuaScript).toContain('side == "north" and -CLASH_MARKER_OFFSET or CLASH_MARKER_OFFSET')
    expect(save.LuaScript).toContain('side == "north" and SKIRMISH_TRACK_OFFSET or -SKIRMISH_TRACK_OFFSET')
    expect(save.LuaScript).toContain('side == "north" and -0.85 or 0.85')
    expect(save.LuaScript).toContain('y = 1.85')
    expect(save.LuaScript).toContain('y = 1.9')
    expect(north.Transform.rotY).toBe(180)
    expect(north.Transform.posY).toBeCloseTo(1.1)
    expect(north.Transform.posZ).toBeCloseTo(-11.2)
    expect(south.Transform.scaleX).toBeCloseTo(3.3)
    expect(south.Transform.scaleZ).toBeCloseTo(3.6)
    expect(south.Transform.rotY).toBe(0)
    expect(south.Transform.posY).toBeCloseTo(1.1)
    expect(south.Transform.posZ).toBeCloseTo(11.2)
    const northGap = (board.Transform.posZ - board.Transform.scaleZ) - (north.Transform.posZ + north.Transform.scaleZ)
    const southGap = (south.Transform.posZ - south.Transform.scaleZ) - (board.Transform.posZ + board.Transform.scaleZ)
    expect(northGap).toBeCloseTo(0.8)
    expect(southGap).toBeCloseTo(0.8)
    expect(hostControls.Transform.posZ).toBeCloseTo(16)
    expect(north.CustomImage.CustomTile).toMatchObject({ Stretch: true })
    expect(south.CustomImage.CustomTile).toMatchObject({ Stretch: true })
  })

  it('leaves formation snap points unrestricted and moves committed cards exactly onto slots', () => {
    const save = buildTtsSave({ ...loadSource() })

    expect(save.LuaScript).not.toContain('tags = { "formation-slot" }')
    expect(save.LuaScript).toContain('function collectFormationCards(side)')
    expect(save.LuaScript).toContain('FORMATION_DROP_RADIUS = 7.5')
    expect(save.LuaScript).toContain('card.setPosition(slotPosition(side, index))')
  })

  it('uses one measured layout with TTS Type 0 tile UV orientation', () => {
    expect(existsSync(boardLayoutFile)).toBe(true)
    if (!existsSync(boardLayoutFile)) return

    const layout = JSON.parse(readFileSync(boardLayoutFile, 'utf8'))
    const generator = readFileSync(tableGeneratorFile, 'utf8')

    expect(layout).toMatchObject({
      canvas: { width: 1448, height: 1086 },
      boardScale: { x: 8, z: 6.8 },
      cardSize: { width: 188, height: 264 },
      draw: { x: 1248, y: 406 },
      discard: { x: 1248, y: 680 },
    })
    expect(layout.draft).toEqual([
      { x: 174, y: 406 }, { x: 368, y: 406 }, { x: 562, y: 406 }, { x: 756, y: 406 }, { x: 950, y: 406 },
      { x: 174, y: 680 }, { x: 368, y: 680 }, { x: 562, y: 680 }, { x: 756, y: 680 }, { x: 950, y: 680 },
    ])
    const loadedLayout = loadBoardLayout()
    expect(imagePointToLocal(loadedLayout, { x: 0, y: 0 })).toEqual({ x: 1448 / 1086, z: -1 })
    expect(imagePointToLocal(loadedLayout, { x: 1448, y: 1086 })).toEqual({ x: -1448 / 1086, z: 1 })
    const firstDraft = imagePointToWorld(loadedLayout, layout.draft[0])
    const lastDraft = imagePointToWorld(loadedLayout, layout.draft[9])
    expect(firstDraft).toMatchObject({ x: expect.closeTo(8.1031, 3), z: expect.closeTo(-1.7157, 3) })
    expect(lastDraft).toMatchObject({ x: expect.closeTo(-3.3297, 3), z: expect.closeTo(1.7157, 3) })
    expect(generator).toContain('board-layout.json')
    expect(generator).toContain('Inter-SemiBold.ttf')
    expect(generator).toContain('"-strip"')
    expect(generator).toContain('#46E3A8')
    expect(generator).toContain('#EAE2D0')
    expect(generator).not.toMatch(/THE MUSTER|TEN WARRIORS|DRAFT FIELD|DECKS|DRAFT OPENLY|FACE UP/)
    expect(generator).not.toMatch(/surfaceWash|auroraBloom|fieldFill|softShadow|slotShadow/)
  })

  it('uses a readable screen-space control panel instead of 3D action buttons', () => {
    const save = buildTtsSave({ ...loadSource() })
    const panelButtons = save.LuaScript.slice(save.LuaScript.indexOf('function installPanelButtons()'), save.LuaScript.indexOf('function musicHostGuard'))

    expect(save.XmlUI).toContain('id="game-controls"')
    expect(save.XmlUI).toContain('onClick="startWarUi"')
    expect(save.XmlUI).toContain('onClick="commitNorthUi"')
    expect(save.XmlUI).toContain('id="north-oath-status"')
    expect(save.XmlUI).toContain('SWEAR 2')
    expect(save.LuaScript).toContain('function startWarUi(player, value, id)')
    expect(panelButtons).not.toContain('.createButton')
    expect(save.LuaScript).not.toContain('board.createButton')
  })

  it('keeps the screen-space controls compact and reveals only the current phase action', () => {
    const save = buildTtsSave({ ...loadSource() })

    expect(save.XmlUI).toContain('<Panel id="game-controls" width="460" height="300"')
    expect(save.XmlUI).toContain('id="setup-controls"')
    expect(save.XmlUI).toContain('id="formation-controls"')
    expect(save.XmlUI).toContain('id="oath-controls"')
    expect(save.XmlUI).toContain('id="resolution-controls"')
    expect(save.XmlUI).not.toContain('text="HOST CONTROLS"')
    expect(save.XmlUI).not.toContain('text="PLAYER / SIDE"')
    expect(save.LuaScript).toContain('updateControlSection("setup-controls", setup)')
    expect(save.LuaScript).toContain('updateControlSection("formation-controls", northCommitActive or southCommitActive)')
    expect(save.LuaScript).toContain('local startIndex = math.max(1, #STATE.log - 2)')
  })

  it('keeps chroma green outside every extruded token silhouette', () => {
    for (const assetFile of tokenAssetFiles) {
      const greenPixelFraction = Number(execFileSync('magick', [
        fileURLToPath(assetFile),
        '-channel', 'RGBA',
        '-fx', '(a>0.01 && g>0.35 && g>r*1.35 && g>b*1.15)?1:0',
        '-format', '%[fx:mean]',
        'info:',
      ], { encoding: 'utf8' }))

      expect(greenPixelFraction, assetFile.pathname).toBe(0)
    }
  })

  it('includes an unlimited clash-token bag and awards a token to each clash winner', () => {
    const save = buildTtsSave({ ...loadSource() })
    const tokenBag = save.ObjectStates.find((object: any) => object.Nickname === 'Clash Token Bag')

    expect(tokenBag.Name).toBe('Infinite_Bag')
    expect(tokenBag.ContainedObjects).toHaveLength(1)
    expect(tokenBag.ContainedObjects[0].Name).toBe('Custom_Token')
    expect(tokenBag.ContainedObjects[0].Transform.scaleX).toBeCloseTo(0.2)
    expect(tokenBag.ContainedObjects[0].CustomImage.CustomToken).toMatchObject({ Stackable: false })
    expect(save.LuaScript).toContain('TOKEN_BAG_GUID = "b00005"')
    expect(save.LuaScript).toContain('clashTokens = {}')
    expect(save.LuaScript).toContain('function placeClashToken')
    expect(save.LuaScript).toContain('function clashTokenPosition')
    expect(save.LuaScript).toContain('placeClashToken(resolution.winner')
  })

  it('uses five-win population attrition with physical Skirmish victory tokens', () => {
    const save = buildTtsSave({ ...loadSource() })
    const skirmishBag = save.ObjectStates.find((object: any) => object.Nickname === 'Skirmish Token Bag')

    expect(save.LuaScript).toContain('skirmishesToWin = 5')
    expect(save.LuaScript).toContain('skirmishTokens = { north = {}, south = {} }')
    expect(save.LuaScript).toContain('function placeSkirmishToken')
    expect(save.LuaScript).toContain('function skirmishTokenPosition')
    expect(save.LuaScript).toContain('SKIRMISH_TRACK_X = { 0.8, 1.96, 3.12, 4.28, 5.44 }')
    expect(save.LuaScript).toContain('OATH_MARKER_LIMIT = 2')
    expect(skirmishBag.Name).toBe('Infinite_Bag')
    expect(skirmishBag.ContainedObjects[0].Name).toBe('Custom_Token')
  })

  it('uses full player battle mats with card-sized slots and Clash marker spaces', () => {
    const save = buildTtsSave({ ...loadSource() })
    const north = save.ObjectStates.find((object: any) => object.Nickname === 'North Player Mat')
    const south = save.ObjectStates.find((object: any) => object.Nickname === 'South Player Mat')

    expect(north.CustomImage.ImageURL).toContain('norse-kode-player-mat.png')
    expect(south.CustomImage.ImageURL).toContain('norse-kode-player-mat.png')
    expect(save.LuaScript).toContain('mat.setSnapPoints(snaps)')
    expect(save.LuaScript).toContain('CLASH_MARKER_OFFSET')
    expect(save.LuaScript).toContain('SLOT_Z = { north = -11.2, south = 11.2 }')
  })

  it('keeps the natural mat art and uses only restrained functional guides', () => {
    const generator = readFileSync(playerMatGeneratorFile, 'utf8')

    expect(generator).toContain('Inter-SemiBold.ttf')
    expect(generator).toContain('#EAE2D0')
    expect(generator).toContain('#46E3A8')
    expect(generator).toContain('"-strip"')
    expect(generator).toMatch(/>WINS<\/text>/)
    expect(generator).toMatch(/>CLASH<\/text>/)
    expect(generator).toContain('>OATH {index}</text>')
    expect(generator).not.toMatch(/VICTORY TRACK|FIRST TO 5 WINS|POPULATION|PLACE THE WINNING|BLOOD OATH|SLOT \{index\}/)
    expect(generator).not.toMatch(/linearGradient|filter id=|url\(#gold\)|url\(#slot\)/)
  })

  it('adds two ordered Blood Oath placeholder slots to each player mat', () => {
    const save = buildTtsSave({ ...loadSource() })
    const oathSlots = save.ObjectStates.filter((object: any) => object.Nickname?.startsWith('Blood Oath Slot'))

    expect(oathSlots).toHaveLength(4)
    expect(oathSlots.map((object: any) => object.Transform.posX)).toEqual([-1.85, 1.85, -1.85, 1.85])
    expect(oathSlots.map((object: any) => object.Transform.posY)).toEqual([1.3, 1.3, 1.3, 1.3])
    expect(oathSlots.map((object: any) => object.Transform.posZ)).toEqual([-13.8, -13.8, 13.8, 13.8])
    expect(oathSlots.map((object: any) => object.Transform.rotY)).toEqual([180, 180, 0, 0])
    expect(oathSlots.every((object: any) => object.Name === 'BlockSquare' && object.Locked)).toBe(true)
    expect(save.LuaScript).toContain('OATH_SLOT_GUIDS = {')
    expect(save.LuaScript).toContain('north = { "b00009", "b00010" }')
    expect(save.LuaScript).toContain('south = { "b00011", "b00012" }')
  })

  it('snaps the deck and face-up discard to their measured printed wells', () => {
    const save = buildTtsSave({ ...loadSource() })
    const names = save.ObjectStates.map((object: any) => object.Nickname)
    const deck = save.ObjectStates.find((object: any) => object.Nickname === 'Norse Kode Deck')
    const cards = deck.ContainedObjects

    expect(names).not.toEqual(expect.arrayContaining(['Draw Pile Slot', 'Discard Slot']))
    expect(deck.Transform.posX).toBeCloseTo(-7.7201, 3)
    expect(deck.Transform.posZ).toBeCloseTo(-1.7157, 3)
    expect(deck.Snap).toBe(true)
    expect(cards.every((card: any) => card.Snap === true)).toBe(true)
    expect(save.LuaScript).toContain('BOARD_LAYOUT.draw')
    expect(save.LuaScript).toContain('BOARD_LAYOUT.discard')
    expect(save.LuaScript).toContain('function boardWorldPosition')
    expect(save.LuaScript).toContain('board.positionToWorld')
    expect(save.LuaScript).toContain('position = boardWorldPosition(BOARD_LAYOUT.draft[index], 1.25)')
    const moveToDiscard = save.LuaScript.slice(save.LuaScript.indexOf('function moveToDiscard'), save.LuaScript.indexOf('function revealEntry'))
    const moveSkirmishCards = save.LuaScript.slice(save.LuaScript.indexOf('function moveSkirmishCardsToDiscard'), save.LuaScript.indexOf('function skirmishWinner'))
    expect(save.LuaScript).toContain('function discardCardPosition(index)')
    expect(moveToDiscard).toContain('ensureFaceUp(card)')
    expect(moveToDiscard).not.toContain('ensureFaceDown(card)')
    expect(moveSkirmishCards).toContain('ensureFaceUp(card)')
    expect(moveSkirmishCards).not.toContain('ensureFaceDown(card)')
    expect(save.LuaScript).toContain('card.setPosition(discardCardPosition(index))')
    expect(save.LuaScript).toContain('board.setSnapPoints(boardSnaps)')
    expect(save.LuaScript).toContain('for _, target in ipairs(BOARD_LAYOUT.draft) do')
    expect(save.LuaScript).not.toContain('DRAFT_COLUMN_X')
    expect(save.LuaScript).not.toContain('DRAW_PILE_SLOT_GUID')
  })

  it('keeps the final Clash visible until the host explicitly ends the Skirmish', () => {
    const save = buildTtsSave({ ...loadSource() })
    const resolveNextClash = save.LuaScript.slice(save.LuaScript.indexOf('function resolveNextClash'), save.LuaScript.indexOf('function recycleDiscard'))

    expect(save.XmlUI).toContain('id="end-skirmish"')
    expect(save.XmlUI).toContain('onClick="endSkirmishUi"')
    expect(save.LuaScript).toContain('STATE.phase = "SKIRMISH_READY"')
    expect(save.LuaScript).toContain('function endSkirmish(object, color)')
    expect(resolveNextClash).not.toContain('finishSkirmish(winner, resolution)')
    expect(resolveNextClash).toContain('The Clash result is shown. Host: press END SKIRMISH to score the Skirmish')
  })

  it('awards the finished Skirmish stack to its winner and clears temporary Clash tokens', () => {
    const save = buildTtsSave({ ...loadSource() })
    const finishSkirmish = save.LuaScript.slice(save.LuaScript.indexOf('function finishSkirmish'), save.LuaScript.indexOf('function resolveNextClash'))

    expect(finishSkirmish).toContain('returnClashTokensToBag()')
    expect(finishSkirmish).toContain('moveSkirmishCardsToDiscard()')
    expect(save.LuaScript).not.toContain('SKIRMISH_STACK_POSITIONS')
    expect(save.LuaScript).toContain('BOARD_LAYOUT.discard')
    expect(save.LuaScript).toContain('function finishSkirmishWhenReady')
    expect(save.LuaScript).toContain('STATE.phase = "SKIRMISH_ENDING"')
  })

  it('does not orphan asynchronous tokens, oath markers, or math labels before cleanup', () => {
    const save = buildTtsSave({ ...loadSource() })
    const returnTokens = save.LuaScript.slice(save.LuaScript.indexOf('function returnClashTokensToBag'), save.LuaScript.indexOf('function moveToDiscard'))

    expect(save.LuaScript).toContain('pendingVisuals = 0')
    expect(save.LuaScript).toContain('STATE.pendingVisuals = (STATE.pendingVisuals or 0) + 1')
    expect(save.LuaScript).toContain('finishSkirmishWhenReady(winner, resolution')
    expect(returnTokens).toContain('if not bag then')
    expect(returnTokens).toContain('local remaining = {}')
    expect(returnTokens).toContain('STATE.clashTokens = remaining')
  })

  it('migrates older saved state fields before updating the UI', () => {
    const save = buildTtsSave({ ...loadSource() })

    expect(save.LuaScript).toContain('local defaults = newState()')
    expect(save.LuaScript).toContain('function migrateLoadedState')
    expect(save.LuaScript).toContain('if version < 3 then')
    expect(save.LuaScript).toContain('if version < 4 then')
    expect(save.LuaScript).toContain('STATE.previousDefeatMargins = STATE.previousDefeatMargins or { north = 0, south = 0 }')
    expect(save.LuaScript).toContain('STATE.songBonuses = STATE.songBonuses or { north = 0, south = 0 }')
    expect(save.LuaScript).toContain('STATE.stateVersion = 5')
    expect(save.LuaScript).toContain('if version < 5 then')
    expect(save.LuaScript).toContain('STATE.currentWatcherId = STATE.currentWatcherId or nil')
    expect(save.LuaScript).toContain('if #STATE.skirmishCards == 0 then')
  })

  it('shows numeric strength math above each resolved battle line', () => {
    const save = buildTtsSave({ ...loadSource() })

    expect(save.LuaScript).toContain('function entryMath(entry)')
    expect(save.LuaScript).toContain('type = "3DText"')
    expect(save.LuaScript).toContain('textObject.setValue(entryMath(entry))')
    expect(save.LuaScript).toContain('scale = { x = 0.28, y = 0.28, z = 0.28 }')
    expect(save.LuaScript).toContain('return table.concat(parts, "+")')
    expect(save.LuaScript).not.toContain('table.concat(parts, "+") .. " = " .. entry.finalStrength')
  })

  it('includes YES and NO oath marker bags and reveals them left to right', () => {
    const save = buildTtsSave({
      ...loadSource(),
      assetUrls: {
        oathYes: 'https://steamusercontent.example/oath-yes',
        oathNo: 'https://steamusercontent.example/oath-no',
      },
    })
    const yes = save.ObjectStates.find((object: any) => object.Nickname === 'Oath YES Marker Bag')
    const no = save.ObjectStates.find((object: any) => object.Nickname === 'Oath NO Marker Bag')

    expect(yes.Name).toBe('Infinite_Bag')
    expect(no.Name).toBe('Infinite_Bag')
    expect(yes.ContainedObjects[0].Name).toBe('Custom_Token')
    expect(no.ContainedObjects[0].Name).toBe('Custom_Token')
    expect(yes.ContainedObjects[0].Transform.scaleX).toBeCloseTo(0.2)
    expect(no.ContainedObjects[0].Transform.scaleX).toBeCloseTo(0.2)
    expect(yes.ContainedObjects[0].CustomImage.ImageURL).toMatch(/^https:\/\/steamusercontent/)
    expect(no.ContainedObjects[0].CustomImage.ImageURL).toMatch(/^https:\/\/steamusercontent/)
    expect(save.LuaScript).toContain('oathMarkers = { north = {}, south = {} }')
    expect(save.LuaScript).toContain('function spawnOathMarkers')
    expect(save.LuaScript).toContain('OATH_MARKER_POSITIONS')
    expect(save.LuaScript).toContain('OATH_YES_BAG_GUID')
    expect(save.LuaScript).toContain('bag.takeObject({')
    expect(save.LuaScript).toContain('Oath YES marker')
  })

  it('includes the playable board and stable control-panel objects', () => {
    const save = buildTtsSave({ assetBaseUrl, luaScript: '-- test lua', uiXml: '<!-- test ui -->' })
    const names = save.ObjectStates.map((object: any) => object.Nickname)

    expect(names).toEqual(expect.arrayContaining([
      'Norse Kode Board',
      'Norse Kode Deck',
      'North Player Mat',
      'South Player Mat',
      'Host Controls',
    ]))
    expect(save.ObjectStates.find((object: any) => object.Nickname === 'Norse Kode Board').CustomImage.ImageURL)
      .toBe(`${assetBaseUrl}norse-kode-table.png`)
  })

  it('embeds the Lua and UI sources and uses an explicit placeholder URL by default', () => {
    const save = buildTtsSave({ luaScript: 'function onLoad() end', uiXml: '<!-- ui -->' })

    expect(save.LuaScript).toContain('MUSIC_PLAYLIST = {')
    expect(save.LuaScript).toMatch(/function onLoad\(\) end$/)
    expect(save.XmlUI).toBe('<!-- ui -->')
    expect(save.ObjectStates.find((object: any) => object.Name === 'DeckCustom').CustomDeck['1'].FaceURL)
      .toMatch(/^https:\/\/YOUR-ASSET-HOST\/norse-kode\//)
  })

  it('allows Steam Cloud URLs to be baked directly into the save', () => {
    const urls = {
      table: 'https://steam.example/table',
      tableSurface: 'https://steam.example/table-surface',
      sky: 'https://steam.example/sky',
      cards: 'https://steam.example/cards',
      back: 'https://steam.example/back',
      manifest: 'https://steam.example/manifest',
    }
    const save = buildTtsSave({ assetUrls: urls })
    const deck = save.ObjectStates.find((object: any) => object.Name === 'DeckCustom')

    expect(save.ObjectStates.find((object: any) => object.Name === 'Custom_Tile').CustomImage.ImageURL).toBe(urls.table)
    expect(save.TableURL).toBe(urls.tableSurface)
    expect(save.SkyURL).toBe(urls.sky)
    expect(deck.CustomDeck['1'].FaceURL).toBe(urls.cards)
    expect(deck.CustomDeck['1'].BackURL).toBe(urls.back)
    expect(save.Rules).toContain(urls.manifest)
  })
})
