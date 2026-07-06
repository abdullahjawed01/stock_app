'use client';

import React, { useState } from 'react';
import {
  Search,
  Play,
  Pause,
  ChevronRight,
  TrendingUp,
  Settings,
  Bell,
  Sun,
  Moon,
  Grid,
  MousePointer,
  LineChart,
  Type,
  Ruler,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Magnet,
  Maximize2,
  Minimize2,
  HelpCircle,
  Sparkles,
  Info,
  BookMarked,
  Code2,
  BarChart2,
  ExternalLink,
  Columns,
  Check,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import UserDropdown from "@/components/UserDropdown";

interface TopNavBarProps {
  currentSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  chartMode: 'live' | 'simulation';
  setChartMode: (mode: 'live' | 'simulation') => void;
  timeframe: string;
  setTimeframe: (tf: string) => void;
  chartType: string;
  setChartType: (type: string) => void;
  activeIndicators: string[];
  toggleIndicator: (ind: string) => void;
  replayActive: boolean;
  setReplayActive: (active: boolean) => void;
  replayPlaying: boolean;
  onReplayPlayPause: () => void;
  onReplayStep: () => void;
  replaySpeed: number;
  setReplaySpeed: (speed: number) => void;
  theme: string;
  onToggleTheme: () => void;

  // Next.js Auth user
  user: any;
  initialStocks: any[];

  // Workspace layout count (1, 2, 3, 4, 6, 8)
  chartsCount: number;
  setChartsCount: (count: 1 | 2 | 3 | 4 | 6 | 8) => void;

  // Synchronization settings
  linkSymbols: boolean;
  setLinkSymbols: (val: boolean) => void;
  linkTimeframes: boolean;
  setLinkTimeframes: (val: boolean) => void;
  linkIndicators: boolean;
  setLinkIndicators: (val: boolean) => void;
  linkZoom: boolean;
  setLinkZoom: (val: boolean) => void;
  linkDrawings: boolean;
  setLinkDrawings: (val: boolean) => void;

  // Drawing Tools state
  activeTool: string;
  setActiveTool: (tool: string) => void;
  isLocked: boolean;
  setIsLocked: (val: boolean) => void;
  isHidden: boolean;
  setIsHidden: (val: boolean) => void;
  isMagnet: boolean;
  setIsMagnet: (val: boolean) => void;
  onClearDrawings: () => void;

  // Alert triggers for Notifications list
  alerts: any[];
  onRemoveAlert?: (id: string) => void;

  // Save / restore actions
  onSaveWorkspace: () => void;
  onRestoreWorkspace: () => void;

  // New UX redesign props
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (open: boolean) => void;
}

export default function TopNavBar({
  currentSymbol,
  onSymbolSelect,
  chartMode,
  setChartMode,
  timeframe,
  setTimeframe,
  chartType,
  setChartType,
  activeIndicators,
  toggleIndicator,
  replayActive,
  setReplayActive,
  replayPlaying,
  onReplayPlayPause,
  onReplayStep,
  replaySpeed,
  setReplaySpeed,
  theme,
  onToggleTheme,
  user,
  initialStocks,
  chartsCount,
  setChartsCount,
  linkSymbols,
  setLinkSymbols,
  linkTimeframes,
  setLinkTimeframes,
  linkIndicators,
  setLinkIndicators,
  linkZoom,
  setLinkZoom,
  linkDrawings,
  setLinkDrawings,
  activeTool,
  setActiveTool,
  isLocked,
  setIsLocked,
  isHidden,
  setIsHidden,
  isMagnet,
  setIsMagnet,
  onClearDrawings,
  alerts,
  onRemoveAlert,
  onSaveWorkspace,
  onRestoreWorkspace,
  isRightPanelOpen,
  setIsRightPanelOpen
}: TopNavBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Floating Dropdown state
  const [openDropdown, setOpenDropdown] = useState<'layout' | 'draw' | 'settings' | 'alerts' | null>(null);

  const toggleDropdown = (dropdown: typeof openDropdown) => {
    setOpenDropdown(prev => (prev === dropdown ? null : dropdown));
  };

  const availableSymbols = [
    { symbol: 'BTC/USD', name: 'Bitcoin / Dollar', category: 'Crypto' },
    { symbol: 'ETH/USD', name: 'Ethereum / Dollar', category: 'Crypto' },
    { symbol: 'SOL/USD', name: 'Solana / Dollar', category: 'Crypto' },
    { symbol: 'NIFTY50', name: 'Nifty 50 Index', category: 'Indices' },
    { symbol: 'RELIANCE', name: 'Reliance Industries', category: 'Stocks' },
    { symbol: 'XAU/USD', name: 'Gold Spot', category: 'Commodities' },
    { symbol: 'EUR/USD', name: 'Euro / Dollar', category: 'Forex' },
    { symbol: 'GBP/USD', name: 'Pound / Dollar', category: 'Forex' },
  ];

  const filteredSymbols = searchQuery
    ? availableSymbols.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableSymbols.slice(0, 8);

  const timeframes = ['1m', '5m', '15m', '1h', '4h', 'D'];
  const indicatorsList = [
    { id: 'ema20', name: 'EMA 20' },
    { id: 'ema50', name: 'EMA 50' },
    { id: 'rsi', name: 'RSI' },
    { id: 'macd', name: 'MACD' },
  ];

  const drawingTools = [
    { id: 'cursor', icon: MousePointer, label: 'Crosshair' },
    { id: 'trendline', icon: LineChart, label: 'Trendline' },
    { id: 'text', icon: Type, label: 'Text Note' },
    { id: 'ruler', icon: Ruler, label: 'Measure' },
  ];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1e222d] bg-[#0c0d12]/75 backdrop-blur-xl px-4 z-40 relative select-none">
      {/* 1. Brand Logo & Symbol Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
            <TrendingUp className="h-4 w-4 text-gray-950 stroke-[3px]" />
          </div>
          <span className="font-black text-xs tracking-widest text-white">ATLAS</span>
        </div>

        {/* Symbol Search bar */}
        <div className="relative w-48">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            placeholder={currentSymbol}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            className="w-full bg-[#131722]/60 hover:bg-[#131722]/85 focus:bg-[#131722] border border-[#1e222d] focus:border-yellow-500/40 rounded-xl h-9 pl-9 pr-3 text-xs text-white font-extrabold placeholder:text-gray-400 focus:outline-none transition-all"
          />

          {showSearchDropdown && (
            <div className="absolute top-10 left-0 w-72 bg-[#0c0d12]/95 border border-[#1e222d] rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto backdrop-blur-xl p-1.5 space-y-1">
              {filteredSymbols.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => {
                    onSymbolSelect(item.symbol);
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-gray-800/35 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-white">{item.symbol}</div>
                    <div className="text-[10px] text-gray-500">{item.name}</div>
                  </div>
                  <span className="text-[8px] bg-gray-900 text-gray-500 px-2 py-0.5 rounded font-mono font-bold border border-gray-800">
                    {item.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Middle Controls (Timeframes, Indicators, Modes) */}
      <div className="hidden lg:flex items-center gap-4">
        {/* Timeframes */}
        <div className="flex bg-[#131722]/50 p-0.5 rounded-xl border border-[#1e222d] gap-0.5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                timeframe === tf
                  ? 'bg-[#1e222d] text-white shadow-sm border border-[#2a2e39]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Style Selector */}
        <div className="flex bg-[#131722]/50 p-0.5 rounded-xl border border-[#1e222d]">
          {['Candles', 'Line', 'Area'].map((style) => (
            <button
              key={style}
              onClick={() => setChartType(style)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                chartType === style
                  ? 'bg-[#1e222d] text-white shadow-sm border border-[#2a2e39]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Indicators Overlay */}
        <div className="flex items-center gap-1">
          {indicatorsList.map((ind) => {
            const active = activeIndicators.includes(ind.id);
            return (
              <button
                key={ind.id}
                onClick={() => {
                  if (chartMode === 'live') setChartMode('simulation');
                  toggleIndicator(ind.id);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                  active
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : 'border-[#1e222d] bg-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {ind.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Right Icons (Layouts, Drawings, Theme, Alerts, Settings, Profile) */}
      <div className="flex items-center gap-2">
        {/* Live/Sim Toggle */}
        <div className="flex bg-[#131722]/50 p-0.5 rounded-xl border border-[#1e222d] mr-1">
          <button
            onClick={() => setChartMode('live')}
            className={`px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
              chartMode === 'live' ? 'bg-[#1e222d] text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setChartMode('simulation')}
            className={`px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
              chartMode === 'simulation' ? 'bg-[#1e222d] text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            Sim
          </button>
        </div>

        {chartMode === 'simulation' && (
          <button
            onClick={() => setReplayActive(!replayActive)}
            className={`h-7 px-2.5 rounded-lg text-[9px] font-black cursor-pointer transition-all border flex items-center justify-center gap-1 ${
              replayActive
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow'
                : 'bg-[#131722]/50 border-[#1e222d] text-gray-500 hover:text-white'
            }`}
            title="Toggle Bar Replay Mode"
          >
            📍 Bar Replay
          </button>
        )}

        {/* Layout Selector Grid Popover */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('layout')}
            className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-1 ${
              openDropdown === 'layout'
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-450'
                : 'bg-[#131722]/50 border-[#1e222d] text-gray-400 hover:text-white'
            }`}
            title="Select Layout Grid"
          >
            <Grid className="h-4 w-4" />
            <span className="text-[10px] font-bold font-mono px-0.5">{chartsCount}x</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {openDropdown === 'layout' && (
            <div className="absolute top-11 right-0 w-52 bg-[#0c0d12]/95 border border-[#1e222d] rounded-xl shadow-2xl p-3 z-50 backdrop-blur-xl space-y-2.5">
              <div className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Select Chart Layout</div>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3, 4, 6, 8] as const).map((n) => {
                  const isActive = chartsCount === n;
                  return (
                    <button
                      key={n}
                      onClick={() => {
                        setChartsCount(n);
                        setOpenDropdown(null);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-all ${
                        isActive
                          ? 'border-yellow-500/40 bg-yellow-500/5 text-yellow-400 font-extrabold'
                          : 'border-[#1e222d] bg-[#131722]/30 text-gray-400 hover:text-white hover:border-gray-800'
                      }`}
                    >
                      {/* Visual grid preview mockup */}
                      <div className="grid grid-cols-2 gap-[2px] w-6 h-4 opacity-50 mb-1.5">
                        {Array.from({ length: Math.min(4, n) }).map((_, i) => (
                          <div key={i} className={`bg-gray-400 rounded-sm ${isActive ? 'bg-yellow-500' : ''}`} />
                        ))}
                      </div>
                      <span className="text-[10px] font-black">{n} {n === 1 ? 'Chart' : 'Charts'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Drawing Tools Dropdown */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('draw')}
            className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-1 ${
              openDropdown === 'draw'
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-450'
                : 'bg-[#131722]/50 border-[#1e222d] text-gray-400 hover:text-white'
            }`}
            title="Drawing Utilities"
          >
            {React.createElement(drawingTools.find(t => t.id === activeTool)?.icon ?? MousePointer, { className: "h-4 w-4" })}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {openDropdown === 'draw' && (
            <div className="absolute top-11 right-0 w-60 bg-[#0c0d12]/95 border border-[#1e222d] rounded-xl shadow-2xl p-3.5 z-50 backdrop-blur-xl space-y-3">
              <div className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Drawing Toolbox</div>
              {/* Tool selections */}
              <div className="grid grid-cols-2 gap-1.5">
                {drawingTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setActiveTool(tool.id);
                        setOpenDropdown(null);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        isActive
                          ? 'border-yellow-500/40 bg-yellow-500/5 text-yellow-450 font-bold'
                          : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/20'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold">{tool.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="h-[1px] bg-gray-800" />

              {/* Utility states */}
              <div className="space-y-1">
                <button
                  onClick={() => setIsMagnet(!isMagnet)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                    isMagnet ? 'bg-yellow-500/10 text-yellow-400' : 'text-gray-400 hover:text-white hover:bg-gray-850'
                  }`}
                >
                  <span className="text-[10px] font-bold flex items-center gap-2">
                    <Magnet className="h-3.5 w-3.5" />
                    Magnet Mode
                  </span>
                  {isMagnet && <Check className="h-3 w-3 text-yellow-500" />}
                </button>

                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                    isLocked ? 'bg-yellow-500/10 text-yellow-450' : 'text-gray-400 hover:text-white hover:bg-gray-850'
                  }`}
                >
                  <span className="text-[10px] font-bold flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    Lock Drawings
                  </span>
                  {isLocked && <Check className="h-3 w-3 text-yellow-500" />}
                </button>

                <button
                  onClick={() => setIsHidden(!isHidden)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                    isHidden ? 'bg-yellow-500/10 text-yellow-450' : 'text-gray-400 hover:text-white hover:bg-gray-850'
                  }`}
                >
                  <span className="text-[10px] font-bold flex items-center gap-2">
                    {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    Hide Drawings
                  </span>
                  {isHidden && <Check className="h-3 w-3 text-yellow-500" />}
                </button>
              </div>

              <button
                onClick={() => {
                  onClearDrawings();
                  setOpenDropdown(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All Custom Drawings
              </button>
            </div>
          )}
        </div>

        {/* Notifications alerts log */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('alerts')}
            className={`p-2 rounded-xl border cursor-pointer transition-all relative ${
              openDropdown === 'alerts'
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-450'
                : 'bg-[#131722]/50 border-[#1e222d] text-gray-400 hover:text-white'
            }`}
            title="Triggered Alerts"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center border border-[#0c0d12]">
                {alerts.length}
              </span>
            )}
          </button>

          {openDropdown === 'alerts' && (
            <div className="absolute top-11 right-0 w-72 bg-[#0c0d12]/95 border border-[#1e222d] rounded-xl shadow-2xl p-3.5 z-50 backdrop-blur-xl space-y-2.5">
              <div className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Alert Logs ({alerts.length})</div>
              {alerts.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-[10px] flex flex-col items-center gap-1.5">
                  <Info className="h-5 w-5 opacity-40 text-gray-500" />
                  No alerts currently waiting to cross.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin">
                  {alerts.map((al) => (
                    <div
                      key={al.id}
                      className="p-2.5 bg-[#131722]/30 border border-[#1e222d] rounded-lg text-[10px] font-mono flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-gray-300">{currentSymbol}</span>
                        <span className="text-[9px] text-gray-500">
                          Crosses {al.type === 'above' ? 'Above' : 'Below'} {al.price}
                        </span>
                      </div>
                      {onRemoveAlert && (
                        <button
                          onClick={() => onRemoveAlert(al.id)}
                          className="text-[9px] text-red-500 hover:text-red-400 font-bold px-1.5 py-0.5 rounded hover:bg-red-500/10 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Settings & Synchronization Option Popover */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('settings')}
            className={`p-2 rounded-xl border cursor-pointer transition-all ${
              openDropdown === 'settings'
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-450'
                : 'bg-[#131722]/50 border-[#1e222d] text-gray-400 hover:text-white'
            }`}
            title="Settings & Workspace Sync"
          >
            <Settings className="h-4 w-4" />
          </button>

          {openDropdown === 'settings' && (
            <div className="absolute top-11 right-0 w-64 bg-[#0c0d12]/95 border border-[#1e222d] rounded-xl shadow-2xl p-4 z-50 backdrop-blur-xl space-y-3.5">
              <div className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Workspace Sync Manager</div>

              {/* Sync checkboxes */}
              <div className="space-y-2.5 border-b border-gray-800 pb-3">
                <label className="flex items-center gap-2.5 text-[10px] text-gray-400 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkSymbols}
                    onChange={(e) => setLinkSymbols(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#1e222d] text-yellow-500 focus:ring-0 cursor-pointer accent-yellow-500"
                  />
                  Sync Symbols across cells
                </label>

                <label className="flex items-center gap-2.5 text-[10px] text-gray-400 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkTimeframes}
                    onChange={(e) => setLinkTimeframes(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#1e222d] text-yellow-500 focus:ring-0 cursor-pointer accent-yellow-500"
                  />
                  Sync Timeframes across cells
                </label>

                <label className="flex items-center gap-2.5 text-[10px] text-gray-400 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkIndicators}
                    onChange={(e) => setLinkIndicators(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#1e222d] text-yellow-500 focus:ring-0 cursor-pointer accent-yellow-500"
                  />
                  Sync Indicators across cells
                </label>

                <label className="flex items-center gap-2.5 text-[10px] text-gray-400 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkZoom}
                    onChange={(e) => setLinkZoom(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#1e222d] text-yellow-500 focus:ring-0 cursor-pointer accent-yellow-500"
                  />
                  Sync Zoom & Scroll positions
                </label>

                <label className="flex items-center gap-2.5 text-[10px] text-gray-400 hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkDrawings}
                    onChange={(e) => setLinkDrawings(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#1e222d] text-yellow-500 focus:ring-0 cursor-pointer accent-yellow-500"
                  />
                  Sync Drawings across cells
                </label>
              </div>

              {/* Workspace operations */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onSaveWorkspace();
                    setOpenDropdown(null);
                  }}
                  className="flex-1 py-1.5 bg-[#131722] hover:bg-gray-800 border border-[#2a2e39] text-gray-300 hover:text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Save Workspace
                </button>
                <button
                  onClick={() => {
                    onRestoreWorkspace();
                    setOpenDropdown(null);
                  }}
                  className="flex-1 py-1.5 bg-[#131722] hover:bg-gray-800 border border-[#2a2e39] text-gray-300 hover:text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Restore Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Nav Shortcuts */}
        <div className="flex items-center gap-1">
          <Link
            href="/blueprints"
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-xl bg-[#131722]/50 border border-[#1e222d] text-gray-400 hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-500/5 text-[9px] font-bold cursor-pointer transition-all"
            title="Blueprints — Strategy Builder"
          >
            <BookMarked className="h-3.5 w-3.5" />
            Blueprints
          </Link>
          <Link
            href="/editor"
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-xl bg-[#131722]/50 border border-[#1e222d] text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 text-[9px] font-bold cursor-pointer transition-all"
            title="Pine Script Editor"
          >
            <Code2 className="h-3.5 w-3.5" />
            Editor
          </Link>
        </div>

        <div className="h-6 w-[1px] bg-gray-800 mx-1" />

        {/* Right Panel Toggle */}
        <button
          onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
          className={`p-2 rounded-xl border cursor-pointer transition-all ${
            isRightPanelOpen
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.1)]'
              : 'bg-[#131722]/50 hover:bg-[#131722]/85 border border-[#1e222d] text-gray-400 hover:text-white'
          }`}
          title="Toggle Right Panel (News/Calendar)"
        >
          <Columns className="h-4 w-4" />
        </button>

        {/* Theme Switcher */}
        <button
          onClick={onToggleTheme}
          className="p-2 bg-[#131722]/50 hover:bg-[#131722]/85 text-gray-400 hover:text-white rounded-xl border border-[#1e222d] cursor-pointer transition-all"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="h-6 w-[1px] bg-gray-800 mx-1" />

        {/* User Profile dropdown */}
        <UserDropdown user={user} initialStocks={initialStocks} />
      </div>
    </header>
  );
}
