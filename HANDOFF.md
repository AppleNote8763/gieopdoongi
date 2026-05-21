# 기업뚱이 인수인계

## 최신 작업 메모

- 저장소: `https://github.com/AppleNote8763/gieopdoongi.git`
- 배포: Vercel, `main` 브랜치 자동 배포
- 앱 표시명: 기업뚱이
- 최신 원격 커밋: `Fix recalc date selector visibility` (`git log --oneline -1`로 해시 확인)
- 현재 로컬 변경은 위 커밋에 포함되어 push 완료된 상태가 기준이다.

### 최신 작업 요약 (2026-05-21)

- 커밋/push 완료:
  - `493ce52 Improve roadmap date and checklist editing`
  - 반영 내용:
    - 이전 데이터 카드 클릭 시 진행 관리 페이지로 이동하지 않던 문제 수정
    - 목표 설정과 진행 관리 재조정 폼에서 날짜를 `시작 날짜` + `목표 날짜`로 선택하도록 변경
    - AI 분석 시작 버튼이 준비 기간 에러 표시 요소 누락 때문에 submit 중단되던 문제 수정
    - 진행 관리 체크리스트의 예상 기간을 직접 수정 가능하게 변경
    - 체크리스트 기본 기간이 `3-5일`로 고정 반복되지 않도록 전체 기간/항목 수 기준으로 분산
    - Gemini 프롬프트에 체크리스트 duration을 난이도별로 다르게 산정하도록 보강
- 최신 커밋에 포함된 추가 변경:
  - 진행 관리 > 로드맵 다시 최적화 > `달력에서 목표일 선택` 선택 시 달력 기간 선택 영역이 확실히 보이도록 수정
  - `hidden` class뿐 아니라 `hidden` 속성, `display`까지 함께 동기화하는 `setElementHidden()` 추가
  - 재조정 폼의 `직접 입력`/`기간 선택` 영역을 중첩 `label` 구조에서 `div.field` 구조로 정리
- 더미 테스트 계정 생성 완료:
  - 이메일: `111@111.com`
  - 비밀번호: `123123`
  - Supabase Auth Admin API로 `email_confirm: true` 상태 생성
- 로컬 서버:
  - `npm run dev`로 실행 확인
  - 접속 URL: `http://127.0.0.1:3000/`
  - `/` 응답 200 확인
- 사용자 Git 운영 선호:
  - 사용자가 명시적으로 "깃에 올려줘", "푸시해줘", "커밋/푸시해줘"라고 요청할 때만 GitHub에 올린다.
  - 자동 커밋/푸시는 하지 않는다.

### 최근 반영 완료 및 push된 작업

- 고용24/워크넷 채용정보 OpenAPI 연동 구조 추가
- 앱 표시명 `기업둥이` -> `기업뚱이` 변경
- 로그인/회원가입 헤더 버튼 크기 정렬
- `selectedSkills is not defined` 버그 수정
  - 원인: `collectGoal()`에서 `selectedSkills`를 선언하지 않고 사용
  - 영향: 직무 선택 후 버튼 활성화, 역량 찾기, AI 분석 버튼 검증이 막힘

### 이전에 기록된 로컬 변경 참고

- `public/script.js`
  - 진행 관리 > 로드맵 다시 최적화 > 새로운 준비 기간에서 `달력에서 목표일 선택` 선택 시 날짜 입력칸이 표시되도록 수정
  - 브라우저가 지원하면 `input[type="date"]`의 `showPicker()`를 호출해 달력 picker를 바로 열도록 개선
- `server.js`
  - `/api/suggest-roles`, `/api/suggest-skills` Gemini 호출에 15초 timeout 추가
  - timeout 시 fallback 직무/역량 추천을 반환하도록 개선
  - 이유: 로컬 테스트 중 `/api/suggest-skills`가 Gemini 응답 지연으로 timeout되는 문제 발견

위 항목 대부분은 `493ce52`까지 반영 및 push 완료됨. 이후 달력 표시 보완과 이 인수인계 갱신은 `Fix recalc date selector visibility` 커밋에 포함됨.

### 최근 로컬 테스트 결과

- `node --check server.js` 통과
- `node --check public/script.js` 통과
- `package.json` 파싱 통과
- 로컬 서버 기동 후 확인:
  - `/` -> 200
  - `/api/config` -> 200
  - `/api/suggest-roles` -> 200
  - `/api/suggest-skills` -> 200
  - `/api/job-postings` -> 200
  - `/api/generate-roadmap` -> 200
  - 비로그인 `/api/save-roadmap` -> 401 정상
  - 비로그인 `/api/roadmaps` -> 401 정상

### 고용24 API 키

- 서버에서만 호출하도록 구현됨.
- `.env`에 아래 키 필요:

```env
WORK24_API_KEY=발급받은키
```

- 예전 명칭 호환으로 `WORKNET_API_KEY`도 읽음.
- Vercel에도 Environment Variable `WORK24_API_KEY` 추가 필요.
- 키가 없으면 앱은 죽지 않고 채용공고 목록만 비어 있음.

### Vercel 경고 참고

Vercel 로그의 아래 메시지는 현재 치명적인 오류가 아니라 경고다.

```txt
WARNING! Due to `builds` existing in your configuration file, the Build and Development Settings defined in your Project Settings will not apply.
```

`vercel.json`에 `builds`가 있어서 Vercel 대시보드의 Build Command/Output Directory 설정이 무시된다는 의미이며, 스크린샷 기준 배포 상태는 `Ready`였다.

## 프로젝트 개요

- 프로젝트명: 기업뚱이
- 저장소: `https://github.com/AppleNote8763/gieopdoongi.git`
- 로컬 경로: `C:\Users\user\Desktop\RoadUp AI`
- 실행 방식: Node.js + Express 서버가 `public` 정적 파일을 서빙
- 프론트엔드: HTML, CSS, Vanilla JavaScript
- 백엔드: Node.js, Express
- DB/Auth: Supabase Authentication + Supabase Database
- AI: Gemini API
- 배포: Vercel 연동 진행 중 또는 진행 예정

## 현재 구현된 기능

- 목표 기업 입력
- 기업 기반 추천 직무 찾기
  - `POST /api/suggest-roles`
  - Gemini로 기업/업종 기반 직무 추천
  - Gemini 과부하 시 fallback 직무 목록 반환
  - 현대자동차/현대차/기아/자동차/모빌리티/전기차/자율주행/차량 키워드는 자동차·모빌리티 직무 우선 추천
- 추천 직무 직접 입력
  - 추천 목록에 원하는 직무가 없으면 직접 입력 가능
  - 직접 입력값이 있으면 select 값보다 우선 사용
- 현재 보유 기술/역량 추천 및 입력
  - `POST /api/suggest-skills`
  - 목표 기업 + 희망 직무 기준으로 필요한 역량을 Gemini가 추천
  - 추천 역량을 체크박스로 선택 가능
  - 추천 목록에 없는 역량은 직접 입력 가능
  - 체크된 역량 + 직접 입력 역량을 합쳐서 로드맵 생성에 사용
  - 체크와 직접 입력이 모두 비어 있어도 AI 분석 시작 가능
- 경력 수준 선택
- AI 로드맵 생성
  - `POST /api/generate-roadmap`
  - `skills`가 비어 있으면 처음 준비하는 사람 기준으로 로드맵 생성하도록 프롬프트 보강
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
- 진행 관리 체크리스트
  - 체크박스로 완료 여부 변경
  - 드래그 핸들로 우선순위 순서 변경 가능
  - 저장된 로드맵이면 변경된 체크리스트 순서도 서버에 저장
- 반응형 UI 개선
  - 좁은 화면에서 로드맵 카드가 1열로 쌓임
  - 긴 내용은 내부 스크롤 또는 줄바꿈 처리

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
- Vercel 배포 시 위 5개 환경 변수를 Vercel Project Settings 또는 New Project 화면에 직접 등록해야 한다.

## Supabase 상태

Supabase 프로젝트명: 기업뚱이

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
- 로컬 Site URL: `http://localhost:3000`
- Vercel 배포 후에는 Supabase Authentication > URL Configuration에서 Site URL과 Redirect URLs에 Vercel 배포 URL을 추가해야 한다.

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

## 배포 상태와 Vercel

현재 GitHub 원격 저장소:

```txt
origin https://github.com/AppleNote8763/gieopdoongi.git
```

Vercel 설정:

- `vercel.json` 있음
- Application Preset: Express
- Root Directory: `./`
- Build Command: None
- Output Directory: N/A
- Environment Variables에는 `.env`의 실제 값 5개를 등록해야 함

Vercel에서 해야 할 일:

1. GitHub 저장소 `AppleNote8763/gieopdoongi` import
2. 환경 변수 5개 등록
3. Deploy
4. 배포 URL을 Supabase Auth URL Configuration에 추가
5. 배포 URL에서 회원가입/로그인/로드맵 생성/저장 테스트

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

### 3. 현대자동차 직무 추천이 너무 일반적이던 문제

증상:

- 현대자동차를 입력해도 백엔드 개발, 프론트엔드 개발, UI/UX 디자이너 같은 일반 IT 직무가 우선 표시됨

조치:

- 자동차·모빌리티 키워드 fallback 추가
- 산업 특화 fallback이 있으면 Gemini 결과보다 앞쪽에 산업 특화 직무를 섞도록 보정

관련 커밋:

```txt
e8c6e99 Improve role suggestions for deployment
```

### 4. 체크리스트 우선순위 변경 필요

조치:

- 진행 관리 페이지 체크리스트에 드래그 핸들 추가
- 드롭 시 `state.roadmap.checklist` 배열 재정렬
- 저장된 로드맵이면 `PATCH /api/roadmaps/:id/progress`로 변경 순서 저장

관련 커밋:

```txt
1fc66b5 Add skill suggestions and checklist ordering
```

### 5. 보유 역량 입력이 필수였던 문제

요구사항:

- 목표 설정 페이지에서 AI가 해당 직업에 필요한 역량을 찾아주고 체크박스로 선택 가능해야 함
- 체크리스트에 없는 역량은 사용자가 직접 입력 가능해야 함
- 체크와 직접 입력이 모두 비어 있어도 분석 시작 가능해야 함

조치:

- `POST /api/suggest-skills` 추가
- 목표 설정 UI에 `역량 찾기` 버튼, 추천 역량 체크박스, 직접 입력칸 추가
- `skills`를 서버 필수 검증에서 제외
- 빈 `skills`이면 처음 준비하는 사람 기준으로 로드맵을 만들도록 프롬프트 보강

관련 커밋:

```txt
1fc66b5 Add skill suggestions and checklist ordering
```

## 현재 Git 상태

마지막 확인 기준:

```txt
main...origin/main
```

최근 커밋:

```txt
1fc66b5 Add skill suggestions and checklist ordering
e8c6e99 Improve role suggestions for deployment
e35f78a Add project handoff notes
8e547ac Handle non JSON role suggestion responses
861106c Fix textarea scrolling behavior
acfe1c2 Improve responsive roadmap and role suggestions
a52ffff Handle Gemini temporary overload
d096e7c Add Supabase schema setup
```

## 검증했던 명령

문법 검사:

```bash
node --check server.js
node --check public/script.js
```

API 검증:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post http://127.0.0.1:3000/api/suggest-skills -ContentType 'application/json; charset=utf-8' -Body '{"company":"현대자동차","jobRole":"자율주행/ADAS 엔지니어"}'
```

빈 역량 로드맵 생성 검증:

```txt
/api/generate-roadmap
body: {"company":"현대자동차","jobRole":"자율주행/ADAS 엔지니어","skills":"","level":"초급(신입)"}
결과: 200 확인
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
6. 배포 반영이 필요하면 커밋 후 `git push`

## 아직 할 수 있는 후속 작업

- 실제 브라우저에서 회원가입/로그인 테스트
- Vercel 배포 완료 여부 확인
- Vercel 배포 URL을 Supabase Auth URL Configuration에 추가
- 배포 URL에서 `/api/config`, `/api/suggest-roles`, `/api/suggest-skills`, `/api/generate-roadmap` 확인
- 배포 URL에서 로드맵 저장/불러오기/진행률 저장 확인
- 취업 준비 기간을 4주 고정이 아니라 1개월~1년까지 직무/역량/자격증 기준으로 유동 생성하도록 개선
- 자격증이 필요한 직무는 시험 일정과 준비 기간을 반영하는 기능 검토
- 모바일에서 역량 체크박스와 체크리스트 드래그 UX 점검
