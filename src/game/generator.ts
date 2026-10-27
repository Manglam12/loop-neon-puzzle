import { Chamber, TileType, Position, GateData, SwitchData } from './types.ts';
import { solveChamber } from './solver.ts';

// Deterministic Mulberry32 PRNG
export function createRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Handcrafted tutorial chambers for immediate accessible learning
export const TUTORIAL_CHAMBERS: Chamber[] = [
  {
    id: 1,
    seed: 101,
    width: 5,
    height: 5,
    sectorName: 'Sector 0-A: Ignition',
    playerStart: { x: 1, y: 3 },
    echoStart: { x: 1, y: 3 },
    echoDelay: 2,
    totalCores: 1,
    optimalMoves: 4,
    gates: {},
    switches: {},
    tiles: [
      ['WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
      ['WALL', 'EMPTY', 'CORE', 'EMPTY', 'WALL'],
      ['WALL', 'EMPTY', 'WALL', 'EMPTY', 'WALL'],
      ['WALL', 'EMPTY', 'EMPTY', 'EXIT', 'WALL'],
      ['WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
    ],
  },
  {
    id: 2,
    seed: 102,
    width: 6,
    height: 5,
    sectorName: 'Sector 0-B: The Echo Switch',
    playerStart: { x: 1, y: 1 },
    echoStart: { x: 1, y: 1 },
    echoDelay: 2,
    totalCores: 1,
    optimalMoves: 6,
    gates: {
      '3,2': { id: 'gate_1', isOpen: false, switchId: 'switch_1' },
    },
    switches: {
      '1,3': { id: 'switch_1', isPressed: false, color: '#06b6d4' },
    },
    tiles: [
      ['WALL', 'WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
      ['WALL', 'EMPTY', 'EMPTY', 'EMPTY', 'CORE', 'WALL'],
      ['WALL', 'EMPTY', 'WALL', 'GATE', 'EMPTY', 'WALL'],
      ['WALL', 'SWITCH', 'EMPTY', 'EMPTY', 'EXIT', 'WALL'],
      ['WALL', 'WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
    ],
  },
  {
    id: 3,
    seed: 103,
    width: 6,
    height: 6,
    sectorName: 'Sector 0-C: Temporal Consequence',
    playerStart: { x: 1, y: 4 },
    echoStart: { x: 1, y: 4 },
    echoDelay: 2,
    totalCores: 1,
    optimalMoves: 7,
    gates: {
      '3,2': { id: 'gate_1', isOpen: false, switchId: 'switch_1' },
      '4,4': { id: 'gate_2', isOpen: true, switchId: 'switch_2' },
    },
    switches: {
      '1,2': { id: 'switch_1', isPressed: false, color: '#38bdf8' },
      '3,4': { id: 'switch_2', isPressed: false, color: '#f43f5e' },
    },
    tiles: [
      ['WALL', 'WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
      ['WALL', 'EMPTY', 'CORE', 'EMPTY', 'EMPTY', 'WALL'],
      ['WALL', 'SWITCH', 'WALL', 'GATE', 'EMPTY', 'WALL'],
      ['WALL', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'WALL'],
      ['WALL', 'EMPTY', 'EMPTY', 'SWITCH', 'GATE', 'WALL'],
      ['WALL', 'WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
    ],
  },
];

// Procedural generator that verifies solvability
export function generateProceduralChamber(sectorIndex: number, userSeed?: number): Chamber {
  const baseSeed = userSeed ?? (sectorIndex * 7919 + 42);
  let attempt = 0;
  const maxAttempts = 35;

  // Grid size scales slightly with sector
  const width = sectorIndex <= 4 ? 6 : sectorIndex <= 10 ? 6 : 7;
  const height = sectorIndex <= 4 ? 6 : sectorIndex <= 10 ? 7 : 7;

  while (attempt < maxAttempts) {
    const currentSeed = baseSeed + attempt * 1013;
    const rng = createRNG(currentSeed);

    const tiles: TileType[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        // Outer border is WALL
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          tiles[y][x] = 'WALL';
        } else {
          tiles[y][x] = 'EMPTY';
        }
      }
    }

    // Interior walls (low density so paths remain open)
    const wallChance = 0.12 + Math.min(0.10, sectorIndex * 0.01);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (rng() < wallChance) {
          tiles[y][x] = 'WALL';
        }
      }
    }

    // Pick player start
    const playerStart: Position = { x: 1, y: height - 2 };
    tiles[playerStart.y][playerStart.x] = 'EMPTY';

    // Echo start (usually matches player start or offset by 1)
    const echoStart: Position = { ...playerStart };

    // Pick Exit
    const exitPos: Position = { x: width - 2, y: 1 };
    tiles[exitPos.y][exitPos.x] = 'EXIT';

    // Clear immediate neighbors of start and exit
    tiles[playerStart.y - 1][playerStart.x] = 'EMPTY';
    tiles[playerStart.y][playerStart.x + 1] = 'EMPTY';
    tiles[exitPos.y + 1][exitPos.x] = 'EMPTY';
    tiles[exitPos.y][exitPos.x - 1] = 'EMPTY';

    // Add Energy Cores (1 to 2 cores)
    const numCores = sectorIndex >= 3 ? (rng() > 0.5 ? 2 : 1) : 1;
    let placedCores = 0;
    const coreCandidates: Position[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (
          tiles[y][x] === 'EMPTY' &&
          (x !== playerStart.x || y !== playerStart.y) &&
          (x !== exitPos.x || y !== exitPos.y)
        ) {
          coreCandidates.push({ x, y });
        }
      }
    }

    // Shuffle candidates
    for (let i = coreCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [coreCandidates[i], coreCandidates[j]] = [coreCandidates[j], coreCandidates[i]];
    }

    for (let i = 0; i < Math.min(numCores, coreCandidates.length); i++) {
      const pos = coreCandidates[i];
      tiles[pos.y][pos.x] = 'CORE';
      placedCores++;
    }

    // Gates and Switches
    const gates: Record<string, GateData> = {};
    const switches: Record<string, SwitchData> = {};

    // For sector 2+, introduce a Gate + Switch mechanism
    if (sectorIndex >= 2 && coreCandidates.length >= 4) {
      // Find a spot along a corridor or choke point for a Gate
      const gatePos = coreCandidates[coreCandidates.length - 1];
      const switchPos = coreCandidates[coreCandidates.length - 2];

      const switchId = 'sw_alpha';
      gates[`${gatePos.x},${gatePos.y}`] = {
        id: 'gt_alpha',
        isOpen: false,
        switchId,
      };
      tiles[gatePos.y][gatePos.x] = 'GATE';

      switches[`${switchPos.x},${switchPos.y}`] = {
        id: switchId,
        isPressed: false,
        color: '#06b6d4',
      };
      tiles[switchPos.y][switchPos.x] = 'SWITCH';

      // For sector 6+, maybe add an INVERTER tile
      if (sectorIndex >= 6 && coreCandidates.length >= 5 && rng() > 0.4) {
        const invPos = coreCandidates[coreCandidates.length - 3];
        tiles[invPos.y][invPos.x] = 'INVERTER';
      }

      // For sector 8+, maybe add a HAZARD tile (placed safely off-center)
      if (sectorIndex >= 8 && coreCandidates.length >= 6 && rng() > 0.4) {
        const hazPos = coreCandidates[coreCandidates.length - 4];
        tiles[hazPos.y][hazPos.x] = 'HAZARD';
      }
    }

    const echoDelay = sectorIndex <= 5 ? 2 : (rng() > 0.6 ? 3 : 2);

    const sectorNames = [
      'Resonance Gate', 'Quantum Weave', 'Phase Rift', 'Prism Matrix',
      'Flux Conduit', 'Echo Lattice', 'Chrono Stream', 'Subspace Node',
      'Harmonic Vault', 'Singularity Core', 'Temporal Nexus', 'Tesseract Chamber'
    ];
    const nameIndex = (sectorIndex - 1) % sectorNames.length;
    const sectorName = `Sector ${sectorIndex}: ${sectorNames[nameIndex]}`;

    const candidateChamber: Chamber = {
      id: sectorIndex,
      seed: currentSeed,
      width,
      height,
      sectorName,
      playerStart,
      echoStart,
      echoDelay,
      totalCores: placedCores,
      optimalMoves: 6,
      gates,
      switches,
      tiles,
    };

    // Run BFS Solvability validator!
    const solveRes = solveChamber(candidateChamber, 16, 2000);
    if (solveRes.solvable && solveRes.optimalSteps >= 3) {
      candidateChamber.optimalMoves = solveRes.optimalSteps;
      return candidateChamber;
    }

    attempt++;
  }

  // Fallback: If 35 random attempts did not produce a valid puzzle, construct a guaranteed solvable architectural chamber
  return createGuaranteedSolvableChamber(sectorIndex, baseSeed);
}

function createGuaranteedSolvableChamber(sectorIndex: number, seed: number): Chamber {
  const width = 6;
  const height = 6;
  const tiles: TileType[][] = [
    ['WALL', 'WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
    ['WALL', 'CORE', 'EMPTY', 'EMPTY', 'EXIT', 'WALL'],
    ['WALL', 'EMPTY', 'WALL', 'WALL', 'GATE', 'WALL'],
    ['WALL', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'WALL'],
    ['WALL', 'SWITCH', 'EMPTY', 'EMPTY', 'EMPTY', 'WALL'],
    ['WALL', 'WALL', 'WALL', 'WALL', 'WALL', 'WALL'],
  ];

  const switchId = 'fallback_sw';
  const gates: Record<string, GateData> = {
    '4,2': { id: 'fallback_gt', isOpen: false, switchId },
  };
  const switches: Record<string, SwitchData> = {
    '1,4': { id: switchId, isPressed: false, color: '#06b6d4' },
  };

  const chamber: Chamber = {
    id: sectorIndex,
    seed,
    width,
    height,
    sectorName: `Sector ${sectorIndex}: Harmonic Vault`,
    playerStart: { x: 1, y: 3 },
    echoStart: { x: 1, y: 3 },
    echoDelay: 2,
    totalCores: 1,
    optimalMoves: 7,
    gates,
    switches,
    tiles,
  };

  const solve = solveChamber(chamber, 15);
  if (solve.solvable) {
    chamber.optimalMoves = solve.optimalSteps;
  }
  return chamber;
}

// Deterministic Daily Challenge Chamber (seeded by Date YYYY-MM-DD)
export function getDailyChallengeChamber(date: Date = new Date()): Chamber {
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed << 5) - seed + dateStr.charCodeAt(i);
    seed |= 0;
  }
  const chamber = generateProceduralChamber(100 + Math.abs(seed % 50), Math.abs(seed));
  chamber.sectorName = `Daily Challenge: Protocol ${dateStr}`;
  return chamber;
}
