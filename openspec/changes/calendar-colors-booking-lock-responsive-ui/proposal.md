## Why

관리자 대시보드 캘린더에서 경리아웃소싱과 일반세무기장 일정이 동일한 색상으로 표시되어 구분이 불가능하고, 상담 시간 예약 시 동시 접근에 대한 잠금 처리가 없어 중복 예약이 발생할 수 있으며, 27인치 등 대형 모니터에서 폰트와 UI 비율이 지나치게 작아 사용성이 저하되는 3가지 문제를 해결해야 합니다.

## What Changes

- **캘린더 서비스 유형별 색상 구분**: 관리자 대시보드 캘린더 뷰에서 `serviceType` 기반 색상 코딩 적용 (일반세무기장=파란색, 경리아웃소싱=노란색). 현재는 `getStatusColor()`만 사용 중이며 `getServiceTypeColor()`가 정의되어 있으나 캘린더에 미적용 상태.
- **상담 시간 예약 잠금(Race Condition 방지)**: 동일 시간대에 대한 동시 예약 요청 시, 먼저 완료된 예약이 시간을 선점하고 후속 요청은 거절되도록 서버 측 잠금 메커니즘 추가. 현재는 Notion DB 조회 후 생성까지 사이에 갭이 존재.
- **반응형 타이포그래피 및 레이아웃 최적화**: 14인치 노트북부터 27인치 모니터까지 폰트 크기와 UI 요소 비율이 화면 크기에 비례하여 자연스럽게 스케일링되도록 개선. 현재 Tailwind 기본값에 의존하며 커스텀 root font-size나 viewport 기반 스케일링 없음.

## Capabilities

### New Capabilities
- `calendar-service-colors`: 관리자 캘린더에서 서비스 유형(accounting/tax)별 이벤트 색상 구분 표시
- `booking-slot-lock`: 상담 시간 예약 시 서버 측 선점 잠금으로 중복 예약 방지
- `responsive-scaling`: viewport 크기에 비례하는 반응형 타이포그래피 및 레이아웃 스케일링

### Modified Capabilities
- `schedule-booking`: 예약 제출 시 서버 측 가용성 재검증 요구사항 추가 (현재는 클라이언트 측 비활성화만 존재)

## Impact

- **Frontend**: `client/src/pages/schedules.tsx` (캘린더 색상), `client/src/index.css` + `tailwind.config.ts` (반응형 스케일링), `client/src/pages/consult-form.tsx` (예약 에러 핸들링)
- **Backend**: `server/routes.ts` (예약 잠금 로직), `server/notion.ts` (중복 체크 강화)
- **Shared**: `client/src/lib/format.ts` (서비스 유형 색상 함수 활용)
- **API**: `POST /api/consult/submit` 에 선점 검증 로직 추가, 409 Conflict 응답 추가
- **Dependencies**: 추가 라이브러리 불필요 (기존 스택으로 해결 가능)
