import { useState } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { ref, set } from 'firebase/database'

const APP_VERSION = '2.0'

// 회의실 PC 단위 자동 계정 — 개인 구분 없이, 기기별로 식별만.
// 한번 만든 계정은 localStorage에 저장해 재방문 시 그대로 재사용.
function rand6() {
  return Math.random().toString(36).slice(2, 8)
}

export default function AuthPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const enterRoom = async () => {
    setError('')
    setLoading(true)
    try {
      let stored = null
      try { stored = JSON.parse(localStorage.getItem('roomAuth') || 'null') } catch {}

      if (stored && stored.email && stored.pw) {
        // 이 기기의 기존 계정으로 재입장
        const cred = await signInWithEmailAndPassword(auth, stored.email, stored.pw)
        await set(ref(db, `users/${cred.user.uid}/online`), true)
      } else {
        // 이 기기의 새 계정 자동 생성
        const r = rand6()
        const email = `room_${r}@msng.app`
        const pw = `room_${r}`
        let cred
        try {
          cred = await createUserWithEmailAndPassword(auth, email, pw)
        } catch (e) {
          if (e.code === 'auth/email-already-in-use') {
            cred = await signInWithEmailAndPassword(auth, email, pw)
          } else { throw e }
        }
        const name = `회의실-${r.slice(0, 4).toUpperCase()}`
        await updateProfile(cred.user, { displayName: name })
        await set(ref(db, `users/${cred.user.uid}`), {
          uid: cred.user.uid,
          username: name,
          online: true,
          createdAt: Date.now(),
        })
        localStorage.setItem('roomAuth', JSON.stringify({ email, pw }))
      }
      router.push('/chat')
    } catch (e) {
      if (e.code === 'auth/network-request-failed') setError('네트워크 오류가 발생했어요.')
      else setError(`입장 중 오류가 발생했어요. (${e.code || e.message})`)
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
              회의별로 자료를 모아두고<br />어느 PC에서든 미리 올려두는 공간
            </p>
            <div className="mt-6 flex items-center gap-2">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>버튼만 눌러 입장 · 자료는 게시판에 영구 보관</p>
            </div>
          </div>

          <p className="text-xs relative z-10" style={{ color: 'var(--muted)' }}>필자닷컴 회의실</p>
        </div>

        {/* 우측 입장 */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#5F50D2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'white' }}>필</div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>필자닷컴 회의실</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>회의 자료 공유</p>
              </div>
            </div>

            <h2 className="font-bold mb-2" style={{ fontSize: 28, color: 'var(--text)' }}>입장하기</h2>
            <p className="mb-8" style={{ fontSize: 16, color: 'var(--text-dim)' }}>버튼을 누르면 바로 입장해요</p>

            {error && <p className="px-3 py-2 rounded-lg mb-3" style={{ fontSize: 14, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</p>}

            <button type="button" onClick={enterRoom} disabled={loading}
              className="btn-primary w-full rounded-xl font-bold relative z-10"
              style={{ opacity: loading ? 0.7 : 1, fontSize: 19, padding: '18px' }}>
              <span className="relative z-10">{loading ? '입장 중...' : '입장하기'}</span>
            </button>
          </div>
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: 14, right: 16, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', userSelect: 'none', zIndex: 10 }}>
        v{APP_VERSION}
      </div>
    </>
  )
}
