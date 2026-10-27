import React from 'react';
import { LoopGameState } from '../game/loop_types.ts';
import { Play, RotateCcw, Home, Trophy, Star, Grid3X3, Sparkles } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenLevelSelect: () => void;
  onExitTitle: () => void;
  sfxVolume: number;
  musicVolume: number;
  onVolumeChange: (sfx: number, music: number) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenLevelSelect,
  onExitTitle,
  sfxVolume,
  musicVolume,
  onVolumeChange,
  hapticsEnabled,
  onToggleHaptics,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-none select-none pointer-events-auto">
      <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-5 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xl font-black tracking-wide text-cyan-300 font-mono uppercase">
            PUZZLE PAUSED
          </h2>
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>

        {/* Volume controls */}
        <div className="flex flex-col gap-3 text-xs font-mono">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>SFX VOLUME</span>
              <span className="text-cyan-400 font-bold">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value), musicVolume)}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>MUSIC VOLUME</span>
              <span className="text-purple-400 font-bold">{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => onVolumeChange(sfxVolume, parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400">TOUCH HAPTICS</span>
            <button
              onClick={onToggleHaptics}
              className={`px-3 py-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                hapticsEnabled
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {hapticsEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            data-start="true"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            RESUME PUZZLE
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            RESTART PUZZLE
          </button>

          <button
            onClick={onOpenLevelSelect}
            className="w-full py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Grid3X3 className="w-4 h-4" />
            LEVEL SELECT
          </button>

          <button
            onClick={onExitTitle}
            className="w-full py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            TITLE MENU
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  gameState: LoopGameState;
  onNextPuzzle: () => void;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ gameState, onNextPuzzle, onRestart }) => {
  const { board, moveCount, starsEarned } = gameState;
  const par = board.authorMovesPar || board.targetMoves || 4;
  const diff = par - moveCount;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-none select-none pointer-events-auto">
      <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_40px_rgba(56,189,248,0.25)] flex flex-col gap-5 text-slate-100 text-center">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center mb-3">
            <Trophy className="w-8 h-8 text-cyan-300" />
          </div>

          {/* Star rating */}
          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-6 h-6 ${
                  starIdx <= starsEarned
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>

          <span className="text-xs uppercase tracking-widest text-cyan-400 font-mono font-bold">
            LOOP CONNECTED
          </span>
          <h2 className="text-2xl font-black text-slate-100 tracking-wide font-mono mt-0.5">
            CIRCUIT SOLVED!
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">{board.name}</p>
        </div>

        {/* Mastery Metrics */}
        <div className="grid grid-cols-2 gap-2 py-3 px-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[10px]">MOVES TAKEN</div>
            <div className="text-slate-100 font-bold text-base tabular-nums mt-0.5">{moveCount}</div>
            <div className="text-[10px] text-cyan-400 font-bold">
              {diff >= 0 ? `+${diff} UNDER PAR` : `${Math.abs(diff)} OVER PAR`}
            </div>
          </div>
          <div className="border-l border-slate-800 pl-2">
            <div className="text-slate-400 text-[10px]">PERFECT PAR</div>
            <div className="text-amber-400 font-bold text-base tabular-nums mt-0.5">{par} MOVES</div>
            <div className="text-[10px] text-emerald-400 font-bold">
              {starsEarned === 3 ? '3 STARS ★★★' : `${starsEarned} STARS`}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            data-start="true"
            onClick={onNextPuzzle}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>ADVANCE TO NEXT PUZZLE</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RETRY FOR 3 STARS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
