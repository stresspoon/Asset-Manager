## Context

Asset-Manager는 세무/경리 상담 관리 시스템으로, Notion API를 백엔드 DB로 사용하는 Next.js(Vite+React) 앱입니다.

**현재 상태:**
- 캘린더 뷰(`schedules.tsx`)에서 이벤트 색상은 `getStatusColor()`만 사용하며 `serviceType` 구분 없음
- `getServiceTypeColor()`가 `format.ts`에 정의되어 있으나 캘린더에는 미적용
- 예약 API(`POST /api/consult/submit`)에 동시 접근 제어 없음 — Notion DB 조회→생성 사이에 race condition 존재
- 모든 폰트 크기가 Tailwind 기본값(rem 기반, 16px root) 사용 — 뷰포트 크기에 비례하는 스케일링 없음
- 14인치 노트북에 최적화되어 있고, 27인치 모니터에서는 UI 요소가 비례적으로 작아 보임

**기술 스택:** React 18, Tailwind CSS v3.4, Express.js 5, Notion API, TanStack React Query v5

## Goals / Non-Goals

**Goals:**
- 캘린더 이벤트에 서비스 유형별 색상 코딩 적용 (명세서 2.4: 일반세무=파란, 경리아웃소싱=노란)
- 상담 시간 예약 시 서버 측 중복 방지 (같은 시간대 동시 예약 차단)
- 14인치~27인치 모니터에서 자연스러운 폰트/UI 비율 스케일링

**Non-Goals:**
- 캘린더 라이브러리 교체 (기존 커스텀 CalendarView 유지)
- WebSocket 기반 실시간 슬롯 업데이트 (폴링으로 충분)
- 모바일 퍼스트 반응형 재설계 (기존 sm: 브레이크포인트 유지)
- 접근성(a11y) 전면 감사

## Decisions

### 1. 캘린더 색상: 서비스 유형 기반 좌측 보더 + 상태 기반 배경

**선택:** 이벤트 아이템에 `serviceType` 기반 좌측 보더(border-left) 색상을 추가하고, 기존 `getStatusColor()` 배경은 유지

**대안 검토:**
- A) 배경색을 serviceType 기반으로 교체 → 상태 정보 손실
- B) 보더 + 배경 조합 (선택) → 두 정보 모두 표시, 기존 요구사항 2.4의 "색상 구분"도 충족
- C) 아이콘/이모지로 구분 → 10px 텍스트에서 가독성 부족

**구현:** `format.ts`에 `getServiceTypeBorderColor()` 추가 → `schedules.tsx` CalendarView에서 이벤트 div에 `border-l-2` 적용. 요구사항의 색상 매핑(일반세무=파란, 경리아웃소싱=노란)을 반영.

### 2. 예약 잠금: 인메모리 mutex + Notion 이중 검증

**선택:** 서버 측 인메모리 잠금(날짜+시간 키)으로 동시 요청 직렬화 + Notion DB 재조회로 이중 확인

**대안 검토:**
- A) Notion DB만으로 검증 (현재) → race condition 해결 불가
- B) Redis 분산 잠금 → 인프라 추가 필요, 현재 단일 서버로 과도
- C) 인메모리 Map 기반 mutex (선택) → 단일 서버 환경에 적합, 추가 의존성 없음
- D) PostgreSQL advisory lock → 이미 Notion을 주 DB로 사용 중이라 부적합

**구현:**
1. `server/booking-lock.ts` — `Map<string, Promise>` 기반. 키는 `${date}T${time}`
2. `POST /api/consult/submit` 핸들러에서: lock 획득 → `getBookedSlots()` 재조회 → 가용 확인 → 생성 → lock 해제
3. 슬롯이 이미 예약된 경우 `409 Conflict` 응답
4. 클라이언트에서 409 수신 시 슬롯 목록 재조회 + 사용자 안내 메시지

### 3. 반응형 스케일링: CSS clamp() 기반 root font-size

**선택:** `:root`에 `font-size: clamp(14px, 0.45vw + 12px, 18px)` 적용하여 뷰포트에 비례하는 기본 폰트 크기 설정

**대안 검토:**
- A) 미디어 쿼리 브레이크포인트별 font-size 설정 → 불연속적 점프, 부자연스러움
- B) vw 단위만 사용 → 극단적 화면에서 가독성 문제
- C) clamp() 함수 (선택) → 최소/최대 제한 내에서 연속적 스케일링, 모든 Tailwind rem 기반 유틸리티가 자동으로 비례
- D) JavaScript resize 이벤트 기반 → 불필요한 복잡성

**구현:**
- `client/src/index.css` `:root`에 `font-size: clamp(14px, 0.45vw + 12px, 18px)` 추가
- 14인치 노트북(~1440px): 약 18.5px → 기존과 유사
- 27인치 모니터(~2560px): 약 23.5px → 자연스럽게 확대
- Tailwind의 모든 rem 기반 크기(text-sm, text-lg, p-4, gap-2 등)가 자동 스케일링됨
- 캘린더 셀의 `text-[10px]`, `text-xs` 등 고정 크기도 rem으로 전환 검토

## Risks / Trade-offs

- **[인메모리 잠금 휘발성]** → 서버 재시작 시 잠금 초기화되나, 잠금은 수 초 유지 후 해제되므로 실질적 영향 없음. Notion DB 이중 검증이 안전망 역할.
- **[clamp() 계산식 미세조정]** → 실제 27인치 모니터 테스트 후 계수 조정 필요할 수 있음. 초기값은 보수적으로 설정.
- **[캘린더 색상 조합 가독성]** → 보더+배경 조합이 10px 크기에서 시각적으로 충분한지 확인 필요. 대안으로 보더 두께를 3px로 증가 가능.
- **[기존 px 단위 하드코딩]** → `text-[10px]` 같은 하드코딩된 px 값은 clamp()의 영향을 받지 않음 → rem 단위로 변환 필요.
