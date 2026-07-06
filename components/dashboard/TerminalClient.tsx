'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { X, Expand, Minimize2, Maximize2, ChevronLeft, ChevronRight, Play, Pause, Code2, LayoutGrid, BookOpen } from 'lucide-react';
import TopNavBar from '@/components/dashboard/TopNavBar';
import ConsolidatedSidebar from '@/components/dashboard/ConsolidatedSidebar';
import BottomPanel from '@/components/dashboard/BottomPanel';
import TradingViewWidget from '@/components/TradingViewWidget';
import SimulationChart from '@/components/dashboard/SimulationChart';
import ChartToolbar from '@/components/dashboard/ChartToolbar';
import QuickTradePanel from '@/components/dashboard/QuickTradePanel';
import BacktestConfigModal from '@/components/dashboard/BacktestConfigModal';
import RightPanel from '@/components/dashboard/RightPanel';
import { compilePineScript, CompiledPineScript } from '@/lib/pineInterpreter';
import {
  generateMockData, runBacktest,
  Candle, BacktestReport, Trade,
  SimAccountState, SimPositionState, SimOrder,
  processSimulationTick,
} from '@/lib/simulationData';

interface ChartCellState {
  symbol: string;
  timeframe: string;
  chartType: string;
  activeIndicators: string[];
  visibleCount: number;
  scrollIndex: number;
  drawings: any[];
}

const DEFAULT_CELLS: ChartCellState[] = [
  { symbol: 'BTC/USD',  timeframe: 'D', chartType: 'Candles', activeIndicators: ['ema20', 'rsi'], visibleCount: 80, scrollIndex: 0, drawings: [] },
  { symbol: 'ETH/USD',  timeframe: 'D', chartType: 'Candles', activeIndicators: ['ema20', 'rsi'], visibleCount: 80, scrollIndex: 0, drawings: [] },
  { symbol: 'SOL/USD',  timeframe: 'D', chartType: 'Candles', activeIndicators: ['ema20', 'rsi'], visibleCount: 80, scrollIndex: 0, drawings: [] },
  { symbol: 'NIFTY50',  timeframe: 'D', chartType: 'Candles', activeIndicators: ['ema20', 'rsi'], visibleCount: 80, scrollIndex: 0, drawings: [] },
  { symbol: 'RELIANCE', timeframe: 'D', chartType: 'Candles', activeIndicators: ['ema20', 'rsi'], visibleCount: 80, scrollIndex: 0, drawings: [] },
  { symbol: 'XAU/USD',  timeframe: 'D', chartType: 'Candles', activeIndicators: ['ema20', 'rsi'], visibleCount: 80, scrollIndex: 0, drawings: [] },
  { symbol: 'EUR/USD',  timeframe: 'D', chartType: 'Candles', activeIndicators: ['ema20', 'rsi'], visibleCount: 80, scrollIndex: 0, drawings: [] },
  { symbol: 'GBP/USD',  timeframe: 'D', chartType: 'Candles', activeIndicators: ['ema20', 'rsi'], visibleCount: 80, scrollIndex: 0, drawings: [] },
];

interface TerminalClientProps {
  user: any;
  initialStocks: any[];
}

export default function TerminalClient({ user, initialStocks }: TerminalClientProps) {
  // Chart grid state
  const [chartsCount, setChartsCount] = useState<1 | 2 | 3 | 4 | 6 | 8>(1);
  const [activeChartIdx, setActiveChartIdx] = useState(0);
  const [chartStates, setChartStates] = useState<ChartCellState[]>(DEFAULT_CELLS);

  // Split resizer states (2, 3, and 4 layouts)
  const [gridSplitX, setGridSplitX] = useState(50); // Column ratio split (left vs right)
  const [gridSplitY1, setGridSplitY1] = useState(50); // Row ratio split (left/top vs left/bottom)
  const [gridSplitY2, setGridSplitY2] = useState(50); // Row ratio split (right/top vs right/bottom)

  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  // Synchronization settings
  const [linkSymbols, setLinkSymbols] = useState(true);
  const [linkTimeframes, setLinkTimeframes] = useState(true);
  const [linkIndicators, setLinkIndicators] = useState(false);
  const [linkZoom, setLinkZoom] = useState(false);
  const [linkDrawings, setLinkDrawings] = useState(false);

  // Sidebar sizing/collapse state
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // New UX Redesign states
  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Fullscreen / expanding overlays
  const [isWorkspaceFS, setIsWorkspaceFS] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Drawing Tools state (hoisted)
  const [activeTool, setActiveTool] = useState('cursor');
  const [isLocked, setIsLocked] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMagnet, setIsMagnet] = useState(false);
  const [clearDrawingsTrigger, setClearDrawingsTrigger] = useState(0);

  // Workspace simulation/live modes
  const [chartMode, setChartMode] = useState<'live' | 'simulation'>('live');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Strategy Tester & journal bottom panel
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(280);
  const [backtestReport, setBacktestReport] = useState<BacktestReport | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum' | null>(null);

  // Replay playback states
  const [replayActive, setReplayActive] = useState(false);
  const [replayIndex, setReplayIndex] = useState(120);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000);
  const [isReplaySelecting, setIsReplaySelecting] = useState(false);

  // Active chart aliases
  const activeState = chartStates[activeChartIdx] ?? chartStates[0];
  const selectedSymbol = activeState.symbol;
  const timeframe = activeState.timeframe;
  const chartType = activeState.chartType;
  const activeIndicators = activeState.activeIndicators;

  // Candle data maps
  const [candlesMap, setCandlesMap] = useState<Record<string, Candle[]>>({});
  const candles = candlesMap[selectedSymbol] ?? [];

  // Account State
  const [portfolio, setPortfolio] = useState<{ symbol: string; qty: number; avgPrice: number }[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; price: number; type: 'above' | 'below' }[]>([]);
  const [orderLines, setOrderLines] = useState({ entryPrice: 68250, slPrice: 66800, tpPrice: 70500, hasBracket: true });
  const [simAccount, setSimAccount] = useState<SimAccountState>({
    balance: 100000,
    equity: 100000,
    marginUsed: 0,
    freeMargin: 100000,
    unrealizedPnL: 0,
    realizedPnL: 0,
    initialBalance: 100000
  });
  const [simPosition, setSimPosition] = useState<SimPositionState | null>(null);
  const [simOrders, setSimOrders] = useState<SimOrder[]>([]);
  const [simTrades, setSimTrades] = useState<Trade[]>([]);
  const [compiledPine, setCompiledPine] = useState<CompiledPineScript | null>(null);
  const [leverage, setLeverage] = useState(10);

  // Real-time price feed
  const [watchlistPrices, setWatchlistPrices] = useState<Record<string, { price: number; change: number }>>({
    'BTC/USD':  { price: 68250.00, change: 1.25 },
    'ETH/USD':  { price: 3495.20,  change: 1.85 },
    'SOL/USD':  { price: 147.50,   change: -3.80 },
    'NIFTY50':  { price: 22450.00, change: 0.85 },
    'RELIANCE': { price: 2860.40,  change: 1.15 },
    'XAU/USD':  { price: 2295.50,  change: 0.12 },
    'EUR/USD':  { price: 1.0842,   change: 0.05 },
    'GBP/USD':  { price: 1.2645,   change: -0.08 },
    'USD/JPY':  { price: 157.25,   change: 0.22 },
  });

  // Generate Candles for visible symbols
  useEffect(() => {
    const syms = Array.from(new Set(chartStates.slice(0, chartsCount).map(s => s.symbol)));
    setCandlesMap(prev => {
      const next = { ...prev };
      let changed = false;
      for (const sym of syms) {
        if (!next[sym]) {
          next[sym] = generateMockData(sym);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [chartStates, chartsCount]);

  // Handle active symbol change -> reset replay pointer
  useEffect(() => {
    const c = candlesMap[selectedSymbol];
    if (c) setReplayIndex(Math.floor(c.length * 0.6));
    setBacktestReport(null);
    setReplayPlaying(false);
  }, [selectedSymbol, candlesMap]);

  // Load pine script from local storage
  useEffect(() => {
    const loadScript = () => {
      const code = localStorage.getItem('active_compiled_pine_code');
      if (code && candles.length > 0) {
        const res = compilePineScript(code, candles);
        if (!res.error) {
          setCompiledPine(res);
          toast.success(`Loaded Pine script: ${res.name}`);
        }
      }
    };
    loadScript();
    window.addEventListener('storage', loadScript);
    return () => window.removeEventListener('storage', loadScript);
  }, [candles]);

  // Live prices ticker feed simulation
  useEffect(() => {
    const id = setInterval(() => {
      setWatchlistPrices(prev => {
        const next = { ...prev };
        for (const sym of Object.keys(next)) {
          const isForex = sym.includes('/') && !sym.includes('BTC') && !sym.includes('ETH') && !sym.includes('SOL');
          const isCrypto = sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL');
          const v = isCrypto ? 0.0012 : isForex ? 0.00008 : 0.0007;
          const dir = Math.random() - 0.495;
          const decimals = isForex ? 4 : 2;
          next[sym] = {
            price: parseFloat((next[sym].price * (1 + dir * v)).toFixed(decimals)),
            change: parseFloat((next[sym].change + dir * 0.15).toFixed(2))
          };
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // Alert Checker ticker
  const currentPrice = useMemo(() => {
    if (replayActive && candles.length > 0) {
      return candles[Math.min(replayIndex, candles.length - 1)]?.close ?? 100;
    }
    return watchlistPrices[selectedSymbol]?.price ?? 100;
  }, [selectedSymbol, watchlistPrices, replayActive, replayIndex, candles]);

  useEffect(() => {
    if (!currentPrice || alerts.length === 0) return;
    const crossedAlerts = alerts.filter(
      (al) => (al.type === 'above' && currentPrice >= al.price) || (al.type === 'below' && currentPrice <= al.price)
    );
    if (crossedAlerts.length > 0) {
      crossedAlerts.forEach((al) => {
        toast.success(`🚨 Alert Triggered: ${selectedSymbol} crossed ${al.type} ${al.price}`, { duration: 5000 });
      });
      const crossedIds = new Set(crossedAlerts.map(a => a.id));
      setAlerts(prev => prev.filter(a => !crossedIds.has(a.id)));
    }
  }, [currentPrice, alerts, selectedSymbol]);

  // Simulation step on replay index change
  useEffect(() => {
    if (!replayActive || !candles.length) return;
    const c = candles[Math.min(replayIndex, candles.length - 1)];
    if (!c) return;
    setSimAccount(prev => {
      const res = processSimulationTick(c, prev, simPosition, simOrders, leverage, 0.0005, 0.001);
      if (res.filledTrades.length > 0) {
        setSimTrades(trades => [...res.filledTrades, ...trades]);
        toast.success('Simulation order filled!');
      }
      setSimPosition(res.nextPosition);
      setSimOrders(res.nextOrders);
      return res.nextAccount;
    });
  }, [replayIndex, replayActive, candles, leverage]);

  // Playback timer for replay
  useEffect(() => {
    if (!replayPlaying || !replayActive) return;
    const interval = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= candles.length - 1) {
          setReplayPlaying(false);
          toast.success('Simulation replay complete!');
          return prev;
        }
        return prev + 1;
      });
    }, replaySpeed);
    return () => clearInterval(interval);
  }, [replayPlaying, replayActive, replaySpeed, candles]);

  // Global keyframe shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        if (expandedIdx !== null) { setExpandedIdx(null); return; }
        if (isWorkspaceFS) { setIsWorkspaceFS(false); return; }
      }
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsWorkspaceFS(prev => !prev);
      }
      if (!replayActive) return;
      if (e.key === ' ') {
        e.preventDefault();
        setReplayPlaying(prev => !prev);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setReplayIndex(prev => Math.min(prev + 1, candles.length - 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setReplayIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [replayActive, candles, isWorkspaceFS, expandedIdx]);

  // Theme Toggler
  const handleToggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('light', next === 'light');
      localStorage.setItem('atlas_theme', next);
      return next;
    });
  }, []);

  // Save / restore workspace
  const handleSaveWorkspace = useCallback(() => {
    const data = {
      chartsCount,
      chartStates,
      chartMode,
      theme,
      linkSymbols,
      linkTimeframes,
      linkIndicators,
      linkZoom,
      linkDrawings,
      gridSplitX,
      gridSplitY1,
      gridSplitY2,
      simAccount
    };
    localStorage.setItem('atlas_workspace', JSON.stringify(data));
    toast.success('Workspace saved to local storage!');
  }, [
    chartsCount, chartStates, chartMode, theme,
    linkSymbols, linkTimeframes, linkIndicators,
    linkZoom, linkDrawings, gridSplitX, gridSplitY1, gridSplitY2, simAccount
  ]);

  const handleRestoreWorkspace = useCallback(() => {
    const raw = localStorage.getItem('atlas_workspace');
    if (!raw) {
      toast.info('No saved workspace configurations found.');
      return;
    }
    try {
      const ws = JSON.parse(raw);
      if (ws.chartsCount) setChartsCount(ws.chartsCount);
      if (ws.chartStates) setChartStates(ws.chartStates);
      if (ws.chartMode) setChartMode(ws.chartMode);
      if (ws.theme) {
        setTheme(ws.theme);
        document.documentElement.classList.toggle('light', ws.theme === 'light');
      }
      if (ws.linkSymbols !== undefined) setLinkSymbols(ws.linkSymbols);
      if (ws.linkTimeframes !== undefined) setLinkTimeframes(ws.linkTimeframes);
      if (ws.linkIndicators !== undefined) setLinkIndicators(ws.linkIndicators);
      if (ws.linkZoom !== undefined) setLinkZoom(ws.linkZoom);
      if (ws.linkDrawings !== undefined) setLinkDrawings(ws.linkDrawings);
      if (ws.gridSplitX !== undefined) setGridSplitX(ws.gridSplitX);
      if (ws.gridSplitY1 !== undefined) setGridSplitY1(ws.gridSplitY1);
      if (ws.gridSplitY2 !== undefined) setGridSplitY2(ws.gridSplitY2);
      if (ws.simAccount) setSimAccount(ws.simAccount);
      toast.success('Workspace configurations restored!');
    } catch (e) {
      toast.error('Could not restore workspace.');
    }
  }, []);

  // Sync restore on mount
  useEffect(() => {
    const t = localStorage.getItem('atlas_theme') as 'dark' | 'light' | null;
    if (t) {
      setTheme(t);
      document.documentElement.classList.toggle('light', t === 'light');
    }
    const wsRaw = localStorage.getItem('atlas_workspace');
    if (wsRaw) {
      try {
        const ws = JSON.parse(wsRaw);
        if (ws.simAccount) setSimAccount(ws.simAccount);
      } catch (e) {}
    }
  }, []);

  // Update specific attributes on chart cell state
  const updateChartCellState = useCallback((cellIdx: number, key: keyof ChartCellState, value: any) => {
    setChartStates(prev => prev.map((state, idx) => {
      if (idx === cellIdx) {
        return { ...state, [key]: value };
      }
      // If synchronization checks are active, apply changes across all cells
      if (key === 'symbol' && linkSymbols) {
        return { ...state, symbol: value };
      }
      if (key === 'timeframe' && linkTimeframes) {
        return { ...state, timeframe: value };
      }
      if (key === 'activeIndicators' && linkIndicators) {
        return { ...state, activeIndicators: value };
      }
      if (key === 'drawings' && linkDrawings && state.symbol === prev[cellIdx].symbol) {
        return { ...state, drawings: value };
      }
      return state;
    }));
  }, [linkSymbols, linkTimeframes, linkIndicators, linkDrawings]);

  // Set active indicators
  const handleToggleIndicator = useCallback((ind: string) => {
    const nextIndicators = activeIndicators.includes(ind)
      ? activeIndicators.filter((i) => i !== ind)
      : [...activeIndicators, ind];
    updateChartCellState(activeChartIdx, 'activeIndicators', nextIndicators);
  }, [activeIndicators, activeChartIdx, updateChartCellState]);

  // Hoisted zoom and scroll handlers
  const handleZoomCountChange = useCallback((cellIdx: number, count: number) => {
    setChartStates(prev => prev.map((state, idx) => {
      if (idx === cellIdx) return { ...state, visibleCount: count };
      if (linkZoom) return { ...state, visibleCount: count };
      return state;
    }));
  }, [linkZoom]);

  const handleScrollOffsetChange = useCallback((cellIdx: number, offset: number) => {
    setChartStates(prev => prev.map((state, idx) => {
      if (idx === cellIdx) return { ...state, scrollIndex: offset };
      if (linkZoom) return { ...state, scrollIndex: offset };
      return state;
    }));
  }, [linkZoom]);

  // Simulated Trading events handlers
  const handleClosePosition = useCallback(() => {
    if (!simPosition || !candles.length) return;
    const price = candles[Math.min(replayIndex, candles.length - 1)].close;
    setSimAccount(prev => {
      const commission = price * simPosition.qty * 0.0005;
      const pnl = (simPosition.isLong ? price - simPosition.avgEntryPrice : simPosition.avgEntryPrice - price) * simPosition.qty - commission;
      const closedTrade: Trade = {
        id: Math.random().toString(36).slice(4),
        type: simPosition.isLong ? 'SELL' : 'BUY',
        entryPrice: simPosition.avgEntryPrice,
        exitPrice: price,
        entryTime: candles[replayIndex]?.time ?? '',
        exitTime: candles[replayIndex]?.time ?? '',
        pnl,
        pnlPercent: ((price - simPosition.avgEntryPrice) / simPosition.avgEntryPrice) * 100 * (simPosition.isLong ? 1 : -1),
        status: 'CLOSED'
      };
      setSimTrades(trades => [closedTrade, ...trades]);
      toast.success('Leveled position closed.');
      setSimPosition(null);
      const nextBalance = parseFloat((prev.balance + pnl).toFixed(2));
      return {
        ...prev,
        balance: nextBalance,
        equity: nextBalance,
        freeMargin: nextBalance,
        marginUsed: 0,
        unrealizedPnL: 0,
        realizedPnL: parseFloat((prev.realizedPnL + pnl).toFixed(2))
      };
    });
  }, [simPosition, candles, replayIndex]);

  const handleAddSimOrder = useCallback((ord: SimOrder) => {
    if (ord.mode === 'market') {
      const commission = ord.price * ord.qty * 0.0005;
      setSimAccount(prev => {
        setSimPosition({
          symbol: ord.symbol,
          qty: ord.qty,
          avgEntryPrice: ord.price,
          isLong: ord.type === 'BUY',
          slPrice: orderLines.hasBracket ? orderLines.slPrice : null,
          tpPrice: orderLines.hasBracket ? orderLines.tpPrice : null,
          unrealizedPnL: 0
        });
        const nextBalance = parseFloat((prev.balance - commission).toFixed(2));
        return {
          ...prev,
          balance: nextBalance,
          equity: nextBalance,
          freeMargin: nextBalance
        };
      });
      toast.success(`Market ${ord.type} Order executed for ${ord.qty} units.`);
    } else {
      setSimOrders(prev => [...prev, ord]);
      toast.success(`Pending ${ord.mode.toUpperCase()} order queued.`);
    }
  }, [orderLines]);

  const handleReversePosition = useCallback(() => {
    if (!simPosition || !candles.length) return;
    const price = candles[Math.min(replayIndex, candles.length - 1)].close;
    const { qty, isLong } = simPosition;
    handleClosePosition();
    setTimeout(() => {
      handleAddSimOrder({
        id: Math.random().toString(36).slice(4),
        symbol: selectedSymbol,
        type: isLong ? 'SELL' : 'BUY',
        mode: 'market',
        qty,
        price,
        stopPrice: null
      });
    }, 100);
  }, [simPosition, candles, replayIndex, handleClosePosition, handleAddSimOrder, selectedSymbol]);

  // Strategy Execution engine during bar replay playback ticks
  useEffect(() => {
    if (!replayActive || !activeStrategy || !candles.length || replayIndex < 2) return;
    const prev = candles[replayIndex - 1];
    const curr = candles[replayIndex];
    if (!prev || !curr) return;

    let buySignal = false;
    let sellSignal = false;

    if (activeStrategy === 'ema_crossover') {
      const prevEma20 = prev.ema20;
      const prevEma50 = prev.ema50;
      const currEma20 = curr.ema20;
      const currEma50 = curr.ema50;
      if (prevEma20 !== undefined && prevEma50 !== undefined && currEma20 !== undefined && currEma50 !== undefined) {
        if (prevEma20 <= prevEma50 && currEma20 > currEma50) buySignal = true;
        if (prevEma20 >= prevEma50 && currEma20 < currEma50) sellSignal = true;
      }
    } else if (activeStrategy === 'rsi_mean_reversion') {
      if (prev.rsi !== undefined && curr.rsi !== undefined) {
        if (prev.rsi < 30 && curr.rsi >= 30) buySignal = true;
        if (prev.rsi > 70 && curr.rsi <= 70) sellSignal = true;
      }
    } else if (activeStrategy === 'macd_momentum') {
      if (prev.macd && curr.macd) {
        const prevHist = prev.macd.histogram;
        const currHist = curr.macd.histogram;
        if (prevHist <= 0 && currHist > 0) buySignal = true;
        if (prevHist >= 0 && currHist < 0) sellSignal = true;
      }
    }

    if (buySignal) {
      // Close Short position if exists
      if (simPosition && !simPosition.isLong) {
        handleClosePosition();
      }
      // Enter Long position if no position or closed
      if (!simPosition || !simPosition.isLong) {
        handleAddSimOrder({
          id: Math.random().toString(36).substring(4, 9),
          symbol: selectedSymbol,
          type: 'BUY',
          mode: 'market',
          qty: 0.1,
          price: curr.close,
          stopPrice: null
        });
      }
    } else if (sellSignal) {
      // Close Long position if exists
      if (simPosition && simPosition.isLong) {
        handleClosePosition();
      }
      // Enter Short position if no position or closed
      if (!simPosition || simPosition.isLong) {
        handleAddSimOrder({
          id: Math.random().toString(36).substring(4, 9),
          symbol: selectedSymbol,
          type: 'SELL',
          mode: 'market',
          qty: 0.1,
          price: curr.close,
          stopPrice: null
        });
      }
    }
  }, [replayIndex, replayActive, activeStrategy, candles, selectedSymbol, simPosition, handleClosePosition, handleAddSimOrder]);

  const handleRunBacktest = useCallback((strategyId: 'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum') => {
    if (candles.length === 0) {
      toast.error('No market candles loaded to backtest.');
      return;
    }
    toast.info('Simulating strategy backtest...');
    setBacktestReport(runBacktest(candles, strategyId));
    setIsBottomPanelOpen(true);
    toast.success('Backtest complete!');
  }, [candles]);

  const handleRunBacktestAdvanced = useCallback((config: {
    strategy: 'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum';
    capital: number;
    commission: number;
    slippage: number;
    startDate: string;
    endDate: string;
  }) => {
    if (candles.length === 0) {
      toast.error('No market candles loaded to backtest.');
      return;
    }

    // Switch to simulation mode if in live mode
    setChartMode('simulation');
    
    // Reset simulation positions and orders
    setSimPosition(null);
    setSimOrders([]);
    setSimTrades([]);
    setSimAccount({
      balance: config.capital,
      equity: config.capital,
      marginUsed: 0,
      freeMargin: config.capital,
      unrealizedPnL: 0,
      realizedPnL: 0,
      initialBalance: config.capital
    });

    // Find the closest candle index matching the start date
    let startIdx = 10;
    if (config.startDate) {
      const idx = candles.findIndex(c => new Date(c.time) >= new Date(config.startDate));
      if (idx !== -1) startIdx = Math.max(10, idx); // ensure EMA has at least some context
    }

    // Initialize simulation replay
    setReplayIndex(startIdx);
    setReplayActive(true);
    setReplaySpeed(200); // 200ms tick speed (Fast play back!)
    setReplayPlaying(true);
    setActiveStrategy(config.strategy);
    setIsBottomPanelOpen(true); // Open the workstation bottom panel

    toast.info(`Starting bar replay backtest for strategy: ${config.strategy.replace('_', ' ').toUpperCase()}`);
  }, [candles]);

  const handlePlaceOrder = useCallback((order: { type: 'BUY' | 'SELL'; qty: number; price: number }) => {
    const active = portfolio.find(p => p.symbol === selectedSymbol);
    if (order.type === 'BUY') {
      if (active) {
        const totalCost = active.qty * active.avgPrice + order.qty * order.price;
        const totalQty = active.qty + order.qty;
        setPortfolio(prev => prev.map(x => x.symbol === selectedSymbol ? { ...x, qty: totalQty, avgPrice: parseFloat((totalCost / totalQty).toFixed(2)) } : x));
      } else {
        setPortfolio(prev => [...prev, { symbol: selectedSymbol, qty: order.qty, avgPrice: order.price }]);
      }
      toast.success(`Bought ${order.qty} of ${selectedSymbol} at $${order.price}`);
    } else {
      if (!active || active.qty < order.qty) {
        toast.error('Insufficient portfolio holdings.');
        return;
      }
      const remainingQty = active.qty - order.qty;
      if (remainingQty === 0) {
        setPortfolio(prev => prev.filter(x => x.symbol !== selectedSymbol));
      } else {
        setPortfolio(prev => prev.map(x => x.symbol === selectedSymbol ? { ...x, qty: remainingQty } : x));
      }
      const pnl = (order.price - active.avgPrice) * order.qty;
      toast.success(`Sold ${order.qty} of ${selectedSymbol}. P&L: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`);
    }
  }, [portfolio, selectedSymbol]);

  const handleAddAlert = useCallback((price: number, type: 'above' | 'below') => {
    setAlerts(prev => [...prev, { id: Math.random().toString(36).slice(4), price, type }]);
    toast.success(`Price alert registered at ${price}`);
  }, []);

  const handleRemoveAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleRemoveSimOrder = useCallback((id: string) => {
    setSimOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  const handlePositionLineChange = useCallback((slPrice: number | null, tpPrice: number | null) => {
    if (simPosition) {
      setSimPosition(prev => prev ? { ...prev, slPrice, tpPrice } : null);
    }
  }, [simPosition]);

  const handleCloseAll = useCallback(() => {
    handleClosePosition();
    setSimOrders([]);
  }, [handleClosePosition]);

  // Shared props bound to SimulationChart
  const simChartSharedProps = {
    trades: backtestReport?.trades ?? [],
    replayActive,
    replayIndex,
    orderLines,
    onOrderLineChange: (lines: Partial<typeof orderLines>) => setOrderLines(o => ({ ...o, ...lines })),
    pinePlots: compiledPine?.plots,
    pineShapes: compiledPine?.shapes,
    position: simPosition,
    onPositionLineChange: handlePositionLineChange,
    isReplaySelecting,
    onSelectReplayCandle: (cIdx: number) => {
      setReplayIndex(cIdx);
      setIsReplaySelecting(false);
      toast.info(`Simulation starting from: ${candles[cIdx]?.time}`);
    },
    theme,
    isLocked, isHidden, isMagnet, clearDrawingsTrigger,
  };

  const renderChart = (cellState: ChartCellState, idx: number) => {
    const cellCandles = candlesMap[cellState.symbol] ?? candles;
    const isActive = idx === activeChartIdx;
    const cellLivePrice = watchlistPrices[cellState.symbol]?.price ?? 100;

    if (chartMode === 'live') {
      return (
        <div className="w-full h-full">
          <TradingViewWidget symbol={cellState.symbol} containerId={`tv_cell_${idx}`} />
        </div>
      );
    }

    return <SimulationChart
        candles={cellCandles}
        activeIndicators={cellState.activeIndicators}
        chartType={cellState.chartType}
        activeTool={isActive ? activeTool : 'cursor'}
        setActiveTool={setActiveTool}
        visibleCount={cellState.visibleCount}
        onVisibleCountChange={count => handleZoomCountChange(idx, count)}
        scrollIndex={cellState.scrollIndex}
        onScrollIndexChange={offset => handleScrollOffsetChange(idx, offset)}
        drawings={cellState.drawings}
        onDrawingsChange={draws => updateChartCellState(idx, 'drawings', draws)}
        {...simChartSharedProps}
      />;
  };

  // Grid resizer handler listener
  const startGridResize = (
    e: React.MouseEvent,
    type: 'vertical' | 'horizontal-left' | 'horizontal-right'
  ) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startSplitX = gridSplitX;
    const startSplitY1 = gridSplitY1;
    const startSplitY2 = gridSplitY2;

    const container = gridContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (type === 'vertical') {
        const deltaX = moveEvent.clientX - startX;
        const deltaPct = (deltaX / rect.width) * 100;
        setGridSplitX(Math.max(20, Math.min(80, startSplitX + deltaPct)));
      } else if (type === 'horizontal-left') {
        const deltaY = moveEvent.clientY - startY;
        const deltaPct = (deltaY / rect.height) * 100;
        setGridSplitY1(Math.max(20, Math.min(80, startSplitY1 + deltaPct)));
      } else if (type === 'horizontal-right') {
        const deltaY = moveEvent.clientY - startY;
        const deltaPct = (deltaY / rect.height) * 100;
        setGridSplitY2(Math.max(20, Math.min(80, startSplitY2 + deltaPct)));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Render Resizable Grid view
  const renderChartsGrid = () => {
    const wrapCell = (idx: number) => {
      const cell = chartStates[idx];
      const isActive = idx === activeChartIdx;
      const cellLivePrice = watchlistPrices[cell.symbol]?.price ?? 100;
      return (
        <div
          key={idx}
          onClick={() => setActiveChartIdx(idx)}
          className={`w-full h-full relative overflow-hidden flex flex-col rounded-xl border transition-all duration-200 group bg-[#0e1017] shadow-xl ${
            isActive
              ? 'border-yellow-500/70 shadow-[0_0_15px_rgba(234,179,8,0.06)]'
              : 'border-[#21262d] hover:border-[#30363d]'
          }`}
        >
          {/* Top floating cell header details */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
            {/* Expand chart button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedIdx(idx);
              }}
              className="pointer-events-auto h-6 w-6 flex items-center justify-center rounded-lg bg-[#0d0f14]/85 border border-[#1e222d] text-gray-500 hover:text-yellow-400 hover:border-yellow-500/40 backdrop-blur transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              title="Maximize chart"
            >
              <Expand className="h-3 w-3" />
            </button>

            {/* Symbol name indicator badge */}
            <div className="flex items-center gap-1.5 bg-[#0d0f14]/85 backdrop-blur border border-[#1e222d] rounded-lg px-2.5 py-1 font-mono text-[9px] text-gray-400 font-extrabold shadow-lg">
              <span className={isActive ? 'text-yellow-400' : ''}>{cell.symbol}</span>
              <span className="text-gray-600">·</span>
              <span>{cell.timeframe}</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            {renderChart(cell, idx)}

            {/* Floating tool overlays for the active cell */}
            {isActive && !isWorkspaceFS && (
              <>
                <ChartToolbar
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  isLocked={isLocked}
                  setIsLocked={setIsLocked}
                  isHidden={isHidden}
                  setIsHidden={setIsHidden}
                  isMagnet={isMagnet}
                  setIsMagnet={setIsMagnet}
                  onClearDrawings={() => setClearDrawingsTrigger(prev => prev + 1)}
                />
                <QuickTradePanel
                  symbol={cell.symbol}
                  currentPrice={cellLivePrice}
                  chartMode={chartMode}
                  leverage={leverage}
                  setLeverage={setLeverage}
                  simPosition={simPosition}
                  simAccount={simAccount}
                  onAddSimOrder={handleAddSimOrder}
                  onClosePosition={handleClosePosition}
                  onReversePosition={handleReversePosition}
                  orderLines={orderLines}
                  onOrderLinesChange={setOrderLines}
                />
              </>
            )}
          </div>
        </div>
      );
    };

    if (chartsCount === 1) {
      return (
        <div className="w-full h-full p-2">{wrapCell(0)}</div>
      );
    }

    if (chartsCount === 2) {
      return (
        <div className="w-full h-full flex p-2 gap-1.5 relative select-none">
          <div style={{ width: `${gridSplitX}%` }} className="h-full min-w-[20%]">
            {wrapCell(0)}
          </div>
          <div
            onMouseDown={(e) => startGridResize(e, 'vertical')}
            className="w-[6px] hover:bg-yellow-500/50 cursor-col-resize transition-all shrink-0 z-20 relative flex items-center justify-center"
          >
            <div className="h-8 w-[2px] bg-gray-800 rounded opacity-60" />
          </div>
          <div style={{ width: `${100 - gridSplitX}%` }} className="h-full min-w-[20%]">
            {wrapCell(1)}
          </div>
        </div>
      );
    }

    if (chartsCount === 3) {
      return (
        <div className="w-full h-full flex p-2 gap-1.5 relative select-none">
          <div style={{ width: `${gridSplitX}%` }} className="h-full min-w-[20%]">
            {wrapCell(0)}
          </div>
          <div
            onMouseDown={(e) => startGridResize(e, 'vertical')}
            className="w-[6px] hover:bg-yellow-500/50 cursor-col-resize transition-all shrink-0 z-20 relative flex items-center justify-center"
          >
            <div className="h-8 w-[2px] bg-gray-800 rounded opacity-60" />
          </div>
          <div style={{ width: `${100 - gridSplitX}%` }} className="h-full min-w-[20%] flex flex-col gap-1.5">
            <div style={{ height: `${gridSplitY1}%` }} className="w-full min-h-[20%]">
              {wrapCell(1)}
            </div>
            <div
              onMouseDown={(e) => startGridResize(e, 'horizontal-right')}
              className="h-[6px] hover:bg-yellow-500/50 cursor-row-resize transition-all shrink-0 z-20 relative flex flex-col items-center justify-center"
            >
              <div className="w-8 h-[2px] bg-gray-800 rounded opacity-60" />
            </div>
            <div style={{ height: `${100 - gridSplitY1}%` }} className="w-full min-h-[20%]">
              {wrapCell(2)}
            </div>
          </div>
        </div>
      );
    }

    if (chartsCount === 4) {
      return (
        <div className="w-full h-full flex p-2 gap-1.5 relative select-none">
          {/* Left Column split */}
          <div style={{ width: `${gridSplitX}%` }} className="h-full min-w-[20%] flex flex-col gap-1.5">
            <div style={{ height: `${gridSplitY1}%` }} className="w-full min-h-[20%]">
              {wrapCell(0)}
            </div>
            <div
              onMouseDown={(e) => startGridResize(e, 'horizontal-left')}
              className="h-[6px] hover:bg-yellow-500/50 cursor-row-resize transition-all shrink-0 z-20 relative flex flex-col items-center justify-center"
            >
              <div className="w-8 h-[2px] bg-gray-800 rounded opacity-60" />
            </div>
            <div style={{ height: `${100 - gridSplitY1}%` }} className="w-full min-h-[20%]">
              {wrapCell(2)}
            </div>
          </div>

          <div
            onMouseDown={(e) => startGridResize(e, 'vertical')}
            className="w-[6px] hover:bg-yellow-500/50 cursor-col-resize transition-all shrink-0 z-20 relative flex items-center justify-center"
          >
            <div className="h-8 w-[2px] bg-gray-800 rounded opacity-60" />
          </div>

          {/* Right Column split */}
          <div style={{ width: `${100 - gridSplitX}%` }} className="h-full min-w-[20%] flex flex-col gap-1.5">
            <div style={{ height: `${gridSplitY2}%` }} className="w-full min-h-[20%]">
              {wrapCell(1)}
            </div>
            <div
              onMouseDown={(e) => startGridResize(e, 'horizontal-right')}
              className="h-[6px] hover:bg-yellow-500/50 cursor-row-resize transition-all shrink-0 z-20 relative flex flex-col items-center justify-center"
            >
              <div className="w-8 h-[2px] bg-gray-800 rounded opacity-60" />
            </div>
            <div style={{ height: `${100 - gridSplitY2}%` }} className="w-full min-h-[20%]">
              {wrapCell(3)}
            </div>
          </div>
        </div>
      );
    }

    if (chartsCount === 6) {
      return (
        <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-2 p-2 select-none">
          {Array.from({ length: 6 }).map((_, i) => wrapCell(i))}
        </div>
      );
    }

    if (chartsCount === 8) {
      return (
        <div className="w-full h-full grid grid-cols-4 grid-rows-2 gap-2 p-2 select-none">
          {Array.from({ length: 8 }).map((_, i) => wrapCell(i))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#050608] text-gray-100 overflow-hidden font-sans">
      <Toaster theme="dark" position="top-right" closeButton richColors />

      <BacktestConfigModal
        isOpen={isBacktestModalOpen}
        onClose={() => setIsBacktestModalOpen(false)}
        onRunBacktest={handleRunBacktestAdvanced}
      />

      {/* Expanded Chart Fullscreen Modal overlay */}
      {expandedIdx !== null && (() => {
        const ec = chartStates[expandedIdx];
        return (
          <div className="fixed inset-0 z-[200] bg-[#07080a] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal navbar */}
            <div className="h-11 shrink-0 flex items-center justify-between px-4 border-b border-[#1e222d] bg-[#0b0c10]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-yellow-400 font-black font-mono text-sm tracking-wide">{ec.symbol}</span>
                <span className="text-gray-600">·</span>
                <span className="text-gray-400 font-mono text-xs">{ec.timeframe}</span>
                <span className="text-[9px] text-gray-500 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded font-black uppercase tracking-wider">MAXIMIZED</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-550 font-mono">Press ESC to exit</span>
                <button
                  onClick={() => setExpandedIdx(null)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-gray-900 hover:bg-red-500/10 border border-gray-800 hover:border-red-500/30 text-gray-500 hover:text-red-400 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Expanded Chart content */}
            <div className="flex-1 min-h-0 relative">
              {renderChart(ec, expandedIdx)}
            </div>
          </div>
        );
      })()}

      {/* Floating Top Navbar (hide if workspace fullscreen) */}
      {!isWorkspaceFS && (
        <TopNavBar
          currentSymbol={selectedSymbol}
          onSymbolSelect={sym => updateChartCellState(activeChartIdx, 'symbol', sym)}
          chartMode={chartMode}
          setChartMode={setChartMode}
          timeframe={timeframe}
          setTimeframe={tf => updateChartCellState(activeChartIdx, 'timeframe', tf)}
          chartType={chartType}
          setChartType={type => updateChartCellState(activeChartIdx, 'chartType', type)}
          activeIndicators={activeIndicators}
          toggleIndicator={handleToggleIndicator}
          replayActive={replayActive}
          setReplayActive={setReplayActive}
          replayPlaying={replayPlaying}
          onReplayPlayPause={() => setReplayPlaying(p => !p)}
          onReplayStep={() => setReplayIndex(p => Math.min(p + 1, candles.length - 1))}
          replaySpeed={replaySpeed}
          setReplaySpeed={setReplaySpeed}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          user={user}
          initialStocks={initialStocks}
          chartsCount={chartsCount}
          setChartsCount={setChartsCount}
          linkSymbols={linkSymbols}
          setLinkSymbols={setLinkSymbols}
          linkTimeframes={linkTimeframes}
          setLinkTimeframes={setLinkTimeframes}
          linkIndicators={linkIndicators}
          setLinkIndicators={setLinkIndicators}
          linkZoom={linkZoom}
          setLinkZoom={setLinkZoom}
          linkDrawings={linkDrawings}
          setLinkDrawings={setLinkDrawings}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isLocked={isLocked}
          setIsLocked={setIsLocked}
          isHidden={isHidden}
          setIsHidden={setIsHidden}
          isMagnet={isMagnet}
          setIsMagnet={setIsMagnet}
          onClearDrawings={() => setClearDrawingsTrigger(prev => prev + 1)}
          alerts={alerts}
          onRemoveAlert={handleRemoveAlert}
          onSaveWorkspace={handleSaveWorkspace}
          onRestoreWorkspace={handleRestoreWorkspace}
          onOpenBacktestModal={() => setIsBacktestModalOpen(true)}
          isRightPanelOpen={isRightPanelOpen}
          setIsRightPanelOpen={setIsRightPanelOpen}
        />
      )}

      {/* Main Workspace layout row */}
      <div className={`flex overflow-hidden relative ${isWorkspaceFS ? 'fixed inset-0 z-[100] h-screen w-screen' : 'flex-1 h-[calc(100vh-56px)]'}`}>

        {/* Floating expand/collapse handle when sidebar collapsed */}
        {isSidebarCollapsed && !isWorkspaceFS && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute left-3 top-4 h-8 w-8 rounded-full bg-[#131722]/85 hover:bg-[#1c2030] text-gray-500 hover:text-white border border-[#1e222d] shadow-xl flex items-center justify-center cursor-pointer transition-all z-30 backdrop-blur"
            title="Expand Sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Left Consolidated Sidebar */}
        {!isWorkspaceFS && (
          <ConsolidatedSidebar
            currentSymbol={selectedSymbol}
            currentPrice={currentPrice}
            portfolio={portfolio}
            onPlaceOrder={handlePlaceOrder}
            alerts={alerts}
            onAddAlert={handleAddAlert}
            onRemoveAlert={handleRemoveAlert}
            orderLines={orderLines}
            onOrderLinesChange={setOrderLines}
            onSymbolSelect={sym => updateChartCellState(activeChartIdx, 'symbol', sym)}
            watchlistPrices={watchlistPrices}
            simAccount={simAccount}
            simPosition={simPosition}
            simOrders={simOrders}
            onAddSimOrder={handleAddSimOrder}
            onRemoveSimOrder={handleRemoveSimOrder}
            onClosePosition={handleClosePosition}
            onReversePosition={handleReversePosition}
            onCloseAll={handleCloseAll}
            leverage={leverage}
            setLeverage={setLeverage}
            sidebarWidth={sidebarWidth}
            setSidebarWidth={setSidebarWidth}
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            onRunBacktest={handleRunBacktest}
            onToggleBottomPanel={setIsBottomPanelOpen}
          />
        )}

        {/* Central Chart grid Workspace area */}
        <main ref={gridContainerRef} className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#07080a] relative">
          
          {/* Controls menu strip */}
          <div className="h-8 shrink-0 border-b border-[#1e222d] flex items-center justify-between px-4 bg-[#0a0c10]/40">
            <div className="flex items-center gap-4">
              <span className="text-[9px] uppercase font-black tracking-widest text-gray-600">
                WORKSTATION GRID
              </span>
              <div className="w-[1px] h-3 bg-gray-800" />
              <div className="flex gap-3 text-[10px] text-gray-500">
                <span>Active cell: <span className="text-yellow-450 font-bold font-mono">#{activeChartIdx + 1}</span></span>
                <span>•</span>
                <span>Symbol: <span className="text-white font-bold font-mono">{selectedSymbol}</span></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen workspace toggle */}
              <button
                onClick={() => setIsWorkspaceFS(!isWorkspaceFS)}
                className={`h-5 w-5 flex items-center justify-center rounded border transition-all cursor-pointer ${
                  isWorkspaceFS
                    ? 'bg-yellow-500 border-yellow-400 text-gray-950 shadow'
                    : 'bg-[#131722]/50 border-[#1e222d] text-gray-500 hover:text-white'
                }`}
                title={isWorkspaceFS ? 'Exit Fullscreen Workstation (F)' : 'Fullscreen Workstation (F)'}
              >
                {isWorkspaceFS ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Dynamic Grid Layout resizer */}
          <div className="flex-1 min-h-0 relative">
            {renderChartsGrid()}
          </div>

          {/* Floating simulation replay controls overlay */}
          {replayActive && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#0c0d12]/95 border border-[#1e222d] rounded-2xl px-5 py-2.5 flex items-center gap-3.5 shadow-2xl backdrop-blur-2xl z-40 select-none animate-in slide-in-from-bottom-5 duration-200">
              <button
                onClick={() => {
                  setIsReplaySelecting(!isReplaySelecting);
                  if (!isReplaySelecting) toast.info('Click on any candle to set simulation pointer.');
                }}
                className={`h-7 px-3 text-[10px] font-black rounded-lg cursor-pointer transition-all border ${
                  isReplaySelecting
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-[#1e222d] border-[#2a2e39] text-gray-300 hover:text-white'
                }`}
              >
                📍 Start Index
              </button>
              <button
                onClick={() => setReplayIndex(prev => Math.max(prev - 1, 0))}
                className="p-1.5 hover:bg-gray-800 text-gray-500 hover:text-white rounded-lg cursor-pointer transition-colors"
                title="Previous bar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setReplayPlaying(!replayPlaying)}
                className="h-8 w-8 flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-full cursor-pointer transition-colors shadow-lg"
                title="Play / Pause simulation"
              >
                {replayPlaying ? <Pause className="h-4 w-4 fill-gray-950" /> : <Play className="h-4 w-4 fill-gray-950" />}
              </button>
              <button
                onClick={() => setReplayIndex(prev => Math.min(prev + 1, candles.length - 1))}
                className="p-1.5 hover:bg-gray-800 text-gray-500 hover:text-white rounded-lg cursor-pointer transition-colors"
                title="Next bar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="w-[1px] h-4 bg-gray-800" />
              <select
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(Number(e.target.value))}
                className="bg-[#1e222d] border border-[#2a2e39] text-[10px] font-bold text-gray-300 h-7 px-2 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="2000">1x Speed</option>
                <option value="1000">2x Speed</option>
                <option value="500">5x Speed</option>
                <option value="200">10x Speed</option>
              </select>
              <button
                onClick={() => {
                  setReplayActive(false);
                  setReplayPlaying(false);
                }}
                className="p-1.5 hover:bg-red-500/10 text-gray-600 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                title="Exit simulation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Strategy / Journal output Bottom panel */}
          <BottomPanel
            currentSymbol={selectedSymbol}
            onRunBacktest={handleRunBacktest}
            backtestReport={backtestReport}
            isOpen={isBottomPanelOpen}
            onToggleOpen={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
            isReplayActive={replayActive}
            simTrades={simTrades}
            simAccount={simAccount}
            simPosition={simPosition}
            simOrders={simOrders}
            leverage={leverage}
            bottomPanelHeight={bottomPanelHeight}
            setBottomPanelHeight={setBottomPanelHeight}
          />
        </main>

        {/* Optional Right Widget Panel */}
        {isRightPanelOpen && !isWorkspaceFS && (
          <RightPanel
            currentSymbol={selectedSymbol}
            currentPrice={currentPrice}
            alerts={alerts}
            onRemoveAlert={handleRemoveAlert}
          />
        )}
      </div>
    </div>
  );
}
