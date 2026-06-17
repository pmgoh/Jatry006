// /dm — 1:1 대화 (개인 구분이 필요할 때만 쓰는 별도 화면)
// 메인(/chat)에서는 숨기고, 기능은 그대로 보존.
import { ChatApp } from './chat'

export default function DM() {
  return <ChatApp mode="dm" />
}
