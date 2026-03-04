import { tileColor, tileDisplayChar } from '../mahjong/tiles'

function DiscardTile({ state }: { state: { value: number } }) {
  const tile = state.value
  return (
    <div className={`discard-tile-styled${tile === 33 ? ' chun' : ''}`} style={{ color: tileColor(tile) }}>
      <span className="tile-char-discard">{tileDisplayChar(tile)}</span>
    </div>
  )
}

export default DiscardTile
