'use client';

import React, { useState, useMemo } from 'react';
import { Layers, Activity, ChevronRight, Award, HelpCircle, BarChart3 } from 'lucide-react';
import { Toaster, toast } from 'sonner';

interface FootprintCell {
  price: number;
  bidVol: number;
  askVol: number;
}

interface FootprintBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  cells: FootprintCell[];
  totalVolume: number;
  delta: number;
}

export default function FootprintPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');

  // Generate simulated Footprint bars for order flow analysis
  const footprintData: FootprintBar[] = useMemo(() => {
    const bars: FootprintBar[] = [];
    const now = new Date();
    
    // Seed price offsets based on selected symbol
    const isCrypto = selectedSymbol.includes('BTC') || selectedSymbol.includes('ETH');
    const startPrice = isCrypto ? 68200 : 22400;
    const tickSize = isCrypto ? 5 : 0.5;

    for (let b = 0; b < 6; b++) {
      const open = startPrice + b * tickSize * (Math.random() > 0.5 ? 2 : -2);
      const close = open + tickSize * (Math.random() > 0.5 ? 3 : -3);
      const high = Math.max(open, close) + tickSize * 2;
      const low = Math.min(open, close) - tickSize * 2;

      // Price ticks inside this candle
      const cells: FootprintCell[] = [];
      let totalVolume = 0;
      let delta = 0;

      for (let p = low; p <= high; p += tickSize) {
        const bidVol = Math.round(5 + Math.random() * 45); // K
        const askVol = Math.round(5 + Math.random() * 45); // K
        cells.push({
          price: p,
          bidVol,
          askVol
        });
        totalVolume += (bidVol + askVol);
        delta += (askVol - bidVol);
      }

      bars.push({
        time: new Date(now.getTime() - (5 - b) * 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        open,
        high,
        low,
        close,
        cells: cells.reverse(), // high price at top
        totalVolume,
        delta
      });
    }

    return bars;
  }, [selectedSymbol]);

  // Aggregate Volume Profile (bids vs asks volumes at each price level across visible session)
  const volumeProfile = useMemo(() => {
    const profileMap = new Map<number, { bid: number; ask: number }>();
    for (const bar of footprintData) {
      for (const cell of bar.cells) {
        const rounded = cell.price;
        const current = profileMap.get(rounded) || { bid: 0, ask: 0 };
        profileMap.set(rounded, {
          bid: current.bid + cell.bidVol,
          ask: current.ask + cell.askVol
        });
      }
    }
    // Convert to sorted array
    return Array.from(profileMap.entries())
      .map(([price, vol]) => ({ price, ...vol }))
      .sort((a, b) => b.price - a.price); // highest price top
  }, [footprintData]);

  const maxProfileVol = Math.max(...volumeProfile.map((vp) => vp.bid + vp.ask));

  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#07080a] text-gray-100 overflow-hidden font-sans">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Center Footprint analysis */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0B0C0E]/20 overflow-y-auto scrollbar-hide-default p-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Order Flow Footprint Charts
              <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-mono border border-green-500/20 font-bold uppercase tracking-wider">
                Live Footprints
              </span>
            </h1>
            <div className="text-xs text-gray-500 font-medium mt-1">
              Analyzing bid/ask volume distribution and delta pressure per price tick.
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-xs text-white h-9 px-3 rounded-lg focus:outline-none focus:border-yellow-500 font-semibold cursor-pointer"
            >
              <option value="BTC/USD">BTC/USD (Bitcoin)</option>
              <option value="ETH/USD">ETH/USD (Ethereum)</option>
              <option value="NIFTY50">NIFTY50 (Nifty 50)</option>
              <option value="RELIANCE">RELIANCE (NSE Stock)</option>
            </select>
          </div>
        </div>

        {/* Footprint Workspace Grid */}
        <div className="grid grid-cols-4 gap-6 items-start flex-1 min-h-0">
          {/* Left 3 Columns: Footprint Candles Grid */}
          <div className="col-span-3 bg-gray-950 border border-gray-850 p-6 rounded-xl shadow-2xl flex flex-col h-[480px]">
            <div className="flex-1 flex gap-4 overflow-x-auto scrollbar-hide-default items-stretch">
              {footprintData.map((bar, idx) => (
                <div key={idx} className="flex-1 min-w-[120px] flex flex-col border border-gray-850 bg-gray-900/10 rounded-lg overflow-hidden">
                  {/* Candle header */}
                  <div className="p-2 border-b border-gray-850 bg-gray-950 text-center font-mono text-[9px] text-gray-400 font-bold">
                    {bar.time}
                  </div>

                  {/* Footprint Cell Grid */}
                  <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-hide-default font-mono text-[9px]">
                    {bar.cells.map((cell, cIdx) => {
                      const imbalanceRatio = cell.askVol / (cell.bidVol || 1);
                      const isBuyingPressure = imbalanceRatio >= 1.5;
                      const isSellingPressure = imbalanceRatio <= 0.65;

                      return (
                        <div
                          key={cIdx}
                          className="grid grid-cols-3 gap-1 py-0.5 border-b border-gray-850/30 text-center items-center"
                        >
                          <span className={`font-bold ${isSellingPressure ? 'bg-red-500/25 text-red-400 px-1 rounded' : 'text-gray-400'}`}>
                            {cell.bidVol}K
                          </span>
                          <span className="text-[8px] text-gray-600 font-bold border-x border-gray-850/50">
                            {cell.price}
                          </span>
                          <span className={`font-bold ${isBuyingPressure ? 'bg-green-500/25 text-green-400 px-1 rounded' : 'text-gray-400'}`}>
                            {cell.askVol}K
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bar Stats Footer */}
                  <div className="p-2 bg-gray-950 border-t border-gray-850 font-mono text-[8px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vol:</span>
                      <span className="text-white font-bold">{bar.totalVolume}K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delta:</span>
                      <span className={`font-bold ${bar.delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {bar.delta >= 0 ? '+' : ''}{bar.delta}K
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Volume Profile (aggregated) */}
          <div className="col-span-1 bg-gray-950 border border-gray-850 p-6 rounded-xl shadow-2xl flex flex-col h-[480px]">
            <div className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-4 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-yellow-500" />
              Volume Profile
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide-default space-y-1">
              {volumeProfile.map((vp, idx) => {
                const total = vp.bid + vp.ask;
                const percent = (total / maxProfileVol) * 100;
                return (
                  <div key={idx} className="flex flex-col text-[9px] font-mono gap-1">
                    <div className="flex justify-between text-gray-400 font-bold">
                      <span>{vp.price}</span>
                      <span>{total}K</span>
                    </div>
                    <div className="h-2 w-full bg-gray-900 rounded overflow-hidden flex">
                      <div
                        className="bg-green-500/30 border-r border-green-500/50"
                        style={{ width: `${(vp.ask / total) * percent}%` }}
                      />
                      <div
                        className="bg-red-500/30 border-l border-red-500/50"
                        style={{ width: `${(vp.bid / total) * percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
