import { ABORT } from 'sygnal'
import { TileId, YakuInfo, DiscardAnalysis, OpenMeld, CallOption, SelfKanOption, GamePhase, ScoreResult } from './mahjong/types'
import { dealHand, sortHand, handToCountArray, removeFromHand } from './mahjong/tiles'
import { calculateShanten, calculateShantenWithMelds } from './mahjong/shanten'
import { analyzeYaku, analyzeDiscards } from './mahjong/yaku'
import { detectCallOptions, detectSelfKanOptions } from './mahjong/calls'
import { calculateScore } from './mahjong/scoring'
import { ScoreDisplay } from './components/views/ScoreDisplay'
import { OpponentDiscards } from './components/views/OpponentDiscards'
import { HandSection } from './components/views/HandSection'
import { CallDecisionBanner } from './components/views/CallDecisionBanner'
import { UserDiscards } from './components/views/UserDiscards'
import { AnalysisGrid } from './components/views/AnalysisGrid'

type AppState = {
  hand: TileId[]
  drawnTile: TileId | null
  wall: TileId[]
  discards: TileId[]
  opponentDiscards: TileId[][]
  turnCount: number
  openMelds: OpenMeld[]
  phase: GamePhase
  pendingOpponentDiscard: TileId | null
  callOptions: CallOption[]
  remainingOpponentDiscards: TileId[]
  remainingOpponentIndex: number
  scoreResult: ScoreResult | null
  selfKanOptions: SelfKanOption[]
  isRiichi: boolean
  isTempFuriten: boolean
  declinedRonTiles: TileId[]
  winMethod: 'tsumo' | 'ron' | null
  ronFromOpponent: number | null
  isIppatsu: boolean
  isDoubleRiichi: boolean
  hoveredDiscardIndex: number | null
}

const initial = dealHand()

type WaitTile = { tile: TileId, remaining: number, score: ScoreResult | null }

// Helper: check if static furiten (any waiting tile is in player's discards)
function isStaticFuriten(hand: TileId[], discards: TileId[], openMelds: OpenMeld[]): boolean {
  const counts = handToCountArray(hand)
  const numMelds = openMelds.length
  const sh = numMelds > 0 ? calculateShantenWithMelds(counts, numMelds) : calculateShanten(counts)
  if (sh !== 0) return false

  const discardSet = new Set(discards)

  // Find all waiting tiles
  for (let t = 0; t < 34; t++) {
    if (counts[t] >= 4) continue
    counts[t]++
    const sh2 = numMelds > 0 ? calculateShantenWithMelds(counts, numMelds) : calculateShanten(counts)
    counts[t]--
    if (sh2 === -1 && discardSet.has(t)) return true
  }
  return false
}

function RootComponent({ state }: { state: AppState & {
  shanten: number
  yakuDistances: YakuInfo[]
  discardResults: DiscardAnalysis[]
  fullHand: TileId[]
  waitingTiles: WaitTile[]
  canDeclareRiichi: boolean
  isFuriten: boolean
  riichiValidDiscards: number[]
}}) {
  const hand = state.hand || []
  const drawnTile = state.drawnTile
  const shanten = state.shanten ?? 8
  const yakuDistances = state.yakuDistances || []
  const discardResults = state.discardResults || []
  const discards = state.discards || []
  const opponentDiscards = state.opponentDiscards || [[], [], []]
  const openMelds = state.openMelds || []
  const wallRemaining = (state.wall || []).length
  const phase = state.phase || 'user_discard'
  const callOptions = state.callOptions || []
  const pendingDiscard = state.pendingOpponentDiscard
  const scoreResult = state.scoreResult
  const selfKanOptions = state.selfKanOptions || []
  const isRiichi = state.isRiichi || false
  const canDeclareRiichi = (state as any).canDeclareRiichi || false
  const isFuriten = (state as any).isFuriten || false
  const riichiValidDiscards: number[] = (state as any).riichiValidDiscards || []
  const winMethod = state.winMethod
  const ronFromOpponent = state.ronFromOpponent

  if (!hand.length && phase !== 'hand_complete') {
    return <div className="app"><p>Loading...</p></div>
  }

  // Build lookup: tileId -> discard analysis for tooltips
  const discardLookup = new Map<number, DiscardAnalysis>()
  for (const d of discardResults) {
    discardLookup.set(d.tile, d)
  }

  const shantenLabel = shanten === 0 ? 'Tenpai!' :
    shanten === -1 ? 'Complete!' :
    `${shanten}-shanten`

  const canDiscard = phase === 'user_discard' || phase === 'post_call_discard' || phase === 'riichi_discard'
  const riichiValidSet = new Set(riichiValidDiscards)

  // Compute hand tile counts for opponent discard highlighting
  const fullHand = state.fullHand || hand
  const handCounts = handToCountArray(fullHand)

  // In post_call_discard, the hand itself is the full set to discard from (no drawn tile)
  const handToShow = hand
  const showDrawnTile = (phase === 'user_discard' || phase === 'hand_complete' || phase === 'riichi_discard') && drawnTile !== null && drawnTile !== undefined
  const waitingTiles: WaitTile[] = (state as any).waitingTiles || []

  // Insertion marker: where the drawn tile would sort into the hand
  const tsumoInsertIdx = (phase === 'hand_complete' && drawnTile !== null && drawnTile !== undefined)
    ? handToShow.findIndex((t: TileId) => t > drawnTile!)
    : -2 // sentinel: no marker

  const opponentNames = ['\u5357 South', '\u897F West', '\u5317 North']

  return (
    <div className="app">
      <header className="header">
        <h1>Mahjong Trainer</h1>
        <p className="subtitle">Reach Mahjong Hand Formation</p>
      </header>

      {ScoreDisplay({ phase, scoreResult, winMethod, ronFromOpponent, opponentNames })}

      {OpponentDiscards({ opponentDiscards, phase, pendingDiscard })}

      {HandSection({
        hand: handToShow, drawnTile, shanten, shantenLabel, canDiscard, phase,
        isRiichi, canDeclareRiichi, isFuriten, selfKanOptions, openMelds,
        turnCount: state.turnCount, wallRemaining, discardLookup, riichiValidSet,
        waitingTiles, showDrawnTile, tsumoInsertIdx, winMethod,
      })}

      {CallDecisionBanner({ phase, pendingDiscard, callOptions })}

      {UserDiscards({ discards })}

      {AnalysisGrid({ openMelds, canDiscard, drawnTile, phase })}
    </div>
  )
}

RootComponent.initialState = {
  hand: initial.hand,
  drawnTile: initial.drawnTile,
  wall: initial.wall,
  discards: [],
  opponentDiscards: [[], [], []],
  turnCount: 1,
  openMelds: [],
  phase: 'user_discard' as GamePhase,
  pendingOpponentDiscard: null,
  callOptions: [],
  remainingOpponentDiscards: [],
  remainingOpponentIndex: 0,
  scoreResult: null,
  selfKanOptions: [],
  waitingTiles: [],
  isRiichi: false,
  isTempFuriten: false,
  declinedRonTiles: [],
  winMethod: null,
  ronFromOpponent: null,
  isIppatsu: false,
  isDoubleRiichi: false,
  hoveredDiscardIndex: null,
  canDeclareRiichi: false,
  isFuriten: false,
  riichiValidDiscards: [],
} as AppState

RootComponent.calculated = {
  fullHand: (state: AppState) => {
    if (!state.hand?.length) return []
    if (state.drawnTile !== null && state.drawnTile !== undefined) {
      return [...state.hand, state.drawnTile]
    }
    return state.hand
  },
  shanten: (state: AppState & { fullHand: TileId[] }) => {
    const h = state.fullHand || state.hand
    if (!h?.length) return 8
    const counts = handToCountArray(h)
    const numMelds = (state.openMelds || []).length
    return numMelds > 0
      ? calculateShantenWithMelds(counts, numMelds)
      : calculateShanten(counts)
  },
  yakuDistances: (state: AppState & { fullHand: TileId[] }) => {
    const h = state.fullHand || state.hand
    if (!h?.length) return []
    return analyzeYaku(handToCountArray(h), state.openMelds || [])
  },
  scoreYaku: (state: AppState) => {
    if (!state.scoreResult) return []
    return state.scoreResult.yaku || []
  },
  selfKanOptions: (state: AppState) => {
    if (state.phase !== 'user_discard') return []
    if (state.drawnTile === null || state.drawnTile === undefined) return []
    return detectSelfKanOptions(state.hand, state.drawnTile, state.openMelds || [])
  },
  canDeclareRiichi: (state: AppState) => {
    if (state.phase !== 'user_discard') return false
    if (state.isRiichi) return false
    if (state.drawnTile === null || state.drawnTile === undefined) return false
    // Must be closed hand (only ankan allowed)
    const openMelds = state.openMelds || []
    if (!openMelds.every((m: OpenMeld) => m.type === 'ankan')) return false
    // Need enough wall tiles (3 opponents + 1 self = 4)
    if ((state.wall || []).length < 4) return false
    // Must be tenpai (shanten = 0)
    const fullHand = [...state.hand, state.drawnTile]
    const counts = handToCountArray(fullHand)
    const numMelds = openMelds.length
    const sh = numMelds > 0 ? calculateShantenWithMelds(counts, numMelds) : calculateShanten(counts)
    if (sh !== 0) return false
    // At least one discard must maintain tenpai
    for (let d = 0; d < fullHand.length; d++) {
      const dc = [...counts]
      dc[fullHand[d]]--
      const sh2 = numMelds > 0 ? calculateShantenWithMelds(dc, numMelds) : calculateShanten(dc)
      if (sh2 === 0) return true
    }
    return false
  },
  isFuriten: (state: AppState) => {
    if (state.isTempFuriten) return true
    if (state.isRiichi && (state.declinedRonTiles || []).length > 0) return true
    // Static furiten: compute from 13-tile hand
    const hasDrawn = state.drawnTile !== null && state.drawnTile !== undefined
    const hand13 = hasDrawn ? [...state.hand] : [...(state.hand || [])]
    if (hand13.length === 0) return false
    return isStaticFuriten(hand13, state.discards || [], state.openMelds || [])
  },
  riichiValidDiscards: (state: AppState) => {
    if (state.phase !== 'riichi_discard') return []
    if (state.drawnTile === null || state.drawnTile === undefined) return []
    const fullHand = [...state.hand, state.drawnTile]
    const counts = handToCountArray(fullHand)
    const openMelds = state.openMelds || []
    const numMelds = openMelds.length
    const valid: number[] = []
    for (let d = 0; d < fullHand.length; d++) {
      const dc = [...counts]
      dc[fullHand[d]]--
      const sh = numMelds > 0 ? calculateShantenWithMelds(dc, numMelds) : calculateShanten(dc)
      if (sh === 0) valid.push(d)
    }
    return valid
  },
  waitingTiles: (state: AppState) => {
    if (state.phase === 'hand_complete' || state.phase === 'wall_exhausted') return []

    // Compute fullHand and shanten locally (calculated fields can't see each other's current-cycle values)
    const hasDrawn = state.drawnTile !== null && state.drawnTile !== undefined
    const hand = hasDrawn ? [...state.hand, state.drawnTile!] : state.hand
    if (!hand?.length) return []
    const openMelds = state.openMelds || []
    const numMelds = openMelds.length
    const handCounts = handToCountArray(hand)
    const shanten = numMelds > 0 ? calculateShantenWithMelds(handCounts, numMelds) : calculateShanten(handCounts)
    if (shanten !== 0) return []

    // Count all visible tiles to determine remaining copies
    const visible = new Array(34).fill(0)
    for (const t of hand) visible[t]++
    for (const m of openMelds) for (const t of m.tiles) visible[t]++
    for (const t of (state.discards || [])) visible[t]++
    for (const pile of (state.opponentDiscards || [])) for (const t of pile) visible[t]++

    const waits = new Map<number, { tile: number, remaining: number, score: ScoreResult | null }>()

    if (hasDrawn) {
      // During riichi_discard with a hovered tile, only show waits for that specific discard
      const hoverIdx = state.phase === 'riichi_discard' ? state.hoveredDiscardIndex : null
      // Hand with drawn tile: find tenpai-maintaining discards, then waits for each
      for (let d = 0; d < hand.length; d++) {
        if (hoverIdx !== null && d !== hoverIdx) continue
        const dc = [...handCounts]
        dc[hand[d]]--
        const sh = numMelds > 0 ? calculateShantenWithMelds(dc, numMelds) : calculateShanten(dc)
        if (sh !== 0) continue

        for (let t = 0; t < 34; t++) {
          if (dc[t] >= 4) continue
          const remaining = 4 - visible[t]
          if (remaining <= 0) continue
          dc[t]++
          const sh2 = numMelds > 0 ? calculateShantenWithMelds(dc, numMelds) : calculateShanten(dc)
          dc[t]--
          if (sh2 !== -1) continue

          if (!waits.has(t)) {
            const winHand = removeFromHand([...hand], [hand[d]])
            const isRiichi = state.phase === 'riichi_discard' ? true : (state.isRiichi || false)
            const score = calculateScore([...winHand, t], openMelds, {
              winTile: t, isTsumo: true, isDealer: true,
              seatWind: 27, roundWind: 27, isRiichi, isRinshan: false,
              isIppatsu: false, isHaitei: false, isDoubleRiichi: state.isDoubleRiichi || false,
            })
            waits.set(t, { tile: t, remaining, score })
          }
        }
      }
    } else {
      // Hand without drawn tile: directly find waits
      for (let t = 0; t < 34; t++) {
        if (handCounts[t] >= 4) continue
        const remaining = 4 - visible[t]
        if (remaining <= 0) continue
        const dc = [...handCounts]
        dc[t]++
        const sh = numMelds > 0 ? calculateShantenWithMelds(dc, numMelds) : calculateShanten(dc)
        if (sh !== -1) continue

        const score = calculateScore([...hand, t], openMelds, {
          winTile: t, isTsumo: true, isDealer: true,
          seatWind: 27, roundWind: 27, isRiichi: false, isRinshan: false,
          isIppatsu: false, isHaitei: false, isDoubleRiichi: false,
        })
        waits.set(t, { tile: t, remaining, score })
      }
    }

    return Array.from(waits.values())
  },
  discardResults: (state: AppState & { fullHand: TileId[] }) => {
    const h = state.fullHand || state.hand
    if (!h?.length) return []
    const phase = state.phase || 'user_discard'
    const melds = state.openMelds || []
    // Only show discard analysis when user can discard
    let results: DiscardAnalysis[] = []
    if (phase === 'user_discard' || phase === 'riichi_discard') {
      if (state.drawnTile === null || state.drawnTile === undefined) return []
      results = analyzeDiscards(h, handToCountArray(h), state.wall || [], melds)
    } else if (phase === 'post_call_discard') {
      results = analyzeDiscards(h, handToCountArray(h), state.wall || [], melds)
    }
    // Add isDrawn flag for the DiscardResult collection component
    return results.map((d: DiscardAnalysis) => ({
      ...d,
      isDrawn: d.tile === state.drawnTile,
    }))
  },
}

RootComponent.intent = ({ DOM }: any) => ({
  NEW_HAND: DOM.click('.new-hand-btn'),
  DISCARD_TILE: DOM.click('.discard-target').map((e: any) => {
    const el = e.currentTarget || e.target.closest('.discard-target')
    return el ? parseInt(el.getAttribute('data-index'), 10) : null
  }),
  CALL_PON: DOM.click('.call-pon-btn'),
  CALL_CHI: DOM.click('.call-chi-btn').map((e: any) => {
    const el = e.currentTarget || e.target.closest('.call-chi-btn')
    return el ? parseInt(el.getAttribute('data-combo'), 10) : 0
  }),
  CALL_DAIMINKAN: DOM.click('.call-daiminkan-btn'),
  DECLARE_ANKAN: DOM.click('.ankan-btn').map((e: any) => {
    const el = e.currentTarget || e.target.closest('.ankan-btn')
    return el ? parseInt(el.getAttribute('data-tile'), 10) : null
  }),
  DECLARE_SHOUMINKAN: DOM.click('.shouminkan-btn').map((e: any) => {
    const el = e.currentTarget || e.target.closest('.shouminkan-btn')
    return el ? parseInt(el.getAttribute('data-meld-index'), 10) : null
  }),
  SKIP_CALL: DOM.click('.skip-call-btn'),
  DECLARE_RIICHI: DOM.click('.riichi-btn'),
  CALL_RON: DOM.click('.call-ron-btn'),
  HOVER_DISCARD: DOM.mouseenter('.discard-target').map((e: any) => {
    const el = e.currentTarget || e.target.closest('.discard-target')
    return el ? parseInt(el.getAttribute('data-index'), 10) : null
  }),
  UNHOVER_DISCARD: DOM.mouseleave('.discard-target'),
})

RootComponent.model = {
  NEW_HAND: (state: AppState) => {
    const { hand, drawnTile, wall } = dealHand()
    return {
      ...state,
      hand,
      drawnTile,
      wall,
      discards: [],
      opponentDiscards: [[], [], []],
      turnCount: 1,
      openMelds: [],
      phase: 'user_discard' as GamePhase,
      pendingOpponentDiscard: null,
      callOptions: [],
      remainingOpponentDiscards: [],
      remainingOpponentIndex: 0,
      scoreResult: null,
      selfKanOptions: [],
      isRiichi: false,
      isTempFuriten: false,
      declinedRonTiles: [],
      winMethod: null,
      ronFromOpponent: null,
      isIppatsu: false,
      isDoubleRiichi: false,
      hoveredDiscardIndex: null,
    }
  },

  DISCARD_TILE: (state: AppState, index: number | null, next: any) => {
    if (index === null || isNaN(index)) return ABORT
    const phase = state.phase
    if (phase !== 'user_discard' && phase !== 'post_call_discard' && phase !== 'riichi_discard') return ABORT

    let fullHand: TileId[]
    if (phase === 'user_discard' || phase === 'riichi_discard') {
      if (state.drawnTile === null || state.drawnTile === undefined) return ABORT
      fullHand = [...state.hand, state.drawnTile]
    } else {
      // post_call_discard: hand has the extra tile, no drawnTile
      fullHand = [...state.hand]
    }

    if (index < 0 || index >= fullHand.length) return ABORT

    const discardedTile = fullHand[index]

    // Riichi discard: validate discard maintains tenpai
    if (phase === 'riichi_discard') {
      const dc = handToCountArray(fullHand)
      dc[discardedTile]--
      const openMelds = state.openMelds || []
      const numMelds = openMelds.length
      const sh = numMelds > 0 ? calculateShantenWithMelds(dc, numMelds) : calculateShanten(dc)
      if (sh !== 0) return ABORT
    }

    fullHand.splice(index, 1)
    const newHand = sortHand(fullHand)

    // Trigger opponent discard round
    next('OPPONENT_DISCARD_ROUND', null, 300)

    return {
      ...state,
      hand: newHand,
      drawnTile: null,
      discards: [...state.discards, discardedTile],
      turnCount: state.turnCount + 1,
      phase: 'opponent_turn' as GamePhase,
      pendingOpponentDiscard: null,
      callOptions: [],
      scoreResult: null,
      isRiichi: phase === 'riichi_discard' ? true : state.isRiichi,
      isIppatsu: phase === 'riichi_discard', // Ippatsu active for one go-around after riichi
      isTempFuriten: false, // Reset temp furiten on new turn
      hoveredDiscardIndex: null,
    }
  },

  OPPONENT_DISCARD_ROUND: (state: AppState, _data: any, next: any) => {
    if (state.phase !== 'opponent_turn') return ABORT
    const wall = [...state.wall]

    if (wall.length === 0) {
      return { ...state, phase: 'wall_exhausted' as GamePhase, drawnTile: null }
    }

    // Simulate 3 opponents discarding (South, West, North)
    const numOpponents = Math.min(3, wall.length)
    const opponentNewDiscards: TileId[] = []

    for (let i = 0; i < numOpponents; i++) {
      const idx = Math.floor(Math.random() * wall.length)
      opponentNewDiscards.push(wall[idx])
      wall.splice(idx, 1)
    }

    // Start checking opponent discards for calls
    next('CHECK_OPPONENT_DISCARD', { discards: opponentNewDiscards, index: 0 }, 200)

    return {
      ...state,
      wall,
      remainingOpponentDiscards: opponentNewDiscards,
      remainingOpponentIndex: 0,
    }
  },

  CHECK_OPPONENT_DISCARD: (state: AppState, data: { discards: TileId[]; index: number }, next: any) => {
    const { discards, index } = data

    if (index >= discards.length) {
      // All opponent discards processed, no calls. User draws from wall.
      const wall = [...state.wall]
      if (wall.length === 0) {
        return {
          ...state,
          phase: 'wall_exhausted' as GamePhase,
          drawnTile: null,
        }
      }

      const nextDraw = wall.shift()!

      // Check if the drawn tile completes the hand
      const fullHand = [...state.hand, nextDraw]
      const counts = handToCountArray(fullHand)
      const numMelds = (state.openMelds || []).length
      const sh = numMelds > 0
        ? calculateShantenWithMelds(counts, numMelds)
        : calculateShanten(counts)

      if (sh === -1) {
        // Hand complete — calculate score (tsumo)
        const score = calculateScore(fullHand, state.openMelds || [], {
          winTile: nextDraw,
          isTsumo: true,
          isDealer: true,
          seatWind: 27,
          roundWind: 27,
          isRiichi: state.isRiichi,
          isRinshan: false,
          isIppatsu: state.isIppatsu || false,
          isHaitei: wall.length === 0,
          isDoubleRiichi: state.isDoubleRiichi || false,
        })
        return {
          ...state,
          hand: state.hand,
          drawnTile: nextDraw,
          wall,
          phase: 'hand_complete' as GamePhase,
          scoreResult: score,
          winMethod: 'tsumo' as const,
        }
      }

      // Riichi auto-discard: if in riichi and draw doesn't complete, auto-discard drawn tile
      if (state.isRiichi) {
        const newDiscards = [...state.discards, nextDraw]
        next('OPPONENT_DISCARD_ROUND', null, 300)
        return {
          ...state,
          drawnTile: null,
          wall,
          discards: newDiscards,
          turnCount: state.turnCount + 1,
          phase: 'opponent_turn' as GamePhase,
          isTempFuriten: false,
          isIppatsu: false, // Survived one go-around, ippatsu window over
        }
      }

      return {
        ...state,
        drawnTile: nextDraw,
        wall,
        phase: 'user_discard' as GamePhase,
        isTempFuriten: false, // Reset temp furiten on draw
      }
    }

    const tile = discards[index]

    // Add this discard to the appropriate opponent pile (index 0=South, 1=West, 2=North)
    const updatedPiles = state.opponentDiscards.map((pile: TileId[], i: number) =>
      i === index ? [...pile, tile] : [...pile]
    )

    // Check if this tile completes the hand (ron check)
    const handWithTile = [...state.hand, tile]
    const ronCounts = handToCountArray(handWithTile)
    const numMelds = (state.openMelds || []).length
    const ronSh = numMelds > 0
      ? calculateShantenWithMelds(ronCounts, numMelds)
      : calculateShanten(ronCounts)

    // Compute furiten status
    const furitenNow = state.isTempFuriten ||
      (state.isRiichi && (state.declinedRonTiles || []).length > 0) ||
      isStaticFuriten(state.hand, state.discards || [], state.openMelds || [])

    // Detect pon/chi/kan calls
    const calls: CallOption[] = []

    // Add ron option first (if completes and not furiten)
    if (ronSh === -1 && !furitenNow) {
      calls.push({ type: 'ron', calledTile: tile, handTiles: [] })
    }

    // Add pon/chi/kan (skip if riichi — can't call while in riichi)
    if (!state.isRiichi) {
      const otherCalls = detectCallOptions(state.hand, tile)
      // Chi only allowed from kamicha (index 2 = North)
      const filteredCalls = index === 2
        ? otherCalls
        : otherCalls.filter((c: CallOption) => c.type !== 'chi')
      calls.push(...filteredCalls)
    }

    if (calls.length > 0) {
      // Offer call(s) to user
      return {
        ...state,
        opponentDiscards: updatedPiles,
        pendingOpponentDiscard: tile,
        callOptions: calls,
        phase: 'call_decision' as GamePhase,
        remainingOpponentDiscards: discards,
        remainingOpponentIndex: index + 1,
      }
    }

    // No call possible, check next opponent discard
    next('CHECK_OPPONENT_DISCARD', { discards, index: index + 1 }, 100)
    return {
      ...state,
      opponentDiscards: updatedPiles,
    }
  },

  CALL_PON: (state: AppState) => {
    if (state.phase !== 'call_decision') return ABORT
    const ponOption = (state.callOptions || []).find((c: CallOption) => c.type === 'pon')
    if (!ponOption) return ABORT

    const calledTile = ponOption.calledTile
    const handTiles = ponOption.handTiles[0]
    const newHand = removeFromHand(state.hand, handTiles)

    const meld: OpenMeld = {
      type: 'pon',
      tiles: sortHand([...handTiles, calledTile]),
      calledTile,
      fromHand: handTiles,
      calledFrom: (state.remainingOpponentIndex || 1) - 1,
    }

    return {
      ...state,
      hand: sortHand(newHand),
      openMelds: [...(state.openMelds || []), meld],
      phase: 'post_call_discard' as GamePhase,
      drawnTile: null,
      pendingOpponentDiscard: null,
      callOptions: [],
      remainingOpponentDiscards: [],
      remainingOpponentIndex: 0,
    }
  },

  CALL_CHI: (state: AppState, comboIndex: number) => {
    if (state.phase !== 'call_decision') return ABORT
    const chiOption = (state.callOptions || []).find((c: CallOption) => c.type === 'chi')
    if (!chiOption) return ABORT

    const idx = comboIndex || 0
    const handTiles = chiOption.handTiles[idx]
    if (!handTiles) return ABORT
    const calledTile = chiOption.calledTile
    const newHand = removeFromHand(state.hand, handTiles)

    const meld: OpenMeld = {
      type: 'chi',
      tiles: sortHand([...handTiles, calledTile]),
      calledTile,
      fromHand: handTiles,
      calledFrom: (state.remainingOpponentIndex || 1) - 1,
    }

    return {
      ...state,
      hand: sortHand(newHand),
      openMelds: [...(state.openMelds || []), meld],
      phase: 'post_call_discard' as GamePhase,
      drawnTile: null,
      pendingOpponentDiscard: null,
      callOptions: [],
      remainingOpponentDiscards: [],
      remainingOpponentIndex: 0,
    }
  },

  CALL_DAIMINKAN: (state: AppState) => {
    if (state.phase !== 'call_decision') return ABORT
    const kanOption = (state.callOptions || []).find((c: CallOption) => c.type === 'daiminkan')
    if (!kanOption) return ABORT

    const calledTile = kanOption.calledTile
    const handTiles = kanOption.handTiles[0] // 3 tiles from hand
    const newHand = removeFromHand(state.hand, handTiles)

    const meld: OpenMeld = {
      type: 'daiminkan',
      tiles: sortHand([...handTiles, calledTile]),
      calledTile,
      fromHand: handTiles,
      calledFrom: (state.remainingOpponentIndex || 1) - 1,
    }

    const melds = [...(state.openMelds || []), meld]

    // Draw replacement from wall
    const wall = [...state.wall]
    if (wall.length === 0) {
      return {
        ...state,
        hand: sortHand(newHand),
        drawnTile: null,
        openMelds: melds,
        phase: 'wall_exhausted' as GamePhase,
        pendingOpponentDiscard: null,
        callOptions: [],
        remainingOpponentDiscards: [],
        remainingOpponentIndex: 0,
      }
    }

    const replacement = wall.shift()!

    // Check if replacement completes the hand
    const handWithDraw = [...newHand, replacement]
    const counts = handToCountArray(handWithDraw)
    const sh = calculateShantenWithMelds(counts, melds.length)

    if (sh === -1) {
      const score = calculateScore(handWithDraw, melds, {
        winTile: replacement,
        isTsumo: true,
        isDealer: true,
        seatWind: 27,
        roundWind: 27,
        isRiichi: false,
        isRinshan: true,
        isIppatsu: false,
        isHaitei: false,
        isDoubleRiichi: false,
      })
      return {
        ...state,
        hand: newHand,
        drawnTile: replacement,
        wall,
        openMelds: melds,
        phase: 'hand_complete' as GamePhase,
        scoreResult: score,
        pendingOpponentDiscard: null,
        callOptions: [],
        remainingOpponentDiscards: [],
        remainingOpponentIndex: 0,
      }
    }

    return {
      ...state,
      hand: sortHand(newHand),
      drawnTile: replacement,
      wall,
      openMelds: melds,
      phase: 'user_discard' as GamePhase,
      pendingOpponentDiscard: null,
      callOptions: [],
      remainingOpponentDiscards: [],
      remainingOpponentIndex: 0,
    }
  },

  DECLARE_ANKAN: (state: AppState, tileType: number | null) => {
    if (tileType === null || isNaN(tileType)) return ABORT
    if (state.phase !== 'user_discard') return ABORT

    // Build full hand
    const fullHand = state.drawnTile !== null && state.drawnTile !== undefined
      ? [...state.hand, state.drawnTile]
      : [...state.hand]

    // Verify 4 of this tile
    const counts = handToCountArray(fullHand)
    if (counts[tileType] < 4) return ABORT

    // Remove 4 tiles from hand
    const kanTiles: TileId[] = [tileType, tileType, tileType, tileType]
    const newHand = removeFromHand(fullHand, kanTiles)

    const meld: OpenMeld = {
      type: 'ankan',
      tiles: kanTiles,
      calledTile: null,
      fromHand: kanTiles,
    }

    const melds = [...(state.openMelds || []), meld]

    // Draw replacement from wall
    const wall = [...state.wall]
    if (wall.length === 0) {
      return {
        ...state,
        hand: sortHand(newHand),
        drawnTile: null,
        openMelds: melds,
        phase: 'wall_exhausted' as GamePhase,
      }
    }

    const replacement = wall.shift()!

    // Check if replacement completes the hand
    const handWithDraw = [...newHand, replacement]
    const countsAfter = handToCountArray(handWithDraw)
    const sh = calculateShantenWithMelds(countsAfter, melds.length)

    if (sh === -1) {
      const score = calculateScore(handWithDraw, melds, {
        winTile: replacement,
        isTsumo: true,
        isDealer: true,
        seatWind: 27,
        roundWind: 27,
        isRiichi: false,
        isRinshan: true,
        isIppatsu: false,
        isHaitei: false,
        isDoubleRiichi: false,
      })
      return {
        ...state,
        hand: newHand,
        drawnTile: replacement,
        wall,
        openMelds: melds,
        phase: 'hand_complete' as GamePhase,
        scoreResult: score,
      }
    }

    return {
      ...state,
      hand: sortHand(newHand),
      drawnTile: replacement,
      wall,
      openMelds: melds,
      phase: 'user_discard' as GamePhase,
      pendingOpponentDiscard: null,
      callOptions: [],
    }
  },

  DECLARE_SHOUMINKAN: (state: AppState, meldIndex: number | null) => {
    if (meldIndex === null || isNaN(meldIndex)) return ABORT
    if (state.phase !== 'user_discard') return ABORT

    const melds = [...(state.openMelds || [])]
    if (meldIndex < 0 || meldIndex >= melds.length) return ABORT
    const targetMeld = melds[meldIndex]
    if (targetMeld.type !== 'pon') return ABORT

    const ponTile = targetMeld.tiles[0]

    // Build full hand
    const fullHand = state.drawnTile !== null && state.drawnTile !== undefined
      ? [...state.hand, state.drawnTile]
      : [...state.hand]

    const counts = handToCountArray(fullHand)
    if (counts[ponTile] < 1) return ABORT

    // Remove 1 tile from hand
    const newHand = removeFromHand(fullHand, [ponTile])

    // Upgrade meld from pon to shouminkan
    melds[meldIndex] = {
      type: 'shouminkan',
      tiles: [...targetMeld.tiles, ponTile],
      calledTile: targetMeld.calledTile,
      fromHand: [...targetMeld.fromHand, ponTile],
      calledFrom: targetMeld.calledFrom,
    }

    // Draw replacement
    const wall = [...state.wall]
    if (wall.length === 0) {
      return {
        ...state,
        hand: sortHand(newHand),
        drawnTile: null,
        openMelds: melds,
        phase: 'wall_exhausted' as GamePhase,
      }
    }

    const replacement = wall.shift()!

    // Check completion
    const handWithDraw = [...newHand, replacement]
    const countsAfter = handToCountArray(handWithDraw)
    const sh = calculateShantenWithMelds(countsAfter, melds.length)

    if (sh === -1) {
      const score = calculateScore(handWithDraw, melds, {
        winTile: replacement,
        isTsumo: true,
        isDealer: true,
        seatWind: 27,
        roundWind: 27,
        isRiichi: false,
        isRinshan: true,
        isIppatsu: false,
        isHaitei: false,
        isDoubleRiichi: false,
      })
      return {
        ...state,
        hand: newHand,
        drawnTile: replacement,
        wall,
        openMelds: melds,
        phase: 'hand_complete' as GamePhase,
        scoreResult: score,
      }
    }

    return {
      ...state,
      hand: sortHand(newHand),
      drawnTile: replacement,
      wall,
      openMelds: melds,
      phase: 'user_discard' as GamePhase,
      pendingOpponentDiscard: null,
      callOptions: [],
    }
  },

  DECLARE_RIICHI: (state: AppState) => {
    if (state.phase !== 'user_discard') return ABORT
    if (state.isRiichi) return ABORT
    if (state.drawnTile === null || state.drawnTile === undefined) return ABORT
    // Verify closed hand
    const openMelds = state.openMelds || []
    if (!openMelds.every((m: OpenMeld) => m.type === 'ankan')) return ABORT
    // Verify tenpai
    const fullHand = [...state.hand, state.drawnTile]
    const counts = handToCountArray(fullHand)
    const numMelds = openMelds.length
    const sh = numMelds > 0 ? calculateShantenWithMelds(counts, numMelds) : calculateShanten(counts)
    if (sh !== 0) return ABORT

    return {
      ...state,
      phase: 'riichi_discard' as GamePhase,
      isDoubleRiichi: state.turnCount === 1,
    }
  },

  CALL_RON: (state: AppState) => {
    if (state.phase !== 'call_decision') return ABORT
    const ronOption = (state.callOptions || []).find((c: CallOption) => c.type === 'ron')
    if (!ronOption) return ABORT

    const winTile = ronOption.calledTile
    const fullHand = [...state.hand, winTile]
    const score = calculateScore(fullHand, state.openMelds || [], {
      winTile,
      isTsumo: false,
      isDealer: true,
      seatWind: 27,
      roundWind: 27,
      isRiichi: state.isRiichi,
      isRinshan: false,
      isIppatsu: state.isIppatsu || false,
      isHaitei: (state.wall || []).length === 0,
      isDoubleRiichi: state.isDoubleRiichi || false,
    })

    // Determine which opponent discarded (from remainingOpponentIndex - 1)
    const opponentIdx = (state.remainingOpponentIndex || 1) - 1

    return {
      ...state,
      phase: 'hand_complete' as GamePhase,
      winMethod: 'ron' as const,
      drawnTile: winTile,
      scoreResult: score,
      ronFromOpponent: opponentIdx,
      pendingOpponentDiscard: null,
      callOptions: [],
      remainingOpponentDiscards: [],
      remainingOpponentIndex: 0,
    }
  },

  HOVER_DISCARD: (state: AppState, index: number | null) => {
    if (state.phase !== 'riichi_discard') return ABORT
    if (index === null) return ABORT
    return { ...state, hoveredDiscardIndex: index }
  },

  UNHOVER_DISCARD: (state: AppState) => {
    if (state.hoveredDiscardIndex === null) return ABORT
    return { ...state, hoveredDiscardIndex: null }
  },

  SKIP_CALL: (state: AppState, _data: any, next: any) => {
    if (state.phase !== 'call_decision') return ABORT

    const remaining = state.remainingOpponentDiscards || []
    const idx = state.remainingOpponentIndex || 0

    // Check if skipped call had a ron option
    const hadRon = (state.callOptions || []).some((c: CallOption) => c.type === 'ron')
    let newTempFuriten = state.isTempFuriten
    let newDeclinedRonTiles = state.declinedRonTiles || []
    if (hadRon) {
      newTempFuriten = true
      if (state.isRiichi) {
        newDeclinedRonTiles = [...newDeclinedRonTiles, state.pendingOpponentDiscard!]
      }
    }

    next('CHECK_OPPONENT_DISCARD', { discards: remaining, index: idx }, 100)

    return {
      ...state,
      phase: 'opponent_turn' as GamePhase,
      pendingOpponentDiscard: null,
      callOptions: [],
      isTempFuriten: newTempFuriten,
      declinedRonTiles: newDeclinedRonTiles,
    }
  },

}

export default RootComponent
