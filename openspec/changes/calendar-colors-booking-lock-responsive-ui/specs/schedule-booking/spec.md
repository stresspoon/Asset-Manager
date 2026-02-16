## MODIFIED Requirements

### Requirement: First-come-first-served booking prevents double booking
The system SHALL prevent users from selecting a time slot that has already been booked by another user. The available-slots API returns real-time booking status from Notion Schedule DB. Additionally, the server SHALL perform a second availability check at submission time with an in-memory lock to prevent race conditions between concurrent submissions.

#### Scenario: Slot becomes unavailable after another user books it
- **WHEN** user A books 14:00 on 2/17 and user B loads slots for 2/17
- **THEN** the 14:00 slot SHALL show as disabled for user B

#### Scenario: All slots booked shows warning
- **WHEN** all 8 slots for a date have `available: false`
- **THEN** a warning message "이 날짜에 예약 가능한 시간이 없습니다. 다른 날짜를 선택해주세요." SHALL appear

#### Scenario: Concurrent submission of same slot returns conflict
- **WHEN** two users submit bookings for the same date and time within milliseconds of each other
- **THEN** the first submission SHALL succeed and the second SHALL receive a `409 Conflict` response with message "해당 시간은 이미 예약되었습니다. 다른 시간을 선택해주세요."

#### Scenario: Client recovers from booking conflict
- **WHEN** a user receives a `409 Conflict` response after submitting a booking
- **THEN** the system SHALL display an error toast, re-fetch available slots for the selected date, and clear the time selection so the user can choose a different slot
