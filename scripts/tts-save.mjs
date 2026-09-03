import { readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { imagePointToWorld, loadBoardLayout, renderBoardLayoutLua } from './tts-board-layout.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const cardManifest = JSON.parse(readFileSync(join(root, 'public/assets/cards/manifest.json'), 'utf8'))
const watcherManifest = JSON.parse(readFileSync(join(root, 'public/assets/watchers/manifest.json'), 'utf8'))
const musicManifest = JSON.parse(readFileSync(join(root, 'tts/music-playlist.json'), 'utf8'))
const boardLayout = loadBoardLayout()
const drawPosition = imagePointToWorld(boardLayout, boardLayout.draw)
const watcherDeckPosition = imagePointToWorld(boardLayout, boardLayout.watcherDeck)
const fateCoinPosition = imagePointToWorld(boardLayout, boardLayout.fateCoin)

export const DEFAULT_ASSET_BASE_URL = 'https://YOUR-ASSET-HOST/norse-kode/'

const normalizeBaseUrl = (value = DEFAULT_ASSET_BASE_URL) => value.endsWith('/') ? value : `${value}/`
const assetUrl = (baseUrl, file) => `${normalizeBaseUrl(baseUrl)}${file}`

const resolveAssetUrls = (assetBaseUrl, overrides = {}) => ({
  table: overrides.table ?? assetUrl(assetBaseUrl, 'norse-kode-table.png'),
  tableSurface: overrides.tableSurface ?? assetUrl(assetBaseUrl, 'norse-kode-battlefield-table.png'),
  sky: overrides.sky ?? assetUrl(assetBaseUrl, 'norse-kode-fjord-sky.png'),
  cards: overrides.cards ?? assetUrl(assetBaseUrl, 'norse-kode-deck.png'),
  watchers: overrides.watchers ?? assetUrl(assetBaseUrl, 'norse-kode-watchers.png'),
  fateNorth: overrides.fateNorth ?? assetUrl(assetBaseUrl, 'fate-coin-north.png'),
  fateSouth: overrides.fateSouth ?? assetUrl(assetBaseUrl, 'fate-coin-south.png'),
  back: overrides.back ?? assetUrl(assetBaseUrl, 'card-back.png'),
  manifest: overrides.manifest ?? assetUrl(assetBaseUrl, 'asset-manifest.json'),
  playerMat: overrides.playerMat ?? assetUrl(assetBaseUrl, 'norse-kode-player-mat.png'),
  musicConsole: overrides.musicConsole ?? assetUrl(assetBaseUrl, 'norse-kode-music-console.png'),
  musicBase: normalizeBaseUrl(overrides.musicBase ?? assetUrl(assetBaseUrl, 'music/')),
  clashToken: overrides.clashToken ?? assetUrl(assetBaseUrl, 'norse-clash-token.png'),
  skirmishToken: overrides.skirmishToken ?? assetUrl(assetBaseUrl, 'norse-skirmish-token.png'),
  oathYes: overrides.oathYes ?? assetUrl(assetBaseUrl, 'oath-yes.png'),
  oathNo: overrides.oathNo ?? assetUrl(assetBaseUrl, 'oath-no.png'),
})

const renderMusicPlaylistLua = (musicBase) => `-- Generated from tts/music-playlist.json. Do not edit these tracks by hand.\nMUSIC_CONSOLE_GUID = "m00001"\nMUSIC_PLAYLIST = {\n${musicManifest.tracks.map((track) => `  { url = ${JSON.stringify(`${musicBase}${track.file}`)}, title = ${JSON.stringify(track.title)} },`).join('\n')}\n}\n`

const transform = (x, y, z, scaleX = 1, scaleY = 1, scaleZ = 1, rotY = 180, rotZ = 0) => ({
  posX: x,
  posY: y,
  posZ: z,
  rotX: 0,
  rotY,
  rotZ,
  scaleX,
  scaleY,
  scaleZ,
})

const boardSnapPoints = () => [
  ...boardLayout.draft,
  boardLayout.draw,
  boardLayout.discard,
  boardLayout.watcherActive,
  boardLayout.watcherActive2,
  boardLayout.watcherDeck,
  boardLayout.fateCoin,
].map((point) => {
  const local = {
    x: (-2 * (point.x - boardLayout.canvas.width / 2)) / boardLayout.canvas.height,
    z: (2 * (point.y - boardLayout.canvas.height / 2)) / boardLayout.canvas.height,
  }
  return { position: { x: local.x, y: 0.28, z: local.z }, rotation: { x: 0, y: 180, z: 0 } }
})

const panel = ({ guid, nickname, x, z, scaleX = 1, scaleZ = 1, description }) => ({
  Name: 'BlockSquare',
  Transform: transform(x, 1.0, z, scaleX, 0.35, scaleZ),
  Rigidbody: { Mass: 1, Drag: 0.1, AngularDrag: 0.1, AngularVelocity: { x: 0, y: 0, z: 0 }, UseGravity: true, Frozen: true },
  Nickname: nickname,
  Description: description,
  GMNotes: '',
  ColorDiffuse: { r: 0.17, g: 0.12, b: 0.09 },
  GUID: guid,
  Locked: true,
})

const board = (tableUrl) => ({
  Name: 'Custom_Tile',
  Transform: transform(0, 1.0, 0, boardLayout.boardScale.x, 0.12, boardLayout.boardScale.z, 0, 0),
  Rigidbody: { Mass: 1, Drag: 0.1, AngularDrag: 0.1, AngularVelocity: { x: 0, y: 0, z: 0 }, UseGravity: true, Frozen: true },
  Nickname: 'Norse Kode Board',
  Description: 'Norse Kode scripted board. Its measured artwork drives the draw, face-up discard, and two-row draft snap points.',
  GMNotes: 'norse-kode-board',
  CustomImage: {
    ImageURL: tableUrl,
    ImageSecondaryURL: '',
    ImageScalar: 1,
    WidthScale: 0,
    CustomToken: '',
    CustomTile: {
      Type: 0,
      Thickness: 0.2,
      Stackable: false,
      Stretch: true,
    },
  },
  GUID: 'b00001',
  Locked: true,
  SnapPoints: boardSnapPoints(),
})

const bloodOathSlot = ({ guid, side, index, x, z }) => ({
  Name: 'BlockSquare',
  Transform: transform(x, 1.3, z, 0.55, 0.08, 0.35, side === 'north' ? 180 : 0, 0),
  Rigidbody: { Mass: 1, Drag: 0.1, AngularDrag: 0.1, AngularVelocity: { x: 0, y: 0, z: 0 }, UseGravity: true, Frozen: true },
  Nickname: `Blood Oath Slot ${side} ${index}`,
  Description: `Placeholder for ${side} player Blood Oath marker ${index}.`,
  GMNotes: 'norse-kode-blood-oath-slot',
  ColorDiffuse: { r: 0.12, g: 0.07, b: 0.04 },
  GUID: guid,
  Locked: true,
})

const deck = (cardsUrl, backUrl) => {
  const cards = cardManifest.cards.map((card, index) => ({
    Name: 'Card',
    Transform: transform(0, 0, 0),
    Nickname: card.name,
    Description: `${card.category.toUpperCase()} · ${card.printedStrength} strength · ${card.id}`,
    GMNotes: card.id,
    CardID: 100 + index,
    GUID: `a${String(index + 1).padStart(5, '0')}`,
    Grid: true,
    Snap: true,
    Tooltip: true,
  }))

  return {
    Name: 'DeckCustom',
    Transform: transform(drawPosition.x, 1.25, drawPosition.z, 1, 1, 1, 180, 180),
    Rigidbody: { Mass: 1, Drag: 0.1, AngularDrag: 0.1, AngularVelocity: { x: 0, y: 0, z: 0 }, UseGravity: true, Frozen: false },
    Nickname: 'Norse Kode Deck',
    Description: '42-card Battle deck. Do not split the deck while the script is running.',
    GMNotes: 'norse-kode-battle-deck',
    DeckIDs: cards.map((card) => card.CardID),
    CustomDeck: {
      '1': {
        FaceURL: cardsUrl,
        BackURL: backUrl,
        NumWidth: 7,
        NumHeight: 6,
        BackIsHidden: true,
        UniqueBack: false,
        Type: 0,
      },
    },
    ContainedObjects: cards,
    GUID: 'd00001',
    Grid: true,
    Snap: true,
    Tooltip: true,
  }
}

const watcherDeck = (cardsUrl, backUrl) => {
  const cards = watcherManifest.cards.map((card, index) => ({
    Name: 'Card',
    Transform: transform(0, 0, 0),
    Nickname: `${card.name} · ${card.title}`,
    Description: `${card.timing} · ${card.effect} · ${card.id}`,
    GMNotes: card.id,
    CardID: 200 + index,
    GUID: `w${String(index + 1).padStart(5, '0')}`,
    Grid: true,
    Snap: true,
    Tooltip: true,
  }))

  return {
    Name: 'DeckCustom',
    Transform: transform(watcherDeckPosition.x, 1.25, watcherDeckPosition.z, 1, 1, 1, 180, 180),
    Rigidbody: { Mass: 1, Drag: 0.1, AngularDrag: 0.1, AngularVelocity: { x: 0, y: 0, z: 0 }, UseGravity: true, Frozen: false },
    Nickname: 'Norse Kode Watcher Deck',
    Description: '10-card Watcher deck. One Watcher governs each Skirmish when CONFIG.godCardsEnabled is true.',
    GMNotes: 'norse-kode-watcher-deck',
    DeckIDs: cards.map((card) => card.CardID),
    CustomDeck: {
      '2': {
        FaceURL: cardsUrl,
        BackURL: backUrl,
        NumWidth: 5,
        NumHeight: 2,
        BackIsHidden: true,
        UniqueBack: false,
        Type: 0,
      },
    },
    ContainedObjects: cards,
    GUID: 'd00002',
    Grid: true,
    Snap: true,
    Tooltip: true,
  }
}

const customToken = ({ guid, nickname, description, imageUrl, imageSecondaryUrl = imageUrl, position = { x: 0, z: 0 }, height = 0, scale = 0.2 }) => ({
  Name: 'Custom_Token',
  Transform: transform(position.x, height, position.z, scale, 1, scale, 180, 0),
  Nickname: nickname,
  Description: description,
  GMNotes: 'norse-kode-token',
  ColorDiffuse: { r: 1, g: 1, b: 1 },
  GUID: guid,
  Locked: false,
  Grid: true,
  Snap: false,
  Tooltip: true,
  CustomImage: {
    ImageURL: imageUrl,
    ImageSecondaryURL: imageSecondaryUrl,
    ImageScalar: 1,
    WidthScale: 0,
    CustomToken: {
      Thickness: 0.18,
      MergeDistancePixels: 15,
      StandUp: false,
      Stackable: false,
    },
  },
})

const fateCoin = (northUrl, southUrl) => customToken({
  guid: 'f00001',
  nickname: 'Gods Decide Fate Coin',
  description: 'Two-sided Fate coin. North face awards North; South face awards South when a Clash is exactly tied.',
  imageUrl: northUrl,
  imageSecondaryUrl: southUrl,
  position: fateCoinPosition,
  height: 1.35,
  scale: 0.7,
})

const playerMat = ({ guid, nickname, z, rotationY, description, imageUrl }) => ({
  Name: 'Custom_Tile',
  Transform: transform(0, 1.1, z, 3.3, 0.12, 3.6, rotationY, 0),
  Rigidbody: { Mass: 1, Drag: 0.1, AngularDrag: 0.1, AngularVelocity: { x: 0, y: 0, z: 0 }, UseGravity: true, Frozen: true },
  Nickname: nickname,
  Description: description,
  GMNotes: 'norse-kode-player-mat',
  CustomImage: {
    ImageURL: imageUrl,
    ImageSecondaryURL: '',
    ImageScalar: 1,
    WidthScale: 0,
    CustomToken: '',
    CustomTile: {
      Type: 0,
      Thickness: 0.2,
      Stackable: false,
      Stretch: true,
    },
  },
  GUID: guid,
  Locked: true,
})

const musicConsole = (imageUrl) => ({
  Name: 'Custom_Tile',
  Transform: transform(4.6, 1.1, 16, 0.8, 0.12, 0.625, 0, 0),
  Rigidbody: { Mass: 1, Drag: 0.1, AngularDrag: 0.1, AngularVelocity: { x: 0, y: 0, z: 0 }, UseGravity: true, Frozen: true },
  Nickname: 'Voiceless Edda Music Console',
  Description: 'Music · Ready · Host controls',
  GMNotes: 'norse-kode-music-console',
  CustomImage: {
    ImageURL: imageUrl,
    ImageSecondaryURL: '',
    ImageScalar: 1,
    WidthScale: 0,
    CustomToken: '',
    CustomTile: {
      Type: 0,
      Thickness: 0.2,
      Stackable: false,
      Stretch: true,
    },
  },
  GUID: 'm00001',
  Locked: true,
})

const clashTokenBag = (imageUrl) => ({
  Name: 'Infinite_Bag',
  Transform: transform(9.25, 1.0, 0, 0.8, 0.8, 0.8, 0, 0),
  Nickname: 'Clash Token Bag',
  Description: 'Unlimited Clash markers. The script places one behind the winning card on its player mat after a Clash.',
  GMNotes: 'norse-kode-clash-token-bag',
  ColorDiffuse: { r: 0.72, g: 0.42, b: 0.08 },
  GUID: 'b00005',
  Locked: false,
  Grid: true,
  Snap: true,
  Tooltip: true,
  ContainedObjects: [customToken({
    guid: 't00001',
    nickname: 'Clash Token',
    description: 'A thematic marker placed in the Clash space behind a winning card.',
    imageUrl,
  })],
})

const oathMarkerBag = ({ guid, tokenGuid, nickname, description, imageUrl }) => ({
  Name: 'Infinite_Bag',
  Transform: transform(-12.5, -2.0, 0, 0.55, 0.55, 0.55, 0, 0),
  Nickname: nickname,
  Description: description,
  GMNotes: 'norse-kode-oath-marker-bag',
  ColorDiffuse: { r: 0.55, g: 0.08, b: 0.08 },
  GUID: guid,
  Locked: true,
  Grid: true,
  Snap: false,
  Tooltip: true,
  ContainedObjects: [customToken({
    guid: tokenGuid,
    nickname: nickname.replace(' Bag', ''),
    description,
    imageUrl,
  })],
})

const skirmishTokenBag = (imageUrl) => ({
  Name: 'Infinite_Bag',
  Transform: transform(-12.5, -2.0, 1.5, 0.55, 0.55, 0.55, 0, 0),
  Nickname: 'Skirmish Token Bag',
  Description: 'Unlimited thematic Skirmish victory markers for the five-space population track.',
  GMNotes: 'norse-kode-skirmish-token-bag',
  ColorDiffuse: { r: 0.55, g: 0.08, b: 0.08 },
  GUID: 'b00008',
  Locked: true,
  Grid: true,
  Snap: false,
  Tooltip: true,
  ContainedObjects: [customToken({
    guid: 't00002',
    nickname: 'Skirmish Token',
    description: 'A thematic marker for one Skirmish win on the five-space Victory Track.',
    imageUrl,
  })],
})

export const buildTtsSave = ({ assetBaseUrl = DEFAULT_ASSET_BASE_URL, assetUrls = {}, luaScript = '', uiXml = '' } = {}) => {
  const urls = resolveAssetUrls(assetBaseUrl, assetUrls)
  return {
  SaveName: 'Norse Kode',
  GameMode: 'Norse Kode',
  Date: '2026-09-01',
  Table: 'Table_Custom',
  TableURL: urls.tableSurface,
  Sky: 'Sky_Museum',
  SkyURL: urls.sky,
  Note: 'Norse Kode · Draft openly. Form in secret. Let the clash tell you who read the other line best.',
  Rules: `See tts/README.md in the source package for setup and playtest instructions. Card manifest: ${urls.manifest}`,
  LuaScript: `${renderMusicPlaylistLua(urls.musicBase)}\n${luaScript}`,
  LuaScriptState: '',
  XmlUI: uiXml,
  ObjectStates: [
    board(urls.table),
    bloodOathSlot({ guid: 'b00009', side: 'north', index: 1, x: -1.85, z: -13.8 }),
    bloodOathSlot({ guid: 'b00010', side: 'north', index: 2, x: 1.85, z: -13.8 }),
    bloodOathSlot({ guid: 'b00011', side: 'south', index: 1, x: -1.85, z: 13.8 }),
    bloodOathSlot({ guid: 'b00012', side: 'south', index: 2, x: 1.85, z: 13.8 }),
    deck(urls.cards, urls.back),
    watcherDeck(urls.watchers, urls.back),
    fateCoin(urls.fateNorth, urls.fateSouth),
    clashTokenBag(urls.clashToken),
    oathMarkerBag({ guid: 'b00006', tokenGuid: 'o00001', nickname: 'Oath YES Marker Bag', description: 'Unlimited red YES markers for revealed Blood Oaths.', imageUrl: urls.oathYes }),
    oathMarkerBag({ guid: 'b00007', tokenGuid: 'o00002', nickname: 'Oath NO Marker Bag', description: 'Unlimited red NO markers for revealed Blood Oaths.', imageUrl: urls.oathNo }),
    skirmishTokenBag(urls.skirmishToken),
    playerMat({ guid: 'b00002', nickname: 'North Player Mat', z: -11.2, rotationY: 180, imageUrl: urls.playerMat, description: 'North battle mat with five card-sized formation slots, two ordered Blood Oath slots, five Clash marker spaces, and a five-win Victory Track.' }),
    playerMat({ guid: 'b00003', nickname: 'South Player Mat', z: 11.2, rotationY: 0, imageUrl: urls.playerMat, description: 'South battle mat with five card-sized formation slots, two ordered Blood Oath slots, five Clash marker spaces, and a five-win Victory Track.' }),
    panel({ guid: 'b00004', nickname: 'Host Controls', x: 0, z: 16.0, scaleX: 4.8, scaleZ: 0.55, description: 'Host-only phase controls for setup, oath reveal, clash reveal, ending a Skirmish, and starting the next one.' }),
    musicConsole(urls.musicConsole),
  ],
  }
}

export const loadSource = () => ({
  luaScript: `${renderBoardLayoutLua(boardLayout)}\n${readFileSync(join(root, 'tts/norse-kode.lua'), 'utf8')}`,
  uiXml: readFileSync(join(root, 'tts/norse-kode-ui.xml'), 'utf8'),
})

if (process.argv[1] && basename(process.argv[1]) === 'tts-save.mjs') {
  const assetBaseUrl = process.env.NORSE_KODE_ASSET_BASE_URL ?? DEFAULT_ASSET_BASE_URL
  const source = loadSource()
  process.stdout.write(`${JSON.stringify(buildTtsSave({ assetBaseUrl, ...source }), null, 2)}\n`)
}
