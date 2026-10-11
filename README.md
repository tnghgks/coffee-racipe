# drip-community

핸드드립 레시피 공유 커뮤니티 + 추출 도구(비율 계산기, 추출 타이머, 브루 로그).
개발 계획은 [docs/PLAN.md](docs/PLAN.md), 작업 규칙은 [CLAUDE.md](CLAUDE.md)에 있습니다.

## 로컬 실행

필요: Node 22, pnpm, Docker Desktop(로컬 Supabase용)

```bash
pnpm install
pnpm db:start                 # 로컬 Supabase 실행 (Docker 필요)
pnpm exec supabase status     # API URL과 Publishable key 확인
cp .env.example .env.local    # 위 값을 채워 넣기
pnpm dev
```

`http://localhost:3000/status`에서 Supabase 연결 상태를 확인할 수 있습니다.

## 테스트

```bash
pnpm lint && pnpm typecheck && pnpm test   # 정적 검사 + 단위 테스트
pnpm e2e                                   # Playwright (처음엔 pnpm exec playwright install chromium)
```
