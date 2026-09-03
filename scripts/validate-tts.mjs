import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('..', import.meta.url)))
const savePath = join(root, 'tts/build/Norse Kode.json')
const assetDir = join(root, 'tts/assets')
const musicManifest = JSON.parse(readFileSync(join(root, 'tts/music-playlist.json'), 'utf8'))

if (!existsSync(savePath)) throw new Error('Missing tts/build/Norse Kode.json; run npm run build:tts first.')
const save = JSON.parse(readFileSync(savePath, 'utf8'))
const deck = save.ObjectStates.find((object) => object.Nickname === 'Norse Kode Deck')
const watcherDeck = save.ObjectStates.find((object) => object.Nickname === 'Norse Kode Watcher Deck')
const tokenBag = save.ObjectStates.find((object) => object.Nickname === 'Clash Token Bag')
const skirmishBag = save.ObjectStates.find((object) => object.Nickname === 'Skirmish Token Bag')
const musicConsole = save.ObjectStates.find((object) => object.Nickname === 'Voiceless Edda Music Console')
const cards = deck?.ContainedObjects ?? []
const objectsAndCards = save.ObjectStates.flatMap((object) => [object, ...(object.ContainedObjects ?? [])])
const guids = objectsAndCards.map((object) => object.GUID)
const assets = ['norse-kode-table.png', 'norse-kode-battlefield-table.png', 'norse-kode-fjord-sky.png', 'norse-kode-deck.png', 'norse-kode-watchers.png', 'card-back.png', 'norse-kode-player-mat.png', 'norse-kode-player-mat-base.png', 'norse-kode-music-console.png', 'norse-clash-token.png', 'norse-skirmish-token.png', 'oath-yes.png', 'oath-no.png']
const isUsableImageReference = (imageUrl) => typeof imageUrl === 'string' && imageUrl.startsWith('https://')
const pngSize = (path) => {
  const data = readFileSync(path)
  if (data.toString('ascii', 1, 4) !== 'PNG') throw new Error(`Not a PNG: ${path}`)
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
}

if (save.Table !== 'Table_Custom' || !isUsableImageReference(save.TableURL)) throw new Error('Save has no usable custom battlefield table.')
if (save.Sky !== 'Sky_Museum' || !isUsableImageReference(save.SkyURL)) throw new Error('Save has no usable custom fjord background.')
if (!deck || !watcherDeck) throw new Error('Save is missing the battle or Watcher deck.')
if (save.ObjectStates.length !== 15) throw new Error(`Expected 15 top-level objects, got ${save.ObjectStates.length}.`)
if (musicConsole?.Name !== 'Custom_Tile' || musicConsole.GUID !== 'm00001' || !musicConsole.Locked || !isUsableImageReference(musicConsole.CustomImage?.ImageURL)) throw new Error('Save has no usable locked music console.')
if (tokenBag?.Name !== 'Infinite_Bag' || tokenBag.ContainedObjects?.[0]?.Name !== 'Custom_Token') throw new Error('Save has no thematic Clash-token bag.')
if (skirmishBag?.Name !== 'Infinite_Bag' || skirmishBag.ContainedObjects?.[0]?.Name !== 'Custom_Token') throw new Error('Save has no thematic Skirmish-token bag.')
for (const matName of ['North Player Mat', 'South Player Mat']) {
  const mat = save.ObjectStates.find((object) => object.Nickname === matName)
  if (mat?.Name !== 'Custom_Tile' || !isUsableImageReference(mat.CustomImage?.ImageURL)) throw new Error(`Save has no usable full ${matName}.`)
}
for (const markerName of ['Oath YES Marker Bag', 'Oath NO Marker Bag']) {
  const marker = save.ObjectStates.find((object) => object.Nickname === markerName)
  if (marker?.Name !== 'Infinite_Bag' || marker.ContainedObjects?.[0]?.Name !== 'Custom_Token' || !marker.ContainedObjects[0].CustomImage?.ImageURL?.startsWith('https://')) throw new Error(`Save has no usable ${markerName}.`)
}
if (cards.length !== 42) throw new Error(`Expected 42 battle cards, got ${cards.length}.`)
if (new Set(cards.map((card) => card.GMNotes)).size !== 42) throw new Error('Battle card metadata IDs are not unique.')
if (deck.DeckIDs?.[0] !== 100 || deck.DeckIDs?.[41] !== 141) throw new Error('Custom battle deck IDs must map atlas indices 0 through 41.')
const watcherCards = watcherDeck.ContainedObjects ?? []
if (watcherCards.length !== 10) throw new Error(`Expected 10 Watcher cards, got ${watcherCards.length}.`)
if (watcherDeck.DeckIDs?.[0] !== 200 || watcherDeck.DeckIDs?.[9] !== 209) throw new Error('Watcher deck IDs must map atlas indices 0 through 9.')
if (new Set(guids).size !== guids.length) throw new Error('Save object GUIDs are not unique.')
if (deck.CustomDeck?.['1']?.NumWidth !== 7 || deck.CustomDeck?.['1']?.NumHeight !== 6) throw new Error('Expected a 7x6 custom battle deck atlas.')
if (watcherDeck.CustomDeck?.['2']?.NumWidth !== 5 || watcherDeck.CustomDeck?.['2']?.NumHeight !== 2) throw new Error('Expected a 5x2 custom Watcher deck atlas.')
for (const asset of assets) {
  if (!existsSync(join(assetDir, asset))) throw new Error(`Missing generated TTS asset: ${asset}`)
}
for (const [index, track] of musicManifest.tracks.entries()) {
  const path = join(assetDir, 'music', track.file)
  if (!existsSync(path)) throw new Error(`Missing generated TTS music asset: ${track.file}`)
  const probe = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name,sample_rate,channels,bit_rate:format_tags=title,artist,album,track',
    '-of', 'json',
    path,
  ], { encoding: 'utf8' })
  if (probe.status !== 0) throw new Error(`Could not inspect MP3 asset ${track.file}: ${probe.stderr}`)
  const metadata = JSON.parse(probe.stdout)
  const stream = metadata.streams?.[0]
  const tags = metadata.format?.tags
  if (stream?.codec_name !== 'mp3' || stream.sample_rate !== '48000' || stream.channels !== 2 || stream.bit_rate !== '192000') throw new Error(`Unexpected MP3 encoding for ${track.file}.`)
  if (tags?.title !== track.title || tags.artist !== musicManifest.artist || tags.album !== musicManifest.album || tags.track !== `${index + 1}/${musicManifest.tracks.length}`) throw new Error(`Unexpected MP3 tags for ${track.file}.`)
}
for (const [asset, expected] of Object.entries({
  'norse-kode-battlefield-table.png': { width: 2048, height: 1024 },
  'norse-kode-fjord-sky.png': { width: 4096, height: 2048 },
  'norse-kode-music-console.png': { width: 1024, height: 512 },
})) {
  const actual = pngSize(join(assetDir, asset))
  if (actual.width !== expected.width || actual.height !== expected.height) throw new Error(`Unexpected ${asset} size: ${actual.width}x${actual.height}`)
}
const imageUrls = [
  save.TableURL,
  save.SkyURL,
  save.ObjectStates.find((object) => object.Nickname === 'Norse Kode Board')?.CustomImage?.ImageURL,
  deck.CustomDeck?.['1']?.FaceURL,
  deck.CustomDeck?.['1']?.BackURL,
  watcherDeck.CustomDeck?.['2']?.FaceURL,
  watcherDeck.CustomDeck?.['2']?.BackURL,
  ...['North Player Mat', 'South Player Mat'].map((name) => save.ObjectStates.find((object) => object.Nickname === name)?.CustomImage?.ImageURL),
  musicConsole.CustomImage.ImageURL,
  ...['Clash Token Bag', 'Skirmish Token Bag', 'Oath YES Marker Bag', 'Oath NO Marker Bag'].map((name) => save.ObjectStates.find((object) => object.Nickname === name)?.ContainedObjects?.[0]?.CustomImage?.ImageURL),
]
for (const imageUrl of imageUrls) {
  if (!isUsableImageReference(imageUrl)) throw new Error(`Unusable TTS image path: ${imageUrl ?? '(missing)'}`)
}
const playlistEntries = [...save.LuaScript.matchAll(/\{ url = "([^"]+\.mp3)", title = "([^"]+)" \}/g)]
if (playlistEntries.length !== musicManifest.tracks.length) throw new Error(`Expected ${musicManifest.tracks.length} embedded music tracks, got ${playlistEntries.length}.`)
for (const [index, track] of musicManifest.tracks.entries()) {
  const [, url, title] = playlistEntries[index]
  if (!url.startsWith('https://') || !url.endsWith(`/music/${track.file}`)) throw new Error(`Unusable music URL for ${track.file}: ${url}`)
  if (title !== track.title) throw new Error(`Unexpected embedded music title at track ${index + 1}: ${title}`)
}
for (const functionName of ['onLoad', 'startWar', 'prepareWatcherReveal', 'resumeWatcherReveal', 'advanceWatcherReveal', 'advanceWatcherRevealUi', 'beginPostLockWatcherPhase', 'chooseWatcherSlot', 'revealOaths', 'resolveNextClash', 'endSkirmish', 'placeSkirmishToken', 'nextSkirmish', 'installMusicConsole', 'musicTogglePlay']) {
  if (!save.LuaScript.includes(`function ${functionName}`)) throw new Error(`Embedded Lua is missing ${functionName}.`)
}
if (!save.XmlUI.includes('north-oath-panel') || !save.XmlUI.includes('south-oath-panel')) throw new Error('Embedded UI is missing private oath panels.')

const assetUrl = deck.CustomDeck['1'].FaceURL
console.log(`Validated Norse Kode TTS save: ${cards.length} cards, ${save.ObjectStates.length} top-level objects.`)
console.log(`Deck asset URL: ${assetUrl}`)
