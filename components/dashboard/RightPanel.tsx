'use client';

import React, { useState } from 'react';
import { Newspaper, Calendar, Bell, Layers, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';

interface RightPanelProps {
  currentSymbol: string;
  currentPrice: number;
  alerts: { id: string; price: number; type: 'above' | 'below' }[];
  onRemoveAlert?: (id: string) => void;
}

export default function RightPanel({
  currentSymbol,
  currentPrice,
  alerts,
  onRemoveAlert,
}: RightPanelProps) {
  const [activeWidget, setActiveWidget] = useState<'news' | 'calendar' | 'dom' | 'alerts'>('news');

  // Calendar mock data
  const calendarEvents = [
    { time: '14:30', country: 'US', title: 'CPI Inflation MoM (Jun)', impact: 'high', forecast: '0.1%', actual: '0.1%' },
    { time: '16:00', country: 'US', title: 'FED Interest Rate Decision', impact: 'high', forecast: '5.25%', actual: '' },
    { time: '17:30', country: 'IN', title: 'RBI Monetary Policy Rate', impact: 'medium', forecast: '6.50%', actual: '6.50%' },
    { time: '19:45', country: 'EU', title: 'ECB President Lagarde Speech', impact: 'medium', forecast: '', actual: '' },
  ];

  // News mock data
  const newsFeed = [
    { id: '1', publisher: 'Bloomberg', time: '12m ago', title: 'Federal Reserve hints at interest rate cuts as core inflation settles at 2.4%', sentiment: 'Bullish' },
    { id: '2', publisher: 'Reuters', time: '38m ago', title: 'Institutional crypto inflows hit record $3.2B in June led by spot ETF products', sentiment: 'Bullish' },
    { id: '3', publisher: 'MarketWatch', time: '2h ago', title: 'Tech index faces selling pressure amid semiconductor export restriction chatter', sentiment: 'Bearish' },
    { id: '4', publisher: 'CNBC', time: '6h ago', title: 'Gold prices consolidate near historic highs as safe-haven demand accelerates', sentiment: 'Neutral' },
  ];

  // Mock DOM / Order Book bids & asks generator based on current price
  const domData = React.useMemo(() => {
    const bids = [];
    const asks = [];
    const step = currentSymbol.includes('/') && !currentSymbol.includes('BTC') ? 0.0001 : 0.5;
    for (let i = 1; i <= 5; i++) {
      bids.push({
        price: currentPrice - i * step,
        size: parseFloat((Math.random() * 2 + 0.1).toFixed(2)),
      });
      asks.push({
        price: currentPrice + i * step,
        size: parseFloat((Math.random() * 2 + 0.1).toFixed(2)),
      });
    }
    return { bids: bids.reverse(), asks };
  }, [currentPrice, currentSymbol]);

  return (
    <aside className="w-60 border-l border-[#21262d] bg-[#161B22] flex flex-col h-full shrink-0 select-none animate-in slide-in-from-right duration-200">
      
      {/* Mini Icon Dock */}
      <div className="h-10 border-b border-[#21262d] flex bg-[#0d1117]/30 px-2 items-center justify-between shrink-0">
        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Widgets</span>
        <div className="flex gap-0.5">
          {([
            { id: 'news', icon: Newspaper, label: 'News' },
            { id: 'calendar', icon: Calendar, label: 'Calendar' },
            { id: 'dom', icon: Layers, label: 'DOM Book' },
            { id: 'alerts', icon: Bell, label: 'Alerts' },
          ] as const).map((widget) => {
            const Icon = widget.icon;
            const isActive = activeWidget === widget.id;
            return (
              <button
                key={widget.id}
                onClick={() => setActiveWidget(widget.id)}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'text-gray-500 hover:text-white'
                }`}
                title={widget.label}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Widget Body Scroll container */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        
        {/* NEWS Widget */}
        {activeWidget === 'news' && (
          <div className="space-y-3">
            <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-0.5 mb-1">Market News Feed</div>
            <div className="space-y-2.5">
              {newsFeed.map((item) => (
                <div key={item.id} className="bg-[#1c2128]/40 border border-[#21262d] p-2.5 rounded-lg space-y-1 hover:border-[#30363d] transition-all">
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span className="text-yellow-500 font-bold">{item.publisher}</span>
                    <span className="text-gray-500">{item.time}</span>
                  </div>
                  <h4 className="text-[10px] font-medium text-gray-200 leading-normal">{item.title}</h4>
                  <div className="flex justify-end pt-0.5">
                    <span className={`text-[7px] uppercase font-black px-1 rounded ${
                      item.sentiment === 'Bullish' ? 'bg-green-500/10 text-green-400' :
                      item.sentiment === 'Bearish' ? 'bg-red-500/10 text-red-400' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {item.sentiment}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALENDAR Widget */}
        {activeWidget === 'calendar' && (
          <div className="space-y-3">
            <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-0.5 mb-1">Economic Calendar</div>
            <div className="space-y-2">
              {calendarEvents.map((ev, idx) => (
                <div key={idx} className="bg-[#1c2128]/40 border border-[#21262d] p-2 rounded-lg text-[9px] font-mono flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500 font-bold">{ev.time}</span>
                      <span className="text-gray-400 font-black">[{ev.country}]</span>
                    </div>
                    <div className="text-gray-200 font-sans font-medium text-[9px] leading-tight max-w-[150px]">{ev.title}</div>
                  </div>
                  <span className={`text-[7px] uppercase font-black px-1 rounded ${
                    ev.impact === 'high' ? 'bg-red-500/15 text-red-400 animate-pulse' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {ev.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DOM Widget */}
        {activeWidget === 'dom' && (
          <div className="space-y-3 font-mono text-[9px]">
            <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-0.5 mb-1">{currentSymbol} DOM Book</div>
            
            {/* Ask / bids lists */}
            <div className="space-y-2.5">
              {/* Asks (Red) */}
              <div className="space-y-1">
                {domData.asks.map((ask, idx) => (
                  <div key={`ask-${idx}`} className="flex justify-between items-center text-red-400">
                    <span>${ask.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className="text-gray-500">{ask.size}</span>
                  </div>
                ))}
              </div>

              {/* Spread row */}
              <div className="bg-[#1c2128] border border-[#21262d] p-1.5 rounded-lg text-center flex justify-between px-3 text-yellow-500 font-extrabold text-[10px]">
                <span>LAST</span>
                <span>${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Bids (Green) */}
              <div className="space-y-1">
                {domData.bids.map((bid, idx) => (
                  <div key={`bid-${idx}`} className="flex justify-between items-center text-green-400">
                    <span>${bid.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className="text-gray-500">{bid.size}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ALERTS Widget */}
        {activeWidget === 'alerts' && (
          <div className="space-y-3">
            <div className="text-[9px] uppercase font-black tracking-widest text-gray-500 px-0.5 mb-1">Alerts Queue ({alerts.length})</div>
            <div className="space-y-1.5">
              {alerts.length === 0 ? (
                <div className="text-center py-6 text-gray-600 text-[9px]">No pending price alerts.</div>
              ) : (
                alerts.map((al) => (
                  <div key={al.id} className="bg-[#1c2128]/40 border border-[#21262d] p-2 rounded-lg text-[9px] font-mono flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-sans text-gray-300 font-bold">{currentSymbol}</span>
                      <span className="text-gray-500 text-[8px]">Cross {al.type} ${al.price}</span>
                    </div>
                    {onRemoveAlert && (
                      <button
                        onClick={() => onRemoveAlert(al.id)}
                        className="text-red-500 hover:text-red-400 cursor-pointer"
                        title="Delete Alert"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
