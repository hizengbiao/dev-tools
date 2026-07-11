export type TimerNotificationStatus = NotificationPermission | 'unsupported';

export function getNotificationPermission(): TimerNotificationStatus {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

export async function requestTimerNotificationPermission(): Promise<TimerNotificationStatus> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Notification.permission;
    }
    return Notification.requestPermission();
}

export function showTimerEndNotification(): boolean {
    if (getNotificationPermission() !== 'granted') {
        return false;
    }
    new Notification('Neon Timer', {
        body: 'Countdown finished.',
        silent: false,
    });
    return true;
}

export function playTimerEndSound(): boolean {
    const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) {
        return false;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.65);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.7);
    oscillator.addEventListener('ended', () => {
        void context.close();
    });
    return true;
}
