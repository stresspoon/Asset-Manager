## Why

상담 신청 폼의 일정 예약 기능이 작동하지 않고, 대시보드가 Notion DB 데이터를 표시하지 못하는 문제로 인해 상담 관리 시스템의 핵심 워크플로우가 차단되었다.

1. **시간 슬롯 API URL 불일치**: `consult-form.tsx`의 query key가 `getQueryFn`에 의해 잘못된 URL path로 변환되어 `available-slots` API가 404를 반환한다.
2. **Notion DB ID 불일치**: `.env.local`과 Vercel 환경변수의 DB ID가 실제 Notion 데이터베이스와 일치하지 않아 대시보드 API 호출이 `object_not_found` 에러를 발생시켰다. → **환경변수 수정으로 해결 완료**.
3. **예약 시스템 개선 필요**: 현재 30일 범위, 시각적 캘린더 미제공, 선착순 예약 미지원 상태.

## What Changes

- **[BUG FIX]** `Step3Schedule`의 available-slots query key를 query parameter 방식으로 수정하여 시간 슬롯이 정상 로드되도록 함
- **[ENHANCEMENT]** 예약 가능 기간을 오늘 기준 **7일 이내**로 제한 (현재 30일)
- **[ENHANCEMENT]** 시간 슬롯을 **1시간 간격**으로 제공 (10:00~17:00)
- **[ENHANCEMENT]** **선착순 예약**: 이미 예약된 시간은 비활성화하여 중복 방지
- **[ENHANCEMENT]** 캘린더 UI 개선: 날짜 클릭 → 요일/날짜 시각적 표시 → 시간 선택 흐름

## Capabilities

### New Capabilities
_(없음 — 기존 기능의 버그 수정 및 개선)_

### Modified Capabilities
- `schedule-booking`: 시간 슬롯 API 호출 방식 변경, 예약 가능 기간/간격 변경, 캘린더 UX 개선

## Impact

- **Client**: `client/src/pages/consult-form.tsx` — Step3Schedule 컴포넌트 전면 수정
- **Client**: `client/src/lib/queryClient.ts` — query key → URL 변환 로직 (수정 불필요, 호출 측에서 수정)
- **Server**: `server/routes.ts` — available-slots 라우트 (기존 동작 유지, 변경 없음)
- **Config**: `.env.local`, `.env.example`, Vercel 환경변수 — Notion DB ID 수정 완료
- **Dependencies**: 추가 패키지 없음
