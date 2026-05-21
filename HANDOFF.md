# 기업둥이 인수인계

## 프로젝트 개요

- 프로젝트명: 기업둥이
- 저장소: `https://github.com/AppleNote8763/gieopdoongi.git`
- 로컬 경로: `C:\Users\user\Desktop\RoadUp AI`
- 실행 방식: Node.js + Express 서버가 `public` 정적 파일을 서빙
- 프론트엔드: HTML, CSS, Vanilla JavaScript
- 백엔드: Node.js, Express
- DB/Auth: Supabase Authentication + Supabase Database
- AI: Gemini API
- 배포 예정: Vercel

## 현재 구현된 기능

- 목표 기업 입력
- 기업 기반 추천 직무 찾기
  - `POST /api/suggest-roles`
  - Gemini로 기업/업종 기반 직무 추천
  - Gemini 과부하 시 fallback 직무 목록 반환
- 희망 직무 선택
- 현재 보유 기술/역량 입력
- 경력 수준 선택
- AI 로드맵 생성
  - `POST /api/generate-roadmap`
- 로그인/회원가입
  - Supabase Auth 이메일 기반
- 로그아웃
- 로그인 상태 유지
- 로그인 사용자만 로드맵 저장
  - `POST /api/save-roadmap`
- 로그인 사용자만 이전 로드맵 조회
  - `GET /api/roadmaps`
- 로그인 사용자만 저장된 로드맵 진행률 저장
  - `PATCH /api/roadmaps/:id/progress`
- 반응형 UI 개선
  - 좁은 화면에서 로드맵 카드가 1열로 쌓임
  - textarea 크기 조절 비활성화
  - 긴 내용은 내부 스크롤로 처리

## 중요한 파일

```txt
public/index.html
public/style.css
public/script.js
server.js
supabase/schema.sql
.env.example
.gitignore
README.md
vercel.json
package.json
```

## 환경 변수

실제 값은 `.env`에 들어 있음. `.env`는 Git에 올리지 않음.

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

주의:

- `.env.example`에는 실제 키를 넣지 않는다.
- `.env`는 `.gitignore`에 포함되어 있다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 키다.

## Supabase 상태

Supabase 프로젝트명: 기업둥이

직접 만든 DB 테이블은 하나:

```txt
public.roadmaps
```

`auth.users`는 Supabase Auth가 자동 관리한다.

실행한 SQL:

```sql
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  job_role text not null,
  skills text not null,
  level text not null,
  roadmap_result jsonb not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now()
);

create index if not exists roadmaps_user_id_created_at_idx
on public.roadmaps (user_id, created_at desc);
```

SQL 파일 위치:

```txt
supabase/schema.sql
```

Supabase Auth:

- Email provider enabled
- 개발 테스트용으로 `Confirm email`은 OFF 권장
- URL Configuration의 Site URL은 로컬 기준 `http://localhost:3000`

## 로컬 실행

```bash
npm install
npm run dev
```

접속:

```txt
http://localhost:3000
```

또는:

```txt
http://127.0.0.1:3000
```

`.env` 변경 후에는 서버를 반드시 재시작해야 한다.

## 최근 문제와 조치

### 1. 직무 찾기 오류

증상:

```txt
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

원인:

- 브라우저가 최신 서버가 아닌 `/api/suggest-roles`가 없는 서버에 요청함
- Express fallback HTML이 반환됐고, 프론트가 JSON으로 파싱하려다 실패

조치:

- 기존 Node 프로세스 정리 후 최신 서버 재실행
- `public/script.js`에서 JSON 아닌 응답을 안전하게 처리하도록 수정

관련 커밋:

```txt
8e547ac Handle non JSON role suggestion responses
```

### 2. Gemini 503 high demand

원인:

- Gemini 무료/저비용 모델 일시 과부하

조치:

- `429`, `503`일 때 fallback 로드맵 또는 fallback 직무 반환

관련 커밋:

```txt
a52ffff Handle Gemini temporary overload
```

### 3. textarea 크기 조절 문제

조치:

- textarea `resize: none`
- 긴 내용은 `overflow-y: auto`

관련 커밋:

```txt
861106c Fix textarea scrolling behavior
```

### 4. 좁은 화면 반응형 문제

조치:

- `1280px` 이하에서 로드맵 주요 카드 1열 배치
- 카드 안 긴 텍스트 줄바꿈 보강

관련 커밋:

```txt
acfe1c2 Improve responsive roadmap and role suggestions
```

## 현재 Git 상태

마지막 확인 기준:

```txt
main...origin/main
```

최근 커밋:

```txt
8e547ac Handle non JSON role suggestion responses
861106c Fix textarea scrolling behavior
acfe1c2 Improve responsive roadmap and role suggestions
a52ffff Handle Gemini temporary overload
d096e7c Add Supabase schema setup
e3e47c0 Initial 기업둥이 project
```

## 새 채팅에서 이어가는 방법

새 채팅을 시작하면 아래처럼 말하면 된다.

```txt
이 프로젝트는 C:\Users\user\Desktop\RoadUp AI 에 있고, HANDOFF.md를 먼저 읽고 이어서 작업해줘.
```

새 채팅의 Codex가 먼저 해야 할 일:

1. `HANDOFF.md` 읽기
2. `git status --short --branch` 확인
3. 필요하면 `server.js`, `public/script.js`, `public/style.css` 확인
4. 사용자가 요청한 수정만 진행
5. 수정 후 문법 검사

권장 검증 명령:

```bash
node --check server.js
node --check public/script.js
```

로컬 API 확인:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/
Invoke-WebRequest -UseBasicParsing -Method Post http://127.0.0.1:3000/api/suggest-roles -ContentType 'application/json' -Body '{"company":"쿠팡"}'
```

## 아직 할 수 있는 후속 작업

- 실제 브라우저에서 회원가입/로그인 테스트
- 직무 찾기 UX 추가 개선
- 추천 직무 직접 입력 기능 추가
- Vercel 배포
- Vercel 환경 변수 등록
- 배포 URL을 Supabase Auth URL Configuration에 추가
- 모바일 세부 UI 점검

