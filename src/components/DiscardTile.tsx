import type { Component } from 'sygnal'
import { tileFaceSVG } from '../mahjong/tileSVG'

type DiscardTileState = { value: number }

const DiscardTile: Component<DiscardTileState> = ({ state }) => {
  const tile = state.value
  return (
    <div className="discard-tile-styled">
      {tileFaceSVG(tile)}
    </div>
  )
}

export default DiscardTile
