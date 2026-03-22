import { TileId, CallOption } from '../../mahjong/types'
import { tileToString } from '../../mahjong/tiles'
import { tileFaceSVG } from '../../mahjong/tileSVG'

function CallDecisionBanner({ context, pendingDiscard, callOptions }: {
  context?: { phase: string }
  pendingDiscard: TileId | null
  callOptions: CallOption[]
}) {
  if (context?.phase !== 'call_decision' || pendingDiscard === null) return <div className="call-banner-hidden" />

  return (
    <section className="call-banner">
      <div className="call-banner-info">
        <div className="tile-small">
          {tileFaceSVG(pendingDiscard)}
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
            <button className="call-chi-btn call-btn" data-combo={String(idx)}>
              Chi ({combo.map((t: TileId) => tileToString(t)).join(' + ')})
            </button>
          ))
        )}
        <button className="skip-call-btn call-btn call-btn-skip">Skip</button>
      </div>
    </section>
  )
}

CallDecisionBanner.intent = ({ DOM }: any) => ({
  PON: DOM.click('.call-pon-btn'),
  CHI: DOM.click('.call-chi-btn').data('combo', Number),
  DAIMINKAN: DOM.click('.call-daiminkan-btn'),
  RON: DOM.click('.call-ron-btn'),
  SKIP: DOM.click('.skip-call-btn'),
})

CallDecisionBanner.model = {
  PON: { PARENT: () => ({ type: 'CALL_PON' }) },
  CHI: { PARENT: (_s: any, idx: number) => ({ type: 'CALL_CHI', data: idx }) },
  DAIMINKAN: { PARENT: () => ({ type: 'CALL_DAIMINKAN' }) },
  RON: { PARENT: () => ({ type: 'CALL_RON' }) },
  SKIP: { PARENT: () => ({ type: 'SKIP_CALL' }) },
}

export default CallDecisionBanner
