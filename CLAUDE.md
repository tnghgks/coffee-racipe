# drip-community
핸드드립 레시피 공유 커뮤니티 + 추출 도구(비율 계산기, 추출 타이머, 브루 로그).
전체 계획: docs/PLAN.md

@AGENTS.md

## 스택
Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Supabase(Postgres/Auth/Storage),
Zod, React Hook Form, Zustand, TanStack Query, Vitest, Playwright, pnpm

### 설치 버전 (Phase 0, 2026-10-11)
| 패키지 | 버전 |
| --- | --- |
| Node | 22 (`.nvmrc`) |
| pnpm | 12.9.1 (`packageManager`) |
| next | 16.4.0 (Cache Components·Partial Prefetching 켜짐) |
| react / react-dom | 19.3.0 |
| typescript | 5.9.3 |
| tailwindcss | 4.3.3 |
| shadcn (CLI, style `base-nova`) | 4.21.4 — 프리미티브는 `@base-ui/react` 1.9.0, 아이콘 `lucide-react` |
| @supabase/supabase-js | 2.117.3 |
| @supabase/ssr | 0.12.7 |
| supabase (CLI, devDependency) | 2.120.0 |
| vitest | 5.0.3 |
| @playwright/test | 1.64.0 |
| eslint | 9.39.5 |
| oxfmt | 0.72.0 (생성 타입 포맷용) |

Zod, React Hook Form, Zustand, TanStack Query, Serwist는 처음 쓰는 Phase에서 설치하고 여기에 버전을 추가한다.

## 구조
src/app/            라우트 (서버 컴포넌트 기본)
src/app/(placeholders)/  아직 안 만든 탭의 "준비 중" 페이지. 해당 Phase에서 실제 라우트를 만들 때 지운다.
src/features/<도메인>/  recipe, brew, log, community — components, actions.ts, schema.ts, queries.ts
src/components/ui/  shadcn 컴포넌트 (pnpm dlx shadcn@latest add <name>)
src/components/layout/  헤더, 모바일 하단 내비
src/components/common/  여러 도메인이 쓰는 컴포넌트 (NumberStepper 등)
src/config/         site.ts(서비스명·설명), nav.ts(메뉴 항목)
src/lib/supabase/   server.ts(세션), client.ts(브라우저), public.ts(쿠키 없는 anon, use cache용), middleware.ts(updateSession), env.ts, health.ts, database.types.ts(생성)
src/lib/brew/       환산·타이머 순수 함수 (UI 의존 금지, 단위 테스트 필수)
src/proxy.ts        Next 16의 middleware 대체 파일. Supabase 세션 갱신
supabase/migrations/  모든 스키마 변경
e2e/                Playwright 테스트

## 규칙
- 데이터 변경은 Server Action + Zod 검증. 클라이언트에서 직접 insert 금지.
- 스키마 변경 시: 마이그레이션 추가 → pnpm db:types → 타입 커밋.
- 새 테이블은 RLS 활성화 + 정책을 같은 마이그레이션에 작성.
- 레시피 물량은 원두량 대비 배수로 저장하고 표시할 때 환산.
- 타이머 경과 시간은 시작 시각 기준 performance.now() 차이로 계산 (setInterval 누적 금지).
- UI 문구는 한국어, 코드·커밋 메시지는 영어.
- 완료 전 pnpm lint && pnpm typecheck && pnpm test 통과.

### Next.js 16 주의점 (Phase 0에서 확인)
- 학습 데이터와 API가 다르다. 코드 작성 전 `node_modules/next/dist/docs/`의 해당 문서를 확인한다.
- `middleware.ts`는 폐기되고 `proxy.ts`(export `proxy`)로 바뀌었다.
- Cache Components가 켜져 있다. `cookies()`·`headers()`·Supabase 서버 클라이언트를 쓰는 컴포넌트는 반드시 `<Suspense>` 안에 두고, 레이아웃 최상단에서 세션을 await하지 않는다. 요청마다 실행해야 하면 `await connection()`.
- 동적 파라미터 라우트 아래에서 `usePathname`은 suspend된다. 내비처럼 레이아웃에 있는 클라이언트 컴포넌트는 Suspense로 감싼다 (`src/components/layout/nav-links.tsx` 참고).
- `LayoutProps`·`PageProps` 전역 타입은 `next typegen`이 만든다. `pnpm typecheck`가 먼저 실행한다.

### Supabase
- 환경변수는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(구 anon key), 서버 전용 `SUPABASE_SECRET_KEY`(구 service role key).
- 서버에서 사용자 확인은 `supabase.auth.getClaims()`를 쓴다 (`getSession()`은 서버에서 신뢰하지 않는다).
- 환경변수가 없으면 proxy는 세션 갱신을 건너뛰고, `/status` 페이지가 연결 실패를 표시한다.

### DB (Phase 1-A에서 정함)
- 생성 타입: `src/lib/supabase/database.types.ts` (`pnpm db:types`, 직접 수정 금지). 클라이언트는 `createClient`가 `Database` 제네릭을 이미 붙여 둔다.
- RLS 테스트는 pgTAP으로 `supabase/tests/database/*.test.sql`에 쓰고 `pnpm db:test`로 돌린다. 새 테이블마다 "다른 사용자 계정으로 접근" 케이스를 넣는다. CI의 Database 잡이 테스트와 타입 최신 여부를 검사한다.
- 클라이언트가 쓰면 안 되는 컬럼(`like_count`, `save_count`, `is_official`, `search`)은 RLS가 아니라 컬럼 단위 GRANT로 막는다. 쓰기 가능한 컬럼을 추가하면 마이그레이션에서 `grant insert/update (컬럼)`도 같이 추가한다.
- Phase 5의 카운트 갱신 트리거는 컬럼 GRANT를 우회해야 하므로 `security definer` + `set search_path = ''`로 만든다.
- 물량 표기: `recipes.ratio` = 총 물량 ÷ 원두량, `recipe_steps.water_ratio` = 해당 단계까지 누적 물량 ÷ 원두량. 둘 다 numeric(6,3). 마지막 단계 water_ratio = ratio.
- 아이스 변환은 저장하지 않고 화면에서 계산한다: `scaleRecipe(..., { iceShare })`. 총 물량(원두 × 비율)은 그대로, 그중 `iceShare`(기본 40%)를 얼음으로, 단계 물량은 같은 비율로 줄인다. 추출 모드(Phase 2)로 넘길 때 원두량·비율과 함께 핫/아이스도 넘긴다.
- 드리퍼 용량: `drippers.size_label` + `max_dose_g`(대표 사이즈 기준 권장 최대 원두량, 시드에서 관리). 넘으면 계산기에서 안내만 하고 막지 않는다 (`exceedsCapacity`).
- 공식 레시피: `is_official = true`, `author_id = null`, 항상 public. 시드 id는 `00000000-0000-4000-8000-0000000000NN`로 고정. 유명 레시피는 수치만 쓰고 `source_name`(·`source_url`)으로 출처를 표기하고 `source_note`(≤200자)에 원작자 소개를 1~2줄 쓴다. 설명·소개는 직접 작성.
- 시드는 `supabase/seed.sql` → `pnpm db:reset`으로 다시 넣는다.

### 데이터 조회 (Phase 1-C에서 정함)
- 방문자와 무관한 공개 데이터는 `features/<도메인>/queries.ts`에서 `createPublicClient()` + `"use cache"` + `cacheLife`/`cacheTag`로 읽는다. 태그는 `recipeTags`를 쓰고, 데이터를 바꾸는 Server Action에서 같은 태그로 무효화한다.
- 세션이 필요한 데이터(내 private 레시피 등)는 `lib/supabase/server.ts` 클라이언트로 읽고 `use cache`를 쓰지 않는다.
- DB를 읽는 페이지는 `params`/`searchParams`를 await하고 `loading.tsx`를 둔다. 그래야 빌드 시점에 DB를 호출하지 않는다 (Vercel·CI 빌드에는 DB가 없다). `generateStaticParams`로 DB를 읽지 않는다.
- 쿼리 결과는 snake_case DB 행을 camelCase 도메인 타입(`features/<도메인>/types.ts`)으로 바꿔서 반환한다.
- 쿼리스트링은 `search-params.ts`의 파서로 정규화하고, 잘못된 값은 에러 대신 기본값으로 둔다.
- E2E는 로컬 Supabase 시드에 의존한다. CI E2E 잡도 Supabase를 띄우고 `.env.local`을 만든다.

### 저장소·배포
- GitHub `tnghgks/coffee-racipe`. Phase 하나 = 브랜치(`phase-N`) 하나 = PR 하나, base는 `main`.
- CI(`.github/workflows/ci.yml`): Lint · Typecheck · Test 통과 후 E2E. Supabase 없이 돈다.
- Vercel은 `vercel.json`으로 framework를 `nextjs`로 고정했다 (프로젝트를 빈 main으로 import해서 프리셋이 "Other"로 잡혔던 문제).
- Vercel 프리뷰는 Deployment Protection이 켜져 있어 Vercel 로그인 상태에서만 열린다.
- 줄바꿈은 `.gitattributes`로 LF 고정 (로컬 git의 autocrlf 무시).

## 명령어
pnpm dev | pnpm test | pnpm e2e | pnpm typecheck | pnpm lint
pnpm db:start | pnpm db:stop | pnpm db:reset | pnpm db:types | pnpm db:test   (Supabase CLI는 pnpm exec supabase …, Docker 필요)
