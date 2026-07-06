import { Candle } from './simulationData';

export interface PinePlot {
  title: string;
  color: string;
  series: (number | null)[];
}

export interface PineShape {
  index: number;
  time: string;
  price: number;
  type: 'BUY' | 'SELL';
  color: string;
}

export interface CompiledPineScript {
  name: string;
  type: 'indicator' | 'strategy';
  plots: PinePlot[];
  shapes: PineShape[];
  signals: Array<{ index: number; type: 'BUY' | 'SELL' }>;
  error?: string;
}

// Simple Helper to evaluate moving averages on arbitrary slices
function getSMA(series: (number | null)[], period: number, idx: number): number | null {
  if (idx < period - 1) return null;
  let sum = 0;
  let count = 0;
  for (let i = idx - period + 1; i <= idx; i++) {
    const val = series[i];
    if (val !== null && val !== undefined) {
      sum += val;
      count++;
    }
  }
  return count === period ? parseFloat((sum / period).toFixed(2)) : null;
}

function getEMA(series: (number | null)[], period: number, idx: number, prevEMA: number | null): number | null {
  if (idx < period - 1) return null;
  const val = series[idx];
  if (val === null || val === undefined) return null;
  
  if (idx === period - 1 || prevEMA === null) {
    return getSMA(series, period, idx);
  }
  const k = 2 / (period + 1);
  return parseFloat((val * k + prevEMA * (1 - k)).toFixed(2));
}

function getRSI(series: (number | null)[], period: number, idx: number, history: { avgGain: number; avgLoss: number }[]): number | null {
  if (idx < period) return null;
  
  const curr = series[idx];
  const prev = series[idx - 1];
  if (curr === null || curr === undefined || prev === null || prev === undefined) return null;

  const diff = curr - prev;
  const gain = diff > 0 ? diff : 0;
  const loss = diff < 0 ? -diff : 0;

  if (idx === period) {
    let gainsSum = 0;
    let lossesSum = 0;
    for (let i = 1; i <= period; i++) {
      const d = (series[i] || 0) - (series[i - 1] || 0);
      if (d > 0) gainsSum += d;
      else lossesSum -= d;
    }
    const avgGain = gainsSum / period;
    const avgLoss = lossesSum / period;
    history[idx] = { avgGain, avgLoss };
    const rs = avgGain / (avgLoss || 1);
    return avgLoss === 0 ? 100 : parseFloat((100 - 100 / (1 + rs)).toFixed(2));
  }

  const prevHist = history[idx - 1] || { avgGain: 0, avgLoss: 0 };
  const avgGain = (prevHist.avgGain * (period - 1) + gain) / period;
  const avgLoss = (prevHist.avgLoss * (period - 1) + loss) / period;
  history[idx] = { avgGain, avgLoss };

  const rs = avgGain / (avgLoss || 1);
  return avgLoss === 0 ? 100 : parseFloat((100 - 100 / (1 + rs)).toFixed(2));
}

// Main compiler function
export function compilePineScript(code: string, candles: Candle[]): CompiledPineScript {
  const plots: PinePlot[] = [];
  const shapes: PineShape[] = [];
  const signals: Array<{ index: number; type: 'BUY' | 'SELL' }> = [];

  let name = 'Custom Pine Script';
  let type: 'indicator' | 'strategy' = 'indicator';

  // Tokenize lines
  const lines = code.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('//'));

  // Series values map
  const variables: Record<string, (number | null)[]> = {
    open: candles.map((c) => c.open),
    high: candles.map((c) => c.high),
    low: candles.map((c) => c.low),
    close: candles.map((c) => c.close),
    volume: candles.map((c) => c.volume),
  };

  // Helper to resolve expression value at index
  const evaluateExpression = (expr: string, idx: number, rsiHistory: Record<string, any>): any => {
    const cleanExpr = expr.trim();

    // Check basic numerical value
    if (/^\d+(\.\d+)?$/.test(cleanExpr)) {
      return parseFloat(cleanExpr);
    }

    // Check pre-defined variable
    if (variables[cleanExpr]) {
      return variables[cleanExpr][idx];
    }

    // Check EMA call: ta.ema(source, period)
    const emaMatch = cleanExpr.match(/ta\.ema\(([^,]+),\s*(\d+)\)/);
    if (emaMatch) {
      const srcName = emaMatch[1].trim();
      const period = parseInt(emaMatch[2]);
      const srcSeries = variables[srcName] || variables['close'];
      const prevEMA = idx > 0 ? (variables[cleanExpr]?.[idx - 1] ?? null) : null;
      return getEMA(srcSeries, period, idx, prevEMA);
    }

    // Check SMA call: ta.sma(source, period)
    const smaMatch = cleanExpr.match(/ta\.sma\(([^,]+),\s*(\d+)\)/);
    if (smaMatch) {
      const srcName = smaMatch[1].trim();
      const period = parseInt(smaMatch[2]);
      const srcSeries = variables[srcName] || variables['close'];
      return getSMA(srcSeries, period, idx);
    }

    // Check RSI call: ta.rsi(source, period)
    const rsiMatch = cleanExpr.match(/ta\.rsi\(([^,]+),\s*(\d+)\)/);
    if (rsiMatch) {
      const srcName = rsiMatch[1].trim();
      const period = parseInt(rsiMatch[2]);
      const srcSeries = variables[srcName] || variables['close'];
      if (!rsiHistory[cleanExpr]) rsiHistory[cleanExpr] = [];
      return getRSI(srcSeries, period, idx, rsiHistory[cleanExpr]);
    }

    // Check Crossover call: ta.crossover(series1, series2)
    const crossOverMatch = cleanExpr.match(/ta\.crossover\(([^,]+),\s*([^)]+)\)/);
    if (crossOverMatch) {
      if (idx === 0) return false;
      const s1Name = crossOverMatch[1].trim();
      const s2Name = crossOverMatch[2].trim();
      const s1 = variables[s1Name];
      const s2 = variables[s2Name];
      if (!s1 || !s2) return false;
      
      const prevS1 = s1[idx - 1];
      const prevS2 = s2[idx - 1];
      const currS1 = s1[idx];
      const currS2 = s2[idx];

      if (prevS1 === null || prevS2 === null || currS1 === null || currS2 === null) return false;
      return prevS1 <= prevS2 && currS1 > currS2;
    }

    // Check Crossunder call: ta.crossunder(series1, series2)
    const crossUnderMatch = cleanExpr.match(/ta\.crossunder\(([^,]+),\s*([^)]+)\)/);
    if (crossUnderMatch) {
      if (idx === 0) return false;
      const s1Name = crossUnderMatch[1].trim();
      const s2Name = crossUnderMatch[2].trim();
      const s1 = variables[s1Name];
      const s2 = variables[s2Name];
      if (!s1 || !s2) return false;

      const prevS1 = s1[idx - 1];
      const prevS2 = s2[idx - 1];
      const currS1 = s1[idx];
      const currS2 = s2[idx];

      if (prevS1 === null || prevS2 === null || currS1 === null || currS2 === null) return false;
      return prevS1 >= prevS2 && currS1 < currS2;
    }

    return null;
  };

  try {
    // 1. First Pass: Parse script metadata
    for (const line of lines) {
      if (line.startsWith('indicator(') || line.startsWith('study(')) {
        type = 'indicator';
        const match = line.match(/(?:"|')([^"']+)(?:"|')/);
        if (match) name = match[1];
      } else if (line.startsWith('strategy(')) {
        type = 'strategy';
        const match = line.match(/(?:"|')([^"']+)(?:"|')/);
        if (match) name = match[1];
      }
    }

    // Prepare variable arrays
    for (const line of lines) {
      const parts = line.split('=');
      if (parts.length === 2) {
        const varName = parts[0].trim();
        if (!variables[varName]) {
          variables[varName] = new Array(candles.length).fill(null);
        }
      }
    }

    // RSI History caches
    const rsiHistories: Record<string, any> = {};

    // 2. Second Pass: Calculate values candle-by-candle (NO LOOK-AHEAD)
    for (let i = 0; i < candles.length; i++) {
      for (const line of lines) {
        // Variable assignments: varName = expression
        const parts = line.split('=');
        if (parts.length === 2) {
          const varName = parts[0].trim();
          const expr = parts[1].trim();
          const val = evaluateExpression(expr, i, rsiHistories);
          variables[varName][i] = val;
          continue;
        }

        // Plot shape markers: plotshape(series, style, color, title)
        if (line.startsWith('plotshape(')) {
          const paramsMatch = line.match(/plotshape\(([^,)]+)/);
          if (paramsMatch) {
            const seriesName = paramsMatch[1].trim();
            const val = variables[seriesName]?.[i];
            if (val === true) {
              const isBuy = line.includes('triangleup') || line.includes('green') || line.includes('above');
              const isSell = line.includes('triangledown') || line.includes('red') || line.includes('below');

              if (isBuy) {
                shapes.push({
                  index: i,
                  time: candles[i].time,
                  price: candles[i].low,
                  type: 'BUY',
                  color: '#00E676',
                });
                signals.push({ index: i, type: 'BUY' });
              } else if (isSell) {
                shapes.push({
                  index: i,
                  time: candles[i].time,
                  price: candles[i].high,
                  type: 'SELL',
                  color: '#FF3D00',
                });
                signals.push({ index: i, type: 'SELL' });
              }
            }
          }
          continue;
        }

        // Strategy executions: strategy.entry("id", strategy.long, when=series)
        if (line.startsWith('strategy.entry(') || line.startsWith('strategy.close(')) {
          const whenMatch = line.match(/when\s*=\s*([^,)]+)/);
          if (whenMatch) {
            const seriesName = whenMatch[1].trim();
            const val = variables[seriesName]?.[i];
            if (val === true) {
              const isBuy = line.includes('strategy.long') || line.startsWith('strategy.entry(');
              const isSell = line.includes('strategy.short') || line.startsWith('strategy.close(');
              signals.push({ index: i, type: isBuy ? 'BUY' : 'SELL' });
            }
          }
        }
      }
    }

    // 3. Register Plots
    for (const line of lines) {
      if (line.startsWith('plot(')) {
        const match = line.match(/plot\(([^,)]+)/);
        if (match) {
          const varName = match[1].trim();
          const series = variables[varName];
          if (series) {
            let color = '#2979FF';
            if (line.includes('color.red') || line.includes('color=color.red')) color = '#FF3D00';
            else if (line.includes('color.green') || line.includes('color=color.green')) color = '#00E676';
            else if (line.includes('color.yellow') || line.includes('color=color.yellow')) color = '#f2d600';
            else if (line.includes('color.purple') || line.includes('color=color.purple')) color = '#D13BFF';

            plots.push({
              title: varName,
              color,
              series,
            });
          }
        }
      }
    }
  } catch (err: any) {
    return {
      name,
      type,
      plots: [],
      shapes: [],
      signals: [],
      error: err?.message || 'Unknown parsing exception.',
    };
  }

  return {
    name,
    type,
    plots,
    shapes,
    signals,
  };
}
