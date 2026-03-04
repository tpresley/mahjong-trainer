function ScoreYakuItem({ state }: { state: {
  japanese: string
  name: string
  han: number
}}) {
  return (
    <div className="score-yaku-item">
      <span className="score-yaku-name">{state.japanese} ({state.name})</span>
      <span className="score-yaku-han">{state.han} han</span>
    </div>
  )
}

export default ScoreYakuItem
