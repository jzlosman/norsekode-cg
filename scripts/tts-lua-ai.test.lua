local function fail(message)
  error(message, 2)
end

local function assertEqual(actual, expected, message)
  if actual ~= expected then
    fail((message or "values differ") .. ": expected " .. tostring(expected) .. ", got " .. tostring(actual))
  end
end

local function assertTrue(value, message)
  if not value then fail(message or "expected value to be truthy") end
end

local function arrayKey(values)
  return table.concat(values or {}, ",")
end

local fakeObjects = {}
local musicConsoleStub = { buttons = {}, description = "" }
function musicConsoleStub.clearButtons() musicConsoleStub.buttons = {} end
function musicConsoleStub.createButton(button) table.insert(musicConsoleStub.buttons, button) end
function musicConsoleStub.getButtons() return musicConsoleStub.buttons end
function musicConsoleStub.editButton(update)
  local button = musicConsoleStub.buttons[(update.index or 0) + 1]
  if not button then return end
  for key, value in pairs(update) do if key ~= "index" then button[key] = value end end
end
function musicConsoleStub.setDescription(description) musicConsoleStub.description = description end
fakeObjects["m00001"] = musicConsoleStub

function getObjectFromGUID(guid)
  return fakeObjects[guid]
end

MUSIC_CONSOLE_GUID = "m00001"
MUSIC_PLAYLIST = {
  { url = "https://example.com/01.mp3", title = "First Track" },
  { url = "https://example.com/02.mp3", title = "Second Track" },
}
Global = {}
Player = {
  White = { host = true },
  Blue = { host = false },
}
local musicMessages = {}
function broadcastToColor(message, color) table.insert(musicMessages, { message = message, color = color }) end
Wait = { time = function(callback) callback() end }
MusicPlayer = {
  loaded = true,
  player_status = "Stop",
  shuffle = false,
  playlist = {},
  playlist_index = 1,
  setPlaylistCalls = 0,
  playCalls = 0,
  pauseCalls = 0,
  previousCalls = 0,
  nextCalls = 0,
}
function MusicPlayer.setPlaylist(playlist)
  MusicPlayer.playlist = playlist
  MusicPlayer.playlist_index = 1
  MusicPlayer.setPlaylistCalls = MusicPlayer.setPlaylistCalls + 1
  MusicPlayer.player_status = "Ready"
end
function MusicPlayer.getCurrentAudioclip() return MusicPlayer.playlist[MusicPlayer.playlist_index] end
function MusicPlayer.play() MusicPlayer.playCalls = MusicPlayer.playCalls + 1; MusicPlayer.player_status = "Play"; return true end
function MusicPlayer.pause() MusicPlayer.pauseCalls = MusicPlayer.pauseCalls + 1; MusicPlayer.player_status = "Stop"; return true end
function MusicPlayer.skipBack() MusicPlayer.previousCalls = MusicPlayer.previousCalls + 1; return true end
function MusicPlayer.skipForward() MusicPlayer.nextCalls = MusicPlayer.nextCalls + 1; return true end

local function exposeCard(id)
  fakeObjects[id] = {
    getGMNotes = function() return id end,
  }
  return id
end

for _, id in ipairs({
  "axe-1", "axe-2", "axe-3", "axe-5", "axe-8", "axe-9", "axe-10",
  "sword-1", "sword-2", "sword-3", "sword-9", "sword-10",
  "spear-1", "spear-2", "spear-3", "spear-9", "spear-10",
  "berserker-1", "shield-maiden-1", "jarl-1", "skald-1",
}) do
  exposeCard(id)
end

dofile("tts/norse-kode.lua")

local function plan(formation, swornIds)
  local oaths = {}
  for _, id in ipairs(swornIds or {}) do oaths[id] = true end
  return { formation = formation, oaths = oaths }
end

local tests = {}

function tests.jarl_metadata_and_legacy_aliases()
  assertEqual(CONFIG.jarlWinBonus, 3, "Jarl win bonus changed")
  assertEqual(CONFIG.jarlTieBonus, 2, "Jarl tie bonus changed")
  assertEqual(CONFIG.jarlLossBonus, 1, "Jarl loss bonus changed")
  assertEqual(#ALL_CARD_IDS, 42, "legacy aliases must not add cards to the deck")

  for copy = 1, 3 do
    local jarlId = "jarl-" .. copy
    local legacyId = "skald-" .. copy
    local jarl = CARD_DATA[jarlId]
    assertTrue(jarl ~= nil, jarlId .. " metadata must exist")
    assertEqual(jarl.id, jarlId, "Jarl metadata id changed")
    assertEqual(jarl.name, "Jarl", "Jarl metadata name changed")
    assertEqual(jarl.ability, "jarl", "Jarl metadata ability changed")
    assertEqual(jarl.strength, 11, "Jarl metadata Strength changed")
    assertTrue(CARD_DATA[legacyId] == jarl, legacyId .. " must alias the corresponding Jarl metadata")
    assertEqual(ALL_CARD_IDS[39 + copy], jarlId, "Jarl must keep the former Skald deck slot")
  end

  for _, id in ipairs(ALL_CARD_IDS) do
    assertTrue(string.sub(id, 1, 6) ~= "skald-", "legacy aliases must not enter the generated deck")
  end

  local legacyState = {
    formation = { north = { "skald-1" }, south = { "axe-1" } },
    oaths = { north = {}, south = {} },
    cursor = { north = 1, south = 1 },
    chainBreaks = { north = {}, south = {} },
    penalties = { north = false, south = false },
    previousDefeatMargins = { north = 0, south = 0 },
    songBonuses = { north = 0, south = 0 },
  }
  local legacy = resolveClashState(legacyState, CARD_DATA, CONFIG, true)
  assertTrue(legacy.north.isJarl, "legacy Skald GMNotes must activate Jarl")
  assertEqual(legacy.nextSongBonuses.north, 3, "legacy Skald GMNotes must preserve Jarl mechanics")
end

function tests.live_rules_baseline()
  STATE = newState()
  STATE.formation = {
    north = { "axe-1", "axe-5", "axe-8" },
    south = { "sword-10", "sword-1", "sword-2" },
  }
  STATE.oaths.north["axe-5"] = true
  STATE.cursor = { north = 2, south = 1 }

  local result = resolveClash()
  assertEqual(result.north.finalStrength, 16, "live Bloodsworn strength and chain bonuses changed")
  assertEqual(arrayKey(result.north.cardGuids), "axe-5,axe-8", "live Bloodsworn consumption changed")
  assertEqual(result.nextCursor.north, 4, "live cursor advancement changed")
  assertEqual(result.winner, "north", "live clash winner changed")
end

function tests.pure_resolver()
  assertTrue(type(resolveClashState) == "function", "resolveClashState must exist")
  local state = {
    formation = {
      north = { "axe-1", "axe-5", "axe-8" },
      south = { "sword-10", "sword-1", "sword-2" },
    },
    oaths = { north = { ["axe-5"] = true }, south = {} },
    cursor = { north = 2, south = 1 },
    chainBreaks = { north = {}, south = {} },
    penalties = { north = false, south = false },
  }

  local detailed = resolveClashState(state, CARD_DATA, CONFIG, true)
  local compact = resolveClashState(state, CARD_DATA, CONFIG, false)
  assertEqual(compact.north.finalStrength, 16, "compact resolver must use live Bloodsworn rules")
  assertEqual(compact.north.endIndex, detailed.north.endIndex, "compact resolver must consume the same oath partner")
  assertEqual(compact.winner, detailed.winner, "compact resolver must match the detailed clash winner")
  assertEqual(compact.nextCursor.north, detailed.nextCursor.north, "compact resolver must preserve cursor advancement")
  assertEqual(compact.north.primaryCard.id, "axe-5", "compact resolver must retain primary-card rules data")
  assertTrue(compact.north.isBloodswornCombo, "compact resolver must retain Bloodsworn state")
  assertTrue(compact.north.compact, "simulation entries must identify the compact path")
  assertEqual(compact.north.cardGuids, nil, "simulation entries must omit display GUID arrays")
  assertEqual(compact.north.cards, nil, "simulation entries must omit display card arrays")
  assertEqual(compact.north.breakdown, nil, "simulation entries must omit strength breakdown allocations")
  assertEqual(#(compact.logs or {}), 0, "simulation mode should not allocate combat logs")
end

function tests.compact_entry_cache()
  local northPlan = plan({ "axe-1", "axe-2", "axe-3", "axe-8", "axe-10" })
  local southPlan = plan({ "sword-6", "sword-1", "sword-2", "sword-3", "sword-10" })
  local state = {
    plans = { north = northPlan, south = southPlan },
    formation = { north = northPlan.formation, south = southPlan.formation },
    oaths = { north = northPlan.oaths, south = southPlan.oaths },
    cursor = { north = 3, south = 1 },
    chainBreaks = { north = {}, south = {} },
    penalties = { north = false, south = false },
  }

  local first = buildEntryFor(state, "north", CARD_DATA, CONFIG, false)
  local second = buildEntryFor(state, "north", CARD_DATA, CONFIG, false)
  assertTrue(first == second, "compact entries should be reused for the same plan state")
  state.chainBreaks.north = { 3 }
  local broken = buildEntryFor(state, "north", CARD_DATA, CONFIG, false)
  local brokenAgain = buildEntryFor(state, "north", CARD_DATA, CONFIG, false)
  assertTrue(broken ~= first, "different chain-break states need different cached entries")
  assertTrue(broken == brokenAgain, "each chain-break state should be cached")

  state.chainBreaks.north = {}
  local unsuppressedStrength = first.finalStrength
  local resolution = resolveClashState(state, CARD_DATA, CONFIG, false)
  assertTrue(resolution.north.finalStrength < unsuppressedStrength, "Shield Wall should suppress the resolved compact entry")
  assertEqual(first.finalStrength, unsuppressedStrength, "Shield Wall must not mutate the cached compact entry")
end

function tests.music_console_controls()
  MUSIC_STATE = { initialized = false, pendingPlay = false, refreshGeneration = 0 }
  musicConsoleStub.buttons = {}
  musicConsoleStub.description = ""
  musicMessages = {}
  MusicPlayer.player_status = "Stop"
  MusicPlayer.shuffle = false
  MusicPlayer.playlist = {}
  MusicPlayer.setPlaylistCalls = 0
  MusicPlayer.playCalls = 0
  MusicPlayer.pauseCalls = 0
  MusicPlayer.previousCalls = 0
  MusicPlayer.nextCalls = 0

  installMusicConsole()
  assertEqual(#musicConsoleStub.buttons, 4, "music console must expose four readable controls")
  assertEqual(MusicPlayer.setPlaylistCalls, 0, "loading the console must remain silent and leave the playlist untouched")
  assertEqual(MusicPlayer.playCalls, 0, "loading the console must not autoplay")

  musicTogglePlay(nil, "Blue")
  assertEqual(MusicPlayer.setPlaylistCalls, 0, "non-host clicks must not initialize music")
  assertEqual(#musicMessages, 1, "non-host clicks need permission feedback")

  musicTogglePlay(nil, "White")
  assertEqual(MusicPlayer.setPlaylistCalls, 1, "first host action must initialize the playlist once")
  assertEqual(MusicPlayer.playCalls, 1, "host play must start the selected track")
  assertTrue(string.find(musicConsoleStub.description, "First Track", 1, true) ~= nil, "console description must show the current track")

  musicTogglePlay(nil, "White")
  assertEqual(MusicPlayer.pauseCalls, 1, "second play toggle must pause")
  musicPrevious(nil, "White")
  musicNext(nil, "White")
  assertEqual(MusicPlayer.previousCalls, 1, "previous control must call MusicPlayer")
  assertEqual(MusicPlayer.nextCalls, 1, "next control must call MusicPlayer")
  musicToggleShuffle(nil, "White")
  assertTrue(MusicPlayer.shuffle, "shuffle control must toggle MusicPlayer.shuffle")
  assertEqual(MusicPlayer.setPlaylistCalls, 1, "later controls must reuse the initialized playlist")
end

function tests.plan_generation()
  assertTrue(type(generateFormationPlans) == "function", "generateFormationPlans must exist")
  local plainHand = { "axe-1", "axe-2", "axe-3", "sword-1", "sword-2" }
  local plainPlans = generateFormationPlans(plainHand, CARD_DATA)
  assertEqual(#plainPlans, 120, "five distinct cards must have 120 formations")

  local keys = {}
  for _, candidate in ipairs(plainPlans) do keys[arrayKey(candidate.formation)] = true end
  local unique = 0
  for _ in pairs(keys) do unique = unique + 1 end
  assertEqual(unique, 120, "formations must be unique")

  local bloodHand = { "axe-5", "axe-10", "sword-1", "spear-1", "berserker-1" }
  local bloodPlans = generateFormationPlans(bloodHand, CARD_DATA)
  assertEqual(#bloodPlans, 216, "one Bloodsworn must expand 120 orders into 216 legal plans")

  local sawSworn = false
  local sawUnsworn = false
  for _, candidate in ipairs(bloodPlans) do
    local last = candidate.formation[#candidate.formation]
    assertTrue(not (last == "axe-5" and candidate.oaths["axe-5"]), "final-position Bloodsworn cannot swear")
    if candidate.formation[1] == "axe-5" and candidate.formation[2] == "axe-10" then
      if candidate.oaths["axe-5"] then sawSworn = true else sawUnsworn = true end
    end
  end
  assertTrue(sawSworn and sawUnsworn, "sworn and unsworn states must be separate candidate plans")

  local twoBloodHand = { "axe-5", "sword-5", "axe-10", "sword-1", "berserker-1" }
  local twoBloodPlans = generateFormationPlans(twoBloodHand, CARD_DATA)
  assertEqual(#twoBloodPlans, 384, "two Bloodsworns must enumerate every independent legal oath state")
end

function tests.skirmish_simulation()
  assertTrue(type(simulateSkirmish) == "function", "simulateSkirmish must exist")
  local north = plan({ "axe-10", "sword-10", "spear-10", "shield-maiden-1", "jarl-1" })
  local south = plan({ "axe-1", "sword-1", "spear-1", "axe-2", "sword-2" })
  local result = simulateSkirmish(north, south, CARD_DATA, CONFIG)

  assertEqual(result.winner, "north", "strong line should win the simulated Skirmish")
  assertEqual(result.score.north, 3, "simulator should stop at three wins")
  assertEqual(result.score.south, 0, "simulator should record the losing score")
  assertEqual(result.decisive, "3-0", "simulator should classify decisive wins")
  assertEqual(result.clashesPlayed, 3, "simulator should stop revealing after the Skirmish is won")
end

function tests.fast_simulation_oracle()
  assertTrue(type(simulateSkirmishWithResolver) == "function", "reference Skirmish simulator must remain available")
  local referenceNorth = plan({ "axe-5", "berserker-1", "axe-6", "ravenfeeder-1", "axe-10" }, { "axe-5" })
  local referenceSouth = plan({ "sword-5", "sword-10", "sword-6", "berserker-2", "ravenfeeder-2" })
  simulateSkirmishWithResolver(referenceNorth, referenceSouth, CARD_DATA, CONFIG)
  assertEqual(referenceNorth.compactEntryCache, nil, "reference simulator must not share the optimized compact-entry cache")
  assertEqual(referenceSouth.compactEntryCache, nil, "reference simulator must stay on detailed live entries")

  local northPlans = generateFormationPlans({ "axe-5", "axe-6", "berserker-1", "ravenfeeder-1", "axe-10" }, CARD_DATA)
  local southPlans = generateFormationPlans({ "sword-5", "sword-6", "berserker-2", "ravenfeeder-2", "sword-10" }, CARD_DATA)

  local function assertResultEqual(fast, reference, label)
    assertEqual(fast.winner, reference.winner, label .. " winner")
    assertEqual(fast.score.north, reference.score.north, label .. " north score")
    assertEqual(fast.score.south, reference.score.south, label .. " south score")
    assertEqual(fast.clashesPlayed, reference.clashesPlayed, label .. " clashes played")
    assertEqual(fast.decisive, reference.decisive, label .. " decisive result")
    for _, side in ipairs({ "north", "south" }) do
      assertEqual(fast.bloodswornCombos[side], reference.bloodswornCombos[side], label .. " " .. side .. " Bloodsworn combos")
      assertEqual(fast.bloodswornComboWins[side], reference.bloodswornComboWins[side], label .. " " .. side .. " Bloodsworn wins")
      assertEqual(fast.berserkerTriggers[side], reference.berserkerTriggers[side], label .. " " .. side .. " Berserker triggers")
      assertEqual(fast.berserkerWaste[side], reference.berserkerWaste[side], label .. " " .. side .. " Berserker waste")
    end
  end

  local alternateRules = copyMap(CONFIG)
  alternateRules.bloodswornAddsChainBonuses = false
  alternateRules.consumedAbilityActivates = true
  alternateRules.berserkerPenaltySuppressesAbilities = false
  alternateRules.shieldWallCancelsCurrentChain = false
  alternateRules.shieldWallBreaksFutureChain = false
  alternateRules.tieBehavior = "left-wins"

  for rulesIndex, rules in ipairs({ CONFIG, alternateRules }) do
    for sample = 1, 250 do
      local north = northPlans[((sample * 37) % #northPlans) + 1]
      local south = southPlans[((sample * sample * 17 + sample * 83) % #southPlans) + 1]
      local reference = simulateSkirmishWithResolver(north, south, CARD_DATA, rules)
      local fast = simulateSkirmish(north, south, CARD_DATA, rules)
      assertResultEqual(fast, reference, "rules " .. rulesIndex .. " sample " .. sample)
    end
  end

  local momentumNorth = generateFormationPlans({ "axe-5", "jarl-1", "shield-maiden-1", "axe-6", "berserker-1" }, CARD_DATA)
  local momentumSouth = generateFormationPlans({ "sword-5", "jarl-2", "shield-maiden-2", "sword-6", "ravenfeeder-1" }, CARD_DATA)
  for sample = 1, 250 do
    local north = momentumNorth[((sample * 43) % #momentumNorth) + 1]
    local south = momentumSouth[((sample * sample * 19 + sample * 71) % #momentumSouth) + 1]
    local reference = simulateSkirmishWithResolver(north, south, CARD_DATA, CONFIG)
    local fast = simulateSkirmish(north, south, CARD_DATA, CONFIG)
    assertResultEqual(fast, reference, "Hero momentum sample " .. sample)
  end
end

function tests.simulation_special_rules()
  local function state(north, south)
    return {
      formation = { north = north, south = south },
      oaths = { north = {}, south = {} },
      cursor = { north = 1, south = 1 },
      chainBreaks = { north = {}, south = {} },
      penalties = { north = false, south = false },
    }
  end

  STATE.phase = "TEST_SENTINEL"
  local shieldState = state({ "axe-1", "axe-2", "axe-3", "axe-8" }, { "sword-6", "sword-1" })
  shieldState.cursor.north = 3
  local shield = resolveClashState(shieldState, CARD_DATA, CONFIG, false)
  assertEqual(shield.north.finalStrength, 3, "Shield Wall must suppress the current simulated chain")
  assertEqual(shield.nextBreaks.north[1], 4, "Shield Wall must break the next simulated chain position")
  assertEqual(STATE.phase, "TEST_SENTINEL", "pure clash resolution must not mutate live STATE")

  local berserkerState = state({ "berserker-1", "axe-10" }, { "spear-10", "sword-1" })
  local first = resolveClashState(berserkerState, CARD_DATA, CONFIG, false)
  assertEqual(first.winner, "north", "Berserker must win its simulated Clash")
  berserkerState.cursor = first.nextCursor
  berserkerState.chainBreaks = first.nextBreaks
  berserkerState.penalties = first.nextPenalties
  local second = resolveClashState(berserkerState, CARD_DATA, CONFIG, false)
  assertEqual(second.winner, "south", "Berserker penalty must lose the next simulated Clash")

  local ravenState = state({ "ravenfeeder-1" }, { "axe-1", "axe-2", "axe-10" })
  ravenState.cursor.south = 3
  local raven = resolveClashState(ravenState, CARD_DATA, CONFIG, false)
  assertEqual(raven.north.finalStrength, 12, "Ravenfeeder configured strength changed")
  assertEqual(raven.south.finalStrength, 12, "weapon chain should create the Ravenfeeder tie")
  assertEqual(raven.winner, "south", "weaponed warrior must defeat Ravenfeeder on an exact tie")

  local strongSouth = plan({ "axe-10", "sword-10", "spear-10", "shield-maiden-1", "jarl-1" })
  local weakNorth = plan({ "axe-1", "sword-1", "spear-1", "axe-2", "sword-2" })
  local southMetrics = evaluateFormationPlan("south", strongSouth, { weakNorth }, CARD_DATA, CONFIG)
  assertEqual(southMetrics.expectedScore, 1, "evaluator must score a south-side AI from its own perspective")
end

function tests.hero_momentum_abilities()
  local function state(north, south)
    return {
      formation = { north = north, south = south },
      oaths = { north = {}, south = {} },
      cursor = { north = 1, south = 1 },
      chainBreaks = { north = {}, south = {} },
      penalties = { north = false, south = false },
      previousDefeatMargins = { north = 0, south = 0 },
      songBonuses = { north = 0, south = 0 },
    }
  end

  local defeat = resolveClashState(state({ "axe-2" }, { "sword-8" }), CARD_DATA, CONFIG, true)
  assertEqual(defeat.nextDefeatMargins.north, 6, "numeric defeat should store Shield Maiden Vengeance")
  local vengeanceState = state({ "shield-maiden-1" }, { "sword-10" })
  vengeanceState.previousDefeatMargins = defeat.nextDefeatMargins
  local vengeance = resolveClashState(vengeanceState, CARD_DATA, CONFIG, true)
  assertEqual(vengeance.north.breakdown[1].abilityBonus, 6, "Shield Maiden should gain the previous defeat margin")
  assertEqual(vengeance.north.finalStrength, 17, "Shield Maiden Vengeance should be uncapped")
  assertTrue(string.find(table.concat(vengeance.logs, " "), "Vengeance adds +6", 1, true) ~= nil, "Vengeance should be named in the combat log")
  local loneVengeanceState = state({ "shield-maiden-1" }, {})
  loneVengeanceState.previousDefeatMargins.north = 6
  local loneVengeance = resolveClashState(loneVengeanceState, CARD_DATA, CONFIG, true)
  assertTrue(string.find(table.concat(loneVengeance.logs, " "), "Vengeance adds +6", 1, true) ~= nil, "lone Hero entries should still log applied bonuses")

  local specialLoss = resolveClashState(state({ "ravenfeeder-1" }, { "berserker-1" }), CARD_DATA, CONFIG, true)
  assertEqual(specialLoss.winner, "south", "Berserker should win the setup Clash")
  assertEqual(specialLoss.nextDefeatMargins.north, 0, "special-rule-only losses should store zero Vengeance")

  local expectedSongs = { win = 3, tie = 2, loss = 1 }
  local opponents = { win = "axe-1", tie = "shield-maiden-1", loss = "ravenfeeder-1" }
  for outcome, opponent in pairs(opponents) do
    local song = resolveClashState(state({ "jarl-1" }, { opponent }), CARD_DATA, CONFIG, true)
    assertEqual(song.nextSongBonuses.north, expectedSongs[outcome], "Jarl should queue the " .. outcome .. " bonus")
    assertTrue(string.find(table.concat(song.logs, " "), "Jarl Lead by Example queues +" .. expectedSongs[outcome], 1, true) ~= nil, "Jarl queue should be named in the combat log")
  end

  local penalizedJarl = state({ "jarl-1" }, { "axe-1" })
  penalizedJarl.penalties.north = true
  local suppressedSong = resolveClashState(penalizedJarl, CARD_DATA, CONFIG, true)
  assertEqual(suppressedSong.winner, "south", "Berserker penalty should lose Jarl's Clash")
  assertEqual(suppressedSong.nextSongBonuses.north, 0, "Berserker penalty should suppress Jarl's outgoing bonus")
  local permissiveRules = copyMap(CONFIG)
  permissiveRules.berserkerPenaltySuppressesAbilities = false
  local allowedSong = resolveClashState(penalizedJarl, CARD_DATA, permissiveRules, true)
  assertEqual(allowedSong.nextSongBonuses.north, 1, "disabled suppression should allow Jarl's losing bonus")

  local comboState = state({ "axe-5", "jarl-1", "axe-4" }, { "sword-10", "sword-8" })
  comboState.oaths.north["axe-5"] = true
  local combo = resolveClashState(comboState, CARD_DATA, CONFIG, true)
  assertTrue(combo.north.isJarl, "Jarl should activate when consumed by Bloodsworn")
  assertEqual(combo.winner, "north", "Bloodsworn and consumed Jarl should win the setup Clash")
  assertEqual(combo.nextSongBonuses.north, 3, "consumed Jarl should queue the winning bonus")

  comboState.cursor = combo.nextCursor
  comboState.chainBreaks = combo.nextBreaks
  comboState.penalties = combo.nextPenalties
  comboState.previousDefeatMargins = combo.nextDefeatMargins
  comboState.songBonuses = combo.nextSongBonuses
  local inspired = resolveClashState(comboState, CARD_DATA, CONFIG, true)
  assertEqual(inspired.north.breakdown[1].abilityBonus, 3, "winning bonus should apply to the next entry")
  assertEqual(inspired.north.finalStrength, 7, "winning bonus should add three Strength")
  assertEqual(inspired.nextSongBonuses.north, 0, "Jarl carryover should be usable only once")
  assertTrue(string.find(table.concat(inspired.logs, " "), "Jarl Lead by Example adds +3", 1, true) ~= nil, "applied Jarl bonus should be named in the combat log")

  local stackedState = state({ "shield-maiden-1" }, { "spear-10" })
  stackedState.previousDefeatMargins.north = 6
  stackedState.songBonuses.north = 3
  local stacked = resolveClashState(stackedState, CARD_DATA, CONFIG, true)
  assertEqual(stacked.north.breakdown[1].abilityBonus, 9, "Vengeance and Lead by Example should stack")
  assertEqual(stacked.north.finalStrength, 20, "stacked Hero bonuses should affect displayed Strength")

  local shieldState = state({ "axe-1", "axe-8" }, { "sword-6" })
  shieldState.cursor.north = 2
  shieldState.songBonuses.north = 3
  local shielded = resolveClashState(shieldState, CARD_DATA, CONFIG, true)
  assertEqual(shielded.north.breakdown[1].chainBonus, 0, "Shield Wall should still suppress chain Strength")
  assertEqual(shielded.north.breakdown[1].abilityBonus, 3, "Shield Wall must not suppress Lead by Example")
  assertEqual(shielded.north.finalStrength, 11, "Shield Wall should preserve ability Strength")
end

function tests.oath_evaluation()
  assertTrue(type(evaluateFormationPlan) == "function", "evaluateFormationPlan must exist")
  local formation = { "axe-5", "axe-10", "sword-1", "spear-10", "axe-9" }
  local sworn = plan(formation, { "axe-5" })
  local unsworn = plan(formation)
  local opponent = plan({ "sword-1", "spear-9", "sword-10", "axe-2", "spear-10" })

  local swornResult = evaluateFormationPlan("north", sworn, { opponent }, CARD_DATA, CONFIG)
  local unswornResult = evaluateFormationPlan("north", unsworn, { opponent }, CARD_DATA, CONFIG)
  assertTrue(unswornResult.expectedScore > swornResult.expectedScore, "evaluator should decline an oath that wastes the partner")
  assertEqual(swornResult.bloodswornCombos, 1, "evaluator should record used Bloodsworn combos")
  assertEqual(unswornResult.bloodswornCombos, 0, "unsworn plans should record no Bloodsworn combo")
end

function tests.near_optimal_randomization()
  assertTrue(type(selectNearOptimalEvaluation) == "function", "selectNearOptimalEvaluation must exist")
  local candidates = {
    { plan = { key = "best" }, utility = 0.61, worstOutcome = 0, worstMargin = -2 },
    { plan = { key = "second" }, utility = 0.59, worstOutcome = 0, worstMargin = -2 },
    { plan = { key = "third" }, utility = 0.58, worstOutcome = 0, worstMargin = -2 },
    { plan = { key = "punishable" }, utility = 0.60, worstOutcome = 0, worstMargin = -3 },
    { plan = { key = "excluded" }, utility = 0.56, worstOutcome = 0, worstMargin = -2 },
  }

  local first, firstCount = selectNearOptimalEvaluation(candidates, 0.03, function() return 0 end)
  local last, lastCount = selectNearOptimalEvaluation(candidates, 0.03, function() return 0.999999 end)
  assertEqual(first.plan.key, "best", "low roll should select the first robust near-optimal plan")
  assertEqual(last.plan.key, "third", "high roll should select the last robust near-optimal plan")
  assertEqual(firstCount, 3, "a worse worst-case margin must be excluded from randomization")
  assertEqual(lastCount, 3, "selection pool size should be stable")
end

function tests.incremental_search()
  assertTrue(type(createStrategicFormationSearch) == "function", "createStrategicFormationSearch must exist")
  assertTrue(type(advanceStrategicFormationSearch) == "function", "advanceStrategicFormationSearch must exist")
  assertTrue(type(finishStrategicFormationSearch) == "function", "finishStrategicFormationSearch must exist")
  local aiHand = { "axe-5", "axe-10", "sword-1" }
  local opponentHand = { "spear-9", "sword-10", "axe-2" }
  local search = createStrategicFormationSearch("north", aiHand, opponentHand, CARD_DATA, CONFIG)

  assertEqual(#search.aiPlans, 10, "three-card Bloodsworn hand should include legal oath states")
  assertEqual(#search.opponentPlans, 6, "plain three-card hand should have six formations")
  assertTrue(not search.complete, "new search should be pending")
  advanceStrategicFormationSearch(search, 1)
  assertEqual(search.matchupsEvaluated, 1, "one search step should simulate only one plan matchup")
  assertEqual(#search.evaluations, 0, "an AI plan is incomplete until every opponent response is simulated")
  assertTrue(not search.complete, "partial search should remain pending")
  advanceStrategicFormationSearch(search, 5)
  assertEqual(search.matchupsEvaluated, 6, "search batching should advance the Cartesian matchup matrix")
  assertEqual(#search.evaluations, 1, "six opponent plans should complete exactly one AI evaluation")
  while not search.complete do advanceStrategicFormationSearch(search, 7) end

  local choice = finishStrategicFormationSearch(search, function() return 0 end)
  assertTrue(choice and choice.plan, "completed incremental search should produce a plan")
  assertEqual(choice.aiPlanCount, 10, "choice should report all evaluated AI plans")
  assertEqual(choice.opponentPlanCount, 6, "choice should report all modeled responses")
end

function tests.state_migration()
  STATE = newState()
  STATE.stateVersion = 3
  STATE.previousDefeatMargins = nil
  STATE.songBonuses = nil
  normalizeLoadedState()
  assertEqual(STATE.stateVersion, 4, "loaded state should migrate to Hero momentum version")
  assertEqual(STATE.previousDefeatMargins.north, 0, "migration should initialize North Vengeance")
  assertEqual(STATE.previousDefeatMargins.south, 0, "migration should initialize South Vengeance")
  assertEqual(STATE.songBonuses.north, 0, "migration should initialize North Lead by Example carryover")
  assertEqual(STATE.songBonuses.south, 0, "migration should initialize South Lead by Example carryover")
end

function tests.full_strategic_choice()
  assertTrue(type(chooseStrategicFormation) == "function", "chooseStrategicFormation must exist")
  local aiHand = { "axe-5", "axe-10", "axe-8", "sword-9", "berserker-1" }
  local opponentHand = { "sword-10", "spear-10", "spear-9", "axe-9", "shield-maiden-1" }
  local choice = chooseStrategicFormation("north", aiHand, opponentHand, CARD_DATA, CONFIG, function() return 0.5 end)

  assertTrue(choice and choice.plan, "solver must return a candidate plan")
  assertEqual(#choice.plan.formation, 5, "chosen formation must use all five cards")
  assertEqual(choice.aiPlanCount, 216, "solver must enumerate every AI oath plan")
  assertEqual(choice.opponentPlanCount, 120, "solver must enumerate every opponent formation")
  assertTrue(choice.nearOptimalCount >= 1, "solver must report its randomized candidate pool")
  assertTrue(choice.metrics.total == choice.opponentPlanCount, "chosen metrics must cover every opponent plan")
  assertEqual(choice.plan.key, "axe-5>sword-9>berserker-1>axe-8>axe-10|1", "seeded strategic decision should include the active Hero powers")
end

local requested = arg and arg[1] or "all"
if requested == "all" then
  local names = {}
  for name in pairs(tests) do table.insert(names, name) end
  table.sort(names)
  for _, name in ipairs(names) do
    tests[name]()
    print("PASS " .. name)
  end
else
  local test = tests[requested]
  assertTrue(test ~= nil, "unknown Lua AI test: " .. tostring(requested))
  test()
  print("PASS " .. requested)
end
