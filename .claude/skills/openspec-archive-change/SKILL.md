---
name: openspec-archive-change
description: Archive a completed change in the experimental workflow with integrated verify-implementation quality gates.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.1.1"
---

Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select change**

   Run `openspec list --json` if needed and prompt user to choose. Do not guess.

2. **Check artifact and task completion**

   - Run `openspec status --change "<name>" --json`
   - Read tasks file for incomplete checkboxes
   - If incomplete items exist, warn and request user confirmation before continuing

3. **Run integrated quality gate (`verify-implementation`)**

   Run project verify stack before archiving:
   - Read `.claude/skills/verify-implementation/SKILL.md`
   - Execute registered targets and collect findings

   Decision rule:
   - CRITICAL/P1 findings -> require explicit user override to archive
   - WARNING/SUGGESTION only -> continue with warning summary
   - No issues -> continue

   If verify stack unavailable, warn and request confirmation.

4. **Assess delta spec sync state**

   If `openspec/changes/<name>/specs/` exists, compare with `openspec/specs/<capability>/spec.md` and present sync options.

5. **Archive**

   ```bash
   mkdir -p openspec/changes/archive
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

   If target exists, fail with clear remediation options.

6. **Summarize**

   Report:
   - change name
   - schema
   - archive path
   - spec sync status
   - quality gate status (pass/warnings/override)

**Guardrails**

- Never silently skip quality gate
- Never auto-override critical findings
- Always preserve `.openspec.yaml` in moved archive
- Always show what was skipped and why
