import { classes } from 'sygnal'
import type { Component } from 'sygnal'
import { TileId, DiscardAnalysis, OpenMeld, SelfKanOption, ScoreResult } from '../../mahjong/types'
import { tileToString } from '../../mahjong/tiles'
import { tileFaceSVG } from '../../mahjong/tileSVG'
import MeldGroup from '../MeldGroup'

type WaitTile = { tile: TileId, remaining: number, score: ScoreResult | null }

type HandSectionContext = {
  phase: string
  isRiichi: boolean
  isFuriten: boolean
  canDeclareRiichi: boolean
  shanten: number
  wallRemaining: number
  turnCount: number
}

function HandSection({ context, hand, drawnTile, openMelds: openMeldsProp, selfKanOptions, discardLookup, riichiValidDiscards, waitingTiles, winMethod, discards }: {
  state?: any
  context?: HandSectionContext
  hand: TileId[]
  drawnTile: TileId | null
  openMelds: OpenMeld[]
  selfKanOptions: SelfKanOption[]
  discardLookup: Map<number, DiscardAnalysis>
  riichiValidDiscards: number[]
  waitingTiles: WaitTile[]
  winMethod: 'tsumo' | 'ron' | null
  discards: TileId[]
}) {
  const { phase = 'user_discard', isRiichi = false, isFuriten = false, canDeclareRiichi = false, shanten = 8, wallRemaining = 0, turnCount = 1 } = context || {}
  const openMelds = openMeldsProp || []

  // Computed locally from context + props
  const shantenLabel = shanten === 0 ? 'Tenpai!' :
    shanten === -1 ? 'Complete!' :
    `${shanten}-shanten`
  const canDiscard = phase === 'user_discard' || phase === 'post_call_discard' || phase === 'riichi_discard'
  const showDrawnTile = (phase === 'user_discard' || phase === 'hand_complete' || phase === 'riichi_discard') && drawnTile !== null && drawnTile !== undefined
  const riichiValidSet = new Set(riichiValidDiscards)
  const tsumoInsertIdx = (phase === 'hand_complete' && drawnTile !== null && drawnTile !== undefined)
    ? hand.findIndex((t: TileId) => t > drawnTile!)
    : -2

  return (
    <section className="hand-section">
      <div className="hand-header">
        <div className="wind-badge">
          <span className="wind-icon">{'\u{1F000}'}</span>
          <span className="wind-text">East · Dealer</span>
        </div>
        <div className={classes('shanten-badge', { tenpai: shanten <= 0 })}>
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
                <button className="ankan-btn kan-btn" data-tile={String(opt.tile)}>
                  Ankan ({tileToString(opt.tile)})
                </button>
              ) : (
                <button className="shouminkan-btn kan-btn" data-meldindex={String(opt.meldIndex)}>
                  Kan ({tileToString(opt.tile)})
                </button>
              )
            ))}
          </div>
        </div>
      )}

      <div className="hand-tiles">
        {hand.map((tile: TileId, idx: number) => {
          const da = discardLookup.get(tile)
          const insertBefore = tsumoInsertIdx >= 0 && tsumoInsertIdx === idx
          const insertAfter = tsumoInsertIdx === -1 && idx === hand.length - 1
          const isRiichiInvalid = phase === 'riichi_discard' && !riichiValidSet.has(idx)
          return (
            <div
              className={classes('tile', { 'discard-target': canDiscard && !isRiichiInvalid, 'insert-before': insertBefore, 'insert-after': insertAfter, 'riichi-invalid': isRiichiInvalid })}
              data-index={String(idx)}
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
                        <div className={classes('tooltip-change', { improve: c.change > 0, worsen: c.change <= 0 })}>
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
          return (
            <>
              <div className="tile-gap"></div>
              <div
                className={classes('tile', 'drawn', { 'discard-target': canDiscard && !drawnIsRiichiInvalid, 'ron-win': phase === 'hand_complete' && winMethod === 'ron', 'tsumo-win': phase === 'hand_complete' && winMethod !== 'ron', 'riichi-invalid': drawnIsRiichiInvalid })}
                data-index={String(hand.length)}
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
                          <div className={classes('tooltip-change', { improve: c.change > 0, worsen: c.change <= 0 })}>
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
          {openMelds.map((meld: OpenMeld) => (
            <MeldGroup meld={meld} />
          ))}
        </div>
      )}

      {/* Waiting tiles when tenpai */}
      {shanten === 0 && waitingTiles.length > 0 && phase !== 'hand_complete' && (
        <div className="waiting-section">
          <span className="waiting-label">Waiting for:</span>
          <div className="waiting-tiles">
            {waitingTiles.map((w: WaitTile) => (
              <div className={classes('waiting-tile-item', { 'waiting-tile-unavailable': w.remaining <= 0 })}>
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
    </section>
  )
}

HandSection.intent = ({ DOM }: any) => ({
  DISCARD: DOM.click('.discard-target').data('index', Number),
  HOVER: DOM.select('.discard-target').events('mouseenter').data('index', Number),
  UNHOVER: DOM.select('.discard-target').events('mouseleave'),
  ANKAN: DOM.click('.ankan-btn').data('tile', Number),
  SHOUMINKAN: DOM.click('.shouminkan-btn').data('meldindex', Number),
  RIICHI: DOM.click('.riichi-btn'),
  NEW_HAND: DOM.click('.new-hand-btn'),
})

HandSection.model = {
  DISCARD: { PARENT: (_s: any, index: number) => ({ type: 'DISCARD_TILE', data: index }) },
  HOVER: { PARENT: (_s: any, index: number) => ({ type: 'HOVER_DISCARD', data: index }) },
  UNHOVER: { PARENT: () => ({ type: 'UNHOVER_DISCARD' }) },
  ANKAN: { PARENT: (_s: any, tile: number) => ({ type: 'DECLARE_ANKAN', data: tile }) },
  SHOUMINKAN: { PARENT: (_s: any, idx: number) => ({ type: 'DECLARE_SHOUMINKAN', data: idx }) },
  RIICHI: { PARENT: () => ({ type: 'DECLARE_RIICHI' }) },
  NEW_HAND: { PARENT: () => ({ type: 'NEW_HAND' }) },
}

export default HandSection
