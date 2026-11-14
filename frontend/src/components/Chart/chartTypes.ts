export type ChartType = 'candles' | 'line' | 'area'

export const chartTypes: { value: ChartType; label: string }[] = [
  { value: 'candles', label: 'Candles' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
]