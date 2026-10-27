/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PuzzleBoard,
  LoopGameState,
  Vector2i,
} from './game/loop_types.ts';
import { createInitialLoopState, executeTileTap } from './game/loop_engine.ts';
import { HANDCRAFTED_LEVELS, generateProceduralLoop } from './game/loop_generator.ts';
import { solveLoopBoard } from './game/loop_solver.ts';
import { loopAudio } from './game/loop_audio.ts';
import { LoopRenderer } from './game/loop_renderer.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameplayHUD } from './components/GameplayHUD.tsx';
import { PauseModal, VictoryModal } from './components/StatusModals.tsx';
import { LevelSelectModal } from './components/LevelSelectModal.tsx';
import { GodotExportModal } from './components/GodotExportModal.tsx';
import { DiagnosticsOverlay } from './components/DiagnosticsOverlay.tsx';
import { Smartphone, Monitor } from 'lucide-react';

type ScreenState = 'title' | 'playing' | 'paused' | 'gameover';
type GameMode = 'LEVELS' | 'ENDLESS';

export default function App() {
  const [screenState, setScreenState] = useState<ScreenState>('title');
  const [gameMode, setGameMode] = useState<GameMode>('LEVELS');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [endlessSeed, setEndlessSeed] = useState<number>(101);

  // Audio & Settings
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sfxVolume, setSfxVolume] = useState<number>(0.8);
  const [musicVolume, setMusicVolume] = useState<number>(0.4);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);

  // Progression Saves
  const [highestLevel, setHighestLevel] = useState<number>(1);
  const [bestScore, setBestScore] = useState<number>(0);
  const [completedStars, setCompletedStars] = useState<Record<number, number>>({});

  // Hint & UI
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState<boolean>(false);
  const [isGodotModalOpen, setIsGodotModalOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);

  // Telemetry
  const [fps, setFps] = useState<number>(60);
  const [frameDt, setFrameDt] = useState<number>(16.6);

  // Canvas & Simulation references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<LoopRenderer | null>(null);

  // Game state ref for 60fps canvas loop
  const initialBoard = HANDCRAFTED_LEVELS[0];
  const [gameState, setGameState] = useState<LoopGameState>(() => createInitialLoopState(initialBoard));
  const gameStateRef = useRef<LoopGameState>(gameState);
  gameStateRef.current = gameState;

  const undoStackRef = useRef<LoopGameState[]>([]);

  // Sync state attribute on document body
  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  // Load progression from localStorage
  useEffect(() => {
    try {
      const savedHighest = localStorage.getItem('loop_highest_level');
      if (savedHighest) setHighestLevel(parseInt(savedHighest, 10) || 1);

      const savedBest = localStorage.getItem('loop_best_score');
      if (savedBest) setBestScore(parseInt(savedBest, 10) || 0);

      const savedStars = localStorage.getItem('loop_stars_map');
      if (savedStars) setCompletedStars(JSON.parse(savedStars));

      const savedSfx = localStorage.getItem('loop_sfx_vol');
      if (savedSfx) {
        const val = parseFloat(savedSfx);
        setSfxVolume(val);
        loopAudio.setVolumes(val, musicVolume);
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const recordLevelCompletion = useCallback(
    (levelNum: number, stars: number, score: number) => {
      setHighestLevel((prev) => {
        const next = Math.max(prev, levelNum + 1);
        try {
          localStorage.setItem('loop_highest_level', next.toString());
        } catch {}
        return next;
      });

      setCompletedStars((prev) => {
        const next = { ...prev, [levelNum]: Math.max(prev[levelNum] || 0, stars) };
        try {
          localStorage.setItem('loop_stars_map', JSON.stringify(next));
        } catch {}
        return next;
      });

      setBestScore((prev) => {
        const next = Math.max(prev, score);
        try {
          localStorage.setItem('loop_best_score', next.toString());
        } catch {}
        return next;
      });
    },
    []
  );

  // Load a new puzzle board
  const loadPuzzle = useCallback((board: PuzzleBoard) => {
    const fresh = createInitialLoopState(board);
    setGameState(fresh);
    gameStateRef.current = fresh;
    undoStackRef.current = [];
    setHintMessage(null);
    if (rendererRef.current) {
      rendererRef.current.highlightedHintCell = null;
      rendererRef.current.emitBurst(window.innerWidth / 2, window.innerHeight / 2, '#38bdf8', 16);
    }
  }, []);

  // Mode Starters
  const startLevels = useCallback(() => {
    setGameMode('LEVELS');
    setCurrentLevelIdx(0);
    loadPuzzle(HANDCRAFTED_LEVELS[0]);
    setScreenState('playing');
    loopAudio.startAmbientMusic();
  }, [loadPuzzle]);

  const startEndless = useCallback(() => {
    setGameMode('ENDLESS');
    const seed = Math.floor(Math.random() * 9000) + 1000;
    setEndlessSeed(seed);
    const board = generateProceduralLoop(seed, 4, 2);
    loadPuzzle(board);
    setScreenState('playing');
    loopAudio.startAmbientMusic();
  }, [loadPuzzle]);

  // Support ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startLevels();
    }
  }, [startLevels]);

  // Handle tile tap action
  const handleTileTap = useCallback(
    (x: number, y: number) => {
      if (screenState !== 'playing') return;
      const current = gameStateRef.current;
      if (current.isWon) return;

      const targetTile = current.board.tiles[y]?.[x];
      if (!targetTile || targetTile.role !== 'WIRE') return;

      // Save to undo stack
      undoStackRef.current.push(current);
      if (undoStackRef.current.length > 20) {
        undoStackRef.current.shift();
      }

      const result = executeTileTap(current, x, y);
      if (!result.valid) return;

      // Audio & Haptics
      if (result.winAchieved) {
        loopAudio.playWinFanfare();
        rendererRef.current?.addCameraTrauma(0.5);
        if (gameMode === 'LEVELS') {
          recordLevelCompletion(
            currentLevelIdx + 1,
            result.nextState.starsEarned,
            Math.max(100, 500 - result.nextState.moveCount * 20)
          );
        } else {
          recordLevelCompletion(
            highestLevel,
            result.nextState.starsEarned,
            bestScore + 500
          );
        }
        setScreenState('gameover');
      } else if (result.echoTriggered) {
        loopAudio.playEchoTrigger();
        rendererRef.current?.addCameraTrauma(0.25);
      } else {
        loopAudio.playRotateClick();
      }

      // Clear active hint on player action
      setHintMessage(null);
      if (rendererRef.current) {
        rendererRef.current.highlightedHintCell = null;
      }

      setGameState(result.nextState);
    },
    [screenState, gameMode, currentLevelIdx, highestLevel, bestScore, recordLevelCompletion]
  );

  // Undo move
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    setGameState(prev);
    gameStateRef.current = prev;
    setHintMessage(null);
    if (rendererRef.current) {
      rendererRef.current.highlightedHintCell = null;
    }
    loopAudio.playRotateClick();
  }, []);

  // Restart puzzle
  const handleRestart = useCallback(() => {
    loadPuzzle(gameStateRef.current.board);
    setScreenState('playing');
  }, [loadPuzzle]);

  // Advance to next puzzle
  const handleNextPuzzle = useCallback(() => {
    if (gameMode === 'LEVELS') {
      const nextIdx = currentLevelIdx + 1;
      if (nextIdx < HANDCRAFTED_LEVELS.length) {
        setCurrentLevelIdx(nextIdx);
        loadPuzzle(HANDCRAFTED_LEVELS[nextIdx]);
        setScreenState('playing');
      } else {
        // All handcrafted completed -> Jump to Endless
        startEndless();
      }
    } else {
      const nextSeed = endlessSeed + 137;
      setEndlessSeed(nextSeed);
      const size = Math.min(5, 4 + Math.floor(Math.random() * 2));
      const board = generateProceduralLoop(nextSeed, size, 2);
      loadPuzzle(board);
      setScreenState('playing');
    }
  }, [gameMode, currentLevelIdx, endlessSeed, loadPuzzle, startEndless]);

  // Solver Hint feature
  const handleHint = useCallback(() => {
    const current = gameStateRef.current;
    if (current.isWon) return;

    const solve = solveLoopBoard(current.board, 8, 2000);
    if (solve.solvable && solve.hintMove) {
      const hint = solve.hintMove;
      setHintMessage(`TRY ROTATING TILE AT (${hint.x + 1}, ${hint.y + 1})`);
      if (rendererRef.current) {
        rendererRef.current.highlightedHintCell = hint;
      }
      loopAudio.playPowerSurge();
    } else {
      setHintMessage('CIRCUIT DIVERGED. TRY UNDOING A MOVE.');
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (screenState === 'playing') {
          setScreenState('paused');
        } else if (screenState === 'paused') {
          setScreenState('playing');
        }
        return;
      }

      if (screenState === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startLevels();
        return;
      }

      if (screenState === 'playing') {
        if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleRestart();
        } else if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          handleHint();
        } else if (e.key === 'm' || e.key === 'M') {
          setIsMuted((prev) => {
            const next = !prev;
            loopAudio.setMuted(next);
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screenState, handleUndo, handleRestart, handleHint, startLevels]);

  // 60 FPS Decoupled Canvas Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new LoopRenderer(canvas);
    rendererRef.current = renderer;

    let animationId: number;
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsAccumulator = 0;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      frameCounter++;
      fpsAccumulator += rawDt;
      if (fpsAccumulator >= 0.5) {
        setFps(Math.round(frameCounter / fpsAccumulator));
        setFrameDt(rawDt * 1000);
        frameCounter = 0;
        fpsAccumulator = 0;
      }

      renderer.render(gameStateRef.current, dt);
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Handle pointer down on canvas to tap tiles
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (screenState !== 'playing' || !rendererRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const tile = rendererRef.current.getTileAtScreenCoords(clickX, clickY);
    if (tile) {
      handleTileTap(tile.x, tile.y);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#050917] text-slate-100 flex items-center justify-center overflow-hidden font-sans select-none">
      {/* Device Viewport Mode Toggle (Desktop only, positioned at bottom-left) */}
      <div className="hidden md:flex absolute bottom-4 left-4 z-50 items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-700/70 shadow-2xl text-xs font-mono">
        <button
          onClick={() => setIsPhoneFrame(false)}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            !isPhoneFrame ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Full Viewport Mode"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>FULL BLEED</span>
        </button>
        <button
          onClick={() => setIsPhoneFrame(true)}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            isPhoneFrame ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Simulate Portrait Android Device"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>ANDROID PORTRAIT</span>
        </button>
      </div>

      {/* Main Viewport Container */}
      <div
        className={`relative overflow-hidden transition-all duration-300 flex items-center justify-center ${
          isPhoneFrame
            ? 'w-[390px] h-[820px] rounded-[44px] border-[10px] border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.8)] ring-1 ring-slate-700/50'
            : 'w-full h-full'
        }`}
      >
        {/* Phone Frame Speaker/Camera notch */}
        {isPhoneFrame && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full bg-slate-900 z-50 pointer-events-none flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800 mr-2" />
            <div className="w-10 h-1 rounded-full bg-slate-800" />
          </div>
        )}

        {/* 60 FPS Interactive Canvas */}
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          onPointerDown={handleCanvasPointerDown}
          className="w-full h-full block cursor-pointer touch-none"
        />

        {/* Title Screen Overlay */}
        {screenState === 'title' && (
          <TitleScreen
            onStartLevels={startLevels}
            onStartEndless={startEndless}
            onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
            onOpenGodotModal={() => setIsGodotModalOpen(true)}
            isMuted={isMuted}
            onToggleMute={() => {
              setIsMuted((prev) => {
                const next = !prev;
                loopAudio.setMuted(next);
                return next;
              });
            }}
            bestScore={bestScore}
            highestLevel={highestLevel}
          />
        )}

        {/* Live Gameplay HUD */}
        {screenState === 'playing' && (
          <GameplayHUD
            gameState={gameState}
            mode={gameMode}
            isMuted={isMuted}
            onToggleMute={() => {
              setIsMuted((prev) => {
                const next = !prev;
                loopAudio.setMuted(next);
                return next;
              });
            }}
            onPause={() => setScreenState('paused')}
            onRestart={handleRestart}
            onUndo={handleUndo}
            onHint={handleHint}
            canUndo={undoStackRef.current.length > 0}
            hintMessage={hintMessage}
            onToggleDiagnostics={() => setIsDiagnosticsOpen((prev) => !prev)}
            isDiagnosticsOpen={isDiagnosticsOpen}
          />
        )}

        {/* Paused Modal */}
        {screenState === 'paused' && (
          <PauseModal
            onResume={() => setScreenState('playing')}
            onRestart={handleRestart}
            onOpenLevelSelect={() => {
              setScreenState('title');
              setIsLevelSelectOpen(true);
            }}
            onExitTitle={() => setScreenState('title')}
            sfxVolume={sfxVolume}
            musicVolume={musicVolume}
            onVolumeChange={(sfx, mus) => {
              setSfxVolume(sfx);
              setMusicVolume(mus);
              loopAudio.setVolumes(sfx, mus);
              try {
                localStorage.setItem('loop_sfx_vol', sfx.toString());
              } catch {}
            }}
            hapticsEnabled={hapticsEnabled}
            onToggleHaptics={() => setHapticsEnabled((prev) => !prev)}
          />
        )}

        {/* Victory Modal */}
        {screenState === 'gameover' && gameState.isWon && (
          <VictoryModal
            gameState={gameState}
            onNextPuzzle={handleNextPuzzle}
            onRestart={handleRestart}
          />
        )}

        {/* Level Select Modal */}
        {isLevelSelectOpen && (
          <LevelSelectModal
            highestLevel={highestLevel}
            completedStars={completedStars}
            onSelectLevel={(idx) => {
              setIsLevelSelectOpen(false);
              setGameMode('LEVELS');
              setCurrentLevelIdx(idx);
              loadPuzzle(HANDCRAFTED_LEVELS[idx]);
              setScreenState('playing');
              loopAudio.startAmbientMusic();
            }}
            onClose={() => setIsLevelSelectOpen(false)}
          />
        )}

        {/* Godot 4.3 Android Project Source Code & Zip Downloader */}
        {isGodotModalOpen && (
          <GodotExportModal onClose={() => setIsGodotModalOpen(false)} />
        )}

        {/* Diagnostics Overlay */}
        {isDiagnosticsOpen && (
          <DiagnosticsOverlay
            gameState={gameState}
            fps={fps}
            frameDt={frameDt}
            onClose={() => setIsDiagnosticsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
