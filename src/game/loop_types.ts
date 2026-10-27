export const DIR_NORTH = 1; // 0001
export const DIR_EAST  = 2; // 0010
export const DIR_SOUTH = 4; // 0100
export const DIR_WEST  = 8; // 1000

export interface Vector2i {
  x: number;
  y: number;
}

export type TileRole = 'EMPTY' | 'WIRE' | 'START' | 'GOAL';

export interface TileData {
  x: number;
  y: number;
  mask: number; // 0..15 bitmask of connections (N=1, E=2, S=4, W=8)
  role: TileRole;
  isPowered: boolean; // Computed by flood-fill from START
  rotationAngle: number; // For smooth visual animation in radians
}

export interface EchoAction {
  x: number;
  y: number;
  turnsRemaining: number;
}

export interface PuzzleBoard {
  id: string;
  name: string;
  size: number; // Grid width/height (e.g. 3, 4, 5)
  startPos: Vector2i;
  goalPos: Vector2i;
  tiles: TileData[][];
  echoDelay: number;
  targetMoves: number;
  authorMovesPar?: number;
}

export interface LoopGameState {
  board: PuzzleBoard;
  moveCount: number;
  echoQueue: EchoAction[];
  isWon: boolean;
  poweredPath: Vector2i[];
  isGoalConnected: boolean;
  history: { x: number; y: number }[];
  starsEarned: number;
}

export interface LevelMetadata {
  levelNumber: number;
  name: string;
  size: number;
  echoDelay: number;
  parMoves: number;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  bestMoves: number;
}
