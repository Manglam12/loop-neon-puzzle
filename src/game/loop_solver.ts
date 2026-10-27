import { PuzzleBoard, LoopGameState, Vector2i } from './loop_types.ts';
import { createInitialLoopState, executeTileTap } from './loop_engine.ts';

export interface LoopSolveResult {
  solvable: boolean;
  solutionMoves: Vector2i[];
  optimalSteps: number;
  statesExplored: number;
  hintMove: Vector2i | null;
}

function serializeState(state: LoopGameState): string {
  const size = state.board.size;
  const masks: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      masks.push(state.board.tiles[y][x].mask);
    }
  }
  const echoes = state.echoQueue
    .map((e) => `${e.x},${e.y}:${e.turnsRemaining}`)
    .sort()
    .join('|');
  return `${masks.join(',')};${echoes}`;
}

/**
 * Searches for a sequence of valid moves that solves the board under the exact Echo rules.
 * Uses Breadth-First Search (BFS) to guarantee finding the shortest/optimal solution path.
 */
export function solveLoopBoard(
  board: PuzzleBoard,
  maxDepth: number = 10,
  maxStates: number = 3000
): LoopSolveResult {
  const initialState = createInitialLoopState(board);

  // If already solved with 0 moves, flag it so generator can reject trivially solved boards
  if (initialState.isWon) {
    return {
      solvable: true,
      solutionMoves: [],
      optimalSteps: 0,
      statesExplored: 1,
      hintMove: null,
    };
  }

  // Find all rotatable tile positions
  const rotatableTiles: Vector2i[] = [];
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      if (board.tiles[y][x].role === 'WIRE') {
        rotatableTiles.push({ x, y });
      }
    }
  }

  if (rotatableTiles.length === 0) {
    return {
      solvable: false,
      solutionMoves: [],
      optimalSteps: -1,
      statesExplored: 0,
      hintMove: null,
    };
  }

  interface QueueItem {
    state: LoopGameState;
    moves: Vector2i[];
  }

  const queue: QueueItem[] = [{ state: initialState, moves: [] }];
  const visited = new Set<string>();
  visited.add(serializeState(initialState));

  let statesExplored = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    statesExplored++;

    if (current.moves.length >= maxDepth || statesExplored >= maxStates) {
      continue;
    }

    for (const tilePos of rotatableTiles) {
      const result = executeTileTap(current.state, tilePos.x, tilePos.y);
      if (!result.valid) continue;

      const nextMoves = [...current.moves, tilePos];

      if (result.winAchieved) {
        return {
          solvable: true,
          solutionMoves: nextMoves,
          optimalSteps: nextMoves.length,
          statesExplored,
          hintMove: nextMoves[0] || null,
        };
      }

      const key = serializeState(result.nextState);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          state: result.nextState,
          moves: nextMoves,
        });
      }
    }
  }

  return {
    solvable: false,
    solutionMoves: [],
    optimalSteps: -1,
    statesExplored,
    hintMove: null,
  };
}
