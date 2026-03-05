import { TileId } from '../../mahjong/types'
import { tileColor, tileDisplayChar } from '../../mahjong/tiles'

type UserDiscardsProps = {
  discards: TileId[]
}

export function UserDiscards({ discards }: UserDiscardsProps) {
  return (
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
  )
}
