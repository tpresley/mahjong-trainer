import { TileId, CallOption, SelfKanOption, OpenMeld } from './types'
import { handToCountArray, tileNumber } from './tiles'

/**
 * Detect available pon, chi, and daiminkan call options for a given hand and opponent discard.
 */
export function detectCallOptions(hand: TileId[], discardedTile: TileId): CallOption[] {
  const options: CallOption[] = []
  const counts = handToCountArray(hand)

  // Daiminkan: need 3 of the discarded tile in hand
  if (counts[discardedTile] >= 3) {
    const kanTiles: TileId[] = []
    for (const t of hand) {
      if (t === discardedTile && kanTiles.length < 3) kanTiles.push(t)
    }
    options.push({
      type: 'daiminkan',
      calledTile: discardedTile,
      handTiles: [kanTiles],
    })
  }

  // Pon: need 2+ of the discarded tile in hand
  if (counts[discardedTile] >= 2) {
    const ponTiles: TileId[] = []
    for (const t of hand) {
      if (t === discardedTile && ponTiles.length < 2) ponTiles.push(t)
    }
    options.push({
      type: 'pon',
      calledTile: discardedTile,
      handTiles: [ponTiles],
    })
  }

  // Chi: only for number tiles (0-26), need two tiles forming a sequence with the discard
  if (discardedTile < 27) {
    const num = tileNumber(discardedTile) // 1-9
    const suit = Math.floor(discardedTile / 9)
    const base = suit * 9
    const chiCombos: TileId[][] = []

    // Pattern: [discard-2, discard-1, discard] — e.g. discard=5, need 3+4
    if (num >= 3) {
      const t1 = discardedTile - 2
      const t2 = discardedTile - 1
      if (counts[t1] > 0 && counts[t2] > 0) {
        chiCombos.push([t1, t2])
      }
    }

    // Pattern: [discard-1, discard, discard+1] — e.g. discard=5, need 4+6
    if (num >= 2 && num <= 8) {
      const t1 = discardedTile - 1
      const t2 = discardedTile + 1
      if (t1 >= base && t2 < base + 9 && counts[t1] > 0 && counts[t2] > 0) {
        chiCombos.push([t1, t2])
      }
    }

    // Pattern: [discard, discard+1, discard+2] — e.g. discard=5, need 6+7
    if (num <= 7) {
      const t1 = discardedTile + 1
      const t2 = discardedTile + 2
      if (t1 < base + 9 && t2 < base + 9 && counts[t1] > 0 && counts[t2] > 0) {
        chiCombos.push([t1, t2])
      }
    }

    if (chiCombos.length > 0) {
      options.push({
        type: 'chi',
        calledTile: discardedTile,
        handTiles: chiCombos,
      })
    }
  }

  return options
}

/**
 * Detect available ankan and shouminkan options during the user's turn.
 */
export function detectSelfKanOptions(
  hand: TileId[],
  drawnTile: TileId | null,
  openMelds: OpenMeld[],
): SelfKanOption[] {
  const options: SelfKanOption[] = []

  // Full hand includes drawn tile
  const fullHand = drawnTile !== null && drawnTile !== undefined
    ? [...hand, drawnTile]
    : hand
  const counts = handToCountArray(fullHand)

  // Ankan: 4 identical tiles in the closed hand
  for (let t = 0; t < 34; t++) {
    if (counts[t] === 4) {
      options.push({ type: 'ankan', tile: t })
    }
  }

  // Shouminkan: player has 4th tile matching an existing pon meld
  for (let i = 0; i < openMelds.length; i++) {
    const meld = openMelds[i]
    if (meld.type === 'pon') {
      const ponTile = meld.tiles[0] // all 3 tiles are the same type in a pon
      if (counts[ponTile] > 0) {
        options.push({ type: 'shouminkan', tile: ponTile, meldIndex: i })
      }
    }
  }

  return options
}
