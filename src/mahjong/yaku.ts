import { HandCounts, YakuInfo, DiscardAnalysis, TileId, OpenMeld } from './types'
import { isSimple, isTerminal, isHonor, handToCountArray, tileSuit } from './tiles'
import { calculateShanten, calculateStandardShanten, calculateAcceptance, calculateShantenWithMelds } from './shanten'

// Calculate distance to each yaku for a hand
// openMelds is optional — when present, adjusts han values and disables closed-only yaku
export function analyzeYaku(counts: HandCounts, openMelds: OpenMeld[] = []): YakuInfo[] {
  const results: YakuInfo[] = []
  const isOpen = openMelds.length > 0
  const shanten = openMelds.length > 0
    ? calculateShantenWithMelds(counts, openMelds.length)
    : calculateShanten(counts)

  results.push(tanyaoDistance(counts, shanten))
  if (!isOpen) results.push(chiitoiDistance(counts))
  results.push(toitoiDistance(counts, shanten))
  results.push(yakuhaiDistance(counts, shanten))
  if (!isOpen) results.push(pinfuDistance(counts, shanten))
  results.push(...honitsuDistance(counts, isOpen))
  results.push(...chinitsuDistance(counts, isOpen))
  results.push(ittsuDistance(counts, shanten, isOpen))
  results.push(chantaDistance(counts, shanten, isOpen))

  return results.sort((a, b) => a.distance - b.distance)
}

// Tanyao: all simples (no terminals or honors)
function tanyaoDistance(counts: HandCounts, shanten: number): YakuInfo {
  let badTiles = 0
  for (let i = 0; i < 34; i++) {
    if (!isSimple(i)) badTiles += counts[i]
  }
  return {
    name: 'All Simples',
    japanese: 'Tanyao',
    distance: Math.max(shanten, badTiles),
    han: 1,
  }
}

// Chiitoi: seven pairs
function chiitoiDistance(counts: HandCounts): YakuInfo {
  let pairs = 0
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) pairs++
  }
  return {
    name: 'Seven Pairs',
    japanese: 'Chiitoitsu',
    distance: 6 - pairs,
    han: 2,
  }
}

// Toitoi: all triplets (4 koutsu + 1 pair)
function toitoiDistance(counts: HandCounts, shanten: number): YakuInfo {
  let triplets = 0
  let pairs = 0
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 3) triplets++
    else if (counts[i] === 2) pairs++
  }
  // Need 4 triplets + 1 pair. Each pair could become a triplet with one more tile.
  const neededTriplets = 4 - triplets
  const pairsAvailable = Math.min(pairs, neededTriplets)
  const fromScratch = neededTriplets - pairsAvailable
  const distance = pairsAvailable + fromScratch * 2 + (triplets + pairs < 5 ? 1 : 0)
  return {
    name: 'All Triplets',
    japanese: 'Toitoi',
    distance: Math.max(shanten, Math.max(0, distance - 1)),
    han: 2,
  }
}

// Yakuhai: value tiles triplet (dragons, seat/round wind)
function yakuhaiDistance(counts: HandCounts, shanten: number): YakuInfo {
  // Check dragons (31-33) and winds (27-30) — simplified, treating all winds as value
  let bestDragonDist = 3
  for (let i = 31; i <= 33; i++) {
    bestDragonDist = Math.min(bestDragonDist, 3 - counts[i])
  }
  let bestWindDist = 3
  for (let i = 27; i <= 30; i++) {
    bestWindDist = Math.min(bestWindDist, 3 - counts[i])
  }
  const valueDist = Math.min(bestDragonDist, bestWindDist)
  return {
    name: 'Value Tiles',
    japanese: 'Yakuhai',
    distance: Math.max(shanten, valueDist),
    han: 1,
  }
}

// Pinfu: all sequences, no-value pair, two-sided wait
function pinfuDistance(counts: HandCounts, shanten: number): YakuInfo {
  // Count tiles in potential sequences vs triplets
  let sequenceFriendly = 0
  let isolated = 0
  for (let i = 0; i < 27; i++) {
    if (counts[i] > 0) sequenceFriendly += counts[i]
  }
  for (let i = 27; i < 34; i++) {
    isolated += counts[i]
  }
  // Pinfu needs all number tiles in sequences + a valueless pair
  // Honors are bad, triplet-only tiles are bad
  const honorPenalty = isolated
  return {
    name: 'Pinfu',
    japanese: 'Pinfu',
    distance: Math.max(shanten, honorPenalty),
    han: 1,
  }
}

// Honitsu: half flush (one suit + honors)
function honitsuDistance(counts: HandCounts, isOpen: boolean = false): YakuInfo[] {
  const suitNames = ['Man', 'Pin', 'Sou']
  return [0, 1, 2].map(suit => {
    let badTiles = 0
    for (let i = 0; i < 27; i++) {
      if (Math.floor(i / 9) !== suit) badTiles += counts[i]
    }
    // Build a filtered hand with only this suit + honors
    const filtered = new Array(34).fill(0)
    for (let i = suit * 9; i < suit * 9 + 9; i++) filtered[i] = counts[i]
    for (let i = 27; i < 34; i++) filtered[i] = counts[i]
    const filteredShanten = calculateShanten([...filtered])
    return {
      name: `Half Flush (${suitNames[suit]})`,
      japanese: 'Honitsu',
      distance: Math.max(filteredShanten, badTiles),
      han: isOpen ? 2 : 3,
    }
  })
}

// Chinitsu: full flush (one suit only)
function chinitsuDistance(counts: HandCounts, isOpen: boolean = false): YakuInfo[] {
  const suitNames = ['Man', 'Pin', 'Sou']
  return [0, 1, 2].map(suit => {
    let badTiles = 0
    for (let i = 0; i < 34; i++) {
      if (i < 27 && Math.floor(i / 9) === suit) continue
      badTiles += counts[i]
    }
    const filtered = new Array(34).fill(0)
    for (let i = suit * 9; i < suit * 9 + 9; i++) filtered[i] = counts[i]
    const filteredShanten = calculateShanten([...filtered])
    return {
      name: `Full Flush (${suitNames[suit]})`,
      japanese: 'Chinitsu',
      distance: Math.max(filteredShanten, badTiles),
      han: isOpen ? 5 : 6,
    }
  })
}

// Ittsu: pure straight (123, 456, 789 in one suit)
function ittsuDistance(counts: HandCounts, shanten: number, isOpen: boolean = false): YakuInfo {
  let bestDist = 13
  for (let suit = 0; suit < 3; suit++) {
    const base = suit * 9
    let missing = 0
    // Check 1-2-3
    for (let i = 0; i < 3; i++) if (counts[base + i] === 0) missing++
    // Check 4-5-6
    for (let i = 3; i < 6; i++) if (counts[base + i] === 0) missing++
    // Check 7-8-9
    for (let i = 6; i < 9; i++) if (counts[base + i] === 0) missing++
    bestDist = Math.min(bestDist, missing)
  }
  return {
    name: 'Pure Straight',
    japanese: 'Ikkitsuu',
    distance: Math.max(shanten, bestDist),
    han: isOpen ? 1 : 2,
  }
}

// Chanta: every group contains a terminal or honor
function chantaDistance(counts: HandCounts, shanten: number, isOpen: boolean = false): YakuInfo {
  let simpleTiles = 0
  for (let i = 0; i < 27; i++) {
    if (isSimple(i)) simpleTiles += counts[i]
  }
  // Rough heuristic: count tiles that are neither terminal nor honor
  // These would need to be part of sequences containing terminals (like 1-2-3 or 7-8-9)
  // Tiles 2-6 in each suit are only useful in 1-2-3 or 7-8-9 sequences
  let badSimples = 0
  for (let suit = 0; suit < 3; suit++) {
    const base = suit * 9
    // Tiles at positions 3,4,5 (numbers 4,5,6) can't be in terminal sequences
    for (let i = 3; i <= 5; i++) {
      badSimples += counts[base + i]
    }
  }
  return {
    name: 'Outside Hand',
    japanese: 'Chanta',
    distance: Math.max(shanten, badSimples),
    han: isOpen ? 1 : 2,
  }
}

// Analyze all possible discards for a 13-tile hand
export function analyzeDiscards(
  hand: TileId[],
  counts: HandCounts,
  wall: TileId[],
): DiscardAnalysis[] {
  const currentShanten = calculateShanten([...counts])
  const currentYaku = analyzeYaku([...counts])
  const results: DiscardAnalysis[] = []
  const seen = new Set<string>()

  for (let idx = 0; idx < hand.length; idx++) {
    const tile = hand[idx]
    const key = `${tile}`
    if (seen.has(key)) continue // skip duplicate tiles
    seen.add(key)

    // Remove tile
    const newCounts = [...counts]
    newCounts[tile]--

    // Calculate shanten of 12-tile hand (effectively, how good is this discard?)
    // Use acceptance as a quality metric
    const acceptance = calculateAcceptance(newCounts)

    // Calculate best possible shanten after drawing any improving tile
    let bestShantenAfterDraw = 8
    for (let draw = 0; draw < 34; draw++) {
      if (newCounts[draw] >= 4) continue
      newCounts[draw]++
      bestShantenAfterDraw = Math.min(bestShantenAfterDraw, calculateShanten([...newCounts]))
      newCounts[draw]--
    }

    // Yaku distance changes
    newCounts[tile]-- // temporarily remove for 12-tile yaku analysis
    // We need 13 tiles for proper yaku analysis, so add back and just compare
    newCounts[tile]++
    const afterYaku = analyzeYaku([...newCounts])
    newCounts[tile]-- // restore
    newCounts[tile]++ // final restore

    const yakuChanges = currentYaku.map(cy => {
      const ay = afterYaku.find(a => a.japanese === cy.japanese && a.name === cy.name)
      return {
        name: `${cy.japanese} (${cy.name})`,
        change: ay ? cy.distance - ay.distance : 0,
      }
    }).filter(c => c.change !== 0)

    results.push({
      tileIndex: idx,
      tile,
      shantenAfter: bestShantenAfterDraw,
      acceptance: acceptance.count,
      yakuChanges,
    })
  }

  return results.sort((a, b) => {
    // Sort by: lower shanten first, then higher acceptance
    if (a.shantenAfter !== b.shantenAfter) return a.shantenAfter - b.shantenAfter
    return b.acceptance - a.acceptance
  })
}
