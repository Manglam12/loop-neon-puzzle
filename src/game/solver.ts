import { Direction, Chamber, GameState } from './types.ts';
import { createInitialState, executeMove } from './echo_engine.ts';

const DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

export interface SolveResult {
  solvable: boolean;
  solutionMoves: Direction[];
  optimalSteps: number;
  statesExplored: number;
}

function stateToKey(state: GameState): string {
  // Compress state into unique string
  const p = `${state.playerPosition.x},${state.playerPosition.y}`;
  const e = `${state.echoPosition.x},${state.echoPosition.y}`;
  // Only recent moves up to echoDelay affect future echo
  const recentMoves = state.moveHistory.slice(-state.chamber.echoDelay).join('');
  const gates = Object.entries(state.gates)
    .map(([k, g]) => `${k}:${g.isOpen ? 1 : 0}`)
    .sort()
    .join('|');
  return `${p}#${e}#${recentMoves}#${state.coresCollected}#${gates}`;
}

export function solveChamber(chamber: Chamber, maxDepth: number = 18, maxStates: number = 2500): SolveResult {
  const initialState = createInitialState(chamber);

  // Quick check if initial state is already win (e.g. 0 moves)
  if (initialState.isWon) {
    return { solvable: true, solutionMoves: [], optimalSteps: 0, statesExplored: 1 };
  }

  interface QueueNode {
    state: GameState;
    moves: Direction[];
  }

  const queue: QueueNode[] = [{ state: initialState, moves: [] }];
  const visited = new Set<string>();
  visited.add(stateToKey(initialState));

  let statesExplored = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    statesExplored++;

    if (current.moves.length >= maxDepth || statesExplored >= maxStates) {
      continue;
    }

    for (const dir of DIRECTIONS) {
      const result = executeMove(current.state, dir);

      if (!result.valid || result.nextState.isGameOver) {
        continue;
      }

      if (result.nextState.isWon) {
        return {
          solvable: true,
          solutionMoves: [...current.moves, dir],
          optimalSteps: current.moves.length + 1,
          statesExplored,
        };
      }

      const key = stateToKey(result.nextState);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          state: result.nextState,
          moves: [...current.moves, dir],
        });
      }
    }
  }

  return {
    solvable: false,
    solutionMoves: [],
    optimalSteps: -1,
    statesExplored,
  };
}
