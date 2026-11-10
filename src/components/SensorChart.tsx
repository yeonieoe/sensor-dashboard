import { useEffect, useRef, useState } from 'react'
import type { Reading } from '../lib/device'
import { SENSOR_MAX, SENSOR_MIN } from '../product'

type Props = {
  readings: Reading[]
}

const HEIGHT = 200
const PADDING = { left: 40, right: 8, top: 8, bottom: 20 }
const toPercent = (value: number) =>
  Math.round(
    Math.min(1, Math.max(0, (value - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN))) *
      100,
  )

export default function SensorChart({ readings }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })

    observer.observe(container)
    setWidth(container.clientWidth)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right)
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const points = readings
    .map((reading, index) => {
      const x =
        PADDING.left +
        (readings.length < 2 ? plotWidth : (index / (readings.length - 1)) * plotWidth)
      const ratio = toPercent(reading.value) / 100
      const y = PADDING.top + plotHeight - ratio * plotHeight
      return `${x},${y}`
    })
    .join(' ')
  const current = readings.at(-1)?.value
  const currentPercent = current === undefined ? undefined : toPercent(current)

  return (
    <section className="chart-section" aria-label="실시간 센서값">
      <div className="chart-container" ref={containerRef}>
        {readings.length === 0 ? (
          <p className="t-body chart-empty">센서를 연결하면 값이 여기에 그려집니다.</p>
        ) : (
          <svg
            className="sensor-chart"
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label={`센서값 추이, 현재 ${currentPercent}%`}
          >
            {[100, 50, 0].map((tick) => {
              const ratio = tick / 100
              const y = PADDING.top + plotHeight - ratio * plotHeight

              return (
                <g key={tick}>
                  <line
                    x1={PADDING.left}
                    x2={width - PADDING.right}
                    y1={y}
                    y2={y}
                    className="chart-grid-line"
                  />
                  <text x={PADDING.left - PADDING.right} y={y + 4} className="chart-label">
                    {tick}%
                  </text>
                </g>
              )
            })}
            <polyline points={points} className="chart-line" />
            <text x={PADDING.left} y={HEIGHT - 2} className="chart-time">
              −60s
            </text>
            <text
              x={width - PADDING.right}
              y={HEIGHT - 2}
              textAnchor="end"
              className="chart-time"
            >
              지금
            </text>
          </svg>
        )}
      </div>
    </section>
  )
}
