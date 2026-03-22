import { classes } from 'sygnal'
import { TileId } from '../../mahjong/types'
import { tileFaceSVG } from '../../mahjong/tileSVG'

type OpponentDiscardsContext = { phase: string }

function OpponentDiscards({ context, opponentDiscards, pendingDiscard }: {
  context?: OpponentDiscardsContext
  opponentDiscards: TileId[][]
  pendingDiscard: TileId | null
}) {
  const phase = context?.phase || 'user_discard'
  return (
    <section className="opponent-discards-section">
      <h2 className="section-label">Opponent Discards</h2>
      <div className="opponent-discards-grid">
        {[{name: '\u5317 North', idx: 2}, {name: '\u897F West', idx: 1}, {name: '\u5357 South', idx: 0}].map(({name, idx}: {name: string; idx: number}) => (
          <div className="opponent-pile">
            <h3>{name}</h3>
            <div className="discards-row">
              {(opponentDiscards[idx] || []).map((tile: TileId, tileIdx: number) => {
                const pile = opponentDiscards[idx] || []
                const isCallTarget = phase === 'call_decision' && pendingDiscard !== null && tile === pendingDiscard && tileIdx === pile.length - 1
                return (
                  <div className={classes('discard-tile-styled', { 'call-candidate': isCallTarget })}>
                    {tileFaceSVG(tile)}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default OpponentDiscards
