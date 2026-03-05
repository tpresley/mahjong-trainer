import { TileId } from '../../mahjong/types'
import { tileFaceSVG } from '../../mahjong/tileSVG'

type UserDiscardsProps = {
  discards: TileId[]
}

export function UserDiscards({ discards }: UserDiscardsProps) {
  return (
    <section className="user-discards-section">
      <h2>Your Discards</h2>
      <div className="discards-row">
        {discards.map((tile: TileId) => (
          <div className="discard-tile-styled">
            {tileFaceSVG(tile)}
          </div>
        ))}
      </div>
    </section>
  )
}
