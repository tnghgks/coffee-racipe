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
| zustand | 5.0.15 (Phase 2) |
| zod | 4.6.5 (Phase 3) |
| react-hook-form / @hookform/resolvers | 7.89.0 / 5.9.1 (Phase 3) |
| @dnd-kit/core · sortable · utilities | 6.3.1 · 10.0.0 · 3.2.2 (Phase 3, 단계 드래그 정렬) |

TanStack Query, Serwist는 처음 쓰는 Phase에서 설치하고 여기에 버전을 추가한다.

## 구조
src/app/            루트 layout은 html/body/폰트만. 라우트는 그룹으로 나눈다 (URL에는 안 나옴)
src/app/(main)/     헤더·하단 내비가 있는 일반 화면
src/app/(main)/(placeholders)/  아직 안 만든 탭의 "준비 중" 페이지 (지금은 /explore만). 해당 Phase에서 실제 라우트를 만들 때 지운다.
src/app/(focus)/    헤더·내비 없는 전체 화면 (추출 모드 /recipes/[id]/brew)
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
- 테스트 역할: Vitest(node 환경)는 순수 함수만, 화면 흐름은 Playwright, 권한은 pgTAP. 컴포넌트 단위 테스트가 필요해지면 그때 jsdom·Testing Library를 다시 들인다.

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

### 추출 타이머 (Phase 2-A에서 정함)
- 상태 머신은 `src/lib/brew/session.ts`: idle → running ⇄ paused → finished. 세션은 "쌓인 ms + 마지막 재개 시각(performance.now())"만 저장하고 경과 시간은 매번 계산한다. 모든 함수는 `now`를 인자로 받는다.
- 단계 위치는 `src/lib/brew/progress.ts`의 `getBrewProgress(steps, totalTimeS, elapsedS)`. 마지막 붓기 이후~총 시간은 마지막 단계의 구간이다. 끝 시각은 `brewEndS`(총 시간과 마지막 단계 시작 중 큰 값).
- `src/features/brew/store.ts`의 `createBrewStore(clock)`는 위 함수에 `now`만 넣어 주는 얇은 래퍼다. 화면마다 인스턴스를 만들고(전역 싱글턴 아님), 매 프레임 `completeIfDue(endMs)`로 종료를 판정한다.

### 추출 화면 (Phase 2-B에서 정함)
- 원두량·비율·핫/아이스는 쿼리스트링(`?dose=&ratio=&iced=1`)으로 상세 ↔ 추출 화면을 오간다. 파싱·생성은 `features/brew/settings.ts`만 쓴다 (레시피 값과 같으면 생략, 범위 밖이면 레시피 값).
- 알림 판단은 순수 함수 `lib/brew/cues.ts` (3·2·1초 틱, 단계 전환, 완료). 소리·진동·Wake Lock 같은 브라우저 API는 `features/brew/feedback.ts`, `hooks.ts`에만 둔다.
- 화면 갱신은 rAF로 하되 리렌더는 ~10fps로 묶는다 (배터리). 알림·종료 판정은 매 프레임.
- Web Audio는 시작/재개 탭 안에서 `unlock()`해야 iOS에서 소리가 난다. iOS Safari는 진동 미지원이라 소리만.
- E2E는 `page.clock`으로 시간을 돌린다. 긴 시간은 `fastForward` 후 짧은 `runFor`로 (프레임을 하나하나 돌리면 느리다).
- 개발 서버의 Next dev indicator는 꺼 두었다 (`devIndicators: false`). 화면 모서리 버튼을 가려 E2E 클릭을 막았다.

### 인증 (Phase 3-A에서 정함)
- 로그인: Google·Kakao OAuth (`signInWithOAuth` → `/auth/callback`에서 code 교환). 로컬은 `supabase/config.toml`의 `[auth.external.*]`를 켜고 키는 `supabase/.env`(gitignore)에 둔다.
- 개발용 이메일 로그인: `NEXT_PUBLIC_DEV_LOGIN=1`일 때만 /login에 보인다 (로컬 .env.local, CI). Vercel에는 절대 넣지 않고, 클라우드 Supabase는 이메일 로그인을 꺼 둔다. E2E는 이 로그인을 쓴다.
- `profiles`: 가입 트리거가 만들고(OAuth 이름·사진 채움) `username`은 첫 로그인 후 /me/setup에서 정한다. 행 추가는 트리거만, 수정은 본인만, `id`는 수정 불가 (컬럼 GRANT).
- 세션 읽기는 `features/auth/queries.ts` (`getCurrentUser`, `getMyProfile`, `requireProfile`)만 쓴다. React `cache()`로 요청당 1번. 서버 클라이언트(`lib/supabase/server.ts`)는 `await connection()` 후 만든다 (안 하면 supabase-js가 프리렌더 중 Date.now()를 불러 경고).
- 보호 경로는 `features/auth/paths.ts`의 `PROTECTED_PREFIXES` (지금 /me). proxy가 비로그인을 /login?next=로 보내고, 페이지는 `requireProfile`로 다시 확인한다.
- 로그인 후 이동은 항상 `safeNextPath`로 거른다 (외부 URL 차단). next가 없으면 홈으로.
- `"use server"` 파일의 export는 전부 클라이언트에서 호출 가능한 엔드포인트가 된다. 액션이 아닌 헬퍼는 `queries.ts` 같은 server-only 파일에 둔다.
- Next 라우트 안내(route announcer)도 role="alert"라서 E2E에서 `getByRole("alert")`는 2개가 잡힌다. 메시지는 텍스트로 찾는다.

### 레시피 에디터 (Phase 3-B에서 정함)
- 저장은 DB 함수 `save_recipe(recipe, steps, recipe_id?)` 하나로. 드리퍼는 `dripper_slug`로 보내고 함수가 id를 찾는다 (앱의 캐시된 드리퍼 id는 재시드 후 낡을 수 있다) (레시피 + 단계를 한 트랜잭션). `security invoker`라 RLS·컬럼 GRANT가 그대로 적용되고, 남의 레시피 수정은 행이 안 보여 P0002로 실패한다. 단계 순서(시간·물량 역행 금지)도 함수 안에서 한 번 더 막는다.
- 에디터 스키마는 `features/recipe/editor-schema.ts` 하나를 폼과 Server Action이 같이 쓴다. 입력은 누적 g·m:ss, 저장은 `water_ratio`·초. 마지막 단계 = 원두 × 비율 ± 2g.
- 공개 데이터 읽기는 `queries.ts`(캐시), 내 레시피·비공개 읽기는 `my-queries.ts`(세션, 캐시 없음). 둘이 쓰는 컬럼·매핑은 `mappers.ts`. 상세·추출 페이지는 `getRecipeForViewer`(공개 → 없으면 내 비공개).
- 복제는 `/recipes/new?fork=<id>`로 미리 채우고 저장할 때 `forked_from`을 남긴다. 상세에 "원본" 링크.
- 편집/새 레시피는 proxy가 보호한다 (`/recipes/new`, `/recipes/*/edit`). 남의 레시피 편집 URL은 404.
- **Next 16은 지나온 페이지를 숨긴 채(display:none) DOM에 남겨 둔다** (뒤로가기 상태 보존). 그래서 폼 `id`는 고정 문자열 금지 → `useId()`로 만든다 (안 그러면 `<label for>`가 숨은 페이지의 input을 가리킨다). E2E에서 `getByText`·`getByTestId` 배열은 숨은 페이지까지 잡으니 `getByRole("article")` 등으로 범위를 좁히거나 `.filter({ visible: true })`.
- dnd-kit `DndContext`에는 `id={useId()}`를 준다 (안 그러면 hydration mismatch).
- 토큰은 유효한데 profiles 행이 없으면(삭제된 계정) 비로그인으로 취급한다. 로그인 페이지·헤더는 `getMyProfile()`로 판단 (`getCurrentUser()`만 보면 /login ↔ /me 무한 리다이렉트).
- E2E는 `e2e/fixtures.ts`의 `test`를 쓴다. 브라우저 콘솔 에러·uncaught 예외가 있으면 테스트가 실패한다 (dev 전용 경고를 놓치지 않게). 로그인 헬퍼는 `e2e/helpers.ts`.
- pgTAP에서 전체 행 수를 세지 않는다. 로컬 DB에는 E2E가 만든 데이터가 섞여 있다 → 픽스처 id로 범위를 좁힌다.

### 브루 로그 (Phase 4에서 정함)
- `brew_logs`는 본인만 읽고 쓴다 (anon은 테이블 접근 자체가 없음). `user_id`는 기본값 `auth.uid()`, 수정 불가. 레시피가 지워져도 로그는 남는다 (`recipe_id` set null).
- `water_g`는 컵 전체 물(아이스면 얼음 포함). 평점만 필수, 나머지는 선택 → 종료 화면 "기록 남기기" → 별점 → 저장 3탭.
- 추출 → 기록은 `features/log/prefill.ts`의 `newLogHref`/`logDefaultsFromQuery`로 쿼리스트링을 주고받는다. 폼이 /me 아래라 비로그인은 로그인(→ 첫 설정) 후 같은 URL로 돌아온다.
- 날짜는 `formatBrewedAt`으로 Asia/Seoul 고정 포맷 (서버 UTC와 브라우저가 같게).
- 레시피 상세: 지난 "다음엔" 메모는 계산기 위(`LastAdjustmentNote`), 내 기록 3개는 맨 아래(`MyRecipeLogs`). 둘 다 세션을 읽어서 각각 Suspense.
- 로그인·로그아웃·프로필 저장 액션은 `revalidatePath("/", "layout")`를 부른다. 레이아웃(헤더 아바타)은 이동해도 유지되므로 안 하면 새로고침 전까지 옛 상태가 보인다.

### 커뮤니티 (Phase 5에서 정함)
- 5-A: `/recipes`는 **공식 레시피만** (`listOfficialRecipes`). 사용자 공개 레시피는 `/u/[username]`과 `/explore`(5-B)에 나온다.
- 공개 범위: private(나만) · unlisted(링크로만, 목록·프로필에 안 나옴, 상세는 noindex) · public. 편집은 기존 값을 유지하고 복제는 private으로 시작.
- 레시피 조회는 작성자(`profiles` embed)를 함께 가져온다 (`mappers.ts`의 `author`). 카드 안에서는 링크 중첩을 피하려고 `AuthorLabel`, 그 밖에서는 `AuthorLink`.
- 공개 프로필·작성자 정보가 들어간 캐시는 `recipeTags.profiles` 태그를 단다. 프로필 저장 시 `updateTag(recipeTags.profiles)`.

### 저장소·배포
- GitHub `tnghgks/coffee-racipe`. Phase 하나 = 브랜치(`phase-N`) 하나 = PR 하나, base는 `main`.
- CI(`.github/workflows/ci.yml`): Lint · Typecheck · Test 통과 후 E2E. Supabase 없이 돈다.
- Vercel은 `vercel.json`으로 framework를 `nextjs`로 고정했다 (프로젝트를 빈 main으로 import해서 프리셋이 "Other"로 잡혔던 문제).
- Vercel 프리뷰는 Deployment Protection이 켜져 있어 Vercel 로그인 상태에서만 열린다.
- 줄바꿈은 `.gitattributes`로 LF 고정 (로컬 git의 autocrlf 무시).

## 명령어
pnpm dev | pnpm test | pnpm e2e | pnpm typecheck | pnpm lint
pnpm db:start | pnpm db:stop | pnpm db:reset | pnpm db:types | pnpm db:test   (Supabase CLI는 pnpm exec supabase …, Docker 필요)
