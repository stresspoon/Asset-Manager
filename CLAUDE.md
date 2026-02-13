## Skills

Project-specific skills live in `.claude/skills/`.

| Skill | Purpose |
|------|---------|
| `verify-implementation` | Run all registered `verify-*` skills and produce one consolidated report |
| `manage-skills` | Detect skill drift from recent changes and create/update `verify-*` skills |
| `verify-architecture` | Check architectural boundaries, dependency direction, and structural consistency |
| `verify-testing` | Check test coverage expectations, test naming, and regression guardrails |
| `verify-style` | Check coding/documentation conventions and prompt/skill metadata quality |

## Assistants

Project assistants live in `.claude/assistants/`.

| Assistant | Purpose |
|----------|---------|
| `vibe-coder` | Implement features quickly while preserving architecture and test quality |
| `instruction-checker` | Detect missing requirements, ambiguities, and acceptance gaps before/after implementation |

## Recommended Workflow

1. Clarify requirements with `instruction-checker`.
2. Implement in small slices with `vibe-coder`.
3. If new project rules appear, run `manage-skills` to update/create verify skills.
4. Before PR/push, run `verify-implementation`.
5. Fix reproducible issues first, then re-run `verify-implementation`.

## Command Interface (if your client supports slash commands)

- `/project:manage-skills`
- `/project:verify-implementation`

## Reporting Standard

Consolidated verification reports should use:
- issue list with file/location
- severity/priority
- concrete remediation action
- re-check result after fixes
