## 1. Vite 빌드 설정 정리

- [x] 1.1 `vite.config.ts`에서 `@replit/vite-plugin-runtime-error-modal`을 개발 환경 전용으로 조건부 적용 (REPL_ID 존재 시에만 로드)
- [x] 1.2 Vite 빌드 출력 경로 유지 (`dist/public/`) - vercel.json의 outputDirectory로 매핑
- [x] 1.3 `package.json`에 `build:vercel` 스크립트 추가 (`vite build` - 프론트엔드만 빌드)

## 2. Serverless API 엔트리포인트 생성

- [x] 2.1 `server/routes.ts`의 `registerRoutes` 함수에서 Express 앱에만 라우트를 등록하는 로직 분리 (httpServer 의존성 제거 가능하도록)
- [x] 2.2 `api/index.ts` 생성 - Express 앱 생성, 미들웨어 설정, 라우트 등록 후 `export default app`으로 Vercel 서버리스 핸들러 export

## 3. 데이터베이스 연결 최적화

- [x] 3.1 `server/db.ts` 수정 - 프로덕션 환경에서 SSL 활성화 (`ssl: { rejectUnauthorized: false }`)
- [x] 3.2 `server/db.ts` 수정 - 서버리스 환경 대응으로 `max: 1` 커넥션 풀 제한 추가

## 4. Vercel 배포 설정

- [x] 4.1 프로젝트 루트에 `vercel.json` 생성 (buildCommand, outputDirectory, rewrites 규칙 포함)
- [x] 4.2 `vercel.json`에 `/api/:path*` → `/api` 서버리스 함수 rewrite 규칙 추가
- [x] 4.3 `vercel.json`에 SPA 클라이언트 라우트 fallback 처리 확인

## 5. 환경 변수 및 정리

- [x] 5.1 `.env.example` 파일 생성 - 필수 환경 변수 목록 문서화 (DATABASE_URL, NOTION_API_KEY, NOTION_*_DB_ID)
- [x] 5.2 `.gitignore`에 `.env` 추가 확인
- [x] 5.3 로컬 TypeScript 컴파일 및 빌드 테스트 - 코드 변경이 정상인지 확인

## 6. 배포 검증

- [x] 6.1 `npm run build:vercel`로 프론트엔드 빌드 성공 확인
- [ ] 6.2 `vercel deploy`로 프리뷰 배포 후 프론트엔드 페이지 로드 확인
- [ ] 6.3 프리뷰 배포에서 API 엔드포인트 (`/api/dashboard/stats`) 호출 테스트
- [ ] 6.4 프리뷰 배포에서 상담 신청 폼 제출 테스트 (`/api/consult/submit`)
