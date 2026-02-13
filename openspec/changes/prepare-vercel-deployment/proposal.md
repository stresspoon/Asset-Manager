## Why

현재 이 프로젝트(세무 상담 자산 관리 시스템)는 Replit에 종속된 배포 구성을 사용하고 있어, Vercel로 배포할 수 없는 상태입니다. Replit 전용 플러그인, 단일 서버 아키텍처(Express가 프론트엔드와 API를 동시 서빙), 그리고 Replit 환경 변수 의존성을 Vercel 호환 구조로 전환해야 합니다.

## What Changes

- **프로젝트 구조 분리**: Express 백엔드 API를 Vercel Serverless Functions로 변환하고, React 프론트엔드는 Vercel 정적 빌드로 분리
- **`vercel.json` 설정 추가**: 빌드 명령, 라우팅 규칙(API → serverless, 나머지 → SPA), 환경 변수 매핑 정의
- **`vite.config.ts` 정리**: Replit 전용 플러그인 조건 제거 및 Vercel 배포용 빌드 설정 최적화
- **API 엔트리포인트 변환**: `server/index.ts`의 Express 앱을 Vercel serverless handler로 래핑하는 `api/index.ts` 생성
- **빌드 스크립트 업데이트**: `script/build.ts`를 Vercel 빌드 파이프라인에 맞게 수정하거나 Vite 기본 빌드로 대체
- **환경 변수 문서화**: `DATABASE_URL`, `NOTION_API_KEY`, `NOTION_*_DB_ID` 등 Vercel 대시보드에 설정할 변수 목록 정리
- **PostgreSQL 연결 호환성**: Vercel의 serverless 환경에서 `pg.Pool` 연결 풀 설정 최적화 (connection pooling, SSL)
- **Replit 전용 파일 정리**: `.replit`, `replit.md` 등 Replit 종속 설정 파일 정리

## Capabilities

### New Capabilities
- `vercel-deployment`: Vercel 배포를 위한 설정 파일(`vercel.json`), serverless API 래퍼, 빌드 파이프라인, 환경 변수 구성을 포괄하는 배포 인프라 정의

### Modified Capabilities
_(기존 spec이 없으므로 수정 대상 없음)_

## Impact

- **서버 코드**: `server/index.ts`는 로컬 개발용으로 유지하되, `api/index.ts`에서 Express 앱을 serverless handler로 export
- **빌드 시스템**: Vite 프론트엔드 빌드는 유지, 서버 번들링은 Vercel의 serverless 빌드로 대체
- **데이터베이스**: `DATABASE_URL`에 SSL 및 connection pooling 파라미터 필요 (예: Neon, Supabase 등 서버리스 호환 PostgreSQL)
- **환경 변수**: 총 7개 변수를 Vercel 프로젝트 설정에 등록 필요 (`DATABASE_URL`, `NOTION_API_KEY`, `NOTION_REQUEST_DB_ID`, `NOTION_SCHEDULE_DB_ID`, `NOTION_PRICING_DB_ID`, `NOTION_QUOTES_DB_ID`, `NOTION_QUOTES_DB_ID`)
- **로컬 개발**: `npm run dev`는 기존과 동일하게 Express + Vite HMR 유지
- **의존성**: `@vercel/node` 또는 유사 어댑터 추가 가능
