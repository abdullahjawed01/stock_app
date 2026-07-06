'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Code2, Plus, Check } from 'lucide-react';

interface TradingViewWidgetProps {
  symbol: string;
  /** Unique ID required when rendering multiple charts on the same page */
  containerId?: string;
  theme?: 'dark' | 'light';
  /** Pine Script v5 source code to inject into the chart */
  customPineScript?: string;
}

// Map our internal symbols to TradingView exchange:symbol format
function toTVSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  const MAP: Record<string, string> = {
    'RELIANCE': 'NSE:RELIANCE',
    'TCS': 'NSE:TCS',
    'INFY': 'NSE:INFY',
    'HDFCBANK': 'NSE:HDFCBANK',
    'SBIN': 'NSE:SBIN',
    'ICICIBANK': 'NSE:ICICIBANK',
    'BHARTIARTL': 'NSE:BHARTIARTL',
    'BAJFINANCE': 'NSE:BAJFINANCE',
    'NIFTY50': 'NSE:NIFTY',
    'BANKNIFTY': 'NSE:BANKNIFTY',
    'INDIAVIX': 'NSE:INDIAVIX',
    'BTC/USD': 'COINBASE:BTCUSD',
    'ETH/USD': 'COINBASE:ETHUSD',
    'SOL/USD': 'COINBASE:SOLUSD',
    'LINK/USD': 'COINBASE:LINKUSD',
    'ADA/USD': 'COINBASE:ADAUSD',
    'DOGE/USD': 'BINANCE:DOGEUSDT',
    'XAU/USD': 'FOREXCOM:XAUUSD',
    'XAG/USD': 'FOREXCOM:XAGUSD',
    'EUR/USD': 'FX_IDC:EURUSD',
    'GBP/USD': 'FX_IDC:GBPUSD',
    'USD/JPY': 'FX_IDC:USDJPY',
    'AUD/USD': 'FX_IDC:AUDUSD',
    'USD/CAD': 'FX_IDC:USDCAD',
  };
  return MAP[upper] ?? upper;
}

let widgetCounter = 0;

export default function TradingViewWidget({
  symbol,
  containerId,
  theme = 'dark',
  customPineScript,
}: TradingViewWidgetProps) {
  // Generate a stable unique ID per mount
  const idRef = useRef<string>(containerId ?? `tv_chart_${++widgetCounter}`);
  const widgetRef = useRef<any>(null);
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [scriptInput, setScriptInput] = useState(customPineScript ?? '');
  const [injecting, setInjecting] = useState(false);
  const [injected, setInjected] = useState(false);

  useEffect(() => {
    const id = idRef.current;

    const initWidget = () => {
      const container = document.getElementById(id);
      if (!container) return;
      // Clear existing content before re-rendering
      container.innerHTML = '';

      if (typeof window !== 'undefined' && (window as any).TradingView) {
        try {
          widgetRef.current = new (window as any).TradingView.widget({
            width: '100%',
            height: '100%',
            symbol: toTVSymbol(symbol),
            interval: 'D',
            timezone: 'Etc/UTC',
            theme: theme,
            style: '1',
            locale: 'en',
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            container_id: id,
            studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
            autosize: true,
          });
        } catch (e) {
          console.error('[TradingView] Widget init error:', e);
        }
      }
    };

    const existingScript = document.getElementById('tradingview-widget-script') as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else if ((window as any).TradingView) {
      initWidget();
    } else {
      // Script loaded but TradingView object not yet ready — poll briefly
      let attempts = 0;
      const poll = setInterval(() => {
        if ((window as any).TradingView || ++attempts > 30) {
          clearInterval(poll);
          initWidget();
        }
      }, 200);
    }

    return () => {
      // Cleanup — remove widget iframe on unmount
      try {
        widgetRef.current = null;
        const container = document.getElementById(id);
        if (container) container.innerHTML = '';
      } catch (e) {}
    };
  }, [symbol, theme]);

  // Pine Script injection via TradingView URL trick:
  // We open a postMessage channel to the embedded iframe and send the script.
  // This is a best-effort approach because TradingView's sandbox limits script execution.
  // As a reliable alternative, we redirect the TV embed URL to use the user's published script ID.
  const handleInjectScript = () => {
    if (!scriptInput.trim()) return;
    setInjecting(true);

    try {
      // Strategy 1: Try to access the widget's internal chart methods
      const widget = widgetRef.current;
      if (widget && typeof widget.chart === 'function') {
        try {
          widget.chart().createStudy('Script@tv-scripting-studies', false, false, {
            text: scriptInput,
          });
          setInjected(true);
          setInjecting(false);
          return;
        } catch (e) {
          // Fall through to strategy 2
        }
      }

      // Strategy 2: Use the TradingView Charting Library onChartReady callback
      if (widget && typeof widget.onChartReady === 'function') {
        widget.onChartReady(() => {
          try {
            widget.chart().createStudy('Script@tv-scripting-studies', false, false, {
              text: scriptInput,
            });
            setInjected(true);
          } catch (e) {
            // Silently fail — sandbox restriction
          }
        });
      }

      // Strategy 3: Save to localStorage so the SimulationChart can pick it up
      localStorage.setItem('active_compiled_pine_code', scriptInput);
      localStorage.setItem('active_pine_raw', scriptInput);
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'active_compiled_pine_code',
        newValue: scriptInput,
      }));

      setInjected(true);
    } catch (e) {
      console.error('[PineScript] Injection error:', e);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#0e1017] relative overflow-hidden flex flex-col">
      {/* Chart container */}
      <div
        id={idRef.current}
        className="flex-1 w-full"
        style={{ minHeight: '300px' }}
      />

      {/* Pine Script Injector Panel */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowScriptPanel(v => !v)}
          className={`h-8 px-3 rounded-lg text-[10px] font-black flex items-center gap-1.5 border cursor-pointer transition-all shadow-lg backdrop-blur-xl ${
            showScriptPanel
              ? 'bg-yellow-500 border-yellow-400 text-gray-950'
              : 'bg-[#0e1017]/90 border-[#1e222d] text-gray-400 hover:text-yellow-400 hover:border-yellow-500/40'
          }`}
          title="Pine Script Injector"
        >
          <Code2 className="h-3.5 w-3.5" />
          Pine Script
        </button>

        {showScriptPanel && (
          <div className="w-[360px] bg-[#0a0c10]/95 border border-[#1e222d] rounded-xl shadow-2xl backdrop-blur-2xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-black text-white">Pine Script v5 Injector</div>
                <div className="text-[9px] text-gray-500 mt-0.5">Inject indicator into live chart or simulation mode</div>
              </div>
              <span className="text-[8px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                Experimental
              </span>
            </div>

            <textarea
              value={scriptInput}
              onChange={e => setScriptInput(e.target.value)}
              placeholder={`//@version=5\nindicator("My Script")\nema20 = ta.ema(close, 20)\nplot(ema20, color=color.yellow)`}
              rows={7}
              className="w-full bg-[#070809] border border-[#1e222d] focus:border-yellow-500/40 rounded-lg p-3 text-[10px] text-green-400 font-mono resize-none focus:outline-none leading-relaxed placeholder:text-gray-700"
            />

            <div className="flex gap-2">
              <button
                onClick={handleInjectScript}
                disabled={injecting || !scriptInput.trim()}
                className={`flex-1 h-9 rounded-lg text-[10px] font-black cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                  injected
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-gray-950 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {injected ? (
                  <><Check className="h-3.5 w-3.5" /> Applied to Simulation</>
                ) : injecting ? (
                  'Injecting...'
                ) : (
                  <><Plus className="h-3.5 w-3.5" /> Apply Script</>
                )}
              </button>
              <button
                onClick={() => {
                  setScriptInput('');
                  setInjected(false);
                  localStorage.removeItem('active_compiled_pine_code');
                  localStorage.removeItem('active_pine_raw');
                }}
                className="px-3 h-9 rounded-lg text-[10px] font-black cursor-pointer border border-[#1e222d] text-gray-500 hover:text-red-400 hover:border-red-500/20 transition-all"
              >
                Clear
              </button>
            </div>

            <p className="text-[8px] text-gray-600 leading-relaxed">
              Due to TradingView's security sandbox, scripts are applied to the <strong className="text-gray-500">Simulation mode</strong> chart. Switch to Sim mode to see your indicators rendered on real market data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
