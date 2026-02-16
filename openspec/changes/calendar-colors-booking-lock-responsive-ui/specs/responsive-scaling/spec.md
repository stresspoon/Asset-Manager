## ADDED Requirements

### Requirement: Root font size scales with viewport width using clamp()
The application SHALL set the root `font-size` using `clamp()` so that all rem-based sizes scale proportionally with the viewport width, providing comfortable readability from 14-inch laptops to 27-inch monitors.

#### Scenario: 14-inch laptop (~1440px viewport)
- **WHEN** the viewport width is approximately 1440px
- **THEN** the computed root font-size SHALL be approximately 18-19px, maintaining the current visual appearance

#### Scenario: 27-inch monitor (~2560px viewport)
- **WHEN** the viewport width is approximately 2560px
- **THEN** the computed root font-size SHALL be approximately 23-24px, making all UI elements proportionally larger

#### Scenario: Small screen below minimum
- **WHEN** the viewport width is below 1024px
- **THEN** the root font-size SHALL NOT go below 14px (the clamp minimum)

### Requirement: Hardcoded pixel sizes in calendar are converted to rem
Calendar event text and cell dimensions that currently use hardcoded px values (`text-[10px]`, fixed heights) SHALL be converted to rem-based equivalents so they participate in viewport-proportional scaling.

#### Scenario: Calendar event text scales with viewport
- **WHEN** viewing the calendar on a 27-inch monitor
- **THEN** event text (currently `text-[10px]`) SHALL render larger than 10px, proportional to the root font size

#### Scenario: Calendar cell height scales with viewport
- **WHEN** viewing the calendar on a 27-inch monitor
- **THEN** calendar cells SHALL be proportionally taller than on a 14-inch laptop
