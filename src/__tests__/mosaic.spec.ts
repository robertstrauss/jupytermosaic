import {
  DEFAULT_SCROLL_SIZE,
  ISolution,
  axisAtDepth,
  IGroupState,
  buildTree,
  collectCells,
  divergeDepth,
  findGroup,
  flexFactors,
  groupKey,
  nearestInDirection,
  rowFloors,
  solve,
  subdividePath
} from '../MosaicTree';

const noState = (): IGroupState => ({});

/** Content-track weights, ignoring any gutter tracks. */
const weightsOf = (s: ISolution) =>
  s.colTracks.filter(t => !t.gutter).map(t => t.weight);
const unitWeight = () => 1;

const tree = (
  paths: (string[] | undefined)[],
  state: (path: string[]) => IGroupState = noState
) => buildTree(paths, unitWeight, state);

describe('buildTree', () => {
  it('puts unpathed cells directly under the root column', () => {
    const root = tree([[], [], []]);
    expect(root.axis).toBe('col');
    expect(root.children).toHaveLength(3);
    expect(root.children.every(c => c.kind === 'cell')).toBe(true);
  });

  it('treats missing metadata as the root path', () => {
    const root = tree([undefined, undefined]);
    expect(collectCells(root)).toEqual([0, 1]);
  });

  it('alternates axis with depth', () => {
    const root = tree([['a'], ['a', 'b']]);
    const a = findGroup(root, ['a'])!;
    expect(a.axis).toBe('row');
    expect(findGroup(root, ['a', 'b'])!.axis).toBe('col');
  });

  it('splits a group that is interrupted in the linear order', () => {
    // Cells 0 and 2 name the same group but are not adjacent, so they cannot
    // share a tile without reordering the notebook.
    const root = tree([['a'], [], ['a']]);
    expect(root.children).toHaveLength(3);
    expect(root.children[0].kind).toBe('group');
    expect(root.children[1].kind).toBe('cell');
    expect(root.children[2].kind).toBe('group');
  });

  it('reads mode and size from group state', () => {
    const root = tree([['a']], path =>
      path[0] === 'a' ? { mode: 'scroll', size: 200 } : {}
    );
    const a = findGroup(root, ['a'])!;
    expect(a.mode).toBe('scroll');
    expect(a.size).toBe(200);
  });

  it('defaults a group to flowing at the default scroll size', () => {
    const a = findGroup(tree([['a']]), ['a'])!;
    expect(a.mode).toBe('flow');
    expect(a.size).toBe(DEFAULT_SCROLL_SIZE);
  });
});

describe('solve', () => {
  it('lays a plain notebook out as one column of rows', () => {
    const s = solve(tree([[], [], []]));
    expect(weightsOf(s)).toHaveLength(1);
    expect(s.rowMinPx).toHaveLength(3);
    expect(s.placements.get(0)).toEqual({
      rowStart: 1,
      rowEnd: 2,
      colStart: 1,
      colEnd: 2
    });
    expect(s.placements.get(2)!.rowStart).toBe(3);
  });

  it('lays a row out across columns of a single band', () => {
    const s = solve(tree([['a'], ['a']]));
    expect(weightsOf(s)).toHaveLength(2);
    expect(s.rowMinPx).toHaveLength(1);
    expect(s.placements.get(0)).toEqual({
      rowStart: 1,
      rowEnd: 2,
      colStart: 1,
      colEnd: 2
    });
    expect(s.placements.get(1)!.colStart).toBe(2);
  });

  it('splits tracks at every cut rather than at a common multiple', () => {
    // A 2-wide row above a 3-wide row. Boundaries are 0, 1/3, 1/2, 2/3, 1 --
    // four tracks, not the six a least-common-multiple scheme would emit.
    const s = solve(tree([['a'], ['a'], ['b'], ['b'], ['b']]));
    expect(weightsOf(s)).toHaveLength(4);

    expect(s.placements.get(0)).toMatchObject({ colStart: 1, colEnd: 3 });
    expect(s.placements.get(1)).toMatchObject({ colStart: 3, colEnd: 5 });
    expect(s.placements.get(2)).toMatchObject({ colStart: 1, colEnd: 2 });
    expect(s.placements.get(3)).toMatchObject({ colStart: 2, colEnd: 4 });
    expect(s.placements.get(4)).toMatchObject({ colStart: 4, colEnd: 5 });

    // The two rows still occupy separate bands, now with a gutter between them
    // because both children of the root are groups.
    expect(s.placements.get(0)!.rowStart).toBe(1);
    expect(s.placements.get(2)!.rowStart).toBeGreaterThan(
      s.placements.get(0)!.rowEnd
    );
  });

  it('gives column weights that sum to one', () => {
    const s = solve(tree([['a'], ['a'], ['a']]));
    const total = weightsOf(s).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('honours weights when splitting an axis', () => {
    const root = buildTree(
      [['a'], ['a']],
      index => (index === 0 ? 3 : 1),
      noState
    );
    const s = solve(root);
    expect(weightsOf(s)[0]).toBeCloseTo(0.75, 10);
    expect(weightsOf(s)[1]).toBeCloseTo(0.25, 10);
  });

  it('makes a scrolling group opaque to the grid', () => {
    // Without the 'scroll' mode this nested column would cut the row band in
    // two; as a managed group it contributes no cuts at all.
    const state = (path: string[]): IGroupState =>
      path.join('/') === 'a/b' ? { mode: 'scroll', size: 150 } : {};
    const s = solve(tree([['a', 'b'], ['a', 'b'], ['a']], state));

    expect(s.rowMinPx).toHaveLength(1);
    expect(s.managed).toHaveLength(1);
    expect(s.managed[0].node.path).toEqual(['a', 'b']);
    expect(s.managed[0].cells).toEqual([0, 1]);

    // Its cells are positioned against the group's area, not their own.
    expect(s.managedOwner.get(0)).toBe(s.managed[0]);
    expect(s.managedOwner.get(1)).toBe(s.managed[0]);
    expect(s.managedOwner.get(2)).toBeUndefined();
  });

  it('holds a vertical scrolling group open at its stored size', () => {
    // 'a' is a row, so its child column 'a/b' is what scrolls vertically.
    const s = solve(
      tree([['a', 'b'], ['a', 'b']], p =>
        p.join('/') === 'a/b' ? { mode: 'scroll', size: 240 } : {}
      )
    );
    expect(s.rowMinPx[0]).toBeCloseTo(240, 6);
  });

  it('spreads a scrolling group\'s size across the bands it spans', () => {
    // The scrolling column sits beside a cell that splits the band in two, so
    // its stored height is shared between both row tracks.
    const s = solve(
      tree([['a', 'b'], ['a', 'b'], ['a', 'c'], ['a', 'c']], p =>
        p.join('/') === 'a/b' ? { mode: 'scroll', size: 200 } : {}
      )
    );
    const spanned = s.rowMinPx.filter(v => v > 0);
    expect(spanned).toHaveLength(2);
    expect(spanned.reduce((x, y) => x + y, 0)).toBeCloseTo(200, 6);
  });

  it('reports a placement for every group so chrome can be drawn', () => {
    const s = solve(tree([['a'], ['a']]));
    expect(s.groupPlacements.has(groupKey([]))).toBe(true);
    expect(s.groupPlacements.get(groupKey(['a']))!.placement).toEqual({
      rowStart: 1,
      rowEnd: 2,
      colStart: 1,
      colEnd: 3
    });
  });

  it('nests managed groups innermost-owner-first', () => {
    const state = (path: string[]): IGroupState =>
      path.length > 0 ? { mode: 'scroll' } : {};
    const s = solve(tree([['a', 'b'], ['a', 'b']], state));
    expect(s.managed.map(m => m.node.path.length)).toEqual([1, 2]);
    // The innermost group owns the cell.
    expect(s.managedOwner.get(0)!.node.path).toEqual(['a', 'b']);
  });
});

describe('divergeDepth', () => {
  it('counts the shared prefix', () => {
    expect(divergeDepth(['a', 'b', 'c'], ['a', 'b', 'd'])).toBe(2);
    expect(divergeDepth(['a'], ['b'])).toBe(0);
    expect(divergeDepth(['a', 'b'], ['a', 'b'])).toBe(2);
    expect(divergeDepth([], ['a'])).toBe(0);
    expect(divergeDepth(undefined, undefined)).toBe(0);
  });
});

describe('rowFloors', () => {
  // Regression: `auto` tracks collapse when windowing detaches a cell, which
  // shrank the document (riding the "add a cell" footer up to the top) and made
  // the render range cull cells that were on screen.
  it('reserves space for every cell, measured or not', () => {
    const s = solve(tree([[], [], []]));
    const floors = rowFloors(s, i => [100, 200, 50][i]);
    expect(floors).toEqual([100, 200, 50]);
  });

  it('keeps a detached cell\'s band open at its last measured height', () => {
    const s = solve(tree([[], []]));
    // Cell 1 is culled and reports nothing new; its floor is still reserved.
    const floors = rowFloors(s, i => (i === 1 ? 180 : 60));
    expect(floors[1]).toBe(180);
    expect(floors.reduce((a, b) => a + b, 0)).toBe(240);
  });

  it('takes the tallest cell in a shared band', () => {
    const s = solve(tree([['a'], ['a']]));
    expect(rowFloors(s, i => (i === 0 ? 40 : 130))).toEqual([130]);
  });

  it('spreads a cell that spans several bands across them', () => {
    // Cell 2 spans the whole row beside a nested column of two cells.
    const s = solve(tree([['a', 'b'], ['a', 'b'], ['a']]));
    const spanning = s.placements.get(2)!;
    expect(spanning.rowEnd - spanning.rowStart).toBe(2);

    const floors = rowFloors(s, i => (i === 2 ? 300 : 40));
    expect(floors).toHaveLength(2);
    expect(floors.reduce((a, b) => a + b, 0)).toBe(300);
  });

  it('leaves managed cells to their group\'s reserved size', () => {
    const s = solve(
      tree([['a', 'b'], ['a', 'b']], p =>
        p.join('/') === 'a/b' ? { mode: 'scroll', size: 150 } : {}
      )
    );
    // A tall cell inside the scrolling group must not stretch the outer band.
    expect(rowFloors(s, () => 900)).toEqual([150]);
  });
});

describe('nearestInDirection', () => {
  const rect = (x0: number, y0: number, x1: number, y1: number) => ({
    x0,
    y0,
    x1,
    y1
  });

  // A column of three cells on the left, beside a row of two on the right:
  //
  //   +----0----+----3----+
  //   +----1----+         +
  //   +----2----+----4----+
  const column = [
    { index: 0, rect: rect(0, 0, 100, 50) },
    { index: 1, rect: rect(0, 50, 100, 100) },
    { index: 2, rect: rect(0, 100, 100, 150) }
  ];
  const beside = [
    { index: 3, rect: rect(100, 0, 200, 75) },
    { index: 4, rect: rect(100, 75, 200, 150) }
  ];
  const all = [...column, ...beside];

  it('steps to the next sibling down a column', () => {
    expect(nearestInDirection(column[0].rect, all, 'down')).toBe(1);
    expect(nearestInDirection(column[1].rect, all, 'up')).toBe(0);
  });

  it('stops at the edge', () => {
    expect(nearestInDirection(column[0].rect, all, 'up')).toBeNull();
    expect(nearestInDirection(beside[1].rect, all, 'right')).toBeNull();
  });

  it('crosses sideways to the neighbour nearest in height', () => {
    // Cell 0 spans y 0-50, so of the two tiles to its right, 3 (y 0-75) is the
    // closer in height; cell 2 (y 100-150) should reach 4 instead.
    expect(nearestInDirection(column[0].rect, all, 'right')).toBe(3);
    expect(nearestInDirection(column[2].rect, all, 'right')).toBe(4);
  });

  it('crosses back to the neighbour nearest in height', () => {
    expect(nearestInDirection(beside[0].rect, all, 'left')).toBe(0);
    expect(nearestInDirection(beside[1].rect, all, 'left')).toBe(2);
  });

  it('prefers the nearest band over the best-aligned distant cell', () => {
    // A perfectly aligned cell far to the right must not beat a near one.
    const near = { index: 1, rect: rect(110, 200, 150, 260) };
    const farButAligned = { index: 2, rect: rect(400, 0, 500, 50) };
    const from = rect(0, 0, 100, 50);
    expect(nearestInDirection(from, [near, farButAligned], 'right')).toBe(1);
  });

  it('accepts a neighbour whose edge exactly touches ours', () => {
    // Track offsets carry the grid gap inside them, so boxes derived from the
    // solved layout abut exactly. A neighbour at gap zero must be reachable.
    const from = rect(0, 0, 100, 50);
    const touching = { index: 1, rect: rect(100, 0, 200, 50) };
    expect(nearestInDirection(from, [touching], 'right')).toBe(1);
  });

  it('ignores cells that merely overlap the starting rect', () => {
    const overlapping = { index: 1, rect: rect(50, 0, 150, 50) };
    const from = rect(0, 0, 100, 50);
    expect(nearestInDirection(from, [overlapping], 'right')).toBeNull();
  });

  it('breaks alignment ties by notebook order', () => {
    const from = rect(0, 0, 100, 50);
    const a = { index: 5, rect: rect(100, 0, 200, 50) };
    const b = { index: 2, rect: rect(100, 0, 200, 50) };
    expect(nearestInDirection(from, [a, b], 'right')).toBe(2);
  });
});

describe('subdividePath', () => {
  it('joins the containing group when it already runs the right way', () => {
    // A cell at the root sits in a column, so adding below just joins it.
    expect(subdividePath([], 'col', 'new')).toEqual([]);
    // A cell one level down sits in a row, so adding to the side joins it.
    expect(subdividePath(['a'], 'row', 'new')).toEqual(['a']);
  });

  it('subdivides when the direction crosses the group axis', () => {
    // Adding to the left of a cell in a column makes a row of two.
    expect(subdividePath([], 'row', 'new')).toEqual(['new']);
    // Adding below a cell in a row makes a column of two.
    expect(subdividePath(['a'], 'col', 'new')).toEqual(['a', 'new']);
  });

  it('produces a group whose axis matches the requested one', () => {
    for (const depth of [0, 1, 2, 3]) {
      const path = Array.from({ length: depth }, (_, i) => `g${i}`);
      for (const axis of ['row', 'col'] as const) {
        const result = subdividePath(path, axis, 'new');
        // The new cell's containing group must run along the wanted axis.
        expect(axisAtDepth(result.length)).toBe(axis);
      }
    }
  });
});

describe('flexFactors', () => {
  // Regression: CSS Grid 12.7.1 clamps a below-one flex sum up to one, so once
  // a column froze at its minimum width the remaining tracks took only part of
  // the leftover space and the rest of the row sat blank -- snapping out to
  // full width only once the container grew enough to unfreeze the track.
  it('scales the smallest weight to one', () => {
    expect(flexFactors([0.5, 0.5])).toEqual([1, 1]);
    expect(flexFactors([0.9, 0.1])).toEqual([9, 1]);
  });

  it('keeps the sum at or above one however many tracks freeze', () => {
    const factors = flexFactors([0.25, 0.25, 0.25, 0.25]);
    // Any subset that still contains a track sums to at least one, so the
    // flexible remainder always absorbs the leftover space.
    for (let frozen = 0; frozen < factors.length; frozen++) {
      const remaining = factors.slice(frozen);
      expect(remaining.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
    }
  });

  it('preserves the ratios between tracks', () => {
    const factors = flexFactors([0.6, 0.3, 0.1]);
    expect(factors[0] / factors[1]).toBeCloseTo(2, 10);
    expect(factors[1] / factors[2]).toBeCloseTo(3, 10);
  });

  it('survives degenerate weights', () => {
    expect(flexFactors([])).toEqual([]);
    expect(flexFactors([0, 0])).toEqual([1, 1]);
    expect(flexFactors([0, 0.5])).toEqual([1, 1]);
  });

  it('gives a real layout factors that all reach one', () => {
    // A 2-wide row above a 3-wide row: four tracks of differing widths.
    const s = solve(tree([['a'], ['a'], ['b'], ['b'], ['b']]));
    const factors = flexFactors(weightsOf(s));
    expect(Math.min(...factors)).toBeCloseTo(1, 10);
    expect(factors.every(f => f >= 1)).toBe(true);
  });
});

describe('gutters', () => {
  it('adds none when siblings are plain cells', () => {
    expect(solve(tree([[], [], []])).gutters).toHaveLength(0);
    expect(solve(tree([['a'], ['a']])).gutters).toHaveLength(0);
  });

  it('adds none where a cell sits beside a group', () => {
    // Dropping on the cell already reaches the seam, so no gutter is needed.
    const s = solve(tree([[], ['a'], ['a']]));
    expect(s.gutters).toHaveLength(0);
  });

  it('adds one between two adjacent groups', () => {
    // Two rows stacked in the root column: nothing lies on the seam between
    // them, so there is otherwise no way to drop a cell in between.
    const s = solve(tree([['a'], ['a'], ['b'], ['b']]));
    expect(s.gutters).toHaveLength(1);
    const [gutter] = s.gutters;
    expect(gutter.path).toEqual([]);
    expect(gutter.axis).toBe('col');
    expect(gutter.index).toBe(1);
    // A drop lands immediately before the first cell of the following group.
    expect(gutter.cellAfter).toBe(2);
  });

  it('gives the gutter a track of its own', () => {
    const plain = solve(tree([['a'], ['a'], [], []]));
    const gutted = solve(tree([['a'], ['a'], ['b'], ['b']]));
    expect(plain.rowTracks.filter(t => t.gutter)).toHaveLength(0);
    expect(gutted.rowTracks.filter(t => t.gutter)).toHaveLength(1);
    // Same two bands of content either way, plus the gutter track.
    expect(gutted.rowTracks).toHaveLength(3);
  });

  it('separates the two sides across the gutter track', () => {
    const s = solve(tree([['a'], ['a'], ['b'], ['b']]));
    const above = s.placements.get(0)!;
    const below = s.placements.get(2)!;
    // The group above ends before the gutter and the one below starts after,
    // leaving exactly one track between them.
    expect(below.rowStart - above.rowEnd).toBe(1);
    expect(s.rowTracks[above.rowEnd - 1].gutter).toBe(true);
  });

  it('runs a vertical gutter between two columns in a row', () => {
    // A row whose two children are both columns.
    const s = solve(tree([['r', 'a'], ['r', 'a'], ['r', 'b'], ['r', 'b']]));
    const vertical = s.gutters.filter(g => g.axis === 'row');
    expect(vertical).toHaveLength(1);
    expect(vertical[0].path).toEqual(['r']);
    expect(s.colTracks.filter(t => t.gutter)).toHaveLength(1);
  });

  it('keeps track floors off the gutter', () => {
    const s = solve(tree([['a'], ['a'], ['b'], ['b']]));
    const floors = rowFloors(s, () => 100);
    const gutterTrack = s.rowTracks.findIndex(t => t.gutter);
    expect(floors[gutterTrack]).toBe(0);
    // The content bands still carry the full cell height each.
    expect(floors.filter((_, i) => i !== gutterTrack)).toEqual([100, 100]);
  });
});
