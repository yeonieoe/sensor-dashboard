import { useMemo, useState } from "react"

type Range = "1시간" | "6시간" | "24시간"

const series: Record<Range, number[]> = {
  "1시간": [
    2.31, 2.36, 2.34, 2.4, 2.42, 2.39, 2.43, 2.45, 2.41, 2.44, 2.43, 2.43,
  ],
  "6시간": [
    2.18, 2.21, 2.25, 2.22, 2.29, 2.35, 2.32, 2.38, 2.41, 2.39, 2.44, 2.43,
  ],
  "24시간": [
    2.22, 2.17, 2.24, 2.31, 2.28, 2.35, 2.42, 2.37, 2.46, 2.4, 2.44, 2.43,
  ],
}

const rangeLabels: Record<Range, string[]> = {
  "1시간": ["13:30", "13:40", "13:50", "14:00", "14:10", "14:20", "14:30"],
  "6시간": ["08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30"],
  "24시간": ["어제 15시", "19시", "23시", "오늘 03시", "07시", "11시", "14시"],
}

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
  const [range, setRange] = useState<Range>("6시간")
  const values = series[range]

  const chart = useMemo(() => {
    const width = 900
    const height = 280
    const min = 2
    const max = 2.6
    const points = values.map((value, index) => ({
      x: (index / (values.length - 1)) * width,
      y: height - ((value - min) / (max - min)) * height,
      value,
    }))
    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ")
    const area = `${line} L ${width} ${height} L 0 ${height} Z`
    return { width, height, points, line, area }
  }, [values])

  const average = (
    values.reduce((sum, value) => sum + value, 0) / values.length
  ).toFixed(2)
  const minimum = Math.min(...values).toFixed(2)
  const maximum = Math.max(...values).toFixed(2)

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
          <div className="flex items-center gap-2.5 rounded-full border border-[#dce7e3] bg-[#f7fbf9] py-2 pl-2.5 pr-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2a9d78] opacity-40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#23866b]" />
            </span>
            <span className="text-xs font-semibold text-[#286b5c]">
              센서 연결됨
            </span>
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
            마지막 업데이트 · 오늘 14:32:08
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,2.2fr)]">
          <article className="relative overflow-hidden rounded-[22px] bg-[#145d50] p-7 text-white shadow-[0_18px_45px_rgba(20,75,65,0.18)] sm:p-8">
            <div className="absolute -right-16 -top-14 h-52 w-52 rounded-full border-[38px] border-white/[0.035]" />
            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#1b7462] opacity-70 blur-2xl" />
            <div className="relative flex min-h-[340px] flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/65">현재 압력</p>
                  <p className="mt-1 text-xs text-white/45">PRESSURE 01</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#c4f1df]">
                  정상 범위
                </span>
              </div>

              <div className="my-auto py-9">
                <div className="flex items-end gap-3">
                  <strong className="text-[72px] font-semibold leading-none tracking-[-0.065em] sm:text-[84px]">
                    2.43
                  </strong>
                  <span className="mb-2 text-xl font-medium text-white/60">
                    bar
                  </span>
                </div>
                <div className="mt-5 flex w-fit items-center gap-1.5 rounded-lg bg-[#257563] px-2.5 py-1.5 text-xs font-semibold text-[#d9fff1]">
                  <ArrowUpRightIcon />
                  <span>0.03 bar</span>
                  <span className="font-normal text-white/55">지난 10분</span>
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
                  <div className="h-full w-[61%] rounded-full bg-[#78dcb8]" />
                  <span className="absolute right-[38%] top-1/2 h-3 w-1 -translate-y-1/2 rounded-full bg-white shadow" />
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[22px] border border-[#e0e6e8] bg-white p-5 shadow-[0_10px_32px_rgba(31,48,54,0.055)] sm:p-7 lg:p-8">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-lg font-bold tracking-[-0.025em]">
                  압력 변화 추이
                </h3>
                <p className="mt-1.5 text-sm text-[#78868c]">
                  시간에 따른 센서 측정값
                </p>
              </div>
              <div className="flex w-fit rounded-lg bg-[#f1f4f5] p-1">
                {(Object.keys(series) as Range[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRange(item)}
                    className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
                      range === item
                        ? "bg-white text-[#185f51] shadow-sm"
                        : "text-[#7a888e] hover:text-[#39474d]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-h-[290px]">
              <div className="flex w-12 shrink-0 flex-col justify-between pb-7 pr-3 text-right text-[11px] text-[#89969b]">
                {["2.6", "2.4", "2.2", "2.0"].map((label) => (
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
                    aria-label={`${range} 동안의 압력 변화 선 그래프`}
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
                      <g key={`${range}-${index}`}>
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
                  {rangeLabels[range].map((label, index) => (
                    <span
                      key={label}
                      className={index % 2 === 1 ? "hidden sm:inline" : ""}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { label: "평균 압력", value: average, note: `${range} 기준` },
            { label: "최저 압력", value: minimum, note: "안전 범위 내" },
            { label: "최고 압력", value: maximum, note: "안전 범위 내" },
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
