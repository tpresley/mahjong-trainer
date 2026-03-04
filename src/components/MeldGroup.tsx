import { TileId } from '../mahjong/types'
import { tileColor, tileDisplayChar } from '../mahjong/tiles'

function MeldGroup({ state }: { state: {
  type: string
  tiles: TileId[]
  calledTile: TileId | null
  calledFrom?: number
}}) {
  const meldLabel = state.type === 'pon' ? 'Pon' : state.type === 'chi' ? 'Chi' : 'Kan'
  const isAnkan = state.type === 'ankan'

  // Determine turned tile index based on opponent origin
  // kamicha(2)→left(0), toimen(1)→middle(1), shimocha(0)→right(2)
  let calledIndex = -1
  if (state.calledFrom !== undefined && state.calledTile !== null) {
    if (state.type === 'chi') {
      // Chi: called tile at its natural sorted position
      calledIndex = state.tiles.indexOf(state.calledTile)
    } else {
      // Pon/Kan: position indicates which opponent the tile came from
      calledIndex = 2 - state.calledFrom
    }
  }

  return (
    <div className="meld-group">
      <span className="meld-label">{meldLabel}</span>
      <div className="meld-tiles">
        {state.tiles.map((tile: TileId, tileIdx: number) => {
          const isFaceDown = isAnkan && (tileIdx === 0 || tileIdx === 3)
          const isCalled = tileIdx === calledIndex
          return (
            <div className={`tile-small${isCalled ? ' called-tile' : ''}${isFaceDown ? ' face-down' : ''}${tile === 33 && !isFaceDown ? ' chun' : ''}`}
                 style={{ color: isFaceDown ? 'transparent' : tileColor(tile) }}>
              <span className="tile-char-meld">{isFaceDown ? '\u{1F02B}' : tileDisplayChar(tile)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MeldGroup
