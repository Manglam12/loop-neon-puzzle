import React from 'react';
import { LoopGameState } from '../game/loop_types.ts';
import { X, Activity, Cpu, CheckCircle } from 'lucide-react';

interface DiagnosticsOverlayProps {
  gameState: LoopGameState;
  fps: number;
  frameDt: number;
  onClose: () => void;
}

export const DiagnosticsOverlay: React.FC<DiagnosticsOverlayProps> = ({
  gameState,
  fps,
  frameDt,
  onClose,
}) => {
  const { board, moveCount, echoQueue, poweredPath, isGoalConnected } = gameState;

  return (
    <div className="absolute top-16 right-4 z-30 w-72 p-3.5 rounded-xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl font-mono text-[11px] text-slate-300 pointer-events-auto select-text">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
          <Activity className="w-3.5 h-3.5" />
          <span>LOOP DIAGNOSTICS</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          aria-label="Close Diagnostics"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between">
          <span className="text-slate-400">FPS / Frame Time:</span>
          <span className="text-cyan-300 font-bold tabular-nums">
            {fps} FPS ({frameDt.toFixed(1)} ms)
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Puzzle Grid:</span>
          <span className="text-slate-200 font-bold">
            {board.size}x{board.size} ({board.tiles.length} rows)
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Start / Goal:</span>
          <span className="text-emerald-400 tabular-nums">
            ({board.startPos.x},{board.startPos.y}) → ({board.goalPos.x},{board.goalPos.y})
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">BFS Solvability:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>PAR {board.authorMovesPar || board.targetMoves} (PROVEN)</span>
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Moves Taken:</span>
          <span className="text-slate-200 tabular-nums">{moveCount} moves</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Circuit Status:</span>
          <span className={`font-bold ${isGoalConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isGoalConnected ? 'CLOSED LOOP (CONNECTED)' : 'OPEN CIRCUIT'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Powered Cells:</span>
          <span className="text-cyan-300 tabular-nums">{poweredPath.length} tiles</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Pending Echoes:</span>
          <span className="text-pink-300 font-bold tabular-nums">
            {echoQueue.length} {echoQueue.length === 1 ? 'action' : 'actions'}
          </span>
        </div>

        {echoQueue.map((e, idx) => (
          <div key={idx} className="pl-2 text-[10px] text-pink-400 flex justify-between">
            <span>Tile ({e.x + 1}, {e.y + 1}):</span>
            <span className="font-bold">{e.turnsRemaining} turn(s) left</span>
          </div>
        ))}

        <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>Renderer: Native Canvas2D Sub-pixel Vector</span>
        </div>
      </div>
    </div>
  );
};
