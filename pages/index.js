import { useState } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { ref, set, serverTimestamp } from 'firebase/database'

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

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
        uid: cred.user.uid,
        username,
        online: true,
        createdAt: serverTimestamp(),
      })
      setSuccess('가입 완료!')
      setTimeout(() => router.push('/chat'), 500)
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 아이디예요.')
      } else {
        setError('회원가입 중 오류가 발생했어요.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--night)' }}>
      {/* 좌측 브랜드 패널 */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 relative overflow-hidden"
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
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, #7c6af7, #4fa3f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>msng</span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold leading-snug mb-4" style={{ color: 'var(--text)' }}>
              실시간으로<br />대화하세요
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              접속 중인 사람과 바로 연결되는<br />1:1 메신저
            </p>
          </div>
        </div>
        <p className="text-xs relative z-10" style={{ color: 'var(--muted)' }}>Jatry000 · pmgoh.works</p>
      </div>

      {/* 우측 폼 */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
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
            <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>msng</span>
          </div>

          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {tab === 'login' ? '다시 오셨네요' : '시작하기'}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-dim)' }}>
            {tab === 'login' ? '아이디와 비밀번호를 입력해주세요' : '아이디와 비밀번호를 설정해주세요'}
          </p>

          <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>아이디</label>
              <input
                type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디 입력" required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>비밀번호</label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상" required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</p>}
            {success && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>{success}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl text-sm font-medium relative z-10 mt-1" style={{ opacity: loading ? 0.7 : 1 }}>
              <span className="relative z-10">{loading ? '처리 중...' : tab === 'login' ? '로그인' : '회원가입'}</span>
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-dim)' }}>
            {tab === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
            <button onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              className="font-medium transition-colors duration-150"
              style={{ color: '#7c6af7' }}
              onMouseEnter={(e) => e.target.style.color = '#9b8df9'}
              onMouseLeave={(e) => e.target.style.color = '#7c6af7'}
            >
              {tab === 'login' ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
