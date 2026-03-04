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
  const candidates: (ScoreResult | null)[] = []

  // Kokushi (closed, 14 tiles, no open melds at all)
  if (isClosed && closedHand.length === 14 && openMelds.length === 0) {
    candidates.push(scoreKokushi(closedHand, params))
  }

  // Chiitoitsu (closed, 14 tiles, 7 pairs)
  if (isClosed && closedHand.length === 14) {
    const counts = handToCountArray(closedHand)
    let pairs = 0
    for (let i = 0; i < 34; i++) {
      if (counts[i] === 2) pairs++
    }
    if (pairs === 7) {
      candidates.push(scoreChiitoitsu(closedHand, params))
    }
  }

  // Standard decomposition (always try)
  candidates.push(scoreStandardDecomposition(closedHand, openMelds, params))

  // Return best result by points, then han
  return candidates
    .filter((r): r is ScoreResult => r !== null)
    .sort((a, b) => b.totalPoints - a.totalPoints || b.totalHan - a.totalHan)
    [0] || null
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

  // Honroutou (all terminals and honors)
  {
    let allTermHonor = true
    for (let i = 0; i < 34; i++) {
      if (counts[i] > 0 && !isTerminal(i) && !isHonor(i)) { allTermHonor = false; break }
    }
    if (allTermHonor) {
      yaku.push({ name: 'All Terminals & Honors', japanese: 'Honroutou', han: 2, open: false })
    }
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

  // Riichi / Double Riichi
  if (params.isRiichi) {
    if (params.isDoubleRiichi) {
      yaku.push({ name: 'Double Riichi', japanese: 'Double Riichi', han: 2, open: false })
    } else {
      yaku.push({ name: 'Riichi', japanese: 'Riichi', han: 1, open: false })
    }
    if (params.isIppatsu) {
      yaku.push({ name: 'One-Shot', japanese: 'Ippatsu', han: 1, open: false })
    }
  }

  // Haitei Raoyue / Houtei Raoyui
  if (params.isTsumo && params.isHaitei) {
    yaku.push({ name: 'Last Tile Draw', japanese: 'Haitei Raoyue', han: 1, open: false })
  }
  if (!params.isTsumo && params.isHaitei) {
    yaku.push({ name: 'Last Tile Discard', japanese: 'Houtei Raoyui', han: 1, open: false })
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

// --- Kokushi scoring ---

function scoreKokushi(closedHand: TileId[], params: ScoreParams): ScoreResult | null {
  if (closedHand.length !== 14) return null
  const counts = handToCountArray(closedHand)
  const required = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33] // 13 terminal/honor types
  let hasPair = false
  for (const t of required) {
    if (counts[t] === 0) return null
    if (counts[t] === 2) hasPair = true
  }
  if (!hasPair) return null

  const yaku: ScoreYaku[] = [
    { name: 'Thirteen Orphans', japanese: 'Kokushi Musou', han: 13, open: false }
  ]
  const totalHan = 13
  const fu = 30 // doesn't matter at yakuman level
  const { base, limit } = calculateBasePoints(totalHan, fu)
  const payments = calculatePayments(base, params.isDealer, params.isTsumo)

  return {
    yaku, totalHan, fu, basePoints: base,
    dealerTsumoEach: payments.dealerTsumoEach,
    limitName: limit, waitType: 'tanki',
    isClosed: true, isTsumo: params.isTsumo,
    isDealer: params.isDealer, totalPoints: payments.totalPoints,
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

  // Riichi / Double Riichi
  if (params.isRiichi && isClosed) {
    if (params.isDoubleRiichi) {
      yaku.push({ name: 'Double Riichi', japanese: 'Double Riichi', han: 2, open: false })
    } else {
      yaku.push({ name: 'Riichi', japanese: 'Riichi', han: 1, open: false })
    }
    // Ippatsu (win within first go-around after riichi)
    if (params.isIppatsu) {
      yaku.push({ name: 'One-Shot', japanese: 'Ippatsu', han: 1, open: false })
    }
  }

  // Rinshan Kaihou (win on kan replacement draw)
  if (params.isTsumo && params.isRinshan) {
    yaku.push({ name: 'After a Kan', japanese: 'Rinshan Kaihou', han: 1, open: !isClosed })
  }

  // Haitei Raoyue (last tile draw — tsumo, not rinshan)
  if (params.isTsumo && params.isHaitei && !params.isRinshan) {
    yaku.push({ name: 'Last Tile Draw', japanese: 'Haitei Raoyue', han: 1, open: !isClosed })
  }

  // Houtei Raoyui (last tile discard — ron)
  if (!params.isTsumo && params.isHaitei) {
    yaku.push({ name: 'Last Tile Discard', japanese: 'Houtei Raoyui', han: 1, open: !isClosed })
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

  // Iipeiko / Ryanpeiko (identical sequences, closed only)
  if (isClosed) {
    const seqs = mentsu
      .filter(m => m.type === 'shuntsu' && !m.isOpen)
      .map(m => m.tiles[0])
    const seqCounts: Record<number, number> = {}
    for (const s of seqs) seqCounts[s] = (seqCounts[s] || 0) + 1
    const pairsOfSeqs = Object.values(seqCounts).filter(c => c >= 2).length
    if (pairsOfSeqs >= 2) {
      yaku.push({ name: 'Twice Double Sequence', japanese: 'Ryanpeiko', han: 3, open: false })
    } else if (pairsOfSeqs === 1) {
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

  // Junchan / Chanta (every group has terminal/honor)
  {
    const allGroupsHaveTermOrHonor = mentsu.every(m =>
      m.tiles.some(t => isTerminal(t) || isHonor(t))
    ) && (isTerminal(pair) || isHonor(pair))
    if (allGroupsHaveTermOrHonor) {
      const hasSequence = mentsu.some(m => m.type === 'shuntsu')
      if (hasSequence) {
        const hasHonors = allTiles.some(t => isHonor(t))
        if (!hasHonors) {
          // Junchan: terminals only, no honors (higher value)
          yaku.push({ name: 'Terminals in All Groups', japanese: 'Junchan', han: isClosed ? 3 : 2, open: !isClosed })
        } else {
          // Chanta: terminals + honors
          yaku.push({ name: 'Outside Hand', japanese: 'Chanta', han: isClosed ? 2 : 1, open: !isClosed })
        }
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

  // Sanshoku Doujun (same sequence in all 3 suits)
  {
    const seqStarts = mentsu.filter(m => m.type === 'shuntsu').map(m => m.tiles[0])
    for (const start of seqStarts) {
      const rank = start % 9
      if (seqStarts.includes(rank) && seqStarts.includes(9 + rank) && seqStarts.includes(18 + rank)) {
        yaku.push({ name: 'Mixed Triple Sequence', japanese: 'Sanshoku Doujun', han: isClosed ? 2 : 1, open: !isClosed })
        break
      }
    }
  }

  // Sanshoku Doukou (same triplet in all 3 suits)
  {
    const tripTiles = mentsu.filter(m => m.type === 'koutsu' && m.tiles[0] < 27).map(m => m.tiles[0])
    for (const t of tripTiles) {
      const rank = t % 9
      if (tripTiles.includes(rank) && tripTiles.includes(9 + rank) && tripTiles.includes(18 + rank)) {
        yaku.push({ name: 'Triple Triplets', japanese: 'Sanshoku Doukou', han: 2, open: !isClosed })
        break
      }
    }
  }

  // Sanankou (3 concealed triplets)
  {
    let concealedKoutsu = mentsu.filter(m => m.type === 'koutsu' && !m.isOpen).length
    // Ron on shanpon: the winning triplet is considered open
    if (!params.isTsumo && waitType === 'shanpon') concealedKoutsu--
    if (concealedKoutsu >= 3) {
      yaku.push({ name: 'Three Concealed Triplets', japanese: 'Sanankou', han: 2, open: !isClosed })
    }
  }

  // Honroutou (all terminals and honors)
  if (allTiles.every(t => isTerminal(t) || isHonor(t))) {
    yaku.push({ name: 'All Terminals & Honors', japanese: 'Honroutou', han: 2, open: !isClosed })
  }

  // Shousangen (2 dragon triplets + dragon pair)
  {
    const dragonKoutsu = mentsu.filter(m => m.type === 'koutsu' && m.tiles[0] >= 31).length
    if (dragonKoutsu === 2 && pair >= 31) {
      yaku.push({ name: 'Little Three Dragons', japanese: 'Shousangen', han: 2, open: !isClosed })
    }
  }

  // San Kantsu (3 kans)
  if (mentsu.filter(m => m.isKan).length === 3) {
    yaku.push({ name: 'Three Kans', japanese: 'San Kantsu', han: 2, open: !isClosed })
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

  // --- Yakuman ---

  // Suuankou (4 concealed triplets)
  {
    let ck = mentsu.filter(m => m.type === 'koutsu' && !m.isOpen).length
    if (!params.isTsumo && waitType === 'shanpon') ck--
    if (ck === 4) {
      yaku.push({ name: 'Four Concealed Triplets', japanese: 'Suuankou', han: 13, open: false })
    }
  }

  // Daisangen (3 dragon triplets)
  if (mentsu.filter(m => m.type === 'koutsu' && m.tiles[0] >= 31).length === 3) {
    yaku.push({ name: 'Big Three Dragons', japanese: 'Daisangen', han: 13, open: !isClosed })
  }

  // Shousuushii / Daisuushii (wind triplets)
  {
    const windKoutsu = mentsu.filter(m => m.type === 'koutsu' && m.tiles[0] >= 27 && m.tiles[0] <= 30).length
    if (windKoutsu === 4) {
      yaku.push({ name: 'Big Four Winds', japanese: 'Daisuushii', han: 13, open: !isClosed })
    } else if (windKoutsu === 3 && pair >= 27 && pair <= 30) {
      yaku.push({ name: 'Little Four Winds', japanese: 'Shousuushii', han: 13, open: !isClosed })
    }
  }

  // Tsuuiisou (all honors)
  if (allTiles.every(t => isHonor(t))) {
    yaku.push({ name: 'All Honors', japanese: 'Tsuuiisou', han: 13, open: !isClosed })
  }

  // Chinroutou (all terminals)
  if (allTiles.every(t => isTerminal(t))) {
    yaku.push({ name: 'All Terminals', japanese: 'Chinroutou', han: 13, open: !isClosed })
  }

  // Ryuuiisou (all green: 2s,3s,4s,6s,8s,Hatsu)
  {
    const greenTiles = new Set([19, 20, 21, 23, 25, 32])
    if (allTiles.every(t => greenTiles.has(t))) {
      yaku.push({ name: 'All Green', japanese: 'Ryuuiisou', han: 13, open: !isClosed })
    }
  }

  // Chuuren Poutou (nine gates: 1112345678999 of one suit, closed)
  if (isClosed) {
    for (let suit = 0; suit < 3; suit++) {
      const base = suit * 9
      let allOneSuit = true
      for (let i = 0; i < 34; i++) {
        if (counts[i] > 0 && (i < base || i > base + 8)) { allOneSuit = false; break }
      }
      if (!allOneSuit) continue
      const pattern = [3, 1, 1, 1, 1, 1, 1, 1, 3]
      let matches = true
      for (let i = 0; i < 9; i++) {
        if (counts[base + i] < pattern[i]) { matches = false; break }
      }
      if (matches) {
        yaku.push({ name: 'Nine Gates', japanese: 'Chuuren Poutou', han: 13, open: false })
      }
    }
  }

  // Suu Kantsu (4 kans)
  if (mentsu.filter(m => m.isKan).length === 4) {
    yaku.push({ name: 'Four Kans', japanese: 'Suu Kantsu', han: 13, open: !isClosed })
  }

  // Yakuman override: if any yakuman detected, drop all non-yakuman yaku
  const yakumanYaku = yaku.filter(y => y.han >= 13)
  if (yakumanYaku.length > 0) return yakumanYaku

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
