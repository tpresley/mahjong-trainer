import { tileFaceSVG } from '../mahjong/tileSVG'

function DiscardTile({ state }: { state: { value: number } }) {
  const tile = state.value
  return (
    <div className="discard-tile-styled">
      {tileFaceSVG(tile)}
    </div>
  )
}

export default DiscardTile
