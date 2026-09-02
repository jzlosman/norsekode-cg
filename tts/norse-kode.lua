-- Norse Kode · Tabletop Simulator controller
-- The physical cards and five player-mat slots are the interface. This script only
-- automates setup, secrecy, resolution, scoring, and the public playtest log.

CONFIG = {
  draftPoolSize = 10,
  cardsPerPlayer = 5,
  clashesToWinSkirmish = 3,
  skirmishesToWin = 5,
  chainBonusStep = 1,
  bloodswornStrength = 5,
  shieldWallStrength = 6,
  ravenfeederStrength = 12,
  weaponAdvantageMode = "tie-break-only",
  weaponTriangle = { axe = "sword", sword = "spear", spear = "axe" },
  shieldWallCancelsCurrentChain = true,
  shieldWallBreaksFutureChain = true,
  bloodswornAddsChainBonuses = true,
  consumedAbilityActivates = false,
  shieldMaidenVengeanceCap = nil,
  jarlWinBonus = 3,
  jarlTieBonus = 2,
  jarlLossBonus = 1,
  soloMode = true,
  aiNearOptimalTolerance = 0.03,
  aiWorstCaseWeight = 0.15,
  aiDecisiveWeight = 0.02,
  aiBloodswornEfficiencyWeight = 0.01,
  aiBerserkerWasteWeight = 0.01,
  aiSearchMatchupsPerFrame = 120,
  berserkerPenaltySuppressesAbilities = true,
  tieBehavior = "no-winner",
}

BOARD_GUID = "b00001"
DECK_GUID = "d00001"
NORTH_PANEL_GUID = "b00002"
SOUTH_PANEL_GUID = "b00003"
HOST_PANEL_GUID = "b00004"
TOKEN_BAG_GUID = "b00005"
OATH_YES_BAG_GUID = "b00006"
OATH_NO_BAG_GUID = "b00007"
SKIRMISH_TOKEN_BAG_GUID = "b00008"
OATH_SLOT_GUIDS = {
  north = { "b00009", "b00010" },
  south = { "b00011", "b00012" },
}
DRAW_PILE_SLOT_GUID = "b00013"
DISCARD_SLOT_GUID = "b00014"

-- Formation mats use five evenly spaced slots; the board draft grid has a separate first pile column.
SLOT_X = { -6, -3, 0, 3, 6 }
DRAFT_COLUMN_X = { -3.9, -1.3, 1.3, 3.9, 6.5 }
SLOT_Z = { north = -8.4, south = 8.4 }
BOARD_SCALE_X = 8
BOARD_SCALE_Z = 6.8
PLAYER_MAT_SCALE_X = 3.3
PLAYER_MAT_SCALE_Z = 3.6
CLASH_MARKER_OFFSET = 2.09
SKIRMISH_TRACK_OFFSET = 2.3
SKIRMISH_TRACK_X = { 0.8, 1.96, 3.12, 4.28, 5.44 }
DRAFT_POSITIONS = {
  { x = DRAFT_COLUMN_X[1], y = 1.25, z = -1.75 },
  { x = DRAFT_COLUMN_X[2], y = 1.25, z = -1.75 },
  { x = DRAFT_COLUMN_X[3], y = 1.25, z = -1.75 },
  { x = DRAFT_COLUMN_X[4], y = 1.25, z = -1.75 },
  { x = DRAFT_COLUMN_X[5], y = 1.25, z = -1.75 },
  { x = DRAFT_COLUMN_X[1], y = 1.25, z = 1.75 },
  { x = DRAFT_COLUMN_X[2], y = 1.25, z = 1.75 },
  { x = DRAFT_COLUMN_X[3], y = 1.25, z = 1.75 },
  { x = DRAFT_COLUMN_X[4], y = 1.25, z = 1.75 },
  { x = DRAFT_COLUMN_X[5], y = 1.25, z = 1.75 },
}
-- These coordinates match the two printed board slots in norse-kode-table.png.
DRAW_PILE_POSITION = { x = -6.5, y = 1.25, z = -1.75 }
DISCARD_POSITION = { x = -6.5, y = 1.25, z = 1.75 }
OATH_MARKER_POSITIONS = {
  north = {
    { x = -1.85, y = 1.65, z = -11 },
    { x = 1.85, y = 1.65, z = -11 },
  },
  south = {
    { x = -1.85, y = 1.65, z = 11 },
    { x = 1.85, y = 1.65, z = 11 },
  },
}
OATH_MARKER_LIMIT = 2
FORMATION_DROP_RADIUS = 7.5

function buildCardData()
  local cards = {}
  local weapons = { "axe", "sword", "spear" }
  local weaponNames = { axe = "Axe", sword = "Sword", spear = "Spear" }
  for _, weapon in ipairs(weapons) do
    for rank = 1, 10 do
      local category = "standard"
      local name = weaponNames[weapon] .. " " .. rank
      if rank == 5 then
        category = "bloodsworn"
        name = "Bloodsworn of " .. weaponNames[weapon] .. "s"
      elseif rank == 6 then
        category = "shield_wall"
        name = weaponNames[weapon] .. " Shield Wall"
      end
      local id = weapon .. "-" .. rank
      cards[id] = { id = id, name = name, category = category, weapon = weapon, strength = rank, ability = "none" }
    end
  end

  local heroes = {
    { id = "ravenfeeder", name = "Ravenfeeder", strength = 12, ability = "ravenfeeder" },
    { id = "berserker", name = "Berserker", strength = 11, ability = "berserker" },
    { id = "shield-maiden", name = "Shield Maiden", strength = 11, ability = "shield_maiden" },
    { id = "jarl", name = "Jarl", strength = 11, ability = "jarl" },
  }
  for _, hero in ipairs(heroes) do
    for copy = 1, 3 do
      local id = hero.id .. "-" .. copy
      cards[id] = {
        id = id,
        name = hero.name,
        category = "hero",
        weapon = "none",
        strength = hero.strength,
        ability = hero.ability,
      }
    end
  end
  for copy = 1, 3 do
    cards["skald-" .. copy] = cards["jarl-" .. copy]
  end
  return cards
end

CARD_DATA = buildCardData()
ALL_CARD_IDS = {}
for _, weapon in ipairs({ "axe", "sword", "spear" }) do
  for rank = 1, 10 do table.insert(ALL_CARD_IDS, weapon .. "-" .. rank) end
end
for _, hero in ipairs({ "ravenfeeder", "berserker", "shield-maiden", "jarl" }) do
  for copy = 1, 3 do table.insert(ALL_CARD_IDS, hero .. "-" .. copy) end
end

function newState()
  return {
    stateVersion = 4,
    phase = "SETUP",
    skirmish = 1,
    leader = "north",
    draftTurn = "north",
    sideColors = { north = nil, south = nil },
    pool = {},
    hands = { north = {}, south = {} },
    formation = { north = {}, south = {} },
    committed = { north = false, south = false },
    oaths = { north = {}, south = {} },
    cursor = { north = 1, south = 1 },
    chainBreaks = { north = {}, south = {} },
    penalties = { north = false, south = false },
    previousDefeatMargins = { north = 0, south = 0 },
    songBonuses = { north = 0, south = 0 },
    clashWins = { north = 0, south = 0 },
    tokens = { north = 0, south = 0 },
    skirmishTokens = { north = {}, south = {} },
    currentClash = 1,
    currentResolution = nil,
    lastWinner = nil,
    discard = {},
    clashTokens = {},
    oathMarkers = { north = {}, south = {} },
    resultTexts = {},
    pendingVisuals = 0,
    visualGeneration = 0,
    skirmishCards = {},
    log = { "Claim North or South, then the host starts the War." },
  }
end

STATE = newState()
AI_FORMATION_SEARCH = nil

function nextVisualGeneration()
  STATE.visualGeneration = (STATE.visualGeneration or 0) + 1
  return STATE.visualGeneration
end

function copyArray(values)
  local copy = {}
  for _, value in ipairs(values or {}) do table.insert(copy, value) end
  return copy
end

function contains(values, wanted)
  for _, value in ipairs(values or {}) do
    if value == wanted then return true end
  end
  return false
end

function removeValue(values, wanted)
  for index, value in ipairs(values or {}) do
    if value == wanted then
      table.remove(values, index)
      return true
    end
  end
  return false
end

function appendUnique(values, wanted)
  if not contains(values, wanted) then table.insert(values, wanted) end
end

function sideName(side)
  return side == "north" and "North" or "South"
end

function otherSide(side)
  return side == "north" and "south" or "north"
end

function colorForSide(side)
  return STATE.sideColors[side]
end

function sideForColor(color)
  for side, sideColor in pairs(STATE.sideColors) do
    if sideColor == color then return side end
  end
  return nil
end

function getAiSide()
  for _, side in ipairs({ "north", "south" }) do
    if STATE.sideColors[side] == "AI" then return side end
  end
  return nil
end

function visibleSideColor(side)
  local color = colorForSide(side)
  return color and color ~= "AI" and color or "Invisible"
end

function cardObject(guid)
  return guid and getObjectFromGUID(guid) or nil
end

function cardMeta(guid)
  local object = cardObject(guid)
  if not object then return nil end
  local id = object.getGMNotes()
  return CARD_DATA[id]
end

function isHost(color)
  local player = Player[color]
  return player ~= nil and player.host == true
end

function callbackColor(player)
  if type(player) == "string" then return player end
  return player and player.color or nil
end

function hostGuard(color)
  if isHost(color) then return true end
  broadcastToColor("Only the host can advance this phase.", color, { 1, 0.35, 0.25 })
  return false
end

function playerGuard(side, color)
  if sideForColor(color) == side then return true end
  broadcastToColor("You have not claimed the " .. sideName(side) .. " side.", color, { 1, 0.35, 0.25 })
  return false
end

function distanceOnBoard(position, target)
  return math.sqrt((position.x - target.x) ^ 2 + (position.z - target.z) ^ 2)
end

function slotPosition(side, index)
  return { x = SLOT_X[index], y = 1.25, z = SLOT_Z[side] }
end

function addLog(line)
  table.insert(STATE.log, line)
  if #STATE.log > 80 then table.remove(STATE.log, 1) end
  updateUi()
end

function formatStrength(entry)
  return tostring(entry.finalStrength)
end

function cardDataForFormations(formations)
  local cards = {}
  for _, side in ipairs({ "north", "south" }) do
    for _, guid in ipairs(formations[side] or {}) do
      if cards[guid] == nil then cards[guid] = cardMeta(guid) end
    end
  end
  return cards
end

function computeChainBonusesFor(formation, chainBreaks, cards, config)
  local rules = config or CONFIG
  local bonuses = {}
  local chainLength = 0
  local previousWeapon = "none"
  for index, guid in ipairs(formation or {}) do
    local card = cards[guid]
    if card then
      local broken = contains(chainBreaks, index)
      if broken or card.weapon == "none" or card.weapon ~= previousWeapon then
        chainLength = card.weapon == "none" and 0 or 1
      else
        chainLength = chainLength + 1
      end
      bonuses[index] = card.weapon == "none" and 0 or (chainLength - 1) * rules.chainBonusStep
      previousWeapon = card.weapon
    end
  end
  return bonuses
end

function computeEntryChainTotal(formation, startIndex, endIndex, chainBreaks, cards, config, suppressAll)
  if suppressAll then return 0 end
  local rules = config or CONFIG
  local chainLength = 0
  local previousWeapon = "none"
  local total = 0
  for index = 1, endIndex do
    local card = cards[formation[index]]
    if card then
      local broken = contains(chainBreaks, index)
      if broken or card.weapon == "none" or card.weapon ~= previousWeapon then
        chainLength = card.weapon == "none" and 0 or 1
      else
        chainLength = chainLength + 1
      end
      if index >= startIndex and not broken and card.weapon ~= "none" then
        total = total + (chainLength - 1) * rules.chainBonusStep
      end
      previousWeapon = card.weapon
    end
  end
  return total
end

function computeChainBonuses(side)
  local cards = cardDataForFormations(STATE.formation)
  return computeChainBonusesFor(STATE.formation[side], STATE.chainBreaks[side], cards, CONFIG)
end

function printedStrength(card, config)
  local rules = config or CONFIG
  if card.category == "bloodsworn" then return rules.bloodswornStrength end
  if card.category == "shield_wall" then return rules.shieldWallStrength end
  if card.ability == "ravenfeeder" then return rules.ravenfeederStrength end
  return card.strength
end

function aiCardScore(guid)
  local card = cardMeta(guid)
  if not card then return -1 end
  return printedStrength(card)
end

function setFaceDown(card)
  card.setRotation({ x = 0, y = 180, z = 180 })
end

function setFaceUp(card)
  card.setRotation({ x = 0, y = 180, z = 0 })
end

function ensureFaceDown(card)
  setFaceDown(card)
end

function ensureFaceUp(card)
  setFaceUp(card)
end

function aiHideCard(card, side, index)
  card.setLock(false)
  ensureFaceDown(card)
  card.setPosition({ x = SLOT_X[index], y = 1.25, z = SLOT_Z[side] + (side == "north" and -2.2 or 2.2) })
  card.setLock(true)
end

function aiDraftCard()
  local side = getAiSide()
  if not side or STATE.phase ~= "DRAFT" or STATE.draftTurn ~= side then return end
  if #STATE.pool + #STATE.hands.north + #STATE.hands.south < CONFIG.draftPoolSize then
    scheduleAiTurn(5)
    return
  end

  local chosenGuid = nil
  local chosenCard = nil
  local chosenScore = -1
  for _, guid in ipairs(STATE.pool) do
    local card = cardObject(guid)
    if card then
      local score = aiCardScore(guid)
      if not chosenGuid or score > chosenScore or (score == chosenScore and guid < chosenGuid) then
        chosenGuid = guid
        chosenCard = card
        chosenScore = score
      end
    end
  end
  if not chosenGuid or not chosenCard then
    STATE.phase = "SETUP"
    STATE.pool = {}
    broadcastToAll("AI could not find a drafted card object. Reload the save or press START WAR to retry.", { 1, 0.35, 0.25 })
    addLog("Solo setup stopped because a drafted card object was unavailable.")
    return
  end

  removeValue(STATE.pool, chosenGuid)
  local card = chosenCard
  card.clearButtons()
  table.insert(STATE.hands[side], chosenGuid)
  table.insert(STATE.skirmishCards, chosenGuid)
  aiHideCard(card, side, #STATE.hands[side])
  addLog("AI drafted a hidden warrior.")

  STATE.draftTurn = otherSide(side)
  if #STATE.hands.north == CONFIG.cardsPerPlayer and #STATE.hands.south == CONFIG.cardsPerPlayer then
    STATE.phase = "FORMATION"
    addLog("Draft complete. Place each hand into the five numbered formation slots.")
    aiCommitFormation()
  else
    updateUi()
  end
end

function applyAiFormationChoice(side, choice)
  if not choice or not choice.plan or STATE.committed[side] then return end
  if STATE.phase ~= "FORMATION" and STATE.phase ~= "FORMATION_LOCKED" then return end

  local formation = copyArray(choice.plan.formation)
  STATE.formation[side] = formation
  STATE.oaths[side] = copyMap(choice.plan.oaths)
  STATE.committed[side] = true
  for index, guid in ipairs(formation) do
    local card = cardObject(guid)
    if card then
      card.setLock(false)
      ensureFaceDown(card)
      card.setPosition(slotPosition(side, index))
      card.setLock(true)
    end
  end

  addLog("AI evaluated every legal battle line and Blood Oath, then committed a hidden plan.")
  if STATE.committed.north and STATE.committed.south then
    STATE.phase = "OATHS"
    addLog("Both battle lines are committed. Players choose Blood Oaths privately.")
    aiChooseOaths()
  else
    STATE.phase = "FORMATION_LOCKED"
  end
  updateUi()
end

function continueAiFormationSearch(side, search)
  if AI_FORMATION_SEARCH ~= search or getAiSide() ~= side then return end
  if STATE.phase ~= "FORMATION" and STATE.phase ~= "FORMATION_LOCKED" then
    AI_FORMATION_SEARCH = nil
    return
  end

  local complete = advanceStrategicFormationSearch(search, CONFIG.aiSearchMatchupsPerFrame or 120)
  if complete then
    local choice = finishStrategicFormationSearch(search, math.random)
    AI_FORMATION_SEARCH = nil
    applyAiFormationChoice(side, choice)
    return
  end
  Wait.frames(function() continueAiFormationSearch(side, search) end, 1)
end

function aiCommitFormation()
  local side = getAiSide()
  if not side or STATE.committed[side] or #STATE.hands[side] < CONFIG.cardsPerPlayer then return end
  if STATE.phase ~= "FORMATION" and STATE.phase ~= "FORMATION_LOCKED" then return end
  if AI_FORMATION_SEARCH then return end

  local cards = cardDataForFormations(STATE.hands)
  for _, playerSide in ipairs({ "north", "south" }) do
    for _, guid in ipairs(STATE.hands[playerSide]) do
      if not cards[guid] then
        broadcastToAll("AI could not inspect a drafted card. Reload the save or start a new War.", { 1, 0.35, 0.25 })
        addLog("Solo formation search stopped because card metadata was unavailable.")
        return
      end
    end
  end

  AI_FORMATION_SEARCH = createStrategicFormationSearch(side, STATE.hands[side], STATE.hands[otherSide(side)], cards, CONFIG)
  addLog("AI is simulating every legal hidden formation and Blood Oath plan.")
  continueAiFormationSearch(side, AI_FORMATION_SEARCH)
end

function aiChooseOaths()
  local side = getAiSide()
  if not side or not STATE.formation[side] then return end
  -- The chosen oath map is part of the exhaustive formation plan.
  updateUi()
end

function scheduleAiTurn(frames)
  if not CONFIG.soloMode or not getAiSide() then return end
  Wait.frames(function()
    local side = getAiSide()
    if not side then return end
    if STATE.phase == "DRAFT" and STATE.draftTurn == side then
      aiDraftCard()
    elseif (STATE.phase == "FORMATION" or STATE.phase == "FORMATION_LOCKED") and not STATE.committed[side] then
      aiCommitFormation()
    elseif STATE.phase == "OATHS" then
      aiChooseOaths()
    end
  end, frames or 1)
end

function createCompactEntry(formation, oaths, cursor, chainBreaks, cards, config)
  local rules = config or CONFIG
  local primaryGuid = formation[cursor]
  if not primaryGuid then return nil end
  local primary = cards[primaryGuid]
  if not primary then return nil end

  local partnerGuid = formation[cursor + 1]
  local canSwear = primary.category == "bloodsworn" and oaths[primaryGuid] == true and partnerGuid ~= nil
  local partner = canSwear and cards[partnerGuid] or nil
  if canSwear and not partner then return nil end
  local endIndex = cursor + (canSwear and 1 or 0)
  local totalPrinted = printedStrength(primary, rules) + (partner and printedStrength(partner, rules) or 0)
  local totalChain = computeEntryChainTotal(
    formation,
    cursor,
    endIndex,
    chainBreaks,
    cards,
    rules,
    canSwear and not rules.bloodswornAddsChainBonuses
  )
  local consumedAbilityActive = rules.consumedAbilityActivates and partner ~= nil
  return {
    compact = true,
    primaryIndex = cursor,
    endIndex = endIndex,
    primaryCard = primary,
    printedStrength = totalPrinted,
    chainBonus = totalChain,
    abilityBonus = 0,
    vengeanceBonus = 0,
    songBonus = 0,
    finalStrength = totalPrinted + totalChain,
    hasWeapon = primary.weapon ~= "none" or (partner ~= nil and partner.weapon ~= "none"),
    isBloodswornCombo = canSwear,
    isShieldWall = primary.category == "shield_wall",
    isBerserker = primary.ability == "berserker" or (consumedAbilityActive and partner.ability == "berserker"),
    isRavenfeeder = primary.ability == "ravenfeeder" or (consumedAbilityActive and partner.ability == "ravenfeeder"),
    isShieldMaiden = primary.ability == "shield_maiden",
    isJarl = primary.ability == "jarl" or (partner ~= nil and partner.ability == "jarl"),
  }
end

function vengeanceBonusForEntry(entry, previousDefeatMargin, config)
  if not entry or not entry.isShieldMaiden then return 0 end
  local rules = config or CONFIG
  local vengeance = previousDefeatMargin or 0
  if rules.shieldMaidenVengeanceCap ~= nil then vengeance = math.min(vengeance, rules.shieldMaidenVengeanceCap) end
  return vengeance
end

function heroAbilityBonusForEntry(entry, previousDefeatMargin, songBonus, config)
  if not entry then return 0 end
  return (songBonus or 0) + vengeanceBonusForEntry(entry, previousDefeatMargin, config)
end

function applyHeroBonuses(entry, previousDefeatMargin, songBonus, config)
  if not entry then return nil end
  local vengeanceBonus = vengeanceBonusForEntry(entry, previousDefeatMargin, config)
  local appliedSongBonus = songBonus or 0
  local abilityBonus = appliedSongBonus + vengeanceBonus
  if abilityBonus == 0 then return entry end

  local target = entry
  if entry.compact then
    target = {}
    for key, value in pairs(entry) do target[key] = value end
  end
  target.abilityBonus = abilityBonus
  target.vengeanceBonus = vengeanceBonus
  target.songBonus = appliedSongBonus
  target.finalStrength = target.finalStrength + abilityBonus
  if target.breakdown and target.breakdown[1] then
    target.breakdown[1].abilityBonus = abilityBonus
    target.breakdown[1].effectiveStrength = target.breakdown[1].effectiveStrength + abilityBonus
  end
  return target
end

function chainBreakMaskHas(mask, index)
  local bit = 2 ^ (index - 1)
  return math.floor(mask / bit) % 2 >= 1
end

function chainBreakMaskAdd(mask, index)
  if chainBreakMaskHas(mask, index) then return mask end
  return mask + 2 ^ (index - 1)
end

function chainBreakMask(chainBreaks)
  local mask = 0
  for _, index in ipairs(chainBreaks or {}) do mask = chainBreakMaskAdd(mask, index) end
  return mask
end

function chainBreaksFromMask(mask, config)
  local rules = config or CONFIG
  local chainBreaks = {}
  for index = 1, rules.cardsPerPlayer + 1 do
    if chainBreakMaskHas(mask, index) then table.insert(chainBreaks, index) end
  end
  return chainBreaks
end

function compactEntryForPlanMask(plan, cursor, breakMask, cards, config)
  local rules = config or CONFIG
  if plan.compactEntryCards ~= cards or plan.compactEntryRules ~= rules then
    plan.compactEntryCache = {}
    plan.compactEntryCards = cards
    plan.compactEntryRules = rules
  end
  local key = cursor * 64 + breakMask
  local cached = plan.compactEntryCache[key]
  if cached ~= nil then return cached ~= false and cached or nil end
  local entry = createCompactEntry(plan.formation, plan.oaths or {}, cursor, chainBreaksFromMask(breakMask, rules), cards, rules)
  plan.compactEntryCache[key] = entry or false
  return entry
end

function compactEntryForPlan(plan, cursor, chainBreaks, cards, config)
  return compactEntryForPlanMask(plan, cursor, chainBreakMask(chainBreaks), cards, config)
end

function buildEntryFor(combatState, side, cards, config, includeDetails)
  local rules = config or CONFIG
  local cursor = combatState.cursor[side]
  local formation = combatState.formation[side]
  local oaths = combatState.oaths[side]
  local previousDefeatMargin = combatState.previousDefeatMargins and combatState.previousDefeatMargins[side] or 0
  local songBonus = combatState.songBonuses and combatState.songBonuses[side] or 0
  if includeDetails == false then
    local plan = combatState.plans and combatState.plans[side]
    local entry = plan
      and compactEntryForPlan(plan, cursor, combatState.chainBreaks[side], cards, rules)
      or createCompactEntry(formation, oaths, cursor, combatState.chainBreaks[side], cards, rules)
    return applyHeroBonuses(entry, previousDefeatMargin, songBonus, rules)
  end

  local entry = createCompactEntry(formation, oaths, cursor, combatState.chainBreaks[side], cards, rules)
  if not entry then return nil end
  entry.compact = nil
  local primaryGuid = formation[cursor]
  local partnerGuid = formation[cursor + 1]
  local guids = { primaryGuid }
  local consumed = {}
  if entry.isBloodswornCombo then
    table.insert(guids, partnerGuid)
    table.insert(consumed, partnerGuid)
  end
  local bonuses = computeChainBonusesFor(formation, combatState.chainBreaks[side], cards, rules)
  local breakdown = {}
  local entryCards = {}
  for offset, guid in ipairs(guids) do
    local index = cursor + offset - 1
    local card = cards[guid]
    local suppressed = contains(combatState.chainBreaks[side], index)
    local chain = bonuses[index] or 0
    if suppressed or (entry.isBloodswornCombo and not rules.bloodswornAddsChainBonuses) then chain = 0 end
    local printed = printedStrength(card, rules)
    table.insert(entryCards, card)
    table.insert(breakdown, {
      cardId = guid,
      cardName = card.name,
      printedStrength = printed,
      chainBonus = chain,
      abilityBonus = 0,
      effectiveStrength = printed + chain,
      chainSuppressed = suppressed,
    })
  end
  entry.cardGuids = guids
  entry.consumedGuids = consumed
  entry.cards = entryCards
  entry.breakdown = breakdown
  return applyHeroBonuses(entry, previousDefeatMargin, songBonus, rules)
end

function buildEntry(side)
  return buildEntryFor(STATE, side, cardDataForFormations(STATE.formation), CONFIG)
end

function entryHasWeapon(entry)
  if entry.hasWeapon ~= nil then return entry.hasWeapon end
  for _, card in ipairs(entry.cards or {}) do
    if card and card.weapon ~= "none" then return true end
  end
  return false
end

function entryPrimaryCard(entry)
  return entry.primaryCard or (entry.cards and entry.cards[1])
end

function sumChain(entry)
  return entry.chainBonus or 0
end

function suppressEntryChain(entry)
  if entry.compact then
    if entry.chainBonus == 0 then return entry end
    local suppressed = {}
    for key, value in pairs(entry) do suppressed[key] = value end
    suppressed.chainBonus = 0
    suppressed.finalStrength = suppressed.printedStrength + (suppressed.abilityBonus or 0)
    return suppressed
  end
  for _, item in ipairs(entry.breakdown or {}) do
    item.chainSuppressed = true
    item.chainBonus = 0
    item.effectiveStrength = item.printedStrength + (item.abilityBonus or 0)
  end
  entry.chainBonus = 0
  entry.finalStrength = entry.printedStrength + (entry.abilityBonus or 0)
  return entry
end

function entrySummary(entry, logs)
  for _, item in ipairs(entry.breakdown) do
    local chainText = item.chainBonus > 0 and " + " .. item.chainBonus .. " chain" or ""
    local abilityText = (item.abilityBonus or 0) > 0 and " + " .. item.abilityBonus .. " ability" or ""
    local suppressedText = item.chainSuppressed and " (chain suppressed)" or ""
    table.insert(logs, item.cardName .. ": " .. item.printedStrength .. chainText .. abilityText .. " = " .. item.effectiveStrength .. suppressedText)
  end
  if (entry.vengeanceBonus or 0) > 0 then table.insert(logs, "Shield Maiden Vengeance adds +" .. entry.vengeanceBonus .. ".") end
  if (entry.songBonus or 0) > 0 then table.insert(logs, "Jarl Lead by Example adds +" .. entry.songBonus .. ".") end
  if entry.isBloodswornCombo then
    table.insert(logs, "Bloodsworn combined with " .. entry.cards[2].name .. "; " .. entry.finalStrength .. " total. " .. entry.cards[2].name .. " is consumed.")
  end
end

function entryMath(entry)
  local parts = {}
  for _, item in ipairs(entry.breakdown or {}) do
    table.insert(parts, tostring(item.printedStrength))
    if item.chainBonus > 0 then table.insert(parts, tostring(item.chainBonus)) end
    if (item.abilityBonus or 0) > 0 then table.insert(parts, tostring(item.abilityBonus)) end
  end
  return table.concat(parts, "+")
end

function resultTextPosition(side, entry)
  local startIndex = entry.primaryIndex or 1
  local endIndex = entry.endIndex or startIndex
  return {
    x = (SLOT_X[startIndex] + SLOT_X[endIndex]) / 2,
    y = 1.65,
    z = SLOT_Z[side] - 0.85,
  }
end

function finishVisualSpawn()
  STATE.pendingVisuals = math.max(0, (STATE.pendingVisuals or 0) - 1)
end

function showEntryMath(side, entry)
  if not entry then return end
  local generation = STATE.visualGeneration or 0
  STATE.pendingVisuals = (STATE.pendingVisuals or 0) + 1
  spawnObject({
    type = "3DText",
    position = resultTextPosition(side, entry),
    rotation = { x = 90, y = 0, z = 0 },
    scale = { x = 0.28, y = 0.28, z = 0.28 },
    callback_function = function(textObject)
      local visualPhase = STATE.phase == "RESOLUTION" or STATE.phase == "SKIRMISH_READY" or STATE.phase == "SKIRMISH_ENDING"
      if textObject and visualPhase and STATE.visualGeneration == generation then
        textObject.setValue(entryMath(entry))
        textObject.setLock(true)
        table.insert(STATE.resultTexts, textObject.getGUID())
      elseif textObject then
        textObject.destruct()
      end
      finishVisualSpawn()
    end,
  })
end

function addDetail(details, value)
  if details then table.insert(details, value) end
end

function compareEntryStrengths(north, south, northStrength, southStrength, logs, edgeCases, config)
  local rules = config or CONFIG
  if northStrength ~= southStrength then
    return northStrength > southStrength and "north" or "south"
  end

  if north.isRavenfeeder and not south.isRavenfeeder and entryHasWeapon(south) then
    addDetail(logs, "A weaponed warrior ties Ravenfeeder and defeats him.")
    return "south"
  end
  if south.isRavenfeeder and not north.isRavenfeeder and entryHasWeapon(north) then
    addDetail(logs, "A weaponed warrior ties Ravenfeeder and defeats him.")
    return "north"
  end

  local northPrimary = entryPrimaryCard(north)
  local southPrimary = entryPrimaryCard(south)
  local northWeapon = northPrimary.weapon
  local southWeapon = southPrimary.weapon
  if rules.weaponAdvantageMode == "tie-break-only" and northWeapon ~= "none" and southWeapon ~= "none" then
    if rules.weaponTriangle[northWeapon] == southWeapon then
      addDetail(logs, northPrimary.name .. " wins the weapon tie-break.")
      return "north"
    end
    if rules.weaponTriangle[southWeapon] == northWeapon then
      addDetail(logs, southPrimary.name .. " wins the weapon tie-break.")
      return "south"
    end
  end

  addDetail(edgeCases, "tied Clash")
  addDetail(logs, "Tied Clash: neither player earns the Clash (" .. rules.tieBehavior .. ").")
  return rules.tieBehavior == "left-wins" and "north" or "tie"
end

function compareEntries(north, south, logs, edgeCases, config)
  return compareEntryStrengths(north, south, north.finalStrength, south.finalStrength, logs, edgeCases, config)
end

function nextPenaltyFrom(penalties)
  if penalties.north and not penalties.south then return "north" end
  if penalties.south and not penalties.north then return "south" end
  return nil
end

function addHeroCarryover(result, config, includeLogs, suppressedSongSides)
  local rules = config or CONFIG
  local margins = { north = 0, south = 0 }
  if result.north and result.south then
    if result.winner == "north" then
      margins.south = math.max(0, result.north.finalStrength - result.south.finalStrength)
    elseif result.winner == "south" then
      margins.north = math.max(0, result.south.finalStrength - result.north.finalStrength)
    end
  end

  local songs = { north = 0, south = 0 }
  for _, side in ipairs({ "north", "south" }) do
    local entry = result[side]
    if entry and entry.isJarl and not (suppressedSongSides and suppressedSongSides[side]) then
      if result.winner == side then
        songs[side] = rules.jarlWinBonus
      elseif result.winner == "tie" then
        songs[side] = rules.jarlTieBonus
      else
        songs[side] = rules.jarlLossBonus
      end
    end
  end
  if includeLogs then
    if songs.north > 0 then table.insert(result.logs, "Jarl Lead by Example queues +" .. songs.north .. " for North's next entry.") end
    if songs.south > 0 then table.insert(result.logs, "Jarl Lead by Example queues +" .. songs.south .. " for South's next entry.") end
  end
  result.nextDefeatMargins = margins
  result.nextSongBonuses = songs
  return result
end

function resolveClashState(combatState, cards, config, includeDetails)
  local rules = config or CONFIG
  local logs = {}
  local edgeCases = {}
  if includeDetails == false then
    logs = nil
    edgeCases = nil
  end
  local nextPenalties = { north = combatState.penalties.north, south = combatState.penalties.south }
  local suppressedSongSides = { north = false, south = false }
  local nextBreaks = { north = copyArray(combatState.chainBreaks.north), south = copyArray(combatState.chainBreaks.south) }
  local north = buildEntryFor(combatState, "north", cards, rules, includeDetails)
  local south = buildEntryFor(combatState, "south", cards, rules, includeDetails)
  local nextCursor = {
    north = north and north.endIndex + 1 or combatState.cursor.north,
    south = south and south.endIndex + 1 or combatState.cursor.south,
  }

  if not north and not south then
    addDetail(edgeCases, "Skirmish ending without three wins due to no warriors remaining")
    addDetail(logs, "Neither battle line has a warrior available. The Skirmish ends without three wins.")
    return addHeroCarryover({ winner = "tie", north = nil, south = nil, nextCursor = nextCursor, nextBreaks = nextBreaks, nextPenalties = { north = false, south = false }, nextPenalty = nil, logs = logs or {}, edgeCases = edgeCases or {} }, rules, logs ~= nil)
  end
  if not north or not south then
    local winner = north and "north" or "south"
    addDetail(edgeCases, "player running out of warriors")
    if logs and north then entrySummary(north, logs) end
    if logs and south then entrySummary(south, logs) end
    addDetail(logs, sideName(winner) .. " has the only available warrior and wins this Clash automatically.")
    return addHeroCarryover({ winner = winner, north = north, south = south, nextCursor = nextCursor, nextBreaks = nextBreaks, nextPenalties = { north = false, south = false }, nextPenalty = nil, logs = logs or {}, edgeCases = edgeCases or {} }, rules, logs ~= nil)
  end

  local northSuppressed = north.isShieldWall and sumChain(south) or 0
  local southSuppressed = south.isShieldWall and sumChain(north) or 0
  if north.isShieldWall then
    addDetail(logs, "Shield Wall cancels +" .. northSuppressed .. " opposing chain bonus for this Clash.")
    if rules.shieldWallCancelsCurrentChain then south = suppressEntryChain(south) end
    if rules.shieldWallBreaksFutureChain then
      appendUnique(nextBreaks.south, south.endIndex + 1)
      addDetail(logs, "The opposing weapon chain breaks after this position.")
    end
  end
  if south.isShieldWall then
    addDetail(logs, "Shield Wall cancels +" .. southSuppressed .. " opposing chain bonus for this Clash.")
    if rules.shieldWallCancelsCurrentChain then north = suppressEntryChain(north) end
    if rules.shieldWallBreaksFutureChain then
      appendUnique(nextBreaks.north, north.endIndex + 1)
      addDetail(logs, "The opposing weapon chain breaks after this position.")
    end
  end

  if logs then
    entrySummary(north, logs)
    entrySummary(south, logs)
  end

  local northPenalty = combatState.penalties.north
  local southPenalty = combatState.penalties.south
  local penaltiesActive = northPenalty or southPenalty
  local abilitiesAllowed = penaltiesActive and not rules.berserkerPenaltySuppressesAbilities and (north.isBerserker or south.isBerserker)
  if penaltiesActive and not abilitiesAllowed then
    if rules.berserkerPenaltySuppressesAbilities then
      suppressedSongSides.north = northPenalty
      suppressedSongSides.south = southPenalty
    end
    local who = northPenalty and southPenalty and "Both players" or northPenalty and "North" or "South"
    addDetail(logs, who .. " automatically loses this Clash because of the Berserker penalty.")
    addDetail(edgeCases, "Berserker penalty when the Skirmish ends immediately")
    if northPenalty and southPenalty then
      addDetail(logs, "Both penalties apply; the Clash is tied.")
      return addHeroCarryover({ winner = "tie", north = north, south = south, nextCursor = nextCursor, nextBreaks = nextBreaks, nextPenalties = { north = false, south = false }, nextPenalty = nil, logs = logs or {}, edgeCases = edgeCases or {} }, rules, logs ~= nil, suppressedSongSides)
    end
    local winner = northPenalty and "south" or "north"
    return addHeroCarryover({ winner = winner, north = north, south = south, nextCursor = nextCursor, nextBreaks = nextBreaks, nextPenalties = { north = false, south = false }, nextPenalty = nil, logs = logs or {}, edgeCases = edgeCases or {} }, rules, logs ~= nil, suppressedSongSides)
  end
  if abilitiesAllowed then
    addDetail(logs, "Berserker penalty is active, but this setting allows the Hero ability to trigger.")
    nextPenalties.north = false
    nextPenalties.south = false
  end

  if north.isBerserker or south.isBerserker then
    addDetail(edgeCases, "Berserker interaction")
    if north.isBerserker and south.isBerserker then
      addDetail(logs, "Berserker vs. Berserker: both automatic wins cancel into a tied Clash.")
      nextPenalties.north = true
      nextPenalties.south = true
      return addHeroCarryover({ winner = "tie", north = north, south = south, nextCursor = nextCursor, nextBreaks = nextBreaks, nextPenalties = nextPenalties, nextPenalty = nil, logs = logs or {}, edgeCases = edgeCases or {} }, rules, logs ~= nil)
    end
    local winner = north.isBerserker and "north" or "south"
    nextPenalties[winner] = true
    addDetail(logs, "Berserker wins automatically.")
    return addHeroCarryover({ winner = winner, north = north, south = south, nextCursor = nextCursor, nextBreaks = nextBreaks, nextPenalties = nextPenalties, nextPenalty = winner, logs = logs or {}, edgeCases = edgeCases or {} }, rules, logs ~= nil)
  end

  local winner = compareEntries(north, south, logs, edgeCases, rules)
  local northPrimary = entryPrimaryCard(north)
  local southPrimary = entryPrimaryCard(south)
  if northPrimary.category == "bloodsworn" and southPrimary.category == "bloodsworn" then addDetail(edgeCases, "Bloodsworn vs. Bloodsworn") end
  if (northPrimary.category == "bloodsworn" and south.isShieldWall) or (southPrimary.category == "bloodsworn" and north.isShieldWall) then addDetail(edgeCases, "Shield Wall vs. Bloodsworn") end
  if northSuppressed > 0 or southSuppressed > 0 then addDetail(edgeCases, "Shield Wall interrupting a long chain") end
  if north.isRavenfeeder or south.isRavenfeeder then
    if north.isRavenfeeder and south.isRavenfeeder then addDetail(edgeCases, "Ravenfeeder vs. Ravenfeeder") end
    if math.max(north.finalStrength, south.finalStrength) >= rules.ravenfeederStrength then addDetail(edgeCases, "Ravenfeeder outcome") end
  end

  return addHeroCarryover({ winner = winner, north = north, south = south, nextCursor = nextCursor, nextBreaks = nextBreaks, nextPenalties = nextPenalties, nextPenalty = nextPenaltyFrom(nextPenalties), logs = logs or {}, edgeCases = edgeCases or {} }, rules, logs ~= nil)
end

function resolveClash()
  return resolveClashState(STATE, cardDataForFormations(STATE.formation), CONFIG, true)
end

function copyMap(values)
  local copy = {}
  for key, value in pairs(values or {}) do copy[key] = value end
  return copy
end

function formationPlanKey(formation, oaths)
  local oathBits = {}
  for index, guid in ipairs(formation) do
    if oaths[guid] == true then table.insert(oathBits, tostring(index)) end
  end
  return table.concat(formation, ">") .. "|" .. table.concat(oathBits, ",")
end

function generateFormationPlans(hand, cards)
  local plans = {}
  local formation = {}
  local used = {}

  local function addOathPlans(index, oaths)
    if index > #formation then
      local order = copyArray(formation)
      local oathChoices = copyMap(oaths)
      table.insert(plans, {
        formation = order,
        oaths = oathChoices,
        key = formationPlanKey(order, oathChoices),
      })
      return
    end

    local guid = formation[index]
    local card = cards[guid]
    addOathPlans(index + 1, oaths)
    if index < #formation and card and card.category == "bloodsworn" then
      oaths[guid] = true
      addOathPlans(index + 1, oaths)
      oaths[guid] = nil
    end
  end

  local function permute(index)
    if index > #hand then
      addOathPlans(1, {})
      return
    end
    for handIndex, guid in ipairs(hand) do
      if not used[handIndex] then
        used[handIndex] = true
        formation[index] = guid
        permute(index + 1)
        formation[index] = nil
        used[handIndex] = nil
      end
    end
  end

  permute(1)
  return plans
end

function naturalEntryWinner(north, south, config)
  if not north or not south then return north and "north" or south and "south" or "tie" end
  return compareEntries(north, south, nil, nil, config)
end

-- Reference implementation used by tests to keep the optimized AI path aligned with live Clash rules.
function simulateSkirmishWithResolver(northPlan, southPlan, cards, config)
  local rules = config or CONFIG
  local combatState = {
    formation = { north = northPlan.formation, south = southPlan.formation },
    oaths = { north = northPlan.oaths or {}, south = southPlan.oaths or {} },
    cursor = { north = 1, south = 1 },
    chainBreaks = { north = {}, south = {} },
    penalties = { north = false, south = false },
  }
  local score = { north = 0, south = 0 }
  local bloodswornCombos = { north = 0, south = 0 }
  local bloodswornComboWins = { north = 0, south = 0 }
  local berserkerTriggers = { north = 0, south = 0 }
  local berserkerWaste = { north = 0, south = 0 }
  local clashesPlayed = 0

  for clash = 1, rules.cardsPerPlayer do
    local penaltiesBefore = { north = combatState.penalties.north, south = combatState.penalties.south }
    local resolution = resolveClashState(combatState, cards, rules, true)
    clashesPlayed = clash

    for _, side in ipairs({ "north", "south" }) do
      local entry = resolution[side]
      if entry and entry.isBloodswornCombo then
        bloodswornCombos[side] = bloodswornCombos[side] + 1
        if resolution.winner == side then bloodswornComboWins[side] = bloodswornComboWins[side] + 1 end
      end
    end

    local penaltiesActive = penaltiesBefore.north or penaltiesBefore.south
    local abilitiesSuppressed = penaltiesActive and rules.berserkerPenaltySuppressesAbilities
    if not abilitiesSuppressed and resolution.north and resolution.south then
      local naturalWinner = naturalEntryWinner(resolution.north, resolution.south, rules)
      for _, side in ipairs({ "north", "south" }) do
        local entry = resolution[side]
        local opponent = resolution[otherSide(side)]
        if entry.isBerserker and not opponent.isBerserker then
          berserkerTriggers[side] = berserkerTriggers[side] + 1
          if naturalWinner == side then berserkerWaste[side] = berserkerWaste[side] + 1 end
        elseif entry.isBerserker and opponent.isBerserker then
          berserkerTriggers[side] = berserkerTriggers[side] + 1
        end
      end
    end

    if resolution.winner ~= "tie" then score[resolution.winner] = score[resolution.winner] + 1 end
    combatState.cursor = resolution.nextCursor
    combatState.chainBreaks = resolution.nextBreaks
    combatState.penalties = resolution.nextPenalties
    combatState.previousDefeatMargins = resolution.nextDefeatMargins
    combatState.songBonuses = resolution.nextSongBonuses

    local hasWinner = score.north >= rules.clashesToWinSkirmish or score.south >= rules.clashesToWinSkirmish
    local noWarriors = resolution.north == nil and resolution.south == nil
    if hasWinner or noWarriors then break end
  end

  local winner = "tie"
  if score.north ~= score.south then winner = score.north > score.south and "north" or "south" end
  local loser = winner == "tie" and nil or otherSide(winner)
  local decisive = nil
  if loser and score[winner] == rules.clashesToWinSkirmish and score[loser] <= 1 then
    decisive = tostring(score[winner]) .. "-" .. tostring(score[loser])
  end

  return {
    winner = winner,
    score = score,
    margin = score.north - score.south,
    clashesPlayed = clashesPlayed,
    decisive = decisive,
    bloodswornCombos = bloodswornCombos,
    bloodswornComboWins = bloodswornComboWins,
    berserkerTriggers = berserkerTriggers,
    berserkerWaste = berserkerWaste,
  }
end

-- Hot AI path: scalar state plus cached compact entries avoids display/log allocations per simulated Clash.
function simulateSkirmish(northPlan, southPlan, cards, config)
  local rules = config or CONFIG
  local northCursor = 1
  local southCursor = 1
  local northBreakMask = 0
  local southBreakMask = 0
  local northPenalty = false
  local southPenalty = false
  local northDefeatMargin = 0
  local southDefeatMargin = 0
  local northSongBonus = 0
  local southSongBonus = 0
  local northScore = 0
  local southScore = 0
  local bloodswornCombos = { north = 0, south = 0 }
  local bloodswornComboWins = { north = 0, south = 0 }
  local berserkerTriggers = { north = 0, south = 0 }
  local berserkerWaste = { north = 0, south = 0 }
  local clashesPlayed = 0

  for clash = 1, rules.cardsPerPlayer do
    local north = compactEntryForPlanMask(northPlan, northCursor, northBreakMask, cards, rules)
    local south = compactEntryForPlanMask(southPlan, southCursor, southBreakMask, cards, rules)
    local nextNorthCursor = north and north.endIndex + 1 or northCursor
    local nextSouthCursor = south and south.endIndex + 1 or southCursor
    local northPenaltyActive = northPenalty
    local southPenaltyActive = southPenalty
    local penaltiesActive = northPenaltyActive or southPenaltyActive
    local abilitiesSuppressed = penaltiesActive and rules.berserkerPenaltySuppressesAbilities
    local northAbilityBonus = heroAbilityBonusForEntry(north, northDefeatMargin, northSongBonus, rules)
    local southAbilityBonus = heroAbilityBonusForEntry(south, southDefeatMargin, southSongBonus, rules)
    local northStrength = north and north.finalStrength + northAbilityBonus or 0
    local southStrength = south and south.finalStrength + southAbilityBonus or 0
    local northSongSuppressed = false
    local southSongSuppressed = false
    local winner = "tie"

    if not north and not south then
      northPenalty = false
      southPenalty = false
    elseif not north or not south then
      winner = north and "north" or "south"
      northPenalty = false
      southPenalty = false
    else
      if north.isShieldWall then
        if rules.shieldWallCancelsCurrentChain then southStrength = south.printedStrength + southAbilityBonus end
        if rules.shieldWallBreaksFutureChain then southBreakMask = chainBreakMaskAdd(southBreakMask, south.endIndex + 1) end
      end
      if south.isShieldWall then
        if rules.shieldWallCancelsCurrentChain then northStrength = north.printedStrength + northAbilityBonus end
        if rules.shieldWallBreaksFutureChain then northBreakMask = chainBreakMaskAdd(northBreakMask, north.endIndex + 1) end
      end

      local abilitiesAllowed = penaltiesActive and not rules.berserkerPenaltySuppressesAbilities and (north.isBerserker or south.isBerserker)
      if penaltiesActive and not abilitiesAllowed then
        if rules.berserkerPenaltySuppressesAbilities then
          northSongSuppressed = northPenaltyActive
          southSongSuppressed = southPenaltyActive
        end
        if northPenalty and southPenalty then
          winner = "tie"
        else
          winner = northPenalty and "south" or "north"
        end
        northPenalty = false
        southPenalty = false
      else
        if abilitiesAllowed then
          northPenalty = false
          southPenalty = false
        end
        if north.isBerserker or south.isBerserker then
          if north.isBerserker and south.isBerserker then
            winner = "tie"
            northPenalty = true
            southPenalty = true
          else
            winner = north.isBerserker and "north" or "south"
            if winner == "north" then northPenalty = true else southPenalty = true end
          end
        else
          winner = compareEntryStrengths(north, south, northStrength, southStrength, nil, nil, rules)
        end
      end

      if not abilitiesSuppressed then
        local naturalWinner = compareEntryStrengths(north, south, northStrength, southStrength, nil, nil, rules)
        if north.isBerserker then
          berserkerTriggers.north = berserkerTriggers.north + 1
          if not south.isBerserker and naturalWinner == "north" then berserkerWaste.north = berserkerWaste.north + 1 end
        end
        if south.isBerserker then
          berserkerTriggers.south = berserkerTriggers.south + 1
          if not north.isBerserker and naturalWinner == "south" then berserkerWaste.south = berserkerWaste.south + 1 end
        end
      end
    end

    if north and north.isBloodswornCombo then
      bloodswornCombos.north = bloodswornCombos.north + 1
      if winner == "north" then bloodswornComboWins.north = bloodswornComboWins.north + 1 end
    end
    if south and south.isBloodswornCombo then
      bloodswornCombos.south = bloodswornCombos.south + 1
      if winner == "south" then bloodswornComboWins.south = bloodswornComboWins.south + 1 end
    end
    if winner == "north" then northScore = northScore + 1 elseif winner == "south" then southScore = southScore + 1 end

    local nextNorthDefeatMargin = 0
    local nextSouthDefeatMargin = 0
    if north and south then
      if winner == "north" then
        nextSouthDefeatMargin = math.max(0, northStrength - southStrength)
      elseif winner == "south" then
        nextNorthDefeatMargin = math.max(0, southStrength - northStrength)
      end
    end
    local nextNorthSongBonus = 0
    local nextSouthSongBonus = 0
    if north and north.isJarl and not northSongSuppressed then
      nextNorthSongBonus = winner == "north" and rules.jarlWinBonus or winner == "tie" and rules.jarlTieBonus or rules.jarlLossBonus
    end
    if south and south.isJarl and not southSongSuppressed then
      nextSouthSongBonus = winner == "south" and rules.jarlWinBonus or winner == "tie" and rules.jarlTieBonus or rules.jarlLossBonus
    end

    northCursor = nextNorthCursor
    southCursor = nextSouthCursor
    northDefeatMargin = nextNorthDefeatMargin
    southDefeatMargin = nextSouthDefeatMargin
    northSongBonus = nextNorthSongBonus
    southSongBonus = nextSouthSongBonus
    clashesPlayed = clash
    local hasWinner = northScore >= rules.clashesToWinSkirmish or southScore >= rules.clashesToWinSkirmish
    if hasWinner or (not north and not south) then break end
  end

  local winner = "tie"
  if northScore ~= southScore then winner = northScore > southScore and "north" or "south" end
  local winnerScore = winner == "north" and northScore or winner == "south" and southScore or nil
  local loserScore = winner == "north" and southScore or winner == "south" and northScore or nil
  local decisive = nil
  if winnerScore == rules.clashesToWinSkirmish and loserScore and loserScore <= 1 then
    decisive = tostring(winnerScore) .. "-" .. tostring(loserScore)
  end

  return {
    winner = winner,
    score = { north = northScore, south = southScore },
    margin = northScore - southScore,
    clashesPlayed = clashesPlayed,
    decisive = decisive,
    bloodswornCombos = bloodswornCombos,
    bloodswornComboWins = bloodswornComboWins,
    berserkerTriggers = berserkerTriggers,
    berserkerWaste = berserkerWaste,
  }
end

function newFormationMetrics(aiPlan, total)
  return {
    plan = aiPlan,
    total = total,
    wins = 0,
    ties = 0,
    losses = 0,
    threeZeroWins = 0,
    threeOneWins = 0,
    bloodswornCombos = 0,
    bloodswornComboWins = 0,
    berserkerTriggers = 0,
    berserkerWaste = 0,
    worstMargin = math.huge,
    worstOutcome = 1,
  }
end

function recordFormationMatchup(metrics, aiSide, result)
  local opponentSide = otherSide(aiSide)
  local aiMargin = result.score[aiSide] - result.score[opponentSide]
  local outcome = result.winner == aiSide and 1 or result.winner == "tie" and 0.5 or 0
  if result.winner == aiSide then
    metrics.wins = metrics.wins + 1
    if result.score[aiSide] == 3 and result.score[opponentSide] == 0 then metrics.threeZeroWins = metrics.threeZeroWins + 1 end
    if result.score[aiSide] == 3 and result.score[opponentSide] == 1 then metrics.threeOneWins = metrics.threeOneWins + 1 end
  elseif result.winner == "tie" then
    metrics.ties = metrics.ties + 1
  else
    metrics.losses = metrics.losses + 1
  end
  metrics.worstMargin = math.min(metrics.worstMargin, aiMargin)
  metrics.worstOutcome = math.min(metrics.worstOutcome, outcome)
  metrics.bloodswornCombos = metrics.bloodswornCombos + result.bloodswornCombos[aiSide]
  metrics.bloodswornComboWins = metrics.bloodswornComboWins + result.bloodswornComboWins[aiSide]
  metrics.berserkerTriggers = metrics.berserkerTriggers + result.berserkerTriggers[aiSide]
  metrics.berserkerWaste = metrics.berserkerWaste + result.berserkerWaste[aiSide]
end

function finalizeFormationMetrics(metrics, config)
  local rules = config or CONFIG
  if metrics.total == 0 then metrics.worstMargin = 0 end
  metrics.winRate = metrics.total > 0 and metrics.wins / metrics.total or 0
  metrics.expectedScore = metrics.total > 0 and (metrics.wins + metrics.ties * 0.5) / metrics.total or 0
  metrics.threeZeroRate = metrics.total > 0 and metrics.threeZeroWins / metrics.total or 0
  metrics.threeOneRate = metrics.total > 0 and metrics.threeOneWins / metrics.total or 0
  metrics.decisiveWinRate = metrics.threeZeroRate + metrics.threeOneRate
  metrics.bloodswornEfficiency = metrics.bloodswornCombos > 0 and metrics.bloodswornComboWins / metrics.bloodswornCombos or 0
  metrics.berserkerWasteRate = metrics.berserkerTriggers > 0 and metrics.berserkerWaste / metrics.berserkerTriggers or 0

  local worstCaseWeight = rules.aiWorstCaseWeight or 0.15
  local decisiveWeight = rules.aiDecisiveWeight or 0.02
  local bloodswornWeight = rules.aiBloodswornEfficiencyWeight or 0.01
  local berserkerWasteWeight = rules.aiBerserkerWasteWeight or 0.01
  local normalizedWorstMargin = math.max(0, math.min(1, (metrics.worstMargin + rules.clashesToWinSkirmish) / (rules.clashesToWinSkirmish * 2)))
  metrics.utility = metrics.expectedScore * (1 - worstCaseWeight)
    + normalizedWorstMargin * worstCaseWeight
    + metrics.decisiveWinRate * decisiveWeight
    + metrics.bloodswornEfficiency * bloodswornWeight
    - metrics.berserkerWasteRate * berserkerWasteWeight
  return metrics
end

function evaluateFormationPlan(aiSide, aiPlan, opponentPlans, cards, config)
  local rules = config or CONFIG
  local metrics = newFormationMetrics(aiPlan, #opponentPlans)
  for _, opponentPlan in ipairs(opponentPlans) do
    local northPlan = aiSide == "north" and aiPlan or opponentPlan
    local southPlan = aiSide == "south" and aiPlan or opponentPlan
    recordFormationMatchup(metrics, aiSide, simulateSkirmish(northPlan, southPlan, cards, rules))
  end
  return finalizeFormationMetrics(metrics, rules)
end

function compareFormationEvaluations(left, right)
  if left.utility ~= right.utility then return left.utility > right.utility end
  if left.worstMargin ~= right.worstMargin then return left.worstMargin > right.worstMargin end
  if left.expectedScore ~= right.expectedScore then return left.expectedScore > right.expectedScore end
  if left.winRate ~= right.winRate then return left.winRate > right.winRate end
  if left.decisiveWinRate ~= right.decisiveWinRate then return left.decisiveWinRate > right.decisiveWinRate end
  if left.berserkerWasteRate ~= right.berserkerWasteRate then return left.berserkerWasteRate < right.berserkerWasteRate end
  return left.plan.key < right.plan.key
end

function selectNearOptimalEvaluation(evaluations, tolerance, random)
  if #evaluations == 0 then return nil, 0 end
  table.sort(evaluations, compareFormationEvaluations)
  local bestUtility = evaluations[1].utility
  local utilityCandidates = {}
  local bestWorstOutcome = -1
  local bestWorstMargin = -math.huge
  for _, evaluation in ipairs(evaluations) do
    if bestUtility - evaluation.utility <= tolerance + 0.000000001 then
      table.insert(utilityCandidates, evaluation)
      if evaluation.worstOutcome > bestWorstOutcome then
        bestWorstOutcome = evaluation.worstOutcome
        bestWorstMargin = evaluation.worstMargin
      elseif evaluation.worstOutcome == bestWorstOutcome then
        bestWorstMargin = math.max(bestWorstMargin, evaluation.worstMargin)
      end
    end
  end

  local nearOptimal = {}
  for _, evaluation in ipairs(utilityCandidates) do
    if evaluation.worstOutcome == bestWorstOutcome and evaluation.worstMargin == bestWorstMargin then
      table.insert(nearOptimal, evaluation)
    end
  end
  local roll = (random or math.random)()
  roll = math.max(0, math.min(0.999999999, roll))
  local index = math.floor(roll * #nearOptimal) + 1
  return nearOptimal[index], #nearOptimal
end

function createStrategicFormationSearch(aiSide, aiHand, opponentHand, cards, config)
  local rules = config or CONFIG
  local aiPlans = generateFormationPlans(aiHand, cards)
  local opponentPlans = generateFormationPlans(opponentHand, cards)
  return {
    aiSide = aiSide,
    cards = cards,
    rules = rules,
    aiPlans = aiPlans,
    opponentPlans = opponentPlans,
    evaluations = {},
    nextPlanIndex = 1,
    nextOpponentIndex = 1,
    currentMetrics = #aiPlans > 0 and newFormationMetrics(aiPlans[1], #opponentPlans) or nil,
    matchupsEvaluated = 0,
    complete = #aiPlans == 0 or #opponentPlans == 0,
  }
end

function advanceStrategicFormationSearch(search, batchSize)
  if search.complete then return true end
  local remaining = math.max(1, batchSize or 1)
  while remaining > 0 and not search.complete do
    local aiPlan = search.aiPlans[search.nextPlanIndex]
    local opponentPlan = search.opponentPlans[search.nextOpponentIndex]
    local northPlan = search.aiSide == "north" and aiPlan or opponentPlan
    local southPlan = search.aiSide == "south" and aiPlan or opponentPlan
    local result = simulateSkirmish(northPlan, southPlan, search.cards, search.rules)
    recordFormationMatchup(search.currentMetrics, search.aiSide, result)
    search.matchupsEvaluated = search.matchupsEvaluated + 1
    search.nextOpponentIndex = search.nextOpponentIndex + 1
    remaining = remaining - 1

    if search.nextOpponentIndex > #search.opponentPlans then
      table.insert(search.evaluations, finalizeFormationMetrics(search.currentMetrics, search.rules))
      search.nextPlanIndex = search.nextPlanIndex + 1
      search.nextOpponentIndex = 1
      if search.nextPlanIndex > #search.aiPlans then
        search.currentMetrics = nil
        search.complete = true
      else
        search.currentMetrics = newFormationMetrics(search.aiPlans[search.nextPlanIndex], #search.opponentPlans)
      end
    end
  end
  return search.complete
end

function finishStrategicFormationSearch(search, random)
  if not search.complete then return nil end
  local tolerance = search.rules.aiNearOptimalTolerance or 0.03
  local selected, nearOptimalCount = selectNearOptimalEvaluation(search.evaluations, tolerance, random)
  if not selected then return nil end
  return {
    plan = selected.plan,
    metrics = selected,
    aiPlanCount = #search.aiPlans,
    opponentPlanCount = #search.opponentPlans,
    nearOptimalCount = nearOptimalCount,
  }
end

function chooseStrategicFormation(aiSide, aiHand, opponentHand, cards, config, random)
  local search = createStrategicFormationSearch(aiSide, aiHand, opponentHand, cards, config)
  advanceStrategicFormationSearch(search, #search.aiPlans * #search.opponentPlans)
  return finishStrategicFormationSearch(search, random)
end

function createDraftButton(card)
  card.createButton({
    click_function = "draftCard",
    function_owner = Global,
    label = "TAKE",
    position = { x = 0, y = 0.24, z = 0 },
    rotation = { x = 0, y = 0, z = 0 },
    width = 720,
    height = 260,
    font_size = 150,
    color = { 0.14, 0.08, 0.05 },
    font_color = { 0.96, 0.88, 0.72 },
    tooltip = "Take this card during the active draft turn.",
  })
end

function claimSide(side, object, color)
  if CONFIG.soloMode then
    local otherColor = STATE.sideColors[otherSide(side)]
    if otherColor and otherColor ~= "AI" and otherColor ~= color then
      broadcastToColor("Solo mode allows only one human side; the AI controls the other.", color, { 1, 0.35, 0.25 })
      return
    end
  end
  if STATE.sideColors[side] and STATE.sideColors[side] ~= color then
    broadcastToColor(sideName(side) .. " is already claimed.", color, { 1, 0.35, 0.25 })
    return
  end
  local current = sideForColor(color)
  if current and current ~= side then
    broadcastToColor("You already claimed the " .. sideName(current) .. " side.", color, { 1, 0.35, 0.25 })
    return
  end
  STATE.sideColors[side] = color
  addLog(Player[color].steam_name .. " claimed the " .. sideName(side) .. " side.")
  broadcastToAll(Player[color].steam_name .. " is playing " .. sideName(side) .. ".", { 0.91, 0.72, 0.35 })
  updateUi()
end

function claimNorth(object, color) claimSide("north", object, color) end
function claimSouth(object, color) claimSide("south", object, color) end
function claimNorthUi(player, value, id) claimSide("north", nil, callbackColor(player)) end
function claimSouthUi(player, value, id) claimSide("south", nil, callbackColor(player)) end
function noop() end

function sendToHand(card, color)
  local hand = Player[color].getHandTransform()
  if hand then
    card.setPositionSmooth(hand.position, false, true)
    card.setRotationSmooth(hand.rotation, false, true)
  end
end

function draftCard(card, color)
  if STATE.phase ~= "DRAFT" then return end
  local side = sideForColor(color)
  if side ~= STATE.draftTurn then
    broadcastToColor("It is " .. sideName(STATE.draftTurn) .. "'s draft turn.", color, { 1, 0.7, 0.25 })
    return
  end
  local guid = card.getGUID()
  if not contains(STATE.pool, guid) then return end
  if #STATE.hands[side] >= CONFIG.cardsPerPlayer then return end

  removeValue(STATE.pool, guid)
  card.clearButtons()
  table.insert(STATE.hands[side], guid)
  table.insert(STATE.skirmishCards, guid)
  sendToHand(card, color)
  local draftedCard = cardMeta(guid)
  addLog(sideName(side) .. " drafted " .. (draftedCard and draftedCard.name or "a warrior") .. ".")

  STATE.draftTurn = otherSide(side)
  if #STATE.hands.north == CONFIG.cardsPerPlayer and #STATE.hands.south == CONFIG.cardsPerPlayer then
    STATE.phase = "FORMATION"
    addLog("Draft complete. Place each hand into the five numbered formation slots.")
    scheduleAiTurn(1)
  else
    broadcastToColor("Your pick is complete. Pass the draft to " .. sideName(STATE.draftTurn) .. ".", color, { 0.91, 0.72, 0.35 })
    scheduleAiTurn(1)
  end
  updateUi()
end

function formationAreaContains(side, position)
  return distanceOnBoard(position, { x = 0, y = 0, z = SLOT_Z[side] }) <= FORMATION_DROP_RADIUS
end

function occupiedFormationSlots(side, excludedGuid)
  local occupied = {}
  for _, guid in ipairs(STATE.hands[side] or {}) do
    if guid ~= excludedGuid then
      local card = cardObject(guid)
      if card then
        local closestIndex = nil
        local closestDistance = 1.35
        for index = 1, CONFIG.cardsPerPlayer do
          local distance = distanceOnBoard(card.getPosition(), slotPosition(side, index))
          if distance < closestDistance then
            closestIndex = index
            closestDistance = distance
          end
        end
        if closestIndex then occupied[closestIndex] = true end
      end
    end
  end
  return occupied
end

function onObjectDrop(playerColor, object)
  if not object or (STATE.phase ~= "FORMATION" and STATE.phase ~= "FORMATION_LOCKED") then return end
  local color = callbackColor(playerColor)
  local side = sideForColor(color)
  if not side or not contains(STATE.hands[side], object.getGUID()) or STATE.committed[side] then return end

  local position = object.getPosition()
  if not formationAreaContains(side, position) then return end
  local occupied = occupiedFormationSlots(side, object.getGUID())
  local closestIndex = nil
  local closestDistance = FORMATION_DROP_RADIUS
  for index = 1, CONFIG.cardsPerPlayer do
    if not occupied[index] then
      local distance = distanceOnBoard(position, slotPosition(side, index))
      if distance < closestDistance then
        closestIndex = index
        closestDistance = distance
      end
    end
  end
  if not closestIndex then return end

  object.setLock(false)
  ensureFaceDown(object)
  object.setPosition(slotPosition(side, closestIndex))
  broadcastToColor("Card hidden in " .. sideName(side) .. " slot " .. closestIndex .. ".", color, { 0.91, 0.72, 0.35 })
end

function collectFormationCards(side)
  local candidates = {}
  for order, guid in ipairs(STATE.hands[side] or {}) do
    local card = cardObject(guid)
    if card and formationAreaContains(side, card.getPosition()) then
      table.insert(candidates, { guid = guid, x = card.getPosition().x, order = order })
    end
  end
  if #candidates < CONFIG.cardsPerPlayer then return nil end
  table.sort(candidates, function(left, right)
    if math.abs(left.x - right.x) < 0.05 then return left.order < right.order end
    return left.x < right.x
  end)
  local formation = {}
  for index = 1, CONFIG.cardsPerPlayer do table.insert(formation, candidates[index].guid) end
  return formation
end

function commitFormation(side, object, color)
  if not playerGuard(side, color) then return end
  if STATE.phase ~= "FORMATION" and STATE.phase ~= "FORMATION_LOCKED" then
    broadcastToColor("Formation placement is not active.", color, { 1, 0.7, 0.25 })
    return
  end
  if STATE.committed[side] then
    broadcastToColor("Your formation is already committed.", color, { 1, 0.7, 0.25 })
    return
  end

  local formation = collectFormationCards(side)
  if not formation then
    broadcastToColor("Place all five cards on your player mat before committing; they will be spaced into the numbered slots.", color, { 1, 0.35, 0.25 })
    return
  end

  STATE.formation[side] = formation
  STATE.committed[side] = true
  for index, guid in ipairs(formation) do
    local card = cardObject(guid)
    if card then
      card.setLock(false)
      ensureFaceDown(card)
      card.setPosition(slotPosition(side, index))
      card.setLock(true)
    end
  end
  addLog(sideName(side) .. " committed a hidden battle line.")
  if STATE.committed.north and STATE.committed.south then
    STATE.phase = "OATHS"
    addLog("Both battle lines are committed. Players choose Blood Oaths privately.")
    aiChooseOaths()
  else
    STATE.phase = "FORMATION_LOCKED"
    scheduleAiTurn(1)
  end
  updateUi()
end

function commitNorth(object, color) commitFormation("north", object, color) end
function commitSouth(object, color) commitFormation("south", object, color) end
function commitNorthUi(player, value, id) commitFormation("north", nil, callbackColor(player)) end
function commitSouthUi(player, value, id) commitFormation("south", nil, callbackColor(player)) end

function toggleOath(player, value, id)
  local color = callbackColor(player)
  local side, slotText = string.match(id or "", "^(north|south)%-oath%-(%d+)$")
  local index = tonumber(slotText)
  if not side or not index or not color or not playerGuard(side, color) then return end
  if STATE.phase ~= "OATHS" then return end
  if index >= #STATE.formation[side] then return end
  local guid = STATE.formation[side][index]
  local card = cardMeta(guid)
  if not card or card.category ~= "bloodsworn" then return end
  STATE.oaths[side][guid] = not STATE.oaths[side][guid]
  updateUi()
end

function clearOathMarkers()
  for _, side in ipairs({ "north", "south" }) do
    for _, guid in ipairs((STATE.oathMarkers and STATE.oathMarkers[side]) or {}) do
      local marker = cardObject(guid)
      if marker then marker.destruct() end
    end
  end
  STATE.oathMarkers = { north = {}, south = {} }
end

function clearResultTexts()
  for _, guid in ipairs(STATE.resultTexts or {}) do
    local textObject = cardObject(guid)
    if textObject then textObject.destruct() end
  end
  STATE.resultTexts = {}
end

function oathMarkerPosition(side, index)
  local origin = OATH_MARKER_POSITIONS[side][index]
  return { x = origin.x, y = origin.y, z = origin.z }
end

function spawnOathMarker(side, index, sworn)
  local bagGuid = sworn and OATH_YES_BAG_GUID or OATH_NO_BAG_GUID
  local bag = getObjectFromGUID(bagGuid)
  if not bag then
    broadcastToAll("The oath marker bag is missing; the oath result is still recorded in the log.", { 1, 0.7, 0.25 })
    return
  end
  local generation = STATE.visualGeneration or 0
  STATE.pendingVisuals = (STATE.pendingVisuals or 0) + 1
  bag.takeObject({
    position = oathMarkerPosition(side, index),
    rotation = { x = 0, y = 180, z = 0 },
    smooth = false,
    callback_function = function(marker)
      local markerPhase = STATE.phase == "OATHS" or STATE.phase == "RESOLUTION" or STATE.phase == "SKIRMISH_READY" or STATE.phase == "SKIRMISH_ENDING"
      if marker and markerPhase and STATE.visualGeneration == generation then
        marker.setName(sworn and "Oath YES marker" or "Oath NO marker")
        marker.setLock(true)
        table.insert(STATE.oathMarkers[side], marker.getGUID())
      elseif marker then
        marker.destruct()
      end
      finishVisualSpawn()
    end,
  })
end

function spawnOathMarkers()
  clearOathMarkers()
  for _, side in ipairs({ "north", "south" }) do
    local markerIndex = 0
    for index, guid in ipairs(STATE.formation[side] or {}) do
      local card = cardMeta(guid)
      if markerIndex < OATH_MARKER_LIMIT and index < #STATE.formation[side] and card and card.category == "bloodsworn" then
        markerIndex = markerIndex + 1
        spawnOathMarker(side, markerIndex, STATE.oaths[side][guid] == true)
      end
    end
  end
end

function revealOaths(object, color)
  if not hostGuard(color) or STATE.phase ~= "OATHS" then return end
  local names = {}
  for _, side in ipairs({ "north", "south" }) do
    local sworn = {}
    for index, guid in ipairs(STATE.formation[side]) do
      if STATE.oaths[side][guid] == true then table.insert(sworn, "slot " .. index .. " (" .. cardMeta(guid).name .. ")") end
    end
    table.insert(names, sideName(side) .. ": " .. (#sworn > 0 and table.concat(sworn, ", ") or "none"))
  end
  STATE.phase = "RESOLUTION"
  spawnOathMarkers()
  addLog("Blood Oaths revealed. " .. table.concat(names, " · "))
  broadcastToAll("Blood Oaths revealed · " .. table.concat(names, " · "), { 0.88, 0.3, 0.25 })
  updateUi()
end

function revealCard(guid)
  local card = cardObject(guid)
  if not card then return end
  card.setLock(false)
  ensureFaceUp(card)
  card.setLock(true)
end

function clashTokenPosition(side, index)
  local markerOffset = side == "north" and -CLASH_MARKER_OFFSET or CLASH_MARKER_OFFSET
  return {
    x = SLOT_X[index],
    y = 1.75,
    z = SLOT_Z[side] + markerOffset,
  }
end

function placeClashToken(side, entry, clashNumber)
  if not entry or not entry.primaryIndex then return end
  local cardGuid = entry.cardGuids and entry.cardGuids[1]
  local card = cardObject(cardGuid)
  local bag = getObjectFromGUID(TOKEN_BAG_GUID)
  if not card or not bag then
    broadcastToAll("Clash token bag is missing; the Clash was still resolved.", { 1, 0.7, 0.25 })
    return
  end

  local generation = STATE.visualGeneration or 0
  STATE.pendingVisuals = (STATE.pendingVisuals or 0) + 1
  bag.takeObject({
    position = clashTokenPosition(side, entry.primaryIndex),
    rotation = { x = 0, y = 180, z = 0 },
    smooth = false,
    callback_function = function(token)
      local tokenPhase = STATE.phase == "RESOLUTION" or STATE.phase == "SKIRMISH_READY" or STATE.phase == "SKIRMISH_ENDING"
      if not token or not tokenPhase or STATE.visualGeneration ~= generation then
        if token and (not tokenPhase or STATE.visualGeneration ~= generation) then token.destruct() end
        finishVisualSpawn()
        return
      end
      token.setLock(false)
      token.setPosition(clashTokenPosition(side, entry.primaryIndex))
      token.setLock(true)
      table.insert(STATE.clashTokens, { tokenGuid = token.getGUID(), cardGuid = cardGuid, side = side, slot = entry.primaryIndex, clash = clashNumber })
      finishVisualSpawn()
      updateUi()
    end,
  })
end

function returnClashTokensToBag()
  local bag = getObjectFromGUID(TOKEN_BAG_GUID)
  local remaining = {}
  if not bag then
    if #(STATE.clashTokens or {}) > 0 then
      broadcastToAll("Clash token bag is missing; temporary Clash tokens remain on the table.", { 1, 0.35, 0.25 })
    end
    return
  end
  for _, record in ipairs(STATE.clashTokens or {}) do
    local token = cardObject(record.tokenGuid)
    if token then
      token.setLock(false)
      bag.putObject(token)
    else
      table.insert(remaining, record)
    end
  end
  STATE.clashTokens = remaining
end

function discardCardPosition(index)
  return {
    x = DISCARD_POSITION.x,
    y = DISCARD_POSITION.y + ((index or 1) - 1) * 0.025,
    z = DISCARD_POSITION.z,
  }
end

function moveToDiscard(guid, index)
  local card = cardObject(guid)
  if not card then return end
  card.setLock(false)
  ensureFaceDown(card)
  card.setPosition(discardCardPosition(index))
  card.setLock(true)
  appendUnique(STATE.discard, guid)
end

function revealEntry(entry)
  if not entry then return end
  for _, guid in ipairs(entry.cardGuids) do revealCard(guid) end
  for index, guid in ipairs(entry.consumedGuids) do moveToDiscard(guid, index) end
end

function moveSkirmishCardsToDiscard()
  local index = 1
  for _, guid in ipairs(STATE.skirmishCards or {}) do
    local card = cardObject(guid)
    if card then
      card.setLock(false)
      ensureFaceDown(card)
      card.setPosition(discardCardPosition(index))
      card.setLock(true)
      appendUnique(STATE.discard, guid)
      index = index + 1
    end
  end
end

function skirmishWinner()
  if STATE.clashWins.north == STATE.clashWins.south then return "tie" end
  return STATE.clashWins.north > STATE.clashWins.south and "north" or "south"
end

function skirmishTokenPosition(side, winNumber)
  local trackOffset = side == "north" and SKIRMISH_TRACK_OFFSET or -SKIRMISH_TRACK_OFFSET
  return {
    x = SKIRMISH_TRACK_X[winNumber],
    y = 1.8,
    z = SLOT_Z[side] + trackOffset,
  }
end

function placeSkirmishToken(side, winNumber)
  local bag = getObjectFromGUID(SKIRMISH_TOKEN_BAG_GUID)
  if not bag or not SKIRMISH_TRACK_X[winNumber] then
    broadcastToAll("Skirmish token bag is missing; the win remains recorded in the tracker.", { 1, 0.7, 0.25 })
    return
  end
  local generation = STATE.visualGeneration or 0
  STATE.pendingVisuals = (STATE.pendingVisuals or 0) + 1
  bag.takeObject({
    position = skirmishTokenPosition(side, winNumber),
    rotation = { x = 0, y = 180, z = 0 },
    smooth = false,
    callback_function = function(token)
      local tokenPhase = STATE.phase == "SKIRMISH_ENDING" or STATE.phase == "SKIRMISH_COMPLETE" or STATE.phase == "WAR_COMPLETE"
      if not token or not tokenPhase or STATE.visualGeneration ~= generation then
        if token and (not tokenPhase or STATE.visualGeneration ~= generation) then token.destruct() end
        finishVisualSpawn()
        return
      end
      token.setLock(false)
      token.setPosition(skirmishTokenPosition(side, winNumber))
      token.setLock(true)
      table.insert(STATE.skirmishTokens[side], { tokenGuid = token.getGUID(), win = winNumber })
      finishVisualSpawn()
      updateUi()
    end,
  })
end

function returnSkirmishTokensToBag()
  local bag = getObjectFromGUID(SKIRMISH_TOKEN_BAG_GUID)
  local remaining = { north = {}, south = {} }
  if not bag then
    if #(STATE.skirmishTokens.north or {}) + #(STATE.skirmishTokens.south or {}) > 0 then
      broadcastToAll("Skirmish token bag is missing; victory markers remain on the table.", { 1, 0.35, 0.25 })
    end
    return
  end
  for _, side in ipairs({ "north", "south" }) do
    for _, record in ipairs(STATE.skirmishTokens[side] or {}) do
      local token = cardObject(record.tokenGuid)
      if token then
        token.setLock(false)
        bag.putObject(token)
      else
        table.insert(remaining[side], record)
      end
    end
  end
  STATE.skirmishTokens = remaining
end

function completeSkirmishWhenReady(winner, resolution, waited)
  local framesWaited = waited or 0
  if (STATE.pendingVisuals or 0) > 0 and framesWaited < 120 then
    Wait.frames(function() completeSkirmishWhenReady(winner, resolution, framesWaited + 1) end, 1)
    return
  end
  if (STATE.pendingVisuals or 0) > 0 then
    addLog("A victory marker did not finish before cleanup; the win remains recorded.")
  end
  local score = STATE.clashWins.north .. "–" .. STATE.clashWins.south
  if STATE.tokens.north >= CONFIG.skirmishesToWin or STATE.tokens.south >= CONFIG.skirmishesToWin then
    STATE.phase = "WAR_COMPLETE"
    addLog(sideName(STATE.tokens.north >= CONFIG.skirmishesToWin and "north" or "south") .. " wins the War.")
  else
    STATE.phase = "SKIRMISH_COMPLETE"
    addLog("Host: press NEXT SKIRMISH when both players are ready.")
  end
  STATE.currentResolution = resolution
  updateUi()
end

function finishSkirmish(winner, resolution)
  nextVisualGeneration()
  returnClashTokensToBag()
  clearOathMarkers()
  clearResultTexts()
  moveSkirmishCardsToDiscard()
  STATE.lastWinner = winner
  STATE.phase = "SKIRMISH_ENDING"
  if winner ~= "tie" then
    STATE.tokens[winner] = STATE.tokens[winner] + 1
    placeSkirmishToken(winner, STATE.tokens[winner])
  end
  STATE.currentResolution = resolution
  completeSkirmishWhenReady(winner, resolution)
end

function finishSkirmishWhenReady(winner, resolution, waited)
  local framesWaited = waited or 0
  if (STATE.pendingVisuals or 0) > 0 and framesWaited < 120 then
    Wait.frames(function() finishSkirmishWhenReady(winner, resolution, framesWaited + 1) end, 1)
    return
  end
  if (STATE.pendingVisuals or 0) > 0 then
    addLog("A visual effect did not finish before cleanup; the Skirmish is still being collected.")
  end
  finishSkirmish(winner, resolution)
end

function endSkirmish(object, color)
  if not hostGuard(color) or STATE.phase ~= "SKIRMISH_READY" then return end
  STATE.phase = "SKIRMISH_ENDING"
  finishSkirmishWhenReady(skirmishWinner(), STATE.currentResolution)
end

function resolveNextClash(object, color)
  if not hostGuard(color) or STATE.phase ~= "RESOLUTION" then return end
  local resolution = resolveClash()
  revealEntry(resolution.north)
  revealEntry(resolution.south)
  showEntryMath("north", resolution.north)
  showEntryMath("south", resolution.south)
  for _, line in ipairs(resolution.logs) do addLog(line) end
  if resolution.winner == "tie" then
    addLog("No Clash victory awarded.")
  else
    placeClashToken(resolution.winner, resolution[resolution.winner], STATE.currentClash)
    addLog(sideName(resolution.winner) .. " wins Clash " .. STATE.currentClash .. "; a token marks the winning card.")
  end
  for _, edge in ipairs(resolution.edgeCases) do
    if not contains(STATE.log, "Edge case: " .. edge) then addLog("Edge case: " .. edge) end
  end
  if resolution.winner ~= "tie" then STATE.clashWins[resolution.winner] = STATE.clashWins[resolution.winner] + 1 end
  STATE.cursor.north = resolution.nextCursor.north
  STATE.cursor.south = resolution.nextCursor.south
  STATE.chainBreaks.north = resolution.nextBreaks.north
  STATE.chainBreaks.south = resolution.nextBreaks.south
  STATE.penalties.north = resolution.nextPenalties.north
  STATE.penalties.south = resolution.nextPenalties.south
  STATE.previousDefeatMargins = resolution.nextDefeatMargins
  STATE.songBonuses = resolution.nextSongBonuses
  STATE.currentResolution = resolution

  local hasWinner = STATE.clashWins.north >= CONFIG.clashesToWinSkirmish or STATE.clashWins.south >= CONFIG.clashesToWinSkirmish
  local noWarriors = resolution.north == nil and resolution.south == nil
  local maxClashes = STATE.currentClash >= CONFIG.cardsPerPlayer
  if hasWinner or noWarriors or maxClashes then
    STATE.phase = "SKIRMISH_READY"
    addLog("The Clash result is shown. Host: press END SKIRMISH to score the Skirmish and clear its Clash markers.")
    updateUi()
    return
  end

  STATE.currentClash = STATE.currentClash + 1
  addLog("Clash " .. STATE.currentClash .. " is ready. Host: reveal the next clash.")
  updateUi()
end

function recycleDiscard(deck)
  local discarded = copyArray(STATE.discard)
  STATE.discard = {}
  for _, guid in ipairs(discarded) do
    local card = cardObject(guid)
    if card then
      card.setLock(false)
      deck.putObject(card)
    end
  end
end

function dealDraft()
  local deck = getObjectFromGUID(DECK_GUID)
  if not deck then
    broadcastToAll("Norse Kode deck is missing. Reload the save and try again.", { 1, 0.35, 0.25 })
    return
  end
  for index = 1, CONFIG.draftPoolSize do
    deck.takeObject({
      position = DRAFT_POSITIONS[index],
      flip = true,
      smooth = false,
      callback_function = function(card)
        ensureFaceUp(card)
        table.insert(STATE.pool, card.getGUID())
        createDraftButton(card)
        updateUi()
      end,
    })
  end
  scheduleAiTurn(20)
end

function prepareDraft()
  local deck = getObjectFromGUID(DECK_GUID)
  if not deck then return end
  local quantity = deck.getQuantity()
  if quantity and quantity < CONFIG.draftPoolSize then
    recycleDiscard(deck)
    Wait.frames(function() deck.shuffle(); dealDraft() end, 3)
  else
    deck.shuffle()
    dealDraft()
  end
end

function beginSkirmish(leader)
  AI_FORMATION_SEARCH = nil
  nextVisualGeneration()
  clearOathMarkers()
  clearResultTexts()
  STATE.phase = "DRAFT"
  STATE.leader = leader
  STATE.draftTurn = leader
  STATE.pool = {}
  STATE.hands = { north = {}, south = {} }
  STATE.formation = { north = {}, south = {} }
  STATE.committed = { north = false, south = false }
  STATE.oaths = { north = {}, south = {} }
  STATE.cursor = { north = 1, south = 1 }
  STATE.chainBreaks = { north = {}, south = {} }
  STATE.penalties = { north = false, south = false }
  STATE.previousDefeatMargins = { north = 0, south = 0 }
  STATE.songBonuses = { north = 0, south = 0 }
  STATE.clashWins = { north = 0, south = 0 }
  STATE.currentClash = 1
  STATE.currentResolution = nil
  STATE.lastWinner = nil
  STATE.skirmishCards = {}
  addLog("Skirmish " .. STATE.skirmish .. ": " .. sideName(leader) .. " drafts first.")
  prepareDraft()
end

function returnAllCardsToDeck(callback)
  local deck = getObjectFromGUID(DECK_GUID)
  if not deck then
    broadcastToAll("Norse Kode deck is missing. Reload the save and try again.", { 1, 0.35, 0.25 })
    return
  end
  for _, guid in ipairs(ALL_CARD_IDS) do
    local card = cardObject(guid)
    if card and card ~= deck then
      card.clearButtons()
      card.setLock(false)
      card.setPosition({ x = deck.getPosition().x, y = deck.getPosition().y + 2, z = deck.getPosition().z })
      deck.putObject(card)
    end
  end
  Wait.frames(function() deck.shuffle(); callback(deck) end, 5)
end

function startWar(object, color)
  if not hostGuard(color) then return end
  if STATE.phase ~= "SETUP" and STATE.phase ~= "WAR_COMPLETE" then
    broadcastToColor("Finish the current War before starting a new one.", color, { 1, 0.7, 0.25 })
    return
  end

  local northColor = STATE.sideColors.north
  local southColor = STATE.sideColors.south
  if CONFIG.soloMode then
    if not northColor and not southColor then
      broadcastToColor("Claim North or South first; the other side will be controlled by the AI.", color, { 1, 0.35, 0.25 })
      return
    end
    local northIsHuman = northColor and northColor ~= "AI"
    local southIsHuman = southColor and southColor ~= "AI"
    if northIsHuman and southIsHuman then
      broadcastToColor("Solo mode requires one human side; disable soloMode for two human players.", color, { 1, 0.35, 0.25 })
      return
    end
    if not northColor then northColor = "AI" end
    if not southColor then southColor = "AI" end
    if northColor == "AI" and southColor == "AI" then
      broadcastToColor("A human player must claim one side before starting solo mode.", color, { 1, 0.35, 0.25 })
      return
    end
  elseif not northColor or not southColor or northColor == southColor then
    broadcastToColor("Two different players must claim North and South first.", color, { 1, 0.35, 0.25 })
    return
  end

  local visualGeneration = nextVisualGeneration()
  returnClashTokensToBag()
  returnSkirmishTokensToBag()
  clearOathMarkers()
  clearResultTexts()
  STATE = newState()
  STATE.visualGeneration = visualGeneration
  STATE.sideColors.north = northColor
  STATE.sideColors.south = southColor
  addLog("War setup complete. The battle deck is ready.")
  local ai = getAiSide()
  if ai then addLog("Solo mode: AI controls " .. sideName(ai) .. ".") end
  local leader = math.random() < 0.5 and "north" or "south"
  returnAllCardsToDeck(function() beginSkirmish(leader) end)
end

function nextSkirmish(object, color)
  if not hostGuard(color) or STATE.phase ~= "SKIRMISH_COMPLETE" then return end
  returnClashTokensToBag()
  local leader
  if STATE.lastWinner == "north" then leader = "south" elseif STATE.lastWinner == "south" then leader = "north" else leader = otherSide(STATE.leader) end
  STATE.skirmish = STATE.skirmish + 1
  beginSkirmish(leader)
end

function startWarUi(player, value, id) startWar(nil, callbackColor(player)) end
function revealOathsUi(player, value, id) revealOaths(nil, callbackColor(player)) end
function revealNextClashUi(player, value, id) resolveNextClash(nil, callbackColor(player)) end
function endSkirmishUi(player, value, id) endSkirmish(nil, callbackColor(player)) end
function nextSkirmishUi(player, value, id) nextSkirmish(nil, callbackColor(player)) end

function boardLocalPosition(target, y)
  return { x = target.x / BOARD_SCALE_X, y = y, z = target.z / BOARD_SCALE_Z }
end

function playerMatLocalPosition(side, target, y)
  local rotationSign = side == "north" and -1 or 1
  return {
    x = rotationSign * target.x / PLAYER_MAT_SCALE_X,
    y = y,
    z = rotationSign * (target.z - SLOT_Z[side]) / PLAYER_MAT_SCALE_Z,
  }
end

function installOathSlotButtons()
  for _, side in ipairs({ "north", "south" }) do
    for index, guid in ipairs(OATH_SLOT_GUIDS[side]) do
      local slot = getObjectFromGUID(guid)
      if slot then
        slot.clearButtons()
        slot.createButton({
          click_function = "noop",
          function_owner = Global,
          label = string.upper(side) .. " OATH " .. index,
          position = { x = 0, y = 0.18, z = 0 },
          rotation = { x = 0, y = 0, z = 0 },
          width = 500,
          height = 180,
          font_size = 100,
          color = { 0.12, 0.07, 0.04 },
          font_color = { 0.9, 0.72, 0.3 },
          tooltip = "Blood Oath marker placeholder for this player's reveal order.",
        })
      end
    end
  end
end

function installPileSlotButtons()
  local slots = {
    { guid = DRAW_PILE_SLOT_GUID, label = "DRAW PILE", tooltip = "Place the draw pile here." },
    { guid = DISCARD_SLOT_GUID, label = "DISCARD", tooltip = "Face-down discard pile." },
  }
  for _, data in ipairs(slots) do
    local slot = getObjectFromGUID(data.guid)
    if slot then
      slot.clearButtons()
      slot.createButton({
        click_function = "noop",
        function_owner = Global,
        label = data.label,
        position = { x = 0, y = 0.18, z = 0 },
        rotation = { x = 0, y = 0, z = 0 },
        width = 650,
        height = 180,
        font_size = 100,
        color = { 0.12, 0.07, 0.04 },
        font_color = { 0.9, 0.72, 0.3 },
        tooltip = data.tooltip,
      })
    end
  end
end

function installBoardButtons()
  local board = getObjectFromGUID(BOARD_GUID)
  if board then
    board.clearButtons()
    local boardSnaps = {}
    for _, target in ipairs(DRAFT_POSITIONS) do
      table.insert(boardSnaps, { position = boardLocalPosition(target, 0.28), rotation = { x = 0, y = 180, z = 0 } })
    end
    board.setSnapPoints(boardSnaps)
  end
  installOathSlotButtons()
  installPileSlotButtons()
  for _, side in ipairs({ "north", "south" }) do
    local matGuid = side == "north" and NORTH_PANEL_GUID or SOUTH_PANEL_GUID
    local mat = getObjectFromGUID(matGuid)
    if mat then
      local snaps = {}
      for index = 1, CONFIG.cardsPerPlayer do
        local target = slotPosition(side, index)
        table.insert(snaps, { position = playerMatLocalPosition(side, target, 0.28), rotation = { x = 0, y = 180, z = 0 } })
      end
      mat.setSnapPoints(snaps)
    end
  end
end

function installPanelButtons()
  local north = getObjectFromGUID(NORTH_PANEL_GUID)
  local south = getObjectFromGUID(SOUTH_PANEL_GUID)
  local host = getObjectFromGUID(HOST_PANEL_GUID)
  if north then north.clearButtons() end
  if south then south.clearButtons() end
  if host then host.clearButtons() end
end

function updateOathButton(side, index)
  local id = side .. "-oath-" .. index
  local guid = STATE.formation[side][index]
  local card = cardMeta(guid)
  local active = STATE.phase == "OATHS" and index < #STATE.formation[side] and card ~= nil and card.category == "bloodsworn"
  UI.setAttribute(id, "active", tostring(active))
  if active then
    local sworn = STATE.oaths[side][guid] == true
    UI.setAttribute(id, "text", sworn and "UNSWEAR " .. index or "SWEAR " .. index)
    UI.setAttribute(id, "color", sworn and "#963c34" or "#6b3c26")
    UI.setAttribute(id, "textColor", "#f4ead7")
  end
  return active
end

function updateControlButton(id, active)
  UI.setAttribute(id, "active", tostring(active))
  UI.setAttribute(id, "color", active and "#6b3c26" or "#30251f")
  UI.setAttribute(id, "textColor", "#f4ead7")
end

function updateControlSection(id, active)
  UI.setAttribute(id, "active", tostring(active))
end

function phaseHelp()
  if STATE.phase == "SETUP" then return "Claim a side, then start. Solo assigns the other side to AI." end
  if STATE.phase == "DRAFT" then return "Take one face-up card on your turn; it moves to your private hand." end
  if STATE.phase == "FORMATION" then return "Drop five cards into your mat's nearest row, then commit." end
  if STATE.phase == "FORMATION_LOCKED" then return "Line committed. Waiting for the other side." end
  if STATE.phase == "OATHS" then return "Optionally swear a Blood Oath in your private panel, then reveal." end
  if STATE.phase == "RESOLUTION" then return "Reveal the next Clash; strength math appears above the line." end
  if STATE.phase == "SKIRMISH_READY" then return "Check the final Clash, then end the Skirmish." end
  if STATE.phase == "SKIRMISH_ENDING" then return "Scoring the Skirmish and clearing Clash markers." end
  if STATE.phase == "SKIRMISH_COMPLETE" then return "Win marked. Begin the next Skirmish when ready." end
  if STATE.phase == "WAR_COMPLETE" then return "War complete. Start another when ready." end
  return ""
end

function updateUi()
  if not UI then return end
  local phaseName = string.gsub(STATE.phase, "_", " ")
  local status = phaseName .. " · Skirmish " .. STATE.skirmish .. " · Clash " .. STATE.currentClash
  UI.setAttribute("status", "text", status)
  UI.setAttribute("score", "text", "North " .. STATE.tokens.north .. "/" .. CONFIG.skirmishesToWin .. " · South " .. STATE.tokens.south .. "/" .. CONFIG.skirmishesToWin .. " · Clash " .. STATE.clashWins.north .. "–" .. STATE.clashWins.south)
  UI.setAttribute("phase-help", "text", phaseHelp())

  local setup = STATE.phase == "SETUP" or STATE.phase == "WAR_COMPLETE"
  local formation = STATE.phase == "FORMATION" or STATE.phase == "FORMATION_LOCKED"
  local northClaimActive = setup and STATE.sideColors.north == nil
  local southClaimActive = setup and STATE.sideColors.south == nil
  local northCommitActive = formation and not STATE.committed.north and STATE.sideColors.north ~= nil and STATE.sideColors.north ~= "AI"
  local southCommitActive = formation and not STATE.committed.south and STATE.sideColors.south ~= nil and STATE.sideColors.south ~= "AI"
  updateControlButton("north-claim", northClaimActive)
  updateControlButton("south-claim", southClaimActive)
  updateControlButton("north-commit", northCommitActive)
  updateControlButton("south-commit", southCommitActive)
  updateControlButton("start-war", setup)
  updateControlButton("reveal-oaths", STATE.phase == "OATHS")
  updateControlButton("reveal-clash", STATE.phase == "RESOLUTION")
  updateControlButton("end-skirmish", STATE.phase == "SKIRMISH_READY")
  updateControlButton("next-skirmish", STATE.phase == "SKIRMISH_COMPLETE")
  updateControlSection("setup-controls", setup)
  updateControlSection("formation-controls", northCommitActive or southCommitActive)
  updateControlSection("oath-controls", STATE.phase == "OATHS")
  updateControlSection("resolution-controls", STATE.phase == "RESOLUTION")
  updateControlSection("skirmish-ready-controls", STATE.phase == "SKIRMISH_READY")
  updateControlSection("skirmish-complete-controls", STATE.phase == "SKIRMISH_COMPLETE")

  UI.setAttribute("north-oath-panel", "visibility", visibleSideColor("north"))
  UI.setAttribute("south-oath-panel", "visibility", visibleSideColor("south"))
  UI.setAttribute("north-oath-panel", "active", tostring(STATE.phase == "OATHS"))
  UI.setAttribute("south-oath-panel", "active", tostring(STATE.phase == "OATHS"))
  local northOathOptions = 0
  local southOathOptions = 0
  for index = 1, CONFIG.cardsPerPlayer do
    if updateOathButton("north", index) then northOathOptions = northOathOptions + 1 end
    if updateOathButton("south", index) then southOathOptions = southOathOptions + 1 end
  end
  UI.setAttribute("north-oath-status", "text", northOathOptions > 0 and "Choose any Bloodsworn slot, or leave them all unchosen." or "No legal Blood Oaths in this formation.")
  UI.setAttribute("south-oath-status", "text", southOathOptions > 0 and "Choose any Bloodsworn slot, or leave them all unchosen." or "No legal Blood Oaths in this formation.")
  local startIndex = math.max(1, #STATE.log - 2)
  local visible = {}
  for index = startIndex, #STATE.log do table.insert(visible, STATE.log[index]) end
  UI.setAttribute("log", "text", table.concat(visible, "\n"))
end

function migrateLoadedState()
  local version = tonumber(STATE.stateVersion) or 1
  if version < 2 then
    STATE.clashTokens = STATE.clashTokens or {}
    STATE.oathMarkers = STATE.oathMarkers or { north = {}, south = {} }
    STATE.resultTexts = STATE.resultTexts or {}
  end
  if version < 3 then
    STATE.skirmishTokens = STATE.skirmishTokens or { north = {}, south = {} }
    STATE.skirmishCards = STATE.skirmishCards or {}
    STATE.winnerStack = nil
    STATE.skirmishStack = nil
  end
  if version < 4 then
    STATE.previousDefeatMargins = STATE.previousDefeatMargins or { north = 0, south = 0 }
    STATE.songBonuses = STATE.songBonuses or { north = 0, south = 0 }
  end
end

function normalizeLoadedState()
  migrateLoadedState()
  local defaults = newState()
  local sideTables = { "sideColors", "hands", "formation", "committed", "oaths", "cursor", "chainBreaks", "penalties", "previousDefeatMargins", "songBonuses", "clashWins", "tokens", "oathMarkers", "skirmishTokens" }
  for _, field in ipairs(sideTables) do
    if type(STATE[field]) ~= "table" then STATE[field] = defaults[field] end
    for _, side in ipairs({ "north", "south" }) do
      if STATE[field][side] == nil then STATE[field][side] = defaults[field][side] end
    end
  end
  for _, field in ipairs({ "discard", "clashTokens", "resultTexts", "skirmishCards", "log" }) do
    if type(STATE[field]) ~= "table" then STATE[field] = defaults[field] end
  end
  for field, value in pairs({ skirmish = 1, leader = "north", draftTurn = "north", currentClash = 1 }) do
    if STATE[field] == nil then STATE[field] = value end
  end
  if #STATE.skirmishCards == 0 then
    for _, side in ipairs({ "north", "south" }) do
      for _, guid in ipairs(STATE.hands[side] or {}) do appendUnique(STATE.skirmishCards, guid) end
      for _, guid in ipairs(STATE.formation[side] or {}) do appendUnique(STATE.skirmishCards, guid) end
    end
  end
  STATE.stateVersion = 4
  STATE.pendingVisuals = 0
  STATE.visualGeneration = (STATE.visualGeneration or 0) + 1
  if not CONFIG.soloMode then
    for _, side in ipairs({ "north", "south" }) do
      if STATE.sideColors[side] == "AI" then STATE.sideColors[side] = nil end
    end
  end
end

function onLoad(savedData)
  if savedData and savedData ~= "" then
    local ok, decoded = pcall(function() return JSON.decode(savedData) end)
    if ok and decoded and decoded.phase then STATE = decoded end
  end
  normalizeLoadedState()
  if not STATE.clashTokens then STATE.clashTokens = {} end
  if not STATE.oathMarkers then STATE.oathMarkers = { north = {}, south = {} } end
  if not STATE.resultTexts then STATE.resultTexts = {} end
  installBoardButtons()
  installPanelButtons()
  updateUi()
  scheduleAiTurn(10)
end

function onSave()
  return JSON.encode(STATE)
end
