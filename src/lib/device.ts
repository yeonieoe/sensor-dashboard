import type { RealtimeChannel } from '@supabase/supabase-js'
import { DEVICE_ID, MAX_POINTS, SENSOR_MAX, SENSOR_MIN } from '../product'
import { db, isDemoMode } from './supabase'

export type Reading = { value: number; created_at: string }
export type Status = 'disconnected' | 'connecting' | 'connected' | 'error'

type ConnectOptions = {
  onInit: (rows: Reading[]) => void
  onReading: (row: Reading) => void
  onStatus: (status: Status) => void
}

let channel: RealtimeChannel | null = null
let pollingTimer: number | null = null
let demoTimer: number | null = null
let demoPower = false
let activeOptions: ConnectOptions | null = null
let latestTimestamp = ''

const clearTimers = () => {
  if (pollingTimer !== null) window.clearInterval(pollingTimer)
  if (demoTimer !== null) window.clearInterval(demoTimer)
  pollingTimer = null
  demoTimer = null
}

const toReading = (row: {
  id?: number | string
  value?: number | string
  created_at?: string
}) => {
  const value = Number(row.value)
  if (!Number.isFinite(value)) return null

  return {
    value,
    created_at: row.created_at ?? String(row.id ?? Date.now()),
  }
}

const loadRecentReadings = async () => {
  if (!db || !activeOptions) return

  const { data, error } = await db
    .from('readings')
    .select('id, value')
    .order('id', { ascending: false })
    .limit(MAX_POINTS)

  if (error) throw error

  const rows = (data ?? [])
    .map(toReading)
    .filter((row): row is Reading => row !== null)
    .reverse()

  latestTimestamp = rows.at(-1)?.created_at ?? latestTimestamp
  activeOptions.onInit(rows)
}

const pollLatestReading = async () => {
  if (!db || !activeOptions) return

  const { data, error } = await db
    .from('readings')
    .select('id, value')
    .order('id', { ascending: false })
    .limit(1)

  if (error) {
    activeOptions.onStatus('error')
    return
  }

  const row = toReading(data?.[0] ?? {})
  if (row && row.created_at !== latestTimestamp) {
    latestTimestamp = row.created_at
    activeOptions.onReading(row)
  }
}

const startPolling = () => {
  if (pollingTimer !== null) window.clearInterval(pollingTimer)
  pollingTimer = window.setInterval(() => {
    void pollLatestReading()
  }, 1000)
}

const startDemo = (options: ConnectOptions) => {
  const startedAt = Date.now()
  options.onInit([])
  options.onStatus('connected')

  demoTimer = window.setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000
    const center = (SENSOR_MAX + SENSOR_MIN) / 2
    const amplitude = (SENSOR_MAX - SENSOR_MIN) * 0.42
    const value = Math.round(center + Math.sin(elapsed * 0.72) * amplitude)

    options.onReading({
      value,
      created_at: new Date().toISOString(),
    })
  }, 500)
}

export async function connectSensor(options: ConnectOptions): Promise<void> {
  await disconnectSensor()
  activeOptions = options
  options.onStatus('connecting')

  if (isDemoMode || !db) {
    startDemo(options)
    return
  }

  try {
    await loadRecentReadings()

    channel = db
      .channel('readings-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'readings',
        },
        (payload) => {
          const row = toReading(payload.new)
          if (!row || !activeOptions) return

          latestTimestamp = row.created_at
          activeOptions.onReading(row)
        },
      )

    channel.subscribe((subscriptionStatus) => {
      if (!activeOptions) return

      if (subscriptionStatus === 'SUBSCRIBED') {
        activeOptions.onStatus('connected')
        return
      }

      if (
        subscriptionStatus === 'CHANNEL_ERROR' ||
        subscriptionStatus === 'TIMED_OUT'
      ) {
        activeOptions.onStatus('error')
        startPolling()
      }
    })
  } catch {
    options.onStatus('error')
    startPolling()
  }
}

export async function disconnectSensor(): Promise<void> {
  clearTimers()

  if (channel && db) {
    await db.removeChannel(channel)
  }

  channel = null
  activeOptions = null
}

export async function setLedPower(on: boolean): Promise<boolean> {
  if (isDemoMode || !db) {
    demoPower = on
    return true
  }

  const { error } = await db
    .from('device_state')
    .upsert(
      {
        device_id: DEVICE_ID,
        led_on: on,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id' },
    )

  return !error
}

export async function loadPower(): Promise<boolean> {
  if (isDemoMode || !db) return demoPower

  const { data, error } = await db
    .from('device_state')
    .select('led_on')
    .eq('device_id', DEVICE_ID)
    .maybeSingle()

  if (error) return false
  return Boolean(data?.led_on)
}
