import type { CrimeRecord } from '../types'
import { districts } from '../data/demo'

export function groupCount(records: CrimeRecord[], key: (r: CrimeRecord) => string) {
  const result = new Map<string, number>()
  records.forEach(r => result.set(key(r), (result.get(key(r)) ?? 0) + 1))
  return [...result].map(([name, value]) => ({ name, value }))
}
export function groupValue(records: CrimeRecord[], key: (r: CrimeRecord) => string) {
  const result = new Map<string, number>()
  records.forEach(r => result.set(key(r), (result.get(key(r)) ?? 0) + r.value))
  return [...result].map(([name, value]) => ({ name, value }))
}
export function monthlyTrend(records: CrimeRecord[]) {
  const map = new Map<string, number>()
  records.forEach(r => { const month = r.date.slice(0, 7); map.set(month, (map.get(month) ?? 0) + 1) })
  return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month: new Date(`${month}-02`).toLocaleDateString('ru-RU', { month: 'short' }), value }))
}
export const sourceLabels = {
  ROAD_POLICE: 'Дорожная полиция',
  LOCAL_POLICE: 'Участковые',
  AUTOMATED_SYSTEMS: 'Автоматические системы',
  OTHER: 'Другие источники',
} as const

export function monthlySourceTrend(records: CrimeRecord[], from: string, to: string) {
  const counts = new Map<string, Record<keyof typeof sourceLabels, number>>()
  records.forEach(record => {
    const month = record.date.slice(0, 7)
    const row = counts.get(month) ?? { ROAD_POLICE: 0, LOCAL_POLICE: 0, AUTOMATED_SYSTEMS: 0, OTHER: 0 }
    row[record.source_type] += 1
    counts.set(month, row)
  })
  const result: { month: string; ROAD_POLICE: number; LOCAL_POLICE: number; AUTOMATED_SYSTEMS: number; OTHER: number }[] = []
  for (let month = from; month <= to; month = shiftMonth(month, 1)) {
    const row = counts.get(month) ?? { ROAD_POLICE: 0, LOCAL_POLICE: 0, AUTOMATED_SYSTEMS: 0, OTHER: 0 }
    result.push({ month: new Date(`${month}-02`).toLocaleDateString('ru-RU', { month: 'short' }), ...row })
  }
  return result
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function comparePeriods(records: CrimeRecord[], from: string, to: string) {
  const [startYear, startMonth] = from.split('-').map(Number)
  const [endYear, endMonth] = to.split('-').map(Number)
  const months = (endYear - startYear) * 12 + endMonth - startMonth + 1
  const previousFrom = shiftMonth(from, -months)
  const previousTo = shiftMonth(from, -1)
  const currentRecords = records.filter(r => r.date.slice(0, 7) >= from && r.date.slice(0, 7) <= to)
  const previousRecords = records.filter(r => r.date.slice(0, 7) >= previousFrom && r.date.slice(0, 7) <= previousTo)
  const countBySource = (items: CrimeRecord[], source: keyof typeof sourceLabels) => items.filter(r => r.source_type === source).length
  const rows = (Object.keys(sourceLabels) as (keyof typeof sourceLabels)[]).map(source => {
    const current = countBySource(currentRecords, source)
    const previous = countBySource(previousRecords, source)
    return { source, label: sourceLabels[source], current, previous, change: previous ? ((current - previous) / previous) * 100 : null }
  })
  return {
    previousFrom,
    previousTo,
    currentTotal: currentRecords.length,
    previousTotal: previousRecords.length,
    totalChange: previousRecords.length ? ((currentRecords.length - previousRecords.length) / previousRecords.length) * 100 : null,
    rows,
  }
}

export function csvRows(text: string): CrimeRecord[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('В CSV нет строк с данными.')
  const parseLine = (line: string) => { const cells: string[] = []; let value = '', quoted = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++ } else if (ch === '"') quoted = !quoted; else if ((ch === ',' || ch === ';' || ch === '\t') && !quoted) { cells.push(value.trim()); value = '' } else value += ch } cells.push(value.trim()); return cells }
  const header = parseLine(lines[0]).map(x => x.toLowerCase())
  const required = ['date', 'region', 'district', 'source_type', 'source_name', 'category', 'indicator', 'value', 'unit', 'data_status']
  const indexes = Object.fromEntries(required.map(k => [k, header.indexOf(k)]))
  const missing = required.filter(k => indexes[k] < 0)
  if (missing.length) throw new Error(`Не найдены обязательные колонки: ${missing.join(', ')}`)
  return lines.slice(1).map((line, i) => {
    const c = parseLine(line), value = Number(c[indexes.value]); const date = c[indexes.date]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date) throw new Error(`Строка ${i + 2}: дата должна быть действительной датой в формате ГГГГ-ММ-ДД.`)
    if (!Number.isFinite(value) || value < 0) throw new Error(`Строка ${i + 2}: значение должно быть неотрицательным числом.`)
    const item = Object.fromEntries(required.map(k => [k, c[indexes[k]]])) as unknown as CrimeRecord
    if (required.some(k => !String((item as unknown as Record<string, unknown>)[k] ?? '').trim())) throw new Error(`Строка ${i + 2}: есть пустые обязательные поля.`)
    if (!districts.includes(item.district)) throw new Error(`Строка ${i + 2}: неизвестный район «${item.district}».`)
    if (!['ROAD_POLICE', 'LOCAL_POLICE', 'AUTOMATED_SYSTEMS', 'OTHER'].includes(item.source_type)) throw new Error(`Строка ${i + 2}: неизвестный тип источника «${item.source_type}».`)
    item.id = `import-${i}-${date}-${item.district}`; item.value = value
    return item
  })
}
export function downloadCsv(records: CrimeRecord[]) {
  const keys = ['date','region','district','source_type','source_name','category','indicator','value','unit','data_status'] as const
  const quote = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`
  const text = [keys.join(','), ...records.map(r => keys.map(k => quote(r[k])).join(','))].join('\r\n')
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' })); link.download = 'aqmola-statistics.csv'; link.click(); URL.revokeObjectURL(link.href)
}
