import { useState } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { ref, set, serverTimestamp } from 'firebase/database'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
}

function fakeEmail(username) {
  return `${username.toLowerCase().replace(/\s/g,'_')}_${todayStr()}@msg.local`
}

function SignupModal({ onClose }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (username.length < 2) return setError('닉네임은 2자 이상이어야 해요.')
    if (password.length < 4) return setError('비밀번호는 4자 이상이어야 해요.')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, fakeEmail(username), password)
      await updateProfile(cred.user, { displayName: username })
      await set(ref(db, `users/${cred.user.uid}`), {
        uid: cred.user.uid, username, online: true,
        createdAt: serverTimestamp(), createdDate: todayStr(),
      })
      setSuccess('준비됐어요!')
      setTimeout(() => router.push('/chat'), 500)
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('오늘 이미 사용 중인 닉네임이에요.')
      } else {
        setError('오류가 발생했어요. 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-up" style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>오늘의 닉네임 만들기</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--text-dim)' }}>오늘 하루만 유효한 임시 계정이에요</p>

        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>닉네임</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="오늘 사용할 닉네임" required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="4자 이상" required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</p>}
          {success && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>{success}</p>}

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3 rounded-xl text-sm font-medium relative z-10"
            style={{ opacity: loading ? 0.7 : 1 }}>
            <span className="relative z-10">{loading ? '생성 중...' : '오늘 계정 만들기'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, fakeEmail(username), password)
      await set(ref(db, `users/${cred.user.uid}/online`), true)
      setSuccess('입장!')
      setTimeout(() => router.push('/chat'), 400)
    } catch (err) {
      setError('닉네임 또는 비밀번호가 올바르지 않아요. 오늘 만든 계정인지 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
      <div className="min-h-screen flex" style={{ background: 'var(--night)' }}>

        {/* 좌측 브랜드 패널 */}
        <div className="hidden lg:flex flex-col justify-between w-[400px] flex-shrink-0 p-10 relative overflow-hidden"
          style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 65%)' }} />
            <div style={{ position: 'absolute', bottom: '5%', right: '-10%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(79,163,247,0.08) 0%, transparent 65%)' }} />
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-dim)' }}>msng</span>
          </div>

          <div className="relative z-10">
            <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>AI 프로젝트 06번째</p>
            <h1 className="text-3xl font-semibold leading-snug" style={{ color: 'var(--text)' }}>Jatry<br />메신저</h1>
            <div className="mt-5 h-px w-10" style={{ background: 'linear-gradient(90deg, #7c6af7, transparent)' }} />
            <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              오늘 하루만 유효한 닉네임으로<br />지금 접속 중인 사람과 바로 대화해요
            </p>
            <div className="mt-6 flex items-center gap-2">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>대화와 계정은 매일 자정 초기화</p>
            </div>
          </div>

          <p className="text-xs relative z-10" style={{ color: 'var(--muted)' }}>Jatry006 · pmgoh.works</p>
        </div>

        {/* 우측 폼 */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Jatry 메신저</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>AI 프로젝트 06번째</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>오늘의 닉네임으로 입장</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-dim)' }}>오늘 사용할 닉네임과 비밀번호를 입력하세요</p>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>닉네임</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="오늘 사용 중인 닉네임" required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>비밀번호</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력" required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</p>}
              {success && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>{success}</p>}

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3 rounded-xl text-sm font-medium relative z-10"
                style={{ opacity: loading ? 0.7 : 1 }}>
                <span className="relative z-10">{loading ? '입장 중...' : '입장하기'}</span>
              </button>
            </form>

            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>처음 오셨나요?</p>
              <button onClick={() => setShowSignup(true)}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{ color: 'var(--text)', border: '1px solid var(--border)', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,106,247,0.4)'; e.currentTarget.style.background = 'rgba(124,106,247,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
              >
                오늘 계정 만들기
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
