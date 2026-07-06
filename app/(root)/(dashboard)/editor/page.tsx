'use client';

import React, { useState, useEffect } from 'react';
import { Play, FileCode, Plus, Folder, Trash, Save, HelpCircle, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { compilePineScript } from '@/lib/pineInterpreter';
import { generateMockData } from '@/lib/simulationData';

interface ScriptFile {
  name: string;
  type: 'indicator' | 'strategy';
  code: string;
}

export default function ScriptEditorPage() {
  const initialFiles: ScriptFile[] = [
    {
      name: 'Custom_EMA.pine',
      type: 'indicator',
      code: `// Pine Script v5 Indicator
// Custom Exponential Moving Average
indicator("Custom EMA")

ema20 = ta.ema(close, 20)
plot(ema20, color=color.yellow, title="EMA 20")
`
    },
    {
      name: 'EMA_Crossover.pine',
      type: 'strategy',
      code: `// Pine Script v5 Strategy
// EMA 20/50 Crossover Signal
strategy("EMA Crossover")

ema20 = ta.ema(close, 20)
ema50 = ta.ema(close, 50)

buySignal = ta.crossover(ema20, ema50)
sellSignal = ta.crossunder(ema20, ema50)

plot(ema20, color=color.yellow)
plot(ema50, color=color.purple)

plotshape(buySignal, style=shape.triangleup, color=color.green)
plotshape(sellSignal, style=shape.triangledown, color=color.red)
`
    },
  ];

  const [files, setFiles] = useState<ScriptFile[]>(initialFiles);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [editorCode, setEditorCode] = useState<string>(initialFiles[0].code);

  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Compiler ready. Select or paste a Pine Script to compile.',
  ]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isCompiled, setIsCompiled] = useState(false);

  const selectedFile = files[selectedFileIdx];

  useEffect(() => {
    const saved = localStorage.getItem('atlas_saved_scripts');
    if (saved) {
      try {
        setFiles(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSelectFile = (idx: number) => {
    setSelectedFileIdx(idx);
    setEditorCode(files[idx].code);
    setIsCompiled(false);
    setConsoleLogs((prev) => [...prev, `Loaded file: ${files[idx].name}`]);
  };

  const handleSave = () => {
    const updated = [...files];
    updated[selectedFileIdx].code = editorCode;
    setFiles(updated);
    localStorage.setItem('atlas_saved_scripts', JSON.stringify(updated));
    toast.success(`Saved successfully: ${selectedFile.name}`);
    setConsoleLogs((prev) => [...prev, `[INFO] File saved successfully.`]);
  };

  const handleCompile = () => {
    setIsCompiling(true);
    setConsoleLogs((prev) => [...prev, `[COMPILER] Compilation started for ${selectedFile.name}...`]);

    setTimeout(() => {
      setIsCompiling(false);
      // Generate a tiny mock data for test compilation
      const mockCandles = generateMockData('NIFTY50', 60);
      const res = compilePineScript(editorCode, mockCandles);

      if (res.error) {
        setIsCompiled(false);
        toast.error("Compilation error!");
        setConsoleLogs((prev) => [
          ...prev,
          `[ERROR] Parse/Lexer exception: ${res.error}`,
          `[ERROR] Compilation failed.`
        ]);
      } else {
        setIsCompiled(true);
        toast.success("Compilation successful!");
        setConsoleLogs((prev) => [
          ...prev,
          `[COMPILER] ${selectedFile.name} compiled successfully.`,
          `[COMPILER] Found: ${res.plots.length} plot outputs, ${res.shapes.length} shape directives.`,
          `[COMPILER] Ready to apply indicator to workstation chart.`
        ]);
      }
    }, 800);
  };

  const handleApplyToChart = () => {
    localStorage.setItem('active_compiled_pine_code', editorCode);
    localStorage.setItem('active_compiled_pine_ts', Date.now().toString());
    toast.success("Applied Pine Script to Workstation Chart successfully!");
    setConsoleLogs((prev) => [...prev, `[INFO] Script loaded on active workstation cell.`]);
  };

  const handleNewFile = () => {
    const name = prompt("Enter file name (e.g. RsiFilter.pine):");
    if (!name) return;
    const cleanName = name.endsWith('.pine') ? name : `${name}.pine`;

    const newFile: ScriptFile = {
      name: cleanName,
      type: 'indicator',
      code: `// Pine Script v5: ${cleanName.replace('.pine', '')}\nindicator("${cleanName.replace('.pine', '')}")\n\nsmaVal = ta.sma(close, 14)\nplot(smaVal, color=color.yellow)\n`
    };

    const updated = [...files, newFile];
    setFiles(updated);
    localStorage.setItem('atlas_saved_scripts', JSON.stringify(updated));
    setSelectedFileIdx(files.length);
    setEditorCode(newFile.code);
    setIsCompiled(false);
    toast.success(`Created file: ${cleanName}`);
  };

  const handleDeleteFile = (idx: number) => {
    if (files.length === 1) {
      toast.error("Cannot delete the last file!");
      return;
    }
    const filename = files[idx].name;
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    localStorage.setItem('atlas_saved_scripts', JSON.stringify(updated));
    setSelectedFileIdx(0);
    setEditorCode(updated[0].code);
    setIsCompiled(false);
    toast.info(`Deleted file: ${filename}`);
  };

  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#131722] text-gray-100 overflow-hidden font-sans">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Left File Explorer */}
      <aside className="w-64 border-r border-[#2a2e39] bg-[#1c2030]/20 flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2a2e39] flex justify-between items-center bg-[#131722]/50">
          <div className="flex items-center gap-1.5">
            <Folder className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pine Explorer</span>
          </div>
          <button
            onClick={handleNewFile}
            className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
            title="Create New Script"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {files.map((file, idx) => {
            const isSelected = selectedFileIdx === idx;
            return (
              <div
                key={file.name}
                className={`flex items-center justify-between rounded-lg p-2 transition-all border ${
                  isSelected
                    ? 'bg-yellow-500/5 border-yellow-500/20'
                    : 'bg-transparent border-transparent hover:bg-gray-850/30'
                }`}
              >
                <button
                  onClick={() => handleSelectFile(idx)}
                  className="flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0"
                >
                  <FileCode className={`h-4 w-4 ${isSelected ? 'text-yellow-400' : 'text-gray-500'}`} />
                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {file.name}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteFile(idx)}
                  className="p-1 text-gray-600 hover:text-red-500 rounded cursor-pointer transition-colors"
                  title="Delete File"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Central Code Workspace */}
      <main className="flex-1 flex flex-col min-w-0 border-r border-[#2a2e39] bg-[#1c2030]/10">
        {/* Editor controls */}
        <div className="h-12 border-b border-[#2a2e39] flex justify-between items-center px-6 bg-[#131722]/50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{selectedFile?.name}</span>
            <span className="text-[9px] uppercase tracking-wider bg-gray-900 text-gray-500 px-1.5 py-0.5 rounded font-extrabold border border-gray-850">
              {selectedFile?.type}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="h-8 px-3 bg-gray-950 hover:bg-gray-850 border border-[#2a2e39] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Save className="h-3.5 w-3.5 text-gray-400" />
              Save
            </button>
            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="h-8 px-3 bg-gray-950 hover:bg-gray-850 border border-[#2a2e39] text-yellow-500 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isCompiling ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
              )}
              Compile
            </button>
            {isCompiled && (
              <button
                onClick={handleApplyToChart}
                className="h-8 px-3 bg-yellow-500 hover:bg-yellow-600 text-gray-950 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                Apply to Chart
              </button>
            )}
          </div>
        </div>

        {/* Code Editor TextArea Panel */}
        <div className="flex-1 relative font-mono text-xs p-4 bg-gray-950/20 overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-12 bg-gray-950 border-r border-[#2a2e39]/50 flex flex-col items-center pt-4 text-[10px] text-gray-650 select-none leading-relaxed">
            {Array.from({ length: 45 }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={editorCode}
            onChange={(e) => {
              setEditorCode(e.target.value);
              setIsCompiled(false);
            }}
            className="absolute top-0 bottom-0 left-12 right-0 bg-transparent text-gray-100 p-4 focus:outline-none resize-none font-mono text-xs leading-relaxed overflow-y-auto"
            spellCheck={false}
          />
        </div>

        {/* Output Console Pane */}
        <div className="h-44 border-t border-[#2a2e39] bg-gray-950 flex flex-col shrink-0">
          <div className="h-8 border-b border-[#2a2e39]/50 px-6 flex items-center bg-[#131722]/50">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Compiler Logs</span>
          </div>
          <div className="flex-1 p-4 font-mono text-[10px] text-green-400 space-y-1.5 overflow-y-auto scrollbar-hide-default leading-relaxed">
            {consoleLogs.map((log, idx) => {
              const isError = log.includes('[ERROR]');
              const isInfo = log.includes('[INFO]');
              return (
                <div key={idx} className={isError ? 'text-red-500' : isInfo ? 'text-yellow-500' : 'text-green-450'}>
                  {isError ? '✗' : isInfo ? '•' : '✓'} {log}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Right Documentation Panel */}
      <aside className="w-85 bg-[#1c2030]/20 flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2a2e39] flex items-center gap-1.5 bg-[#131722]/50">
          <HelpCircle className="h-4 w-4 text-yellow-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pine Script v5 Guide</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-hide-default font-sans">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-widest text-yellow-500">Overview</div>
            <p className="text-gray-400 leading-relaxed font-medium">
              Create indicators and strategies using standard Pine Script statements. Compiles incrementally candle-by-candle with no look-ahead.
            </p>
          </div>

          <div className="space-y-2 border-t border-[#2a2e39]/50 pt-4">
            <div className="text-[10px] uppercase font-bold tracking-widest text-yellow-500">Built-in Functions</div>
            <div className="space-y-3 font-mono text-[10px]">
              <div>
                <div className="text-white font-bold">ta.ema(source, length)</div>
                <p className="text-gray-500 font-sans mt-0.5">Calculates EMA on source array over length periods.</p>
              </div>
              <div>
                <div className="text-white font-bold">ta.sma(source, length)</div>
                <p className="text-gray-500 font-sans mt-0.5">Calculates Simple Moving Average.</p>
              </div>
              <div>
                <div className="text-white font-bold">ta.rsi(source, length)</div>
                <p className="text-gray-500 font-sans mt-0.5">Calculates Relative Strength Index.</p>
              </div>
              <div>
                <div className="text-white font-bold">ta.crossover(s1, s2) / ta.crossunder(s1, s2)</div>
                <p className="text-gray-500 font-sans mt-0.5">Detects crossovers and crossunders between series.</p>
              </div>
              <div>
                <div className="text-white font-bold">plot(series, color, title)</div>
                <p className="text-gray-500 font-sans mt-0.5">Draws a dynamic line series on the chart overlay.</p>
              </div>
              <div>
                <div className="text-white font-bold">plotshape(series, style, color)</div>
                <p className="text-gray-500 font-sans mt-0.5">Draws buy/sell triangles at the high/low of index candles.</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
