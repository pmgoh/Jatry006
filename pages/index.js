import { useState } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { ref, set, get } from 'firebase/database'

const APP_VERSION = '1.2'
const PIN_CODE = '0542'

// 닉네임 → 고정 이메일 (날짜 없음 — 영구 계정)
function fakeEmail(username) {
  const safe = Array.from(username).map(c => c.charCodeAt(0)).join('')
  return `u${safe}@msng.app`
}

export default function AuthPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    if (!username.trim()) return setError('닉네임을 입력해주세요.')
    if (username.trim().length < 2) return setError('닉네임은 2자 이상이어야 해요.')
    if (pin !== PIN_CODE) return setError('핀코드가 올바르지 않아요.')

    setLoading(true)
    const email = fakeEmail(username.trim())

    try {
      // 기존 계정 로그인 시도
      const cred = await signInWithEmailAndPassword(auth, email, PIN_CODE)
      await set(ref(db, `users/${cred.user.uid}/online`), true)
      setSuccess('입장!')
      setTimeout(() => router.push('/chat'), 400)
    } catch (loginErr) {
      if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
        // 새 계정 자동 생성
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, PIN_CODE)
          await updateProfile(cred.user, { displayName: username.trim() })
          await set(ref(db, `users/${cred.user.uid}`), {
            uid: cred.user.uid,
            username: username.trim(),
            online: true,
            createdAt: Date.now(),
          })
          setSuccess('입장!')
          setTimeout(() => router.push('/chat'), 400)
        } catch (signupErr) {
          if (signupErr.code === 'auth/network-request-failed') {
            setError('네트워크 오류가 발생했어요.')
          } else {
            setError(`오류가 발생했어요. (${signupErr.code})`)
          }
        }
      } else if (loginErr.code === 'auth/network-request-failed') {
        setError('네트워크 오류가 발생했어요.')
      } else if (loginErr.code === 'auth/too-many-requests') {
        setError('잠시 후 다시 시도해주세요.')
      } else {
        setError(`오류가 발생했어요. (${loginErr.code})`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen flex" style={{ background: 'var(--night)' }}>
        {/* 좌측 브랜드 패널 */}
        <div className="hidden lg:flex flex-col justify-between w-[400px] flex-shrink-0 p-10 relative overflow-hidden"
          style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 65%)' }} />
            <div style={{ position: 'absolute', bottom: '5%', right: '-10%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(79,163,247,0.08) 0%, transparent 65%)' }} />
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#5F50D2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'white' }}>필</div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-dim)' }}>필자닷컴 회의실</span>
          </div>

          <div className="relative z-10">
            <p className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>회의 자료 공유</p>
            <h1 className="text-3xl font-semibold leading-snug" style={{ color: 'var(--text)' }}>필자닷컴<br />회의실</h1>
            <div className="mt-5 h-px w-10" style={{ background: 'linear-gradient(90deg, #7c6af7, transparent)' }} />
            <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              회의 안건별로 자료를<br />빠르게 공유하는 사내 채널
            </p>
            <div className="mt-6 flex items-center gap-2">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>핀코드로 입장 · 7일 후 자동 정리</p>
            </div>
          </div>

          <p className="text-xs relative z-10" style={{ color: 'var(--muted)' }}>필자닷컴 회의실</p>
        </div>

        {/* 우측 폼 */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#5F50D2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'white' }}>필</div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>필자닷컴 회의실</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>회의 자료 공유</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>입장하기</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-dim)' }}>닉네임과 핀코드를 입력하세요</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>닉네임</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="사용할 닉네임" required autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(124,106,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,106,247,0.12)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>핀코드</label>
                <input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="4자리 핀코드" required autoComplete="current-password"
                  inputMode="numeric" maxLength={4}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', letterSpacing: '0.3em' }}
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
          </div>
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: 14, right: 16, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', userSelect: 'none', zIndex: 10 }}>
        v{APP_VERSION}
      </div>
    </>
  )
}
