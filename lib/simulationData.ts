export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema20?: number;
  ema50?: number;
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

export interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  pnl: number;
  pnlPercent: number;
  status: 'CLOSED' | 'OPEN';
}

export interface BacktestReport {
  trades: Trade[];
  metrics: {
    netProfit: number;
    grossProfit: number;
    grossLoss: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    initialBalance: number;
    finalBalance: number;
  };
  equityCurve: { time: string; balance: number }[];
  monthlyReturns: Record<number, Record<number, number>>; // Year -> Month -> PnL%
  monteCarloPaths: number[][]; // [pathIdx][tradeIdx]
}

// Helper to seed a simple pseudo-random noise generator
function createRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function generateMockData(symbol: string, daysCount = 250): Candle[] {
  const rand = createRandom(symbol);
  const data: Candle[] = [];

  let price = 100;
  let volatility = 0.02;

  const upper = symbol.toUpperCase();
  if (upper.includes('BTC')) {
    price = 68000;
    volatility = 0.035;
  } else if (upper.includes('ETH')) {
    price = 3500;
    volatility = 0.04;
  } else if (upper.includes('SOL')) {
    price = 150;
    volatility = 0.055;
  } else if (upper.includes('EUR') || upper.includes('USD') || upper.includes('GBP')) {
    price = 1.25;
    volatility = 0.005;
  } else if (upper.includes('NIFTY')) {
    price = 22500;
    volatility = 0.012;
  } else if (upper.includes('BANKNIFTY')) {
    price = 48000;
    volatility = 0.015;
  } else if (upper.includes('RELIANCE')) {
    price = 2800;
    volatility = 0.015;
  } else if (upper.includes('TCS')) {
    price = 3800;
    volatility = 0.014;
  } else if (upper.includes('XAU') || upper.includes('GOLD')) {
    price = 2300;
    volatility = 0.01;
  } else if (upper.includes('SILVER')) {
    price = 28;
    volatility = 0.018;
  }

  const now = new Date();
  const date = new Date(now.getTime() - daysCount * 24 * 60 * 60 * 1000);

  for (let i = 0; i < daysCount; i++) {
    const change = price * volatility * (rand() - 0.485);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + price * volatility * rand() * 0.4;
    const low = Math.min(open, close) - price * volatility * rand() * 0.4;
    const volume = Math.round(50000 + rand() * 200000);

    data.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(symbol.includes('/') && !upper.includes('JPY') ? 4 : 2)),
      high: parseFloat(high.toFixed(symbol.includes('/') && !upper.includes('JPY') ? 4 : 2)),
      low: parseFloat(low.toFixed(symbol.includes('/') && !upper.includes('JPY') ? 4 : 2)),
      close: parseFloat(close.toFixed(symbol.includes('/') && !upper.includes('JPY') ? 4 : 2)),
      volume,
    });

    price = close;
    date.setDate(date.getDate() + 1);
  }

  calculateEMAInPlace(data, 20, 'ema20');
  calculateEMAInPlace(data, 50, 'ema50');
  calculateRSIInPlace(data, 14);
  calculateMACDInPlace(data);

  return data;
}

function calculateEMAInPlace(data: Candle[], period: number, key: 'ema20' | 'ema50') {
  if (data.length < period) return;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  data[period - 1][key] = ema;

  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    data[i][key] = ema;
  }
}

function calculateRSIInPlace(data: Candle[], period = 14) {
  if (data.length <= period) return;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgGain / (avgLoss || 1);
  data[period].rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgGain / (avgLoss || 1);
    data[i].rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  }
}

function calculateMACDInPlace(data: Candle[]) {
  if (data.length < 26) return;

  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  const k9 = 2 / (9 + 1);

  let ema12 = data[0].close;
  let ema26 = data[0].close;
  const macdLine: number[] = [];

  for (let i = 0; i < data.length; i++) {
    ema12 = data[i].close * k12 + ema12 * (1 - k12);
    ema26 = data[i].close * k26 + ema26 * (1 - k26);
    macdLine.push(ema12 - ema26);
  }

  let signalLine = macdLine.slice(0, 9).reduce((a, b) => a + b, 0) / 9;

  for (let i = 0; i < data.length; i++) {
    if (i < 8) continue;
    if (i >= 9) {
      signalLine = macdLine[i] * k9 + signalLine * (1 - k9);
    }
    const macdVal = macdLine[i];
    const signalVal = signalLine;
    const histVal = macdVal - signalVal;

    data[i].macd = {
      macd: macdVal,
      signal: signalVal,
      histogram: histVal,
    };
  }
}

export function runBacktest(
  candles: Candle[],
  strategyId: 'ema_crossover' | 'rsi_mean_reversion' | 'macd_momentum',
  initialBalance = 100000,
  commissionRate = 0.0005, // 0.05%
  slippageRate = 0.001 // 0.1%
): BacktestReport {
  const trades: Trade[] = [];
  const equityCurve: { time: string; balance: number }[] = [];

  let balance = initialBalance;
  let position: { entryPrice: number; entryTime: string; qty: number } | null = null;

  equityCurve.push({ time: candles[0]?.time || '', balance });

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];

    if (!curr.ema20 || !curr.ema50 || !curr.rsi || !curr.macd) {
      equityCurve.push({ time: curr.time, balance });
      continue;
    }

    let buySignal = false;
    let sellSignal = false;

    if (strategyId === 'ema_crossover') {
      const prevEma20 = prev.ema20!;
      const prevEma50 = prev.ema50!;
      const currEma20 = curr.ema20!;
      const currEma50 = curr.ema50!;

      if (prevEma20 <= prevEma50 && currEma20 > currEma50) buySignal = true;
      if (prevEma20 >= prevEma50 && currEma20 < currEma50) sellSignal = true;
    } else if (strategyId === 'rsi_mean_reversion') {
      if (prev.rsi! < 30 && curr.rsi! >= 30) buySignal = true;
      if (prev.rsi! > 70 && curr.rsi! <= 70) sellSignal = true;
    } else if (strategyId === 'macd_momentum') {
      const prevHist = prev.macd!.histogram;
      const currHist = curr.macd!.histogram;

      if (prevHist <= 0 && currHist > 0) buySignal = true;
      if (prevHist >= 0 && currHist < 0) sellSignal = true;
    }

    if (!position && buySignal) {
      // Enter Position: Add Slippage to entry price
      const entryPrice = curr.close * (1 + slippageRate);
      const qty = balance / entryPrice;
      
      // Charge commission
      const commission = entryPrice * qty * commissionRate;
      balance -= commission;

      position = {
        entryPrice,
        entryTime: curr.time,
        qty,
      };
    } else if (position && sellSignal) {
      // Exit Position: Subtract Slippage from exit price
      const exitPrice = curr.close * (1 - slippageRate);
      const grossPnl = (exitPrice - position.entryPrice) * position.qty;
      const commission = exitPrice * position.qty * commissionRate;
      const pnl = grossPnl - commission;
      
      balance += pnl;
      const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

      trades.push({
        id: Math.random().toString(36).substring(4, 9),
        type: 'BUY',
        entryPrice: parseFloat(position.entryPrice.toFixed(2)),
        exitPrice: parseFloat(exitPrice.toFixed(2)),
        entryTime: position.entryTime,
        exitTime: curr.time,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2)),
        status: 'CLOSED',
      });

      position = null;
    }

    const currentEquity = position ? (curr.close * position.qty) : balance;
    equityCurve.push({ time: curr.time, balance: parseFloat(currentEquity.toFixed(2)) });
  }

  // Force close position at end of data
  if (position) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close * (1 - slippageRate);
    const grossPnl = (exitPrice - position.entryPrice) * position.qty;
    const commission = exitPrice * position.qty * commissionRate;
    const pnl = grossPnl - commission;
    balance += pnl;
    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

    trades.push({
      id: Math.random().toString(36).substring(4, 9),
      type: 'BUY',
      entryPrice: parseFloat(position.entryPrice.toFixed(2)),
      exitPrice: parseFloat(exitPrice.toFixed(2)),
      entryTime: position.entryTime,
      exitTime: lastCandle.time,
      pnl: parseFloat(pnl.toFixed(2)),
      pnlPercent: parseFloat(pnlPercent.toFixed(2)),
      status: 'CLOSED',
    });
  }

  // Calculate metrics
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTradesCount = 0;

  for (const t of trades) {
    if (t.pnl > 0) {
      grossProfit += t.pnl;
      winningTradesCount++;
    } else {
      grossLoss += Math.abs(t.pnl);
    }
  }

  const netProfit = grossProfit - grossLoss;
  const winRate = trades.length > 0 ? (winningTradesCount / trades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  // Max Drawdown Calculation
  let peak = initialBalance;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.balance > peak) peak = point.balance;
    const dd = ((peak - point.balance) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Sharpe and Sortino Ratios
  const returns: number[] = [];
  for (let j = 1; j < equityCurve.length; j++) {
    const prevBal = equityCurve[j - 1].balance;
    const currBal = equityCurve[j].balance;
    if (prevBal > 0) {
      returns.push((currBal - prevBal) / prevBal);
    }
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  
  // Standard deviation (for Sharpe)
  const variance = returns.reduce((sum, val) => sum + Math.pow(val - avgReturn, 2), 0) / (returns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Downside deviation (for Sortino)
  const downsideReturns = returns.filter((r) => r < 0);
  const downsideVariance = downsideReturns.reduce((sum, val) => sum + Math.pow(val - avgReturn, 2), 0) / (downsideReturns.length || 1);
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0;

  // Calculate Monthly Returns Mapping
  const monthlyReturns: Record<number, Record<number, number>> = {};
  for (const t of trades) {
    if (!t.exitTime) continue;
    const date = new Date(t.exitTime);
    const year = date.getFullYear() || 2026;
    const month = date.getMonth();

    if (!monthlyReturns[year]) {
      monthlyReturns[year] = {};
    }
    const currentMonthPnL = monthlyReturns[year][month] || 0;
    const pnlPercent = (t.pnl / initialBalance) * 100;
    monthlyReturns[year][month] = parseFloat((currentMonthPnL + pnlPercent).toFixed(2));
  }

  // Generate Monte Carlo Paths
  const monteCarloPaths: number[][] = [];
  if (trades.length > 0) {
    for (let p = 0; p < 15; p++) {
      const shuffled = [...trades].sort(() => Math.random() - 0.5);
      const path: number[] = [initialBalance];
      let bal = initialBalance;
      for (const t of shuffled) {
        bal += t.pnl;
        path.push(parseFloat(bal.toFixed(2)));
      }
      monteCarloPaths.push(path);
    }
  }

  return {
    trades,
    metrics: {
      netProfit: parseFloat(netProfit.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      grossLoss: parseFloat(grossLoss.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(1)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
      initialBalance,
      finalBalance: balance,
    },
    equityCurve,
    monthlyReturns,
    monteCarloPaths,
  };
}

export interface SimAccountState {
  balance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  unrealizedPnL: number;
  realizedPnL: number;
  initialBalance: number;
}

export interface SimPositionState {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  isLong: boolean;
  slPrice: number | null;
  tpPrice: number | null;
  unrealizedPnL: number;
}

export interface SimOrder {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  mode: 'limit' | 'stop' | 'stop_limit';
  qty: number;
  price: number;
  stopPrice: number | null;
}

// Tick simulation processor that checks limit/stop triggers and computes margins
export function processSimulationTick(
  currentCandle: Candle,
  account: SimAccountState,
  position: SimPositionState | null,
  orders: SimOrder[],
  leverage: number,
  commissionRate = 0.0005,
  slippageRate = 0.001
): {
  nextAccount: SimAccountState;
  nextPosition: SimPositionState | null;
  nextOrders: SimOrder[];
  filledTrades: Trade[];
} {
  let balance = account.balance;
  let realizedPnL = account.realizedPnL;
  let nextPosition = position ? { ...position } : null;
  const nextOrders: SimOrder[] = [];
  const filledTrades: Trade[] = [];

  const price = currentCandle.close;
  const high = currentCandle.high;
  const low = currentCandle.low;

  // 1. Check stop loss / take profit triggers on current position
  if (nextPosition) {
    let triggered = false;
    let exitPrice = price;
    let triggerType = '';

    // Check Stop Loss
    if (nextPosition.slPrice !== null) {
      if (nextPosition.isLong && low <= nextPosition.slPrice) {
        triggered = true;
        exitPrice = nextPosition.slPrice * (1 - slippageRate); // slippage against us
        triggerType = 'STOP LOSS';
      } else if (!nextPosition.isLong && high >= nextPosition.slPrice) {
        triggered = true;
        exitPrice = nextPosition.slPrice * (1 + slippageRate);
        triggerType = 'STOP LOSS';
      }
    }

    // Check Take Profit
    if (!triggered && nextPosition.tpPrice !== null) {
      if (nextPosition.isLong && high >= nextPosition.tpPrice) {
        triggered = true;
        exitPrice = nextPosition.tpPrice * (1 - slippageRate);
        triggerType = 'TAKE PROFIT';
      } else if (!nextPosition.isLong && low <= nextPosition.tpPrice) {
        triggered = true;
        exitPrice = nextPosition.tpPrice * (1 + slippageRate);
        triggerType = 'TAKE PROFIT';
      }
    }

    if (triggered) {
      // Execute exit
      const val = exitPrice * nextPosition.qty;
      const commission = val * commissionRate;
      const pnl = nextPosition.isLong
        ? (exitPrice - nextPosition.avgEntryPrice) * nextPosition.qty - commission
        : (nextPosition.avgEntryPrice - exitPrice) * nextPosition.qty - commission;

      balance += pnl;
      realizedPnL += pnl;

      filledTrades.push({
        id: Math.random().toString(36).substring(4, 9),
        type: nextPosition.isLong ? 'BUY' : 'SELL',
        entryPrice: nextPosition.avgEntryPrice,
        exitPrice,
        entryTime: currentCandle.time,
        exitTime: currentCandle.time,
        pnl,
        pnlPercent: ((exitPrice - nextPosition.avgEntryPrice) / nextPosition.avgEntryPrice) * 100 * (nextPosition.isLong ? 1 : -1),
        status: 'CLOSED',
      });

      nextPosition = null;
    }
  }

  // 2. Process limit and stop orders queue
  for (const ord of orders) {
    let filled = false;
    let fillPrice = ord.price;

    if (ord.mode === 'limit') {
      if (ord.type === 'BUY' && low <= ord.price) {
        filled = true;
        fillPrice = ord.price * (1 + slippageRate); // add entry slippage
      } else if (ord.type === 'SELL' && high >= ord.price) {
        filled = true;
        fillPrice = ord.price * (1 - slippageRate);
      }
    } else if (ord.mode === 'stop') {
      const stopPriceVal = ord.stopPrice ?? ord.price;
      if (ord.type === 'BUY' && high >= stopPriceVal) {
        filled = true;
        fillPrice = stopPriceVal * (1 + slippageRate);
      } else if (ord.type === 'SELL' && low <= stopPriceVal) {
        filled = true;
        fillPrice = stopPriceVal * (1 - slippageRate);
      }
    }

    if (filled) {
      // Open / average position
      const val = fillPrice * ord.qty;
      const commission = val * commissionRate;
      balance -= commission;

      if (!nextPosition) {
        nextPosition = {
          symbol: ord.symbol,
          qty: ord.qty,
          avgEntryPrice: fillPrice,
          isLong: ord.type === 'BUY',
          slPrice: null,
          tpPrice: null,
          unrealizedPnL: 0,
        };
      } else {
        // Position scaling (average entry)
        if (nextPosition.isLong === (ord.type === 'BUY')) {
          const totalQty = nextPosition.qty + ord.qty;
          nextPosition.avgEntryPrice = (nextPosition.avgEntryPrice * nextPosition.qty + fillPrice * ord.qty) / totalQty;
          nextPosition.qty = totalQty;
        } else {
          // Reduce position size / reverse
          if (ord.qty >= nextPosition.qty) {
            // Reverse position
            const remainingQty = ord.qty - nextPosition.qty;
            if (remainingQty > 0) {
              nextPosition = {
                symbol: ord.symbol,
                qty: remainingQty,
                avgEntryPrice: fillPrice,
                isLong: ord.type === 'BUY',
                slPrice: null,
                tpPrice: null,
                unrealizedPnL: 0,
              };
            } else {
              nextPosition = null;
            }
          } else {
            // Partial close
            nextPosition.qty -= ord.qty;
          }
        }
      }
    } else {
      nextOrders.push(ord);
    }
  }

  // 3. Compute active floating margins
  let unrealizedPnL = 0;
  let marginUsed = 0;

  if (nextPosition) {
    const posVal = price * nextPosition.qty;
    marginUsed = posVal / leverage;
    unrealizedPnL = nextPosition.isLong
      ? (price - nextPosition.avgEntryPrice) * nextPosition.qty
      : (nextPosition.avgEntryPrice - price) * nextPosition.qty;

    nextPosition.unrealizedPnL = parseFloat(unrealizedPnL.toFixed(2));
  }

  const equity = balance + unrealizedPnL;
  const freeMargin = equity - marginUsed;

  const nextAccount: SimAccountState = {
    balance: parseFloat(balance.toFixed(2)),
    equity: parseFloat(equity.toFixed(2)),
    marginUsed: parseFloat(marginUsed.toFixed(2)),
    freeMargin: parseFloat(freeMargin.toFixed(2)),
    unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
    realizedPnL: parseFloat(realizedPnL.toFixed(2)),
    initialBalance: account.initialBalance,
  };

  return {
    nextAccount,
    nextPosition,
    nextOrders,
    filledTrades,
  };
}
