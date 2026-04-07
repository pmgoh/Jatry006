import { useState } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { ref, set, serverTimestamp } from 'firebase/database'

function SignupModal({ onClose }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const fakeEmail = (u) => `${u.toLowerCase().replace(/\s/g, '_')}@msg.local`

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (username.length < 2) return setError('아이디는 2자 이상이어야 해요.')
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 해요.')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, fakeEmail(username), password)
      await updateProfile(cred.user, { displayName: username })
      await set(ref(db, `users/${cred.user.uid}`), {
        uid: cred.user.uid, username, online: true, createdAt: serverTimestamp(),
      })
      setSuccess('가입 완료! 이동 중...')
      setTimeout(() => router.push('/chat'), 600)
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? '이미 사용 중인 아이디예요.' : '회원가입 중 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-up" style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>새 계정 만들기</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>아이디와 비밀번호를 설정해주세요</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>아이디</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="2자 이상" required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상" required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</p>}
          {success && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>{success}</p>}

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3 rounded-xl text-sm font-medium relative z-10 mt-1"
            style={{ opacity: loading ? 0.7 : 1 }}>
            <span className="relative z-10">{loading ? '처리 중...' : '계정 만들기'}</span>
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

  const fakeEmail = (u) => `${u.toLowerCase().replace(/\s/g, '_')}@msg.local`

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, fakeEmail(username), password)
      await set(ref(db, `users/${cred.user.uid}/online`), true)
      setSuccess('로그인됐어요!')
      setTimeout(() => router.push('/chat'), 500)
    } catch (err) {
      setError('아이디 또는 비밀번호가 올바르지 않아요.')
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
            <div style={{
              position: 'absolute', top: '-10%', left: '-20%',
              width: 500, height: 500,
              background: 'radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 65%)',
            }} />
            <div style={{
              position: 'absolute', bottom: '5%', right: '-10%',
              width: 350, height: 350,
              background: 'radial-gradient(circle, rgba(79,163,247,0.08) 0%, transparent 65%)',
            }} />
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-dim)' }}>msng</span>
          </div>

          <div className="relative z-10">
            <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>
              AI 프로젝트 06번째
            </p>
            <h1 className="text-3xl font-semibold leading-snug" style={{ color: 'var(--text)' }}>
              Jatry<br />메신저
            </h1>
            <div className="mt-5 h-px w-10" style={{ background: 'linear-gradient(90deg, #7c6af7, transparent)' }} />
            <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              로그인 중인 사람끼리<br />실시간으로 연결되는 1:1 채팅
            </p>
          </div>

          <p className="text-xs relative z-10" style={{ color: 'var(--muted)' }}>Jatry000 · pmgoh.works</p>
        </div>

        {/* 우측 로그인 폼 */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            {/* 모바일 로고 */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Jatry 메신저</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>AI 프로젝트 06번째</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>다시 오셨네요</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-dim)' }}>아이디와 비밀번호를 입력해주세요</p>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>아이디</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디 입력" required
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
                <span className="relative z-10">{loading ? '로그인 중...' : '로그인'}</span>
              </button>
            </form>

            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>처음 오셨나요?</p>
              <button onClick={() => setShowSignup(true)}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,106,247,0.4)'; e.currentTarget.style.background = 'rgba(124,106,247,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
              >
                새 계정 만들기
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
