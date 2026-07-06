'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Target, TrendingUp, TrendingDown, RefreshCw, X, Percent, DollarSign } from 'lucide-react';
import { SimOrder, SimPositionState, SimAccountState } from '@/lib/simulationData';

interface QuickTradePanelProps {
  symbol: string;
  currentPrice: number;
  chartMode: 'live' | 'simulation';
  leverage: number;
  setLeverage: (lev: number) => void;
  
  // Simulation trading callbacks
  simPosition: SimPositionState | null;
  simAccount: SimAccountState;
  onAddSimOrder: (order: SimOrder) => void;
  onClosePosition: () => void;
  onReversePosition: () => void;

  // Bracket orders
  orderLines: { entryPrice: number; slPrice: number; tpPrice: number; hasBracket: boolean };
  onOrderLinesChange: (lines: { entryPrice: number; slPrice: number; tpPrice: number; hasBracket: boolean }) => void;
}

export default function QuickTradePanel({
  symbol,
  currentPrice,
  chartMode,
  leverage,
  setLeverage,
  simPosition,
  simAccount,
  onAddSimOrder,
  onClosePosition,
  onReversePosition,
  orderLines,
  onOrderLinesChange,
}: QuickTradePanelProps) {
  const [orderMode, setOrderMode] = useState<'market' | 'limit' | 'stop'>('market');
  const [qty, setQty] = useState<number>(0.1);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  
  // Custom Live paper trading states (for live chart mode)
  const [livePosition, setLivePosition] = useState<{ symbol: string; qty: number; entryPrice: number; isLong: boolean } | null>(null);

  // Local storage live paper trade persistence
  useEffect(() => {
    if (chartMode === 'live') {
      try {
        const saved = localStorage.getItem(`live_pos_${symbol}`);
        if (saved) setLivePosition(JSON.parse(saved));
      } catch {}
    }
  }, [symbol, chartMode]);

  const handlePlaceOrder = () => {
    const price = orderMode === 'market' ? currentPrice : orderLines.entryPrice;
    
    if (chartMode === 'simulation') {
      onAddSimOrder({
        id: Math.random().toString(36).substring(4, 9),
        symbol,
        type: orderType,
        mode: orderMode === 'stop' ? 'stop' : orderMode === 'limit' ? 'limit' : 'market',
        qty,
        price,
        stopPrice: orderMode === 'stop' ? price : null,
      });
    } else {
      // Live Mode Paper Trade
      const newPos = {
        symbol,
        qty,
        entryPrice: price,
        isLong: orderType === 'BUY',
      };
      setLivePosition(newPos);
      localStorage.setItem(`live_pos_${symbol}`, JSON.stringify(newPos));
    }
  };

  const handleCloseLivePosition = () => {
    setLivePosition(null);
    localStorage.removeItem(`live_pos_${symbol}`);
  };

  const handleReverseLivePosition = () => {
    if (!livePosition) return;
    const reversed = {
      ...livePosition,
      isLong: !livePosition.isLong,
      entryPrice: currentPrice,
    };
    setLivePosition(reversed);
    localStorage.setItem(`live_pos_${symbol}`, JSON.stringify(reversed));
  };

  // Active Position helpers
  const activePosition = chartMode === 'simulation' ? simPosition : livePosition;
  const isLong = activePosition?.isLong ?? false;
  const entryPrice = activePosition?.entryPrice ?? activePosition?.avgEntryPrice ?? 0;
  
  // P&L calculation
  const unrealizedPnL = useMemo(() => {
    if (!activePosition) return 0;
    const direction = isLong ? 1 : -1;
    const size = activePosition.qty;
    return direction * (currentPrice - entryPrice) * size;
  }, [activePosition, currentPrice, entryPrice, isLong]);

  const pnlPercent = useMemo(() => {
    if (!activePosition || entryPrice === 0) return 0;
    const direction = isLong ? 1 : -1;
    return (direction * (currentPrice - entryPrice) / entryPrice) * 100;
  }, [activePosition, currentPrice, entryPrice, isLong]);

  // Risk to reward calculator
  const slDistance = Math.abs(currentPrice - orderLines.slPrice);
  const tpDistance = Math.abs(orderLines.tpPrice - currentPrice);
  const rrRatio = slDistance > 0 ? (tpDistance / slDistance).toFixed(1) : '1.0';

  return (
    <div className="absolute right-3 top-20 pointer-events-auto w-64 bg-[#161B22]/95 border border-[#21262d] rounded-xl shadow-2xl backdrop-blur-xl z-20 p-3.5 space-y-3.5 select-none animate-in fade-in duration-200">
      <div className="flex justify-between items-center border-b border-[#21262d] pb-2">
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Quick Trade Panel</span>
        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${chartMode === 'simulation' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
          {chartMode} Mode
        </span>
      </div>

      {activePosition ? (
        /* Active Position Card */
        <div className="space-y-2">
          <div className={`p-2.5 rounded-lg border text-[9px] space-y-1.5 ${unrealizedPnL >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex justify-between items-center">
              <span className={`font-black px-1.5 py-0.5 rounded text-[8px] ${isLong ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {isLong ? 'LONG' : 'SHORT'}
              </span>
              <span className="font-mono text-gray-400 font-bold">Qty: {activePosition.qty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Entry Price</span>
              <span className="font-mono text-gray-300 font-bold">${entryPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-[#21262d] pt-1 mt-1">
              <span className="text-gray-500">Unrealized P&L</span>
              <span className={`font-mono font-black ${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)} ({pnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={chartMode === 'simulation' ? onReversePosition : handleReverseLivePosition}
              className="h-8 rounded-lg border border-[#21262d] text-[9px] font-black text-gray-300 hover:text-white hover:bg-[#1c2128] cursor-pointer flex items-center justify-center gap-1 transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Reverse
            </button>
            <button
              onClick={chartMode === 'simulation' ? onClosePosition : handleCloseLivePosition}
              className="h-8 rounded-lg bg-red-500/15 border border-red-500/30 text-[9px] font-black text-red-400 hover:bg-red-500/25 cursor-pointer flex items-center justify-center gap-1 transition-all"
            >
              <X className="h-3 w-3" /> Close Pos
            </button>
          </div>
        </div>
      ) : (
        /* Order Entry Form */
        <div className="space-y-3">
          {/* Order type switchers */}
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setOrderType('BUY')}
              className={`h-7 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                orderType === 'BUY'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Buy
            </button>
            <button
              onClick={() => setOrderType('SELL')}
              className={`h-7 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                orderType === 'SELL'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" /> Sell
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex bg-[#0d0f14] p-0.5 rounded-lg border border-[#21262d] gap-0.5">
            {(['market', 'limit', 'stop'] as const).map(m => (
              <button
                key={m}
                onClick={() => setOrderMode(m)}
                className={`flex-1 py-1 text-[8px] font-black uppercase tracking-wider rounded cursor-pointer transition-all ${
                  orderMode === m ? 'bg-[#1c2128] text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Quantity & Leverage Inputs */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[8px] text-gray-500 uppercase font-black">Quantity / Units</label>
              <span className="text-[8px] font-mono text-gray-400 font-bold">${(qty * currentPrice).toLocaleString()}</span>
            </div>
            <input
              type="number"
              value={qty}
              step={0.01}
              min={0.001}
              onChange={e => setQty(parseFloat(e.target.value) || 0.1)}
              className="w-full bg-[#0d0f14] border border-[#21262d] rounded-lg h-8 px-2 text-[10px] text-white font-mono focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[8px] uppercase font-black text-gray-500">
              <span>Leverage</span>
              <span className="text-yellow-400 font-bold font-mono">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={leverage}
              onChange={e => setLeverage(Number(e.target.value))}
              className="w-full h-1 bg-[#21262d] rounded-lg cursor-pointer"
            />
          </div>

          {/* Bracket checkbox attachment */}
          <div className="space-y-2.5 pt-2 border-t border-[#21262d]">
            <label className="flex items-center gap-2 text-[8px] text-gray-400 uppercase font-black cursor-pointer">
              <input
                type="checkbox"
                checked={orderLines.hasBracket}
                onChange={e => onOrderLinesChange({ ...orderLines, hasBracket: e.target.checked })}
                className="accent-yellow-500 cursor-pointer h-3.5 w-3.5 rounded border-[#21262d]"
              />
              Attach Bracket SL/TP
            </label>

            {orderLines.hasBracket && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[7px] text-red-400 uppercase font-black flex items-center gap-0.5">
                    <Shield className="h-2 w-2" /> Stop Loss
                  </label>
                  <input
                    type="number"
                    value={orderLines.slPrice}
                    onChange={e => onOrderLinesChange({ ...orderLines, slPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0f14] border border-red-500/20 rounded-lg h-7 px-2 text-[9px] text-red-400 font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[7px] text-green-400 uppercase font-black flex items-center gap-0.5">
                    <Target className="h-2 w-2" /> Take Profit
                  </label>
                  <input
                    type="number"
                    value={orderLines.tpPrice}
                    onChange={e => onOrderLinesChange({ ...orderLines, tpPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0f14] border border-green-500/20 rounded-lg h-7 px-2 text-[9px] text-green-400 font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Order Button */}
          <button
            onClick={handlePlaceOrder}
            className={`w-full h-10 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-lg ${
              orderType === 'BUY'
                ? 'bg-green-500 text-gray-950 hover:bg-green-600'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            Submit {orderType} Order (R/R: {rrRatio})
          </button>
        </div>
      )}
    </div>
  );
}
