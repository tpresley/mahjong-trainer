import { TileId } from './types'

// Suit colors
const MAN_COLOR = '#c41e3a'
const PIN_COLOR = '#1e6ec4'
const SOU_COLOR = '#2e8b57'
const WIND_COLOR = '#333333'
const HAKU_COLOR = '#666666'
const HATSU_COLOR = '#2e8b57'
const CHUN_COLOR = '#c41e3a'
const DORA_RED = '#c41e3a'

// Chinese numerals for Man tiles
const MAN_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

// Wind kanji
const WIND_KANJI = ['東', '南', '西', '北']

// ─── Man (Characters / 萬子) ────────────────────────────────────

function manSVG(num: number, color: string) {
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      <text x="30" y="24" text-anchor="middle" dominant-baseline="central"
            font-size="36" font-weight="bold" fill={color} font-family="serif">
        {MAN_KANJI[num - 1]}
      </text>
      <text x="30" y="56" text-anchor="middle" dominant-baseline="central"
            font-size="30" fill={color} font-family="serif">
        {'萬'}
      </text>
    </svg>
  )
}

// ─── Pin (Circles / 筒子) ───────────────────────────────────────

// Standard mahjong circle positions for viewBox 0 0 60 80
const PIN_LAYOUTS: Record<number, { positions: [number, number][]; r: number }> = {
  1: { positions: [[30, 40]], r: 12 },
  2: { positions: [[30, 26], [30, 54]], r: 9 },
  3: { positions: [[38, 20], [30, 40], [22, 60]], r: 8 },
  4: { positions: [[20, 26], [40, 26], [20, 54], [40, 54]], r: 8 },
  5: { positions: [[20, 22], [40, 22], [30, 40], [20, 58], [40, 58]], r: 7 },
  6: { positions: [[20, 17], [40, 17], [20, 42], [40, 42], [20, 66], [40, 66]], r: 7 },
  7: { positions: [[38, 14], [30, 26], [22, 38], [22, 54], [38, 54], [22, 68], [38, 68]], r: 6 },
  8: { positions: [[20, 14], [40, 14], [20, 32], [40, 32], [20, 50], [40, 50], [20, 68], [40, 68]], r: 6 },
  9: { positions: [[16, 16], [30, 16], [44, 16], [16, 40], [30, 40], [44, 40], [16, 64], [30, 64], [44, 64]], r: 6 },
}

function pinSVG(num: number, color: string) {
  const layout = PIN_LAYOUTS[num]
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      {layout.positions.map(([cx, cy]: [number, number]) => (
        <circle cx={String(cx)} cy={String(cy)} r={String(layout.r)}
                fill="none" stroke={color} stroke-width="2.5" />
      ))}
    </svg>
  )
}

// ─── Sou (Bamboo / 索子) ────────────────────────────────────────

function bambooStick(cx: number, top: number, h: number, color: string) {
  const w = 5
  return (
    <g>
      <rect x={String(cx - w / 2)} y={String(top)} width={String(w)} height={String(h)}
            rx="1" fill={color} />
      <line x1={String(cx - w / 2 - 1)} y1={String(top + h * 0.35)}
            x2={String(cx + w / 2 + 1)} y2={String(top + h * 0.35)}
            stroke={color} stroke-width="1.5" />
      <line x1={String(cx - w / 2 - 1)} y1={String(top + h * 0.65)}
            x2={String(cx + w / 2 + 1)} y2={String(top + h * 0.65)}
            stroke={color} stroke-width="1.5" />
    </g>
  )
}

// 1-sou: single bamboo stick
function sou1SVG(color: string) {
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      <rect x="27.5" y="12" width="5" height="56" rx="1" fill={color} />
      <line x1="25" y1="36" x2="35" y2="36" stroke={color} stroke-width="1.5" />
      <line x1="25" y1="52" x2="35" y2="52" stroke={color} stroke-width="1.5" />
    </svg>
  )
}

// Sou layouts: arrays of [cx, top] for each bamboo stick
type SouLayout = { sticks: [number, number][]; h: number }

const SOU_LAYOUTS: Record<number, SouLayout> = {
  2: { sticks: [[22, 16], [38, 16]], h: 48 },
  3: { sticks: [[16, 16], [30, 16], [44, 16]], h: 48 },
  4: { sticks: [[22, 8], [38, 8], [22, 44], [38, 44]], h: 28 },
  5: { sticks: [[20, 6], [40, 6], [30, 30], [20, 50], [40, 50]], h: 24 },
  6: { sticks: [[22, 6], [38, 6], [22, 30], [38, 30], [22, 54], [38, 54]], h: 20 },
  7: { sticks: [[30, 4], [16, 28], [30, 28], [44, 28], [16, 54], [30, 54], [44, 54]], h: 20 },
  9: { sticks: [[16, 4], [30, 4], [44, 4], [16, 30], [30, 30], [44, 30], [16, 56], [30, 56], [44, 56]], h: 18 },
}

// 8-sou: W over M with diagonal inner wands, tips touching
function sou8SVG(color: string) {
  const w = 5

  // Bamboo stick from (x1,y1) to (x2,y2) with cross-hatching
  function stick(x1: number, y1: number, x2: number, y2: number) {
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    const deg = Math.atan2(dx, dy) * 180 / Math.PI
    return (
      <g transform={`translate(${cx}, ${cy}) rotate(${deg})`}>
        <rect x={String(-w / 2)} y={String(-len / 2)} width={String(w)} height={String(len)}
              rx="1" fill={color} />
        <line x1={String(-w / 2 - 1)} y1={String(-len * 0.15)}
              x2={String(w / 2 + 1)} y2={String(-len * 0.15)}
              stroke={color} stroke-width="1.5" />
        <line x1={String(-w / 2 - 1)} y1={String(len * 0.15)}
              x2={String(w / 2 + 1)} y2={String(len * 0.15)}
              stroke={color} stroke-width="1.5" />
      </g>
    )
  }

  // Top W contact points: A(xL,wT) B(xM,wB) C(xR,wT)
  // Bottom M contact points: D(xL,mB) E(xM,mT) F(xR,mB)
  const xL = 12, xR = 48, xM = 30
  const wT = 4, wB = 36
  const mT = 44, mB = 76

  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      {/* Top W: | \ / | — tips touch at A, B, C */}
      {stick(xL, wT, xL, wB)}
      {stick(xL, wT, xM, wB)}
      {stick(xR, wT, xM, wB)}
      {stick(xR, wT, xR, wB)}
      {/* Bottom M: | / \ | — tips touch at D, E, F */}
      {stick(xL, mT, xL, mB)}
      {stick(xL, mB, xM, mT)}
      {stick(xR, mB, xM, mT)}
      {stick(xR, mT, xR, mB)}
    </svg>
  )
}

function souSVG(num: number, color: string) {
  if (num === 1) return sou1SVG(color)
  if (num === 8) return sou8SVG(color)
  const layout = SOU_LAYOUTS[num]
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      {layout.sticks.map(([cx, top]: [number, number]) =>
        bambooStick(cx, top, layout.h, color)
      )}
    </svg>
  )
}

// ─── Wind tiles ─────────────────────────────────────────────────

function windSVG(tile: TileId) {
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      <text x="30" y="40" text-anchor="middle" dominant-baseline="central"
            font-size="44" font-weight="bold" fill={WIND_COLOR} font-family="serif">
        {WIND_KANJI[tile - 27]}
      </text>
    </svg>
  )
}

// ─── Dragon tiles ───────────────────────────────────────────────

function hakuSVG() {
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
    </svg>
  )
}

function hatsuSVG() {
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      <text x="30" y="40" text-anchor="middle" dominant-baseline="central"
            font-size="46" font-weight="bold" fill={HATSU_COLOR} font-family="serif">
        {'發'}
      </text>
    </svg>
  )
}

function chunSVG() {
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      <text x="30" y="40" text-anchor="middle" dominant-baseline="central"
            font-size="46" font-weight="bold" fill={CHUN_COLOR} font-family="serif">
        {'中'}
      </text>
    </svg>
  )
}

// ─── Face-down tile (for ankan) ─────────────────────────────────

export function tileBackSVG() {
  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%">
      <rect x="5" y="5" width="50" height="70" rx="3"
            fill="#4a6fa5" stroke="#6b8fc0" stroke-width="1.5" />
    </svg>
  )
}

// ─── Main dispatch ──────────────────────────────────────────────

export function tileFaceSVG(tile: TileId, isDora: boolean = false) {
  // Man (Characters) 0-8
  if (tile < 9) {
    const num = tile + 1
    const color = (isDora && num === 5) ? DORA_RED : MAN_COLOR
    return manSVG(num, color)
  }
  // Pin (Circles) 9-17
  if (tile < 18) {
    const num = tile - 9 + 1
    const color = (isDora && num === 5) ? DORA_RED : PIN_COLOR
    return pinSVG(num, color)
  }
  // Sou (Bamboo) 18-26
  if (tile < 27) {
    const num = tile - 18 + 1
    const color = (isDora && num === 5) ? DORA_RED : SOU_COLOR
    return souSVG(num, color)
  }
  // Winds 27-30
  if (tile < 31) return windSVG(tile)
  // Dragons 31-33
  if (tile === 31) return hakuSVG()
  if (tile === 32) return hatsuSVG()
  return chunSVG()
}
