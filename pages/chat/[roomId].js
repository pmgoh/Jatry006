import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { ref, push, onValue, serverTimestamp, query, orderByChild } from 'firebase/database'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(ts, now = Date.now()) {
  const d = new Date(ts)
  const today = new Date(now)
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
}

export default function ChatRoom() {
  const router = useRouter()
  const { roomId } = router.query
  const withName = router.query.with || '상대방'

  const [currentUser, setCurrentUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/'); return }
      setCurrentUser(user)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!roomId) return
    const msgsRef = query(ref(db, `rooms/${roomId}/messages`), orderByChild('timestamp'))
    const unsub = onValue(msgsRef, (snap) => {
      const data = snap.val()
      if (!data) return setMessages([])
      const all = Object.entries(data).map(([id, v]) => ({ id, ...v }))
      // 당일 메시지만 필터링
      const todayMsgs = all.filter((m) => m.timestamp && isSameDay(m.timestamp))
      setMessages(todayMsgs)
    })
    return () => unsub()
  }, [roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !currentUser || !roomId || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    try {
      await push(ref(db, `rooms/${roomId}/messages`), {
        sender: currentUser.uid,
        senderName: currentUser.displayName,
        text,
        timestamp: Date.now(),
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--night)' }}>
      {/* 배경 */}
      <div className="fixed inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', bottom: 0, right: '20%',
          width: 500, height: 400,
          background: 'radial-gradient(circle, rgba(79,163,247,0.04) 0%, transparent 70%)',
        }} />
      </div>

      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 py-3.5 relative z-10 flex-shrink-0" style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(17,19,24,0.85)',
        backdropFilter: 'blur(16px)',
      }}>
        <button
          onClick={() => router.push('/lobby')}
          className="p-1.5 rounded-lg transition-colors duration-150"
          style={{ color: 'var(--text-dim)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        {/* 아바타 */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `linear-gradient(135deg, hsl(${(withName.charCodeAt(0) * 17) % 360}, 60%, 40%), hsl(${(withName.charCodeAt(0) * 37) % 360}, 70%, 55%))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, color: 'white',
        }}>
          {withName[0]?.toUpperCase()}
        </div>

        <div>
          <p className="text-sm font-medium leading-none mb-0.5" style={{ color: 'var(--text)' }}>{withName}</p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>온라인</p>
        </div>
      </header>

      {/* 메시지 리스트 */}
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-3 relative z-10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="text-2xl mb-2">💬</div>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{withName}와의 대화가 시작됐어요</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>메시지를 보내보세요</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender === currentUser?.uid
          const showTime = i === messages.length - 1 || messages[i + 1]?.sender !== msg.sender

          return (
            <div
              key={msg.id}
              className="flex animate-fade-up"
              style={{
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                animationDelay: '0s',
                animationFillMode: 'both',
              }}
            >
              <div style={{ maxWidth: '72%' }}>
                {/* 말풍선 */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'msg-bubble-me' : 'msg-bubble-other'}`}
                  style={{
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    color: 'var(--text)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.text}
                </div>
                {/* 시간 */}
                {showTime && (
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: 'var(--muted)',
                      textAlign: isMe ? 'right' : 'left',
                      paddingLeft: isMe ? 0 : 4,
                      paddingRight: isMe ? 4 : 0,
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      {/* 입력창 - Copilot 스타일 */}
      <div className="px-4 pb-5 pt-3 flex-shrink-0 relative z-10">
        <div
          className="glow-border flex items-end gap-2 px-4 py-3 rounded-2xl transition-all duration-200"
          style={{ background: 'rgba(24,28,36,0.9)', backdropFilter: 'blur(12px)' }}
        >
          {/* 아이콘 영역 (좌측) */}
          <div className="flex-shrink-0 pb-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--muted)' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 12s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="9.5" r="1" fill="currentColor"/>
              <circle cx="15" cy="9.5" r="1" fill="currentColor"/>
            </svg>
          </div>

          {/* 텍스트 입력 */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // 자동 높이 조절
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
            style={{
              color: 'var(--text)',
              caretColor: '#7c6af7',
              maxHeight: 120,
              overflow: 'auto',
            }}
          />

          {/* 전송 버튼 */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="send-btn flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              width: 32, height: 32,
              opacity: input.trim() ? 1 : 0.35,
              cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="text-center text-xs mt-2" style={{ color: 'var(--muted)' }}>
          Enter로 전송 · Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  )
}
