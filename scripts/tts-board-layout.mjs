import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const layoutPath = join(root, 'tts/board-layout.json')

export const loadBoardLayout = () => JSON.parse(readFileSync(layoutPath, 'utf8'))

// TTS Type 0 Custom Tiles use the image height as two local units and mirror
// the texture's horizontal axis. X therefore expands with the aspect ratio
// and runs right-to-left, while Z keeps the image's top-to-bottom direction.
export const imagePointToLocal = (layout, point) => ({
  x: (-2 * (point.x - layout.canvas.width / 2)) / layout.canvas.height,
  z: (2 * (point.y - layout.canvas.height / 2)) / layout.canvas.height,
})

export const imagePointToWorld = (layout, point) => {
  const local = imagePointToLocal(layout, point)
  return {
    x: local.x * layout.boardScale.x,
    z: local.z * layout.boardScale.z,
  }
}

const luaNumber = (value) => Number(value.toFixed(6)).toString()
const luaPoint = (layout, point) => {
  const local = imagePointToLocal(layout, point)
  return `{ x = ${luaNumber(local.x)}, z = ${luaNumber(local.z)} }`
}

export const renderBoardLayoutLua = (layout = loadBoardLayout()) => `-- Generated from tts/board-layout.json. Do not edit these coordinates by hand.\nBOARD_LAYOUT = {\n  scale = { x = ${luaNumber(layout.boardScale.x)}, z = ${luaNumber(layout.boardScale.z)} },\n  draft = {\n${layout.draft.map((point) => `    ${luaPoint(layout, point)},`).join('\n')}\n  },\n  draw = ${luaPoint(layout, layout.draw)},\n  discard = ${luaPoint(layout, layout.discard)},\n  watcherActive = ${luaPoint(layout, layout.watcherActive)},\n  watcherActive2 = ${luaPoint(layout, layout.watcherActive2)},\n  watcherDeck = ${luaPoint(layout, layout.watcherDeck)},\n  fateCoin = ${luaPoint(layout, layout.fateCoin)},\n}\n`
