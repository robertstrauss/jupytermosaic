import {
  DEFAULT_SCROLL_SIZE,
  IGroupState,
  buildTree,
  collectCells,
  divergeDepth,
  findGroup,
  groupKey,
  rowFloors,
  solve
} from '../MosaicTree';

const noState = (): IGroupState => ({});
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
    expect(s.colWeights).toHaveLength(1);
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
    expect(s.colWeights).toHaveLength(2);
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
    expect(s.colWeights).toHaveLength(4);

    expect(s.placements.get(0)).toMatchObject({ colStart: 1, colEnd: 3 });
    expect(s.placements.get(1)).toMatchObject({ colStart: 3, colEnd: 5 });
    expect(s.placements.get(2)).toMatchObject({ colStart: 1, colEnd: 2 });
    expect(s.placements.get(3)).toMatchObject({ colStart: 2, colEnd: 4 });
    expect(s.placements.get(4)).toMatchObject({ colStart: 4, colEnd: 5 });

    // The two rows still occupy separate bands.
    expect(s.placements.get(0)!.rowStart).toBe(1);
    expect(s.placements.get(2)!.rowStart).toBe(2);
  });

  it('gives column weights that sum to one', () => {
    const s = solve(tree([['a'], ['a'], ['a']]));
    const total = s.colWeights.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('honours weights when splitting an axis', () => {
    const root = buildTree(
      [['a'], ['a']],
      index => (index === 0 ? 3 : 1),
      noState
    );
    const s = solve(root);
    expect(s.colWeights[0]).toBeCloseTo(0.75, 10);
    expect(s.colWeights[1]).toBeCloseTo(0.25, 10);
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
