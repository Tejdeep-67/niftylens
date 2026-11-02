// Squarified treemap (Bruls, Huizing & van Wijk, 2000).
// Takes items with a `value` and a rectangle, returns the items with x, y, w, h.
// Idea: lay items out in rows along the shorter side of the remaining rectangle,
// and keep adding items to the current row while that makes the worst aspect ratio better.

function worst(row, side) {
  const s = row.reduce((a, r) => a + r.area, 0);
  let max = 0;
  for (const r of row) {
    const ratio = Math.max((side * side * r.area) / (s * s), (s * s) / (side * side * r.area));
    if (ratio > max) max = ratio;
  }
  return max;
}

export function squarify(items, x, y, w, h) {
  const total = items.reduce((a, it) => a + Math.max(it.value, 0), 0);
  if (!total || w <= 0 || h <= 0) return [];
  const scale = (w * h) / total;
  const queue = items
    .filter((it) => it.value > 0)
    .map((it) => ({ item: it, area: it.value * scale }))
    .sort((a, b) => b.area - a.area);

  const out = [];
  let rect = { x, y, w, h };
  let row = [];

  const layoutRow = (row) => {
    const s = row.reduce((a, r) => a + r.area, 0);
    if (rect.w >= rect.h) {
      // column on the left
      const colW = s / rect.h;
      let cy = rect.y;
      for (const r of row) {
        const rh = r.area / colW;
        out.push({ ...r.item, x: rect.x, y: cy, w: colW, h: rh });
        cy += rh;
      }
      rect = { x: rect.x + colW, y: rect.y, w: rect.w - colW, h: rect.h };
    } else {
      // row on top
      const rowH = s / rect.w;
      let cx = rect.x;
      for (const r of row) {
        const rw = r.area / rowH;
        out.push({ ...r.item, x: cx, y: rect.y, w: rw, h: rowH });
        cx += rw;
      }
      rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH };
    }
  };

  while (queue.length) {
    const next = queue[0];
    const side = Math.min(rect.w, rect.h);
    if (row.length === 0 || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      queue.shift();
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length) layoutRow(row);
  return out;
}

// two levels: sectors first, then the stocks inside each sector
export function nestedTreemap(groups, w, h, pad = 2, header = 0) {
  const sectors = squarify(groups.map((g) => ({ ...g, value: g.children.reduce((a, c) => a + c.value, 0) })), 0, 0, w, h);
  return sectors.map((s) => {
    const innerH = Math.max(s.h - header - pad * 2, 0);
    const children = squarify(s.children, s.x + pad, s.y + header + pad, Math.max(s.w - pad * 2, 0), innerH);
    return { ...s, children };
  });
}
