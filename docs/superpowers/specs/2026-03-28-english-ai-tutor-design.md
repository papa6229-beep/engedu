# 편입영어 AI 튜터 — 설계 문서 v1.0

**날짜**: 2026-03-28
**상태**: 승인됨
**기반 문서**: `docs/편입영어_AI튜터_기획서_v1.0.md`

---

## 1. 프로젝트 개요

Claude API 기반 편입영어 전문 AI 튜터 웹 앱. 학생의 약점을 진단하고, 맞춤 커리큘럼을 자동 생성하며, 매일 AI가 문제를 만들어 제공한다. 프로토타입은 편입영어 문법 파트(관계사·분사구문·가정법·시제·수일치·병렬구조)에 집중.

---

## 2. 핵심 결정사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 플랫폼 | 반응형 웹 앱 (Next.js) | 빠른 배포, 향후 앱 전환 용이 |
| 로그인 | 없음 (프로토타입) | 빠른 테스트, 나중에 Supabase Auth 추가 |
| 데이터 저장 | 브라우저 로컬스토리지 | 로그인 없이도 학습 기록 유지 |
| AI 콘텐츠 | Claude 기본 성능 먼저 | 프로토타입 단계, RAG는 이후 단계에서 추가 |
| 네비게이션 | 반응형 (모바일: 하단 탭 / PC·태블릿: 왼쪽 사이드바) | 멀티 디바이스 지원 |
| 테마 | 라이트 모드 기본, 다크 모드 선택 전환 | 눈의 피로도 고려 |
| 색상 | 배경 #FAF9F6 (아이보리) · 포인트 #C96442 (구리빛) | Claude.ai 스타일 |
| 폰트 | 고운바탕 (한국어) + Lora (영어) | 고급스러운 명조 계열 |
| 배포 | Vercel | 기획서 그대로, 무료 시작 |

---

## 3. 기술 스택

```
Frontend     Next.js 16 (App Router) + TypeScript
Styling      Tailwind CSS + shadcn/ui
Charts       Recharts (레이더 차트, 꺾은선 그래프)
AI           Claude API — Sonnet (서버 사이드 전용)
Storage      브라우저 로컬스토리지 (zustand + persist)
Fonts        Gowun Batang + Lora (Google Fonts)
Deploy       Vercel
```

**Claude API 호출은 Next.js API Route(서버)에서만** — API 키가 브라우저에 노출되지 않는다.

---

## 4. 화면 구조 (5개 화면)

```
온보딩 (1회)
  └─ 시험 목표일 · 하루 학습시간 · 목표 대학 입력
     │
     ▼
레벨 테스트 (1회, 이후 4주마다 반복)
  └─ 6개 파트 × 4문항 = 24문항 AI 생성
  └─ 즉시 채점, 해설 미표시 (동기 저하 방지)
     │
     ▼
진단 리포트 + 커리큘럼 (1회)
  └─ 레이더 차트 (파트별 점수 시각화)
  └─ AI 진단 코멘트 (3~4문장)
  └─ D-day 역산 주차별 커리큘럼 자동 생성
     │
     ▼
일일 학습 대시보드 (매일 반복)
  └─ [오늘의 문제] 탭 — 커리큘럼 기반 AI 문제 생성
  └─ [오답 노트] 탭 — 이전 오답 재출제 + 상세 해설
  └─ [오늘의 단어] 탭 — 파트 연관 어휘 5~10개
  └─ [숙제 체크] 탭 — 오늘 미션 목록
     │
     ▼
주간 리포트 (매주)
  └─ 파트별 점수 변화 꺾은선 그래프
  └─ 이번 주 총 학습량 요약
  └─ 가장 많이 틀린 유형 Top 3
  └─ AI 주간 코멘트 + 다음 주 커리큘럼 미리보기
```

---

## 5. 로컬스토리지 데이터 모델

```typescript
// 온보딩
onboarding: {
  examType: 'transfer' | 'civil' | 'suneung'
  targetDate: string          // ISO 날짜
  dailyMinutes: 30 | 60 | 120 | 180
  targetUniversity: string
  completedAt: string
}

// 레벨테스트 결과 (4주마다 재테스트 가능하므로 배열)
levelTests: {
  results: { part: string; score: number; total: number }[]
  testedAt: string
}[]

// 커리큘럼
curriculum: {
  weeks: {
    weekNum: number
    part: string
    dailyCount: number
  }[]
  generatedAt: string
}

// 일일 세션 기록
dailySessions: {
  date: string                // YYYY-MM-DD
  part: string
  completed: boolean
  score: number
  durationSec: number
}[]

// 오답 노트
wrongNotes: {
  questionJson: object        // 문제 전체 JSON
  wrongCount: number
  lastWrongAt: string
  nextReviewAt: string
}[]

// 주간 리포트
weeklyReports: {
  weekStart: string
  reportJson: object
  generatedAt: string
}[]
```

---

## 6. Claude AI 역할 분담

| 기능 | 입력 | 출력 |
|------|------|------|
| 문제 생성 | 파트 · 난이도 · 대학 스타일 · 문항 수 | JSON 문제 배열 |
| 채점 | 클라이언트에서 처리 | 문제 JSON의 `answer` 필드와 선택 답 비교 (API 불필요) |
| 해설 생성 | 오답 시 문제 JSON + 선택 답 | 3단계 해설 + 함정 포인트 |
| 진단 코멘트 | 파트별 점수 배열 | 학생 수준 분석 3~4문장 |
| 커리큘럼 생성 | 약점 파트 + D-day + 하루 학습시간 | 주차별 로드맵 JSON |
| 일일 문제 세트 | 오늘 파트 + 오답 이력 | 오늘의 문제 구성 |
| 단어장 | 오늘 학습 파트 | 핵심 어휘 5~10개 + 예문 |
| 주간 리포트 | 한 주 세션 데이터 | 잘한점·아쉬운점·다음주 제안 |

### 문제 JSON 구조

```json
{
  "id": 1,
  "type": "관계사",
  "question": "지시문",
  "sentence": "영문 (빈칸: _____)",
  "options": ["(A)...", "(B)...", "(C)...", "(D)..."],
  "answer": "(A)...",
  "explanation": "상세 해설",
  "trap": "함정 포인트",
  "difficulty": "중급"
}
```

---

## 7. 네비게이션 구조

```
모바일 (< 768px)
  하단 탭 4개: 홈 | 학습 | 오답 | 리포트

PC / 태블릿 (≥ 768px)
  왼쪽 사이드바:
    편입AI튜터 (로고)
    ─────────────────
    🏠 홈
    📝 오늘 학습
    ❌ 오답 노트
    📊 리포트
    📚 단어장
    ─────────────────
    🌙 다크 모드 (하단 고정)
```

---

## 8. 디자인 시스템

```
배경색     #FAF9F6  (따뜻한 아이보리)
포인트     #C96442  (구리빛 오렌지)
텍스트     #1a1714  (따뜻한 검정)
서브텍스트  #a89f96
테두리     #e8e4dc
카드배경   #ffffff

한국어 폰트  Gowun Batang (400, 700)
영어 폰트    Lora (400, 500, 600)
다크모드     사용자 선택 토글 (기본값: 라이트)
```

---

## 9. 개발 로드맵 (Phase별)

### Phase 1 — 1~2주: 기반 세팅 + AI 동작 확인
- Next.js 프로젝트 세팅 (TypeScript, Tailwind, shadcn/ui)
- 디자인 시스템 적용 (폰트, 색상, 공통 컴포넌트)
- Claude API 연결 — 문제 생성·채점 동작 확인
- 온보딩 화면 구현

### Phase 2 — 3~4주: 진단 + 커리큘럼
- 레벨 테스트 화면 (24문항 AI 생성)
- 진단 리포트 화면 (레이더 차트 + AI 코멘트)
- 커리큘럼 자동 생성 + 화면

### Phase 3 — 5~6주: 일일 학습 코어
- 일일 학습 대시보드 (4개 탭)
- 오답 처리 로직 (3단계 해설, 재출제)
- 오답 노트 + 단어장
- 로컬스토리지 연동 완성

### Phase 4 — 7~8주: 리포트 + 마무리
- 주간 리포트 (꺾은선 차트 + AI 코멘트)
- 레벨업 테스트 (4주 단위)
- 반응형 최종 점검
- Vercel 배포

---

## 10. 향후 확장 (프로토타입 이후)

1. **Supabase 연동** — 로그인 추가, 로컬스토리지 → DB 마이그레이션
2. **RAG 강화** — 강사 PDF 자료 업로드 → 문제 생성 품질 향상
3. **시험 확장** — 공무원영어, 수능영어 파트 추가
4. **iOS/Android 앱** — 웹 → React Native(Expo) 전환

---

*설계 확정일: 2026-03-28*
*다음 단계: 구현 계획서 작성 (writing-plans)*
