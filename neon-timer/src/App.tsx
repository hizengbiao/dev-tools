
import { useCallback, useEffect, useState } from 'react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        if (status === 'running') {
          pause();
        } else {
          start();
        }
      } else if (event.key.toLowerCase() === 'r') {
        reset();
      } else if (event.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pause, reset, start, status, toggleFullscreen]);

  return (
    <>
      <div className="bg-layer-base" />
      <div className="bg-layer-flow" />
      <div className="bg-layer-texture" />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100vh' : 'calc(100vh - 80px)',
        justifyContent: 'space-between'
      }}>
        <TopBar
          mode={mode}
          isFullscreen={isFullscreen}
          onSetMode={setMode}
          onToggleFullscreen={() => void toggleFullscreen()}
        />

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
