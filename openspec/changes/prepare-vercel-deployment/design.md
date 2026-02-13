## Context

현재 프로젝트는 Express 5 서버가 React 프론트엔드와 API를 동시에 서빙하는 모놀리식 구조입니다. Replit의 autoscale 배포를 사용하며, `script/build.ts`에서 esbuild로 서버를 `dist/index.cjs`로 번들링하고, Vite로 클라이언트를 `dist/public/`으로 빌드합니다.

Vercel은 서버리스 환경이므로, long-running Express 서버를 Vercel Serverless Functions로 래핑해야 합니다.

**현재 아키텍처:**
```
client request → Express (port 5000) → API routes (/api/*)
                                     → Static files (dist/public/)
                                     → SPA fallback (index.html)
```

**대상 아키텍처:**
```
client request → Vercel Edge Network → /api/* → Serverless Function (Express)
                                     → /*     → Static Files (Vite build)
```

## Goals / Non-Goals

**Goals:**
- Vercel에서 프론트엔드 정적 파일 + API 서버리스 함수가 정상 동작
- 로컬 개발 환경(`npm run dev`)은 기존과 동일하게 유지
- 환경 변수만 설정하면 `vercel deploy`로 바로 배포 가능
- PostgreSQL(서버리스 호환) + Notion API 연동 유지

**Non-Goals:**
- Edge Runtime 또는 ISR/SSR 적용 (현재 SPA 구조 유지)
- 인증/세션 시스템 변경 (memorystore는 서버리스에서 제한적이나, 현재 세션 기능 미사용 상태이므로 무시)
- CI/CD 파이프라인 구축 (Vercel Git 연동으로 자동 배포)
- Replit 파일 삭제 (`.replit`, `replit.md`는 유지하되 Vercel 배포에 영향 없음)

## Decisions

### 1. Express 앱을 단일 Serverless Function으로 래핑

**선택**: `api/index.ts`에서 Express 앱을 `export default`하여 Vercel이 자동으로 서버리스 핸들러로 변환

**대안 검토:**
- **(A) 개별 API 라우트를 각각 Serverless Function으로 분리** → 라우트 50개 이상이라 리팩토링 비용이 과도함. 상태 공유(sampleRequests, DB pool) 복잡
- **(B) `@vercel/node` 런타임으로 Express 래핑** → 가장 적은 변경으로 기존 코드 재사용 가능. Express 5 호환

**근거**: 기존 `routes.ts`에 등록된 모든 라우트와 미들웨어를 그대로 유지하면서 `api/index.ts`에서 Express 앱만 export하면 됩니다. `registerRoutes`에서 `httpServer` 의존성만 제거하면 됩니다.

### 2. 프론트엔드 빌드 출력 경로

**선택**: Vite 빌드 출력을 `dist/public/`에서 `dist/`로 변경하고, `vercel.json`의 `outputDirectory`를 `dist`로 설정

**근거**: Vercel은 `outputDirectory` 기준으로 정적 파일을 서빙합니다. `dist/` 직접 출력이 Vercel 컨벤션에 맞습니다.

### 3. vercel.json 라우팅 설정

**선택**: `rewrites` 규칙으로 `/api/:path*` → `api/index.ts`, 나머지 → `index.html` (SPA fallback)

```json
{
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api" }
  ]
}
```

**근거**: `framework: null`로 설정하여 Vercel의 자동 감지를 비활성화하고, 명시적 빌드 명령을 사용합니다.

### 4. 데이터베이스 연결 최적화

**선택**: `pg.Pool` 생성 시 서버리스 환경을 고려한 설정 추가

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 1,  // 서버리스 환경에서 커넥션 수 최소화
});
```

**근거**: 서버리스 함수는 동시 인스턴스마다 별도 Pool을 생성하므로, `max: 1`로 제한해야 커넥션 폭증을 방지합니다. Neon/Supabase 등 서버리스 호환 PostgreSQL에서는 SSL 필수입니다.

### 5. 빌드 스크립트 분리

**선택**: `package.json`에 `build:vercel` 스크립트 추가

- `build:vercel`: Vite 프론트엔드 빌드만 실행 (`vite build`)
- `build`: 기존 스크립트 유지 (Vite + esbuild, 로컬/Replit용)

**근거**: Vercel에서는 서버를 esbuild로 번들링할 필요 없이, `api/` 디렉토리의 TypeScript를 자동으로 컴파일합니다. 프론트엔드 빌드만 필요합니다.

### 6. Vite 설정 정리

**선택**: `@replit/vite-plugin-runtime-error-modal`을 프로덕션에서 제외하도록 조건 추가

**근거**: 이 플러그인은 Replit 전용이며, Vercel 빌드 시 해당 패키지가 없으면 빌드 실패합니다. 개발 환경에서만 로드하도록 조건부 적용합니다.

### 7. registerRoutes 시그니처 변경

**선택**: `registerRoutes`에서 `httpServer` 파라미터를 선택적으로 만들거나, Express 앱에 라우트를 등록하는 별도 함수 추출

**근거**: 현재 `registerRoutes(httpServer, app)`은 HTTP 서버를 받지만, 서버리스 환경에서는 HTTP 서버가 없습니다. Express 앱에 라우트만 등록하는 함수가 필요합니다.

## Risks / Trade-offs

**[Cold Start 지연]** → 서버리스 함수 첫 호출 시 Express + Drizzle + Notion 클라이언트 초기화로 2-5초 지연 가능. 중요한 이슈가 아닌 관리 도구이므로 수용 가능.

**[DB 커넥션 제한]** → 서버리스 인스턴스 다수 생성 시 PostgreSQL 커넥션 폭증. `max: 1` 설정과 Neon/Supabase의 connection pooler 사용으로 완화.

**[서버리스 함수 크기]** → Express + 모든 의존성 포함 시 함수 크기 증가. Vercel의 50MB 제한 내에서 충분히 가능.

**[Seed 데이터 반복 실행]** → `registerRoutes`에서 호출하는 `seedPricing()`/`seedTaxPricing()`이 매 요청마다 실행될 수 있음. 이미 idempotent(중복 삽입 방지)이므로 성능만 약간 영향.

**[memorystore 세션]** → 서버리스 환경에서 in-memory 세션은 인스턴스 간 공유 불가. 현재 세션 기능을 실제로 사용하지 않으므로 영향 없음.

## Migration Plan

1. `api/index.ts` 생성 (Express 앱을 서버리스 핸들러로 export)
2. `server/routes.ts`에서 `registerRoutes` 시그니처 조정 (httpServer 선택적)
3. `server/db.ts` 수정 (SSL + max 커넥션 설정)
4. `vite.config.ts` 정리 (Replit 플러그인 개발 환경 전용으로 격리)
5. `vercel.json` 생성 (빌드 및 라우팅 설정)
6. `package.json`에 `build:vercel` 스크립트 추가
7. Vercel 대시보드에서 환경 변수 설정
8. `vercel deploy`로 프리뷰 배포 → 테스트 → 프로덕션 배포

**롤백**: Git 기반이므로 이전 커밋으로 롤백 가능. Replit 배포는 `.replit` 파일 유지로 병행 가능.

## Open Questions

- PostgreSQL 호스팅을 어디에 할 것인가? (Neon, Supabase, Vercel Postgres 등)
- 커스텀 도메인 연결 여부
- Notion API 호출 빈도에 따른 rate limit 고려 필요 여부
