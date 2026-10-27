import React from 'react';
import { HANDCRAFTED_LEVELS } from '../game/loop_generator.ts';
import { X, Star, Lock, Play, Grid3X3 } from 'lucide-react';

interface LevelSelectModalProps {
  highestLevel: number;
  completedStars: Record<number, number>;
  onSelectLevel: (levelIndex: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  highestLevel,
  completedStars,
  onSelectLevel,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-none select-none pointer-events-auto">
      <div className="w-full max-w-md max-h-[85vh] p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-mono tracking-wide text-slate-100 uppercase">
              LEVEL SELECT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close Level Select"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-2.5 pr-1">
          {HANDCRAFTED_LEVELS.map((lvl, idx) => {
            const levelNum = idx + 1;
            const isUnlocked = levelNum <= highestLevel;
            const stars = completedStars[levelNum] || 0;

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  if (isUnlocked) onSelectLevel(idx);
                }}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isUnlocked
                    ? 'bg-slate-850/80 border-slate-700/80 hover:border-cyan-400 hover:bg-slate-800 cursor-pointer shadow-md'
                    : 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm text-slate-200">
                      {lvl.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {lvl.size}x{lvl.size}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span>PAR: {lvl.authorMovesPar || lvl.targetMoves} MOVES</span>
                    <span>·</span>
                    <span className="text-pink-400">
                      {lvl.echoDelay > 0 ? `ECHO: ${lvl.echoDelay} TURNS` : 'NO ECHO'}
                    </span>
                  </div>

                  {/* Stars earned */}
                  {isUnlocked && (
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3.5 h-3.5 ${
                            starIdx <= stars
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  {isUnlocked ? (
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                      <Play className="w-3.5 h-3.5 fill-cyan-300 ml-0.5" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-500 font-mono text-xs">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
