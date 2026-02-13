## MODIFIED Requirements

### Requirement: Available time slots load after date selection
The system SHALL fetch available time slots from `GET /api/schedules/available-slots?date={YYYY-MM-DD}` when the user selects a consultation date, using a direct fetch call with query parameter instead of relying on query key path joining.

#### Scenario: User selects a date and time slots appear
- **WHEN** user clicks a date button in Step3Schedule
- **THEN** the system fetches `/api/schedules/available-slots?date=2026-02-17` and displays 8 time slot buttons (10:00~17:00, 1-hour intervals)

#### Scenario: Already-booked slots are disabled
- **WHEN** the API returns a slot with `available: false`
- **THEN** the time button SHALL be visually disabled with strikethrough styling and not clickable

### Requirement: Booking date range limited to 7 days
The system SHALL only display selectable dates within 7 calendar days from today (excluding weekends).

#### Scenario: Weekday dates within 7 days are shown
- **WHEN** Step3Schedule renders
- **THEN** only weekday dates from tomorrow through today+7 days SHALL be displayed as selectable buttons

#### Scenario: Weekend dates are excluded
- **WHEN** a date within the 7-day range falls on Saturday or Sunday
- **THEN** that date SHALL NOT appear in the date options

### Requirement: Calendar-style date display with day-of-week
The system SHALL display each date button with the format `M/D (요일)` (e.g., `2/17 (월)`) so users can visually identify the day of week.

#### Scenario: Date button shows month, day, and day-of-week
- **WHEN** the date buttons render
- **THEN** each button SHALL display in `M/D (요일)` format using Korean day names (월/화/수/목/금)

#### Scenario: Selected date is visually highlighted
- **WHEN** user clicks a date button
- **THEN** the selected button SHALL use the primary variant styling and the time slot section SHALL appear below

### Requirement: 1-hour interval time slots from 10:00 to 17:00
The server SHALL return exactly 8 time slots at 1-hour intervals: 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00.

#### Scenario: Time slots are displayed in 1-hour increments
- **WHEN** time slots load for a selected date
- **THEN** exactly 8 buttons SHALL appear: 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00

### Requirement: First-come-first-served booking prevents double booking
The system SHALL prevent users from selecting a time slot that has already been booked by another user. The available-slots API returns real-time booking status from Notion Schedule DB.

#### Scenario: Slot becomes unavailable after another user books it
- **WHEN** user A books 14:00 on 2/17 and user B loads slots for 2/17
- **THEN** the 14:00 slot SHALL show as disabled for user B

#### Scenario: All slots booked shows warning
- **WHEN** all 8 slots for a date have `available: false`
- **THEN** a warning message "이 날짜에 예약 가능한 시간이 없습니다. 다른 날짜를 선택해주세요." SHALL appear
