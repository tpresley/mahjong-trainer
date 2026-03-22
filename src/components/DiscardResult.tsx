import { classes } from 'sygnal'
import type { Component } from 'sygnal'
import { tileToString } from '../mahjong/tiles'
import { tileFaceSVG } from '../mahjong/tileSVG'

type DiscardResultState = {
  tile: number
  shantenAfter: number
  acceptance: number
  yakuChanges: { name: string; change: number }[]
  isDrawn: boolean
}

const DiscardResult: Component<DiscardResultState> = ({ state }) => {
  return (
    <div className={classes('discard-item', { 'is-drawn': state.isDrawn })}>
      <div className="discard-tile">
        <div className="tile-analysis">
          {tileFaceSVG(state.tile)}
        </div>
        <span className="analysis-tile-name">{tileToString(state.tile)}</span>
        {state.isDrawn && <span className="drawn-tag">drawn</span>}
      </div>
      <div className="discard-stats">
        <span className="stat">
          Shanten: <strong>{state.shantenAfter}</strong>
        </span>
        <span className="stat">
          Accepts: <strong>{state.acceptance}</strong> types
        </span>
      </div>
      {state.yakuChanges.length > 0 && (
        <div className="yaku-changes">
          {state.yakuChanges.slice(0, 3).map((c: { name: string; change: number }) => (
            <span className={classes('change', { improve: c.change > 0, worsen: c.change <= 0 })}>
              {c.change > 0 ? '+' : ''}{c.change} {c.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default DiscardResult
