'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  Zap,
  Briefcase,
  Bell,
  Newspaper,
  Calendar,
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  MoreHorizontal,
  Trash,
  RefreshCw,
  XCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  Play,
  BookMarked,
  Code2,
  BarChart2,
  ExternalLink
} from 'lucide-react';

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
import {
  SimAccountState,
  SimPositionState,
  SimOrder,
  Candle
} from '@/lib/simulationData';

interface ConsolidatedSidebarProps {
  currentSymbol: string;
  currentPrice: number;
  portfolio: { symbol: string; qty: number; avgPrice: number }[];
  onPlaceOrder: (order: { type: 'BUY' | 'SELL'; qty: number; price: number }) => void;
  alerts: { id: string; price: number; type: 'above' | 'below' }[];
  onAddAlert: (price: number, type: 'above' | 'below') => void;
  onRemoveAlert: (id: string) => void;
  orderLines: {
    entryPrice: number;
    slPrice: number;
    tpPrice: number;
    hasBracket: boolean;
  };
  onOrderLinesChange: (lines: { entryPrice: number; slPrice: number; tpPrice: number; hasBracket: boolean }) => void;
  onSymbolSelect: (symbol: string) => void;
  watchlistPrices: Record<string, { price: number; change: number }>;

  // Simulation settings
  simAccount: SimAccountState;
  simPosition: SimPositionState | null;
  simOrders: SimOrder[];
  onAddSimOrder: (order: SimOrder) => void;
  onRemoveSimOrder: (id: string) => void;
  onClosePosition: () => void;
  onReversePosition: () => void;
  onCloseAll: () => void;
  leverage: number;
  setLeverage: (lev: number) => void;

  // Sidebar resizing/collapsing props
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;

  // Strategy triggers
  onRunBacktest: (strategy: 'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum') => void;
  onToggleBottomPanel?: (open: boolean) => void;
}

type TabType = 'watchlist' | 'trade' | 'portfolio' | 'alerts' | 'news' | 'calendar' | 'strategy';

export default function ConsolidatedSidebar({
  currentSymbol,
  currentPrice,
  portfolio,
  onPlaceOrder,
  alerts,
  onAddAlert,
  onRemoveAlert,
  orderLines,
  onOrderLinesChange,
  onSymbolSelect,
  watchlistPrices,
  simAccount,
  simPosition,
  simOrders,
  onAddSimOrder,
  onRemoveSimOrder,
  onClosePosition,
  onReversePosition,
  onCloseAll,
  leverage,
  setLeverage,
  sidebarWidth,
  setSidebarWidth,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  onRunBacktest,
  onToggleBottomPanel
}: ConsolidatedSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('watchlist');
  const [screenerCategory, setScreenerCategory] = useState<'crypto' | 'forex' | 'stocks'>('crypto');
  const [screenerFilter, setScreenerFilter] = useState<string>('all');
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderMode, setOrderMode] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('market');
  const [orderQty, setOrderQty] = useState<number>(1);
  const [stopPrice, setStopPrice] = useState<number>(0);
  const [alertPriceInput, setAlertPriceInput] = useState<string>('');
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');

  // Watchlist Category, Search, and Favorites state
  const [favorites, setFavorites] = useState<string[]>(['BTC/USD', 'ETH/USD', 'RELIANCE']);
  const [watchlistCategory, setWatchlistCategory] = useState<'All' | 'Crypto' | 'Forex' | 'Stocks' | 'Futures' | 'Indices' | 'Favorites'>('All');
  const [watchlistSearch, setWatchlistSearch] = useState('');

  // Sync inputs on symbol load
  useEffect(() => {
    if (!currentPrice) return;
    onOrderLinesChange({
      ...orderLines,
      entryPrice: parseFloat(currentPrice.toFixed(2)),
      slPrice: parseFloat((currentPrice * 0.98).toFixed(2)),
      tpPrice: parseFloat((currentPrice * 1.03).toFixed(2)),
    });
    setStopPrice(parseFloat((currentPrice * 1.01).toFixed(2)));
    setAlertPriceInput(currentPrice.toString());
  }, [currentSymbol]);

  // Sidebar drag resizer handler
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Constraint width between 240px and 600px
      const newWidth = Math.max(240, Math.min(600, startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Rich Watchlist Assets structured by categories
  const allAssets = useMemo(() => [
    // Crypto
    { symbol: 'BTC/USD', name: 'Bitcoin', category: 'Crypto' },
    { symbol: 'ETH/USD', name: 'Ethereum', category: 'Crypto' },
    { symbol: 'SOL/USD', name: 'Solana', category: 'Crypto' },
    { symbol: 'LINK/USD', name: 'Chainlink', category: 'Crypto' },
    { symbol: 'ADA/USD', name: 'Cardano', category: 'Crypto' },
    { symbol: 'DOGE/USD', name: 'Dogecoin', category: 'Crypto' },
    // Forex
    { symbol: 'EUR/USD', name: 'Euro / USD', category: 'Forex' },
    { symbol: 'GBP/USD', name: 'Pound / USD', category: 'Forex' },
    { symbol: 'USD/JPY', name: 'US Dollar / Yen', category: 'Forex' },
    { symbol: 'AUD/USD', name: 'Aussie / USD', category: 'Forex' },
    { symbol: 'USD/CAD', name: 'US Dollar / CAD', category: 'Forex' },
    // Stocks
    { symbol: 'RELIANCE', name: 'Reliance Industries', category: 'Stocks' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', category: 'Stocks' },
    { symbol: 'INFY', name: 'Infosys Ltd.', category: 'Stocks' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', category: 'Stocks' },
    { symbol: 'SBIN', name: 'State Bank of India', category: 'Stocks' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', category: 'Stocks' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', category: 'Stocks' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', category: 'Stocks' },
    // Futures
    { symbol: 'XAU/USD', name: 'Gold Spot', category: 'Futures' },
    { symbol: 'XAG/USD', name: 'Silver Spot', category: 'Futures' },
    // Indices
    { symbol: 'NIFTY50', name: 'Nifty 50', category: 'Indices' },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty', category: 'Indices' },
    { symbol: 'INDIAVIX', name: 'India VIX', category: 'Indices' },
  ], []);

  const filteredWatchlist = useMemo(() => {
    return allAssets.filter(item => {
      // 1. Category Filter
      if (watchlistCategory === 'Favorites') {
        if (!favorites.includes(item.symbol)) return false;
      } else if (watchlistCategory !== 'All' && item.category !== watchlistCategory) {
        return false;
      }
      // 2. Search Filter
      if (watchlistSearch.trim()) {
        const query = watchlistSearch.toLowerCase();
        return item.symbol.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [watchlistCategory, watchlistSearch, favorites, allAssets]);

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  // Technical Screener Mock Data
  const screenerAssets = {
    crypto: [
      { symbol: 'BTC/USD', name: 'Bitcoin' },
      { symbol: 'ETH/USD', name: 'Ethereum' },
      { symbol: 'SOL/USD', name: 'Solana' },
    ],
    forex: [
      { symbol: 'EUR/USD', name: 'Euro / Dollar' },
      { symbol: 'GBP/USD', name: 'Pound / Dollar' },
      { symbol: 'USD/JPY', name: 'Dollar / Yen' },
    ],
    stocks: [
      { symbol: 'RELIANCE', name: 'Reliance Industries' },
      { symbol: 'TCS', name: 'Tata Consultancy' },
      { symbol: 'INFY', name: 'Infosys Ltd.' },
    ],
  };

  const currentScreenerList = useMemo(() => {
    const assets = screenerAssets[screenerCategory];
    return assets.map(asset => {
      const price = watchlistPrices[asset.symbol]?.price ?? 100;
      const change = watchlistPrices[asset.symbol]?.change ?? 0;
      let rating = 'Neutral';
      let rsi = 50;

      if (asset.symbol === 'BTC/USD') { rsi = 71; rating = 'Strong Overbought'; }
      if (asset.symbol === 'ETH/USD') { rsi = 62; rating = 'Buy'; }
      if (asset.symbol === 'SOL/USD') { rsi = 31; rating = 'Oversold'; }

      return {
        ...asset,
        price,
        change,
        rating,
        rsi
      };
    });
  }, [screenerCategory, watchlistPrices]);

  // Economic Calendar Mock Data
  const calendarEvents = [
    { time: '14:30', country: 'US', title: 'CPI Inflation MoM (Jun)', impact: 'high', forecast: '0.1%', actual: '0.1%' },
    { time: '16:00', country: 'US', title: 'FED Interest Rate Decision', impact: 'high', forecast: '5.25%', actual: '' },
    { time: '17:30', country: 'IN', title: 'RBI Monetary Policy Rate', impact: 'medium', forecast: '6.50%', actual: '6.50%' },
    { time: '19:45', country: 'EU', title: 'ECB President Lagarde Speech', impact: 'medium', forecast: '', actual: '' },
  ];

  // Premium Mock News Feed
  const newsFeed = [
    { id: '1', publisher: 'Bloomberg', time: '12m ago', title: 'Federal Reserve hints at interest rate cuts as core inflation settles at 2.4%', sentiment: 'Bullish' },
    { id: '2', publisher: 'Reuters', time: '38m ago', title: 'Institutional crypto inflows hit record $3.2B in June led by spot ETF products', sentiment: 'Bullish' },
    { id: '3', publisher: 'MarketWatch', time: '2h ago', title: 'Tech index faces selling pressure amid semiconductor export restriction chatter', sentiment: 'Bearish' },
    { id: '4', publisher: 'FT', time: '4h ago', title: 'European manufacturing PMIs drop unexpectedly, raising regional stagnation fears', sentiment: 'Bearish' },
    { id: '5', publisher: 'CNBC', time: '6h ago', title: 'Gold prices consolidate near historic highs as safe-haven demand accelerates', sentiment: 'Neutral' },
  ];

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = orderMode === 'limit' || orderMode === 'stop_limit' ? orderLines.entryPrice : currentPrice;
    onAddSimOrder({
      id: Math.random().toString(36).substring(4, 9),
      symbol: currentSymbol,
      type: orderType,
      mode: orderMode,
      qty: orderQty,
      price,
      stopPrice: orderMode === 'stop' || orderMode === 'stop_limit' ? stopPrice : null,
    });
  };

  const handleAddAlertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(alertPriceInput);
    if (price > 0) {
      onAddAlert(price, alertCondition);
      setAlertPriceInput('');
    }
  };

  const handleTabClick = (tab: TabType) => {
    if (activeTab === tab && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    } else {
      setActiveTab(tab);
      setIsSidebarCollapsed(false);
    }
  };

  // Calculations for Trade Panel summary
  const activeOrderPrice = orderMode === 'limit' ? orderLines.entryPrice : currentPrice;
  const totalValue = activeOrderPrice * orderQty;
  const marginRequired = totalValue / leverage;

  const tabItems = [
    { id: 'watchlist', icon: Star, label: 'Watchlist & Screener' },
    { id: 'trade', icon: Zap, label: 'Trade Panel' },
    { id: 'portfolio', icon: Briefcase, label: 'Portfolio & Positions' },
    { id: 'alerts', icon: Bell, label: 'Alerts Manager' },
    { id: 'news', icon: Newspaper, label: 'News Feed' },
    { id: 'calendar', icon: Calendar, label: 'Economic Calendar' },
    { id: 'strategy', icon: Activity, label: 'Strategy Tester' },
  ] as const;

  return (
    <div className="flex select-none h-full shrink-0 z-30 relative bg-[#07080a] border-r border-[#1e222d]">
      {/* 1. Slim Vertical Icon Strip */}
      <div className="w-[50px] border-r border-[#1e222d] flex flex-col justify-between items-center py-4 bg-[#0a0b0d]">
        <div className="flex flex-col gap-5 items-center">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !isSidebarCollapsed;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`p-2.5 rounded-xl cursor-pointer relative group transition-all duration-300 ${
                  isActive
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_12px_rgba(234,179,8,0.1)]'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/20'
                }`}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
                <div className="absolute left-[54px] top-1.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-2xl backdrop-blur-xl">
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Nav Links */}
        <div className="flex flex-col gap-3 items-center mb-3">
          <div className="w-7 h-[1px] bg-[#1e222d]" />
          <Link
            href="/blueprints"
            className="p-2.5 rounded-xl cursor-pointer relative group transition-all duration-300 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10"
            title="Blueprints — Strategy Builder"
          >
            <BookMarked className="h-5 w-5" />
            <div className="absolute left-[54px] top-1.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-2xl backdrop-blur-xl">
              Blueprints <ExternalLink className="inline h-2.5 w-2.5 ml-1 text-gray-600" />
            </div>
          </Link>
          <Link
            href="/editor"
            className="p-2.5 rounded-xl cursor-pointer relative group transition-all duration-300 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10"
            title="Pine Script Editor"
          >
            <Code2 className="h-5 w-5" />
            <div className="absolute left-[54px] top-1.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-2xl backdrop-blur-xl">
              Script Editor <ExternalLink className="inline h-2.5 w-2.5 ml-1 text-gray-600" />
            </div>
          </Link>
          <Link
            href="/footprint"
            className="p-2.5 rounded-xl cursor-pointer relative group transition-all duration-300 text-gray-500 hover:text-green-400 hover:bg-green-500/10"
            title="Footprint Chart"
          >
            <BarChart2 className="h-5 w-5" />
            <div className="absolute left-[54px] top-1.5 hidden group-hover:block bg-[#0d0f14] text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded border border-[#2a2e39] z-50 whitespace-nowrap shadow-2xl backdrop-blur-xl">
              Footprint Chart <ExternalLink className="inline h-2.5 w-2.5 ml-1 text-gray-600" />
            </div>
          </Link>
          <div className="w-7 h-[1px] bg-[#1e222d]" />
        </div>

        {/* Collapse arrow */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/40 cursor-pointer transition-colors border border-transparent hover:border-[#1e222d] mb-2"
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* 2. Expanded Content Panel */}
      {!isSidebarCollapsed && (
        <div
          style={{ width: `${sidebarWidth}px` }}
          className="flex flex-col h-full bg-[#08090c]/95 backdrop-blur-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="h-12 border-b border-[#1e222d] flex items-center justify-between px-4 bg-[#0a0c10]/40 shrink-0">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-gray-300">
              {tabItems.find((t) => t.id === activeTab)?.label}
            </h3>
            <span className="text-[9px] font-mono font-bold text-gray-600 bg-gray-950 px-2 py-0.5 rounded border border-[#1e222d]">
              PANEL
            </span>
          </div>

          {/* Pane Scroll Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {/* Watchlist Tab */}
            {activeTab === 'watchlist' && (
              <div className="space-y-3">
                {/* Search Watchlist */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search symbols..."
                    value={watchlistSearch}
                    onChange={(e) => setWatchlistSearch(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-[#21262d] rounded-lg h-8 px-3 text-[10px] text-white focus:outline-none focus:border-yellow-500/40"
                  />
                  {watchlistSearch && (
                    <button
                      onClick={() => setWatchlistSearch('')}
                      className="absolute right-2.5 top-1.5 text-gray-500 hover:text-white text-[9px] font-black"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Categories Row */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none scrollbar-hide">
                  {([
                    { id: 'All', label: 'All' },
                    { id: 'Favorites', label: '★ Favorites' },
                    { id: 'Crypto', label: 'Crypto' },
                    { id: 'Forex', label: 'Forex' },
                    { id: 'Stocks', label: 'Stocks' },
                    { id: 'Futures', label: 'Futures' },
                    { id: 'Indices', label: 'Indices' }
                  ] as const).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setWatchlistCategory(cat.id)}
                      className={`px-2 h-6 rounded-lg text-[8px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                        watchlistCategory === cat.id
                          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          : 'bg-[#0d0f14]/40 border border-[#21262d] text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Watchlist table */}
                <div className="bg-[#0b0c10] border border-[#21262d] rounded-lg overflow-hidden">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead className="bg-[#0e1014] text-gray-500 text-[8px] uppercase font-black tracking-wider border-b border-[#21262d]">
                      <tr>
                        <th className="py-2 pl-2">Symbol</th>
                        <th className="py-2 text-right font-mono">Last</th>
                        <th className="py-2 text-right pr-2 font-mono">Chg%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]/40">
                      {filteredWatchlist.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-gray-600 text-[9px]">
                            No matching assets
                          </td>
                        </tr>
                      ) : (
                        filteredWatchlist.map((item) => {
                          const rawLive = watchlistPrices[item.symbol];
                          const live = {
                            price: rawLive?.price ?? 100,
                            change: rawLive?.change ?? 0
                          };
                          const isSelected = currentSymbol === item.symbol;
                          const isPositive = live.change >= 0;
                          const isFav = favorites.includes(item.symbol);

                          // Hover details calculations
                          const mockVol = item.symbol.includes('BTC') ? '43.2K BTC' :
                                          item.symbol.includes('ETH') ? '210K ETH' :
                                          item.symbol.includes('SOL') ? '1.5M SOL' :
                                          item.symbol.includes('/') ? '184M USD' : '3.4M shares';
                          const mockSpread = item.symbol.includes('/') && !item.symbol.includes('BTC') ? '0.2 pips' : '0.02%';
                          const mockHigh = fmt(live.price * 1.015, item.symbol.includes('/') && !item.symbol.includes('JPY') ? 4 : 2);
                          const mockLow = fmt(live.price * 0.985, item.symbol.includes('/') && !item.symbol.includes('JPY') ? 4 : 2);

                          return (
                            <tr
                              key={item.symbol}
                              onClick={() => onSymbolSelect(item.symbol)}
                              className={`cursor-pointer transition-all border-l-2 relative group hover:bg-[#1c2030]/10 ${
                                isSelected
                                  ? 'bg-[#1c2030]/20 border-l-yellow-500'
                                  : 'border-l-transparent'
                              }`}
                            >
                              <td className="py-2 pl-2 flex items-center">
                                <button
                                  onClick={(e) => toggleFavorite(item.symbol, e)}
                                  className="text-gray-700 hover:text-yellow-500 mr-1.5 transition-colors cursor-pointer"
                                >
                                  <Star className={`h-3 w-3 ${isFav ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                </button>
                                <div className="flex flex-col">
                                  <span className={`text-[10px] font-bold ${isSelected ? 'text-yellow-400' : 'text-gray-200'}`}>
                                    {item.symbol}
                                  </span>
                                  <span className="text-[7px] text-gray-500 uppercase tracking-widest">{item.category}</span>
                                </div>
                              </td>
                              <td className="py-2 text-right font-mono text-[10px] font-extrabold text-gray-300">
                                {item.symbol.includes('/') && !item.symbol.includes('JPY') ? live.price.toFixed(4) : live.price.toLocaleString()}
                              </td>
                              <td className={`py-2 text-right pr-2 font-mono text-[10px] font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}{live.change.toFixed(2)}%
                              </td>

                              {/* Hover details tooltip overlay */}
                              <td className="p-0 border-0 h-0 w-0">
                                <div className="absolute left-[102%] top-0 hidden group-hover:flex flex-col gap-1 w-44 p-2.5 bg-[#1C2128]/95 border border-[#30363d] rounded-xl shadow-2xl z-[100] text-[9px] pointer-events-none text-left backdrop-blur-md">
                                  <div className="text-[10px] font-black text-white border-b border-[#30363d] pb-1 mb-1 flex justify-between">
                                    <span>{item.symbol}</span>
                                    <span className="text-[8px] text-gray-500 uppercase">{item.name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">24h Vol</span>
                                    <span className="text-gray-300 font-mono font-bold">{mockVol}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Spread</span>
                                    <span className="text-gray-350 font-mono font-bold">{mockSpread}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Daily High</span>
                                    <span className="text-green-400 font-mono font-bold">{mockHigh}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Daily Low</span>
                                    <span className="text-red-400 font-mono font-bold">{mockLow}</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Screener Categories */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-black tracking-widest text-gray-500 px-1">Market Screener</div>
                  <div className="flex bg-[#0a0c10] p-1 rounded-xl border border-[#1e222d] gap-1">
                    {(['crypto', 'forex', 'stocks'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setScreenerCategory(cat)}
                        className={`flex-1 py-1.5 text-[9px] uppercase font-extrabold rounded-lg cursor-pointer transition-all ${
                          screenerCategory === cat
                            ? 'bg-[#1e222d] text-white shadow'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Screener list */}
                  <div className="grid gap-2">
                    {currentScreenerList.map((item) => {
                      const isPositive = item.change >= 0;
                      const isSelected = currentSymbol === item.symbol;
                      return (
                        <div
                          key={item.symbol}
                          onClick={() => onSymbolSelect(item.symbol)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-yellow-500/5 border-yellow-500/20 shadow-[0_0_12px_rgba(234,179,8,0.05)]'
                              : 'bg-[#131722]/15 border-[#1e222d] hover:bg-gray-800/10 hover:border-gray-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-200">{item.symbol}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                              item.rsi >= 70 ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              item.rsi <= 35 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              'bg-[#1e222d]/40 text-gray-400 border-transparent'
                            }`}>
                              RSI: {item.rsi} • {item.rating}
                            </span>
                          </div>
                          <div className="flex justify-between mt-2.5 items-end font-mono">
                            <span className="text-xs font-bold text-gray-400">
                              {item.symbol.includes('/') && !item.symbol.includes('JPY') ? item.price.toFixed(4) : item.price.toLocaleString()}
                            </span>
                            <span className={`text-[10px] font-black ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                              {isPositive ? '+' : ''}{item.change.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Trade Tab */}
            {activeTab === 'trade' && (
              <div className="space-y-4">
                {/* BUY/SELL tabs */}
                <div className="grid grid-cols-2 p-1 bg-[#0a0c10] rounded-xl border border-[#1e222d] gap-1 shrink-0">
                  <button
                    onClick={() => setOrderType('BUY')}
                    className={`py-2.5 text-xs font-black rounded-lg cursor-pointer transition-all ${
                      orderType === 'BUY'
                        ? 'bg-green-500 text-gray-950 shadow-[0_0_12px_rgba(34,197,94,0.2)] font-extrabold'
                        : 'text-green-500 hover:bg-green-500/5'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    onClick={() => setOrderType('SELL')}
                    className={`py-2.5 text-xs font-black rounded-lg cursor-pointer transition-all ${
                      orderType === 'SELL'
                        ? 'bg-red-500 text-gray-950 shadow-[0_0_12px_rgba(239,68,68,0.2)] font-extrabold'
                        : 'text-red-500 hover:bg-red-500/5'
                    }`}
                  >
                    SELL
                  </button>
                </div>

                {/* Active Position Info */}
                {simPosition && (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold flex items-center gap-1.5 text-white">
                        <span className={`h-2.5 w-2.5 rounded-full ${simPosition.isLong ? 'bg-green-500' : 'bg-red-500'} inline-block animate-pulse`} />
                        {simPosition.isLong ? 'LONG' : 'SHORT'} • {simPosition.qty} Units
                      </span>
                      <span className={`font-bold ${simPosition.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {simPosition.unrealizedPnL >= 0 ? '+' : ''}{simPosition.unrealizedPnL.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-[10px]">
                      <span>Entry Price: {simPosition.avgEntryPrice.toFixed(2)}</span>
                      <span>Leverage: {leverage}x</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                      <button
                        onClick={onReversePosition}
                        className="py-1.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-gray-950 rounded-lg border border-yellow-500/20 text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Reverse
                      </button>
                      <button
                        onClick={onClosePosition}
                        className="py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg border border-red-500/20 text-[10px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle className="h-3 w-3" />
                        Close Position
                      </button>
                    </div>
                  </div>
                )}

                {/* Form fields */}
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  {/* Order Mode tabs */}
                  <div className="grid grid-cols-4 gap-1 text-[9px] bg-[#0a0c10] p-1 rounded-xl border border-[#1e222d]">
                    {['market', 'limit', 'stop', 'stop_limit'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOrderMode(mode as any)}
                        className={`py-1.5 rounded-lg font-black uppercase cursor-pointer transition-all ${
                          orderMode === mode
                            ? 'bg-[#1e222d] text-yellow-400 font-extrabold border border-[#2a2e39]'
                            : 'text-gray-550 hover:text-gray-300'
                        }`}
                      >
                        {mode.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-extrabold tracking-widest text-gray-500 px-1">Quantity</label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={orderQty}
                      onChange={(e) => setOrderQty(Math.max(0.001, parseFloat(e.target.value) || 0))}
                      className="w-full bg-[#0a0c10] border border-[#1e222d] focus:border-yellow-500/35 rounded-xl h-10 px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Limit Price */}
                  {(orderMode === 'limit' || orderMode === 'stop_limit') && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-widest text-gray-500 px-1">Limit Price</label>
                      <input
                        type="number"
                        step="any"
                        value={orderLines.entryPrice}
                        onChange={(e) => onOrderLinesChange({ ...orderLines, entryPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#0a0c10] border border-[#1e222d] focus:border-yellow-500/35 rounded-xl h-10 px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Stop Price */}
                  {(orderMode === 'stop' || orderMode === 'stop_limit') && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-extrabold tracking-widest text-red-400 px-1">Stop Trigger Price</label>
                      <input
                        type="number"
                        step="any"
                        value={stopPrice}
                        onChange={(e) => setStopPrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#0a0c10] border border-red-500/20 focus:border-red-500/50 rounded-xl h-10 px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Leverage Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] uppercase font-extrabold tracking-widest text-gray-550 px-1">
                      <span>Leverage</span>
                      <span className="text-yellow-400 font-bold font-mono">{leverage}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={leverage}
                      onChange={(e) => setLeverage(Number(e.target.value))}
                      className="w-full accent-yellow-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* OCO bracket settings */}
                  <div className="space-y-3 pt-2 border-t border-[#1e222d]/60">
                    <div className="flex items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        id="attach-bracket-left"
                        checked={orderLines.hasBracket}
                        onChange={(e) => onOrderLinesChange({ ...orderLines, hasBracket: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-[#1e222d] text-yellow-500 focus:ring-0 cursor-pointer accent-yellow-500"
                      />
                      <label htmlFor="attach-bracket-left" className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 cursor-pointer">
                        Attach OCO Bracket (SL/TP)
                      </label>
                    </div>

                    {orderLines.hasBracket && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black tracking-widest text-red-500">Stop Loss</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="SL Price"
                            value={orderLines.slPrice}
                            onChange={(e) => onOrderLinesChange({ ...orderLines, slPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#0a0c10] border border-red-500/25 rounded-lg h-9 px-2.5 text-[10px] text-white font-mono focus:outline-none focus:border-red-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black tracking-widest text-green-500">Take Profit</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="TP Price"
                            value={orderLines.tpPrice}
                            onChange={(e) => onOrderLinesChange({ ...orderLines, tpPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-[#0a0c10] border border-green-500/25 rounded-lg h-9 px-2.5 text-[10px] text-white font-mono focus:outline-none focus:border-green-500/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary details */}
                  <div className="p-3 bg-[#0a0c10]/40 border border-[#1e222d] rounded-xl space-y-2 text-[10px] text-gray-500 font-mono">
                    <div className="flex justify-between">
                      <span>Valuation:</span>
                      <span className="text-gray-300 font-bold">{totalValue.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margin Used:</span>
                      <span className="text-white font-bold">{marginRequired.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full h-10 rounded-xl font-bold text-xs tracking-wide cursor-pointer transition-all shadow-lg ${
                      orderType === 'BUY'
                        ? 'bg-green-500 hover:bg-green-600 text-gray-950 hover:shadow-[0_0_16px_rgba(34,197,94,0.15)]'
                        : 'bg-red-500 hover:bg-red-600 text-gray-950 hover:shadow-[0_0_16px_rgba(239,68,68,0.15)]'
                    }`}
                  >
                    Simulate {orderType} Order
                  </button>
                </form>
              </div>
            )}

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
              <div className="space-y-4">
                {/* Account Balances Summary Card */}
                <div className="bg-gradient-to-br from-[#12141c] to-[#0a0c10] border border-[#1e222d] rounded-xl p-4 space-y-3 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Sim Portfolio</span>
                    <button
                      onClick={onCloseAll}
                      className="h-6 px-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all font-bold text-[9px] cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="h-3 w-3" />
                      Close All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-[9px] text-gray-500">Balance</div>
                      <div className="text-sm font-bold text-white">${simAccount.balance.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500">Equity</div>
                      <div className="text-sm font-bold text-white">${simAccount.equity.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500">Free Margin</div>
                      <div className="text-sm font-bold text-white">${simAccount.freeMargin.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500">Floating P/L</div>
                      <div className={`text-sm font-bold ${simAccount.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {simAccount.unrealizedPnL >= 0 ? '+' : ''}{simAccount.unrealizedPnL.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Positions list */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-black tracking-widest text-gray-500 px-1">Active Positions</div>
                  {simPosition ? (
                    <div className="p-3 bg-[#0a0c10]/40 border border-[#1e222d] rounded-xl flex justify-between items-center font-mono text-xs">
                      <div>
                        <div className="font-bold flex items-center gap-1.5 text-white">
                          <span className={`h-2.5 w-2.5 rounded-full ${simPosition.isLong ? 'bg-green-500' : 'bg-red-500'} inline-block`} />
                          {simPosition.symbol}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {simPosition.isLong ? 'LONG' : 'SHORT'} • {simPosition.qty} Units @ {simPosition.avgEntryPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${simPosition.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {simPosition.unrealizedPnL >= 0 ? '+' : ''}{simPosition.unrealizedPnL.toFixed(2)}
                        </div>
                        <button
                          onClick={onClosePosition}
                          className="text-[9px] font-sans font-bold text-red-400 hover:text-red-300 mt-1 cursor-pointer transition-colors"
                        >
                          Close Position
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-600 text-[10px] border border-dashed border-[#1e222d] rounded-xl bg-[#0f111a]/10">
                      No active positions open
                    </div>
                  )}
                </div>

                {/* Pending orders list */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-black tracking-widest text-gray-550 px-1">Pending Orders Queue</div>
                  {simOrders.length === 0 ? (
                    <div className="text-center py-6 text-gray-600 text-[10px] border border-dashed border-[#1e222d] rounded-xl bg-[#0f111a]/10">
                      No pending orders queued
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {simOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex justify-between items-center p-3 bg-[#0a0c10]/40 border border-[#1e222d] rounded-xl font-mono text-[10px] hover:border-gray-800 transition-colors"
                        >
                          <div>
                            <span className={`font-black ${ord.type === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                              {ord.type}
                            </span>{' '}
                            <span className="text-gray-300 font-bold">{ord.qty} units</span>
                            <div className="text-gray-500 text-[9px] uppercase mt-0.5 font-medium">
                              {ord.mode} @ {ord.price} {ord.stopPrice ? `(Stop: ${ord.stopPrice})` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveSimOrder(ord.id)}
                            className="p-1 hover:bg-gray-800/60 text-gray-500 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                            title="Cancel Order"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {/* Alert form */}
                <form onSubmit={handleAddAlertSubmit} className="space-y-3.5 bg-[#0a0c10]/40 p-3.5 rounded-xl border border-[#1e222d]">
                  <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1 px-0.5">Create Alert</div>
                  <div className="flex gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setAlertCondition('above')}
                      className={`flex-1 py-2 border rounded-lg font-bold cursor-pointer transition-all ${
                        alertCondition === 'above'
                          ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 font-extrabold'
                          : 'border-[#1e222d] text-gray-500 hover:text-gray-400'
                      }`}
                    >
                      Crosses Above (≥)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertCondition('below')}
                      className={`flex-1 py-2 border rounded-lg font-bold cursor-pointer transition-all ${
                        alertCondition === 'below'
                          ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400 font-extrabold'
                          : 'border-[#1e222d] text-gray-500 hover:text-gray-400'
                      }`}
                    >
                      Crosses Below (≤)
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="number"
                      step="any"
                      value={alertPriceInput}
                      onChange={(e) => setAlertPriceInput(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-[#1e222d] focus:border-yellow-500/30 rounded-xl h-9 px-3 text-xs text-white font-mono focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-9 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Set Price Alert
                  </button>
                </form>

                {/* Alerts List */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-black tracking-widest text-gray-500 px-1">Active Alerts</div>
                  {alerts.length === 0 ? (
                    <div className="text-center py-6 text-gray-600 text-[10px] border border-dashed border-[#1e222d] rounded-xl bg-[#0f111a]/10">
                      No active price alerts set
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {alerts.map((al) => (
                        <div
                          key={al.id}
                          className="flex items-center justify-between p-3 bg-[#0a0c10]/40 border border-[#1e222d] rounded-xl text-xs font-mono hover:border-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5 text-yellow-500" />
                            <div>
                              <span className="text-gray-300 font-bold">{currentSymbol}</span>
                              <span className="text-[10px] text-gray-500 ml-1.5 font-bold">
                                {al.type === 'above' ? '≥' : '≤'} {al.price}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveAlert(al.id)}
                            className="p-1 hover:bg-gray-800/60 text-gray-550 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* News Tab */}
            {activeTab === 'news' && (
              <div className="space-y-3.5">
                <div className="text-[10px] uppercase font-black tracking-widest text-gray-550 px-1">Global Market News</div>
                {newsFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#0f111a]/40 border border-[#1e222d] hover:border-gray-800 rounded-xl space-y-1.5 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-center text-[9px] text-gray-500 font-mono">
                      <span className="font-bold text-gray-400 group-hover:text-yellow-500 transition-colors">{item.publisher}</span>
                      <span>{item.time}</span>
                    </div>
                    <div className="text-xs font-medium text-gray-200 leading-snug group-hover:text-white transition-colors">
                      {item.title}
                    </div>
                    <div className="flex pt-1">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                        item.sentiment === 'Bullish' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        item.sentiment === 'Bearish' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-gray-800/30 text-gray-400 border-transparent'
                      }`}>
                        {item.sentiment}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
              <div className="space-y-3.5">
                <div className="text-[10px] uppercase font-black tracking-widest text-gray-550 px-1">Upcoming Events</div>
                {calendarEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#0f111a]/40 border border-[#1e222d] hover:border-gray-800 rounded-xl transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold font-mono bg-gray-950 px-1.5 py-0.5 rounded border border-[#1e222d] text-gray-300">
                          {evt.time}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">{evt.country}</span>
                      </div>
                      <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
                        evt.impact === 'high' ? 'bg-red-500/10 text-red-400' :
                        evt.impact === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {evt.impact}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-gray-200 mt-2 leading-snug">
                      {evt.title}
                    </div>

                    {evt.forecast && (
                      <div className="flex gap-4 mt-2.5 font-mono text-[9px] text-gray-500 pt-1.5 border-t border-[#1e222d]/30">
                        <div>Forecast: <span className="text-gray-300 font-bold">{evt.forecast}</span></div>
                        {evt.actual && <div>Actual: <span className="text-green-500 font-bold">{evt.actual}</span></div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Strategy Tab */}
            {activeTab === 'strategy' && (
              <div className="space-y-4">
                <div className="text-[10px] uppercase font-black tracking-widest text-gray-550 px-1">Pine Script Strategies</div>
                <div className="space-y-3">
                  <div className="p-3.5 bg-[#0f111a]/40 border border-[#1e222d] rounded-xl space-y-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-white">EMA Crossover</h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        Executes buy orders when the 20 EMA crosses above the 50 EMA, and sells when it crosses below.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onRunBacktest('ema_crossover');
                        if (onToggleBottomPanel) onToggleBottomPanel(true);
                      }}
                      className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-950 rounded-lg text-[10px] font-black cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow"
                    >
                      <Play className="h-3 w-3 fill-gray-950" />
                      Run Strategy Backtest
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#0f111a]/40 border border-[#1e222d] rounded-xl space-y-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-white">RSI Mean Reversion</h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        Goes long when RSI drops below oversold (30) and goes short when RSI rises above overbought (70).
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onRunBacktest('rsi_mean_reversion');
                        if (onToggleBottomPanel) onToggleBottomPanel(true);
                      }}
                      className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-950 rounded-lg text-[10px] font-black cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow"
                    >
                      <Play className="h-3 w-3 fill-gray-950" />
                      Run Strategy Backtest
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#0f111a]/40 border border-[#1e222d] rounded-xl space-y-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-white">MACD Momentum</h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        Trades based on MACD histogram signals and crossovers relative to the zero baseline.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onRunBacktest('macd_momentum');
                        if (onToggleBottomPanel) onToggleBottomPanel(true);
                      }}
                      className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-950 rounded-lg text-[10px] font-black cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow"
                    >
                      <Play className="h-3 w-3 fill-gray-950" />
                      Run Strategy Backtest
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Resize boundary handle splitter */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute top-0 bottom-0 right-0 w-[4px] hover:w-[6px] hover:bg-yellow-500/50 cursor-col-resize transition-all z-40 bg-transparent"
          />
        </div>
      )}
    </div>
  );
}
