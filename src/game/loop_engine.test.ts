import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIR_NORTH,
  DIR_EAST,
  DIR_SOUTH,
  DIR_WEST,
} from './loop_types.ts';
import {
  rotateMask,
  canConnect,
  createInitialLoopState,
  executeTileTap,
  computePoweredCircuit,
} from './loop_engine.ts';
import { HANDCRAFTED_LEVELS, generateProceduralLoop } from './loop_generator.ts';
import { solveLoopBoard } from './loop_solver.ts';

test('Clockwise rotation shifts connection bits through all 4 orientations', () => {
  // Start with North (1)
  let mask = DIR_NORTH;
  mask = rotateMask(mask, 1);
  assert.equal(mask, DIR_EAST, 'North rotated clockwise once should become East');

  mask = rotateMask(mask, 1);
  assert.equal(mask, DIR_SOUTH, 'East rotated clockwise once should become South');

  mask = rotateMask(mask, 1);
  assert.equal(mask, DIR_WEST, 'South rotated clockwise once should become West');

  mask = rotateMask(mask, 1);
  assert.equal(mask, DIR_NORTH, 'West rotated clockwise once should return to North');

  // Straight line test: North|South (5) rotated once becomes East|West (10)
  const straightNS = DIR_NORTH | DIR_SOUTH;
  const straightEW = rotateMask(straightNS, 1);
  assert.equal(straightEW, DIR_EAST | DIR_WEST);
  assert.equal(rotateMask(straightEW, 1), DIR_NORTH | DIR_SOUTH);
});

test('Reciprocal connection requires both tiles to point towards each other', () => {
  const tileA = DIR_EAST; // Tile on left pointing East
  const tileB = DIR_WEST; // Tile on right pointing West
  assert.equal(canConnect(tileA, tileB, DIR_EAST), true);

  // If tile B points North instead, they do NOT connect
  const tileBWrong = DIR_NORTH;
  assert.equal(canConnect(tileA, tileBWrong, DIR_EAST), false);
});

test('Handcrafted Level 1 is not solved initially, but solves after 1 tap on center wire', () => {
  const level1 = HANDCRAFTED_LEVELS[0];
  const state = createInitialLoopState(level1);

  assert.equal(state.isWon, false, 'Level 1 must not be solved initially');
  assert.equal(state.isGoalConnected, false);

  // Tap center wire (x=1, y=1) once to rotate it from N|S to E|W
  const result = executeTileTap(state, 1, 1);
  assert.equal(result.valid, true);
  assert.equal(result.winAchieved, true, 'Tapping center wire should connect START to GOAL');
  assert.equal(result.nextState.isWon, true);
});

test('Echo action triggers after the specified delay', () => {
  const level3 = HANDCRAFTED_LEVELS[2]; // echoDelay = 2
  let state = createInitialLoopState(level3);

  assert.equal(state.echoQueue.length, 0);

  // Move 1: Tap wire at (1, 1) - does not solve the puzzle
  let res = executeTileTap(state, 1, 1);
  assert.equal(res.echoTriggered, false);
  assert.equal(res.winAchieved, false);
  state = res.nextState;
  assert.equal(state.echoQueue.length, 1);
  assert.equal(state.echoQueue[0].turnsRemaining, 2);

  // Move 2: Tap wire at (1, 1) again
  res = executeTileTap(state, 1, 1);
  assert.equal(res.echoTriggered, false);
  state = res.nextState;
  // Move 1's countdown drops to 1, Move 2 is enqueued with 2
  assert.equal(state.echoQueue.length, 2);
  assert.equal(state.echoQueue[0].turnsRemaining, 1);
  assert.equal(state.echoQueue[1].turnsRemaining, 2);

  // Move 3: Tap wire at (1, 1) again
  res = executeTileTap(state, 1, 1);
  // Move 1's countdown hits 0 and triggers!
  assert.equal(res.echoTriggered, true);
  assert.equal(res.echoCell?.x, 1);
  assert.equal(res.echoCell?.y, 1);
});

test('BFS Solver successfully finds solution for Level 1, 2 and 3', () => {
  for (let i = 0; i < 3; i++) {
    const lvl = HANDCRAFTED_LEVELS[i];
    const solve = solveLoopBoard(lvl, 8, 2000);
    assert.equal(solve.solvable, true, `Level ${i + 1} must be solvable by BFS solver`);
    assert.ok(solve.optimalSteps > 0, `Level ${i + 1} must have optimal steps > 0`);
    assert.ok(solve.hintMove !== null, `Level ${i + 1} should provide hint move`);
  }
});

test('Procedural Endless generator produces verified solvable boards', () => {
  for (let seed = 42; seed <= 44; seed++) {
    const board = generateProceduralLoop(seed, 4, 2);
    const solve = solveLoopBoard(board, 8, 2500);
    assert.equal(solve.solvable, true, `Seed ${seed} must produce a solvable board`);
    assert.ok(solve.optimalSteps >= 2, `Seed ${seed} must require at least 2 moves`);
  }
});
