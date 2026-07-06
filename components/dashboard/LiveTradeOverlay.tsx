'use client';

/**
 * LiveTradeOverlay
 *
 * Rendered ON TOP of every TradingViewWidget cell.
 * Provides:
 *  - One-click Long / Short paper trade entry with SL/TP brackets
 *  - Floating real-time P&L badge (auto-closes on SL/TP hit)
 *  - Per-chart mini backtest panel (runs against simulated candles)
 *  - Trade history log persisted in localStorage
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, X, Play, BarChart2,
  ChevronDown, ChevronUp, Target, Shield, Zap,
  ArrowUpRight, ArrowDownRight,
  RefreshCw, FileDown, Layers
} from 'lucide-react';
import { generateMockData, runBacktest, BacktestReport, Candle } from '@/lib/simulationData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaperTrade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  qty: number;
  entryPrice: number;
  sl: number | null;
  tp: number | null;
  entryTime: string;
  exitPrice?: number;
  exitTime?: string;
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
}

interface LiveTradeOverlayProps {
  symbol: string;
  livePrice: number;
  defaultCollapsed?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, d = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const pct = (pnl: number, entry: number, qty: number) =>
  entry > 0 ? ((pnl / (entry * qty)) * 100).toFixed(2) : '0.00';

function pnlFor(trade: PaperTrade, currentPrice: number): number {
  const price = trade.status === 'CLOSED' ? (trade.exitPrice ?? currentPrice) : currentPrice;
  const dir = trade.direction === 'LONG' ? 1 : -1;
  return dir * (price - trade.entryPrice) * trade.qty;
}

function equityPath(report: BacktestReport): string {
  const curve = report.equityCurve;
  if (!curve.length) return '';
  const W = 280, H = 72;
  const vals = curve.map(c => c.balance);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = curve.map((c, i) => {
    const x = (i / (curve.length - 1)) * W;
    const y = H - ((c.balance - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  });
  return `M 0,${H} L ${pts.join(' L ')} L ${W},${H} Z`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LiveTradeOverlay({
  symbol,
  livePrice,
  defaultCollapsed = false,
}: LiveTradeOverlayProps) {
  const [panelOpen, setPanelOpen] = useState(!defaultCollapsed);
  const [activeTab, setActiveTab] = useState<'trade' | 'history'>('trade');

  // Order form
  const [qty, setQty] = useState(0.01);
  const [slPct, setSlPct] = useState(1.5);
  const [tpPct, setTpPct] = useState(3.0);
  const [useSL, setUseSL] = useState(true);
  const [useTP, setUseTP] = useState(true);
  const [bracketMode, setBracketMode] = useState<'pct' | 'fixed'>('pct');
  const [fixedSL, setFixedSL] = useState(0);
  const [fixedTP, setFixedTP] = useState(0);

  // Trades
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const openTrade = trades.find(t => t.status === 'OPEN');

  const candlesRef = useRef<Candle[]>([]);

  useEffect(() => {
    candlesRef.current = generateMockData(symbol);
  }, [symbol]);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`atlas_paper_${symbol}`);
      if (raw) setTrades(JSON.parse(raw));
    } catch {}
  }, [symbol]);

  const persist = useCallback((next: PaperTrade[]) => {
    setTrades(next);
    localStorage.setItem(`atlas_paper_${symbol}`, JSON.stringify(next));
  }, [symbol]);

  // Real-time P&L + auto SL/TP
  const closeTrade = useCallback((id: string, price?: number) => {
    const exitPrice = price ?? livePrice;
    setTrades(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        const pnl = pnlFor(t, exitPrice);
        return { ...t, exitPrice, exitTime: new Date().toLocaleTimeString(), pnl, status: 'CLOSED' as const };
      });
      localStorage.setItem(`atlas_paper_${symbol}`, JSON.stringify(next));
      return next;
    });
  }, [livePrice, symbol]);

  useEffect(() => {
    if (!openTrade || livePrice <= 0) return;
    if (openTrade.sl !== null) {
      const slHit = openTrade.direction === 'LONG' ? livePrice <= openTrade.sl : livePrice >= openTrade.sl;
      if (slHit) { closeTrade(openTrade.id, livePrice); return; }
    }
    if (openTrade.tp !== null) {
      const tpHit = openTrade.direction === 'LONG' ? livePrice >= openTrade.tp : livePrice <= openTrade.tp;
      if (tpHit) { closeTrade(openTrade.id, livePrice); return; }
    }
  }, [livePrice, openTrade, closeTrade]);

  // Computed
  const openPnL = openTrade ? pnlFor(openTrade, livePrice) : null;
  const closedPnL = trades.filter(t => t.status === 'CLOSED').reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalTrades = trades.filter(t => t.status === 'CLOSED').length;
  const winners = trades.filter(t => t.status === 'CLOSED' && (t.pnl ?? 0) > 0).length;
  const winRate = totalTrades > 0 ? ((winners / totalTrades) * 100).toFixed(0) : '—';

  const openPosition = useCallback((direction: 'LONG' | 'SHORT') => {
    if (openTrade) return;
    const entry = livePrice;
    const sl = useSL
      ? bracketMode === 'pct'
        ? direction === 'LONG' ? entry * (1 - slPct / 100) : entry * (1 + slPct / 100)
        : fixedSL
      : null;
    const tp = useTP
      ? bracketMode === 'pct'
        ? direction === 'LONG' ? entry * (1 + tpPct / 100) : entry * (1 - tpPct / 100)
        : fixedTP
      : null;
    const trade: PaperTrade = {
      id: Date.now().toString(36),
      symbol, direction, qty, entryPrice: entry, sl, tp,
      entryTime: new Date().toLocaleTimeString(),
      status: 'OPEN',
    };
    persist([trade, ...trades]);
    setActiveTab('trade');
  }, [openTrade, livePrice, useSL, useTP, slPct, tpPct, fixedSL, fixedTP, bracketMode, qty, symbol, trades, persist]);

  const clearHistory = useCallback(() => {
    persist(trades.filter(t => t.status === 'OPEN'));
  }, [trades, persist]);

  const previewSL = useSL && bracketMode === 'pct'
    ? { long: livePrice * (1 - slPct / 100), short: livePrice * (1 + slPct / 100) }
    : null;
  const previewTP = useTP && bracketMode === 'pct'
    ? { long: livePrice * (1 + tpPct / 100), short: livePrice * (1 - tpPct / 100) }
    : null;
  const rrLong = previewSL && previewTP
    ? (Math.abs(previewTP.long - livePrice) / Math.abs(previewSL.long - livePrice)).toFixed(2)
    : '—';

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-end">

      {/* ── Floating P&L Badge ──────────────────────────────────────────────── */}
      {openTrade && openPnL !== null && (
        <div className={`absolute top-12 left-3 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border backdrop-blur-xl shadow-2xl text-[9px] font-black cursor-default select-none transition-all ${
          openPnL >= 0
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {openPnL >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3 text-red-400" />}
          <span>{openTrade.direction}</span>
          <span className="opacity-50">·</span>
          <span>{openTrade.qty} @ {fmt(openTrade.entryPrice)}</span>
          <span className="opacity-50">·</span>
          <span className="font-black">{openPnL >= 0 ? '+' : ''}{fmt(openPnL)}</span>
          <span className="opacity-60">({pct(openPnL, openTrade.entryPrice, openTrade.qty)}%)</span>
          <button
            onClick={() => closeTrade(openTrade.id)}
            className="ml-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/30 hover:text-red-300 transition-all cursor-pointer"
            title="Close Position"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {/* ── Toggle button ───────────────────────────────────────────────────── */}
      <div className="pointer-events-auto flex justify-end px-3 pb-1.5">
        <button
          onClick={() => setPanelOpen(v => !v)}
          className={`h-7 px-3 rounded-t-xl text-[8px] font-black flex items-center gap-1.5 border-t border-x cursor-pointer transition-all backdrop-blur-xl ${
            panelOpen
              ? 'bg-[#0c0d10]/90 border-[#2a2e39] text-gray-500'
              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/15'
          }`}
        >
          <Layers className="h-3 w-3" />
          Paper Trade
          {panelOpen ? <ChevronDown className="h-3 w-3 opacity-60" /> : <ChevronUp className="h-3 w-3" />}
          {openTrade && (
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ml-0.5 ${openPnL !== null && openPnL >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
          )}
        </button>
      </div>

      {/* ── Main Panel ──────────────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="pointer-events-auto bg-[#07080a]/97 border-t border-[#1e222d] backdrop-blur-2xl w-full">

          {/* Tab bar */}
          <div className="flex border-b border-[#1e222d] px-3 pt-1.5 gap-0.5 items-center justify-between">
            <div className="flex gap-0.5">
              {(['trade', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-t-lg cursor-pointer transition-all border-b-2 flex items-center gap-1 ${
                    activeTab === tab
                      ? 'text-yellow-400 border-yellow-500 bg-yellow-500/5'
                      : 'text-gray-600 border-transparent hover:text-gray-400'
                  }`}
                >
                  {tab === 'trade' && <Zap className="h-2.5 w-2.5" />}
                  {tab === 'history' && <Layers className="h-2.5 w-2.5" />}
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pr-1">
              <span className="text-[8px] font-mono text-gray-600">
                WR: <span className="text-white font-black">{winRate}%</span>
              </span>
              <span className={`text-[8px] font-mono font-black ${closedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {closedPnL >= 0 ? '+' : ''}{fmt(closedPnL)}
              </span>
              <button onClick={() => setPanelOpen(false)} className="p-0.5 text-gray-600 hover:text-white cursor-pointer rounded">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ── TAB: Trade ─────────────────────────────────────────────────── */}
          {activeTab === 'trade' && (
            <div className="p-3 space-y-2.5">
              {openTrade ? (
                <div className="space-y-2">
                  <div className={`rounded-xl border p-3 space-y-2 ${
                    (openPnL ?? 0) >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${
                          openTrade.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>{openTrade.direction}</span>
                        <span className="text-[10px] font-black text-white">{symbol}</span>
                        <span className="text-[8px] font-mono text-gray-500">× {openTrade.qty}</span>
                      </div>
                      <span className={`text-sm font-black tabular-nums ${(openPnL ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(openPnL ?? 0) >= 0 ? '+' : ''}{fmt(openPnL ?? 0)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[8px] font-mono">
                      <div><div className="text-gray-600">Entry</div><div className="text-white font-black">{fmt(openTrade.entryPrice)}</div></div>
                      <div><div className="text-gray-600">Current</div><div className="text-yellow-400 font-black">{fmt(livePrice)}</div></div>
                      <div><div className="text-gray-600">P&L %</div><div className={`font-black ${(openPnL ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(openPnL ?? 0) >= 0 ? '+' : ''}{pct(openPnL ?? 0, openTrade.entryPrice, openTrade.qty)}%</div></div>
                      <div>
                        {openTrade.sl && <div><div className="text-red-400/60 flex items-center gap-0.5"><Shield className="h-2 w-2" />SL</div><div className="text-red-400 font-black">{fmt(openTrade.sl)}</div></div>}
                        {openTrade.tp && <div><div className="text-green-400/60 flex items-center gap-0.5"><Target className="h-2 w-2" />TP</div><div className="text-green-400 font-black">{fmt(openTrade.tp)}</div></div>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => closeTrade(openTrade.id)}
                    className="w-full h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 font-black text-[9px] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                    Close at Market — {fmt(livePrice)}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Row 1: qty + price + RR */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[7px] text-gray-500 uppercase font-black">Qty</label>
                      <input type="number" value={qty} step={0.01} min={0.001}
                        onChange={e => setQty(parseFloat(e.target.value) || 0.01)}
                        className="w-full bg-[#0d0f14] border border-[#2a2e39] focus:border-yellow-500/40 rounded-lg h-8 px-2 text-[10px] font-mono text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] text-gray-500 uppercase font-black">Market Price</label>
                      <div className="h-8 flex items-center px-2.5 bg-[#0d0f14] border border-[#1e222d] rounded-lg font-mono text-[10px] text-yellow-400 font-black">{fmt(livePrice)}</div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] text-gray-500 uppercase font-black">R/R Ratio</label>
                      <div className="h-8 flex items-center px-2.5 bg-[#0d0f14] border border-[#1e222d] rounded-lg font-mono text-[10px] text-white">1 : {rrLong}</div>
                    </div>
                  </div>

                  {/* Row 2: mode + SL/TP toggles */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-0.5 bg-[#0d0f14] border border-[#1e222d] rounded-lg p-0.5">
                      {(['pct', 'fixed'] as const).map(m => (
                        <button key={m} onClick={() => setBracketMode(m)}
                          className={`px-2.5 h-6 rounded text-[8px] font-black cursor-pointer transition-all uppercase ${bracketMode === m ? 'bg-yellow-500 text-gray-950' : 'text-gray-500 hover:text-white'}`}>
                          {m === 'pct' ? '% Based' : 'Fixed $'}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-1.5 text-[8px] text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={useSL} onChange={e => setUseSL(e.target.checked)} className="accent-red-500" />
                      <Shield className="h-2.5 w-2.5 text-red-400" /> SL
                    </label>
                    <label className="flex items-center gap-1.5 text-[8px] text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={useTP} onChange={e => setUseTP(e.target.checked)} className="accent-green-500" />
                      <Target className="h-2.5 w-2.5 text-green-400" /> TP
                    </label>
                  </div>

                  {/* Row 3: SL/TP sliders or fixed inputs */}
                  {bracketMode === 'pct' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {useSL && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[7px] text-red-400 uppercase font-black">SL %</label>
                            <span className="text-[8px] font-mono text-red-400">{slPct.toFixed(1)}%</span>
                          </div>
                          <input type="range" min="0.1" max="10" step="0.1" value={slPct}
                            onChange={e => setSlPct(parseFloat(e.target.value))}
                            className="w-full accent-red-500 cursor-pointer h-1.5" />
                          {previewSL && <div className="text-[7px] font-mono text-gray-600">L: <span className="text-red-400">{fmt(previewSL.long)}</span> · S: <span className="text-red-400">{fmt(previewSL.short)}</span></div>}
                        </div>
                      )}
                      {useTP && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[7px] text-green-400 uppercase font-black">TP %</label>
                            <span className="text-[8px] font-mono text-green-400">{tpPct.toFixed(1)}%</span>
                          </div>
                          <input type="range" min="0.1" max="20" step="0.1" value={tpPct}
                            onChange={e => setTpPct(parseFloat(e.target.value))}
                            className="w-full accent-green-500 cursor-pointer h-1.5" />
                          {previewTP && <div className="text-[7px] font-mono text-gray-600">L: <span className="text-green-400">{fmt(previewTP.long)}</span> · S: <span className="text-green-400">{fmt(previewTP.short)}</span></div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {useSL && (
                        <div className="space-y-1">
                          <label className="text-[7px] text-red-400 uppercase font-black">Stop Loss $</label>
                          <input type="number" defaultValue={livePrice * 0.98} onChange={e => setFixedSL(parseFloat(e.target.value))}
                            className="w-full bg-[#0d0f14] border border-red-500/20 rounded-lg h-8 px-2 text-[10px] font-mono text-red-400 focus:outline-none focus:border-red-500/50" />
                        </div>
                      )}
                      {useTP && (
                        <div className="space-y-1">
                          <label className="text-[7px] text-green-400 uppercase font-black">Take Profit $</label>
                          <input type="number" defaultValue={livePrice * 1.03} onChange={e => setFixedTP(parseFloat(e.target.value))}
                            className="w-full bg-[#0d0f14] border border-green-500/20 rounded-lg h-8 px-2 text-[10px] font-mono text-green-400 focus:outline-none focus:border-green-500/50" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Long / Short */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => openPosition('LONG')}
                      className="h-10 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 font-black text-[10px] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                      <TrendingUp className="h-4 w-4" /> Long / Buy
                    </button>
                    <button onClick={() => openPosition('SHORT')}
                      className="h-10 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-black text-[10px] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                      <TrendingDown className="h-4 w-4" /> Short / Sell
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: History ─────────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-[7px] uppercase font-black text-gray-600 tracking-wider">Paper Trade History — {symbol}</div>
                {trades.filter(t => t.status === 'CLOSED').length > 0 && (
                  <button onClick={clearHistory} className="text-[7px] text-gray-600 hover:text-red-400 cursor-pointer flex items-center gap-1 font-bold transition-colors">
                    <X className="h-2.5 w-2.5" /> Clear
                  </button>
                )}
              </div>

              {trades.length === 0 ? (
                <div className="text-center py-5 text-gray-700 text-[8px]">No paper trades for {symbol} yet</div>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {trades.map(t => {
                    const pnlVal = t.status === 'OPEN' ? pnlFor(t, livePrice) : (t.pnl ?? 0);
                    return (
                      <div key={t.id} className={`flex items-center justify-between p-2 rounded-lg border text-[8px] font-mono ${
                        t.status === 'OPEN' ? 'bg-yellow-500/5 border-yellow-500/15' :
                        pnlVal >= 0 ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black ${t.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>{t.direction}</span>
                          <span className="text-gray-500">@ {fmt(t.entryPrice)}</span>
                          <span className="text-gray-600">× {t.qty}</span>
                          {t.status === 'OPEN' && <span className="bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded text-[6px] font-black animate-pulse">OPEN</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black ${pnlVal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{pnlVal >= 0 ? '+' : ''}{fmt(pnlVal)}</span>
                          {t.status === 'OPEN' && (
                            <button onClick={() => closeTrade(t.id)}
                              className="h-4 w-4 flex items-center justify-center rounded bg-red-500/10 hover:bg-red-500/25 text-red-400 cursor-pointer">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalTrades > 0 && (
                <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-[#1e222d]">
                  <div className="text-center">
                    <div className="text-[6px] text-gray-600 uppercase font-black">Closed</div>
                    <div className="text-[10px] font-black text-white">{totalTrades}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[6px] text-gray-600 uppercase font-black">Win Rate</div>
                    <div className="text-[10px] font-black text-yellow-400">{winRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[6px] text-gray-600 uppercase font-black">Net P&L</div>
                    <div className={`text-[10px] font-black ${closedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{closedPnL >= 0 ? '+' : ''}{fmt(closedPnL)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
