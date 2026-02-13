---
name: openspec-verify-change
description: Verify implementation matches change artifacts and run integrated project quality checks before archiving.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.1.1"
---

Verify that an implementation matches change artifacts (specs/tasks/design) and project quality standards.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show changes that have implementation tasks (tasks artifact exists).
   Include the schema used for each change if available.
   Mark changes with incomplete tasks as "(In Progress)".

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```

3. **Get change directory and context files**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   Read all files from `contextFiles`.

4. **Verify OpenSpec dimensions**

   Evaluate:
   - **Completeness**: tasks + requirement presence
   - **Correctness**: requirement/scenario implementation mapping
   - **Coherence**: design adherence + pattern consistency

   Record issues as CRITICAL/WARNING/SUGGESTION.

5. **Run integrated project quality checks**

   Execute project verify stack using `.claude/skills/verify-implementation/SKILL.md`.

   - Map blocking quality failures to CRITICAL
   - Map non-blocking quality findings to WARNING/SUGGESTION
   - If verify stack missing, add WARNING and continue

6. **Generate final report**

   Output a summary table with four dimensions:
   - Completeness
   - Correctness
   - Coherence
   - Project Quality

   Final assessment rules:
   - CRITICAL exists -> not ready to archive
   - WARNING only -> archive possible with notes
   - No issues -> ready to archive

**Output Format**

Use markdown with:
- Summary table
- Issues grouped by CRITICAL/WARNING/SUGGESTION
- Actionable recommendations with code/file references

**Graceful Degradation**

- If only tasks.md exists: verify what is available and note skipped checks
- If verify stack unavailable: warn and continue OpenSpec verification
