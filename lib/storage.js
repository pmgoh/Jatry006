// lib/storage.js
// -------------------------------------------------------
// 공용 Cloudflare R2 스토리지 워커 연동 (c:\Coder 공통 인프라)
//   Worker: wearethefirst-storage  (C:\Coder\wearethefirst-storage)
//   문서:   C:\Coder\MEMORY\cloudflare-r2-storage.md
//   파일/자료는 Firebase가 아니라 이 워커를 통해 R2에 저장한다.
// -------------------------------------------------------

const WORKER_URL = 'https://wearethefirst-storage.uhak.workers.dev'

// 클라이언트 업로드 용량 상한 (워커/CDN 부담 방지). 필요시 조정.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25MB

// 파일명을 R2 키에 안전한 형태로
function safeName(name) {
  return String(name || 'file')
    .normalize('NFC')
    .replace(/[^\w.\-]+/g, '_')
    .slice(-80)
}

// roomId 별로 자료를 묶고, 타임스탬프로 CDN 캐시 우회 (덮어쓰기 금지 규칙)
export async function uploadFile(file, roomId) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`파일이 너무 큽니다 (최대 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB)`)
  }
  const key = `meeting/${roomId}/${Date.now()}_${safeName(file.name)}`
  const fd = new FormData()
  fd.append('file', file)
  fd.append('key', key)
  const res = await fetch(`${WORKER_URL}/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('업로드 실패 (' + res.status + ')')
  const data = await res.json()
  return { url: data.url, key: data.key }
}

// 7일 자동 정리 시 R2 원본도 같이 삭제 (용량 비용 누적 방지). 실패해도 무시.
export async function deleteFile(key) {
  if (!key) return
  try {
    await fetch(`${WORKER_URL}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
  } catch (e) { /* 무시 */ }
}
