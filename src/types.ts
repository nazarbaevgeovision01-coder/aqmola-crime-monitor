export type SourceType = 'ROAD_POLICE' | 'LOCAL_POLICE' | 'AUTOMATED_SYSTEMS' | 'OTHER'
export type CrimeRecord = { id: string; date: string; region: string; district: string; source_type: SourceType; source_name: string; category: string; indicator: string; value: number; unit: string; data_status: string }
