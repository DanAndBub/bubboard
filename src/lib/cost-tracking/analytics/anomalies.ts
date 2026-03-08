import { mean, standardDeviation, zScore, quantile } from 'simple-statistics'

export interface AnomalyResult {
  index: number
  date: string
  cost: number
  type: 'spike' | 'iqr_outlier' | 'drift'
  severity: number
  detail: string
}

type DailyCost = { date: string; cost: number }

export function detectSpikes(dailyCosts: DailyCost[], threshold = 2.5): AnomalyResult[] {
  if (dailyCosts.length === 0) return []

  const costs = dailyCosts.map(d => d.cost)
  const avg = mean(costs)
  const stddev = standardDeviation(costs)

  if (stddev === 0) return []

  const results: AnomalyResult[] = []
  for (let i = 0; i < dailyCosts.length; i++) {
    const { date, cost } = dailyCosts[i]
    const z = zScore(cost, avg, stddev)
    if (Math.abs(z) > threshold) {
      results.push({
        index: i,
        date,
        cost,
        type: 'spike',
        severity: Math.abs(z),
        detail: `Cost $${cost.toFixed(2)} is ${Math.abs(z).toFixed(1)}σ ${z > 0 ? 'above' : 'below'} average ($${avg.toFixed(2)}/day)`,
      })
    }
  }
  return results
}

export function detectIQROutliers(dailyCosts: DailyCost[]): AnomalyResult[] {
  if (dailyCosts.length === 0) return []

  const sorted = dailyCosts.map(d => d.cost).sort((a, b) => a - b)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const iqr = q3 - q1
  const lowerFence = q1 - 1.5 * iqr
  const upperFence = q3 + 1.5 * iqr

  const results: AnomalyResult[] = []
  for (let i = 0; i < dailyCosts.length; i++) {
    const { date, cost } = dailyCosts[i]
    if (cost > upperFence) {
      results.push({
        index: i,
        date,
        cost,
        type: 'iqr_outlier',
        severity: iqr > 0 ? (cost - upperFence) / iqr : 1,
        detail: `Cost $${cost.toFixed(2)} exceeds IQR upper fence ($${upperFence.toFixed(2)})`,
      })
    } else if (cost < lowerFence) {
      results.push({
        index: i,
        date,
        cost,
        type: 'iqr_outlier',
        severity: iqr > 0 ? (lowerFence - cost) / iqr : 1,
        detail: `Cost $${cost.toFixed(2)} is below IQR lower fence ($${lowerFence.toFixed(2)})`,
      })
    }
  }
  return results
}

export function detectDrift(dailyCosts: DailyCost[], windowSize = 7, threshold = 0.5): AnomalyResult[] {
  if (dailyCosts.length <= windowSize) return []

  const results: AnomalyResult[] = []
  for (let i = windowSize; i < dailyCosts.length; i++) {
    const window = dailyCosts.slice(i - windowSize, i).map(d => d.cost)
    const rollingAvg = mean(window)
    const { date, cost } = dailyCosts[i]

    if (cost > rollingAvg * (1 + threshold)) {
      const pct = ((cost - rollingAvg) / rollingAvg) * 100
      results.push({
        index: i,
        date,
        cost,
        type: 'drift',
        severity: (cost - rollingAvg) / rollingAvg,
        detail: `Cost $${cost.toFixed(2)} is ${pct.toFixed(0)}% above ${windowSize}-day rolling average ($${rollingAvg.toFixed(2)})`,
      })
    }
  }
  return results
}

export function detectAllAnomalies(dailyCosts: DailyCost[]): AnomalyResult[] {
  const all = [
    ...detectSpikes(dailyCosts),
    ...detectIQROutliers(dailyCosts),
    ...detectDrift(dailyCosts),
  ]

  const byIndex = new Map<number, AnomalyResult>()
  for (const anomaly of all) {
    const existing = byIndex.get(anomaly.index)
    if (!existing || anomaly.severity > existing.severity) {
      byIndex.set(anomaly.index, anomaly)
    }
  }

  return Array.from(byIndex.values()).sort((a, b) => a.index - b.index)
}
