import { useState } from 'react'

type Props = {
  power: boolean
  onChange: (nextPower: boolean) => Promise<boolean>
}

export default function PowerToggle({ power, onChange }: Props) {
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = async () => {
    const nextPower = !power
    setSaving(true)
    setError(false)
    const saved = await onChange(nextPower)
    setError(!saved)
    setSaving(false)
  }

  return (
    <div>
      <div className="control-row">
        <div>
          <p className="t-label control-name">LED 전원</p>
          <p className="t-caption power-state">{power ? '켜짐' : '꺼짐'}</p>
        </div>
        <button
          className="power-switch"
          type="button"
          role="switch"
          aria-checked={power}
          aria-label="LED 전원"
          disabled={saving}
          onClick={() => void handleChange()}
        >
          <span className="switch-handle" />
        </button>
      </div>
      {error ? (
        <p className="t-caption power-error" role="alert">
          전원 변경 실패, 다시 시도
        </p>
      ) : null}
    </div>
  )
}
