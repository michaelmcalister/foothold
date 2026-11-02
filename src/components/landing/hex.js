// Hex geometry for the landing page drawings: flat topped hexes, the same
// shape the hero map and the app use.

export const SQ3 = Math.sqrt(3)

// Polygon points for one hex centred on cx, cy. gap shrinks it a little so
// neighbours show a hairline of paper between them.
export function hexPoints(cx, cy, r, gap = 1) {
  const pts = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k
    pts.push(`${(cx + (r - gap) * Math.cos(a)).toFixed(1)},${(cy + (r - gap) * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

// A rectangular patch of hexes, cols by rows, with its top left hex at x0, y0.
export function hexGrid(cols, rows, r, x0 = 0, y0 = 0) {
  const out = []
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const cx = x0 + col * r * 1.5
      const cy = y0 + row * SQ3 * r + (col % 2 ? (SQ3 * r) / 2 : 0)
      out.push({ col, row, cx, cy, id: `${col}-${row}` })
    }
  }
  return out
}

// Hexes in rings around a centre: ring 0 is one hex, ring 1 adds six, and so on.
export function hexRings(cx, cy, r, rings) {
  const out = [{ cx, cy, ring: 0 }]
  const dirs = [[1.5, SQ3 / 2], [0, SQ3], [-1.5, SQ3 / 2], [-1.5, -SQ3 / 2], [0, -SQ3], [1.5, -SQ3 / 2]]
  for (let k = 1; k <= rings; k++) {
    let x = cx + dirs[4][0] * r * k
    let y = cy + dirs[4][1] * r * k
    for (let side = 0; side < 6; side++) {
      for (let s = 0; s < k; s++) {
        out.push({ cx: x, cy: y, ring: k })
        x += dirs[side][0] * r
        y += dirs[side][1] * r
      }
    }
  }
  return out
}

// Is a point inside a polygon of [x, y] pairs?
export function inside([x, y], poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
