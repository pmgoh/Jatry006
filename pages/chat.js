import { useEffect, useState, useRef } from 'react'

const APP_VERSION = '1.1'

function formatLastSeen(ts) {
  if (!ts) return '오프라인'
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  if (hour < 24) return `${hour}시간 전`
  return '오프라인'
}

// 알림 권한 요청
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// 아이콘만 있는 OS 알림
function sendSilentNotification() {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const n = new Notification(' ', {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    body: ' ',
    silent: true,
    tag: 'msng-new-msg',
  })
  setTimeout(() => n.close(), 2500)
}
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, set, push, onDisconnect } from 'firebase/database'

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(ts) {
  const d = new Date(ts), t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

function Avatar({ name, size = 36 }) {
  const hue1 = (name.charCodeAt(0) * 17) % 360
  const hue2 = (name.charCodeAt(0) * 37) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      background: `linear-gradient(135deg, hsl(${hue1},55%,38%), hsl(${hue2},65%,52%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, color: 'white',
    }}>
      {name[0].toUpperCase()}
    </div>
  )
}

function AIIcon({ size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3, flexShrink: 0,
      background: 'linear-gradient(135deg, #1e1b3a, #1a2540)',
      border: '1px solid rgba(124,106,247,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 8px rgba(124,106,247,0.2)',
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="#7c6af7" strokeWidth="1.2"/>
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#7c6af7" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="#4fa3f7" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      </svg>
    </div>
  )
}

function ReadReceipt({ isRead }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 3 }}>
      {isRead ? (
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <path d="M1 5l3 3 5-7" stroke="#7c6af7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 5l3 3 5-7" stroke="#7c6af7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 5l3 3 5-6" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  )
}

function AIMessageBubble({ msg, isFirst, isLast }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(5px)',
      transition: 'opacity 0.28s ease, transform 0.28s ease',
      marginTop: isFirst ? 28 : 4,
    }}>
      {/* 발신자 헤더 */}
      {isFirst && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <AIIcon size={24} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {msg.senderName}
          </span>
        </div>
      )}
      {/* 텍스트 — 아이콘 너비(24) + gap(10) = 34px 들여쓰기 */}
      <div style={{
        paddingLeft: 34,
        fontSize: 15,
        lineHeight: 1.7,
        color: 'var(--text)',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        letterSpacing: '-0.005em',
        fontWeight: 400,
      }}>
        {msg.text}
      </div>
      {isLast && (
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, paddingLeft: 34, letterSpacing: '0.01em' }}>
          {formatTime(msg.timestamp)}
        </p>
      )}
    </div>
  )
}
function MyMessageBubble({ msg, isFirst, isLast, otherLastRead }) {
  const isRead = otherLastRead && msg.timestamp <= otherLastRead
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: isFirst ? 28 : 4 }}>
      <div style={{ maxWidth: '62%' }}>
        <div style={{
          padding: '10px 15px',
          borderRadius: isLast ? '16px 16px 4px 16px' : '16px',
          background: 'linear-gradient(135deg, rgba(124,106,247,0.2), rgba(79,163,247,0.16))',
          border: '1px solid rgba(124,106,247,0.25)',
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--text)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          letterSpacing: '-0.005em',
        }}>
          {msg.text}
        </div>
        {isLast && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, paddingRight: 2, gap: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.01em' }}>{formatTime(msg.timestamp)}</span>
            <ReadReceipt isRead={isRead} />
          </div>
        )}
      </div>
    </div>
  )
}

function Sidebar({ me, users, activeUser, unread, onSelectUser, onLogout, loadingUsers, activeGroup, onSelectGroup, groupUnread, onClose }) {
  const otherUsers = users.filter((u) => u.uid !== me?.uid)
  const meUser = users.find((u) => u.uid === me?.uid)

  return (
    <aside className="flex flex-col h-full" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-none" style={{ color: 'var(--text)' }}>Jatry 메신저</p>
          <p className="mt-0.5" style={{ color: 'var(--muted)', fontSize: 10 }}>AI 프로젝트 06번째</p>
        </div>
        {onClose && (
          <button onClick={onClose}
            style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}
      </div>

      {/* All */}
      <div className="px-2 pt-3 pb-1 flex-shrink-0">
        <button onClick={() => onSelectGroup()}
          className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl transition-all duration-150 text-left"
          style={{
            background: activeGroup ? 'rgba(124,106,247,0.12)' : 'transparent',
            border: activeGroup ? '1px solid rgba(124,106,247,0.25)' : '1px solid rgba(255,255,255,0.04)',
          }}
          onMouseEnter={(e) => { if (!activeGroup) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          onMouseLeave={(e) => { if (!activeGroup) e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(124,106,247,0.25), rgba(79,163,247,0.2))',
            border: '1px solid rgba(124,106,247,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c6af7" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate leading-none mb-0.5" style={{ color: 'var(--text)', fontWeight: groupUnread > 0 ? 600 : 500 }}>
              All
            </p>
            <p className="text-xs" style={{ color: groupUnread > 0 ? 'rgba(124,106,247,0.9)' : 'var(--muted)', fontWeight: groupUnread > 0 ? 500 : 400 }}>
              {groupUnread > 0 ? `${groupUnread}개의 새 메시지` : "Everyone is here"}
            </p>
          </div>
          {groupUnread > 0 && (
            <div style={{ minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px', background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
              {groupUnread > 9 ? '9+' : groupUnread}
            </div>
          )}
        </button>
      </div>

      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
          오늘 · {otherUsers.filter(u => u.online).length}명 온라인
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: '#7c6af7', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : otherUsers.length === 0 ? (
          <div className="px-2 py-8 text-center">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>아직 다른 유저가 없어요</p>
          </div>
        ) : (
          otherUsers.map((user) => {
            const isActive = activeUser?.uid === user.uid
            const badge = unread[user.uid] || 0
            return (
              <button key={user.uid} onClick={() => onSelectUser(user)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl mb-0.5 transition-all duration-150 text-left"
                style={{
                  background: isActive ? 'rgba(124,106,247,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(124,106,247,0.25)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div className="relative">
                  <Avatar name={user.username} size={34} />
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 9, height: 9, borderRadius: '50%',
                    border: '2px solid var(--surface)',
                    background: user.online ? '#4ade80' : 'var(--muted)',
                    boxShadow: user.online ? '0 0 5px rgba(74,222,128,0.5)' : 'none',
                  }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate leading-none mb-0.5" style={{
                    color: user.online ? 'var(--text)' : 'var(--text-dim)',
                    fontWeight: badge > 0 ? 600 : 500,
                  }}>
                    {user.username}
                  </p>
                  <p className="text-xs truncate" style={{ color: badge > 0 ? 'rgba(124,106,247,0.9)' : 'var(--muted)', fontWeight: badge > 0 ? 500 : 400 }}>
                    {badge > 0 ? `${badge}개의 새 메시지` : user.online ? '온라인' : formatLastSeen(user.lastSeen)}
                  </p>
                </div>
                {badge > 0 && (
                  <div style={{ minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px', background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                    {badge > 9 ? '9+' : badge}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>

      {meUser && (
        <div className="flex items-center gap-2.5 px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <Avatar name={meUser.username} size={30} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{meUser.username}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>나</p>
          </div>
          <button onClick={onLogout} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      )}
    </aside>
  )
}

function GroupChatPanel({ me, messages, lastGroupRead, onBack, onClose }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const lastReadRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const [markedRead, setMarkedRead] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const prevMsgLen = useRef(0)
  const isNearBottom = useRef(true)

  const [secureMode, setSecureMode] = useState(() => typeof window !== 'undefined' && localStorage.getItem('secureMode') === 'true')
  const [showSecureSettings, setShowSecureSettings] = useState(false)
  const [blurAmount, setBlurAmount] = useState(() => typeof window !== 'undefined' ? parseInt(localStorage.getItem('blurAmount') || '12') : 12)
  const [blurSpeed, setBlurSpeed] = useState(() => typeof window !== 'undefined' ? parseInt(localStorage.getItem('blurSpeed') || '400') : 400)
  const [isHoveringMessages, setIsHoveringMessages] = useState(false)
  const settingsRef = useRef(null)

  useEffect(() => {
    if (messages.length === 0) return
    const isNew = messages.length > prevMsgLen.current
    prevMsgLen.current = messages.length
    if (!markedRead && lastReadRef.current) {
      lastReadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setMarkedRead(true), 1200)
    } else if (isNew) {
      if (isNearBottom.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        setNewMsgCount(0); setShowScrollBtn(false)
      } else {
        setNewMsgCount((c) => c + 1); setShowScrollBtn(true)
      }
    }
  }, [messages])
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  useEffect(() => {
    const handler = (e) => { if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSecureSettings(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 탭 비활성/창 포커스 잃을 때 lastSeen 저장
  useEffect(() => {
    const saveLastSeen = () => {
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        localStorage.setItem('lastSeen___public__', String(Date.now()))
      }
    }
    document.addEventListener('visibilitychange', saveLastSeen)
    window.addEventListener('blur', saveLastSeen)
    return () => {
      document.removeEventListener('visibilitychange', saveLastSeen)
      window.removeEventListener('blur', saveLastSeen)
    }
  }, [])

  const toggleSecureMode = () => {
    const next = !secureMode; setSecureMode(next); localStorage.setItem('secureMode', String(next))
  }
  const updateBlurAmount = (val) => { setBlurAmount(val); localStorage.setItem('blurAmount', String(val)) }
  const updateBlurSpeed = (val) => { setBlurSpeed(val); localStorage.setItem('blurSpeed', String(val)) }

  const handleSend = async () => {
    if (!input.trim() || !me || sending) return
    const text = input.trim(); setInput(''); setSending(true)
    try {
      await push(ref(db, 'rooms/__public__/messages'), {
        sender: me.uid, senderName: me.displayName,
        text, timestamp: Date.now(),
      })
    } finally { setSending(false); inputRef.current?.focus() }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  if (!me) return null

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--night)' }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0" style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,11,15,0.85)',
      }}>
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg transition-colors md:hidden" style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, rgba(124,106,247,0.25), rgba(79,163,247,0.2))', border: '1px solid rgba(124,106,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c6af7" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium leading-none mb-0.5" style={{ color: 'var(--text)' }}>All</p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Everyone is here</p>
        </div>

        {/* 보안 모드 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }} ref={settingsRef}>
          <button onClick={toggleSecureMode} style={{ width: 36, height: 20, borderRadius: 10, padding: 2, cursor: 'pointer', background: secureMode ? 'linear-gradient(135deg, #7c6af7, #4fa3f7)' : 'var(--border)', border: 'none', transition: 'background 0.2s ease', position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, transition: 'left 0.2s ease', left: secureMode ? 18 : 2, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
          <button onClick={() => setShowSecureSettings(v => !v)} className="p-1.5 rounded-lg transition-colors" style={{ color: showSecureSettings ? '#7c6af7' : 'var(--text-dim)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#7c6af7'; e.currentTarget.style.background = 'rgba(124,106,247,0.08)' }}
            onMouseLeave={(e) => { if (!showSecureSettings) { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent' } }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/>
            </svg>
          </button>
          {showSecureSettings && (
            <div style={{ position: 'fixed', top: 60, right: 60, width: 220, padding: '14px 16px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>보안 설정</p>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>블러 강도</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{blurAmount}px</span>
                </div>
                <input type="range" min={4} max={24} value={blurAmount} onChange={(e) => updateBlurAmount(Number(e.target.value))} style={{ width: '100%', accentColor: '#7c6af7', cursor: 'pointer', height: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>약하게</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>강하게</span>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>블러 속도</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{blurSpeed}ms</span>
                </div>
                <input type="range" min={100} max={1000} step={50} value={blurSpeed} onChange={(e) => updateBlurSpeed(Number(e.target.value))} style={{ width: '100%', accentColor: '#7c6af7', cursor: 'pointer', height: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>빠르게</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>느리게</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* 메시지 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {showScrollBtn && (
          <button
            onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setShowScrollBtn(false); setNewMsgCount(0) }}
            style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 20, display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)',
              border: 'none', cursor: 'pointer', color: 'white',
              fontSize: 12, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(124,106,247,0.4)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            새 메시지 {newMsgCount > 0 ? newMsgCount : ''}
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto py-6"
          onMouseEnter={() => setIsHoveringMessages(true)}
          onMouseLeave={() => setIsHoveringMessages(false)}
          onScroll={(e) => {
            const el = e.currentTarget
            const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
            isNearBottom.current = distFromBottom < 80
            if (isNearBottom.current) { setShowScrollBtn(false); setNewMsgCount(0) }
          }}
          style={{ filter: secureMode && !isHoveringMessages ? `blur(${blurAmount}px)` : 'blur(0px)', transition: `filter ${blurSpeed}ms ease`, userSelect: secureMode && !isHoveringMessages ? 'none' : 'auto' }}
        >
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--panel)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 4 }}>All</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>첫 메시지를 보내보세요</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.sender === me?.uid
            const prev = messages[i - 1], next = messages[i + 1]
            const isFirst = !prev || prev.sender !== msg.sender
            const isLast = !next || next.sender !== msg.sender
            const groupLastSeen = typeof window !== 'undefined' ? parseInt(localStorage.getItem('lastSeen___public__') || '0') : 0
            const showMark = groupLastSeen && !markedRead &&
              msg.timestamp > groupLastSeen &&
              (!prev || prev.timestamp <= groupLastSeen)

            if (isMe) {
              return (
                <div key={msg.id}>
                  {showMark && (
                    <div ref={lastReadRef} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px', opacity: 0.7 }}>
                      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,106,247,0.4))' }} />
                      <span style={{ fontSize: 11, color: 'rgba(124,106,247,0.7)', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>여기까지 읽었어요</span>
                      <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, transparent, rgba(124,106,247,0.4))' }} />
                    </div>
                  )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: isFirst ? 28 : 4 }}>
                  <div style={{ maxWidth: '62%' }}>
                    <div style={{ padding: '10px 15px', borderRadius: isLast ? '16px 16px 4px 16px' : '16px', background: 'linear-gradient(135deg, rgba(124,106,247,0.2), rgba(79,163,247,0.16))', border: '1px solid rgba(124,106,247,0.25)', fontSize: 15, lineHeight: 1.6, color: 'var(--text)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                    {isLast && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, paddingRight: 2, gap: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatTime(msg.timestamp)}</span>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )
            }

            // 상대방 메시지 — AI 스타일
            return (
              <div key={msg.id}>
                {showMark && (
                  <div ref={lastReadRef} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px', opacity: 0.7 }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,106,247,0.4))' }} />
                    <span style={{ fontSize: 11, color: 'rgba(124,106,247,0.7)', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>여기까지 읽었어요</span>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, transparent, rgba(124,106,247,0.4))' }} />
                  </div>
                )}
              <div style={{ marginTop: isFirst ? 28 : 4 }}>
                {isFirst && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Avatar name={msg.senderName || '?'} size={24} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>{msg.senderName}</span>
                  </div>
                )}
                <div style={{ paddingLeft: 34, fontSize: 15, lineHeight: 1.7, color: 'var(--text)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>
                {isLast && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, paddingLeft: 34 }}>{formatTime(msg.timestamp)}</p>}
              </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        </div>
      </div>

      {/* 입력창 */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="glow-border flex items-center gap-2.5 px-4 py-3 rounded-2xl" style={{ background: 'rgba(24,28,36,0.95)', backdropFilter: 'blur(16px)' }}>
            <div className="flex-shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--muted)' }}>
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 13s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="9.5" r="1" fill="currentColor"/><circle cx="15" cy="9.5" r="1" fill="currentColor"/>
              </svg>
            </div>
            <textarea ref={inputRef} value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              onKeyDown={handleKeyDown}
              placeholder="All에 메시지 보내기..."
              rows={1} className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
              style={{ color: 'var(--text)', caretColor: '#7c6af7', maxHeight: 120 }}
            />
            <button onClick={handleSend} disabled={!input.trim() || sending}
              className="send-btn flex-shrink-0 rounded-xl flex items-center justify-center"
              style={{ width: 32, height: 32, opacity: input.trim() ? 1 : 0.3, cursor: input.trim() ? 'pointer' : 'not-allowed' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="text-center mt-1.5 hidden md:block" style={{ color: 'var(--muted)', fontSize: 11 }}>Enter 전송 · Shift+Enter 줄바꿈</p>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative" style={{ background: 'var(--night)' }}>
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(124,106,247,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <AIIcon size={44} />
      <p className="text-sm font-medium mt-4 mb-1" style={{ color: 'var(--text-dim)' }}>대화 상대를 선택하세요</p>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>왼쪽 목록에서 유저를 클릭하면 채팅이 시작돼요</p>
    </div>
  )
}

function ChatPanel({ me, activeUser, messages, lastRead, onBack, onClose, notifyEnabled, onToggleNotify, lastReadMark }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const lastReadRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const settingsRef = useRef(null)
  const [secureMode, setSecureMode] = useState(() => typeof window !== 'undefined' && localStorage.getItem('secureMode') === 'true')
  const [showSecureSettings, setShowSecureSettings] = useState(false)
  const [isHoveringMessages, setIsHoveringMessages] = useState(false)
  const [blurAmount, setBlurAmount] = useState(() => typeof window !== 'undefined' ? parseInt(localStorage.getItem('blurAmount') || '12') : 12)
  const [blurSpeed, setBlurSpeed] = useState(() => typeof window !== 'undefined' ? parseInt(localStorage.getItem('blurSpeed') || '400') : 400)
  const [markedRead, setMarkedRead] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const prevMsgLen = useRef(0)
  const isNearBottom = useRef(true)

  const toggleSecureMode = () => { const next = !secureMode; setSecureMode(next); localStorage.setItem('secureMode', String(next)) }
  const updateBlurAmount = (val) => { setBlurAmount(val); localStorage.setItem('blurAmount', String(val)) }
  const updateBlurSpeed = (val) => { setBlurSpeed(val); localStorage.setItem('blurSpeed', String(val)) }

  useEffect(() => {
    if (messages.length === 0) return
    const isNew = messages.length > prevMsgLen.current
    prevMsgLen.current = messages.length
    if (!markedRead && lastReadRef.current) {
      lastReadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setMarkedRead(true), 1200)
    } else if (isNew) {
      if (isNearBottom.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        setNewMsgCount(0); setShowScrollBtn(false)
      } else {
        setNewMsgCount((c) => c + 1); setShowScrollBtn(true)
      }
    }
  }, [messages])
  useEffect(() => { if (activeUser) setTimeout(() => inputRef.current?.focus(), 100) }, [activeUser])
  useEffect(() => {
    setMarkedRead(false); setShowScrollBtn(false)
    setNewMsgCount(0); prevMsgLen.current = 0; isNearBottom.current = true
  }, [activeUser])
  useEffect(() => {
    const handler = (e) => { if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSecureSettings(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  // 탭 비활성/창 포커스 잃을 때 lastSeen 저장
  useEffect(() => {
    if (!activeUser) return
    const saveLastSeen = () => {
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        localStorage.setItem(`lastSeen_${activeUser.uid}`, String(Date.now()))
      }
    }
    document.addEventListener('visibilitychange', saveLastSeen)
    window.addEventListener('blur', saveLastSeen)
    return () => {
      document.removeEventListener('visibilitychange', saveLastSeen)
      window.removeEventListener('blur', saveLastSeen)
    }
  }, [activeUser])

  const otherLastRead = lastRead?.[activeUser?.uid] || 0
  if (!activeUser || !me) return null


  const handleSend = async () => {
    if (!input.trim() || !me || !activeUser || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const roomId = [me.uid, activeUser.uid].sort().join('_')
    try {
      await push(ref(db, `rooms/${roomId}/messages`), {
        sender: me.uid, senderName: me.displayName,
        text, timestamp: Date.now(),
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // 상대방의 lastRead (내 메시지가 읽혔는지 기준)

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--night)' }}>
      {/* 설정 말풍선 - position fixed로 stacking context 탈출 */}
      {showSecureSettings && (
        <div style={{
          position: 'fixed', top: 58, right: 16,
          width: 220, padding: '14px 16px',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,106,247,0.1)',
          zIndex: 9999,
        }}>
          <div style={{
            position: 'absolute', top: -5, right: 20,
            width: 10, height: 10,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderBottom: 'none', borderRight: 'none',
            transform: 'rotate(45deg)',
          }} />
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            보안 설정
          </p>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>블러 강도</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{blurAmount}px</span>
            </div>
            <input type="range" min={4} max={24} value={blurAmount}
              onChange={(e) => updateBlurAmount(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7c6af7', cursor: 'pointer', height: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>약하게</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>강하게</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>블러 속도</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{blurSpeed}ms</span>
            </div>
            <input type="range" min={100} max={1000} step={50} value={blurSpeed}
              onChange={(e) => updateBlurSpeed(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#7c6af7', cursor: 'pointer', height: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>빠르게</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>느리게</span>
            </div>
          </div>
        </div>
      )}
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0" style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,11,15,0.85)', backdropFilter: 'blur(16px)',
      }}>
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg transition-colors md:hidden" style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}
        <AIIcon size={34} />
        <div className="flex-1">
          <p className="text-sm font-medium leading-none mb-0.5" style={{ color: 'var(--text)' }}>{activeUser.username}</p>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 4px rgba(74,222,128,0.6)' }} />
            <p className="text-xs" style={{ color: '#4ade80' }}>온라인</p>
          </div>
        </div>
        {/* 보안 모드 컨트롤 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }} ref={settingsRef}>
          {/* 토글 스위치 */}
          <button onClick={toggleSecureMode}
            style={{
              width: 36, height: 20, borderRadius: 10, padding: 2, cursor: 'pointer',
              background: secureMode ? 'linear-gradient(135deg, #7c6af7, #4fa3f7)' : 'var(--border)',
              border: 'none', transition: 'background 0.2s ease', position: 'relative', flexShrink: 0,
            }}
            title={secureMode ? '보안 모드 켜짐' : '보안 모드 꺼짐'}
          >
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 2, transition: 'left 0.2s ease',
              left: secureMode ? 18 : 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </button>

          {/* 설정 아이콘 */}
          <button
            onClick={() => setShowSecureSettings((v) => !v)}
            className="p-1 rounded-lg transition-colors"
            style={{ color: showSecureSettings ? '#7c6af7' : 'var(--muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#7c6af7' }}
            onMouseLeave={(e) => { if (!showSecureSettings) e.currentTarget.style.color = 'var(--muted)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/>
            </svg>
          </button>

          {/* 설정 말풍선 - 헤더 stacking context 밖에서 렌더링 */}
        </div>

        {/* 닫기 버튼 */}
        {onClose && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="채팅 닫기"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* 메시지 리스트 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* 새 메시지 버튼 */}
        {showScrollBtn && (
          <button
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              setShowScrollBtn(false)
              setNewMsgCount(0)
            }}
            style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 20, display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)',
              border: 'none', cursor: 'pointer', color: 'white',
              fontSize: 12, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(124,106,247,0.4)',
              animation: 'fadeUp 0.2s ease',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            새 메시지 {newMsgCount > 0 ? newMsgCount : ''}
          </button>
        )}
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto py-6"
          onMouseEnter={() => setIsHoveringMessages(true)}
          onMouseLeave={() => setIsHoveringMessages(false)}
          onScroll={(e) => {
            const el = e.currentTarget
            const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
            isNearBottom.current = distFromBottom < 80
            if (isNearBottom.current) {
              setShowScrollBtn(false)
              setNewMsgCount(0)
            }
          }}
          style={{
            filter: secureMode && !isHoveringMessages ? `blur(${blurAmount}px)` : 'blur(0px)',
            transition: `filter ${blurSpeed}ms ease`,
            userSelect: secureMode && !isHoveringMessages ? 'none' : 'auto',
          }}
        >
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, textAlign: 'center' }}>
              <AIIcon size={36} />
              <p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 12, marginBottom: 4 }}>{activeUser.username}와의 대화</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>첫 메시지를 보내보세요</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMe = msg.sender === me?.uid
            const prev = messages[i - 1], next = messages[i + 1]
            const isFirst = !prev || prev.sender !== msg.sender
            const isLast = !next || next.sender !== msg.sender

            // 마지막 읽은 위치 구분선 — lastReadMark 이후 첫 번째 메시지 앞에
            const showMark = lastReadMark && !markedRead &&
              msg.timestamp > lastReadMark &&
              (!prev || prev.timestamp <= lastReadMark)

            return (
              <div key={msg.id}>
                {showMark && (
                  <div ref={lastReadRef} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    margin: '20px 0 16px',
                    opacity: 0.7,
                  }}>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,106,247,0.4))' }} />
                    <span style={{ fontSize: 11, color: 'rgba(124,106,247,0.7)', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
                      여기까지 읽었어요
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, transparent, rgba(124,106,247,0.4))' }} />
                  </div>
                )}
                {isMe
                  ? <MyMessageBubble msg={msg} isFirst={isFirst} isLast={isLast} otherLastRead={otherLastRead} />
                  : <AIMessageBubble msg={msg} isFirst={isFirst} isLast={isLast} />
                }
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        </div>
      </div>

      {/* 입력창 */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="glow-border flex items-center gap-2.5 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(24,28,36,0.95)', backdropFilter: 'blur(16px)' }}>
          <div className="flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--muted)' }}>
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 13s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="9.5" r="1" fill="currentColor"/><circle cx="15" cy="9.5" r="1" fill="currentColor"/>
            </svg>
          </div>
          <textarea ref={inputRef} value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder={`${activeUser.username}에게 메시지 보내기...`}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{ color: 'var(--text)', caretColor: '#7c6af7', maxHeight: 120 }}
          />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="send-btn flex-shrink-0 rounded-xl flex items-center justify-center"
            style={{ width: 32, height: 32, opacity: input.trim() ? 1 : 0.3, cursor: input.trim() ? 'pointer' : 'not-allowed' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="text-center mt-1.5 hidden md:block" style={{ color: 'var(--muted)', fontSize: 11 }}>
          Enter 전송 · Shift+Enter 줄바꿈
        </p>
        </div>
      </div>
    </div>
  )
}

export default function Chat() {
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [activeGroup, setActiveGroup] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // 알림 설정: { [uid]: true/false }, '__public__': true/false
  const [notifySettings, setNotifySettings] = useState(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('notifySettings') || '{}') } catch { return {} }
  })
  const totalUnreadRef = useRef(0)
  const [messages, setMessages] = useState([])
  const [groupMessages, setGroupMessages] = useState([])
  const [unread, setUnread] = useState({})
  const [groupUnread, setGroupUnread] = useState(0)
  const [lastRead, setLastRead] = useState({})
  const [lastGroupRead, setLastGroupRead] = useState(0)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [mobileView, setMobileView] = useState('list')
  const activeUserRef = useRef(null)
  const activeGroupRef = useRef(false)
  const meRef = useRef(null)

  useEffect(() => { activeUserRef.current = activeUser }, [activeUser])
  useEffect(() => { activeGroupRef.current = activeGroup }, [activeGroup])
  useEffect(() => { meRef.current = me }, [me])

  // 알림 권한 요청 (최초 1회)
  useEffect(() => { requestNotificationPermission() }, [])

  // 탭 타이틀 미읽음 숫자 업데이트
  useEffect(() => {
    const total = Object.values(unread).reduce((a, b) => a + (Number(b) || 0), 0) + (Number(groupUnread) || 0)
    totalUnreadRef.current = total
    if (total > 0) {
      document.title = `(${total}) Jatry`
    } else {
      document.title = 'Jatry'
    }
  }, [unread, groupUnread])

  useEffect(() => {
    let unsubUsers = null
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return }
      setMe(user)
      const onlineRef = ref(db, `users/${user.uid}/online`)
      const connectedRef = ref(db, '.info/connected')

      // Firebase Presence — 연결 상태를 Firebase 서버가 직접 관리
      onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          onDisconnect(onlineRef).set(false)
          onDisconnect(ref(db, `users/${user.uid}/lastSeen`)).set(Date.now())
          set(onlineRef, true)
        }
      })

      unsubUsers = onValue(ref(db, 'users'), (snap) => {
        const data = snap.val()
        if (!data) { setUsers([]); setLoadingUsers(false); return }
        // 빈 배열 깜빡임 방지 — 유저가 있을 때만 업데이트
        const list = Object.values(data).filter((u) => u.online && u.username)
        setUsers(list)
        setLoadingUsers(false)
      })
    })
    return () => { unsub(); if (unsubUsers) unsubUsers() }
  }, [])

  // 메시지 리스너
  useEffect(() => {
    if (!me || !activeUser) return
    const roomId = [me.uid, activeUser.uid].sort().join('_')

    set(ref(db, `rooms/${roomId}/lastRead/${me.uid}`), Date.now())
    setUnread((prev) => ({ ...prev, [activeUser.uid]: 0 }))

    const unsub = onValue(ref(db, `rooms/${roomId}/messages`), (snap) => {
      const data = snap.val()
      if (!data) { setMessages([]); return }
      const all = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter((m) => m.timestamp && isSameDay(m.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
      setMessages(all)
      set(ref(db, `rooms/${roomId}/lastRead/${me.uid}`), Date.now())
      setUnread((prev) => ({ ...prev, [activeUser.uid]: 0 }))
    })

    const unsubLastRead = onValue(ref(db, `rooms/${roomId}/lastRead/${activeUser.uid}`), (snap) => {
      const ts = snap.val()
      if (ts) setLastRead((prev) => ({ ...prev, [activeUser.uid]: ts }))
    })

    return () => { unsub(); unsubLastRead() }
  }, [me, activeUser])

  // All 리스너
  useEffect(() => {
    if (!me) return
    const unsub = onValue(ref(db, 'rooms/__public__/messages'), (snap) => {
      const data = snap.val()
      if (!data) { setGroupMessages([]); return }
      const all = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter((m) => m.timestamp && isSameDay(m.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
      setGroupMessages(all)
      // 탭이 보이고 있고 그룹챗이 활성일 때만 읽음 처리
      const tabVisible = document.visibilityState !== 'hidden' && document.hasFocus()
      if (activeGroupRef.current && tabVisible) {
        set(ref(db, `rooms/__public__/lastRead/${me.uid}`), Date.now())
        setGroupUnread(0)
        localStorage.setItem('lastSeen___public__', String(Date.now()))
      }
    })
    // All방 lastRead 기반 미읽음
    let myGroupLastRead = 0
    const unsubLR = onValue(ref(db, `rooms/__public__/lastRead/${me.uid}`), (snap) => {
      myGroupLastRead = snap.val() || 0
      setLastGroupRead(myGroupLastRead)
    })
    return () => { unsub(); unsubLR() }
  }, [me])

  // All방 미읽음 카운트 — localStorage lastSeen 기반
  useEffect(() => {
    if (!me) return
    const unsub = onValue(ref(db, 'rooms/__public__/messages'), (snap) => {
      const data = snap.val()
      if (!data) return
      const tabVisible = document.visibilityState !== 'hidden' && document.hasFocus()
      // 탭 보이고 그룹챗 열려있으면 카운트 안 함
      if (activeGroupRef.current && tabVisible) return
      const lastSeen = parseInt(localStorage.getItem('lastSeen___public__') || '0')
      const count = Object.values(data).filter(
        (m) => m.sender !== me.uid && m.timestamp > lastSeen && isSameDay(m.timestamp)
      ).length
      setGroupUnread(count)
    })
    return () => unsub()
  }, [me])

  // 전체 미읽음 카운트 — lastRead 기반
  useEffect(() => {
    if (!me || users.length === 0) return
    const unsubs = []
    users.forEach((u) => {
      if (u.uid === me.uid) return
      const roomId = [me.uid, u.uid].sort().join('_')

      // 내 lastRead 타임스탬프 가져오기
      let myLastRead = 0
      const unsubLR = onValue(ref(db, `rooms/${roomId}/lastRead/${me.uid}`), (snap) => {
        myLastRead = snap.val() || 0
      })

      const unsubMsgs = onValue(ref(db, `rooms/${roomId}/messages`), (snap) => {
        const data = snap.val()
        if (!data) { setUnread((prev) => ({ ...prev, [u.uid]: 0 })); return }
        if (activeUserRef.current?.uid === u.uid) return
        const count = Object.values(data).filter(
          (m) => m.sender !== me.uid && m.timestamp > myLastRead && isSameDay(m.timestamp)
        ).length
        // side effect는 state updater 밖에서
        setUnread((prev) => {
          if (count > (prev[u.uid] || 0)) {
            setTimeout(() => {
              const settings = JSON.parse(localStorage.getItem('notifySettings') || '{}')
              if (settings[u.uid] !== false) sendSilentNotification()
            }, 0)
          }
          return { ...prev, [u.uid]: count }
        })
      })
      unsubs.push(unsubLR, unsubMsgs)
    })
    return () => unsubs.forEach((u) => u())
  }, [me, users])

  const handleSelectUser = (user) => {
    // 이전 채팅 나가는 시간 저장
    if (activeUserRef.current) {
      localStorage.setItem(`lastSeen_${activeUserRef.current.uid}`, String(Date.now()))
    }
    setActiveUser(user)
    setActiveGroup(false)
    setMessages([])
    setUnread((prev) => ({ ...prev, [user.uid]: 0 }))
    setMobileView('chat')
  }

  const handleSelectGroup = () => {
    // 이전 채팅 lastSeen 저장
    if (activeUserRef.current) {
      localStorage.setItem(`lastSeen_${activeUserRef.current.uid}`, String(Date.now()))
    }
    setActiveGroup(true)
    setActiveUser(null)
    setMessages([])
    setGroupUnread(0)
    setMobileView('chat')
    if (me) set(ref(db, `rooms/__public__/lastRead/${me.uid}`), Date.now())
  }

  const handleCloseChat = () => {
    if (activeUserRef.current) {
      localStorage.setItem(`lastSeen_${activeUserRef.current.uid}`, String(Date.now()))
    }
    if (activeGroupRef.current) {
      localStorage.setItem('lastSeen___public__', String(Date.now()))
    }
    setActiveUser(null)
    setActiveGroup(false)
    setMessages([])
  }

  const handleLogout = async () => {
    if (me) {
      await set(ref(db, `users/${me.uid}/online`), false)
      await set(ref(db, `users/${me.uid}/lastSeen`), Date.now())
    }
    await signOut(auth)
    router.push('/')
  }

  return (
    <div className="h-screen overflow-hidden" style={{ background: 'var(--night)' }}>
      <div className="hidden md:flex h-full">
        {/* 사이드바 토글 버튼 — 닫혔을때만 표시 */}
        {!sidebarOpen && (
          <div style={{ width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
            <button onClick={() => setSidebarOpen(true)}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        )}
        <div style={{
          width: sidebarOpen ? 260 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease',
        }}>
          <Sidebar me={me} users={users} activeUser={activeUser} unread={unread}
            onSelectUser={handleSelectUser} onLogout={handleLogout} loadingUsers={loadingUsers}
            activeGroup={activeGroup} onSelectGroup={handleSelectGroup} groupUnread={groupUnread}
            onClose={() => setSidebarOpen(false)} />
        </div>
        {activeGroup
          ? <GroupChatPanel me={me} messages={groupMessages} lastGroupRead={lastGroupRead} onClose={handleCloseChat} />
          : activeUser
            ? <ChatPanel me={me} activeUser={activeUser} messages={messages} lastRead={lastRead} onClose={handleCloseChat}
              notifyEnabled={notifySettings[activeUser?.uid] !== false}
              lastReadMark={typeof window !== 'undefined' ? parseInt(localStorage.getItem(`lastSeen_${activeUser?.uid}`) || '0') : 0}
              onToggleNotify={() => {
                const uid = activeUser?.uid
                if (!uid) return
                const next = { ...notifySettings, [uid]: notifySettings[uid] === false ? true : false }
                setNotifySettings(next)
                localStorage.setItem('notifySettings', JSON.stringify(next))
              }} />
            : <EmptyState />
        }
      </div>
      <div className="flex md:hidden h-full flex-col">
        {mobileView === 'list'
          ? <Sidebar me={me} users={users} activeUser={activeUser} unread={unread}
              onSelectUser={handleSelectUser} onLogout={handleLogout} loadingUsers={loadingUsers}
              activeGroup={activeGroup} onSelectGroup={handleSelectGroup} groupUnread={groupUnread} />
          : activeGroup
            ? <GroupChatPanel me={me} messages={groupMessages} lastGroupRead={lastGroupRead}
                onBack={() => { setMobileView('list'); setActiveGroup(false) }} />
            : <ChatPanel me={me} activeUser={activeUser} messages={messages} lastRead={lastRead}
                onBack={() => { setMobileView('list'); setActiveUser(null) }}
                notifyEnabled={notifySettings[activeUser?.uid] !== false}
                lastReadMark={typeof window !== 'undefined' ? parseInt(localStorage.getItem(`lastSeen_${activeUser?.uid}`) || '0') : 0}
                onToggleNotify={() => {
                  const uid = activeUser?.uid
                  if (!uid) return
                  const next = { ...notifySettings, [uid]: notifySettings[uid] === false ? true : false }
                  setNotifySettings(next)
                  localStorage.setItem('notifySettings', JSON.stringify(next))
                }} />
        }
      </div>

      {/* 버전 표시 */}
      <div style={{
        position: 'fixed', bottom: 14, right: 16,
        fontSize: 11, color: 'rgba(255,255,255,0.12)',
        letterSpacing: '0.04em', userSelect: 'none',
        zIndex: 10, pointerEvents: 'none',
      }}>
        v{APP_VERSION}
      </div>
    </div>
  )
}
