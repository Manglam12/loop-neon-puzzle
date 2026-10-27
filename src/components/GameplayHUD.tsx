import React from 'react';
import { LoopGameState } from '../game/loop_types.ts';
import {
  Pause,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
  Lightbulb,
  Info,
  Sparkles,
  Star,
} from 'lucide-react';

interface GameplayHUDProps {
  gameState: LoopGameState;
  mode: 'LEVELS' | 'ENDLESS';
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onUndo: () => void;
  onHint: () => void;
  canUndo: boolean;
  hintMessage: string | null;
  onToggleDiagnostics: () => void;
  isDiagnosticsOpen: boolean;
}

export const GameplayHUD: React.FC<GameplayHUDProps> = ({
  gameState,
  mode,
  isMuted,
  onToggleMute,
  onPause,
  onRestart,
  onUndo,
  onHint,
  canUndo,
  hintMessage,
  onToggleDiagnostics,
  isDiagnosticsOpen,
}) => {
  const { board, moveCount, echoQueue, isGoalConnected } = gameState;
  const par = board.authorMovesPar || board.targetMoves || 4;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* Top Header Cluster */}
      <header className="flex items-start justify-between w-full pointer-events-auto pt-1">
        {/* Left: Level / Mode info */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-xs sm:text-sm font-bold tracking-wide text-slate-100 uppercase font-mono">
              {board.name}
            </h1>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-400">MOVES</span>
            <span className={`font-bold tabular-nums ${moveCount <= par ? 'text-cyan-400' : 'text-amber-400'}`}>
              {moveCount}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">PAR {par}</span>
          </div>
        </div>

        {/* Center: Live Power status */}
        <div className="flex flex-col items-center">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-lg flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isGoalConnected ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400 animate-pulse'
              }`}
            />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              {isGoalConnected ? 'CIRCUIT ENERGIZED' : 'CIRCUIT LIVE'}
            </span>
          </div>
        </div>

        {/* Right: Utility Controls */}
        <nav aria-label="Game controls" className="flex items-center gap-1.5">
          <button
            onClick={onToggleDiagnostics}
            tabIndex={-1}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isDiagnosticsOpen
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
            aria-label="Toggle Diagnostics"
            title="Diagnostics (D)"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleMute}
            tabIndex={-1}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer"
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            title="Mute (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          <button
            onClick={onRestart}
            tabIndex={-1}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer"
            aria-label="Restart Puzzle"
            title="Restart (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onPause}
            tabIndex={-1}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer"
            aria-label="Pause Game"
            title="Pause (Esc)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </nav>
      </header>

      {/* Middle: Echo Status Banner & Hint Message */}
      <div className="w-full flex flex-col items-center gap-1.5 pointer-events-auto my-auto mb-2">
        {/* Echo queue pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-pink-500/40 shadow-lg text-xs font-mono">
          <span className="flex items-center gap-1.5 text-pink-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            ECHO SYSTEM
          </span>
          <span className="text-slate-500">:</span>
          {echoQueue.length === 0 ? (
            <span className="text-slate-400 text-[11px] italic">
              {board.echoDelay > 0 ? `Delays by ${board.echoDelay} moves` : 'Disabled for this level'}
            </span>
          ) : (
            <div className="flex items-center gap-2 text-pink-200">
              <span>
                Tile ({echoQueue[0].x + 1}, {echoQueue[0].y + 1}) will echo in
              </span>
              <span className="px-1.5 py-0.2 rounded bg-pink-950 border border-pink-500/60 font-bold text-pink-300">
                {echoQueue[0].turnsRemaining} move{echoQueue[0].turnsRemaining > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Hint banner if active */}
        {hintMessage && (
          <div className="px-3.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
            <span>{hintMessage}</span>
          </div>
        )}
      </div>

      {/* Bottom Perimeter Actions */}
      <footer className="w-full max-w-sm mx-auto flex items-center justify-between pointer-events-auto pb-1 gap-2">
        {/* Undo button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            canUndo
              ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/70 text-slate-200 active:scale-95'
              : 'bg-slate-900/40 border-slate-800/40 text-slate-500 cursor-not-allowed opacity-50'
          }`}
          aria-label="Undo Move"
          title="Undo (Z)"
        >
          <Undo2 className="w-4 h-4 text-cyan-400" />
          <span>UNDO</span>
        </button>

        {/* Solver Hint button */}
        <button
          onClick={onHint}
          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg"
          aria-label="Get Solver Hint"
          title="Hint (H)"
        >
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>HINT</span>
        </button>

        {/* Par indicator badge */}
        <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-center flex flex-col items-center">
          <div className="text-slate-400">STAR PAR</div>
          <div className="text-cyan-400 font-bold tabular-nums text-xs">{par} MOVES</div>
        </div>
      </footer>
    </div>
  );
};
