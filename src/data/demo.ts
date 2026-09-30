import type { CrimeRecord } from '../types'

export const districts = ['г. Кокшетау', 'г. Степногорск', 'Бурабайский район', 'Астраханский район', 'Целиноградский район', 'Ерейментауский район', 'Зерендинский район', 'Шортандинский район']
const sources = [
  { type: 'ROAD_POLICE', name: 'Дорожная полиция', categories: [['ДТП', 'Количество ДТП', 'случаев'], ['Нарушения ПДД', 'Нарушения ПДД', 'случаев']] },
  { type: 'LOCAL_POLICE', name: 'Участковые инспекторы', categories: [['Общественный порядок', 'Административные правонарушения', 'случаев'], ['Обращения граждан', 'Обращения граждан', 'обращений']] },
  { type: 'AUTOMATED_SYSTEMS', name: 'Автоматические комплексы', categories: [['Нарушения ПДД', 'Зафиксированные нарушения', 'случаев']] },
] as const
const records: CrimeRecord[] = []
for (let month = 0; month < 12; month++) {
  for (let d = 0; d < districts.length; d++) {
    for (let s = 0; s < sources.length; s++) {
      for (let c = 0; c < sources[s].categories.length; c++) {
        const [category, indicator, unit] = sources[s].categories[c]
        const wave = Math.round(14 * Math.sin((month + d * 0.7) / 2) + 18)
        const value = s === 0 && c === 0
          ? Math.round(3 + d * 1.1 + (Math.sin((month + d * 0.7) / 2) + 1) * 2)
          : Math.max(2, 18 + d * 5 + s * 8 + wave + (c ? 11 : 0))
        records.push({ id: `demo-${month}-${d}-${s}-${c}`, date: `2026-${String(month + 1).padStart(2, '0')}-15`, region: 'Акмолинская область', district: districts[d], source_type: sources[s].type, source_name: sources[s].name, category, indicator, value, unit, data_status: 'demo' })
      }
    }
  }
}
export const demoRecords = records
