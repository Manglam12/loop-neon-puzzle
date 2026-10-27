import React from 'react';
import { VisualTheme } from '../game/types.ts';
import { VISUAL_THEMES } from '../game/themes.ts';
import { Check, Lock, X, Palette } from 'lucide-react';

interface ThemesModalProps {
  currentThemeId: string;
  onSelectTheme: (theme: VisualTheme) => void;
  onClose: () => void;
  highestSector: number;
}

export const ThemesModal: React.FC<ThemesModalProps> = ({
  currentThemeId,
  onSelectTheme,
  onClose,
  highestSector,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-none select-none pointer-events-auto">
      <div className="w-full max-w-md max-h-[85vh] p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold font-mono tracking-wide text-slate-100 uppercase">
              VISUAL THEMES
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close Themes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-2.5 pr-1">
          {VISUAL_THEMES.map((theme) => {
            const isUnlocked = highestSector >= theme.requiredSectors || theme.requiredSectors === 0;
            const isSelected = theme.id === currentThemeId;

            return (
              <div
                key={theme.id}
                onClick={() => {
                  if (isUnlocked) onSelectTheme(theme);
                }}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isUnlocked
                    ? isSelected
                      ? 'bg-slate-800/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850 cursor-pointer'
                    : 'bg-slate-950/40 border-slate-900 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm text-slate-200">{theme.name}</span>
                    {isSelected && (
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{theme.description}</p>

                  {/* Swatches */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.playerColor }}
                      title="Player Spark"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.echoColor }}
                      title="Echo Ghost"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.coreColor }}
                      title="Energy Core"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.gateColor }}
                      title="Quantum Gate"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: theme.switchColor }}
                      title="Switch Plate"
                    />
                  </div>
                </div>

                <div>
                  {isUnlocked ? (
                    isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-slate-400 hover:text-cyan-400">SELECT</span>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500 font-mono text-xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>SECTOR {theme.requiredSectors}</span>
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
