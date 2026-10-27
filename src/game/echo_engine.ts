import { Direction, Position, Chamber, GameState, TileType, GateData, SwitchData } from './types.ts';

export const DIRECTION_VECTORS: Record<Direction, Position> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

export const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export function isSamePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function createInitialState(chamber: Chamber): GameState {
  // Deep clone gates & switches
  const gates: Record<string, GateData> = {};
  for (const [key, val] of Object.entries(chamber.gates)) {
    gates[key] = { ...val };
  }

  const switches: Record<string, SwitchData> = {};
  for (const [key, val] of Object.entries(chamber.switches)) {
    switches[key] = { ...val };
  }

  return {
    chamber,
    playerPosition: { ...chamber.playerStart },
    echoPosition: { ...chamber.echoStart },
    moveHistory: [],
    echoHistory: [],
    stepCount: 0,
    coresCollected: 0,
    isGoalUnlocked: chamber.totalCores === 0,
    isWon: false,
    isGameOver: false,
    gameOverReason: null,
    gates,
    switches,
    score: 0,
    combo: 1,
    bestCombo: 1,
  };
}

export interface MoveResult {
  nextState: GameState;
  valid: boolean;
  collectedCore: boolean;
  triggeredSwitch: boolean;
  resonanceBurst: boolean;
  echoMoved: boolean;
  echoDirection: Direction | null;
}

export function executeMove(currentState: GameState, direction: Direction): MoveResult {
  if (currentState.isWon || currentState.isGameOver) {
    return {
      nextState: currentState,
      valid: false,
      collectedCore: false,
      triggeredSwitch: false,
      resonanceBurst: false,
      echoMoved: false,
      echoDirection: null,
    };
  }

  const { chamber, playerPosition, echoPosition, moveHistory, echoHistory, gates, switches } = currentState;
  const vector = DIRECTION_VECTORS[direction];

  const candidatePlayerPos: Position = {
    x: playerPosition.x + vector.x,
    y: playerPosition.y + vector.y,
  };

  // 1. Boundary & Wall check
  if (
    candidatePlayerPos.x < 0 ||
    candidatePlayerPos.x >= chamber.width ||
    candidatePlayerPos.y < 0 ||
    candidatePlayerPos.y >= chamber.height
  ) {
    return {
      nextState: currentState,
      valid: false,
      collectedCore: false,
      triggeredSwitch: false,
      resonanceBurst: false,
      echoMoved: false,
      echoDirection: null,
    };
  }

  const targetTile = chamber.tiles[candidatePlayerPos.y][candidatePlayerPos.x];
  if (targetTile === 'WALL') {
    return {
      nextState: currentState,
      valid: false,
      collectedCore: false,
      triggeredSwitch: false,
      resonanceBurst: false,
      echoMoved: false,
      echoDirection: null,
    };
  }

  // 2. Check if gate is closed
  const gateKey = `${candidatePlayerPos.x},${candidatePlayerPos.y}`;
  const targetGate = gates[gateKey];
  if (targetGate && !targetGate.isOpen) {
    return {
      nextState: currentState,
      valid: false,
      collectedCore: false,
      triggeredSwitch: false,
      resonanceBurst: false,
      echoMoved: false,
      echoDirection: null,
    };
  }

  // New move history
  const nextMoveHistory = [...moveHistory, direction];
  let nextPlayerPos = candidatePlayerPos;
  let nextEchoPos = { ...echoPosition };
  let echoMoved = false;
  let echoDirection: Direction | null = null;

  // Clone gates & switches for modification
  const nextGates: Record<string, GateData> = {};
  for (const [k, v] of Object.entries(gates)) {
    nextGates[k] = { ...v };
  }
  const nextSwitches: Record<string, SwitchData> = {};
  for (const [k, v] of Object.entries(switches)) {
    nextSwitches[k] = { ...v };
  }

  // 3. Process Echo Movement (reproduces player's action after echoDelay moves)
  if (nextMoveHistory.length >= chamber.echoDelay) {
    const rawEchoDir = nextMoveHistory[nextMoveHistory.length - chamber.echoDelay];
    // Check if echo is on an INVERTER tile
    const currentEchoTile = chamber.tiles[echoPosition.y][echoPosition.x];
    echoDirection = (currentEchoTile === 'INVERTER') ? OPPOSITE_DIRECTIONS[rawEchoDir] : rawEchoDir;

    const echoVector = DIRECTION_VECTORS[echoDirection];
    const candidateEchoPos: Position = {
      x: echoPosition.x + echoVector.x,
      y: echoPosition.y + echoVector.y,
    };

    // Validate echo movement
    if (
      candidateEchoPos.x >= 0 &&
      candidateEchoPos.x < chamber.width &&
      candidateEchoPos.y >= 0 &&
      candidateEchoPos.y < chamber.height
    ) {
      const echoTargetTile = chamber.tiles[candidateEchoPos.y][candidateEchoPos.x];
      const echoGateKey = `${candidateEchoPos.x},${candidateEchoPos.y}`;
      const echoTargetGate = nextGates[echoGateKey];

      // Echo can move unless blocked by a wall or closed gate
      if (echoTargetTile !== 'WALL' && (!echoTargetGate || echoTargetGate.isOpen)) {
        nextEchoPos = candidateEchoPos;
        echoMoved = true;
      }
    }
  }

  const nextEchoHistory = echoDirection ? [...echoHistory, echoDirection] : [...echoHistory];

  // 4. Switch Triggers: Check if either player or echo landed on a switch
  let triggeredSwitch = false;
  const playerSwitchKey = `${nextPlayerPos.x},${nextPlayerPos.y}`;
  const echoSwitchKey = `${nextEchoPos.x},${nextEchoPos.y}`;

  for (const [posKey, switchData] of Object.entries(nextSwitches)) {
    const isPlayerOnSwitch = posKey === playerSwitchKey;
    const isEchoOnSwitch = posKey === echoSwitchKey && echoMoved;

    if (isPlayerOnSwitch || isEchoOnSwitch) {
      // Toggle switch and all gates assigned to it
      triggeredSwitch = true;
      nextSwitches[posKey] = {
        ...switchData,
        isPressed: true,
      };

      for (const [gKey, gData] of Object.entries(nextGates)) {
        if (gData.switchId === switchData.id) {
          nextGates[gKey] = {
            ...gData,
            isOpen: !gData.isOpen,
          };
        }
      }
    } else {
      nextSwitches[posKey] = {
        ...switchData,
        isPressed: false,
      };
    }
  }

  // 5. Check if a Gate just closed on the player or echo
  const playerCurrentGateKey = `${nextPlayerPos.x},${nextPlayerPos.y}`;
  if (nextGates[playerCurrentGateKey] && !nextGates[playerCurrentGateKey].isOpen) {
    return {
      nextState: {
        ...currentState,
        playerPosition: nextPlayerPos,
        echoPosition: nextEchoPos,
        gates: nextGates,
        switches: nextSwitches,
        isGameOver: true,
        gameOverReason: 'Crushed by a closing Quantum Gate!',
      },
      valid: true,
      collectedCore: false,
      triggeredSwitch,
      resonanceBurst: false,
      echoMoved,
      echoDirection,
    };
  }

  // 6. Check Hazards
  let isGameOver = false;
  let gameOverReason: string | null = null;

  if (chamber.tiles[nextPlayerPos.y][nextPlayerPos.x] === 'HAZARD') {
    isGameOver = true;
    gameOverReason = 'Stepped into a Temporal Laser Hazard!';
  } else if (echoMoved && chamber.tiles[nextEchoPos.y][nextEchoPos.x] === 'HAZARD') {
    isGameOver = true;
    gameOverReason = 'Your Echo was destroyed by a Laser Hazard!';
  }

  // 7. Check Cores
  let collectedCore = false;
  let nextCoresCollected = currentState.coresCollected;
  let nextScore = currentState.score + 10; // 10 base points per valid move
  let nextCombo = currentState.combo;

  if (targetTile === 'CORE') {
    // Check if this core wasn't already collected (using a set or tile override)
    // To keep it immutable, chamber has original tiles; we can track collected positions or count
    collectedCore = true;
    nextCoresCollected += 1;
    nextCombo = currentState.combo + 1;
    nextScore += 150 * nextCombo;
  }

  // 8. Check Resonance Burst (Player & Echo land on the exact same tile)
  let resonanceBurst = false;
  if (isSamePosition(nextPlayerPos, nextEchoPos) && echoMoved) {
    resonanceBurst = true;
    nextCombo += 1;
    nextScore += 300 * nextCombo;
  }

  const isGoalUnlocked = nextCoresCollected >= chamber.totalCores;
  let isWon = false;

  // 9. Win condition: Stepping on EXIT with goal unlocked
  if (targetTile === 'EXIT' && isGoalUnlocked && !isGameOver) {
    isWon = true;
    nextScore += 500 * nextCombo;
    // Par efficiency bonus:
    const stepDiff = Math.max(0, chamber.optimalMoves * 2 - (currentState.stepCount + 1));
    nextScore += stepDiff * 50;
  }

  const nextState: GameState = {
    ...currentState,
    playerPosition: nextPlayerPos,
    echoPosition: nextEchoPos,
    moveHistory: nextMoveHistory,
    echoHistory: nextEchoHistory,
    stepCount: currentState.stepCount + 1,
    coresCollected: nextCoresCollected,
    isGoalUnlocked,
    isWon,
    isGameOver,
    gameOverReason,
    gates: nextGates,
    switches: nextSwitches,
    score: nextScore,
    combo: nextCombo,
    bestCombo: Math.max(currentState.bestCombo, nextCombo),
  };

  return {
    nextState,
    valid: true,
    collectedCore,
    triggeredSwitch,
    resonanceBurst,
    echoMoved,
    echoDirection,
  };
}
