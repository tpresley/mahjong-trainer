import { classes } from 'sygnal'

function YakuItem({ state }: { state: {
  japanese: string
  name: string
  han: number
  distance: number
}}) {
  return (
    <div className={classes('yaku-item', { achieved: state.distance === 0, close: state.distance > 0 && state.distance <= 2 })}>
      <div className="yaku-name">
        <strong>{state.japanese}</strong>
        <span className="yaku-english">{state.name}</span>
      </div>
      <div className="yaku-meta">
        <span className="yaku-han">{state.han} han</span>
        <span className={`yaku-distance dist-${Math.min(state.distance, 6)}`}>
          {state.distance === 0 ? 'Ready' : `${state.distance} away`}
        </span>
      </div>
    </div>
  )
}

export default YakuItem
