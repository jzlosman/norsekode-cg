import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('..', import.meta.url)))
const savePath = join(root, 'tts/build/Norse Kode.json')
const assetDir = join(root, 'tts/assets')

if (!existsSync(savePath)) throw new Error('Missing tts/build/Norse Kode.json; run npm run build:tts first.')
const save = JSON.parse(readFileSync(savePath, 'utf8'))
const deck = save.ObjectStates.find((object) => object.Name === 'DeckCustom')
const tokenBag = save.ObjectStates.find((object) => object.Nickname === 'Clash Token Bag')
const skirmishBag = save.ObjectStates.find((object) => object.Nickname === 'Skirmish Token Bag')
const cards = deck?.ContainedObjects ?? []
const objectsAndCards = save.ObjectStates.flatMap((object) => [object, ...(object.ContainedObjects ?? [])])
const guids = objectsAndCards.map((object) => object.GUID)
const assets = ['norse-kode-table.png', 'norse-kode-deck.png', 'card-back.png', 'norse-kode-player-mat.png', 'norse-kode-player-mat-base.png', 'norse-clash-token.png', 'norse-skirmish-token.png', 'oath-yes.png', 'oath-no.png']
const isUsableImageReference = (imageUrl) => typeof imageUrl === 'string' && (imageUrl.startsWith('https://') || existsSync(imageUrl))

if (!deck) throw new Error('Save has no custom deck.')
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
if (cards.length !== 42) throw new Error(`Expected 42 cards, got ${cards.length}.`)
if (new Set(cards.map((card) => card.GMNotes)).size !== 42) throw new Error('Card metadata IDs are not unique.')
if (deck.DeckIDs?.[0] !== 100 || deck.DeckIDs?.[41] !== 141) throw new Error('Custom deck IDs must map atlas indices 0 through 41.')
if (new Set(guids).size !== guids.length) throw new Error('Save object GUIDs are not unique.')
if (deck.CustomDeck?.['1']?.NumWidth !== 7 || deck.CustomDeck?.['1']?.NumHeight !== 6) throw new Error('Expected a 7x6 custom deck atlas.')
for (const asset of assets) {
  if (!existsSync(join(assetDir, asset))) throw new Error(`Missing generated TTS asset: ${asset}`)
}
const imageUrls = [
  save.ObjectStates.find((object) => object.Nickname === 'Norse Kode Board')?.CustomImage?.ImageURL,
  deck.CustomDeck?.['1']?.FaceURL,
  deck.CustomDeck?.['1']?.BackURL,
  ...['North Player Mat', 'South Player Mat'].map((name) => save.ObjectStates.find((object) => object.Nickname === name)?.CustomImage?.ImageURL),
  ...['Clash Token Bag', 'Skirmish Token Bag', 'Oath YES Marker Bag', 'Oath NO Marker Bag'].map((name) => save.ObjectStates.find((object) => object.Nickname === name)?.ContainedObjects?.[0]?.CustomImage?.ImageURL),
]
for (const imageUrl of imageUrls) {
  if (!isUsableImageReference(imageUrl)) throw new Error(`Unusable TTS image path: ${imageUrl ?? '(missing)'}`)
}
for (const functionName of ['onLoad', 'startWar', 'revealOaths', 'resolveNextClash', 'endSkirmish', 'placeSkirmishToken', 'nextSkirmish']) {
  if (!save.LuaScript.includes(`function ${functionName}`)) throw new Error(`Embedded Lua is missing ${functionName}.`)
}
if (!save.XmlUI.includes('north-oath-panel') || !save.XmlUI.includes('south-oath-panel')) throw new Error('Embedded UI is missing private oath panels.')

const assetUrl = deck.CustomDeck['1'].FaceURL
console.log(`Validated Norse Kode TTS save: ${cards.length} cards, ${save.ObjectStates.length} top-level objects.`)
console.log(`Deck asset URL: ${assetUrl}`)
