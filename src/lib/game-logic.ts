export const SIZE = 4;
export type Grid = number[][];
export type Direction = 'U' | 'D' | 'L' | 'R';

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((r) => r.slice());
}

export function emptyCells(g: Grid): Array<[number, number]> {
  const cs: Array<[number, number]> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === 0) cs.push([r, c]);
    }
  }
  return cs;
}

export function addRandomTile(g: Grid): boolean {
  const cs = emptyCells(g);
  if (!cs.length) return false;
  const [r, c] = cs[Math.floor(Math.random() * cs.length)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function slideRowLeft(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter((v) => v !== 0);
  let gained = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      gained += filtered[i];
      filtered.splice(i + 1, 1);
    }
  }
  while (filtered.length < SIZE) filtered.push(0);
  return { row: filtered, gained };
}

function rotateCW(g: Grid): Grid {
  const n = g.length;
  const out = emptyGrid();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][n - 1 - r] = g[r][c];
    }
  }
  return out;
}

export function applyMove(grid: Grid, dir: Direction): { grid: Grid; gained: number; changed: boolean } {
  let g = cloneGrid(grid);
  let rotations = 0;
  if (dir === 'U') {
    g = rotateCW(rotateCW(rotateCW(g)));
    rotations = 3;
  } else if (dir === 'R') {
    g = rotateCW(rotateCW(g));
    rotations = 2;
  } else if (dir === 'D') {
    g = rotateCW(g);
    rotations = 1;
  }

  let totalGained = 0;
  let changed = false;
  for (let r = 0; r < SIZE; r++) {
    const before = g[r].join(',');
    const { row, gained } = slideRowLeft(g[r]);
    g[r] = row;
    totalGained += gained;
    if (row.join(',') !== before) changed = true;
  }

  for (let i = 0; i < (4 - rotations) % 4; i++) g = rotateCW(g);

  return { grid: g, gained: totalGained, changed };
}

export function hasMoves(g: Grid): boolean {
  if (emptyCells(g).length) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = g[r][c];
      if (r + 1 < SIZE && g[r + 1][c] === v) return true;
      if (c + 1 < SIZE && g[r][c + 1] === v) return true;
    }
  }
  return false;
}

export function maxTile(g: Grid): number {
  let m = 0;
  for (const row of g) for (const v of row) if (v > m) m = v;
  return m;
}
