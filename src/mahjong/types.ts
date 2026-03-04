// Tile type IDs (0-33)
// 0-8: Man (Characters) 1m-9m
// 9-17: Pin (Circles) 1p-9p
// 18-26: Sou (Bamboo) 1s-9s
// 27: East, 28: South, 29: West, 30: North
// 31: Haku (White), 32: Hatsu (Green), 33: Chun (Red)

export type TileId = number // 0-33
export type HandCounts = number[] // length 34, count of each tile type

export type YakuInfo = {
  name: string
  japanese: string
  distance: number // how many tile swaps away
  han: number
}

export type DiscardAnalysis = {
  tileIndex: number
  tile: TileId
  shantenAfter: number // best shanten after discarding this + optimal draw
  acceptance: number // how many tile types improve the hand after this discard
  yakuChanges: { name: string; change: number }[]
}

export type HandAnalysis = {
  shanten: number
  yakuDistances: YakuInfo[]
}

export type MeldType = 'pon' | 'chi' | 'ankan' | 'daiminkan' | 'shouminkan'

export type OpenMeld = {
  type: MeldType
  tiles: TileId[]            // 3 tiles for pon/chi, 4 tiles for kan types
  calledTile: TileId | null  // null for ankan (no called tile)
  fromHand: TileId[]         // tiles taken from user's hand
}

export type CallOption = {
  type: 'pon' | 'chi' | 'daiminkan' | 'ron'
  calledTile: TileId
  handTiles: TileId[][] // possible hand tile combinations
}

export type SelfKanOption = {
  type: 'ankan' | 'shouminkan'
  tile: TileId            // the tile type being kanned
  meldIndex?: number      // for shouminkan: index of the pon meld being upgraded
}

export type GamePhase =
  | 'user_discard'
  | 'riichi_discard'
  | 'opponent_turn'
  | 'call_decision'
  | 'post_call_discard'
  | 'hand_complete'
  | 'wall_exhausted'

export type WaitType = 'ryanmen' | 'shanpon' | 'kanchan' | 'penchan' | 'tanki'

export type ScoreParams = {
  winTile: TileId
  isTsumo: boolean
  isDealer: boolean
  seatWind: TileId      // 27=East, 28=South, 29=West, 30=North
  roundWind: TileId     // 27=East for now
  isRiichi: boolean
  isRinshan: boolean    // win on kan replacement draw
  isIppatsu: boolean    // win within first go-around after riichi
  isHaitei: boolean     // last tile situation (tsumo=Haitei, ron=Houtei)
  isDoubleRiichi: boolean // riichi declared on first turn
}

export type ScoreYaku = {
  name: string
  japanese: string
  han: number
  open: boolean
}

export type ScoreResult = {
  yaku: ScoreYaku[]
  totalHan: number
  fu: number
  basePoints: number
  dealerTsumoEach: number  // each non-dealer pays this
  limitName: string | null // 'mangan', 'haneman', 'baiman', 'sanbaiman', 'yakuman'
  waitType: WaitType
  isClosed: boolean
  isTsumo: boolean
  isDealer: boolean
  totalPoints: number      // total points won
}

export const SUIT_MAN = 0
export const SUIT_PIN = 1
export const SUIT_SOU = 2

export const TERMINALS = [0, 8, 9, 17, 18, 26] // 1m,9m,1p,9p,1s,9s
export const HONORS = [27, 28, 29, 30, 31, 32, 33]
export const TERMINALS_AND_HONORS = [...TERMINALS, ...HONORS]
