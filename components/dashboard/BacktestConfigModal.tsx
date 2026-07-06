'use client';

import React, { useState } from 'react';
import { X, Play, RefreshCw, Award, Info, FileText } from 'lucide-react';

interface BacktestConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunBacktest: (config: {
    strategy: 'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum';
    capital: number;
    commission: number;
    slippage: number;
    startDate: string;
    endDate: string;
  }) => void;
}

export default function BacktestConfigModal({
  isOpen,
  onClose,
  onRunBacktest,
}: BacktestConfigModalProps) {
  const [strategy, setStrategy] = useState<'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum'>('ema_crossover');
  const [capital, setCapital] = useState<number>(100000);
  const [commission, setCommission] = useState<number>(0.05); // percent
  const [slippage, setSlippage] = useState<number>(0.1); // percent
  const [startDate, setStartDate] = useState<string>('2025-01-01');
  const [endDate, setEndDate] = useState<string>('2026-07-01');
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);

    // Simulate animated loading progress
    setTimeout(() => {
      onRunBacktest({
        strategy,
        capital,
        commission: commission / 100, // convert percent to rate
        slippage: slippage / 100, // convert percent to rate
        startDate,
        endDate,
      });
      setIsRunning(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-[#050608]/75 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-[420px] bg-[#161B22] border border-[#21262d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="h-12 border-b border-[#21262d] flex items-center justify-between px-4 bg-[#0d1117]/30 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-yellow-500" />
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-gray-200">🧪 Backtest Configurator</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-white rounded hover:bg-[#1c2128] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {/* Strategy select */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black tracking-widest text-gray-500">Strategy Selection</label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value as any)}
              className="w-full bg-[#0d0f14] border border-[#21262d] text-xs text-white h-9 px-3 rounded-lg focus:outline-none focus:border-yellow-500/40 font-semibold cursor-pointer"
            >
              <option value="ema_crossover">EMA 20/50 Crossover</option>
              <option value="rsi_mean_reversion">RSI Mean Reversion (30/70)</option>
              <option value="macd_momentum">MACD Momentum</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Capital */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-gray-500">Initial Capital ($)</label>
              <input
                type="number"
                value={capital}
                onChange={e => setCapital(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0d0f14] border border-[#21262d] rounded-lg h-9 px-3 text-xs text-white font-mono focus:outline-none focus:border-yellow-500/40"
              />
            </div>
            {/* Commission */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-gray-500">Commission %</label>
              <input
                type="number"
                step="0.01"
                value={commission}
                onChange={e => setCommission(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0d0f14] border border-[#21262d] rounded-lg h-9 px-3 text-xs text-white font-mono focus:outline-none focus:border-yellow-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Slippage */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-gray-500">Slippage %</label>
              <input
                type="number"
                step="0.01"
                value={slippage}
                onChange={e => setSlippage(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0d0f14] border border-[#21262d] rounded-lg h-9 px-3 text-xs text-white font-mono focus:outline-none focus:border-yellow-500/40"
              />
            </div>
            {/* Leverage */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black tracking-widest text-gray-500">Leverage Mode</label>
              <div className="h-9 flex items-center px-3 bg-[#0d0f14]/60 border border-[#21262d] rounded-lg text-xs text-gray-400 font-bold">
                10x Max (Hoisted)
              </div>
            </div>
          </div>

          {/* Date range selection */}
          <div className="space-y-1.5 pt-2 border-t border-[#21262d]">
            <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">Backtest Date Range</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] text-gray-500 uppercase font-black">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-[#21262d] rounded-lg h-8 px-2.5 text-[10px] text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-gray-500 uppercase font-black">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-[#0d0f14] border border-[#21262d] rounded-lg h-8 px-2.5 text-[10px] text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#1c2128] border border-[#21262d] p-3 rounded-lg flex gap-2.5 items-start">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-gray-450 leading-relaxed">
              Backtesting runs strategy triggers against historical mock candle datasets generated for this cell symbol. Result statistics automatically update the lower panel workspace.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isRunning}
              className="flex-1 h-10 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-gray-950 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg active:scale-[0.98]"
            >
              {isRunning ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Compiling simulation...</>
              ) : (
                <><Play className="h-4 w-4 fill-gray-950" /> Run Strategy</>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl border border-[#21262d] text-gray-400 hover:text-white hover:bg-[#1c2128] font-black text-[10px] uppercase tracking-wider cursor-pointer transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
