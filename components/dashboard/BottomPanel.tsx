'use client';

import React, { useState, useEffect } from 'react';
import {
  Play, FileDown, Smile, Frown, Award, ChevronUp, ChevronDown,
  Layers, LineChart, FileText, Database, Shield, Target
} from 'lucide-react';
import { BacktestReport, Trade, SimAccountState, SimPositionState, SimOrder } from '@/lib/simulationData';

interface BottomPanelProps {
  currentSymbol: string;
  onRunBacktest: (strategy: 'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum') => void;
  backtestReport: BacktestReport | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  isReplayActive?: boolean;
  simTrades?: Trade[];

  // Console bindings
  simAccount?: SimAccountState;
  simPosition?: SimPositionState | null;
  simOrders?: SimOrder[];
  leverage?: number;
  
  // Height Resizer props
  bottomPanelHeight: number;
  setBottomPanelHeight: (height: number) => void;
}

interface JournalEntry {
  id: string;
  time: string;
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  note: string;
}

const fmt = (n: number, d = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function BottomPanel({
  currentSymbol,
  onRunBacktest,
  backtestReport,
  isOpen,
  onToggleOpen,
  isReplayActive = false,
  simTrades = [],
  simAccount,
  simPosition,
  simOrders = [],
  leverage = 10,
  bottomPanelHeight,
  setBottomPanelHeight,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<'tester' | 'trades' | 'performance' | 'journal' | 'console'>('tester');
  const [selectedStrategy, setSelectedStrategy] = useState<'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum'>('ema_crossover');

  // Resize bottom panel drag handler
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomPanelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      // Dragging upwards increases height
      const newHeight = Math.max(120, Math.min(650, startHeight - deltaY));
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Journal State
  const [journalNote, setJournalNote] = useState('');
  const [journalSentiment, setJournalSentiment] = useState<'bullish' | 'bearish' | 'neutral'>('bullish');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  // Load journal entries from local storage
  useEffect(() => {
    const saved = localStorage.getItem('atlas_journal');
    if (saved) {
      try {
        setJournalEntries(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveJournalEntry = () => {
    if (!journalNote.trim()) return;
    const newEntry: JournalEntry = {
      id: Math.random().toString(36).substring(4, 9),
      time: new Date().toLocaleString(),
      symbol: currentSymbol,
      sentiment: journalSentiment,
      note: journalNote,
    };
    const updated = [newEntry, ...journalEntries];
    setJournalEntries(updated);
    localStorage.setItem('atlas_journal', JSON.stringify(updated));
    setJournalNote('');
  };

  const deleteJournalEntry = (id: string) => {
    const updated = journalEntries.filter((e) => e.id !== id);
    setJournalEntries(updated);
    localStorage.setItem('atlas_journal', JSON.stringify(updated));
  };

  // Custom Equity Curve SVG Area Chart path
  const equityCurveSVG = () => {
    if (!backtestReport || backtestReport.equityCurve.length === 0) return '';
    const curve = backtestReport.equityCurve;
    const width = 600;
    const height = 90;

    const balances = curve.map((c) => c.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const range = max - min || 1;

    const points = curve.map((c, idx) => {
      const x = (idx / (curve.length - 1)) * width;
      const y = height - ((c.balance - min) / range) * (height - 15) - 5;
      return `${x},${y}`;
    });

    return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  };

  const handleExport = () => {
    if (!backtestReport) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["ID,Type,Entry Price,Exit Price,Entry Time,Exit Time,PnL,PnL %"]
        .concat(backtestReport.trades.map(t => `${t.id},${t.type},${t.entryPrice},${t.exitPrice},${t.entryTime},${t.exitTime},${t.pnl},${t.pnlPercent}%`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `backtest_${currentSymbol}_${selectedStrategy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Collapsed State
  if (!isOpen) {
    return (
      <div 
        onClick={onToggleOpen}
        className="h-9 border-t border-[#21262d] bg-[#161B22] flex items-center justify-between px-5 cursor-pointer hover:bg-[#1c2128] transition-all duration-150 z-30 shrink-0 select-none"
      >
        <div className="flex gap-4 text-[9px] uppercase font-black tracking-wider text-gray-500">
          <span>Strategy Tester ▴</span>
          <span>Trade Log ▴</span>
          <span>Performance Dashboard ▴</span>
          <span>Trading Journal ▴</span>
          <span>Account Console ▴</span>
        </div>
        <div className="text-[9px] text-yellow-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
          Expand Workstation Panel
          <ChevronUp className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ height: `${bottomPanelHeight}px` }}
      className="border-t border-[#21262d] bg-[#161B22] flex flex-col z-30 shrink-0 select-none relative"
    >
      {/* Resizer Splitter line */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-yellow-500/50 transition-all z-50"
      />
      
      {/* Tabs Header */}
      <div className="flex border-b border-[#21262d] px-4 py-1.5 bg-[#0d1117]/40 items-center justify-between shrink-0">
        <div className="flex gap-1">
          {([
            { id: 'tester', label: 'Strategy Tester', icon: Layers },
            { id: 'trades', label: 'Trades List', icon: LineChart },
            { id: 'performance', label: 'Performance', icon: Award },
            { id: 'journal', label: 'Trading Journal', icon: FileText },
            { id: 'console', label: 'Account Console', icon: Database },
          ] as const).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all border flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-sm'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'tester' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value as any)}
                className="bg-[#0d0f14] border border-[#21262d] text-[10px] text-white h-7 px-2 rounded-lg focus:outline-none font-semibold cursor-pointer"
              >
                <option value="ema_crossover">EMA 20/50 Crossover</option>
                <option value="rsi_mean_reversion">RSI Mean Reversion (30/70)</option>
                <option value="macd_momentum">MACD Momentum Crossover</option>
              </select>
              <button
                onClick={() => onRunBacktest(selectedStrategy)}
                className="h-7 px-3 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-black text-[9px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow"
              >
                <Play className="h-2.5 w-2.5 fill-gray-950" />
                Run
              </button>
            </div>
          )}

          <button
            onClick={onToggleOpen}
            className="p-1 hover:bg-[#1c2128] text-gray-400 hover:text-white rounded cursor-pointer transition-colors border border-transparent"
            title="Collapse Workstation Panel"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        
        {/* Tab 1: Strategy Tester */}
        {activeTab === 'tester' && (
          <div className="h-full">
            {!backtestReport ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-600">
                <Award className="h-8 w-8 text-gray-700 mb-1.5 animate-pulse" />
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">No strategy simulation run yet</div>
                <div className="text-[9px] text-gray-500 mt-0.5">
                  Select a backtesting strategy and click "Run Strategy" to test performance.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-5 items-start">
                {/* Equity graph */}
                <div className="col-span-2 space-y-2">
                  <div className="flex justify-between items-center text-[9px] uppercase font-black text-gray-500 tracking-widest px-1">
                    <span>Equity & Monte Carlo Cone Projections</span>
                    <span className="font-mono text-gray-600">Initial Balance: ${fmt(backtestReport.metrics.initialBalance, 0)}</span>
                  </div>
                  <div className="relative h-28 bg-[#0d0f14] border border-[#21262d] rounded-lg overflow-hidden flex items-end">
                    <svg className="w-full h-[90px]" viewBox="0 0 600 90" preserveAspectRatio="none">
                      {/* Dispersion paths */}
                      {backtestReport.monteCarloPaths.map((path, pIdx) => {
                        const points = path.map((bal, idx) => {
                          const x = (idx / (path.length - 1)) * 600;
                          const range = Math.max(...path) - Math.min(...path) || 1;
                          const y = 90 - ((bal - Math.min(...path)) / range) * 80 - 5;
                          return `${x},${y}`;
                        });
                        return (
                          <path
                            key={`mc-${pIdx}`}
                            d={`M ${points.join(' L ')}`}
                            fill="none"
                            stroke="#00E676"
                            strokeWidth="0.5"
                            strokeOpacity="0.08"
                          />
                        );
                      })}

                      {/* Main Equity curve */}
                      <defs>
                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00E676" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={equityCurveSVG()} fill="url(#eqGrad)" />
                      <path
                        d={backtestReport.equityCurve
                          .map((c, idx) => {
                            const x = (idx / (backtestReport.equityCurve.length - 1)) * 600;
                            const range = Math.max(...backtestReport.equityCurve.map((e) => e.balance)) - Math.min(...backtestReport.equityCurve.map((e) => e.balance)) || 1;
                            const y = 90 - ((c.balance - Math.min(...backtestReport.equityCurve.map((e) => e.balance))) / range) * 80 - 5;
                            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#00E676"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>
                </div>

                {/* Strategy Summary stats */}
                <div className="space-y-3.5">
                  <div className="text-[9px] uppercase font-black tracking-widest text-gray-500">Quick Metrics</div>
                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                    <div className="p-2 bg-[#0d0f14] border border-[#21262d] rounded-lg">
                      <div className="text-[7px] text-gray-500 uppercase">Net Profit</div>
                      <div className={`text-[10px] font-black ${backtestReport.metrics.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {backtestReport.metrics.netProfit >= 0 ? '+' : ''}
                        ${fmt(backtestReport.metrics.netProfit, 0)}
                      </div>
                    </div>
                    <div className="p-2 bg-[#0d0f14] border border-[#21262d] rounded-lg">
                      <div className="text-[7px] text-gray-500 uppercase">Win Rate</div>
                      <div className="text-[10px] font-black text-white">{backtestReport.metrics.winRate}%</div>
                    </div>
                    <div className="p-2 bg-[#0d0f14] border border-[#21262d] rounded-lg">
                      <div className="text-[7px] text-gray-500 uppercase">Sharpe Ratio</div>
                      <div className="text-[10px] font-black text-yellow-500">{backtestReport.metrics.sharpeRatio}</div>
                    </div>
                    <div className="p-2 bg-[#0d0f14] border border-[#21262d] rounded-lg">
                      <div className="text-[7px] text-gray-500 uppercase">Max Drawdown</div>
                      <div className="text-[10px] font-black text-red-500">-{backtestReport.metrics.maxDrawdown}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Trades list */}
        {activeTab === 'trades' && (
          <div className="space-y-2.5 h-full flex flex-col">
            <div className="flex justify-between items-center px-1 shrink-0">
              <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">
                Simulation Executed Trades ({backtestReport ? backtestReport.trades.length : 0})
              </span>
              {backtestReport && (
                <button
                  onClick={handleExport}
                  className="text-[9px] font-black text-yellow-500 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <FileDown className="h-3.5 w-3.5" /> Export CSV
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border border-[#21262d] rounded-lg font-mono text-[9px] bg-[#0d0f14]/50 scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0d0f14] sticky top-0 text-gray-500 uppercase font-black tracking-wider border-b border-[#21262d] z-10">
                  <tr>
                    <th className="p-2 pl-3">Trade ID</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Entry Price</th>
                    <th className="p-2">Exit Price</th>
                    <th className="p-2">Time Interval</th>
                    <th className="p-2 pr-3 text-right">Net Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]/40">
                  {!backtestReport ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-600">
                        No trade logs loaded. Run strategy backtest first.
                      </td>
                    </tr>
                  ) : (
                    (isReplayActive && simTrades.length > 0 ? simTrades : backtestReport.trades).map((t) => (
                      <tr key={t.id} className="hover:bg-[#1c2128]/40 text-gray-300">
                        <td className="p-2 pl-3 font-bold text-yellow-500">#{t.id}</td>
                        <td className={`p-2 font-black ${t.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{t.type}</td>
                        <td className="p-2">${fmt(t.entryPrice)}</td>
                        <td className="p-2">${fmt(t.exitPrice)}</td>
                        <td className="p-2 text-gray-500">{t.entryTime} to {t.exitTime}</td>
                        <td className={`p-2 pr-3 text-right font-black ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {t.pnl >= 0 ? '+' : ''}${fmt(t.pnl)} ({t.pnlPercent.toFixed(2)}%)
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Performance Dashboard */}
        {activeTab === 'performance' && (
          <div className="h-full">
            {!backtestReport ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Award className="h-8 w-8 text-gray-700 mb-1 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-gray-500">No performance metrics loaded</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 items-start font-mono">
                {/* Statistics Cards */}
                <div className="col-span-1 space-y-2 bg-[#0d0f14]/50 border border-[#21262d] p-3 rounded-lg text-[10px]">
                  <div className="text-[8px] uppercase font-black tracking-widest text-gray-500 border-b border-[#21262d] pb-1 mb-1.5">Ratio Metrics</div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sharpe Ratio</span>
                    <span className="text-yellow-400 font-bold">{backtestReport.metrics.sharpeRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sortino Ratio</span>
                    <span className="text-yellow-400 font-bold">{backtestReport.metrics.sortinoRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Profit Factor</span>
                    <span className="text-green-400 font-bold">{backtestReport.metrics.profitFactor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Max Drawdown</span>
                    <span className="text-red-400 font-bold">-{backtestReport.metrics.maxDrawdown}%</span>
                  </div>
                </div>

                {/* Returns Heatmap */}
                <div className="col-span-3 space-y-1.5">
                  <div className="text-[9px] uppercase font-black text-gray-500 tracking-widest px-1">Monthly Return Dispersion Heatmap (%)</div>
                  <div className="border border-[#21262d] rounded-lg overflow-hidden bg-[#0d0f14]/50 text-[8px] text-center">
                    <table className="w-full border-collapse">
                      <thead className="bg-[#0d0f14] text-gray-500 border-b border-[#21262d]">
                        <tr>
                          <th className="p-1.5 text-left pl-3">Year</th>
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m) => (
                            <th key={m} className="p-1.5">{m}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(backtestReport.monthlyReturns).map((yStr) => {
                          const year = parseInt(yStr);
                          const months = backtestReport.monthlyReturns[year];
                          return (
                            <tr key={year} className="border-b border-[#21262d]/40">
                              <td className="p-1.5 text-left pl-3 text-white font-bold">{year}</td>
                              {Array.from({ length: 12 }).map((_, mIdx) => {
                                const val = months[mIdx] ?? 0;
                                const isPos = val > 0;
                                const isNeg = val < 0;
                                const bg = isPos ? 'rgba(0, 230, 118, 0.08)' : isNeg ? 'rgba(255, 61, 0, 0.08)' : 'transparent';
                                const textClass = isPos ? 'text-green-400 font-bold' : isNeg ? 'text-red-400 font-bold' : 'text-gray-600';
                                return (
                                  <td key={mIdx} className="p-1.5" style={{ backgroundColor: bg }}>
                                    <span className={textClass}>{val !== 0 ? `${val > 0 ? '+' : ''}${val}%` : '0.0%'}</span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Journal Logs */}
        {activeTab === 'journal' && (
          <div className="grid grid-cols-3 gap-6 h-full items-start">
            <div className="col-span-1 space-y-2">
              <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-1">Add Trading Note</div>
              <div className="space-y-3 bg-[#0d0f14]/40 p-3 rounded-lg border border-[#21262d]">
                <textarea
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value)}
                  placeholder={`Write note for ${currentSymbol}...`}
                  rows={2}
                  className="w-full bg-[#0d0f14] border border-[#21262d] rounded-lg p-2 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500 resize-none"
                />

                <div className="flex justify-between items-center">
                  <div className="flex bg-[#0d0f14] p-0.5 rounded-lg border border-[#21262d] gap-0.5">
                    <button
                      onClick={() => setJournalSentiment('bullish')}
                      className={`p-1 rounded cursor-pointer transition-colors ${journalSentiment === 'bullish' ? 'bg-green-500/10 text-green-400' : 'text-gray-600'}`}
                      title="Bullish"
                    >
                      <Smile className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setJournalSentiment('bearish')}
                      className={`p-1 rounded cursor-pointer transition-colors ${journalSentiment === 'bearish' ? 'bg-red-500/10 text-red-400' : 'text-gray-600'}`}
                      title="Bearish"
                    >
                      <Frown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={saveJournalEntry}
                    className="h-6.5 px-3 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-black text-[9px] rounded-lg transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-2 h-full flex flex-col">
              <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-1">Journal Entry Logs</div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {journalEntries.length === 0 ? (
                  <div className="text-center py-6 text-gray-600 text-[10px]">No saved notes found.</div>
                ) : (
                  journalEntries.map((e) => (
                    <div
                      key={e.id}
                      className="p-2.5 bg-[#0d0f14]/30 border border-[#21262d] rounded-lg flex justify-between items-start"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-yellow-500">{e.symbol}</span>
                          <span className="text-[8px] text-gray-500 font-mono">{e.time}</span>
                          <span className={`text-[7px] uppercase tracking-wide font-black px-1 rounded ${
                            e.sentiment === 'bullish' ? 'bg-green-500/15 text-green-400' :
                            e.sentiment === 'bearish' ? 'bg-red-500/15 text-red-400' : 'bg-gray-800 text-gray-400'
                          }`}>
                            {e.sentiment}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-300 leading-relaxed font-medium">{e.note}</p>
                      </div>
                      <button
                        onClick={() => deleteJournalEntry(e.id)}
                        className="text-[8px] font-black text-red-400 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Account Console */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-3 gap-5 h-full items-start text-[10px] font-mono">
            {/* Balance status */}
            <div className="space-y-2">
              <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-1">Account Margins</div>
              {simAccount ? (
                <div className="bg-[#0d0f14]/40 border border-[#21262d] p-3 rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Balance</span>
                    <span className="text-white font-bold">${fmt(simAccount.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Equity</span>
                    <span className="text-white font-bold">${fmt(simAccount.equity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Margin Used</span>
                    <span className="text-red-400 font-bold">${fmt(simAccount.marginUsed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Free Margin</span>
                    <span className="text-green-400 font-bold">${fmt(simAccount.freeMargin)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-[#21262d] pt-1.5 mt-1">
                    <span className="text-gray-500">Leverage Setting</span>
                    <span className="text-yellow-400 font-bold">{leverage}x Max</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-600">No account details linked.</div>
              )}
            </div>

            {/* Position details */}
            <div className="space-y-2">
              <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-1">Open Positions</div>
              {simPosition ? (
                <div className="bg-[#0d0f14]/40 border border-[#21262d] p-3 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${simPosition.isLong ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                      {simPosition.isLong ? 'LONG' : 'SHORT'}
                    </span>
                    <span className="text-white font-bold">{simPosition.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Position Size</span>
                    <span className="text-gray-300">{simPosition.qty} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avg Entry Price</span>
                    <span className="text-gray-300">${fmt(simPosition.avgEntryPrice)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-[#21262d] pt-1.5 mt-1">
                    <span className="text-gray-500">Floating P&L</span>
                    <span className={`font-black ${simPosition.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {simPosition.unrealizedPnL >= 0 ? '+' : ''}${fmt(simPosition.unrealizedPnL)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-28 bg-[#0d0f14]/10 border border-[#21262d] border-dashed rounded-lg flex items-center justify-center text-gray-600 text-[9px] uppercase font-black">
                  No active positions
                </div>
              )}
            </div>

            {/* Pending Orders log */}
            <div className="space-y-2 h-full flex flex-col">
              <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-1">Pending Orders Queue</div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 border border-[#21262d] rounded-lg bg-[#0d0f14]/30 p-2 scrollbar-thin">
                {simOrders.length === 0 ? (
                  <div className="text-center py-5 text-gray-600 text-[8px] uppercase font-black">No pending orders</div>
                ) : (
                  simOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex justify-between items-center p-1.5 border border-[#21262d] rounded-md bg-[#0d0f14]/50"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-300">{o.symbol}</span>
                        <span className="text-[8px] text-gray-500 uppercase">{o.mode} · {o.type}</span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-yellow-400 font-bold">${fmt(o.price)}</span>
                        <span className="text-[7px] text-gray-500 font-bold">Qty: {o.qty}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
