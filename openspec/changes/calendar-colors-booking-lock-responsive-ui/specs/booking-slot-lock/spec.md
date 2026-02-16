## ADDED Requirements

### Requirement: Server prevents concurrent booking of same time slot
The server SHALL use an in-memory lock mechanism to serialize booking requests for the same date+time combination, preventing race conditions where two users book the same slot simultaneously.

#### Scenario: Two users attempt to book the same slot concurrently
- **WHEN** user A and user B both submit a booking for `2026-02-17T14:00` at nearly the same time
- **THEN** the first request to acquire the lock SHALL succeed and create the booking, and the second request SHALL receive a `409 Conflict` response

#### Scenario: Lock is released after booking completes
- **WHEN** a booking request completes (success or failure)
- **THEN** the lock for that date+time key SHALL be released so subsequent requests can proceed

### Requirement: Server re-validates slot availability before creating booking
The `POST /api/consult/submit` endpoint SHALL re-query Notion DB for booked slots after acquiring the lock and before creating the schedule entry, to confirm the slot is still available.

#### Scenario: Slot becomes booked between client check and server submission
- **WHEN** a booking request passes the lock but the slot was booked by another process (e.g., manual Notion entry)
- **THEN** the server SHALL return `409 Conflict` with message "해당 시간은 이미 예약되었습니다. 다른 시간을 선택해주세요."

#### Scenario: Slot is available and booking proceeds
- **WHEN** the re-validation confirms the slot is available
- **THEN** the server SHALL create the schedule in Notion DB and return success

### Requirement: Client handles 409 Conflict gracefully
The booking form SHALL handle a `409 Conflict` response by refreshing the available slots and showing an error message to the user.

#### Scenario: User sees conflict error and refreshed slots
- **WHEN** the client receives a `409` response from `/api/consult/submit`
- **THEN** the system SHALL display a toast message "해당 시간은 이미 예약되었습니다. 다른 시간을 선택해주세요." AND automatically re-fetch available slots for the selected date AND clear the user's time selection
