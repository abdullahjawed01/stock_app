'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, FolderPlus, Download, Tag, Star, Camera, History, FileText, ChevronRight, Check } from 'lucide-react';
import { Toaster, toast } from 'sonner';

interface BlueprintSetup {
  id: string;
  time: string;
  symbol: string;
  conviction: number; // 1-5
  strategy: string;
  notes: string;
  tags: string[];
}

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<BlueprintSetup[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Form State
  const [symbol, setSymbol] = useState('BTC/USD');
  const [conviction, setConviction] = useState(4);
  const [strategy, setStrategy] = useState('EMA Crossover');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['EMA', 'Bullish']);

  // Load setups from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('atlas_blueprints');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBlueprints(parsed);
        if (parsed.length > 0) setSelectedIdx(0);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Seed default setups if empty
      const seeds: BlueprintSetup[] = [
        {
          id: 'bp1',
          time: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleString(),
          symbol: 'NIFTY50',
          conviction: 5,
          strategy: 'RSI Mean Reversion',
          notes: 'Nifty touched the key oversold region below 30 RSI on the hourly chart. Formed a strong bullish rejection candle at key support level 22400. High probability bounce trade.',
          tags: ['Oversold', 'Reversal', 'Support']
        },
        {
          id: 'bp2',
          time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString(),
          symbol: 'BTC/USD',
          conviction: 4,
          strategy: 'EMA Crossover',
          notes: 'Bullish Golden Cross: 20 EMA crossed above 50 EMA on the 4H chart. Volume cluster indicates strong institutional accumulation near 67000.',
          tags: ['Bullish', 'EMA', 'TrendFollow']
        }
      ];
      setBlueprints(seeds);
      setSelectedIdx(0);
      localStorage.setItem('atlas_blueprints', JSON.stringify(seeds));
    }
  }, []);

  const handleCreateBlueprint = () => {
    const newBp: BlueprintSetup = {
      id: Math.random().toString(36).substring(4, 9),
      time: new Date().toLocaleString(),
      symbol,
      conviction,
      strategy,
      notes: notes || 'No detailed blueprint analysis provided yet.',
      tags,
    };

    const updated = [newBp, ...blueprints];
    setBlueprints(updated);
    setSelectedIdx(0);
    localStorage.setItem('atlas_blueprints', JSON.stringify(updated));

    // Reset Form
    setNotes('');
    toast.success(`Captured Blueprint setup for ${symbol}!`);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleDeleteTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  const handleExportPDF = () => {
    toast.success("Blueprint exported successfully as PDF!");
  };

  const selectedBp = selectedIdx !== null ? blueprints[selectedIdx] : null;

  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#07080a] text-gray-100 overflow-hidden font-sans">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Left List Pane */}
      <aside className="w-80 border-r border-gray-800 bg-[#0B0C0E]/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/20">
          <div className="flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Captured Setup Logs</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide-default">
          {blueprints.map((bp, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={bp.id}
                onClick={() => setSelectedIdx(idx)}
                className={`w-full p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : 'bg-transparent border-transparent hover:bg-gray-850/30 hover:border-gray-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${isSelected ? 'text-yellow-400' : 'text-white'}`}>
                    {bp.symbol}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">{bp.time.substring(0, 10)}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-1 font-semibold">{bp.strategy}</div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {bp.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[8px] bg-gray-900 text-gray-500 px-1 py-0.5 rounded font-bold">
                      #{t}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0B0C0E]/20 overflow-y-auto scrollbar-hide-default p-6">
        {selectedBp ? (
          <div className="space-y-6 max-w-4xl">
            {/* Header Title controls */}
            <div className="flex justify-between items-center border-b border-gray-800 pb-4 bg-gray-900/10">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedBp.symbol} Setup Design
                  <span className="text-[10px] bg-gray-850 text-gray-400 px-2 py-0.5 rounded font-mono border border-gray-900 font-bold uppercase tracking-wider">
                    {selectedBp.strategy}
                  </span>
                </h1>
                <div className="text-xs text-gray-500 font-medium mt-1 font-mono">Captured on: {selectedBp.time}</div>
              </div>

              <button
                onClick={handleExportPDF}
                className="h-9 px-4 bg-yellow-500 hover:bg-yellow-600 text-gray-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg"
              >
                <Download className="h-4 w-4" />
                Export Blueprint
              </button>
            </div>

            {/* Simulated Chart Screenshot Block */}
            <div className="relative aspect-video bg-gray-950 border border-gray-850 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center select-none group">
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900/10 to-gray-950/80 pointer-events-none" />
              {/* Dotted grid layout */}
              <div className="absolute inset-0 opacity-15" style={{ 
                backgroundImage: 'radial-gradient(circle, #9095A1 1px, transparent 1px)', 
                backgroundSize: '20px 20px' 
              }} />

              {/* Simulated chart annotations */}
              <div className="relative text-center space-y-2 z-10 p-6">
                <div className="text-sm font-bold text-white">{selectedBp.symbol} Chart Capture Snapshot</div>
                <div className="text-[10px] text-gray-400 font-medium font-mono border border-gray-850 px-2 py-1 rounded bg-gray-950/80 inline-block">
                  Target level annotations, drawings, and indicator lines are version locked here.
                </div>
              </div>

              <div className="absolute bottom-4 right-4 flex gap-1 z-20 font-mono text-[9px] bg-gray-950/60 p-1 rounded border border-gray-850/50 backdrop-blur-sm text-gray-500">
                Resolution: 1920x1080
              </div>
            </div>

            {/* Analysis details */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column notes */}
              <div className="col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Trading Setup Idea</div>
                  <p className="p-4 bg-gray-950/30 border border-gray-850 rounded-xl text-xs text-gray-300 leading-relaxed font-medium">
                    {selectedBp.notes}
                  </p>
                </div>
              </div>

              {/* Right Column details */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Setup Profile</div>
                  <div className="p-4 bg-gray-950/30 border border-gray-850 rounded-xl space-y-3 font-medium text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Conviction:</span>
                      <div className="flex gap-0.5 text-yellow-500">
                        {Array.from({ length: selectedBp.conviction }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-yellow-500" />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Strategy Type:</span>
                      <span className="text-white font-bold">{selectedBp.strategy}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="text-gray-500">Setup Tags:</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {selectedBp.tags.map((t) => (
                          <span key={t} className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Capture Form widget (collapsible/bottom section) */}
        <div className="mt-8 border-t border-gray-800 pt-6">
          <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-4">Capture New Blueprint Setup</div>
          
          <div className="grid grid-cols-4 gap-4 p-5 bg-gray-950/40 border border-gray-850 rounded-xl items-end">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold tracking-widest text-gray-500">Market Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-gray-950 border border-gray-850 rounded-lg h-9 px-3 text-xs text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold tracking-widest text-gray-500">Strategy Tag</label>
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-gray-950 border border-gray-850 rounded-lg h-9 px-3 text-xs text-white focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold tracking-widest text-gray-500">Conviction Scale</label>
              <select
                value={conviction}
                onChange={(e) => setConviction(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-850 rounded-lg h-9 px-2 text-xs text-white focus:outline-none focus:border-yellow-500 transition-colors cursor-pointer"
              >
                <option value="5">5 Star (High conviction)</option>
                <option value="4">4 Star (Good conviction)</option>
                <option value="3">3 Star (Moderate conviction)</option>
                <option value="2">2 Star (Low conviction)</option>
              </select>
            </div>
            <button
              onClick={handleCreateBlueprint}
              className="h-9 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-lg"
            >
              <FolderPlus className="h-4 w-4" />
              Capture Blueprint
            </button>

            <div className="col-span-4 space-y-1.5 mt-2">
              <label className="text-[9px] uppercase font-bold tracking-widest text-gray-500">Trading Setup Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write trade trigger details, confirmations, and stop/target invalidation zones..."
                rows={2}
                className="w-full bg-gray-950 border border-gray-850 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-yellow-500 resize-none font-medium"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
