export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export type TileType = 
  | 'EMPTY'
  | 'WALL'
  | 'CORE'
  | 'SWITCH'
  | 'GATE'
  | 'HAZARD'
  | 'INVERTER'
  | 'EXIT';

export interface GateData {
  id: string;
  isOpen: boolean;
  switchId: string; // ID of switch that controls this gate
}

export interface SwitchData {
  id: string;
  isPressed: boolean;
  color: string;
}

export interface Chamber {
  id: number;
  seed: number;
  width: number;
  height: number;
  tiles: TileType[][];
  playerStart: Position;
  echoStart: Position;
  echoDelay: number; // e.g. 2 moves
  gates: Record<string, GateData>; // key: "x,y"
  switches: Record<string, SwitchData>; // key: "x,y"
  totalCores: number;
  optimalMoves: number;
  sectorName: string;
}

export interface GameState {
  chamber: Chamber;
  playerPosition: Position;
  echoPosition: Position;
  moveHistory: Direction[];
  echoHistory: Direction[];
  stepCount: number;
  coresCollected: number;
  isGoalUnlocked: boolean;
  isWon: boolean;
  isGameOver: boolean;
  gameOverReason: string | null;
  gates: Record<string, GateData>;
  switches: Record<string, SwitchData>;
  score: number;
  combo: number;
  bestCombo: number;
}

export interface VisualTheme {
  id: string;
  name: string;
  description: string;
  requiredSectors: number;
  isUnlocked: boolean;
  bgDark: string;
  bgLight: string;
  playerColor: string;
  echoColor: string;
  coreColor: string;
  gateColor: string;
  switchColor: string;
  hazardColor: string;
  accentColor: string;
}
