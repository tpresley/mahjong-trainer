import { ABORT } from 'sygnal'
import { TileId, YakuInfo, DiscardAnalysis, OpenMeld, CallOption, SelfKanOption, GamePhase, ScoreResult } from './mahjong/types'
import { dealHand, tileToString, tileColor, sortHand, handToCountArray, tileDisplayChar, removeFromHand } from './mahjong/tiles'
import { calculateShanten, calculateShantenWithMelds } from './mahjong/shanten'
import { analyzeYaku, analyzeDiscards } from './mahjong/yaku'
import { detectCallOptions, detectSelfKanOptions } from './mahjong/calls'
import { calculateScore } from './mahjong/scoring'
import YakuItem from './components/YakuItem'
import DiscardResult from './components/DiscardResult'
import ScoreYakuItem from './components/ScoreYakuItem'
import MeldGroup from './components/MeldGroup'
// DiscardTile not used as collection (ordering issues) — rendered inline via .map()

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

      {/* Score display when hand is complete */}
      {phase === 'hand_complete' && scoreResult && (
        <section className="score-section">
          <h2>{winMethod === 'ron' ? 'Ron!' : 'Tsumo!'} Hand Complete!</h2>
          <div className="score-yaku-list">
            <collection of={ScoreYakuItem} from="scoreYaku" />
          </div>
          <div className="score-summary">
            <div className="score-han-fu">{scoreResult.totalHan} han / {scoreResult.fu} fu</div>
            {scoreResult.limitName && (
              <div className="score-limit">{scoreResult.limitName}</div>
            )}
            <div className="score-points">
              {scoreResult.totalPoints} points
              <span className="score-payment-detail">
                {winMethod === 'ron'
                  ? ` (from ${opponentNames[ronFromOpponent || 0]})`
                  : ` (each pays ${scoreResult.dealerTsumoEach})`}
              </span>
            </div>
          </div>
          <button className="new-hand-btn">New Hand</button>
        </section>
      )}
      {phase === 'hand_complete' && !scoreResult && (
        <section className="score-section" style={{ borderColor: '#e74c3c' }}>
          <h2 style={{ color: '#e74c3c' }}>No Yaku!</h2>
          <p style={{ color: '#aaa' }}>Your hand has no valid yaku. No points scored.</p>
          <button className="new-hand-btn">New Hand</button>
        </section>
      )}

      {/* Opponent discards — always visible */}
      <section className="opponent-discards-section">
        <div className="opponent-discards-grid">
          {['\u5357 South', '\u897F West', '\u5317 North'].map((name: string, i: number) => (
            <div className="opponent-pile">
              <h3>{name}</h3>
              <div className="discards-row">
                {(opponentDiscards[i] || []).map((tile: TileId, tileIdx: number) => {
                  const pile = opponentDiscards[i] || []
                  const isCallTarget = phase === 'call_decision' && pendingDiscard !== null && tile === pendingDiscard && tileIdx === pile.length - 1
                  return (
                    <div className={`discard-tile-styled${tile === 33 ? ' chun' : ''}${isCallTarget ? ' call-candidate' : ''}`} style={{ color: tileColor(tile) }}>
                      <span className="tile-char-discard">{tileDisplayChar(tile)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hand-section">
        <div className="hand-header">
          <h2>Your Hand</h2>
          <div className="wind-badge">
            <span className="wind-icon">{'\u{1F000}'}</span>
            <span className="wind-text">East · Dealer</span>
          </div>
          <div className={`shanten-badge ${shanten <= 0 ? 'tenpai' : ''}`}>
            <span className="shanten-text">{shantenLabel}</span>
          </div>
          {isRiichi && (
            <div className="riichi-badge">
              <span className="riichi-badge-text">Riichi!</span>
            </div>
          )}
          {isFuriten && (
            <div className="furiten-badge">
              <span className="furiten-badge-text">Furiten</span>
            </div>
          )}
          <span className="turn-info">Turn {state.turnCount} &middot; {wallRemaining} left</span>
          <button className="new-hand-btn">New Hand</button>
        </div>

        {/* Riichi declaration banner */}
        {canDeclareRiichi && !isRiichi && (
          <div className="riichi-banner">
            <span className="riichi-banner-text">You are tenpai with a closed hand!</span>
            <button className="riichi-btn">Declare Riichi</button>
          </div>
        )}

        {/* Self-kan options during user's turn */}
        {phase === 'user_discard' && selfKanOptions.length > 0 && !isRiichi && (
          <div className="self-kan-banner">
            <span className="kan-label">Kan available:</span>
            <div className="kan-buttons">
              {selfKanOptions.map((opt: SelfKanOption) => (
                opt.type === 'ankan' ? (
                  <button className="ankan-btn kan-btn" attrs={{ 'data-tile': String(opt.tile) }}>
                    Ankan ({tileToString(opt.tile)})
                  </button>
                ) : (
                  <button className="shouminkan-btn kan-btn" attrs={{ 'data-meld-index': String(opt.meldIndex) }}>
                    Kan ({tileToString(opt.tile)})
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        <div className="hand-tiles">
          {handToShow.map((tile: TileId, idx: number) => {
            const da = discardLookup.get(tile)
            const insertBefore = tsumoInsertIdx >= 0 && tsumoInsertIdx === idx
            const insertAfter = tsumoInsertIdx === -1 && idx === handToShow.length - 1
            const isRiichiInvalid = phase === 'riichi_discard' && !riichiValidSet.has(idx)
            return (
              <div
                className={`tile${canDiscard && !isRiichiInvalid ? ' discard-target' : ''}${tile === 33 ? ' chun' : ''}${insertBefore ? ' insert-before' : ''}${insertAfter ? ' insert-after' : ''}${isRiichiInvalid ? ' riichi-invalid' : ''}`}
                attrs={{ 'data-index': String(idx) }}
                style={{ color: tileColor(tile) }}
              >
                <span className="tile-char">{tileDisplayChar(tile)}</span>
                {da && canDiscard && (
                  <div className="tile-tooltip">
                    <div className="tooltip-header">
                      Discard <strong>{tileToString(tile)}</strong> &rarr; {da.shantenAfter}-shanten, {da.acceptance} accepts
                    </div>
                    {da.yakuChanges.length > 0 ? (
                      <div className="tooltip-changes">
                        {da.yakuChanges.map((c: { name: string; change: number }) => (
                          <div className={`tooltip-change ${c.change > 0 ? 'improve' : 'worsen'}`}>
                            {c.change > 0 ? '+' : ''}{c.change} {c.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="tooltip-empty">No yaku impact</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {showDrawnTile && (() => {
            const da = discardLookup.get(drawnTile!)
            const drawnIsRiichiInvalid = phase === 'riichi_discard' && !riichiValidSet.has(hand.length)
            const winClass = phase === 'hand_complete' ? (winMethod === 'ron' ? ' ron-win' : ' tsumo-win') : ''
            return (
              <>
                <div className="tile-gap"></div>
                <div
                  className={`tile drawn${canDiscard && !drawnIsRiichiInvalid ? ' discard-target' : ''}${winClass}${drawnTile === 33 ? ' chun' : ''}${drawnIsRiichiInvalid ? ' riichi-invalid' : ''}`}
                  attrs={{ 'data-index': String(hand.length) }}
                  style={{ color: tileColor(drawnTile!) }}
                >
                  <span className="tile-char">{tileDisplayChar(drawnTile!)}</span>
                  {da && canDiscard && (
                    <div className="tile-tooltip">
                      <div className="tooltip-header">
                        Discard <strong>{tileToString(drawnTile!)}</strong> &rarr; {da.shantenAfter}-shanten, {da.acceptance} accepts
                      </div>
                      {da.yakuChanges.length > 0 ? (
                        <div className="tooltip-changes">
                          {da.yakuChanges.map((c: { name: string; change: number }) => (
                            <div className={`tooltip-change ${c.change > 0 ? 'improve' : 'worsen'}`}>
                              {c.change > 0 ? '+' : ''}{c.change} {c.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="tooltip-empty">No yaku impact</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>

        {/* Open melds */}
        {openMelds.length > 0 && (
          <div className="open-melds">
            <collection of={MeldGroup} from="openMelds" />
          </div>
        )}

        {/* Waiting tiles when tenpai */}
        {shanten === 0 && waitingTiles.length > 0 && phase !== 'hand_complete' && (
          <div className="waiting-section">
            <span className="waiting-label">Waiting for:</span>
            <div className="waiting-tiles">
              {waitingTiles.map((w: WaitTile) => (
                <div className="waiting-tile-item">
                  <div className={`tile-analysis${w.tile === 33 ? ' chun' : ''}`} style={{ color: tileColor(w.tile) }}>
                    <span className="tile-char-analysis">{tileDisplayChar(w.tile)}</span>
                  </div>
                  <div className="waiting-tile-detail">
                    <span className="waiting-tile-name">{tileToString(w.tile)}</span>
                    <span className="waiting-tile-count">{w.remaining} left</span>
                  </div>
                  <div className="waiting-tooltip">
                    {w.score && w.score.yaku && w.score.yaku.length > 0 ? (
                      <>
                        {w.score.yaku.map((y: { japanese: string; name: string; han: number }) => (
                          <div className="waiting-yaku-row">
                            <span className="waiting-yaku-name">{y.japanese}</span>
                            <span className="waiting-yaku-han">{y.han} han</span>
                          </div>
                        ))}
                        <div className="waiting-score-total">
                          {w.score.totalHan} han / {w.score.fu} fu = {w.score.totalPoints} pts
                        </div>
                      </>
                    ) : (
                      <div className="waiting-no-yaku">No yaku</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase-dependent hints */}
        {phase === 'user_discard' && drawnTile !== null && drawnTile !== undefined && (
          <p className="discard-hint">Click a tile to discard it</p>
        )}
        {phase === 'post_call_discard' && (
          <p className="discard-hint">You called {openMelds.length > 0 ? (openMelds[openMelds.length - 1]?.type === 'chi' ? 'chi' : 'pon') : ''} &mdash; discard a tile</p>
        )}
        {phase === 'opponent_turn' && (
          <p className="discard-hint">Opponents are discarding...</p>
        )}
        {phase === 'call_decision' && (
          <p className="discard-hint">An opponent discarded a tile you can call</p>
        )}
        {phase === 'riichi_discard' && (
          <p className="discard-hint">Riichi declared! Discard a tile that keeps you tenpai</p>
        )}
        {phase === 'hand_complete' && (
          <p className="discard-hint">Your hand is complete!</p>
        )}
        {phase === 'wall_exhausted' && (
          <p className="discard-hint">Wall exhausted &mdash; deal a new hand</p>
        )}
      </section>

      {/* Call decision banner */}
      {phase === 'call_decision' && pendingDiscard !== null && (
        <section className="call-banner">
          <div className="call-banner-info">
            <div className={`tile-small${pendingDiscard === 33 ? ' chun' : ''}`} style={{ color: tileColor(pendingDiscard) }}>
              <span className="tile-char-meld">{tileDisplayChar(pendingDiscard)}</span>
            </div>
            <span className="call-label">Opponent discarded <strong>{tileToString(pendingDiscard)}</strong></span>
          </div>
          <div className="call-buttons">
            {callOptions.some((c: CallOption) => c.type === 'ron') && (
              <button className="call-ron-btn call-btn">Ron</button>
            )}
            {callOptions.some((c: CallOption) => c.type === 'daiminkan') && (
              <button className="call-daiminkan-btn call-btn">Kan</button>
            )}
            {callOptions.some((c: CallOption) => c.type === 'pon') && (
              <button className="call-pon-btn call-btn">Pon</button>
            )}
            {callOptions.filter((c: CallOption) => c.type === 'chi').map((chiOpt: CallOption) =>
              chiOpt.handTiles.map((combo: TileId[], idx: number) => (
                <button className="call-chi-btn call-btn" attrs={{ 'data-combo': String(idx) }}>
                  Chi ({combo.map((t: TileId) => tileToString(t)).join(' + ')})
                </button>
              ))
            )}
            <button className="skip-call-btn call-btn call-btn-skip">Skip</button>
          </div>
        </section>
      )}

      {/* User discards — always visible */}
      <section className="user-discards-section">
        <h2>Your Discards</h2>
        <div className="discards-row">
          {discards.map((tile: TileId) => (
            <div className={`discard-tile-styled${tile === 33 ? ' chun' : ''}`} style={{ color: tileColor(tile) }}>
              <span className="tile-char-discard">{tileDisplayChar(tile)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="analysis-grid">
        <section className="yaku-section">
          <h2>Yaku Distances</h2>
          <p className="section-hint">
            {openMelds.length > 0 ? 'Open hand — some yaku unavailable' : 'Analysis of your hand'}
          </p>
          <div className="yaku-list">
            <collection of={YakuItem} from="yakuDistances" />
          </div>
        </section>

        <section className="discard-section">
          <h2>Discard Analysis</h2>
          <p className="section-hint">
            {canDiscard && (drawnTile !== null || phase === 'post_call_discard')
              ? 'Shanten & acceptance after discarding each tile'
              : 'Discard a tile to continue'}
          </p>
          <div className="discard-list">
            <collection of={DiscardResult} from="discardResults" />
          </div>
        </section>
      </div>
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
      calls.push(...otherCalls)
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
