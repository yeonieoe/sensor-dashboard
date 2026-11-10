import type { Status } from '../lib/device'

type Props = {
  status: Status
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
}

const statusText: Record<Status, string> = {
  disconnected: '연결 안 됨',
  connecting: '연결 중…',
  connected: '연결됨',
  error: '연결 실패, 다시 시도',
}

export default function ConnectionControl({
  status,
  onConnect,
  onDisconnect,
}: Props) {
  const connected = status === 'connected'
  const connecting = status === 'connecting'

  return (
    <div className="control-row">
      <div>
        <p className="t-label control-name">센서</p>
        <p className={`t-label connection-status status-${status}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {statusText[status]}
        </p>
      </div>
      <button
        className={`t-label action-button ${connected ? 'disconnect-button' : ''}`}
        type="button"
        disabled={connecting}
        onClick={() => void (connected ? onDisconnect() : onConnect())}
      >
        {connected ? '연결 끊기' : '센서 연결'}
      </button>
    </div>
  )
}
