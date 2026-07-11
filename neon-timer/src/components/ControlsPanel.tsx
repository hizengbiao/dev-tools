
import type { TimerStatus } from './BigTimeDisplay';

import { PRESETS } from '../lib/presets';
import type { TimerNotificationStatus } from '../lib/alerts';
import type { PomodoroPhase, TimerMode } from '../hooks/useTimerEngine';

interface ControlsPanelProps {
    status: TimerStatus;
    mode: TimerMode;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onPresetSelect: (ms: number) => void;
    soundEnabled: boolean;
    notificationEnabled: boolean;
    notificationStatus: TimerNotificationStatus;
    pomodoroPhase: PomodoroPhase;
    pomodoroWorkMs: number;
    pomodoroBreakMs: number;
    onPomodoroWorkMsChange: (ms: number) => void;
    onPomodoroBreakMsChange: (ms: number) => void;
    onSoundEnabledChange: (enabled: boolean) => void;
    onNotificationEnabledChange: (enabled: boolean) => void | Promise<void>;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
    status,
    mode,
    onStart,
    onPause,
    onReset,
    onPresetSelect,
    soundEnabled,
    notificationEnabled,
    notificationStatus,
    pomodoroPhase,
    pomodoroWorkMs,
    pomodoroBreakMs,
    onPomodoroWorkMsChange,
    onPomodoroBreakMsChange,
    onSoundEnabledChange,
    onNotificationEnabledChange
}) => {
    const isRunning = status === 'running';
    const notificationDisabled = notificationStatus === 'unsupported' || notificationStatus === 'denied';
    const notificationHint = notificationStatus === 'unsupported'
        ? 'Browser notifications are not supported.'
        : notificationStatus === 'denied'
            ? 'Notification permission was denied.'
            : notificationStatus === 'granted'
                ? 'Notification will appear when countdown ends.'
                : 'Enable to request browser notification permission.';
    const minutesFromMs = (ms: number) => Math.max(1, Math.round(ms / 60000));
    const msFromMinutes = (minutes: number) => Math.max(1, minutes) * 60 * 1000;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '2rem',
            position: 'relative',
            zIndex: 10
        }}>
            {/* Presets Row - Only in Idle Countdown */}
            {mode === 'countdown' && status === 'idle' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {PRESETS.map(preset => (
                        <button
                            key={preset.label}
                            onClick={() => onPresetSelect(preset.ms)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--muted)',
                                color: 'var(--muted)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '15px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.boxShadow = '0 0 5px var(--neon-cyan)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--muted)';
                                e.currentTarget.style.color = 'var(--muted)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            )}

            {mode === 'pomodoro' && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    color: 'var(--neon-cyan)',
                    textShadow: '0 0 8px rgba(0, 229, 255, 0.65)',
                    letterSpacing: '0.08em'
                }}>
                    <div>{pomodoroPhase === 'work' ? 'WORK SESSION' : 'BREAK SESSION'}</div>
                    {status === 'idle' && (
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--muted)' }}>
                                WORK MIN
                                <input
                                    type="number"
                                    min={1}
                                    value={minutesFromMs(pomodoroWorkMs)}
                                    onChange={(event) => onPomodoroWorkMsChange(msFromMinutes(Number(event.currentTarget.value) || 1))}
                                    style={{ width: '72px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--muted)', color: '#fff', padding: '0.25rem 0.5rem' }}
                                />
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--muted)' }}>
                                BREAK MIN
                                <input
                                    type="number"
                                    min={1}
                                    value={minutesFromMs(pomodoroBreakMs)}
                                    onChange={(event) => onPomodoroBreakMsChange(msFromMinutes(Number(event.currentTarget.value) || 1))}
                                    style={{ width: '72px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--muted)', color: '#fff', padding: '0.25rem 0.5rem' }}
                                />
                            </label>
                        </div>
                    )}
                </div>
            )}

            {/* Main Controls */}
            <div style={{ display: 'flex', gap: '1rem' }}>
                {!isRunning ? (
                    <button
                        onClick={onStart}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--neon-cyan)',
                            color: 'var(--neon-cyan)',
                            padding: '0.5rem 2rem',
                            width: '120px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxShadow: '0 0 10px var(--neon-cyan), inset 0 0 5px var(--neon-cyan)',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s'
                        }}
                    >
                        {status === 'paused' ? 'Resume' : 'Start'}
                    </button>
                ) : (
                    <button
                        onClick={onPause}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--neon-magenta)',
                            color: 'var(--neon-magenta)',
                            padding: '0.5rem 2rem',
                            width: '120px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxShadow: '0 0 10px var(--neon-magenta), inset 0 0 5px var(--neon-magenta)',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s'
                        }}
                    >
                        Pause
                    </button>
                )}

                <button
                    onClick={onReset}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--muted)',
                        color: 'var(--muted)',
                        padding: '0.5rem 2rem',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        transition: 'all 0.2s'
                    }}
                >
                    Reset
                </button>
            </div>

            {(mode === 'countdown' || mode === 'pomodoro') && (
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    color: 'var(--muted)',
                    fontSize: '0.78rem',
                    letterSpacing: '0.04em'
                }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={soundEnabled}
                            onChange={(event) => onSoundEnabledChange(event.currentTarget.checked)}
                        />
                        SOUND ALERT
                    </label>
                    <label
                        title={notificationHint}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: notificationDisabled ? 'not-allowed' : 'pointer',
                            opacity: notificationDisabled ? 0.55 : 1
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={notificationEnabled}
                            disabled={notificationDisabled}
                            onChange={(event) => void onNotificationEnabledChange(event.currentTarget.checked)}
                        />
                        BROWSER NOTIFY
                    </label>
                    <span title={notificationHint}>PERMISSION: {notificationStatus.toUpperCase()}</span>
                </div>
            )}
        </div>
    );
};
