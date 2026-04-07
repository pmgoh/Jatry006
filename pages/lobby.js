import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue, set, onDisconnect } from 'firebase/database'

export default function Lobby() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubUsers = null

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/')
        return
      }
      setCurrentUser(user)

      const onlineRef = ref(db, `users/${user.uid}/online`)
      await set(onlineRef, true)
      onDisconnect(onlineRef).set(false)

      const usersRef = ref(db, 'users')
      unsubUsers = onValue(usersRef, (snap) => {
        const data = snap.val()
        if (!data) {
          setUsers([])
          setLoading(false)
          return
        }
        const list = Object.values(data).filter((u) => u.online && u.username)
        setUsers(list)
        setLoading(false)
      })
    })

    return () => {
      unsub()
      if (unsubUsers) unsubUsers()
    }
  }, [])

  const handleUserClick = (targetUser) => {
    const roomId = [currentUser.uid, targetUser.uid].sort().join('_')
    router.push(`/chat/${roomId}?with=${targetUser.username}`)
  }

  const handleLogout = async () => {
    if (currentUser) {
      await set(ref(db, `users/${currentUser.uid}/online`), false)
    }
    await signOut(auth)
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--night)' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', top: 0, left: '30%',
          width: 500, height: 400,
          background: 'radial-gradient(circle, rgba(124,106,247,0.05) 0%, transparent 70%)',
        }} />
      </div>

      <header className="flex items-center justify-between px-6 py-4 relative z-10" style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(17,19,24,0.8)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
            </svg>
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>msng</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {currentUser?.displayName}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: 'var(--text-dim)',
              border: '1px solid var(--border)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'rgba(248,113,113,0.4)'
              e.target.style.color = '#f87171'
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.color = 'var(--text-dim)'
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>접속 중인 유저</h1>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            클릭하면 1:1 채팅이 시작돼요
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '2px solid var(--border)',
              borderTopColor: '#7c6af7',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-3xl mb-3">👾</div>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>아직 접속한 유저가 없어요</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>다른 사람이 로그인하면 여기 표시돼요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user, i) => {
              const isMe = user.uid === currentUser?.uid
              return (
                <button
                  key={user.uid}
                  onClick={() => !isMe && handleUserClick(user)}
                  disabled={isMe}
                  className="user-card w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left animate-fade-up"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    animationFillMode: 'both',
                    cursor: isMe ? 'default' : 'pointer',
                    opacity: isMe ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, hsl(${(user.username.charCodeAt(0) * 17) % 360}, 60%, 40%), hsl(${(user.username.charCodeAt(0) * 37) % 360}, 70%, 55%))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 600, color: 'white',
                  }}>
                    {user.username[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user.username}</p>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{isMe ? '나' : '메시지 보내기'}</p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#4ade80',
                      boxShadow: '0 0 6px rgba(74,222,128,0.6)',
                    }} />
                    {!isMe && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)' }}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
