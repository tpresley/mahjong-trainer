import type { Component } from 'sygnal'

type ScoreYakuItemState = {
  japanese: string
  name: string
  han: number
}

const ScoreYakuItem: Component<ScoreYakuItemState> = ({ state }) => {
  return (
    <div className="score-yaku-item">
      <span className="score-yaku-name">{state.japanese} ({state.name})</span>
      <span className="score-yaku-han">{state.han} han</span>
    </div>
  )
}

export default ScoreYakuItem
