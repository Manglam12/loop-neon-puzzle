import {
  DIR_NORTH,
  DIR_EAST,
  DIR_SOUTH,
  DIR_WEST,
  Vector2i,
  TileData,
  PuzzleBoard,
  EchoAction,
  LoopGameState,
} from './loop_types.ts';

export const DIRECTIONS: { bit: number; dx: number; dy: number; oppositeBit: number }[] = [
  { bit: DIR_NORTH, dx: 0, dy: -1, oppositeBit: DIR_SOUTH },
  { bit: DIR_EAST,  dx: 1, dy: 0,  oppositeBit: DIR_WEST },
  { bit: DIR_SOUTH, dx: 0, dy: 1,  oppositeBit: DIR_NORTH },
  { bit: DIR_WEST,  dx: -1, dy: 0, oppositeBit: DIR_EAST },
];

/**
 * Rotates a 4-bit connection mask clockwise by 90 degrees per turn.
 * N(1) -> E(2) -> S(4) -> W(8) -> N(1)
 */
export function rotateMask(mask: number, turns: number = 1): number {
  let m = mask & 0b1111;
  const t = ((turns % 4) + 4) % 4;
  for (let i = 0; i < t; i++) {
    let next = 0;
    if (m & DIR_NORTH) next |= DIR_EAST;
    if (m & DIR_EAST)  next |= DIR_SOUTH;
    if (m & DIR_SOUTH) next |= DIR_WEST;
    if (m & DIR_WEST)  next |= DIR_NORTH;
    m = next;
  }
  return m;
}

/**
 * Checks if tile A connects to tile B in direction d (North, East, South, West).
 * Both tiles must have reciprocal connection bits active!
 */
export function canConnect(maskA: number, maskB: number, dirBit: number): boolean {
  const d = DIRECTIONS.find((dir) => dir.bit === dirBit);
  if (!d) return false;
  return (maskA & d.bit) !== 0 && (maskB & d.oppositeBit) !== 0;
}

/**
 * Checks if coordinates are within the board boundaries.
 */
export function isInside(x: number, y: number, size: number): boolean {
  return x >= 0 && x < size && y >= 0 && y < size;
}

/**
 * Flood-fills the circuit starting from startPos across reciprocal connections.
 * Marks tiles as powered and determines if goalPos is connected.
 */
export function computePoweredCircuit(
  tiles: TileData[][],
  startPos: Vector2i,
  goalPos: Vector2i,
  size: number
): { isGoalConnected: boolean; poweredCoords: Set<string>; pathList: Vector2i[] } {
  const poweredCoords = new Set<string>();
  const pathList: Vector2i[] = [];
  const queue: Vector2i[] = [startPos];

  const startKey = `${startPos.x},${startPos.y}`;
  poweredCoords.add(startKey);
  pathList.push(startPos);

  let isGoalConnected = false;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === goalPos.x && cur.y === goalPos.y) {
      isGoalConnected = true;
    }

    const curTile = tiles[cur.y][cur.x];

    for (const dir of DIRECTIONS) {
      if ((curTile.mask & dir.bit) === 0) continue;

      const nx = cur.x + dir.dx;
      const ny = cur.y + dir.dy;

      if (!isInside(nx, ny, size)) continue;

      const nKey = `${nx},${ny}`;
      if (poweredCoords.has(nKey)) continue;

      const nextTile = tiles[ny][nx];
      // Reciprocal check: next tile must point back towards cur
      if ((nextTile.mask & dir.oppositeBit) !== 0) {
        poweredCoords.add(nKey);
        pathList.push({ x: nx, y: ny });
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return { isGoalConnected, poweredCoords, pathList };
}

/**
 * Creates initial game state for a puzzle board with fresh power calculations.
 */
export function createInitialLoopState(board: PuzzleBoard): LoopGameState {
  // Deep clone tile grid
  const tiles: TileData[][] = board.tiles.map((row) =>
    row.map((t) => ({ ...t, isPowered: false, rotationAngle: 0 }))
  );

  const { isGoalConnected, poweredCoords, pathList } = computePoweredCircuit(
    tiles,
    board.startPos,
    board.goalPos,
    board.size
  );

  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      tiles[y][x].isPowered = poweredCoords.has(`${x},${y}`);
    }
  }

  const freshBoard: PuzzleBoard = {
    ...board,
    tiles,
  };

  return {
    board: freshBoard,
    moveCount: 0,
    echoQueue: [],
    isWon: isGoalConnected,
    poweredPath: pathList,
    isGoalConnected,
    history: [],
    starsEarned: 0,
  };
}

export interface PlayerMoveResult {
  nextState: LoopGameState;
  echoTriggered: boolean;
  echoCell: Vector2i | null;
  winAchieved: boolean;
  valid: boolean;
}

/**
 * Executes a player tap on tile (x, y).
 * Applies clockwise 90 degree rotation to the tapped tile.
 * Decrements existing Echo delays and applies any Echo that reaches 0.
 * Enqueues the player's move into the Echo queue.
 */
export function executeTileTap(state: LoopGameState, targetX: number, targetY: number): PlayerMoveResult {
  if (state.isWon || !isInside(targetX, targetY, state.board.size)) {
    return {
      nextState: state,
      echoTriggered: false,
      echoCell: null,
      winAchieved: false,
      valid: false,
    };
  }

  const board = state.board;
  const currentTile = board.tiles[targetY][targetX];

  // START and GOAL tiles are fixed anchors and cannot be rotated
  if (currentTile.role === 'START' || currentTile.role === 'GOAL' || currentTile.role === 'EMPTY') {
    return {
      nextState: state,
      echoTriggered: false,
      echoCell: null,
      winAchieved: false,
      valid: false,
    };
  }

  // 1. Clone tiles grid
  const nextTiles: TileData[][] = board.tiles.map((row) => row.map((t) => ({ ...t })));

  // 2. Rotate the player's chosen tile 90 deg clockwise
  nextTiles[targetY][targetX].mask = rotateMask(nextTiles[targetY][targetX].mask, 1);
  nextTiles[targetY][targetX].rotationAngle += Math.PI / 2;

  // 3. Process the Echo Queue
  let echoTriggered = false;
  let triggeredEchoCell: Vector2i | null = null;
  const nextEchoQueue: EchoAction[] = [];

  for (const echo of state.echoQueue) {
    const remaining = echo.turnsRemaining - 1;
    if (remaining <= 0) {
      // Echo triggers on this tile!
      nextTiles[echo.y][echo.x].mask = rotateMask(nextTiles[echo.y][echo.x].mask, 1);
      nextTiles[echo.y][echo.x].rotationAngle += Math.PI / 2;
      echoTriggered = true;
      triggeredEchoCell = { x: echo.x, y: echo.y };
    } else {
      nextEchoQueue.push({ ...echo, turnsRemaining: remaining });
    }
  }

  // 4. Enqueue this player move into Echo queue if echoDelay > 0
  if (board.echoDelay > 0) {
    nextEchoQueue.push({
      x: targetX,
      y: targetY,
      turnsRemaining: board.echoDelay,
    });
  }

  // 5. Recompute circuit connectivity
  const { isGoalConnected, poweredCoords, pathList } = computePoweredCircuit(
    nextTiles,
    board.startPos,
    board.goalPos,
    board.size
  );

  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      nextTiles[y][x].isPowered = poweredCoords.has(`${x},${y}`);
    }
  }

  const nextMoveCount = state.moveCount + 1;
  const isWon = isGoalConnected;

  // Calculate stars (3 stars if within par, 2 stars if within par+2, 1 star otherwise)
  let stars = 0;
  if (isWon) {
    const par = board.authorMovesPar || board.targetMoves || 6;
    if (nextMoveCount <= par) stars = 3;
    else if (nextMoveCount <= par + 3) stars = 2;
    else stars = 1;
  }

  const nextState: LoopGameState = {
    board: {
      ...board,
      tiles: nextTiles,
    },
    moveCount: nextMoveCount,
    echoQueue: nextEchoQueue,
    isWon,
    poweredPath: pathList,
    isGoalConnected,
    history: [...state.history, { x: targetX, y: targetY }],
    starsEarned: stars,
  };

  return {
    nextState,
    echoTriggered,
    echoCell: triggeredEchoCell,
    winAchieved: isWon,
    valid: true,
  };
}
