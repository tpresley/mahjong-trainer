import { GamePhase, ScoreResult } from '../../mahjong/types'
import ScoreYakuItem from '../ScoreYakuItem'

type ScoreDisplayProps = {
  phase: GamePhase
  scoreResult: ScoreResult | null
  winMethod: 'tsumo' | 'ron' | null
  ronFromOpponent: number | null
  opponentNames: string[]
}

export function ScoreDisplay({ phase, scoreResult, winMethod, ronFromOpponent, opponentNames }: ScoreDisplayProps) {
  if (phase !== 'hand_complete') return null

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
          <collection of={ScoreYakuItem} from="scoreYaku" />
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
