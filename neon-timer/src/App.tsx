
import { useCallback, useState } from 'react';
import './index.css';
import { BigTimeDisplay } from './components/BigTimeDisplay';
import { TimeInputHHMMSS } from './components/TimeInputHHMMSS';
import { TopBar } from './components/TopBar';
import { ControlsPanel } from './components/ControlsPanel';
import { useTimerEngine } from './hooks/useTimerEngine';
import {
  getNotificationPermission,
  playTimerEndSound,
  requestTimerNotificationPermission,
  showTimerEndNotification,
  type TimerNotificationStatus
} from './lib/alerts';

function App() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<TimerNotificationStatus>(() => getNotificationPermission());
  const handleTimerEnd = useCallback(() => {
    if (soundEnabled) {
      playTimerEndSound();
    }
    if (notificationEnabled) {
      showTimerEndNotification();
    }
  }, [notificationEnabled, soundEnabled]);

  const {
    status,
    timeMs,
    mode,
    setMode,
    countdownInputMs,
    setCountdownInputMs,
    pomodoroPhase,
    pomodoroWorkMs,
    setPomodoroWorkMs,
    pomodoroBreakMs,
    setPomodoroBreakMs,
    start,
    pause,
    reset
  } = useTimerEngine({ onEnd: handleTimerEnd });

  const handleNotificationEnabledChange = useCallback(async (enabled: boolean) => {
    if (!enabled) {
      setNotificationEnabled(false);
      return;
    }

    const permission = await requestTimerNotificationPermission();
    setNotificationStatus(permission);
    setNotificationEnabled(permission === 'granted');
  }, []);

  const showInput = mode === 'countdown' && status === 'idle';

  return (
    <>
      <div className="bg-layer-base" />
      <div className="bg-layer-flow" />
      <div className="bg-layer-texture" />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        justifyContent: 'space-between'
      }}>
        <TopBar mode={mode} onSetMode={setMode} />

        <div className="flex-center" style={{ flex: 1 }}>
          {showInput ? (
            <TimeInputHHMMSS
              initialMs={countdownInputMs}
              onChange={setCountdownInputMs}
            />
          ) : (
            <BigTimeDisplay timeMs={timeMs} status={status} />
          )}
        </div>

        <ControlsPanel
          status={status}
          mode={mode}
          onStart={start}
          onPause={pause}
          onReset={reset}
          onPresetSelect={setCountdownInputMs}
          soundEnabled={soundEnabled}
          notificationEnabled={notificationEnabled}
          notificationStatus={notificationStatus}
          pomodoroPhase={pomodoroPhase}
          pomodoroWorkMs={pomodoroWorkMs}
          pomodoroBreakMs={pomodoroBreakMs}
          onPomodoroWorkMsChange={setPomodoroWorkMs}
          onPomodoroBreakMsChange={setPomodoroBreakMs}
          onSoundEnabledChange={setSoundEnabled}
          onNotificationEnabledChange={handleNotificationEnabledChange}
        />
      </div>
    </>
  );
}

export default App;
