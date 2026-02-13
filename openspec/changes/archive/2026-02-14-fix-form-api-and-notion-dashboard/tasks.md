## 1. Fix time slot API fetch (core bug)

- [x] 1.1 In `consult-form.tsx` Step3Schedule, replace the `useQuery` for available-slots with a custom `queryFn` that calls `fetch(`/api/schedules/available-slots?date=${selectedDate}`)` instead of relying on queryKey join
- [x] 1.2 Verify the API call returns 200 with 8 time slots for a valid weekday date

## 2. Date selection — 7-day weekday limit

- [x] 2.1 Replace the current date generation logic in Step3Schedule with a function that computes weekday dates from tomorrow through today+7 days (excluding Saturday/Sunday)
- [x] 2.2 Display each date button in `M/D (요일)` format using Korean day names (월/화/수/목/금)

## 3. Time slot UX improvements

- [x] 3.1 Show the time slot section only after a date is selected, with a loading spinner while fetching
- [x] 3.2 Disable already-booked slots (`available: false`) with strikethrough styling and prevent click
- [x] 3.3 Show warning message "이 날짜에 예약 가능한 시간이 없습니다. 다른 날짜를 선택해주세요." when all 8 slots are booked

## 4. Visual polish and selected state

- [x] 4.1 Highlight the selected date button with primary variant styling
- [x] 4.2 Highlight the selected time button with primary variant styling
- [x] 4.3 Ensure the "다음" (next) button remains disabled until both date and time are selected

## 5. Smoke test

- [x] 5.1 Run dev server, walk through the full form flow: select date → see slots → select time → submit
- [x] 5.2 Verify that booked slots from Notion Schedule DB appear as disabled
