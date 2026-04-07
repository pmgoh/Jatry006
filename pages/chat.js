import { useEffect, useState, useRef } from 'react'
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
  useEffect(() => { const t = setTimeout(() => setVisible(true), 40); return () => clearTimeout(t) }, [])
  return (
    <div className={`flex items-end gap-2.5 ${isFirst ? 'mt-4' : 'mt-0.5'}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(4px)', transition: 'opacity 0.25s ease, transform 0.25s ease' }}>
      <div style={{ width: 28, flexShrink: 0, alignSelf: 'flex-end', marginBottom: 2 }}>
        {isLast && <AIIcon size={28} />}
      </div>
      <div style={{ maxWidth: '70%' }}>
        {isFirst && <p className="text-xs mb-1 ml-1" style={{ color: 'var(--muted)' }}>{msg.senderName}</p>}
        <div style={{
          padding: '10px 14px',
          borderRadius: isLast ? '14px 14px 14px 4px' : '14px',
          background: 'rgba(17,19,24,0.9)',
          border: '1px solid rgba(124,106,247,0.18)',
          boxShadow: '0 0 12px rgba(124,106,247,0.06), inset 0 0 20px rgba(124,106,247,0.02)',
          fontSize: 14, lineHeight: 1.65, color: 'var(--text)',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {msg.text}
        </div>
        {isLast && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, paddingLeft: 4 }}>{formatTime(msg.timestamp)}</p>}
      </div>
    </div>
  )
}

function MyMessageBubble({ msg, isFirst, isLast, otherLastRead }) {
  // 내 메시지 timestamp가 상대방 lastRead보다 이전이면 읽음
  const isRead = otherLastRead && msg.timestamp <= otherLastRead
  return (
    <div className={`flex justify-end ${isFirst ? 'mt-4' : 'mt-0.5'}`}>
      <div style={{ maxWidth: '70%' }}>
        <div style={{
          padding: '8px 13px',
          borderRadius: isLast ? '14px 14px 4px 14px' : '14px',
          background: 'linear-gradient(135deg, rgba(124,106,247,0.22), rgba(79,163,247,0.18))',
          border: '1px solid rgba(124,106,247,0.28)',
          fontSize: 14, lineHeight: 1.55, color: 'var(--text)',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {msg.text}
        </div>
        {isLast && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 3, paddingRight: 4, gap: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatTime(msg.timestamp)}</span>
            <ReadReceipt isRead={isRead} />
          </div>
        )}
      </div>
    </div>
  )
}

function Sidebar({ me, users, activeUser, unread, onSelectUser, onLogout, loadingUsers }) {
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
      </div>

      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
          접속 중 {otherUsers.length > 0 ? `· ${otherUsers.length}명` : ''}
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
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: '#4ade80', border: '2px solid var(--surface)', boxShadow: '0 0 5px rgba(74,222,128,0.5)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate leading-none mb-0.5" style={{ color: 'var(--text)', fontWeight: badge > 0 ? 600 : 500 }}>
                    {user.username}
                  </p>
                  <p className="text-xs truncate" style={{ color: badge > 0 ? 'rgba(124,106,247,0.9)' : 'var(--muted)', fontWeight: badge > 0 ? 500 : 400 }}>
                    {badge > 0 ? `${badge}개의 새 메시지` : '온라인'}
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

function ChatPanel({ me, activeUser, messages, lastRead, onBack, onClose }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (activeUser) setTimeout(() => inputRef.current?.focus(), 100) }, [activeUser])

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
  const otherLastRead = lastRead?.[activeUser?.uid] || 0

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--night)' }}>
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
        {/* 닫기 버튼 — 데스크탑 전용 */}
        {onClose && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="채팅 닫기"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* 메시지 리스트 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AIIcon size={36} />
            <p className="text-sm mt-3 mb-1" style={{ color: 'var(--text-dim)' }}>{activeUser.username}와의 대화</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>첫 메시지를 보내보세요</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender === me?.uid
          const prev = messages[i - 1], next = messages[i + 1]
          const isFirst = !prev || prev.sender !== msg.sender
          const isLast = !next || next.sender !== msg.sender
          return isMe
            ? <MyMessageBubble key={msg.id} msg={msg} isFirst={isFirst} isLast={isLast} otherLastRead={otherLastRead} />
            : <AIMessageBubble key={msg.id} msg={msg} isFirst={isFirst} isLast={isLast} />
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="glow-border flex items-end gap-2.5 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(24,28,36,0.95)', backdropFilter: 'blur(16px)' }}>
          <div className="flex-shrink-0 pb-0.5">
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
  )
}

export default function Chat() {
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [unread, setUnread] = useState({})
  const [lastRead, setLastRead] = useState({}) // { [otherUid]: timestamp }
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [mobileView, setMobileView] = useState('list')
  const activeUserRef = useRef(null)
  const meRef = useRef(null)

  useEffect(() => { activeUserRef.current = activeUser }, [activeUser])
  useEffect(() => { meRef.current = me }, [me])

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
        setUsers(Object.values(data).filter((u) => u.online && u.username))
        setLoadingUsers(false)
      })
    })
    return () => { unsub(); if (unsubUsers) unsubUsers() }
  }, [])

  // 메시지 리스너
  useEffect(() => {
    if (!me || !activeUser) return
    const roomId = [me.uid, activeUser.uid].sort().join('_')

    // 내가 읽은 시간 기록
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
      // 새 메시지 올 때마다 lastRead 갱신
      set(ref(db, `rooms/${roomId}/lastRead/${me.uid}`), Date.now())
      setUnread((prev) => ({ ...prev, [activeUser.uid]: 0 }))
    })

    // 상대방 lastRead 리스너 (읽음 표시용)
    const unsubLastRead = onValue(ref(db, `rooms/${roomId}/lastRead/${activeUser.uid}`), (snap) => {
      const ts = snap.val()
      if (ts) setLastRead((prev) => ({ ...prev, [activeUser.uid]: ts }))
    })

    return () => { unsub(); unsubLastRead() }
  }, [me, activeUser])

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
        setUnread((prev) => ({ ...prev, [u.uid]: count }))
      })
      unsubs.push(unsubLR, unsubMsgs)
    })
    return () => unsubs.forEach((u) => u())
  }, [me, users])

  const handleSelectUser = (user) => {
    setActiveUser(user)
    setMessages([])
    setUnread((prev) => ({ ...prev, [user.uid]: 0 }))
    setMobileView('chat')
  }

  const handleCloseChat = () => {
    setActiveUser(null)
    setMessages([])
  }

  const handleLogout = async () => {
    if (me) await set(ref(db, `users/${me.uid}/online`), false)
    await signOut(auth)
    router.push('/')
  }

  return (
    <div className="h-screen overflow-hidden" style={{ background: 'var(--night)' }}>
      <div className="hidden md:flex h-full">
        <div style={{ width: 260, flexShrink: 0 }}>
          <Sidebar me={me} users={users} activeUser={activeUser} unread={unread}
            onSelectUser={handleSelectUser} onLogout={handleLogout} loadingUsers={loadingUsers} />
        </div>
        {activeUser
          ? <ChatPanel me={me} activeUser={activeUser} messages={messages} lastRead={lastRead} onClose={handleCloseChat} />
          : <EmptyState />
        }
      </div>
      <div className="flex md:hidden h-full flex-col">
        {mobileView === 'list'
          ? <Sidebar me={me} users={users} activeUser={activeUser} unread={unread}
              onSelectUser={handleSelectUser} onLogout={handleLogout} loadingUsers={loadingUsers} />
          : <ChatPanel me={me} activeUser={activeUser} messages={messages} lastRead={lastRead}
              onBack={() => { setMobileView('list'); setActiveUser(null) }} />
        }
      </div>
    </div>
  )
}
