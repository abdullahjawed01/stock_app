'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Candle, Trade } from '@/lib/simulationData';

interface DrawingObject {
  id: string;
  type: string;
  points: { time: string; price: number }[];
  style: {
    color: string;
    lineWidth: number;
    opacity: number;
    filled: boolean;
  };
  isLocked: boolean;
  isVisible: boolean;
}

interface SimulationChartProps {
  candles: Candle[];
  activeIndicators: string[];
  trades: Trade[];
  replayActive: boolean;
  replayIndex: number;
  chartType: string;
  orderLines?: {
    entryPrice: number;
    slPrice: number;
    tpPrice: number;
    hasBracket: boolean;
  };
  onOrderLineChange?: (lines: { entryPrice: number; slPrice: number; tpPrice: number }) => void;
  isReplaySelecting?: boolean;
  onSelectReplayCandle?: (index: number) => void;
  pinePlots?: Array<{ title: string; color: string; series: (number | null)[] }>;
  pineShapes?: Array<{ index: number; time: string; price: number; type: 'BUY' | 'SELL'; color: string }>;
  position?: { avgEntryPrice: number; slPrice: number | null; tpPrice: number | null; isLong: boolean; qty: number } | null;
  onPositionLineChange?: (slPrice: number | null, tpPrice: number | null) => void;
  theme?: string;

  // Hoisted state props for drawings, tools, magnet, visibility
  activeTool?: string;
  setActiveTool?: (tool: string) => void;
  isLocked?: boolean;
  isHidden?: boolean;
  isMagnet?: boolean;
  clearDrawingsTrigger?: number;

  // Zoom/scroll controls integration
  visibleCount?: number;
  onVisibleCountChange?: (val: number) => void;
  scrollIndex?: number;
  onScrollIndexChange?: (val: number) => void;
  drawings?: DrawingObject[];
  onDrawingsChange?: (val: DrawingObject[]) => void;
}

export default function SimulationChart({
  candles,
  activeIndicators,
  trades,
  replayActive,
  replayIndex,
  chartType,
  orderLines,
  onOrderLineChange,
  isReplaySelecting = false,
  onSelectReplayCandle,
  pinePlots,
  pineShapes,
  position,
  onPositionLineChange,
  theme = 'dark',

  activeTool = 'cursor',
  setActiveTool,
  isLocked = false,
  isHidden = false,
  isMagnet = false,
  clearDrawingsTrigger = 0,

  visibleCount: propVisibleCount,
  onVisibleCountChange,
  scrollIndex: propScrollIndex,
  onScrollIndexChange,
  drawings: propDrawings,
  onDrawingsChange,
}: SimulationChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 450 });

  // View parameters
  const [internalVisibleCount, setInternalVisibleCount] = useState<number>(80);
  const [internalScrollIndex, setInternalScrollIndex] = useState<number>(0);
  const [internalDrawings, setInternalDrawings] = useState<DrawingObject[]>([]);

  // Synchronize internal state with incoming props
  useEffect(() => {
    if (propVisibleCount !== undefined) {
      setInternalVisibleCount(propVisibleCount);
    }
  }, [propVisibleCount]);

  useEffect(() => {
    if (propScrollIndex !== undefined) {
      setInternalScrollIndex(propScrollIndex);
    }
  }, [propScrollIndex]);

  useEffect(() => {
    if (propDrawings !== undefined) {
      setInternalDrawings(propDrawings);
    }
  }, [propDrawings]);

  const visibleCount = propVisibleCount !== undefined ? propVisibleCount : internalVisibleCount;
  const scrollIndex = propScrollIndex !== undefined ? propScrollIndex : internalScrollIndex;
  const drawings = propDrawings !== undefined ? propDrawings : internalDrawings;

  const setVisibleCount = (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(visibleCount) : val;
    setInternalVisibleCount(next);
    if (onVisibleCountChange) onVisibleCountChange(next);
  };

  const setScrollIndex = (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(scrollIndex) : val;
    setInternalScrollIndex(next);
    if (onScrollIndexChange) onScrollIndexChange(next);
  };

  const setDrawings = (val: DrawingObject[] | ((prev: DrawingObject[]) => DrawingObject[])) => {
    const next = typeof val === 'function' ? val(drawings) : val;
    setInternalDrawings(next);
    if (onDrawingsChange) onDrawingsChange(next);
  };

  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [activeDragLine, setActiveDragLine] = useState<'entry' | 'sl' | 'tp' | 'position_sl' | 'position_tp' | null>(null);
  const [activeDrawing, setActiveDrawing] = useState<DrawingObject | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [dragDrawingId, setDragDrawingId] = useState<string | null>(null);
  const [dragAnchorIdx, setDragAnchorIdx] = useState<number | null>(null);
  const dragStartOffset = useRef<{ dx: number; dy: number }[]>([]);

  // Panning/Zooming references
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);

  // Sync dimensions with observer
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 450,
        });
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Slice historical candles based on replay state
  const visibleCandlesRaw = useMemo(() => {
    if (replayActive) {
      return candles.slice(0, replayIndex + 1);
    }
    return candles;
  }, [candles, replayActive, replayIndex]);

  const totalCount = visibleCandlesRaw.length;
  const sliceEnd = Math.max(0, totalCount - 1 - scrollIndex);
  const sliceStart = Math.max(0, sliceEnd - visibleCount + 1);

  // Reset scroll when candles change
  useEffect(() => {
    setScrollIndex(0);
  }, [candles]);

  // Handle Clear Drawings trigger
  useEffect(() => {
    if (clearDrawingsTrigger > 0) {
      setDrawings([]);
      localStorage.removeItem(`drawings_${candles[0]?.time ? 'main' : 'default'}`);
    }
  }, [clearDrawingsTrigger]);

  // Load/save drawings
  const activeSymbolKey = useMemo(() => {
    return candles[0]?.time ? `drawings_main` : `drawings_default`;
  }, [candles]);

  useEffect(() => {
    const saved = localStorage.getItem(activeSymbolKey);
    if (saved) {
      try {
        setDrawings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse drawings', e);
      }
    } else {
      setDrawings([]);
    }
  }, [activeSymbolKey]);

  const saveDrawingsToStorage = (updated: DrawingObject[]) => {
    localStorage.setItem(activeSymbolKey, JSON.stringify(updated));
  };

  // ----------------------------------------------------
  // ALTERNATIVE CHART CALCULATIONS
  // ----------------------------------------------------

  // 1. Heikin Ashi
  const heikinAshiCandles = useMemo(() => {
    if (visibleCandlesRaw.length === 0) return [];
    const ha: Candle[] = [];
    let prevOpen = visibleCandlesRaw[0].open;
    let prevClose = visibleCandlesRaw[0].close;

    for (let i = 0; i < visibleCandlesRaw.length; i++) {
      const c = visibleCandlesRaw[i];
      const close = (c.open + c.high + c.low + c.close) / 4;
      const open = (prevOpen + prevClose) / 2;
      const high = Math.max(c.high, open, close);
      const low = Math.min(c.low, open, close);

      ha.push({
        ...c,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
      });

      prevOpen = open;
      prevClose = close;
    }
    return ha;
  }, [visibleCandlesRaw]);

  // 2. Renko Bricks
  const renkoBricks = useMemo(() => {
    if (visibleCandlesRaw.length === 0) return [];
    const bricks: Candle[] = [];
    // Dynamic brick size based on volatility/price scale
    const firstClose = visibleCandlesRaw[0].close;
    const brickSize = firstClose > 10000 ? 150 : firstClose > 1000 ? 10 : firstClose > 100 ? 2 : 0.05;

    let prevClose = visibleCandlesRaw[0].close;
    for (let i = 1; i < visibleCandlesRaw.length; i++) {
      const c = visibleCandlesRaw[i];
      const diff = c.close - prevClose;
      const numBricks = Math.floor(Math.abs(diff) / brickSize);
      if (numBricks > 0) {
        const isUp = diff > 0;
        for (let j = 0; j < numBricks; j++) {
          const open = prevClose;
          const close = prevClose + (isUp ? brickSize : -brickSize);
          bricks.push({
            time: c.time,
            open,
            close,
            high: Math.max(open, close),
            low: Math.min(open, close),
            volume: Math.round(c.volume / numBricks),
            ema20: c.ema20,
            ema50: c.ema50,
            rsi: c.rsi,
            macd: c.macd,
          });
          prevClose = close;
        }
      }
    }
    return bricks;
  }, [visibleCandlesRaw]);

  // 3. Kagi Lines
  const kagiLines = useMemo(() => {
    if (visibleCandlesRaw.length === 0) return [];
    const lines: { time: string; price: number; type: 'thick' | 'thin' }[] = [];
    const firstClose = visibleCandlesRaw[0].close;
    const reversal = firstClose * 0.015; // 1.5% reversal threshold

    let direction = 0; // 1: up, -1: down
    let lastExtreme = firstClose;
    let isThick = true;

    lines.push({ time: visibleCandlesRaw[0].time, price: firstClose, type: 'thick' });

    for (let i = 1; i < visibleCandlesRaw.length; i++) {
      const c = visibleCandlesRaw[i];
      const price = c.close;

      if (direction === 0) {
        if (Math.abs(price - lastExtreme) >= reversal) {
          direction = price > lastExtreme ? 1 : -1;
          lastExtreme = price;
          lines.push({ time: c.time, price, type: isThick ? 'thick' : 'thin' });
        }
      } else if (direction === 1) {
        if (price > lastExtreme) {
          lastExtreme = price;
          // Check if thickness flips
          const prevValley = lines.length >= 2 ? lines[lines.length - 2].price : lastExtreme;
          if (!isThick && price > prevValley) isThick = true;
          lines.push({ time: c.time, price, type: isThick ? 'thick' : 'thin' });
        } else if (lastExtreme - price >= reversal) {
          direction = -1;
          lastExtreme = price;
          const prevPeak = lines.length >= 2 ? lines[lines.length - 2].price : lastExtreme;
          if (isThick && price < prevPeak) isThick = false;
          lines.push({ time: c.time, price, type: isThick ? 'thick' : 'thin' });
        }
      } else {
        // direction === -1
        if (price < lastExtreme) {
          lastExtreme = price;
          const prevPeak = lines.length >= 2 ? lines[lines.length - 2].price : lastExtreme;
          if (isThick && price < prevPeak) isThick = false;
          lines.push({ time: c.time, price, type: isThick ? 'thick' : 'thin' });
        } else if (price - lastExtreme >= reversal) {
          direction = 1;
          lastExtreme = price;
          const prevValley = lines.length >= 2 ? lines[lines.length - 2].price : lastExtreme;
          if (!isThick && price > prevValley) isThick = true;
          lines.push({ time: c.time, price, type: isThick ? 'thick' : 'thin' });
        }
      }
    }
    return lines;
  }, [visibleCandlesRaw]);

  // 4. Point and Figure Columns
  const pnfColumns = useMemo(() => {
    if (visibleCandlesRaw.length === 0) return [];
    const firstClose = visibleCandlesRaw[0].close;
    const boxSize = firstClose > 10000 ? 200 : firstClose > 1000 ? 15 : firstClose > 100 ? 3 : 0.05;
    const reversalBoxes = 3;

    interface PnfCol {
      type: 'X' | 'O';
      prices: number[];
      time: string;
    }
    const cols: PnfCol[] = [];
    let currentType: 'X' | 'O' = visibleCandlesRaw[1]?.close >= firstClose ? 'X' : 'O';
    let lastBox = Math.round(firstClose / boxSize) * boxSize;
    let currentPrices = [lastBox];

    for (let i = 1; i < visibleCandlesRaw.length; i++) {
      const price = visibleCandlesRaw[i].close;
      const box = Math.round(price / boxSize) * boxSize;

      if (currentType === 'X') {
        if (box > lastBox) {
          for (let b = lastBox + boxSize; b <= box; b += boxSize) {
            currentPrices.push(b);
          }
          lastBox = box;
        } else if (lastBox - box >= boxSize * reversalBoxes) {
          cols.push({ type: 'X', prices: [...currentPrices], time: visibleCandlesRaw[i].time });
          currentType = 'O';
          currentPrices = [];
          for (let b = lastBox - boxSize; b >= box; b -= boxSize) {
            currentPrices.push(b);
          }
          lastBox = box;
        }
      } else {
        // currentType === 'O'
        if (box < lastBox) {
          for (let b = lastBox - boxSize; b >= box; b -= boxSize) {
            currentPrices.push(b);
          }
          lastBox = box;
        } else if (box - lastBox >= boxSize * reversalBoxes) {
          cols.push({ type: 'O', prices: [...currentPrices], time: visibleCandlesRaw[i].time });
          currentType = 'X';
          currentPrices = [];
          for (let b = lastBox + boxSize; b <= box; b += boxSize) {
            currentPrices.push(b);
          }
          lastBox = box;
        }
      }
    }
    if (currentPrices.length > 0) {
      cols.push({ type: currentType, prices: currentPrices, time: visibleCandlesRaw[visibleCandlesRaw.length - 1].time });
    }
    return cols;
  }, [visibleCandlesRaw]);

  // Select dataset based on chart type
  const displayCandles = useMemo(() => {
    if (chartType === 'Heikin Ashi') return heikinAshiCandles;
    if (chartType === 'Renko') return renkoBricks;
    return visibleCandlesRaw;
  }, [chartType, visibleCandlesRaw, heikinAshiCandles, renkoBricks]);

  // Slice visible candles to display on screen
  const visibleCandles = useMemo(() => {
    if (chartType === 'Renko') {
      const len = displayCandles.length;
      const end = Math.max(0, len - 1 - scrollIndex);
      const start = Math.max(0, end - visibleCount + 1);
      return displayCandles.slice(start, end + 1);
    }
    return displayCandles.slice(sliceStart, sliceEnd + 1);
  }, [displayCandles, sliceStart, sliceEnd, visibleCount, scrollIndex, chartType]);

  // Coordinate limits (Price Bounds)
  const priceBounds = useMemo(() => {
    if (visibleCandles.length === 0) return { min: 0, max: 100 };
    let min = Math.min(...visibleCandles.map((c) => c.low));
    let max = Math.max(...visibleCandles.map((c) => c.high));

    // Factor in SMA/EMA lines
    if (activeIndicators.includes('ema20') || activeIndicators.includes('ema50')) {
      visibleCandles.forEach((c) => {
        if (c.ema20) {
          min = Math.min(min, c.ema20);
          max = Math.max(max, c.ema20);
        }
        if (c.ema50) {
          min = Math.min(min, c.ema50);
          max = Math.max(max, c.ema50);
        }
      });
    }

    // Factor in drawings
    if (drawings.length > 0 && !isHidden) {
      drawings.forEach((d) => {
        if (d.isVisible) {
          d.points.forEach((p) => {
            min = Math.min(min, p.price);
            max = Math.max(max, p.price);
          });
        }
      });
    }

    const padding = (max - min) * 0.08 || 1;
    return { min: Math.max(0, min - padding), max: max + padding };
  }, [visibleCandles, activeIndicators, drawings, isHidden]);

  const maxVolume = useMemo(() => {
    if (visibleCandles.length === 0) return 1;
    return Math.max(...visibleCandles.map((c) => c.volume)) || 1;
  }, [visibleCandles]);

  // ----------------------------------------------------
  // DRAW CANVAS ON COMPONENT UPDATE
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI retina display scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Layout configuration: stacked panes
    const paddingRight = 65;
    const paddingBottom = 25;
    const chartWidth = dimensions.width - paddingRight;

    // Check active panes
    const rsiActive = activeIndicators.includes('rsi');
    const macdActive = activeIndicators.includes('macd');

    const rsiHeight = rsiActive ? 80 : 0;
    const macdHeight = macdActive ? 80 : 0;
    const volHeight = 45; // separate vol pane at bottom of price

    const mainPaneHeight = dimensions.height - paddingBottom - rsiHeight - macdHeight;

    // Clear background
    const isLight = theme === 'light';
    ctx.fillStyle = isLight ? '#ffffff' : '#131722';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    if (visibleCandles.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No data available. Zoom out or load symbol.', chartWidth / 2, mainPaneHeight / 2);
      return;
    }

    // Grid details
    const gridColor = isLight ? '#e0e3eb' : '#2a2e39';
    const axisTextColor = isLight ? '#636c7a' : '#6b7280';

    // Helper coordinate converters
    const getX = (idx: number) => {
      if (visibleCandles.length <= 1) return chartWidth / 2;
      return (idx / (visibleCandles.length - 1)) * (chartWidth - 24) + 12;
    };

    const getY = (val: number, min: number, max: number, heightOffset: number, paneHeight: number) => {
      const range = max - min || 1;
      return heightOffset + paneHeight - ((val - min) / range) * paneHeight;
    };

    // 1. Draw Grid Lines & Axes for Price Pane
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]);

    // Vertical Time Lines
    const timeStep = Math.max(5, Math.floor(visibleCandles.length / 6));
    ctx.fillStyle = axisTextColor;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < visibleCandles.length; i += timeStep) {
      const x = getX(i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height - paddingBottom);
      ctx.stroke();

      // Date labels at bottom
      ctx.fillText(visibleCandles[i].time.substring(5), x, dimensions.height - 8);
    }

    // Horizontal Price Lines
    const priceRange = priceBounds.max - priceBounds.min;
    const priceStep = priceRange / 5;
    ctx.textAlign = 'left';

    for (let i = 1; i < 5; i++) {
      const priceVal = priceBounds.min + i * priceStep;
      const y = getY(priceVal, priceBounds.min, priceBounds.max, 0, mainPaneHeight);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price labels
      ctx.fillText(
        priceVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        chartWidth + 5,
        y + 3
      );
    }
    ctx.setLineDash([]); // clear dash

    // 2. Draw Price Chart Content
    const candleWidth = Math.max(1.5, (chartWidth / visibleCandles.length) * 0.7);

    // Hollow / solid colors
    const greenColor = '#089981';
    const redColor = '#f23645';

    if (chartType === 'Line' || chartType === 'Area') {
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(visibleCandles[0].close, priceBounds.min, priceBounds.max, 0, mainPaneHeight));
      for (let i = 1; i < visibleCandles.length; i++) {
        ctx.lineTo(getX(i), getY(visibleCandles[i].close, priceBounds.min, priceBounds.max, 0, mainPaneHeight));
      }
      ctx.strokeStyle = '#2979ff';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      if (chartType === 'Area') {
        ctx.lineTo(getX(visibleCandles.length - 1), mainPaneHeight);
        ctx.lineTo(getX(0), mainPaneHeight);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, mainPaneHeight);
        grad.addColorStop(0, 'rgba(41, 121, 255, 0.35)');
        grad.addColorStop(1, 'rgba(41, 121, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    } else if (chartType === 'Baseline') {
      const baselineVal = (priceBounds.max + priceBounds.min) / 2;
      const baselineY = getY(baselineVal, priceBounds.min, priceBounds.max, 0, mainPaneHeight);

      // Draw baseline horizontal reference
      ctx.strokeStyle = 'rgba(120, 123, 134, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(chartWidth, baselineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw baseline colored lines
      for (let i = 0; i < visibleCandles.length - 1; i++) {
        const x1 = getX(i);
        const y1 = getY(visibleCandles[i].close, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
        const x2 = getX(i + 1);
        const y2 = getY(visibleCandles[i + 1].close, priceBounds.min, priceBounds.max, 0, mainPaneHeight);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = y2 < baselineY ? greenColor : redColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (chartType === 'Kagi') {
      // Draw Kagi lines
      ctx.lineWidth = 1.5;
      for (let i = 0; i < Math.min(kagiLines.length - 1, visibleCandles.length); i++) {
        const k1 = kagiLines[i];
        const k2 = kagiLines[i + 1];

        const x1 = getX(i);
        const y1 = getY(k1.price, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
        const x2 = getX(i + 1);
        const y2 = getY(k2.price, priceBounds.min, priceBounds.max, 0, mainPaneHeight);

        ctx.strokeStyle = k1.type === 'thick' ? greenColor : redColor;
        ctx.lineWidth = k1.type === 'thick' ? 2.2 : 1.0;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1); // horizontal link
        ctx.lineTo(x2, y2); // vertical line
        ctx.stroke();
      }
    } else if (chartType === 'Point & Figure') {
      // Draw P&F columns
      const colWidth = chartWidth / Math.max(10, pnfColumns.length);
      const symbolSize = Math.max(3, colWidth * 0.7);

      pnfColumns.forEach((col, cIdx) => {
        const x = cIdx * colWidth + colWidth / 2;
        ctx.fillStyle = col.type === 'X' ? greenColor : redColor;
        ctx.font = `bold ${symbolSize}px sans-serif`;
        ctx.textAlign = 'center';

        col.prices.forEach((price) => {
          const y = getY(price, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
          ctx.fillText(col.type, x, y + symbolSize / 3);
        });
      });
    } else {
      // Candlesticks (Hollow or Normal)
      const isHollow = chartType === 'Hollow Candles';

      visibleCandles.forEach((c, i) => {
        const x = getX(i);
        const oY = getY(c.open, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
        const cY = getY(c.close, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
        const hY = getY(c.high, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
        const lY = getY(c.low, priceBounds.min, priceBounds.max, 0, mainPaneHeight);

        const isBullish = c.close >= c.open;
        const color = isBullish ? greenColor : redColor;

        // Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, hY);
        ctx.lineTo(x, lY);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const rectHeight = Math.max(1, Math.abs(oY - cY));
        const rectY = Math.min(oY, cY);

        if (isHollow && isBullish) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x - candleWidth / 2, rectY, candleWidth, rectHeight);
        } else {
          ctx.fillRect(x - candleWidth / 2, rectY, candleWidth, rectHeight);
        }
      });
    }

    // 3. Draw Indicators Overlay (EMA 20 / EMA 50)
    if (activeIndicators.includes('ema20')) {
      ctx.strokeStyle = '#2979ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let first = true;
      visibleCandles.forEach((c, i) => {
        if (c.ema20) {
          const y = getY(c.ema20, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
          if (first) {
            ctx.moveTo(getX(i), y);
            first = false;
          } else {
            ctx.lineTo(getX(i), y);
          }
        }
      });
      ctx.stroke();
    }

    if (activeIndicators.includes('ema50')) {
      ctx.strokeStyle = '#ff8243';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let first = true;
      visibleCandles.forEach((c, i) => {
        if (c.ema50) {
          const y = getY(c.ema50, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
          if (first) {
            ctx.moveTo(getX(i), y);
            first = false;
          } else {
            ctx.lineTo(getX(i), y);
          }
        }
      });
      ctx.stroke();
    }

    // Custom Pine script plots
    if (pinePlots) {
      pinePlots.forEach((plot) => {
        ctx.strokeStyle = plot.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        let first = true;
        visibleCandles.forEach((c, i) => {
          const originalIdx = candles.findIndex((oc) => oc.time === c.time);
          const val = plot.series[originalIdx];
          if (val !== null && val !== undefined) {
            const y = getY(val, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
            if (first) {
              ctx.moveTo(getX(i), y);
              first = false;
            } else {
              ctx.lineTo(getX(i), y);
            }
          }
        });
        ctx.stroke();
      });
    }

    // Custom Pine script shape indicators
    if (pineShapes) {
      pineShapes.forEach((shape) => {
        const vIdx = visibleCandles.findIndex((c) => c.time === shape.time);
        if (vIdx !== -1) {
          const x = getX(vIdx);
          const y = shape.type === 'BUY'
            ? getY(shape.price, priceBounds.min, priceBounds.max, 0, mainPaneHeight) + 12
            : getY(shape.price, priceBounds.min, priceBounds.max, 0, mainPaneHeight) - 12;

          ctx.fillStyle = shape.color;
          ctx.beginPath();
          if (shape.type === 'BUY') {
            ctx.moveTo(x, y - 6);
            ctx.lineTo(x - 4, y + 2);
            ctx.lineTo(x + 4, y + 2);
          } else {
            ctx.moveTo(x, y + 6);
            ctx.lineTo(x - 4, y - 2);
            ctx.lineTo(x + 4, y - 2);
          }
          ctx.closePath();
          ctx.fill();
        }
      });
    }

    // 4. Volume Bar sub-pane overlay inside main chart (at bottom 15%)
    ctx.globalAlpha = 0.15;
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const isBullish = c.close >= c.open;
      const volHeightPx = (c.volume / maxVolume) * volHeight;
      const barY = mainPaneHeight - volHeightPx;

      ctx.fillStyle = isBullish ? greenColor : redColor;
      ctx.fillRect(x - candleWidth / 2, barY, candleWidth, volHeightPx);
    });
    ctx.globalAlpha = 1.0;

    // 5. Draw Draggable Order Lines (OCO / Pending Orders)
    if (orderLines) {
      const drawOrderLine = (price: number, label: string, color: string) => {
        const y = getY(price, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
        if (y >= 0 && y <= mainPaneHeight) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartWidth, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = color;
          ctx.fillRect(chartWidth, y - 8, paddingRight, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = '8px monospace';
          ctx.fillText(label + ': ' + price.toFixed(1), chartWidth + 3, y + 4);
        }
      };

      drawOrderLine(orderLines.entryPrice, 'LMT', '#2979ff');
      if (orderLines.hasBracket) {
        drawOrderLine(orderLines.slPrice, 'SL', '#ff3d00');
        drawOrderLine(orderLines.tpPrice, 'TP', '#089981');
      }
    }

    // Draw active position lines
    if (position) {
      const drawPositionLine = (price: number, label: string, color: string) => {
        const y = getY(price, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
        if (y >= 0 && y <= mainPaneHeight) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartWidth, y);
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.fillRect(chartWidth, y - 8, paddingRight, 16);

          ctx.fillStyle = '#ffffff';
          ctx.font = '8px monospace';
          ctx.fillText(label + ': ' + price.toFixed(1), chartWidth + 3, y + 4);
        }
      };

      drawPositionLine(position.avgEntryPrice, 'POS', '#2979ff');
      if (position.slPrice !== null) {
        drawPositionLine(position.slPrice, 'POS SL', '#ff3d00');
      }
      if (position.tpPrice !== null) {
        drawPositionLine(position.tpPrice, 'POS TP', '#089981');
      }
    }

    // 6. Draw Indicators in Separate Stacked Panes (RSI / MACD)
    let currentPaneOffset = mainPaneHeight;

    if (rsiActive) {
      currentPaneOffset += 10; // boundary spacing
      ctx.strokeStyle = gridColor;
      ctx.strokeRect(0, currentPaneOffset, chartWidth, rsiHeight);

      // RSI limits
      ctx.fillStyle = axisTextColor;
      ctx.font = '7px monospace';
      ctx.fillText('70.0', chartWidth + 5, currentPaneOffset + rsiHeight * 0.3);
      ctx.fillText('30.0', chartWidth + 5, currentPaneOffset + rsiHeight * 0.7);

      // Guide lines inside RSI
      ctx.strokeStyle = 'rgba(120, 123, 134, 0.2)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, currentPaneOffset + rsiHeight * 0.3);
      ctx.lineTo(chartWidth, currentPaneOffset + rsiHeight * 0.3);
      ctx.moveTo(0, currentPaneOffset + rsiHeight * 0.7);
      ctx.lineTo(chartWidth, currentPaneOffset + rsiHeight * 0.7);
      ctx.stroke();

      // RSI Curve
      ctx.strokeStyle = '#d13bff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let first = true;
      visibleCandles.forEach((c, i) => {
        if (c.rsi !== undefined) {
          const y = getY(c.rsi, 0, 100, currentPaneOffset, rsiHeight);
          if (first) {
            ctx.moveTo(getX(i), y);
            first = false;
          } else {
            ctx.lineTo(getX(i), y);
          }
        }
      });
      ctx.stroke();

      currentPaneOffset += rsiHeight;
    }

    if (macdActive) {
      currentPaneOffset += 10;
      ctx.strokeStyle = gridColor;
      ctx.strokeRect(0, currentPaneOffset, chartWidth, macdHeight);

      // Find MACD bounds
      let macdMin = -0.5;
      let macdMax = 0.5;
      visibleCandles.forEach((c) => {
        if (c.macd) {
          macdMin = Math.min(macdMin, c.macd.macd, c.macd.signal, c.macd.histogram);
          macdMax = Math.max(macdMax, c.macd.macd, c.macd.signal, c.macd.histogram);
        }
      });

      // Axis zero line
      const zeroY = getY(0, macdMin, macdMax, currentPaneOffset, macdHeight);
      ctx.strokeStyle = 'rgba(120, 123, 134, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(chartWidth, zeroY);
      ctx.stroke();

      // Draw MACD Histogram columns
      visibleCandles.forEach((c, i) => {
        if (c.macd) {
          const x = getX(i);
          const histY = getY(c.macd.histogram, macdMin, macdMax, currentPaneOffset, macdHeight);
          ctx.fillStyle = c.macd.histogram >= 0 ? greenColor : redColor;
          ctx.fillRect(x - candleWidth / 3, Math.min(zeroY, histY), candleWidth * 0.7, Math.abs(zeroY - histY));
        }
      });

      // Draw MACD & Signal lines
      ctx.strokeStyle = '#2979ff';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      let first = true;
      visibleCandles.forEach((c, i) => {
        if (c.macd) {
          const y = getY(c.macd.macd, macdMin, macdMax, currentPaneOffset, macdHeight);
          if (first) {
            ctx.moveTo(getX(i), y);
            first = false;
          } else {
            ctx.lineTo(getX(i), y);
          }
        }
      });
      ctx.stroke();

      ctx.strokeStyle = '#ff8243';
      ctx.beginPath();
      first = true;
      visibleCandles.forEach((c, i) => {
        if (c.macd) {
          const y = getY(c.macd.signal, macdMin, macdMax, currentPaneOffset, macdHeight);
          if (first) {
            ctx.moveTo(getX(i), y);
            first = false;
          } else {
            ctx.lineTo(getX(i), y);
          }
        }
      });
      ctx.stroke();

      currentPaneOffset += macdHeight;
    }

    // 7. Draw Drawings Layer
    if (!isHidden) {
      const renderDrawing = (d: DrawingObject) => {
        if (!d.isVisible || d.points.length === 0) return;
        ctx.strokeStyle = d.style.color;
        ctx.fillStyle = d.style.color;
        ctx.lineWidth = d.style.lineWidth;
        ctx.globalAlpha = d.style.opacity || 1.0;

        // Convert points to screen coordinates
        const pts = d.points.map((p) => {
          const vIdx = visibleCandles.findIndex((vc) => vc.time === p.time);
          const px = vIdx !== -1 ? getX(vIdx) : -9999;
          const py = getY(p.price, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
          return { x: px, y: py };
        }).filter((pt) => pt.x !== -9999);

        if (pts.length === 0) return;

        // Render based on drawing type
        if (d.type === 'trendline' && pts.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.stroke();
        } else if (d.type === 'ray' && pts.length >= 2) {
          const dx = pts[1].x - pts[0].x;
          const dy = pts[1].y - pts[0].y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ex = pts[0].x + (dx / len) * 2000;
          const ey = pts[0].y + (dy / len) * 2000;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        } else if (d.type === 'horizontal_line') {
          ctx.beginPath();
          ctx.moveTo(0, pts[0].y);
          ctx.lineTo(chartWidth, pts[0].y);
          ctx.stroke();
        } else if (d.type === 'vertical_line') {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, 0);
          ctx.lineTo(pts[0].x, mainPaneHeight);
          ctx.stroke();
        } else if (d.type === 'rect' && pts.length >= 2) {
          const w = pts[1].x - pts[0].x;
          const h = pts[1].y - pts[0].y;
          if (d.style.filled) {
            ctx.fillStyle = d.style.color + '20'; // add transparency
            ctx.fillRect(pts[0].x, pts[0].y, w, h);
          }
          ctx.strokeRect(pts[0].x, pts[0].y, w, h);
        } else if (d.type === 'circle' && pts.length >= 2) {
          const dx = pts[1].x - pts[0].x;
          const dy = pts[1].y - pts[0].y;
          const r = Math.sqrt(dx * dx + dy * dy);
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2);
          if (d.style.filled) {
            ctx.fillStyle = d.style.color + '20';
            ctx.fill();
          }
          ctx.stroke();
        } else if (d.type === 'text' && d.points.length > 0) {
          ctx.font = '10px sans-serif';
          ctx.fillText(d.id.substring(0, 8), pts[0].x, pts[0].y - 5);
        } else if (d.type === 'ruler' && pts.length >= 2) {
          const w = pts[1].x - pts[0].x;
          const h = pts[1].y - pts[0].y;
          ctx.fillStyle = 'rgba(41, 121, 255, 0.1)';
          ctx.fillRect(pts[0].x, pts[0].y, w, h);
          ctx.strokeRect(pts[0].x, pts[0].y, w, h);

          // Calculate changes
          const priceChange = d.points[1].price - d.points[0].price;
          const pct = (priceChange / d.points[0].price) * 100;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`${priceChange.toFixed(2)} (${pct.toFixed(2)}%)`, pts[0].x + 5, pts[0].y + 12);
        } else if (d.type === 'fib' && pts.length >= 2) {
          const diff = d.points[1].price - d.points[0].price;
          const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618];
          ctx.font = '8px monospace';
          ratios.forEach((r) => {
            const fPrice = d.points[0].price + r * diff;
            const fY = getY(fPrice, priceBounds.min, priceBounds.max, 0, mainPaneHeight);
            ctx.beginPath();
            ctx.moveTo(0, fY);
            ctx.lineTo(chartWidth, fY);
            ctx.stroke();
            ctx.fillText(`FIB ${r * 100}%: ${fPrice.toFixed(1)}`, 5, fY - 2);
          });
        } else if (d.type === 'risk_reward' && pts.length >= 2) {
          // Risk reward long position mock display
          const entryY = pts[0].y;
          const targetY = pts[1].y;
          const stopY = entryY + (entryY - targetY) * 0.5; // stop at half target offset

          // Target box
          ctx.fillStyle = 'rgba(8, 153, 129, 0.15)';
          ctx.fillRect(pts[0].x, Math.min(entryY, targetY), chartWidth - pts[0].x, Math.abs(entryY - targetY));

          // Stop box
          ctx.fillStyle = 'rgba(242, 54, 69, 0.15)';
          ctx.fillRect(pts[0].x, Math.min(entryY, stopY), chartWidth - pts[0].x, Math.abs(entryY - stopY));

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('R/R Ratio: 2.0 (Target: ' + d.points[1].price.toFixed(1) + ')', pts[0].x + 10, targetY + 12);
        }

        // Draw handles/circles for anchors if selected
        if (selectedDrawingId === d.id) {
          ctx.fillStyle = '#ff8243';
          ctx.globalAlpha = 1.0;
          pts.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      };

      // Render finalized drawings
      drawings.forEach(renderDrawing);

      // Render actively drawn shape
      if (activeDrawing) {
        renderDrawing(activeDrawing);
      }
    }
    ctx.globalAlpha = 1.0;

    // 8. Draw real-time snapped Crosshair
    if (crosshair && !isReplaySelecting) {
      const snappedIdx = Math.max(
        0,
        Math.min(
          visibleCandles.length - 1,
          Math.round(((crosshair.x - 12) / (chartWidth - 24)) * (visibleCandles.length - 1))
        )
      );
      const snappedX = getX(snappedIdx);

      // Snap coordinates guides
      ctx.strokeStyle = '#787b86';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);

      // Vertical Snapped Line
      ctx.beginPath();
      ctx.moveTo(snappedX, 0);
      ctx.lineTo(snappedX, dimensions.height - paddingBottom);
      ctx.stroke();

      // Horizontal Mouse Line
      if (crosshair.y <= mainPaneHeight) {
        ctx.beginPath();
        ctx.moveTo(0, crosshair.y);
        ctx.lineTo(chartWidth, crosshair.y);
        ctx.stroke();

        // Price Axis Label Badge
        const range = priceBounds.max - priceBounds.min;
        const snappedPrice = priceBounds.min + ((mainPaneHeight - crosshair.y) / mainPaneHeight) * range;

        ctx.fillStyle = '#363a45';
        ctx.fillRect(chartWidth, crosshair.y - 7, paddingRight, 14);

        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.fillText(snappedPrice.toFixed(2), chartWidth + 3, crosshair.y + 3);
      }
      ctx.setLineDash([]); // clear

      // Time axis label badge
      ctx.fillStyle = '#363a45';
      ctx.fillRect(snappedX - 30, dimensions.height - paddingBottom, 60, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(visibleCandles[snappedIdx].time, snappedX, dimensions.height - paddingBottom + 10);
    }
  }, [
    dimensions,
    visibleCandles,
    priceBounds,
    maxVolume,
    activeIndicators,
    orderLines,
    position,
    pinePlots,
    pineShapes,
    drawings,
    activeDrawing,
    selectedDrawingId,
    crosshair,
    theme,
    chartType,
    isHidden,
    isReplaySelecting,
    pnfColumns,
    kagiLines,
  ]);

  // ----------------------------------------------------
  // INTERACTIVE EVENT HANDLERS
  // ----------------------------------------------------

  const getPriceAndTimeToCoord = (mx: number, my: number) => {
    const paddingRight = 65;
    const chartWidth = dimensions.width - paddingRight;
    const rsiActive = activeIndicators.includes('rsi');
    const macdActive = activeIndicators.includes('macd');
    const rsiHeight = rsiActive ? 80 : 0;
    const macdHeight = macdActive ? 80 : 0;
    const mainPaneHeight = dimensions.height - 25 - rsiHeight - macdHeight;

    const snappedIdx = Math.max(
      0,
      Math.min(
        visibleCandles.length - 1,
        Math.round(((mx - 12) / (chartWidth - 24)) * (visibleCandles.length - 1))
      )
    );
    const time = visibleCandles[snappedIdx].time;

    const range = priceBounds.max - priceBounds.min;
    const price = priceBounds.min + ((mainPaneHeight - my) / mainPaneHeight) * range;

    return { time, price: parseFloat(price.toFixed(2)), snappedIdx };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 1. Replay Selection mode click
    if (isReplaySelecting && onSelectReplayCandle) {
      const { snappedIdx } = getPriceAndTimeToCoord(mx, my);
      const originalIdx = candles.findIndex((c) => c.time === visibleCandles[snappedIdx]?.time);
      if (originalIdx !== -1) {
        onSelectReplayCandle(originalIdx);
      }
      return;
    }

    const { time, price } = getPriceAndTimeToCoord(mx, my);

    // 2. Drag Bracket order lines check
    const rsiActive = activeIndicators.includes('rsi');
    const macdActive = activeIndicators.includes('macd');
    const mainPaneHeight = dimensions.height - 25 - (rsiActive ? 80 : 0) - (macdActive ? 80 : 0);
    const limitTolerance = (priceBounds.max - priceBounds.min) * 0.02;

    if (position && onPositionLineChange) {
      if (position.slPrice !== null && Math.abs(price - position.slPrice) <= limitTolerance) {
        setActiveDragLine('position_sl');
        return;
      }
      if (position.tpPrice !== null && Math.abs(price - position.tpPrice) <= limitTolerance) {
        setActiveDragLine('position_tp');
        return;
      }
    }

    if (orderLines && onOrderLineChange) {
      if (Math.abs(price - orderLines.entryPrice) <= limitTolerance) {
        setActiveDragLine('entry');
        return;
      }
      if (orderLines.hasBracket) {
        if (Math.abs(price - orderLines.slPrice) <= limitTolerance) {
          setActiveDragLine('sl');
          return;
        }
        if (Math.abs(price - orderLines.tpPrice) <= limitTolerance) {
          setActiveDragLine('tp');
          return;
        }
      }
    }

    // 3. Drawing mode clicks
    if (activeTool !== 'cursor' && activeTool !== 'zoom') {
      if (!activeDrawing) {
        const newD: DrawingObject = {
          id: Math.random().toString(),
          type: activeTool,
          points: [{ time, price }],
          style: {
            color: activeTool === 'highlighter' ? '#089981' : '#ff8243',
            lineWidth: activeTool === 'highlighter' ? 6 : 1.5,
            opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
            filled: activeTool === 'rect' || activeTool === 'circle' || activeTool === 'ruler' || activeTool === 'risk_reward',
          },
          isLocked,
          isVisible: true,
        };
        setActiveDrawing(newD);
      } else {
        // Add point
        const updatedPoints = [...activeDrawing.points, { time, price }];
        const isFinished = updatedPoints.length >= (
          activeDrawing.type === 'horizontal_line' || activeDrawing.type === 'vertical_line' || activeDrawing.type === 'text' ? 1 : 2
        );

        if (isFinished) {
          const finalDrawing = { ...activeDrawing, points: updatedPoints };
          const updatedDrawings = [...drawings, finalDrawing];
          setDrawings(updatedDrawings);
          saveDrawingsToStorage(updatedDrawings);
          setActiveDrawing(null);
          if (setActiveTool) setActiveTool('cursor'); // reset to cursor
        } else {
          setActiveDrawing({ ...activeDrawing, points: updatedPoints });
        }
      }
      return;
    }

    // 4. Check Selection of existing drawings
    let selectedId: string | null = null;
    let anchorIdx: number | null = null;

    drawings.forEach((d) => {
      d.points.forEach((pt, pIdx) => {
        const vIdx = visibleCandles.findIndex((vc) => vc.time === pt.time);
        if (vIdx !== -1) {
          const toleranceX = 10;
          const paddingRight = 65;
          const chartWidth = dimensions.width - paddingRight;
          const colX = (vIdx / (visibleCandles.length - 1)) * (chartWidth - 24) + 12;
          const rowY = getYCoord(pt.price, mainPaneHeight);

          if (Math.abs(mx - colX) <= toleranceX && Math.abs(my - rowY) <= toleranceX) {
            selectedId = d.id;
            anchorIdx = pIdx;
          }
        }
      });
    });

    if (selectedId) {
      setSelectedDrawingId(selectedId);
      setDragDrawingId(selectedId);
      setDragAnchorIdx(anchorIdx);
      return;
    }

    // Default select none / start panning
    setSelectedDrawingId(null);
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartScroll.current = scrollIndex;
  };

  const getYCoord = (val: number, mainPaneHeight: number) => {
    const range = priceBounds.max - priceBounds.min;
    return mainPaneHeight - ((val - priceBounds.min) / range) * mainPaneHeight;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setCrosshair({ x: mx, y: my });

    const { time, price } = getPriceAndTimeToCoord(mx, my);

    // Snapping (Magnet snap implementation)
    let finalPrice = price;
    let finalTime = time;

    if (isMagnet && visibleCandles.length > 0) {
      const snappedIdx = Math.max(
        0,
        Math.min(
          visibleCandles.length - 1,
          Math.round(((mx - 12) / (dimensions.width - 65 - 24)) * (visibleCandles.length - 1))
        )
      );
      const c = visibleCandles[snappedIdx];
      if (c) {
        finalTime = c.time;
        const prices = [c.open, c.high, c.low, c.close];
        const closestPrice = prices.reduce((prev, curr) =>
          Math.abs(curr - price) < Math.abs(prev - price) ? curr : prev
        );
        finalPrice = closestPrice;
      }
    }

    // A. Drag Bracket order line
    if (activeDragLine && orderLines && onOrderLineChange) {
      if (activeDragLine === 'entry') {
        onOrderLineChange({ ...orderLines, entryPrice: finalPrice });
      } else if (activeDragLine === 'sl') {
        onOrderLineChange({ ...orderLines, slPrice: finalPrice });
      } else if (activeDragLine === 'tp') {
        onOrderLineChange({ ...orderLines, tpPrice: finalPrice });
      }
      return;
    }

    if (activeDragLine && position && onPositionLineChange) {
      if (activeDragLine === 'position_sl') {
        onPositionLineChange(finalPrice, position.tpPrice);
      } else if (activeDragLine === 'position_tp') {
        onPositionLineChange(position.slPrice, finalPrice);
      }
      return;
    }

    // B. Drawing Preview line
    if (activeDrawing) {
      const pts = [...activeDrawing.points];
      pts[activeDrawing.points.length - 1] = { time: finalTime, price: finalPrice };
      setActiveDrawing({ ...activeDrawing, points: pts });
      return;
    }

    // C. Drag anchor point of drawing
    if (dragDrawingId && dragAnchorIdx !== null) {
      const updatedDrawings = drawings.map((d) => {
        if (d.id === dragDrawingId) {
          const pts = [...d.points];
          pts[dragAnchorIdx] = { time: finalTime, price: finalPrice };
          return { ...d, points: pts };
        }
        return d;
      });
      setDrawings(updatedDrawings);
      return;
    }

    // D. Panning scroll
    if (isDragging.current) {
      const deltaX = e.clientX - dragStartX.current;
      const candleWidth = (dimensions.width - 65) / visibleCount;
      const scrollDelta = Math.round(deltaX / candleWidth);

      setScrollIndex(
        Math.max(
          0,
          Math.min(
            visibleCandlesRaw.length - visibleCount,
            dragStartScroll.current + scrollDelta
          )
        )
      );
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    setActiveDragLine(null);
    setDragDrawingId(null);
    setDragAnchorIdx(null);
    saveDrawingsToStorage(drawings);
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    setActiveDragLine(null);
    setDragDrawingId(null);
    setDragAnchorIdx(null);
    setCrosshair(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setVisibleCount((prev) => Math.max(15, prev - 4));
    } else {
      setVisibleCount((prev) => Math.min(180, prev + 4));
    }
  };

  // Keyboard shortcut listener for deleting drawings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedDrawingId && (e.key === 'Backspace' || e.key === 'Delete')) {
        const updated = drawings.filter((d) => d.id !== selectedDrawingId);
        setDrawings(updated);
        saveDrawingsToStorage(updated);
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, drawings]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${
        theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#131722] border-gray-800'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: activeTool !== 'cursor' ? 'crosshair' : 'default',
        }}
      />
    </div>
  );
}
