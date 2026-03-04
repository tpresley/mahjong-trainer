import { TileId } from '../mahjong/types'
import { tileColor, tileDisplayChar } from '../mahjong/tiles'

function MeldGroup({ state }: { state: {
  type: string
  tiles: TileId[]
  calledTile: TileId | null
}}) {
  const meldLabel = state.type === 'pon' ? 'Pon' : state.type === 'chi' ? 'Chi' : 'Kan'
  const isAnkan = state.type === 'ankan'

  return (
    <div className="meld-group">
      <span className="meld-label">{meldLabel}</span>
      <div className="meld-tiles">
        {state.tiles.map((tile: TileId, tileIdx: number) => {
          const isFaceDown = isAnkan && (tileIdx === 0 || tileIdx === 3)
          const isCalled = state.calledTile !== null && tile === state.calledTile
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
