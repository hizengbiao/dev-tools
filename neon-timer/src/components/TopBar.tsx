
import { useState, type FC } from 'react';
import type { TimerMode } from '../hooks/useTimerEngine';


interface TopBarProps {
    mode?: TimerMode;
    isFullscreen?: boolean;
    onSetMode?: (mode: TimerMode) => void;
    onToggleFullscreen?: () => void;
}

export const TopBar: FC<TopBarProps> = ({ mode = 'stopwatch', isFullscreen = false, onSetMode, onToggleFullscreen }) => {
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);

    const linkStyle = (targetMode: TimerMode) => ({
        cursor: 'pointer',
        color: mode === targetMode ? '#fff' : 'var(--muted)',
        textShadow: mode === targetMode ? '0 0 10px var(--neon-cyan)' : 'none',
        fontWeight: mode === targetMode ? 'bold' : 'normal',
        margin: '0 1rem',
        transition: 'all 0.3s ease'
    });

    return (
        <>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2rem',
                fontSize: '0.9rem',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ fontWeight: 800, letterSpacing: '1px' }}>NEON TIMER</div>

                <div style={{ display: 'flex' }}>
                    <div
                        onClick={() => onSetMode?.('stopwatch')}
                        style={linkStyle('stopwatch')}
                    >
                        STOPWATCH
                    </div>
                    <div
                        onClick={() => onSetMode?.('countdown')}
                        style={linkStyle('countdown')}
                    >
                        COUNTDOWN
                    </div>
                    <div
                        onClick={() => onSetMode?.('pomodoro')}
                        style={linkStyle('pomodoro')}
                    >
                        POMODORO
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={onToggleFullscreen}
                        title="Toggle fullscreen (F)"
                        style={{
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            borderRadius: '999px',
                            background: isFullscreen ? 'rgba(255, 0, 255, 0.16)' : 'rgba(255,255,255,0.04)',
                            color: isFullscreen ? 'var(--neon-magenta)' : '#b7d8e0',
                            cursor: 'pointer',
                            font: 'inherit',
                            fontSize: '0.76rem',
                            letterSpacing: '0.05em',
                            padding: '0.25rem 0.65rem'
                        }}
                    >
                        {isFullscreen ? 'EXIT FULL' : 'FULLSCREEN'}
                    </button>
                    <div style={{ opacity: 0.5, cursor: 'not-allowed' }}>SETTINGS</div>
                    <button
                        type="button"
                        onClick={() => setIsChangelogOpen(true)}
                        title="查看版本更新记录"
                        style={{
                            border: '1px solid rgba(0, 229, 255, 0.45)',
                            borderRadius: '999px',
                            background: 'rgba(0, 229, 255, 0.08)',
                            color: 'var(--neon-cyan)',
                            cursor: 'pointer',
                            font: 'inherit',
                            fontSize: '0.78rem',
                            letterSpacing: '0.05em',
                            padding: '0.25rem 0.65rem',
                            textShadow: '0 0 8px rgba(0, 229, 255, 0.75)',
                            boxShadow: '0 0 12px rgba(0, 229, 255, 0.18)'
                        }}
                    >
                        V1.04
                    </button>
                </div>
            </div>

            {isChangelogOpen && (
                <div
                    onClick={() => setIsChangelogOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.58)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            width: 'min(650px, calc(100vw - 32px))',
                            maxHeight: '85vh',
                            overflow: 'hidden',
                            borderRadius: '12px',
                            border: '1px solid rgba(0, 229, 255, 0.25)',
                            background: 'rgba(12, 18, 32, 0.96)',
                            color: '#eafaff',
                            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.45), 0 0 40px rgba(0, 229, 255, 0.12)',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            borderBottom: '1px solid rgba(0, 229, 255, 0.18)',
                            background: 'rgba(255, 255, 255, 0.03)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>🚀 版本更新说明</h3>
                            <button
                                type="button"
                                onClick={() => setIsChangelogOpen(false)}
                                aria-label="关闭版本更新说明"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: 'transparent',
                                    color: '#b7d8e0',
                                    cursor: 'pointer',
                                    fontSize: '20px'
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ padding: '24px', lineHeight: 1.6 }}>
                            <div style={{
                                display: 'inline-block',
                                marginBottom: '14px',
                                paddingBottom: '8px',
                                borderBottom: '2px solid var(--neon-cyan)',
                                fontWeight: 700
                            }}>
                                2026年7月11日
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px', marginBottom: '12px' }}>
                                <div style={{
                                    flex: '0 0 56px',
                                    color: 'var(--neon-cyan)',
                                    fontWeight: 800,
                                    textShadow: '0 0 8px rgba(0, 229, 255, 0.75)'
                                }}>
                                    V1.04
                                </div>
                                <div>优化全屏展示，新增全屏切换按钮，并支持空格开始/暂停、R 重置、F 切换全屏。</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px', marginBottom: '12px' }}>
                                <div style={{
                                    flex: '0 0 56px',
                                    color: 'var(--neon-cyan)',
                                    fontWeight: 800,
                                    textShadow: '0 0 8px rgba(0, 229, 255, 0.75)'
                                }}>
                                    V1.03
                                </div>
                                <div>新增番茄钟模式，支持工作/休息循环、阶段显示和工作/休息时长配置。</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px', marginBottom: '12px' }}>
                                <div style={{
                                    flex: '0 0 56px',
                                    color: 'var(--neon-cyan)',
                                    fontWeight: 800,
                                    textShadow: '0 0 8px rgba(0, 229, 255, 0.75)'
                                }}>
                                    V1.02
                                </div>
                                <div>新增倒计时结束声音提醒和浏览器通知开关，通知会在用户授权后触发。</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px', marginBottom: '12px' }}>
                                <div style={{
                                    flex: '0 0 56px',
                                    color: 'var(--neon-cyan)',
                                    fontWeight: 800,
                                    textShadow: '0 0 8px rgba(0, 229, 255, 0.75)'
                                }}>
                                    V1.01
                                </div>
                                <div>新增倒计时常用预设，可在倒计时空闲状态下快速选择 5、10、15、25、30、60 分钟。</div>
                            </div>
                            <div style={{
                                display: 'inline-block',
                                margin: '4px 0 14px',
                                paddingBottom: '8px',
                                borderBottom: '2px solid var(--neon-cyan)',
                                fontWeight: 700
                            }}>
                                2026年6月9日
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px' }}>
                                <div style={{
                                    flex: '0 0 56px',
                                    color: 'var(--neon-cyan)',
                                    fontWeight: 800,
                                    textShadow: '0 0 8px rgba(0, 229, 255, 0.75)'
                                }}>
                                    V1.00
                                </div>
                                <div>版本初始化</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
