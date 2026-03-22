import { Collection } from 'sygnal'
import { ScoreResult } from '../../mahjong/types'
import ScoreYakuItem from '../ScoreYakuItem'

function ScoreDisplay({ state, context, scoreResult, winMethod, ronFromOpponent, opponentNames }: {
  state?: any
  context?: { phase: string }
  scoreResult: ScoreResult | null
  winMethod: 'tsumo' | 'ron' | null
  ronFromOpponent: number | null
  opponentNames: string[]
}) {
  if (context?.phase !== 'hand_complete') return <div className="score-display-hidden" />

  if (!scoreResult) {
    return (
      <div className="score-modal-overlay">
        <section className="score-section" style={{ borderColor: '#e74c3c' }}>
          <h2 style={{ color: '#e74c3c' }}>No Yaku!</h2>
          <p style={{ color: '#aaa' }}>Your hand has no valid yaku. No points scored.</p>
          <button className="new-hand-btn">New Hand</button>
        </section>
      </div>
    )
  }

  return (
    <div className="score-modal-overlay">
      <section className="score-section">
        <h2>{winMethod === 'ron' ? 'Ron!' : 'Tsumo!'} Hand Complete!</h2>
        <div className="score-yaku-list">
          <Collection of={ScoreYakuItem} from="scoreYaku" />
        </div>
        <div className="score-summary">
          <div className="score-han-fu">{scoreResult.totalHan} han / {scoreResult.fu} fu</div>
          {scoreResult.limitName && (
            <div className="score-limit">{scoreResult.limitName}</div>
          )}
          <div className="score-points">
            {scoreResult.totalPoints} points
            <span className="score-payment-detail">
              {winMethod === 'ron'
                ? ` (from ${opponentNames[ronFromOpponent || 0]})`
                : ` (each pays ${scoreResult.dealerTsumoEach})`}
            </span>
          </div>
        </div>
        <button className="new-hand-btn">New Hand</button>
      </section>
    </div>
  )
}

ScoreDisplay.intent = ({ DOM }: any) => ({
  NEW_HAND: DOM.click('.new-hand-btn'),
})

ScoreDisplay.model = {
  NEW_HAND: { PARENT: () => ({ type: 'NEW_HAND' }) },
}

export default ScoreDisplay
