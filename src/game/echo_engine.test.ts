import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, executeMove } from './echo_engine.ts';
import { TUTORIAL_CHAMBERS, generateProceduralChamber, getDailyChallengeChamber } from './generator.ts';
import { solveChamber } from './solver.ts';

test('Initial state creates correct entities and flags', () => {
  const chamber = TUTORIAL_CHAMBERS[0];
  const state = createInitialState(chamber);

  assert.equal(state.playerPosition.x, 1);
  assert.equal(state.playerPosition.y, 3);
  assert.equal(state.echoPosition.x, 1);
  assert.equal(state.echoPosition.y, 3);
  assert.equal(state.isWon, false);
  assert.equal(state.isGameOver, false);
  assert.equal(state.stepCount, 0);
  assert.equal(state.coresCollected, 0);
});

test('Wall collision blocks movement and preserves state', () => {
  const chamber = TUTORIAL_CHAMBERS[0];
  const state = createInitialState(chamber);

  // Moving LEFT hits a wall (x=0)
  const result = executeMove(state, 'LEFT');
  assert.equal(result.valid, false);
  assert.equal(result.nextState.playerPosition.x, 1);
  assert.equal(result.nextState.playerPosition.y, 3);
  assert.equal(result.nextState.stepCount, 0);
});

test('Echo follows player moves with configured delay', () => {
  const chamber = TUTORIAL_CHAMBERS[0]; // echoDelay = 2
  let state = createInitialState(chamber);

  // Move 1: UP
  let res = executeMove(state, 'UP');
  assert.equal(res.valid, true);
  state = res.nextState;
  assert.equal(state.playerPosition.x, 1);
  assert.equal(state.playerPosition.y, 2);
  // Echo has not moved yet because delay = 2
  assert.equal(state.echoPosition.x, 1);
  assert.equal(state.echoPosition.y, 3);

  // Move 2: UP
  res = executeMove(state, 'UP');
  assert.equal(res.valid, true);
  state = res.nextState;
  assert.equal(state.playerPosition.x, 1);
  assert.equal(state.playerPosition.y, 1);
  // Echo executes Move 1 (UP)
  assert.equal(state.echoPosition.x, 1);
  assert.equal(state.echoPosition.y, 2);
});

test('Switch unlocks gate and allows passage', () => {
  const chamber = TUTORIAL_CHAMBERS[1]; // Tutorial 2 has a gate at (3,2) and switch at (1,3)
  const state = createInitialState(chamber);

  assert.equal(state.gates['3,2'].isOpen, false);

  // Move DOWN twice to hit switch at (1,3)
  let s = executeMove(state, 'DOWN').nextState;
  const res = executeMove(s, 'DOWN');
  assert.equal(res.triggeredSwitch, true);
  assert.equal(res.nextState.gates['3,2'].isOpen, true);
});

test('Tutorial 1 is solvable via BFS solver', () => {
  const chamber = TUTORIAL_CHAMBERS[0];
  const solve = solveChamber(chamber);
  assert.equal(solve.solvable, true);
  assert.ok(solve.optimalSteps > 0);
  assert.ok(solve.solutionMoves.length > 0);
});

test('Procedural endless chambers are guaranteed solvable', () => {
  // Test 3 procedural sectors
  for (let sector = 1; sector <= 3; sector++) {
    const chamber = generateProceduralChamber(sector);
    const solve = solveChamber(chamber);
    assert.equal(
      solve.solvable,
      true,
      `Sector ${sector} should be solvable by BFS validator`
    );
  }
});

test('Daily challenge is deterministic for the same date', () => {
  const fixedDate = new Date('2026-10-27T00:00:00Z');
  const chamberA = getDailyChallengeChamber(fixedDate);
  const chamberB = getDailyChallengeChamber(fixedDate);

  assert.equal(chamberA.seed, chamberB.seed);
  assert.equal(chamberA.sectorName, chamberB.sectorName);
  assert.equal(chamberA.optimalMoves, chamberB.optimalMoves);
});
