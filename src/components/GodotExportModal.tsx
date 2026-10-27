import React, { useState } from 'react';
import { GODOT_FILES, createGodotProjectZip } from '../game/godot_project_source.ts';
import { Download, FileCode, Copy, Check, X, Terminal, Cpu, Sparkles } from 'lucide-react';

interface GodotExportModalProps {
  onClose: () => void;
}

export const GodotExportModal: React.FC<GodotExportModalProps> = ({ onClose }) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedFile = GODOT_FILES[selectedFileIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const blob = await createGodotProjectZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loop_neon_echo_godot4.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Godot zip', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-none select-none pointer-events-auto">
      <div className="w-full max-w-4xl max-h-[90vh] p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono text-slate-100">
                LOOP — GODOT 4.3 ANDROID PROJECT SOURCE
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Modular GDScripts, BFS Solver, Procedural Generator, Native 2D Drawing & Android Export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'PACKAGING...' : 'DOWNLOAD .ZIP'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close Godot Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Left File Tree + Right Code Viewer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden">
          {/* File List */}
          <div className="md:col-span-1 rounded-xl bg-slate-950/70 border border-slate-800 p-2 overflow-y-auto flex flex-col gap-1">
            <span className="text-[10px] font-mono text-slate-400 px-2 py-1 font-bold uppercase tracking-wider">
              Project Manifest ({GODOT_FILES.length} Files)
            </span>
            {GODOT_FILES.map((file, idx) => (
              <button
                key={file.path}
                onClick={() => setSelectedFileIdx(idx)}
                className={`w-full text-left p-2 rounded-lg text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer ${
                  selectedFileIdx === idx
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold'
                    : 'hover:bg-slate-850 text-slate-300'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{file.path}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="md:col-span-2 rounded-xl bg-slate-950/80 border border-slate-800 p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-200">
                  {selectedFile.path}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  — {selectedFile.description}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>

            <pre className="flex-1 overflow-auto p-2 rounded bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed select-text">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>

        {/* Windows / Android Build Quick Hint Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Windows CLI Build: <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">godot --export-debug "Android" builds/echoshift.apk</code></span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>100% Offline · Zero SDK Bloat · Stable 60 FPS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
