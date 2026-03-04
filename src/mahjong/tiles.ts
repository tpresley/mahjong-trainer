import { TileId, HandCounts, SUIT_MAN, SUIT_PIN, SUIT_SOU } from './types'

const SUIT_NAMES = ['m', 'p', 's']
const HONOR_NAMES = ['East', 'South', 'West', 'North', 'Haku', 'Hatsu', 'Chun']
const SUIT_LABELS = ['Man', 'Pin', 'Sou']
const SUIT_COLORS = ['#c41e3a', '#1e6ec4', '#2e8b57']

export function tileToString(tile: TileId): string {
  if (tile < 27) {
    const suit = Math.floor(tile / 9)
    const num = (tile % 9) + 1
    return `${num}${SUIT_NAMES[suit]}`
  }
  return HONOR_NAMES[tile - 27]
}

export function tileSuit(tile: TileId): number {
  if (tile < 9) return SUIT_MAN
  if (tile < 18) return SUIT_PIN
  if (tile < 27) return SUIT_SOU
  return -1 // honor
}

export function tileNumber(tile: TileId): number {
  if (tile >= 27) return -1
  return (tile % 9) + 1
}

export function tileColor(tile: TileId): string {
  if (tile < 27) return SUIT_COLORS[Math.floor(tile / 9)]
  if (tile >= 31) {
    if (tile === 31) return '#666' // Haku
    if (tile === 32) return '#2e8b57' // Hatsu
    return '#c41e3a' // Chun
  }
  return '#333' // winds
}

export function tileSuitLabel(tile: TileId): string {
  if (tile < 27) return SUIT_LABELS[Math.floor(tile / 9)]
  return 'Honor'
}

export function tileDisplayChar(tile: TileId): string {
  if (tile < 9) return String.fromCodePoint(0x1F007 + tile)
  if (tile < 18) return String.fromCodePoint(0x1F019 + (tile - 9))
  if (tile < 27) return String.fromCodePoint(0x1F010 + (tile - 18))
  if (tile < 31) return String.fromCodePoint(0x1F000 + (tile - 27))
  if (tile === 31) return '\u{1F006}' // Haku (White)
  if (tile === 32) return '\u{1F005}' // Hatsu (Green)
  return '\u{1F004}\uFE0E' // Chun (Red) — force text presentation to match other tiles
}

export function isTerminal(tile: TileId): boolean {
  if (tile >= 27) return false
  const n = tile % 9
  return n === 0 || n === 8
}

export function isHonor(tile: TileId): boolean {
  return tile >= 27
}

export function isSimple(tile: TileId): boolean {
  return !isTerminal(tile) && !isHonor(tile)
}

export function handToCountArray(hand: TileId[]): HandCounts {
  const counts = new Array(34).fill(0)
  for (const tile of hand) counts[tile]++
  return counts
}

export function countArrayToHand(counts: HandCounts): TileId[] {
  const hand: TileId[] = []
  for (let i = 0; i < 34; i++) {
    for (let j = 0; j < counts[i]; j++) hand.push(i)
  }
  return hand
}

export function sortHand(hand: TileId[]): TileId[] {
  return [...hand].sort((a, b) => a - b)
}

// Generate a full wall (136 tiles: 4 of each type)
function createWall(): TileId[] {
  const wall: TileId[] = []
  for (let i = 0; i < 34; i++) {
    for (let j = 0; j < 4; j++) wall.push(i)
  }
  return wall
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function removeFromHand(hand: TileId[], tilesToRemove: TileId[]): TileId[] {
  const result = [...hand]
  for (const tile of tilesToRemove) {
    const idx = result.indexOf(tile)
    if (idx !== -1) result.splice(idx, 1)
  }
  return result
}

export function dealHand(): { hand: TileId[]; drawnTile: TileId; wall: TileId[] } {
  const shuffled = shuffle(createWall())
  return {
    hand: sortHand(shuffled.slice(0, 13)),
    drawnTile: shuffled[13],
    wall: shuffled.slice(14),
  }
}
