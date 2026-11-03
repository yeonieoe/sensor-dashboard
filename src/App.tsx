import { useEffect, useMemo, useRef, useState } from "react"
import { createClient, type RealtimeChannel } from "@supabase/supabase-js"

const MAX_HISTORY = 100
const DEFAULT_VALUES = [
  2.31, 2.36, 2.34, 2.4, 2.42, 2.39, 2.43, 2.45, 2.41, 2.44, 2.43, 2.43,
]

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })
    : null

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 12h3l2.2-6 4 12 2.4-8 1.8 2H21"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5.5 14.5 14.5 5.5M8 5.5h6.5V12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="m5 10.2 3.1 3L15.4 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export default function App() {
  const [history, setHistory] = useState<number[]>(DEFAULT_VALUES)
  const [latestValue, setLatestValue] = useState<number>(
    DEFAULT_VALUES[DEFAULT_VALUES.length - 1],
  )
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [errorMessage, setErrorMessage] = useState("")

  const portRef = useRef<any>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const bufferRef = useRef("")

  const updateFromSerialValue = (value: number) => {
    setHistory((prev) => [...prev, value].slice(-MAX_HISTORY))
    setLatestValue(value)
    setLastUpdated(new Date())
  }

  const updateFromSupabaseValue = (value: number) => {
    setHistory((prev) => {
      const next = [...prev, value].slice(-MAX_HISTORY)
      return next
    })
    setLatestValue(value)
    setLastUpdated(new Date())
  }

  const stopSerialConnection = async () => {
    const reader = readerRef.current
    if (reader) {
      try {
        await reader.cancel()
      } catch {
        // Ignore cancellation errors when closing the port.
      }
      try {
        reader.releaseLock()
      } catch {
        // Ignore release-lock errors.
      }
      readerRef.current = null
    }

    const port = portRef.current
    if (port) {
      try {
        await port.close()
      } catch {
        // Ignore close errors.
      }
      portRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
  }

  const handleIncomingText = (chunk: string) => {
    const combined = `${bufferRef.current}${chunk}`
    const parts = combined.split(/\r?\n/)
    bufferRef.current = parts.pop() ?? ""

    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) {
        continue
      }

      const numericValue = Number(trimmed)
      if (!Number.isFinite(numericValue)) {
        continue
      }

      updateFromSerialValue(numericValue)
    }
  }

  const connectSerial = async () => {
    if (!("serial" in navigator)) {
      setErrorMessage("이 브라우저는 Web Serial API를 지원하지 않습니다. Chrome 또는 Edge를 사용하세요.")
      return
    }

    setIsConnecting(true)
    setErrorMessage("")

    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })

      portRef.current = port
      setIsConnected(true)
      bufferRef.current = ""

      const reader = port.readable.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }

        handleIncomingText(decoder.decode(value, { stream: true }))
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "시리얼 포트 연결에 실패했습니다.",
      )
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
      if (portRef.current) {
        await stopSerialConnection()
      }
    }
  }

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setErrorMessage(
        "Supabase 환경 변수가 비어 있습니다. GitHub Pages 배포용 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 확인하세요.",
      )
      return
    }

    if (!supabase) {
      setErrorMessage("Supabase 클라이언트를 초기화하지 못했습니다.")
      return
    }

    let channel: RealtimeChannel | null = null
    let isMounted = true

    const loadRecentValues = async () => {
      try {
        const { data, error } = await supabase
          .from("readings")
          .select("value")
          .order("id", { ascending: false })
          .limit(MAX_HISTORY)

        if (error) {
          throw error
        }

        const values = (data ?? [])
          .map((row) => Number((row as { value?: number | string }).value))
          .filter(Number.isFinite)
          .reverse()

        if (!isMounted) {
          return
        }

        if (values.length === 0) {
          setHistory(DEFAULT_VALUES)
          setLatestValue(DEFAULT_VALUES[DEFAULT_VALUES.length - 1])
          setLastUpdated(new Date())
          return
        }

        const recent = values.slice(-MAX_HISTORY)
        setHistory(recent)
        setLatestValue(recent[recent.length - 1])
        setLastUpdated(new Date())
        setErrorMessage("")
      } catch (error) {
        if (!isMounted) {
          return
        }

        const message =
          error instanceof Error
            ? error.message
            : "Supabase 데이터 로드에 실패했습니다."
        setErrorMessage(`Supabase 연결 오류: ${message}`)
      }
    }

    void loadRecentValues()

    try {
      channel = supabase
        .channel("readings-live")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "readings",
          },
          (payload) => {
            const nextValue = Number((payload.new as { value?: number | string })?.value)
            if (!Number.isFinite(nextValue)) {
              return
            }

            updateFromSupabaseValue(nextValue)
            setErrorMessage("")
          },
        )

      void channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setErrorMessage("")
          return
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setErrorMessage(
            err
              ? `Supabase Realtime 구독 실패: ${err.message}`
              : "Supabase Realtime 구독에 실패했습니다. Supabase 프로젝트 상태와 RLS를 확인하세요.",
          )
        }
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Supabase Realtime 구독을 시작할 수 없습니다."
      setErrorMessage(`Supabase 구독 오류: ${message}`)
    }

    return () => {
      isMounted = false
      if (channel) {
        void supabase.removeChannel(channel)
      }
      void stopSerialConnection()
    }
  }, [])

  const chart = useMemo(() => {
    const width = 900
    const height = 280
    const source = history.length > 0 ? history : [latestValue]
    const minValue = Math.min(...source)
    const maxValue = Math.max(...source)
    const rangeValue = Math.max(maxValue - minValue, 0.1)
    const paddedMin = minValue - rangeValue * 0.2
    const paddedMax = maxValue + rangeValue * 0.2

    const points = source.map((value, index) => ({
      x:
        source.length === 1
          ? width / 2
          : (index / (source.length - 1)) * width,
      y:
        height -
        ((value - paddedMin) / (paddedMax - paddedMin || 1)) * height,
      value,
    }))

    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ")
    const area = `${line} L ${width} ${height} L 0 ${height} Z`
    const labels = [0, 1, 2, 3].map((item) => {
      const value = paddedMax - ((paddedMax - paddedMin) / 3) * item
      return value.toFixed(2)
    })

    return { width, height, points, line, area, labels }
  }, [history, latestValue])

  const average = (
    history.reduce((sum, value) => sum + value, 0) / history.length
  ).toFixed(2)
  const minimum = Math.min(...history).toFixed(2)
  const maximum = Math.max(...history).toFixed(2)

  return (
    <main className="min-h-screen bg-[#f5f7f9] text-[#182228]">
      <header className="border-b border-[#dfe5e8] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#166b59] text-white shadow-[0_6px_16px_rgba(22,107,89,0.2)]">
              <PulseIcon />
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-[-0.02em]">
                압력 모니터링
              </h1>
              <p className="mt-0.5 text-xs text-[#718087]">PRESSURE MONITOR</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isConnected || isConnecting) {
                  void stopSerialConnection()
                  return
                }
                void connectSerial()
              }}
              disabled={isConnecting}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isConnected
                  ? "bg-[#e8f6f1] text-[#185f51] ring-1 ring-[#b8dfd0]"
                  : "bg-[#166b59] text-white shadow-[0_8px_20px_rgba(22,107,89,0.2)]"
              } ${isConnecting ? "cursor-wait opacity-80" : ""}`}
            >
              {isConnecting ? "연결 중..." : isConnected ? "시리얼 해제" : "시리얼 연결"}
            </button>

            <div
              className={`flex items-center gap-2.5 rounded-full border py-2 pl-2.5 pr-4 ${
                isConnected
                  ? "border-[#dce7e3] bg-[#f7fbf9]"
                  : "border-[#e8d9d7] bg-[#fff7f5]"
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${
                    isConnected ? "animate-ping bg-[#2a9d78]" : "bg-[#d9745c]"
                  }`}
                />
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    isConnected ? "bg-[#23866b]" : "bg-[#cf725d]"
                  }`}
                />
              </span>
              <span
                className={`text-xs font-semibold ${
                  isConnected ? "text-[#286b5c]" : "text-[#9b5d52]"
                }`}
              >
                {isConnected ? "센서 연결됨" : "연결 대기"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-11">
        <div className="mb-7 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.14em] text-[#23866b]">
              LIVE DASHBOARD
            </p>
            <h2 className="text-2xl font-bold tracking-[-0.035em] sm:text-[30px]">
              센서 데이터 현황
            </h2>
          </div>
          <p className="text-sm text-[#728087]">
            마지막 업데이트 · {lastUpdated.toLocaleTimeString("ko-KR", { hour12: false })}
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-xl border border-[#f0d8d0] bg-[#fff5f3] px-4 py-3 text-sm text-[#8a4d3d]">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,2.2fr)]">
          <article className="relative overflow-hidden rounded-[22px] bg-[#145d50] p-7 text-white shadow-[0_18px_45px_rgba(20,75,65,0.18)] sm:p-8">
            <div className="absolute -right-16 -top-14 h-52 w-52 rounded-full border-[38px] border-white/[0.035]" />
            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#1b7462] opacity-70 blur-2xl" />
            <div className="relative flex min-h-[340px] flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white/65">현재 압력</p>
                  <p className="mt-1 text-xs text-white/45">PRESSURE 01</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#c4f1df]">
                  {isConnected ? "실시간 모니터링" : "대기 중"}
                </span>
              </div>

              <div className="my-auto py-9">
                <div className="flex items-end gap-3">
                  <strong className="text-[72px] font-semibold leading-none tracking-[-0.065em] sm:text-[84px]">
                    {Number.isFinite(latestValue) ? latestValue.toFixed(2) : "--"}
                  </strong>
                  <span className="mb-2 text-xl font-medium text-white/60">
                    bar
                  </span>
                </div>
                <div className="mt-5 flex w-fit items-center gap-1.5 rounded-lg bg-[#257563] px-2.5 py-1.5 text-xs font-semibold text-[#d9fff1]">
                  <ArrowUpRightIcon />
                  <span>
                    {history.length > 1
                      ? `${(latestValue - history[Math.max(history.length - 2, 0)]).toFixed(2)} bar`
                      : "0.00 bar"}
                  </span>
                  <span className="font-normal text-white/55">최근 값</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <div className="mb-2.5 flex items-center justify-between text-xs">
                  <span className="text-white/55">안전 범위</span>
                  <span className="font-medium text-white/85">
                    1.80 — 2.80 bar
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-black/20">
                  <div
                    className="h-full rounded-full bg-[#78dcb8]"
                    style={{ width: `${Math.min(Math.max((latestValue / 3) * 100, 10), 100)}%` }}
                  />
                  <span className="absolute right-[38%] top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-white shadow" />
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[22px] border border-[#e0e6e8] bg-white p-5 shadow-[0_10px_32px_rgba(31,48,54,0.055)] sm:p-7 lg:p-8">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-lg font-bold tracking-[-0.025em]">
                  실시간 압력 변화
                </h3>
                <p className="mt-1.5 text-sm text-[#78868c]">
                  최근 100개 데이터 포인트
                </p>
              </div>
              <div className="rounded-lg bg-[#f1f4f5] px-3 py-2 text-xs font-semibold text-[#185f51]">
                최근 100개
              </div>
            </div>

            <div className="flex min-h-[290px]">
              <div className="flex w-12 shrink-0 flex-col justify-between pb-7 pr-3 text-right text-[11px] text-[#89969b]">
                {chart.labels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="relative h-[250px] w-full">
                  <div className="absolute inset-0 flex flex-col justify-between pb-px">
                    {[0, 1, 2, 3].map((line) => (
                      <div
                        key={line}
                        className="border-t border-dashed border-[#dfe5e7]"
                      />
                    ))}
                  </div>
                  <svg
                    viewBox={`0 0 ${chart.width} ${chart.height}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full overflow-visible"
                    role="img"
                    aria-label="최근 100개 압력 변화 그래프"
                  >
                    <defs>
                      <linearGradient
                        id="chart-fill"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#21856d"
                          stopOpacity=".24"
                        />
                        <stop
                          offset="100%"
                          stopColor="#21856d"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <path d={chart.area} fill="url(#chart-fill)" />
                    <path
                      d={chart.line}
                      fill="none"
                      stroke="#1f806a"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="4"
                      vectorEffect="non-scaling-stroke"
                    />
                    {chart.points.map((point, index) => (
                      <g key={`point-${index}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="11"
                          fill="transparent"
                        >
                          <title>{point.value.toFixed(2)} bar</title>
                        </circle>
                        {(index === chart.points.length - 1 || index === 0) && (
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="white"
                            stroke="#1f806a"
                            strokeWidth="3"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="mt-3 flex justify-between text-[10px] text-[#89969b] sm:text-[11px]">
                  {["0", "25", "50", "75", "100"].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { label: "평균 압력", value: average, note: "최근 100개 기준" },
            { label: "최저 압력", value: minimum, note: "최근 100개 기준" },
            { label: "최고 압력", value: maximum, note: "최근 100개 기준" },
          ].map((stat) => (
            <article
              key={stat.label}
              className="flex items-center justify-between rounded-2xl border border-[#e0e6e8] bg-white px-6 py-5 shadow-[0_6px_22px_rgba(31,48,54,0.035)]"
            >
              <div>
                <p className="text-xs font-medium text-[#7c898f]">
                  {stat.label}
                </p>
                <p className="mt-1.5 text-2xl font-bold tracking-[-0.03em]">
                  {stat.value}
                  <span className="ml-1.5 text-xs font-medium text-[#8a979c]">
                    bar
                  </span>
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf6f1] text-[#23866b]">
                <CheckIcon />
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
