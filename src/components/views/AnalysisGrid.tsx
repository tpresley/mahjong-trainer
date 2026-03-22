import { Collection } from 'sygnal'
import { TileId, OpenMeld } from '../../mahjong/types'
import YakuItem from '../YakuItem'
import DiscardResult from '../DiscardResult'

type AnalysisContext = { phase: string }

function AnalysisGrid({ state, context, openMelds, canDiscard, drawnTile }: {
  state?: any
  context?: AnalysisContext
  openMelds: OpenMeld[]
  canDiscard: boolean
  drawnTile: TileId | null
}) {
  const phase = context?.phase || 'user_discard'
  return (
    <div className="analysis-grid">
      <section className="yaku-section">
        <h2 className="section-label">Yaku Distances</h2>
        <p className="section-hint">
          {openMelds.length > 0 ? 'Open hand \u2014 some yaku unavailable' : 'Analysis of your hand'}
        </p>
        <div className="yaku-list">
          <Collection of={YakuItem} from="yakuDistances" />
        </div>
      </section>

      <section className="discard-section">
        <h2 className="section-label">Discard Analysis</h2>
        <p className="section-hint">
          {canDiscard && (drawnTile !== null || phase === 'post_call_discard')
            ? 'Shanten & acceptance after discarding each tile'
            : 'Discard a tile to continue'}
        </p>
        <div className="discard-list">
          <Collection of={DiscardResult} from="discardResults" />
        </div>
      </section>
    </div>
  )
}

export default AnalysisGrid
