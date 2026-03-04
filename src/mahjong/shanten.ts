import { HandCounts, TERMINALS_AND_HONORS } from './types'

// Calculate standard shanten (4 mentsu + 1 jantai form)
function standardShanten(counts: HandCounts): number {
  let bestScore = 0

  // Try with head (pair as jantai)
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) {
      counts[i] -= 2
      const score = extractGroups(counts, 0, 0, 0)
      bestScore = Math.max(bestScore, score + 1) // +1 for head
      counts[i] += 2
    }
  }

  // Try without head
  bestScore = Math.max(bestScore, extractGroups(counts, 0, 0, 0))

  return 8 - bestScore
}

// Recursively extract mentsu and taatsu, return max score (2*mentsu + taatsu)
function extractGroups(
  counts: HandCounts,
  pos: number,
  mentsu: number,
  taatsu: number,
  maxMentsu: number = 4,
): number {
  // Skip empty
  while (pos < 34 && counts[pos] === 0) pos++
  if (pos >= 34) {
    const t = Math.min(taatsu, maxMentsu - mentsu)
    return 2 * mentsu + t
  }

  let best = extractGroups(counts, pos + 1, mentsu, taatsu, maxMentsu) // skip

  // Triplet (mentsu)
  if (counts[pos] >= 3) {
    counts[pos] -= 3
    best = Math.max(best, extractGroups(counts, pos, mentsu + 1, taatsu, maxMentsu))
    counts[pos] += 3
  }

  // Sequence (mentsu) - number tiles only
  if (pos < 27 && pos % 9 <= 6 && counts[pos + 1] >= 1 && counts[pos + 2] >= 1) {
    counts[pos]--; counts[pos + 1]--; counts[pos + 2]--
    best = Math.max(best, extractGroups(counts, pos, mentsu + 1, taatsu, maxMentsu))
    counts[pos]++; counts[pos + 1]++; counts[pos + 2]++
  }

  // Pair (taatsu)
  if (counts[pos] >= 2) {
    counts[pos] -= 2
    best = Math.max(best, extractGroups(counts, pos, mentsu, taatsu + 1, maxMentsu))
    counts[pos] += 2
  }

  // Adjacent wait, e.g. 12 (taatsu) - number tiles only
  if (pos < 27 && pos % 9 <= 7 && counts[pos + 1] >= 1) {
    counts[pos]--; counts[pos + 1]--
    best = Math.max(best, extractGroups(counts, pos, mentsu, taatsu + 1, maxMentsu))
    counts[pos]++; counts[pos + 1]++
  }

  // Kanchan wait, e.g. 13 (taatsu) - number tiles only
  if (pos < 27 && pos % 9 <= 6 && counts[pos + 2] >= 1) {
    counts[pos]--; counts[pos + 2]--
    best = Math.max(best, extractGroups(counts, pos, mentsu, taatsu + 1, maxMentsu))
    counts[pos]++; counts[pos + 2]++
  }

  return best
}

// Chiitoi (seven pairs) shanten
function chiitoiShanten(counts: HandCounts): number {
  let pairs = 0
  let types = 0
  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 2) pairs++
    if (counts[i] >= 1) types++
  }
  // Need 7 different pairs; if fewer than 7 types, some pairs must come from new tiles
  const missing = 7 - types
  return 6 - pairs + (missing > 0 ? missing : 0)
}

// Kokushi (thirteen orphans) shanten
function kokushiShanten(counts: HandCounts): number {
  let unique = 0
  let hasPair = false
  for (const t of TERMINALS_AND_HONORS) {
    if (counts[t] >= 1) unique++
    if (counts[t] >= 2) hasPair = true
  }
  return 13 - unique - (hasPair ? 1 : 0)
}

// Main shanten calculator - returns minimum across all forms
export function calculateShanten(counts: HandCounts): number {
  const c = [...counts] // work on a copy
  const std = standardShanten(c)
  const chi = chiitoiShanten(counts)
  const kok = kokushiShanten(counts)
  return Math.min(std, chi, kok)
}

// Calculate shanten for standard form only (used by yaku analysis)
export function calculateStandardShanten(counts: HandCounts): number {
  const c = [...counts]
  return standardShanten(c)
}

// Calculate acceptance count: how many distinct tile types improve shanten if drawn
export function calculateAcceptance(counts: HandCounts): {
  count: number
  tiles: number[]
} {
  const currentShanten = calculateShanten(counts)
  const tiles: number[] = []
  const totalTiles = counts.reduce((a, b) => a + b, 0)

  // Can only draw if we have < 14 tiles (13-tile hand ready to draw)
  if (totalTiles > 13) return { count: 0, tiles: [] }

  for (let i = 0; i < 34; i++) {
    if (counts[i] >= 4) continue // no more of this tile available
    counts[i]++
    const newShanten = calculateShanten(counts)
    if (newShanten < currentShanten) {
      tiles.push(i)
    }
    counts[i]--
  }

  return { count: tiles.length, tiles }
}

// Calculate shanten accounting for open melds
// With N open melds, we need (4-N) more mentsu from the closed hand + 1 pair
export function calculateShantenWithMelds(closedCounts: HandCounts, numOpenMelds: number): number {
  if (numOpenMelds === 0) return calculateShanten(closedCounts)

  // With open melds, chiitoi and kokushi are impossible
  const c = [...closedCounts]
  const maxMentsu = 4 - numOpenMelds
  const target = 8 - 2 * numOpenMelds // each open meld contributes 2 to score

  let bestScore = 0

  // Try with head (pair)
  for (let i = 0; i < 34; i++) {
    if (c[i] >= 2) {
      c[i] -= 2
      const score = extractGroups(c, 0, 0, 0, maxMentsu)
      bestScore = Math.max(bestScore, score + 1) // +1 for head
      c[i] += 2
    }
  }

  // Try without head
  bestScore = Math.max(bestScore, extractGroups(c, 0, 0, 0, maxMentsu))

  return target - bestScore
}
