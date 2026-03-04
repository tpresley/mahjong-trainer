import { TileId, HandCounts, OpenMeld, ScoreResult, ScoreParams, WaitType, ScoreYaku } from './types'
import { handToCountArray, isTerminal, isHonor, isSimple, tileSuit, tileNumber, sortHand } from './tiles'

// --- Internal types ---

type MentsuType = 'shuntsu' | 'koutsu'

type Mentsu = {
  type: MentsuType
  tiles: TileId[]   // 3 tiles
  isOpen: boolean
  isKan: boolean    // true for kan melds (affects fu calculation)
}

type HandDecomposition = {
  mentsu: Mentsu[]
  pair: TileId
  waitType: WaitType
}

// --- Main scoring function ---

export function calculateScore(
  closedHand: TileId[],
  openMelds: OpenMeld[],
  params: ScoreParams,
): ScoreResult | null {
  const isClosed = openMelds.length === 0 || openMelds.every(m => m.type === 'ankan')
  const allTiles = [...closedHand]

  // Check for chiitoitsu (seven pairs) — special case, closed only
  if (isClosed && closedHand.length === 14) {
    const counts = handToCountArray(closedHand)
    let pairs = 0
    for (let i = 0; i < 34; i++) {
      if (counts[i] === 2) pairs++
    }
    if (pairs === 7) {
      const chiitoiResult = scoreChiitoitsu(closedHand, params)
      // Still try standard decomposition and pick the better one
      const standardResult = scoreStandardDecomposition(closedHand, openMelds, params)
      if (!standardResult) return chiitoiResult
      if (!chiitoiResult) return standardResult
      return chiitoiResult.totalPoints >= standardResult.totalPoints ? chiitoiResult : standardResult
    }
  }

  return scoreStandardDecomposition(closedHand, openMelds, params)
}

// --- Chiitoitsu scoring ---

function scoreChiitoitsu(closedHand: TileId[], params: ScoreParams): ScoreResult | null {
  const counts = handToCountArray(closedHand)
  const isClosed = true
  const yaku: ScoreYaku[] = []

  // Chiitoitsu itself
  yaku.push({ name: 'Seven Pairs', japanese: 'Chiitoitsu', han: 2, open: false })

  // Menzen Tsumo
  if (params.isTsumo) {
    yaku.push({ name: 'Self Draw', japanese: 'Menzen Tsumo', han: 1, open: false })
  }

  // Tanyao check
  let allSimple = true
  for (let i = 0; i < 34; i++) {
    if (counts[i] > 0 && !isSimple(i)) { allSimple = false; break }
  }
  if (allSimple) {
    yaku.push({ name: 'All Simples', japanese: 'Tanyao', han: 1, open: false })
  }

  // Honitsu check
  for (let suit = 0; suit < 3; suit++) {
    let onlySuitAndHonors = true
    for (let i = 0; i < 27; i++) {
      if (Math.floor(i / 9) !== suit && counts[i] > 0) { onlySuitAndHonors = false; break }
    }
    if (onlySuitAndHonors) {
      let hasHonors = false
      for (let i = 27; i < 34; i++) if (counts[i] > 0) hasHonors = true
      if (hasHonors) {
        yaku.push({ name: 'Half Flush', japanese: 'Honitsu', han: 3, open: false })
      } else {
        yaku.push({ name: 'Full Flush', japanese: 'Chinitsu', han: 6, open: false })
      }
      break
    }
  }

  // Riichi (future)
  if (params.isRiichi) {
    yaku.push({ name: 'Riichi', japanese: 'Riichi', han: 1, open: false })
  }

  if (yaku.length === 0) return null

  const totalHan = yaku.reduce((s, y) => s + y.han, 0)
  const fu = 25 // Chiitoitsu is always 25 fu
  const { base, limit } = calculateBasePoints(totalHan, fu)
  const payments = calculatePayments(base, params.isDealer, params.isTsumo)

  return {
    yaku,
    totalHan,
    fu,
    basePoints: base,
    dealerTsumoEach: payments.dealerTsumoEach,
    limitName: limit,
    waitType: 'tanki',
    isClosed,
    isTsumo: params.isTsumo,
    isDealer: params.isDealer,
    totalPoints: payments.totalPoints,
  }
}

// --- Standard decomposition scoring ---

function scoreStandardDecomposition(
  closedHand: TileId[],
  openMelds: OpenMeld[],
  params: ScoreParams,
): ScoreResult | null {
  // Ankan doesn't break closed status
  const isClosed = openMelds.length === 0 || openMelds.every(m => m.type === 'ankan')
  const closedCounts = handToCountArray(closedHand)

  // Find all decompositions of the closed hand
  const numClosedMentsu = 4 - openMelds.length
  const decompositions = findDecompositions(closedCounts, numClosedMentsu, params.winTile)

  if (decompositions.length === 0) return null

  let bestResult: ScoreResult | null = null

  for (const decomp of decompositions) {
    const allMentsu: Mentsu[] = [
      ...decomp.mentsu,
      ...openMelds.map(meldToMentsu),
    ]

    const yaku = identifyYaku(allMentsu, decomp.pair, isClosed, params, decomp.waitType)
    if (yaku.length === 0) continue

    const totalHan = yaku.reduce((s, y) => s + y.han, 0)
    const fu = calculateFu(allMentsu, decomp.pair, decomp.waitType, isClosed, params)
    const { base, limit } = calculateBasePoints(totalHan, fu)
    const payments = calculatePayments(base, params.isDealer, params.isTsumo)

    const result: ScoreResult = {
      yaku,
      totalHan,
      fu,
      basePoints: base,
      dealerTsumoEach: payments.dealerTsumoEach,
      limitName: limit,
      waitType: decomp.waitType,
      isClosed,
      isTsumo: params.isTsumo,
      isDealer: params.isDealer,
      totalPoints: payments.totalPoints,
    }

    if (!bestResult || result.totalPoints > bestResult.totalPoints ||
        (result.totalPoints === bestResult.totalPoints && result.totalHan > bestResult.totalHan)) {
      bestResult = result
    }
  }

  return bestResult
}

// --- Hand decomposition ---

function findDecompositions(
  counts: HandCounts,
  targetMentsu: number,
  winTile: TileId,
): HandDecomposition[] {
  const results: HandDecomposition[] = []

  // Try each tile as the pair
  for (let pair = 0; pair < 34; pair++) {
    if (counts[pair] < 2) continue

    counts[pair] -= 2
    const mentsuList: Mentsu[][] = []
    extractAllMentsu(counts, 0, [], targetMentsu, mentsuList)
    counts[pair] += 2

    for (const mentsu of mentsuList) {
      const waitType = determineWaitType(mentsu, pair, winTile)
      results.push({ mentsu, pair, waitType })
    }
  }

  return results
}

function extractAllMentsu(
  counts: HandCounts,
  pos: number,
  current: Mentsu[],
  target: number,
  results: Mentsu[][],
): void {
  if (current.length === target) {
    // Verify all counts are 0
    if (counts.every(c => c === 0)) {
      results.push([...current])
    }
    return
  }

  // Skip empty
  while (pos < 34 && counts[pos] === 0) pos++
  if (pos >= 34) return

  // Try triplet
  if (counts[pos] >= 3) {
    counts[pos] -= 3
    current.push({ type: 'koutsu', tiles: [pos, pos, pos], isOpen: false, isKan: false })
    extractAllMentsu(counts, pos, current, target, results)
    current.pop()
    counts[pos] += 3
  }

  // Try sequence (number tiles only)
  if (pos < 27 && pos % 9 <= 6 && counts[pos + 1] >= 1 && counts[pos + 2] >= 1) {
    counts[pos]--; counts[pos + 1]--; counts[pos + 2]--
    current.push({ type: 'shuntsu', tiles: [pos, pos + 1, pos + 2], isOpen: false, isKan: false })
    extractAllMentsu(counts, pos, current, target, results)
    current.pop()
    counts[pos]++; counts[pos + 1]++; counts[pos + 2]++
  }
}

function determineWaitType(mentsu: Mentsu[], pair: TileId, winTile: TileId): WaitType {
  // Check if the win tile completed the pair (tanki)
  if (winTile === pair) {
    // Could be tanki OR shanpon; check if any koutsu also contains the win tile
    const inKoutsu = mentsu.some(m => m.type === 'koutsu' && m.tiles[0] === winTile)
    if (!inKoutsu) return 'tanki'
    // If also in a koutsu, it could be shanpon
  }

  // Check mentsu containing the win tile
  for (const m of mentsu) {
    if (m.type === 'koutsu' && m.tiles[0] === winTile) {
      return 'shanpon'
    }
    if (m.type === 'shuntsu' && m.tiles.includes(winTile)) {
      const idx = m.tiles.indexOf(winTile)
      const num = tileNumber(winTile)
      if (idx === 1) return 'kanchan' // middle tile: kanchan
      if (idx === 0 && num === 7) return 'penchan' // 7-8-9, waiting on 7
      if (idx === 2 && num === 3) return 'penchan' // 1-2-3, waiting on 3
      return 'ryanmen' // two-sided wait
    }
  }

  return 'tanki' // fallback
}

// --- Yaku identification ---

function identifyYaku(
  mentsu: Mentsu[],
  pair: TileId,
  isClosed: boolean,
  params: ScoreParams,
  waitType: WaitType,
): ScoreYaku[] {
  const yaku: ScoreYaku[] = []
  const allTilesInMentsu = mentsu.flatMap(m => m.tiles)
  const allTiles = [...allTilesInMentsu, pair, pair]
  const counts = handToCountArray(allTiles)

  // Menzen Tsumo (closed hand, self-draw)
  if (isClosed && params.isTsumo) {
    yaku.push({ name: 'Self Draw', japanese: 'Menzen Tsumo', han: 1, open: false })
  }

  // Riichi (future)
  if (params.isRiichi && isClosed) {
    yaku.push({ name: 'Riichi', japanese: 'Riichi', han: 1, open: false })
  }

  // Rinshan Kaihou (win on kan replacement draw)
  if (params.isTsumo && params.isRinshan) {
    yaku.push({ name: 'After a Kan', japanese: 'Rinshan Kaihou', han: 1, open: !isClosed })
  }

  // Tanyao (all simples)
  if (allTiles.every(t => isSimple(t))) {
    yaku.push({ name: 'All Simples', japanese: 'Tanyao', han: 1, open: !isClosed })
  }

  // Pinfu (all sequences, valueless pair, ryanmen wait, closed)
  if (isClosed) {
    const allSequences = mentsu.every(m => m.type === 'shuntsu')
    const valuelessPair = !isValueTile(pair, params)
    if (allSequences && valuelessPair && waitType === 'ryanmen') {
      yaku.push({ name: 'Pinfu', japanese: 'Pinfu', han: 1, open: false })
    }
  }

  // Iipeiko (two identical sequences, closed)
  if (isClosed) {
    const seqKeys = mentsu
      .filter(m => m.type === 'shuntsu')
      .map(m => m.tiles.join(','))
    const seqSet = new Set(seqKeys)
    if (seqKeys.length > seqSet.size) {
      yaku.push({ name: 'Double Sequence', japanese: 'Iipeiko', han: 1, open: false })
    }
  }

  // Yakuhai (value triplets)
  for (const m of mentsu) {
    if (m.type !== 'koutsu') continue
    const t = m.tiles[0]
    // Dragons
    if (t >= 31 && t <= 33) {
      const names: Record<number, string> = { 31: 'Haku', 32: 'Hatsu', 33: 'Chun' }
      yaku.push({ name: `Value Tiles (${names[t]})`, japanese: 'Yakuhai', han: 1, open: !isClosed })
    }
    // Seat wind
    if (t === params.seatWind) {
      yaku.push({ name: 'Seat Wind', japanese: 'Yakuhai', han: 1, open: !isClosed })
    }
    // Round wind (avoid double-counting if seat === round)
    if (t === params.roundWind && t !== params.seatWind) {
      yaku.push({ name: 'Round Wind', japanese: 'Yakuhai', han: 1, open: !isClosed })
    }
  }

  // Toitoi (all triplets)
  if (mentsu.every(m => m.type === 'koutsu')) {
    yaku.push({ name: 'All Triplets', japanese: 'Toitoi', han: 2, open: !isClosed })
  }

  // Chanta (every group has terminal/honor)
  {
    const chanta = mentsu.every(m => {
      return m.tiles.some(t => isTerminal(t) || isHonor(t))
    }) && (isTerminal(pair) || isHonor(pair))
    if (chanta) {
      // Check if there are both number tiles and honors (otherwise it might be junchan or honroutou)
      const hasSequence = mentsu.some(m => m.type === 'shuntsu')
      if (hasSequence) {
        yaku.push({ name: 'Outside Hand', japanese: 'Chanta', han: isClosed ? 2 : 1, open: !isClosed })
      }
    }
  }

  // Ikkitsuu (pure straight: 123+456+789 in one suit)
  for (let suit = 0; suit < 3; suit++) {
    const base = suit * 9
    const sequences = mentsu
      .filter(m => m.type === 'shuntsu')
      .map(m => m.tiles[0])
    if (sequences.includes(base) && sequences.includes(base + 3) && sequences.includes(base + 6)) {
      yaku.push({ name: 'Pure Straight', japanese: 'Ikkitsuu', han: isClosed ? 2 : 1, open: !isClosed })
      break
    }
  }

  // Honitsu (half flush: one suit + honors)
  for (let suit = 0; suit < 3; suit++) {
    let onlySuitAndHonors = true
    for (let i = 0; i < 27; i++) {
      if (Math.floor(i / 9) !== suit && counts[i] > 0) {
        onlySuitAndHonors = false
        break
      }
    }
    if (onlySuitAndHonors) {
      let hasHonors = false
      let hasSuit = false
      for (let i = 27; i < 34; i++) if (counts[i] > 0) hasHonors = true
      for (let i = suit * 9; i < suit * 9 + 9; i++) if (counts[i] > 0) hasSuit = true
      if (hasHonors && hasSuit) {
        yaku.push({ name: 'Half Flush', japanese: 'Honitsu', han: isClosed ? 3 : 2, open: !isClosed })
      }
      break
    }
  }

  // Chinitsu (full flush: one suit only)
  for (let suit = 0; suit < 3; suit++) {
    let allOneSuit = true
    for (let i = 0; i < 34; i++) {
      if (counts[i] > 0 && (i >= 27 || Math.floor(i / 9) !== suit)) {
        allOneSuit = false
        break
      }
    }
    if (allOneSuit) {
      yaku.push({ name: 'Full Flush', japanese: 'Chinitsu', han: isClosed ? 6 : 5, open: !isClosed })
      break
    }
  }

  return yaku
}

function isValueTile(tile: TileId, params: ScoreParams): boolean {
  if (tile >= 31 && tile <= 33) return true // dragons
  if (tile === params.seatWind) return true
  if (tile === params.roundWind) return true
  return false
}

// --- Fu calculation ---

function calculateFu(
  mentsu: Mentsu[],
  pair: TileId,
  waitType: WaitType,
  isClosed: boolean,
  params: ScoreParams,
): number {
  let fu = 20 // base fu (futei)

  // Closed ron bonus
  if (isClosed && !params.isTsumo) {
    fu += 10
  }

  // Tsumo bonus (except pinfu)
  if (params.isTsumo) {
    fu += 2
  }

  // Mentsu fu
  for (const m of mentsu) {
    if (m.type === 'koutsu') {
      const isTermOrHonor = isTerminal(m.tiles[0]) || isHonor(m.tiles[0])
      if (m.isKan) {
        // Kan fu: 16/32 closed, 8/16 open
        let mfu = isTermOrHonor ? 32 : 16
        if (m.isOpen) mfu = mfu / 2
        fu += mfu
      } else {
        // Regular koutsu fu: 4/8 closed, 2/4 open
        let mfu = isTermOrHonor ? 8 : 4
        if (m.isOpen) mfu = mfu / 2
        fu += mfu
      }
    }
    // Shuntsu: 0 fu
  }

  // Pair fu
  if (isValueTile(pair, params)) {
    fu += 2
  }

  // Wait fu
  if (waitType === 'kanchan' || waitType === 'penchan' || waitType === 'tanki') {
    fu += 2
  }

  // Round up to nearest 10
  return Math.ceil(fu / 10) * 10
}

// --- Point calculation ---

function calculateBasePoints(han: number, fu: number): { base: number; limit: string | null } {
  if (han >= 13) return { base: 8000, limit: 'Yakuman' }
  if (han >= 11) return { base: 6000, limit: 'Sanbaiman' }
  if (han >= 8) return { base: 4000, limit: 'Baiman' }
  if (han >= 6) return { base: 3000, limit: 'Haneman' }
  if (han >= 5) return { base: 2000, limit: 'Mangan' }

  const base = fu * Math.pow(2, han + 2)
  if (base >= 2000) return { base: 2000, limit: 'Mangan' }
  return { base, limit: null }
}

function calculatePayments(base: number, isDealer: boolean, isTsumo: boolean): {
  dealerTsumoEach: number
  totalPoints: number
} {
  if (!isTsumo) {
    // Ron: single discarder pays all
    const ronTotal = isDealer
      ? Math.ceil(base * 6 / 100) * 100
      : Math.ceil(base * 4 / 100) * 100
    return { dealerTsumoEach: 0, totalPoints: ronTotal }
  }
  if (isDealer) {
    // Dealer tsumo: each of 3 non-dealers pays ceil(base * 2 / 100) * 100
    const each = Math.ceil(base * 2 / 100) * 100
    return { dealerTsumoEach: each, totalPoints: each * 3 }
  } else {
    // Non-dealer tsumo: dealer pays ceil(base * 2 / 100) * 100, others pay ceil(base / 100) * 100
    const dealerPays = Math.ceil(base * 2 / 100) * 100
    const otherPays = Math.ceil(base / 100) * 100
    return { dealerTsumoEach: otherPays, totalPoints: dealerPays + otherPays * 2 }
  }
}

// --- Helpers ---

function meldToMentsu(meld: OpenMeld): Mentsu {
  const sorted = sortHand(meld.tiles)

  // Kan melds are always koutsu
  if (meld.type === 'ankan' || meld.type === 'daiminkan' || meld.type === 'shouminkan') {
    return {
      type: 'koutsu',
      tiles: sorted.slice(0, 3), // Use 3 tiles for consistency
      isOpen: meld.type !== 'ankan',
      isKan: true,
    }
  }

  // Pon/chi
  const isSequence = sorted.length === 3 &&
    sorted[0] < 27 &&
    sorted[1] === sorted[0] + 1 &&
    sorted[2] === sorted[0] + 2
  return {
    type: isSequence ? 'shuntsu' : 'koutsu',
    tiles: sorted,
    isOpen: true,
    isKan: false,
  }
}
