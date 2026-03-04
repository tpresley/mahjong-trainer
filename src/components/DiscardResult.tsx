import { tileToString, tileColor, tileDisplayChar } from '../mahjong/tiles'

function DiscardResult({ state }: { state: {
  tile: number
  shantenAfter: number
  acceptance: number
  yakuChanges: { name: string; change: number }[]
  isDrawn: boolean
}}) {
  return (
    <div className={`discard-item ${state.isDrawn ? 'is-drawn' : ''}`}>
      <div className="discard-tile">
        <div className={`tile-analysis${state.tile === 33 ? ' chun' : ''}`} style={{ color: tileColor(state.tile) }}>
          <span className="tile-char-analysis">{tileDisplayChar(state.tile)}</span>
        </div>
        <span className="analysis-tile-name">{tileToString(state.tile)}</span>
        {state.isDrawn && <span className="drawn-tag">drawn</span>}
      </div>
      <div className="discard-stats">
        <span className="stat">
          Shanten: <strong>{state.shantenAfter}</strong>
        </span>
        <span className="stat">
          Accepts: <strong>{state.acceptance}</strong> types
        </span>
      </div>
      {state.yakuChanges.length > 0 && (
        <div className="yaku-changes">
          {state.yakuChanges.slice(0, 3).map((c: { name: string; change: number }) => (
            <span className={`change ${c.change > 0 ? 'improve' : 'worsen'}`}>
              {c.change > 0 ? '+' : ''}{c.change} {c.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default DiscardResult
