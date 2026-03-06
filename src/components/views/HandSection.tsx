import { TileId, DiscardAnalysis, OpenMeld, SelfKanOption, GamePhase, ScoreResult } from '../../mahjong/types'
import { tileToString } from '../../mahjong/tiles'
import { tileFaceSVG } from '../../mahjong/tileSVG'
import MeldGroup from '../MeldGroup'

type WaitTile = { tile: TileId, remaining: number, score: ScoreResult | null }

type HandSectionProps = {
  hand: TileId[]
  drawnTile: TileId | null
  shanten: number
  shantenLabel: string
  canDiscard: boolean
  phase: GamePhase
  isRiichi: boolean
  canDeclareRiichi: boolean
  isFuriten: boolean
  selfKanOptions: SelfKanOption[]
  openMelds: OpenMeld[]
  turnCount: number
  wallRemaining: number
  discardLookup: Map<number, DiscardAnalysis>
  riichiValidSet: Set<number>
  waitingTiles: WaitTile[]
  showDrawnTile: boolean
  tsumoInsertIdx: number
  winMethod: 'tsumo' | 'ron' | null
  discards: TileId[]
}

export function HandSection({
  hand, drawnTile, shanten, shantenLabel, canDiscard, phase,
  isRiichi, canDeclareRiichi, isFuriten, selfKanOptions, openMelds,
  turnCount, wallRemaining, discardLookup, riichiValidSet,
  waitingTiles, showDrawnTile, tsumoInsertIdx, winMethod, discards
}: HandSectionProps) {
  const handToShow = hand

  return (
    <section className="hand-section">
      <div className="hand-header">
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
        <span className="turn-info">Turn {turnCount} &middot; {wallRemaining} left</span>
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
              className={`tile${canDiscard && !isRiichiInvalid ? ' discard-target' : ''}${insertBefore ? ' insert-before' : ''}${insertAfter ? ' insert-after' : ''}${isRiichiInvalid ? ' riichi-invalid' : ''}`}
              attrs={{ 'data-index': String(idx) }}
            >
              {tileFaceSVG(tile)}
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
                className={`tile drawn${canDiscard && !drawnIsRiichiInvalid ? ' discard-target' : ''}${winClass}${drawnIsRiichiInvalid ? ' riichi-invalid' : ''}`}
                attrs={{ 'data-index': String(hand.length) }}
              >
                {tileFaceSVG(drawnTile!)}
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
              <div className={`waiting-tile-item${w.remaining <= 0 ? ' waiting-tile-unavailable' : ''}`}>
                <div className="tile-analysis">
                  {tileFaceSVG(w.tile)}
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

      {/* Player discards */}
      {discards.length > 0 && (
        <div className="player-discards">
          <h3 className="section-label">Your Discards</h3>
          <div className="discards-row">
            {discards.map((tile: TileId) => (
              <div className="discard-tile-styled">
                {tileFaceSVG(tile)}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
