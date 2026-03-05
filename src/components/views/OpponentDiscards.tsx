import { TileId, GamePhase } from '../../mahjong/types'
import { tileFaceSVG } from '../../mahjong/tileSVG'

type OpponentDiscardsProps = {
  opponentDiscards: TileId[][]
  phase: GamePhase
  pendingDiscard: TileId | null
}

export function OpponentDiscards({ opponentDiscards, phase, pendingDiscard }: OpponentDiscardsProps) {
  return (
    <section className="opponent-discards-section">
      <div className="opponent-discards-grid">
        {[{name: '\u5317 North', idx: 2}, {name: '\u897F West', idx: 1}, {name: '\u5357 South', idx: 0}].map(({name, idx}: {name: string; idx: number}) => (
          <div className="opponent-pile">
            <h3>{name}</h3>
            <div className="discards-row">
              {(opponentDiscards[idx] || []).map((tile: TileId, tileIdx: number) => {
                const pile = opponentDiscards[idx] || []
                const isCallTarget = phase === 'call_decision' && pendingDiscard !== null && tile === pendingDiscard && tileIdx === pile.length - 1
                return (
                  <div className={`discard-tile-styled${isCallTarget ? ' call-candidate' : ''}`}>
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
