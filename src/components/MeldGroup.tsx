import { classes } from 'sygnal'
import { TileId, OpenMeld } from '../mahjong/types'
import { tileFaceSVG, tileBackSVG } from '../mahjong/tileSVG'

function MeldGroup({ state, meld }: { state?: any; meld?: OpenMeld }) {
  const m = meld || state
  const meldLabel = m.type === 'pon' ? 'Pon' : m.type === 'chi' ? 'Chi' : 'Kan'
  const isAnkan = m.type === 'ankan'

  // Determine turned tile index based on opponent origin
  // kamicha(2)→left(0), toimen(1)→middle(1), shimocha(0)→right(2)
  let calledIndex = -1
  if (m.calledFrom !== undefined && m.calledTile !== null) {
    if (m.type === 'chi') {
      calledIndex = m.tiles.indexOf(m.calledTile)
    } else {
      calledIndex = 2 - m.calledFrom
    }
  }

  return (
    <div className="meld-group">
      <span className="meld-label">{meldLabel}</span>
      <div className="meld-tiles">
        {m.tiles.map((tile: TileId, tileIdx: number) => {
          const isFaceDown = isAnkan && (tileIdx === 0 || tileIdx === 3)
          const isCalled = tileIdx === calledIndex
          return (
            <div className={classes('tile-small', { 'called-tile': isCalled, 'face-down': isFaceDown })}>
              {isFaceDown ? tileBackSVG() : tileFaceSVG(tile)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MeldGroup
