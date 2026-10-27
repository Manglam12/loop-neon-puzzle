import React from 'react';
import { Play, Grid3X3, Download, Sparkles, Volume2, VolumeX, Infinity } from 'lucide-react';

interface TitleScreenProps {
  onStartLevels: () => void;
  onStartEndless: () => void;
  onOpenLevelSelect: () => void;
  onOpenGodotModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  bestScore: number;
  highestLevel: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartLevels,
  onStartEndless,
  onOpenLevelSelect,
  onOpenGodotModal,
  isMuted,
  onToggleMute,
  bestScore,
  highestLevel,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#070b1b]/95 via-[#0d1633]/92 to-[#070b1b]/98 text-slate-100 select-none pointer-events-auto">
      {/* Top Header info */}
      <div className="w-full max-w-md flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-cyan-400 font-mono font-semibold">
            V2.0 · GODOT 4 & ANDROID
          </span>
        </div>
        <button
          onClick={onToggleMute}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer"
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center px-4">
        <div className="relative mb-5">
          {/* Cyan/Magenta aura */}
          <div className="absolute -inset-10 bg-cyan-500/15 blur-2xl rounded-full pointer-events-none" />

          {/* Bespoke SVG Loop Emblem */}
          <svg className="w-28 h-28 mx-auto drop-shadow-[0_0_25px_rgba(56,189,248,0.6)]" viewBox="0 0 100 100">
            {/* Outer Hexagon Circuit */}
            <polygon
              points="50,8 88,29 88,71 50,92 12,71 12,29"
              fill="none"
              stroke="#25365c"
              strokeWidth="2"
            />
            {/* Pulsing Cyan Loop Track */}
            <path
              d="M30,30 L70,30 L70,70 L30,70 Z"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Inner Echo Loop in Magenta */}
            <circle
              cx="50"
              cy="50"
              r="14"
              fill="rgba(236,72,153,0.15)"
              stroke="#ec4899"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            {/* Glowing Center Node */}
            <circle cx="50" cy="50" r="5" fill="#ffffff" />
            {/* Connection Ports */}
            <circle cx="30" cy="50" r="3" fill="#10b981" />
            <circle cx="70" cy="50" r="3" fill="#f59e0b" />
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-100 to-pink-400 uppercase">
          L O O P
        </h1>

        <p className="mt-1 text-xs sm:text-sm text-slate-400 font-mono tracking-wider">
          NEON ECHO PUZZLE
        </p>

        {/* Player Stats */}
        {highestLevel > 1 || bestScore > 0 ? (
          <div className="mt-4 flex items-center gap-6 px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400">HIGHEST LEVEL: </span>
              <span className="text-cyan-400 font-bold tabular-nums">{highestLevel}</span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div>
              <span className="text-slate-400">BEST SCORE: </span>
              <span className="text-amber-400 font-bold tabular-nums">{bestScore.toLocaleString()}</span>
            </div>
          </div>
        ) : null}

        {/* Primary CTAs */}
        <div className="mt-7 flex flex-col gap-2.5 w-full max-w-xs">
          <button
            data-start="true"
            onClick={onStartLevels}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-[0_0_24px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>PLAY LEVELS</span>
          </button>

          <button
            onClick={onStartEndless}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-pink-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <Infinity className="w-4 h-4" />
            <span>ENDLESS GENERATOR</span>
          </button>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={onOpenLevelSelect}
              className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>LEVEL SELECT</span>
            </button>
            <button
              onClick={onOpenGodotModal}
              className="py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>GODOT 4 APK</span>
            </button>
          </div>
        </div>
      </div>

      {/* Flat control hint line */}
      <div className="pb-2 text-center">
        <p className="text-[11px] text-slate-400 font-mono tracking-wider">
          Tap Tile Rotate · Enter/Space Start · Esc Pause
        </p>
      </div>
    </div>
  );
};
