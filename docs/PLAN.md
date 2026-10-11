# 핸드드립 레시피 커뮤니티 개발 플랜

Oct 11, 2026 · @Hosu han

## 개요

추출할 때 켜두고 쓰는 도구(비율 계산기·추출 타이머·브루 로그)를 중심에 두고, 그 위에 레시피를 올리고 공유하는 커뮤니티를 얹는 7단계(Phase 0\~6) 계획입니다. 커뮤니티까지 갈 것이므로 처음부터 DB·인증 구조를 깔고, 공식 레시피도 같은 테이블에 시드 데이터로 넣어 나중에 마이그레이션할 일을 없앱니다.

각 Phase는 끝날 때마다 배포 가능한 상태가 되도록 잘랐고, Claude Code 세션 1\~3개 분량입니다. 문서 하단의 단계별 계획에 Phase마다 그대로 붙여 넣을 프롬프트와 완료 기준이 있습니다.

| Phase | 결과물 | 포함 기능 |
| --- | --- | --- |
| 0. 기반 셋업 | 빈 앱이 Vercel에 배포됨 | 프로젝트 생성, Supabase 연결, CLAUDE.md, CI |
| 1. 레시피 열람·계산기 | 공식 레시피를 보고 원두량을 바꿔 환산 | 스키마, 시드, 목록·필터, 상세, 비율 계산기 |
| 2. 추출 모드 | 레시피대로 타이머를 돌리며 추출 | 단계 타이머, 누적 물량, 알림, Wake Lock |
| 3. 인증·내 레시피 | 로그인해서 레시피 작성·수정·복제 | 소셜 로그인, 프로필, 레시피 에디터 |
| 4. 브루 로그 | 추출 후 기록을 남기고 돌아보기 | 로그 작성, 목록, 원두별 조회 |
| 5. 커뮤니티 | 다른 사람 레시피를 탐색·반응·포크 | 공개 범위, 피드, 검색, 좋아요·저장, 댓글, 포크, 신고 |
| 6. PWA·품질·출시 | 홈 화면 설치, 오프라인, 운영 준비 | PWA, SEO·OG 이미지, 성능, 관리자 모더레이션 |

&#91;embedded content: Phase 의존 관계 · 7단계\]

Phase 2의 종료 화면이 브루 로그로 이어지고, Phase 3의 인증이 브루 로그와 커뮤니티의 공통 전제입니다.

## 기술 스택

Next.js(App Router) + Supabase 조합으로, 레시피 페이지는 서버 렌더링으로 검색 노출을 챙기고 인증·DB·권한은 Supabase에 맡겨 백엔드 코드를 최소화합니다.

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js (App Router) + TypeScript | 레시피 상세 SSR/SEO, Server Actions로 API 레이어 생략 |
| UI | Tailwind CSS + shadcn/ui | 컴포넌트 소스를 직접 소유, Claude Code가 수정하기 쉬움 |
| DB·인증·스토리지 | Supabase (Postgres, Auth, Storage) | RLS로 권한을 DB에서 강제, 소셜 로그인 기본 제공 |
| DB 접근 | supabase-js + 생성 타입 | `supabase gen types`로 스키마와 타입 동기화 |
| 마이그레이션 | Supabase CLI (`supabase/migrations`) | 스키마 변경 이력을 코드로 관리 |
| 검증·폼 | Zod + React Hook Form | 같은 스키마를 폼과 Server Action에서 재사용 |
| 클라이언트 상태 | Zustand | 추출 세션(타이머) 상태 |
| 서버 상태 | TanStack Query | 피드 무한 스크롤, 좋아요 낙관적 업데이트 |
| 테스트 | Vitest + Playwright | 환산·타이머 로직 단위 테스트, 핵심 흐름 E2E |
| PWA | Serwist | 서비스 워커, 오프라인 캐시 |
| 배포 | Vercel + Supabase Cloud | 프리뷰 배포로 PR마다 확인 |
| 패키지 매니저 | pnpm |  |

버전은 Phase 0에서 Claude Code가 설치 시점의 최신 안정판으로 잡고, 확정된 버전을 CLAUDE.md에 적어 둡니다.

## 데이터 모델

핵심은 `recipes` + `recipe_steps`이고, 단계 물량을 원두량 대비 배수(`water_ratio`)로 저장해 어떤 원두량이든 곱셈 한 번으로 환산합니다. 공식 레시피는 `is_official = true`인 같은 테이블 행이라 커뮤니티 레시피와 동일한 화면·로직을 탑니다.

| 테이블 | 주요 컬럼 | 도입 Phase |
| --- | --- | --- |
| `drippers` | id, name, brand, slug | 1 |
| `recipes` | id, author\_id(null = 공식), title, description, dripper\_id, dose\_g, ratio, water\_temp\_c, grind\_text, total\_time\_s, visibility, is\_official, forked\_from, like\_count, save\_count, search(tsvector), created\_at, updated\_at | 1 (커뮤니티 컬럼은 5에서 사용) |
| `recipe_steps` | id, recipe\_id, position, label, start\_at\_s, water\_ratio(누적 물량 ÷ 원두량), note | 1 |
| `profiles` | id(= auth.users.id), username(unique), display\_name, avatar\_url, bio | 3 |
| `brew_logs` | id, user\_id, recipe\_id(nullable), bean\_name, roaster, roast\_level, dose\_g, water\_g, grind\_text, water\_temp\_c, total\_time\_s, rating, acidity, sweetness, body, notes, next\_adjustment, brewed\_at | 4 |
| `recipe_likes` / `recipe_saves` | user\_id, recipe\_id (복합 PK) | 5 |
| `comments` | id, recipe\_id, user\_id, body, created\_at, deleted\_at | 5 |
| `reports` | id, reporter\_id, target\_type, target\_id, reason, status | 5 |

`visibility`는 `private`(나만) · `unlisted`(링크로만) · `public`(피드 노출) 세 값의 enum입니다.

**RLS 방향**

- 모든 테이블 RLS 활성화가 기본값이고, 정책 없는 테이블은 만들지 않습니다.
- `recipes` 조회: `visibility in ('public','unlisted') or author_id = auth.uid()`. 작성·수정·삭제: 본인만. `is_official`은 service role로만 쓰기.
- `recipe_steps`: 부모 레시피의 권한을 그대로 따름.
- `brew_logs`: 본인만 조회·작성.
- 좋아요·저장: 누구나 조회, 본인 행만 추가·삭제. `like_count`·`save_count`는 트리거로 갱신.
- `comments`: 레시피를 볼 수 있으면 조회, 로그인 사용자 작성, 본인만 수정·소프트 삭제.
- `reports`: 작성은 로그인 사용자, 조회는 관리자 역할만.

## Claude Code 작업 방식

이 문서를 `docs/PLAN.md`로 저장소에 넣고, 규칙은 `CLAUDE.md`에 고정한 뒤 Phase 하나씩 "계획 → 구현 → 검증 → PR" 순서로 진행합니다.

**진행 규칙**

1. Phase를 시작할 때 새 세션(또는 `/clear`)으로 컨텍스트를 비우고, 아래 단계별 계획의 프롬프트를 붙여 넣습니다.
2. Claude Code에게 먼저 Plan 모드로 구현 계획을 내게 하고, 파일 목록·마이그레이션·테스트 범위를 확인한 뒤 승인합니다.
3. Phase 하나 = 브랜치 하나 = PR 하나. Vercel 프리뷰에서 완료 기준을 직접 확인하고 머지합니다.
4. `pnpm lint && pnpm typecheck && pnpm test`가 통과하지 않으면 다음 Phase로 넘어가지 않습니다.
5. Phase가 끝나면 Claude Code에게 "이번 Phase에서 정한 규칙·결정을 CLAUDE.md에 반영하고 PLAN.md 체크박스를 갱신해줘"를 마지막 프롬프트로 줍니다.
6. 큰 Phase(1, 5)는 하위 작업 단위로 쪼개서 세션을 나눕니다. 한 세션에 마이그레이션·UI·테스트를 다 몰면 품질이 떨어집니다.

**CLAUDE.md 초안** (Phase 0에서 생성)

```markdown
# drip-community
핸드드립 레시피 공유 커뮤니티 + 추출 도구(비율 계산기, 추출 타이머, 브루 로그).
전체 계획: docs/PLAN.md

## 스택
Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Supabase(Postgres/Auth/Storage),
Zod, React Hook Form, Zustand, TanStack Query, Vitest, Playwright, pnpm

## 구조
src/app/            라우트 (서버 컴포넌트 기본)
src/features/<도메인>/  recipe, brew, log, community — components, actions.ts, schema.ts, queries.ts
src/lib/supabase/   server.ts, client.ts, middleware.ts
src/lib/brew/       환산·타이머 순수 함수 (UI 의존 금지, 단위 테스트 필수)
supabase/migrations/  모든 스키마 변경

## 규칙
- 데이터 변경은 Server Action + Zod 검증. 클라이언트에서 직접 insert 금지.
- 스키마 변경 시: 마이그레이션 추가 → supabase gen types → 타입 커밋.
- 새 테이블은 RLS 활성화 + 정책을 같은 마이그레이션에 작성.
- 레시피 물량은 원두량 대비 배수로 저장하고 표시할 때 환산.
- 타이머 경과 시간은 시작 시각 기준 performance.now() 차이로 계산 (setInterval 누적 금지).
- UI 문구는 한국어, 코드·커밋 메시지는 영어.
- 완료 전 pnpm lint && pnpm typecheck && pnpm test 통과.

## 명령어
pnpm dev | pnpm test | pnpm e2e | pnpm db:types | supabase db reset
```

## 단계별 개발 계획

각 Phase의 프롬프트는 Claude Code에 그대로 붙여 넣는 용도이고, 완료 기준 체크박스가 모두 채워져야 다음 Phase로 넘어갑니다.

### Phase 0. 기반 셋업

빈 앱이 Vercel 프리뷰에 뜨고, Supabase 로컬 환경과 CI가 돌아가는 상태를 만듭니다.

```text
docs/PLAN.md를 읽고 Phase 0을 진행해줘. 먼저 Plan 모드로 계획을 보여줘.
- pnpm으로 Next.js(App Router, TypeScript strict, Tailwind, ESLint) 프로젝트 생성
- shadcn/ui 초기화, 기본 레이아웃(헤더/모바일 하단 내비) 구성
- Supabase CLI 로컬 환경 구성, src/lib/supabase/{server,client,middleware}.ts 작성
- Vitest, Playwright 설정과 샘플 테스트 1개씩
- GitHub Actions: lint, typecheck, test
- docs/PLAN.md의 CLAUDE.md 초안으로 CLAUDE.md 생성, 설치된 버전 기록
- .env.example 작성
```

- [x] `pnpm dev`로 기본 레이아웃이 뜬다
- [x] `supabase start` 후 앱에서 Supabase 연결 확인
- [x] CI가 PR에서 통과한다
- [x] Vercel 프리뷰 URL이 생성된다

### Phase 1. 레시피 열람·비율 계산기

로그인 없이 공식 레시피를 드리퍼별로 찾아보고, 원두량을 바꾸면 모든 단계 물량이 환산되는 상태입니다. 세션을 1-A(스키마·시드), 1-B(환산 로직), 1-C(화면)로 나눕니다.

```text
[1-A] docs/PLAN.md의 데이터 모델 중 drippers, recipes, recipe_steps 마이그레이션을 작성해줘.
- visibility enum, forked_from, like_count 등 Phase 5 컬럼도 지금 포함
- RLS: 공개/unlisted 조회 허용, 쓰기는 본인만, is_official은 service role만
- supabase/seed.sql에 공식 레시피 10개 이상 시드 (V60, Kalita Wave, Origami, Chemex 포함)
- 타입 생성 후 커밋
```

```text
[1-B] src/lib/brew/에 환산 순수 함수를 만들고 Vitest로 테스트해줘.
- scaleRecipe(recipe, doseG): 단계별 누적 물량(g), 총 물량, 단계 푸어량 반환
- 비율 변경(ratio) 시 재계산, 반올림 규칙은 1g 단위
- 경계값 테스트: 원두 0g, 소수점 원두량, 단계 0개
```

```text
[1-C] 레시피 목록/상세 화면을 만들어줘.
- /recipes: 드리퍼 필터, 정렬(최신·인기), 서버 컴포넌트로 조회
- /recipes/[id]: 기본 정보 카드, 원두량 입력(스테퍼) → 1-B 함수로 단계표 실시간 환산
- 모바일 우선, 단계표는 시간 · 누적 물량 · 이번 푸어량 · 메모 열
- generateMetadata로 제목·설명 설정
```

- [x] 시드 레시피가 드리퍼 필터로 걸러진다
- [x] 원두량 15g → 20g 변경 시 단계 물량이 1g 단위로 환산된다
- [x] 환산 함수 테스트 통과, 비로그인으로 private 레시피 조회 불가(RLS 테스트)
- [x] 모바일 폭 375px에서 가로 스크롤 없음

### Phase 2. 추출 모드

레시피 상세에서 "추출 시작"을 누르면 큰 화면 타이머가 단계마다 목표 누적 물량을 안내하는 상태입니다. 이 서비스의 핵심 화면이라 로직(2-A)과 UI(2-B)를 분리합니다.

```text
[2-A] src/lib/brew/에 추출 세션 로직을 만들고 테스트해줘.
- 상태: idle → running → paused → finished, 시작 시각 기준 performance.now() 경과 계산
- 현재 단계/다음 단계/단계 내 진행률/목표 누적 물량 계산 함수 (순수 함수)
- Zustand 스토어는 이 함수들을 감싸기만 함
- 테스트: 일시정지·재개 후 경과 시간, 마지막 단계 이후 finished 전환
```

```text
[2-B] /recipes/[id]/brew 추출 모드 화면을 만들어줘.
- 화면 중앙에 큰 경과 시간, 현재 단계 라벨, 목표 누적 물량(g), 단계 진행 바, 다음 단계 미리보기
- 화면 아무 곳 탭 = 시작/일시정지, 터치 영역 최소 48px
- Screen Wake Lock API로 화면 꺼짐 방지(미지원 시 안내 문구)
- 단계 전환 3초 전 비프음(Web Audio), 전환 시 navigator.vibrate
- 원두량은 상세 화면에서 정한 값을 쿼리스트링으로 전달
- 종료 시 "기록 남기기" 버튼(Phase 4에서 연결, 지금은 자리만)
```

- [x] 탭 전환 후 돌아와도 경과 시간이 밀리지 않는다
- [ ] 실제 기기(Android Chrome, iOS Safari)에서 추출 중 화면이 꺼지지 않는다
- [ ] 단계 전환 알림음·진동이 동작한다
- [x] 세션 로직 테스트 통과

### Phase 3. 인증·내 레시피

로그인한 사용자가 레시피를 작성·수정·삭제하고, 공식 레시피를 복제해 자기 버전을 만들 수 있는 상태입니다.

```text
[3-A] Supabase Auth로 로그인을 붙여줘.
- Google, Kakao OAuth (Kakao는 Supabase 지원 프로바이더 설정)
- profiles 테이블 + 가입 시 프로필 생성 트리거, username 최초 설정 화면
- middleware로 세션 갱신, /me 하위 라우트 보호
```

```text
[3-B] 레시피 에디터를 만들어줘.
- /recipes/new, /recipes/[id]/edit: 기본 정보 + 단계 리스트(추가·삭제·드래그 정렬)
- 단계 입력은 g 단위로 받고 저장 시 water_ratio로 변환 (src/lib/brew 함수 사용)
- Zod 스키마 공유: 시작 시각 오름차순, 누적 물량 단조 증가, 총 물량 = 원두량 × 비율 ± 허용 오차
- 에디터 우측(모바일은 하단)에 단계표 미리보기
- "복제해서 수정": forked_from 기록 후 에디터로 이동
- visibility 선택은 private만 활성화 (나머지는 Phase 5)
- /me/recipes: 내 레시피 목록
```

- [x] 로그인 → 레시피 작성 → 추출 모드 실행까지 E2E 통과
- [x] 다른 사용자의 레시피 수정 요청이 RLS로 거부된다
- [x] 잘못된 단계(물량 감소, 시간 역순) 저장이 막힌다

### Phase 4. 브루 로그

추출이 끝나면 바로 기록을 남기고, 원두·레시피별로 지난 추출을 돌아보며 다음 조정을 확인하는 상태입니다.

```text
[4] 브루 로그 기능을 만들어줘.
- brew_logs 마이그레이션 + RLS(본인만)
- 추출 모드 종료 화면의 "기록 남기기" → 레시피·원두량·실제 총 시간을 미리 채운 작성 폼
- 입력: 원두명, 로스터리, 로스팅 정도, 분쇄도, 평점(1~5), 산미·단맛·바디(1~5 슬라이더), 메모, 다음 조정 메모
- /me/logs: 최신순 목록, 원두명·레시피 필터
- 레시피 상세에 "이 레시피로 내린 내 기록" 섹션 (최근 3개 + 마지막 다음 조정 메모 강조)
- 비로그인 상태로 종료 시 로그인 유도 후 입력값 유지
```

- [x] 추출 종료 → 기록 저장이 3탭 이내로 끝난다
- [x] 다음 추출 시 레시피 상세에서 지난 조정 메모가 보인다
- [x] 다른 사용자 로그는 조회되지 않는다

### Phase 5. 커뮤니티

레시피를 공개하고, 다른 사람 레시피를 탐색·검색·좋아요·저장·댓글·포크하며, 문제 있는 콘텐츠를 신고할 수 있는 상태입니다. 가장 큰 Phase라 4개 세션으로 나눕니다.

```text
[5-A] 공개 범위와 공개 프로필
- 에디터에서 visibility(private/unlisted/public) 선택 활성화
- /u/[username]: 프로필, 공개 레시피 목록
- 레시피 카드·상세에 작성자 표시, 공식 레시피는 배지
```

```text
[5-B] 탐색 피드와 검색
- /explore: public 레시피 피드, 탭(인기·최신), 드리퍼·비율 범위·총 시간 필터
- 인기 정렬: like_count와 save_count에 작성 후 경과 시간 감쇠를 적용한 점수 (DB 뷰나 함수로)
- recipes.search tsvector(제목·설명) + GIN 인덱스, 검색창
- TanStack Query 무한 스크롤 (커서 기반 페이지네이션)
```

```text
[5-C] 반응: 좋아요, 저장, 포크
- recipe_likes, recipe_saves 마이그레이션 + 카운트 갱신 트리거 + RLS
- 좋아요·저장 버튼 낙관적 업데이트, /me/saved 목록
- 포크: 공개 레시피 복제 시 forked_from 기록, 상세에 "원본: @작성자/레시피" 링크와 포크 수 표시
```

```text
[5-D] 댓글과 신고
- comments 마이그레이션 + RLS, 레시피 상세 하단 댓글(작성·수정·소프트 삭제)
- 댓글 작성 rate limit (사용자당 분당 N개, DB 함수 또는 Server Action에서 검사)
- 레시피·댓글 신고 버튼 → reports 저장
- profiles에 role 컬럼(user/admin) 추가, 관리자 판정 헬퍼
```

- [ ] 비로그인 사용자가 /explore에서 public 레시피만 보고, unlisted는 링크로만 열린다
- [ ] 좋아요 연타·동시 요청에도 카운트가 어긋나지 않는다
- [ ] 포크한 레시피에 원본 링크가 남는다
- [ ] 검색어 "4:6"처럼 특수문자 포함 검색이 오류 없이 동작한다
- [ ] 커뮤니티 핵심 흐름(공개 → 탐색 → 좋아요 → 포크 → 댓글) E2E 통과

### Phase 6. PWA·품질·출시

홈 화면에 설치해 오프라인에서도 저장한 레시피로 추출할 수 있고, 공유 링크가 미리보기로 보이며, 관리자가 신고를 처리할 수 있는 상태입니다.

```text
[6-A] PWA
- Serwist로 서비스 워커, manifest, 아이콘
- 오프라인 캐시: 앱 셸, 최근 본 레시피, 저장한 레시피 상세 (추출 모드는 네트워크 없이 동작)
- 설치 유도 배너(추출 모드 2회 사용 후 1회 노출)
```

```text
[6-B] SEO와 공유
- 레시피 상세 OG 이미지 동적 생성(제목, 드리퍼, 원두량·비율, 작성자)
- sitemap.xml(public 레시피), robots.txt, JSON-LD(Recipe 스키마)
- 공유 버튼: Web Share API, 미지원 시 링크 복사
```

```text
[6-C] 운영과 품질
- /admin/reports: 신고 목록, 레시피 비공개 처리, 댓글 숨김, 처리 상태 변경 (admin만)
- 에러 모니터링(Sentry 등) 연결, Vercel Analytics
- Lighthouse 모바일 점검 후 개선(이미지 최적화, 번들 분석)
- 개인정보처리방침·이용약관 페이지, 회원 탈퇴(데이터 삭제) 기능
```

- [ ] 비행기 모드에서 저장한 레시피로 추출 모드가 동작한다
- [ ] 카카오톡·슬랙에 링크 공유 시 OG 미리보기가 뜬다
- [ ] 관리자가 신고된 레시피를 비공개 처리할 수 있다
- [ ] Lighthouse 모바일 Performance·Accessibility 90 이상

## 리스크와 운영 고려사항

가장 큰 리스크는 커뮤니티 초기에 콘텐츠가 비어 보이는 것과 모더레이션 부담이라, 공식 레시피를 충분히 시드하고 신고·관리 도구를 출시 전에 갖춥니다.

| 리스크 | 대응 |
| --- | --- |
| 초기 콘텐츠 부족 | 공식 레시피 20개 이상 시드, 포크를 쉽게 해서 "공식 레시피 변형"이 첫 게시물이 되도록 유도 |
| 스팸·부적절 콘텐츠 | 댓글 rate limit, 신고 + 관리자 화면(Phase 5-D, 6-C), 신규 계정 하루 게시 수 제한 검토 |
| 유명 레시피 저작권 | 수치(원두량·비율·시간)만 정리하고 설명은 직접 작성, 원작자·출처 링크 표기 |
| RLS 누락으로 데이터 노출 | 테이블마다 정책을 같은 마이그레이션에 작성, 다른 사용자 계정으로 접근하는 테스트를 Phase마다 포함 |
| 추출 타이머 신뢰성 | 순수 함수 + 테스트, 실제 기기 테스트를 완료 기준에 포함 |
| iOS Safari 제약 | Wake Lock·진동 미지원 대비 안내 문구와 대체 동작(소리만) 준비 |
| 카운트 불일치 | 좋아요·저장 카운트는 트리거로만 갱신, 클라이언트 계산 값을 저장하지 않음 |

출시 후 확장 후보: 그라인더별 분쇄도 클릭 수 매핑, 원두 데이터베이스(로스터리·원산지), 팔로우·알림, 저울 블루투스 연동.
