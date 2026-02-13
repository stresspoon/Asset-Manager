# Vibe Coding Playbook

## 목표

`manage-skills` + `verify-implementation` + 보조 어시스턴트를 조합해
기능 구현 속도를 유지하면서 품질 표준을 누적 관리한다.

## 표준 루프

1. 요구사항 점검: `instruction-checker`
2. 기능 구현: `vibe-coder`
3. 새 규칙 발생 시: `manage-skills`
4. PR/푸시 전: `verify-implementation`
5. 이슈 수정 후: 실패 스킬만 재검증

## 상황별 액션

### 1) 프로젝트 시작/초기 셋업

- `verify-architecture`, `verify-testing`, `verify-style`를 기준선으로 유지.
- 스킬 테이블이 `CLAUDE.md`와 동기화되어 있는지 확인.

### 2) 기능 개발 중

- 기능 단위를 작게 쪼개 구현.
- 각 단위 완료 시 요구사항 누락을 다시 점검.
- 규칙이 새로 생기면 `manage-skills`로 즉시 반영.

### 3) PR/푸시 전

- `verify-implementation` 실행.
- 재현 가능한 실패부터 수정.
- 수정 후 동일 검증 재실행.

### 4) 리팩터/마이그레이션

- 먼저 `manage-skills`로 구 규칙 정리 및 신 규칙 반영.
- 이후 `verify-implementation`으로 영향 범위 점검.

### 5) 오탐/잡음이 많은 경우

- 스킬 범위를 줄이지 말고 검증 조건을 정밀화.
- Exceptions를 업데이트하되, 면제 사유를 명시.

## 도입 검증 시나리오

1. 기능 1개 구현 후 `instruction-checker`에서 요구사항 누락 0건.
2. 같은 기능 직후 `verify-implementation`에서 치명 이슈 0건.
3. 새 규칙 추가 후 `manage-skills` 실행 시 기존/신규 스킬에 반영.
4. 기존에 놓치던 회귀 이슈를 최소 1건 이상 탐지.

## 리포트 규약

통합 리포트는 아래를 반드시 포함한다.
- 이슈 목록(파일/위치)
- 우선순위
- 수정 액션
- 수정 후 재검증 결과
