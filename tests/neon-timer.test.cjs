const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const presets = fs.readFileSync(path.join(root, 'neon-timer/src/lib/presets.ts'), 'utf8');
const controls = fs.readFileSync(path.join(root, 'neon-timer/src/components/ControlsPanel.tsx'), 'utf8');
const app = fs.readFileSync(path.join(root, 'neon-timer/src/App.tsx'), 'utf8');
const topBar = fs.readFileSync(path.join(root, 'neon-timer/src/components/TopBar.tsx'), 'utf8');
const dist = fs.readFileSync(path.join(root, 'neon-timer/dist/index.html'), 'utf8');
const alerts = fs.readFileSync(path.join(root, 'neon-timer/src/lib/alerts.ts'), 'utf8');
const timerEngine = fs.readFileSync(path.join(root, 'neon-timer/src/hooks/useTimerEngine.ts'), 'utf8');

for (const minutes of [5, 10, 15, 25]) {
    assert.match(presets, new RegExp(`label: '${minutes}m'`));
    assert.match(presets, new RegExp(`ms: ${minutes} \\* 60 \\* 1000`));
}

assert.match(controls, /mode === 'countdown' && status === 'idle'/);
assert.match(controls, /PRESETS\.map\(preset =>/);
assert.match(controls, /onClick=\{\(\) => onPresetSelect\(preset\.ms\)\}/);
assert.match(controls, /SOUND ALERT/);
assert.match(controls, /BROWSER NOTIFY/);
assert.match(controls, /notificationStatus === 'unsupported' \|\| notificationStatus === 'denied'/);
assert.match(controls, /mode === 'pomodoro'/);
assert.match(controls, /WORK SESSION/);
assert.match(controls, /BREAK SESSION/);
assert.match(controls, /WORK MIN/);
assert.match(controls, /BREAK MIN/);
assert.match(app, /onPresetSelect=\{setCountdownInputMs\}/);
assert.match(app, /pomodoroPhase=\{pomodoroPhase\}/);
assert.match(app, /onPomodoroWorkMsChange=\{setPomodoroWorkMs\}/);
assert.match(app, /useTimerEngine\(\{ onEnd: handleTimerEnd \}\)/);
assert.match(app, /playTimerEndSound\(\)/);
assert.match(app, /showTimerEndNotification\(\)/);
assert.match(app, /requestTimerNotificationPermission\(\)/);

assert.match(alerts, /export function playTimerEndSound/);
assert.match(alerts, /new Notification\('Neon Timer'/);
assert.match(alerts, /Notification\.requestPermission\(\)/);
assert.match(timerEngine, /export type TimerMode = 'stopwatch' \| 'countdown' \| 'pomodoro'/);
assert.match(timerEngine, /export type PomodoroPhase = 'work' \| 'break'/);
assert.match(timerEngine, /const nextPhase = pomodoroPhase === 'work' \? 'break' : 'work'/);
assert.match(timerEngine, /setPomodoroPhase\(nextPhase\)/);

assert.match(topBar, /V1\.03/);
assert.match(topBar, /POMODORO/);
assert.match(topBar, /2026年7月11日/);
assert.match(topBar, /新增番茄钟模式/);
assert.match(topBar, /V1\.02/);
assert.match(topBar, /新增倒计时结束声音提醒和浏览器通知开关/);
assert.match(topBar, /V1\.01/);
assert.match(topBar, /新增倒计时常用预设/);
assert.match(topBar, /2026年6月9日[\s\S]*?V1\.00/);
assert.match(dist, /V1\.03/);
assert.match(dist, /新增番茄钟模式/);

console.log('neon timer presets integration passed');
