import { TileId, GamePhase, CallOption } from '../../mahjong/types'
import { tileToString, tileColor, tileDisplayChar } from '../../mahjong/tiles'

type CallDecisionBannerProps = {
  phase: GamePhase
  pendingDiscard: TileId | null
  callOptions: CallOption[]
}

export function CallDecisionBanner({ phase, pendingDiscard, callOptions }: CallDecisionBannerProps) {
  if (phase !== 'call_decision' || pendingDiscard === null) return null

  return (
    <section className="call-banner">
      <div className="call-banner-info">
        <div className={`tile-small${pendingDiscard === 33 ? ' chun' : ''}`} style={{ color: tileColor(pendingDiscard) }}>
          <span className="tile-char-meld">{tileDisplayChar(pendingDiscard)}</span>
        </div>
        <span className="call-label">Opponent discarded <strong>{tileToString(pendingDiscard)}</strong></span>
      </div>
      <div className="call-buttons">
        {callOptions.some((c: CallOption) => c.type === 'ron') && (
          <button className="call-ron-btn call-btn">Ron</button>
        )}
        {callOptions.some((c: CallOption) => c.type === 'daiminkan') && (
          <button className="call-daiminkan-btn call-btn">Kan</button>
        )}
        {callOptions.some((c: CallOption) => c.type === 'pon') && (
          <button className="call-pon-btn call-btn">Pon</button>
        )}
        {callOptions.filter((c: CallOption) => c.type === 'chi').map((chiOpt: CallOption) =>
          chiOpt.handTiles.map((combo: TileId[], idx: number) => (
            <button className="call-chi-btn call-btn" attrs={{ 'data-combo': String(idx) }}>
              Chi ({combo.map((t: TileId) => tileToString(t)).join(' + ')})
            </button>
          ))
        )}
        <button className="skip-call-btn call-btn call-btn-skip">Skip</button>
      </div>
    </section>
  )
}
