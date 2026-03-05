import { TileId, GamePhase, OpenMeld } from '../../mahjong/types'
import YakuItem from '../YakuItem'
import DiscardResult from '../DiscardResult'

type AnalysisGridProps = {
  openMelds: OpenMeld[]
  canDiscard: boolean
  drawnTile: TileId | null
  phase: GamePhase
}

export function AnalysisGrid({ openMelds, canDiscard, drawnTile, phase }: AnalysisGridProps) {
  return (
    <div className="analysis-grid">
      <section className="yaku-section">
        <h2>Yaku Distances</h2>
        <p className="section-hint">
          {openMelds.length > 0 ? 'Open hand \u2014 some yaku unavailable' : 'Analysis of your hand'}
        </p>
        <div className="yaku-list">
          <collection of={YakuItem} from="yakuDistances" />
        </div>
      </section>

      <section className="discard-section">
        <h2>Discard Analysis</h2>
        <p className="section-hint">
          {canDiscard && (drawnTile !== null || phase === 'post_call_discard')
            ? 'Shanten & acceptance after discarding each tile'
            : 'Discard a tile to continue'}
        </p>
        <div className="discard-list">
          <collection of={DiscardResult} from="discardResults" />
        </div>
      </section>
    </div>
  )
}
