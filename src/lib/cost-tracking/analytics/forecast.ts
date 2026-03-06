import regression from 'regression';

export interface ForecastResult {
  model: 'linear' | 'exponential';
  r2: number;
  predictions: Array<{ day: number; date: string; predicted_cost: number }>;
  projected_weekly: number;
  projected_monthly: number;
  confidence: 'high' | 'medium' | 'low';
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function r2Confidence(r2: number): 'high' | 'medium' | 'low' {
  if (r2 > 0.8) return 'high';
  if (r2 >= 0.5) return 'medium';
  return 'low';
}

export function forecastCosts(
  dailyCosts: Array<{ date: string; cost: number }>,
  daysAhead: number = 7
): ForecastResult | null {
  if (dailyCosts.length < 7) return null;

  const allZero = dailyCosts.every((d) => d.cost === 0);
  if (allZero) return null;

  const data: [number, number][] = dailyCosts.map((d, i) => [i, d.cost]);

  const linear = regression.linear(data);
  const linearR2 = isNaN(linear.r2) ? -Infinity : linear.r2;

  let expResult: ReturnType<typeof regression.exponential> | null = null;
  let expR2 = -Infinity;
  try {
    expResult = regression.exponential(data);
    expR2 = isNaN(expResult.r2) ? -Infinity : expResult.r2;
  } catch {
    // fall back to linear only
  }

  if (linearR2 === -Infinity && expR2 === -Infinity) return null;

  const useExponential = expResult !== null && expR2 > linearR2;
  const best = useExponential ? expResult! : linear;
  const bestR2 = useExponential ? expR2 : linearR2;
  const model: 'linear' | 'exponential' = useExponential ? 'exponential' : 'linear';

  const lastDate = dailyCosts[dailyCosts.length - 1].date;

  const predictions: ForecastResult['predictions'] = [];
  for (let i = 1; i <= daysAhead; i++) {
    const day = dailyCosts.length + i - 1;
    const date = addDays(lastDate, i);
    const predicted_cost = Math.max(0, best.predict(day)[1]);
    predictions.push({ day, date, predicted_cost });
  }

  const projected_weekly = predictions.slice(0, 7).reduce((sum, p) => sum + p.predicted_cost, 0);
  const projected_monthly = predictions[0].predicted_cost * 30;

  return {
    model,
    r2: bestR2,
    predictions,
    projected_weekly,
    projected_monthly,
    confidence: r2Confidence(bestR2),
  };
}
