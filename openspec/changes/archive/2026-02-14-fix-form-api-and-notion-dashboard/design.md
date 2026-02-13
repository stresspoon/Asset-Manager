## Context

상담 신청 폼(Step3Schedule)에서 날짜 선택 후 시간 슬롯이 로드되지 않는 버그가 존재한다.
`getQueryFn`이 query key 배열을 `"/"` 로 join하여 URL을 생성하는데,
`["/api/schedules/available-slots", selectedDate]` → `/api/schedules/available-slots/2026-02-15` 로 변환된다.
Express 라우트는 `GET /api/schedules/available-slots?date=...` 형태를 기대하므로 404가 발생한다.

추가로 예약 시스템에 선착순 보장, 7일 제한, 캘린더 UX 개선이 요구된다.

## Goals / Non-Goals

**Goals:**
- 시간 슬롯 API 호출을 query parameter 방식으로 수정하여 정상 동작시킴
- 예약 가능 기간을 오늘 기준 7일 이내(평일만)로 제한
- 1시간 간격(10:00~17:00) 시간 슬롯 유지 및 이미 예약된 슬롯 비활성화(선착순)
- 캘린더형 UI로 날짜/요일 시각적 표시 후 시간 선택 흐름 제공

**Non-Goals:**
- 서버 사이드 라우트 변경 (기존 `GET /api/schedules/available-slots?date=` 유지)
- Notion DB 스키마 변경
- 인증/권한 시스템 추가

## Decisions

### 1. Query key에서 fetch URL 분리

**결정**: `Step3Schedule`에서 `queryKey`와 실제 fetch URL을 분리한다.
`queryFn`을 직접 정의하여 `fetch(`/api/schedules/available-slots?date=${selectedDate}`)` 형태로 호출한다.

**대안 검토**:
- `getQueryFn` 자체를 수정하여 query parameter를 지원하도록 변경 → 다른 모든 query에 영향을 줄 수 있어 기각
- 서버 라우트를 `/api/schedules/available-slots/:date`로 변경 → 기존 API 계약 변경 불필요, 클라이언트만 수정하면 됨

**근거**: 영향 범위 최소화. `getQueryFn`의 join 동작은 프로젝트 전체에서 사용 중이므로 건드리지 않는다.

### 2. 7일 제한 (클라이언트)

**결정**: `Step3Schedule`에서 `maxDate`를 `today + 7`로 변경한다. 평일만 표시.

**근거**: 서버에서도 날짜 유효성 검증이 가능하지만, 현재 단계에서는 클라이언트 제한으로 충분. 서버는 기존 로직(주말 빈 배열 반환) 유지.

### 3. 선착순 예약 (기존 서버 로직 활용)

**결정**: 서버의 `getBookedSlots` → 프론트에서 `slot.available === false` 비활성화하는 기존 패턴을 그대로 유지.

**근거**: 서버는 이미 Notion Schedule DB에서 예약된 시간을 조회하여 `available: false`로 반환한다. 프론트는 이미 비활성화 처리하고 있다. 버그는 API 호출이 실패하여 데이터 자체가 로드되지 않는 것이므로, URL 수정만으로 선착순 기능이 자동 복구된다.

### 4. 캘린더 UX

**결정**: 기존 Button 그리드를 유지하되, 날짜 표시를 `2/15 (토)` 형태로 개선하고 선택된 날짜를 강조 표시한다. 별도 캘린더 라이브러리는 도입하지 않는다.

**대안 검토**:
- `react-day-picker` 또는 `date-fns` 캘린더 위젯 도입 → 패키지 추가 오버헤드, 현재 Button 그리드로 충분
- shadcn/ui Calendar 컴포넌트 사용 → 이미 프로젝트에 있을 수 있으나, 7일 이내 5개 정도의 버튼이면 그리드가 더 직관적

**근거**: YAGNI — 7일 이내 평일만 표시하므로 최대 5개 버튼. 풀 캘린더 위젯은 과도함.

## Risks / Trade-offs

- **[Race condition]** 두 사용자가 동시에 같은 시간 선택 후 제출 → Notion API는 중복 생성을 막지 않음 → **완화**: 현재 상담 건수가 적어 실무적 위험 낮음. 향후 서버 사이드 중복 체크 추가 가능.
- **[클라이언트 시간 조작]** 7일 제한은 클라이언트에서만 적용 → **완화**: 서버는 date 파라미터를 그대로 사용하므로, 악의적 API 호출 시 범위 밖 예약 가능. 현재 내부 시스템이므로 수용 가능.
