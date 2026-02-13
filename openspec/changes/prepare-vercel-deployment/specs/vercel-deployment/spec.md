## ADDED Requirements

### Requirement: Vercel 배포 설정 파일
시스템은 프로젝트 루트에 `vercel.json` 파일을 포함하여 Vercel 배포 설정을 정의해야 합니다(SHALL). 이 파일은 빌드 명령, 출력 디렉토리, API 라우팅 규칙을 포함해야 합니다(MUST).

#### Scenario: vercel.json이 올바르게 구성됨
- **WHEN** `vercel.json` 파일을 읽을 때
- **THEN** `buildCommand`, `outputDirectory`, `rewrites` 필드가 존재해야 하며, `/api/:path*` 요청이 서버리스 함수로 라우팅되어야 한다

#### Scenario: SPA 라우팅 지원
- **WHEN** 브라우저에서 `/requests`, `/schedules` 등 클라이언트 라우트에 직접 접근할 때
- **THEN** Vercel이 `index.html`을 반환하여 SPA 라우팅이 정상 동작해야 한다

### Requirement: Serverless API 엔트리포인트
시스템은 `api/index.ts` 파일을 통해 Express 앱을 Vercel Serverless Function으로 export해야 합니다(SHALL). 모든 기존 API 라우트(`/api/*`)가 서버리스 환경에서 동작해야 합니다(MUST).

#### Scenario: API 엔드포인트가 서버리스에서 응답
- **WHEN** Vercel 배포 후 `GET /api/dashboard/stats`를 호출할 때
- **THEN** JSON 응답으로 `newRequests`, `inProgress`, `completed`, `todaySchedules` 필드를 포함한 대시보드 통계를 반환해야 한다

#### Scenario: POST 요청이 서버리스에서 동작
- **WHEN** Vercel 배포 후 `POST /api/consult/submit`에 상담 신청 데이터를 전송할 때
- **THEN** Notion에 상담 요청과 스케줄이 생성되고, `{ success: true, requestId, scheduleId }` 응답을 반환해야 한다

#### Scenario: Express 미들웨어가 정상 동작
- **WHEN** 서버리스 함수에서 요청을 처리할 때
- **THEN** `express.json()`, `express.urlencoded()` 미들웨어가 정상 적용되어야 한다

### Requirement: 프론트엔드 Vercel 빌드
시스템은 Vercel 환경에서 Vite를 사용하여 React 프론트엔드를 정적 파일로 빌드할 수 있어야 합니다(SHALL). Replit 전용 플러그인이 빌드를 차단해서는 안 됩니다(MUST NOT).

#### Scenario: Replit 플러그인 없이 빌드 성공
- **WHEN** `REPL_ID` 환경 변수가 없는 환경에서 `npm run build:vercel`을 실행할 때
- **THEN** Vite 빌드가 성공하고 `dist/` 디렉토리에 `index.html`과 정적 에셋이 생성되어야 한다

#### Scenario: 경로 별칭이 올바르게 해석됨
- **WHEN** 클라이언트 코드에서 `@/`, `@shared/`, `@assets/` 별칭을 사용할 때
- **THEN** Vite 빌드가 이 별칭을 올바른 경로로 해석하여 빌드에 성공해야 한다

### Requirement: 서버리스 호환 데이터베이스 연결
시스템은 서버리스 환경에서 PostgreSQL 연결을 안전하게 관리해야 합니다(SHALL). 커넥션 풀 크기를 제한하고 SSL을 지원해야 합니다(MUST).

#### Scenario: SSL 연결이 프로덕션에서 활성화됨
- **WHEN** `NODE_ENV`가 `production`이고 `DATABASE_URL`이 설정된 상태에서 DB에 연결할 때
- **THEN** SSL이 활성화된 상태로 PostgreSQL에 연결되어야 한다

#### Scenario: 커넥션 풀이 서버리스에 최적화됨
- **WHEN** 서버리스 함수 인스턴스가 DB Pool을 생성할 때
- **THEN** 최대 커넥션 수가 1로 제한되어야 한다

### Requirement: Vercel용 빌드 스크립트
시스템은 `package.json`에 Vercel 전용 빌드 스크립트(`build:vercel`)를 포함해야 합니다(SHALL). 이 스크립트는 프론트엔드만 빌드하며, esbuild 서버 번들링은 제외해야 합니다(MUST).

#### Scenario: build:vercel 스크립트가 프론트엔드만 빌드
- **WHEN** `npm run build:vercel`을 실행할 때
- **THEN** Vite가 클라이언트 코드만 빌드하고, `dist/index.cjs` 서버 번들은 생성하지 않아야 한다

### Requirement: 환경 변수 구성
시스템은 다음 환경 변수를 Vercel 프로젝트에 설정해야 정상 동작합니다(SHALL): `DATABASE_URL`, `NOTION_API_KEY`, `NOTION_REQUEST_DB_ID`, `NOTION_SCHEDULE_DB_ID`, `NOTION_PRICING_DB_ID`, `NOTION_QUOTES_DB_ID`.

#### Scenario: 필수 환경 변수 누락 시 명확한 에러
- **WHEN** `DATABASE_URL`이 설정되지 않은 상태에서 API가 호출될 때
- **THEN** `DATABASE_URL must be set` 에러 메시지가 반환되어야 한다

#### Scenario: 모든 환경 변수가 설정된 상태에서 정상 동작
- **WHEN** 모든 필수 환경 변수가 Vercel에 설정된 상태에서 배포될 때
- **THEN** API가 정상적으로 Notion과 PostgreSQL에 연결되어 데이터를 처리해야 한다

### Requirement: 로컬 개발 환경 호환성
기존 로컬 개발 워크플로우(`npm run dev`)는 Vercel 배포 변경에 영향받지 않아야 합니다(SHALL). Express + Vite HMR 구성이 그대로 동작해야 합니다(MUST).

#### Scenario: npm run dev가 기존과 동일하게 동작
- **WHEN** `npm run dev`를 실행할 때
- **THEN** Express 서버가 포트 5000에서 시작되고, Vite HMR이 활성화되어 프론트엔드 개발이 가능해야 한다
