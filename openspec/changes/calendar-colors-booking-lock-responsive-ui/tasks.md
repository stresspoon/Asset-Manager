## 1. 캘린더 서비스 유형별 색상 구분

- [x] 1.1 `client/src/lib/format.ts`에 `getServiceTypeBorderColor()` 함수 추가 — tax: `border-blue-500`, accounting: `border-yellow-500` 반환
- [x] 1.2 `client/src/pages/schedules.tsx` CalendarView 이벤트 div에 `border-l-2` + `getServiceTypeBorderColor(s.serviceType)` 적용
- [x] 1.3 `client/src/pages/schedules.tsx` 목록 뷰에 서비스 유형 Badge 추가 (`getServiceTypeColor()` + `getServiceTypeLabel()` 사용)

## 2. 상담 시간 예약 잠금 (Race Condition 방지)

- [x] 2.1 `server/booking-lock.ts` 생성 — `Map<string, Promise>` 기반 인메모리 mutex. `withBookingLock(key, fn)` export
- [x] 2.2 `server/routes.ts`의 `POST /api/consult/submit`에 잠금 로직 추가 — lock 획득 → `getBookedSlots()` 재검증 → 슬롯 가용 시 생성, 불가 시 409 응답
- [x] 2.3 `client/src/pages/consult-form.tsx`에서 409 Conflict 응답 핸들링 — 토스트 메시지 표시, 슬롯 목록 재조회, 시간 선택 초기화

## 3. 반응형 타이포그래피 및 레이아웃 스케일링

- [x] 3.1 `client/src/index.css` `:root`에 `font-size: clamp(14px, 0.45vw + 12px, 18px)` 추가
- [x] 3.2 `client/src/pages/schedules.tsx` 캘린더의 하드코딩된 px 값을 rem으로 변환 — `text-[10px]` → `text-[0.625rem]`, `min-h-[80px]` → `min-h-[5rem]`, `min-h-[100px]` → `min-h-[6.25rem]`
- [x] 3.3 전체 앱에서 주요 하드코딩된 px 값 점검 및 rem 변환 (캘린더 외 consult-form, dashboard 등)

## 4. 검증

- [ ] 4.1 캘린더에서 accounting/tax 이벤트가 서로 다른 보더 색상으로 표시되는지 시각적 확인
- [ ] 4.2 두 브라우저 탭에서 동일 시간대 동시 예약 시도 시 하나만 성공하고 다른 하나는 409 오류 메시지 표시 확인
- [ ] 4.3 14인치 노트북과 27인치 모니터에서 폰트 및 UI 비율이 자연스럽게 스케일링되는지 확인
- [x] 4.4 TypeScript 컴파일 및 빌드 오류 없음 확인
