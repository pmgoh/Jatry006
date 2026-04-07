import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, set, push, onDisconnect, serverTimestamp } from 'firebase/database'

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(ts) {
  const d = new Date(ts)
  const t = new Date()
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
      fontSize: size * 0.4, fontWeight: 600, color: 'white', letterSpacing: '-0.02em',
    }}>
      {name[0].toUpperCase()}
    </div>
  )
}

export default function Chat() {
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [unread, setUnread] = useState({}) // { uid: count }
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const activeUserRef = useRef(null)

  useEffect(() => { activeUserRef.current = activeUser }, [activeUser])

  // Auth + users listener
  useEffect(() => {
    let unsubUsers = null
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/'); return }
      setMe(user)
      const onlineRef = ref(db, `users/${user.uid}/online`)
      await set(onlineRef, true)
      onDisconnect(onlineRef).set(false)

      unsubUsers = onValue(ref(db, 'users'), (snap) => {
        const data = snap.val()
        if (!data) { setUsers([]); setLoadingUsers(false); return }
        const list = Object.values(data).filter((u) => u.online && u.username)
        setUsers(list)
        setLoadingUsers(false)
      })
    })
    return () => { unsub(); if (unsubUsers) unsubUsers() }
  }, [])

  // Messages listener + unread tracking
  useEffect(() => {
    if (!me || !activeUser) return
    const roomId = [me.uid, activeUser.uid].sort().join('_')
    const msgsRef = ref(db, `rooms/${roomId}/messages`)

    const unsub = onValue(msgsRef, (snap) => {
      const data = snap.val()
      if (!data) { setMessages([]); return }
      const all = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter((m) => m.timestamp && isSameDay(m.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
      setMessages(all)
      // clear unread for active user
      setUnread((prev) => ({ ...prev, [activeUser.uid]: 0 }))
    })
    return () => unsub()
  }, [me, activeUser])

  // Global unread listener for all rooms
  useEffect(() => {
    if (!me || users.length === 0) return
    const unsubs = []
    users.forEach((u) => {
      if (u.uid === me.uid) return
      const roomId = [me.uid, u.uid].sort().join('_')
      const unsub = onValue(ref(db, `rooms/${roomId}/messages`), (snap) => {
        const data = snap.val()
        if (!data) return
        const msgs = Object.values(data).filter((m) => m.timestamp && isSameDay(m.timestamp))
        const unreadCount = msgs.filter((m) => m.sender !== me.uid && !m.readBy?.[me.uid]).length
        if (activeUserRef.current?.uid !== u.uid) {
          setUnread((prev) => ({ ...prev, [u.uid]: unreadCount }))
        }
      })
      unsubs.push(unsub)
    })
    return () => unsubs.forEach((u) => u())
  }, [me, users])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectUser = (user) => {
    setActiveUser(user)
    setMessages([])
    setUnread((prev) => ({ ...prev, [user.uid]: 0 }))
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleSend = async () => {
    if (!input.trim() || !me || !activeUser || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const roomId = [me.uid, activeUser.uid].sort().join('_')
    try {
      await push(ref(db, `rooms/${roomId}/messages`), {
        sender: me.uid,
        senderName: me.displayName,
        text,
        timestamp: Date.now(),
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleLogout = async () => {
    if (me) await set(ref(db, `users/${me.uid}/online`), false)
    await signOut(auth)
    router.push('/')
  }

  const otherUsers = users.filter((u) => u.uid !== me?.uid)
  const meUser = users.find((u) => u.uid === me?.uid)

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--night)' }}>

      {/* ── 사이드바 ── */}
      <aside className="flex flex-col w-[260px] flex-shrink-0 relative z-10" style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}>
        {/* 사이드바 헤더 */}
        <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
            </svg>
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>msng</span>
        </div>

        {/* 섹션 라벨 */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
            접속 중 {otherUsers.length > 0 ? `· ${otherUsers.length}명` : ''}
          </p>
        </div>

        {/* 유저 목록 */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '2px solid var(--border)', borderTopColor: '#7c6af7',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : otherUsers.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>다른 유저가 없어요</p>
            </div>
          ) : (
            otherUsers.map((user) => {
              const isActive = activeUser?.uid === user.uid
              const badge = unread[user.uid] || 0
              return (
                <button
                  key={user.uid}
                  onClick={() => handleSelectUser(user)}
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
                      background: '#4ade80',
                      border: '2px solid var(--surface)',
                      boxShadow: '0 0 5px rgba(74,222,128,0.5)',
                    }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-none mb-0.5" style={{ color: isActive ? 'var(--text)' : 'var(--text-dim)' }}>
                      {user.username}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>온라인</p>
                  </div>
                  {badge > 0 && (
                    <div style={{
                      minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                      background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: 'white',
                    }}>
                      {badge > 9 ? '9+' : badge}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* 내 프로필 하단 */}
        {meUser && (
          <div className="flex items-center gap-2.5 px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <Avatar name={meUser.username} size={30} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{meUser.username}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>나</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors duration-150"
              style={{ color: 'var(--muted)' }}
              title="로그아웃"
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        )}
      </aside>

      {/* ── 메인 채팅 영역 ── */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* 배경 글로우 */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{
            position: 'absolute', top: '10%', right: '15%',
            width: 500, height: 400,
            background: 'radial-gradient(circle, rgba(124,106,247,0.04) 0%, transparent 70%)',
          }} />
        </div>

        {!activeUser ? (
          /* 빈 상태 */
          <div className="flex-1 flex flex-col items-center justify-center relative z-10">
            <div style={{
              width: 52, height: 52, borderRadius: 14, marginBottom: 16,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--muted)' }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-dim)' }}>대화 상대를 선택하세요</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>왼쪽 목록에서 유저를 클릭하면 채팅이 시작돼요</p>
          </div>
        ) : (
          <>
            {/* 채팅 헤더 */}
            <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0 relative z-10" style={{
              borderBottom: '1px solid var(--border)',
              background: 'rgba(10,11,15,0.7)',
              backdropFilter: 'blur(16px)',
            }}>
              <div className="relative">
                <Avatar name={activeUser.username} size={34} />
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#4ade80',
                  border: '2px solid var(--night)',
                  boxShadow: '0 0 5px rgba(74,222,128,0.5)',
                }} />
              </div>
              <div>
                <p className="text-sm font-medium leading-none mb-0.5" style={{ color: 'var(--text)' }}>{activeUser.username}</p>
                <p className="text-xs" style={{ color: '#4ade80' }}>온라인</p>
              </div>
            </div>

            {/* 메시지 리스트 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 relative z-10">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{activeUser.username}와의 대화</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>첫 메시지를 보내보세요</p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isMe = msg.sender === me?.uid
                const prevMsg = messages[i - 1]
                const nextMsg = messages[i + 1]
                const isFirst = !prevMsg || prevMsg.sender !== msg.sender
                const isLast = !nextMsg || nextMsg.sender !== msg.sender
                const showTime = isLast

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}>
                    <div style={{ maxWidth: '68%' }}>
                      <div
                        className={isMe ? 'msg-bubble-me' : 'msg-bubble-other'}
                        style={{
                          padding: '8px 13px',
                          borderRadius: isMe
                            ? `14px 14px ${isLast ? '4px' : '14px'} 14px`
                            : `14px 14px 14px ${isLast ? '4px' : '14px'}`,
                          fontSize: 14,
                          lineHeight: 1.55,
                          color: 'var(--text)',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {msg.text}
                      </div>
                      {showTime && (
                        <p style={{
                          fontSize: 11,
                          color: 'var(--muted)',
                          marginTop: 3,
                          textAlign: isMe ? 'right' : 'left',
                          paddingLeft: isMe ? 0 : 4,
                          paddingRight: isMe ? 4 : 0,
                        }}>
                          {formatTime(msg.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* 입력창 — Copilot 스타일 */}
            <div className="px-4 pb-4 pt-3 flex-shrink-0 relative z-10">
              <div
                className="glow-border flex items-end gap-2.5 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(24,28,36,0.95)', backdropFilter: 'blur(16px)' }}
              >
                <div className="flex-shrink-0 pb-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--muted)' }}>
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 13s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="9" cy="9.5" r="1" fill="currentColor"/>
                    <circle cx="15" cy="9.5" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <textarea
                  ref={inputRef}
                  value={input}
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
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="send-btn flex-shrink-0 rounded-xl flex items-center justify-center"
                  style={{
                    width: 32, height: 32,
                    opacity: input.trim() ? 1 : 0.3,
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                    <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <p className="text-center text-xs mt-1.5" style={{ color: 'var(--muted)', fontSize: 11 }}>
                Enter 전송 · Shift+Enter 줄바꿈
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
