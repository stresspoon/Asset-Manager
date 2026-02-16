## ADDED Requirements

### Requirement: Calendar events display service type color indicator
The calendar view SHALL display a colored left border on each event item to indicate the service type (`accounting` or `tax`).

#### Scenario: 일반세무기장 event shows blue border
- **WHEN** a schedule event has `serviceType === "tax"`
- **THEN** the event item SHALL have a blue left border (`border-l-2 border-blue-500`)

#### Scenario: 경리아웃소싱 event shows yellow border
- **WHEN** a schedule event has `serviceType === "accounting"`
- **THEN** the event item SHALL have a yellow left border (`border-l-2 border-yellow-500`)

### Requirement: Calendar list view shows service type badge
The calendar list view SHALL display a service type badge alongside the status badge for each schedule item.

#### Scenario: List item shows service type label
- **WHEN** a schedule item renders in list view
- **THEN** it SHALL display a badge with the label "일반 세무기장" or "경리아웃소싱" using `getServiceTypeColor()` styling

### Requirement: Service type color is preserved alongside status color
The existing status-based background color (`getStatusColor()`) SHALL remain on calendar events. The service type indicator SHALL be additive, not replacing the status color.

#### Scenario: Event shows both status and service type
- **WHEN** a calendar event renders with `progressStatus === "예약됨"` and `serviceType === "tax"`
- **THEN** the event SHALL have a blue-100 status background AND a blue-500 left border for service type
