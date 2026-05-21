# 기업둥이

AI 취업 준비 플래너 웹 서비스입니다. 사용자가 목표 기업, 희망 직무, 현재 보유 기술/역량, 경력 수준을 입력하면 Gemini API가 맞춤형 4주 취업 준비 로드맵을 생성합니다. Supabase Authentication으로 로그인한 사용자만 로드맵과 진행률을 사용자별로 저장하고 다시 불러올 수 있습니다.

## 기술 스택

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express.js
- Supabase Authentication
- Supabase Database
- Gemini API
- Vercel
- GitHub

## 프로젝트 구조

```txt
project-root/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── vercel.json
└── README.md
```

## 실행 방법

1. 의존성을 설치합니다.

```bash
npm install
```

2. `.env.example`을 복사해서 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

Windows PowerShell에서는 다음 명령을 사용할 수 있습니다.

```powershell
Copy-Item .env.example .env
```

3. `.env`에 API 키를 입력합니다.

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. 개발 서버를 실행합니다.

```bash
npm run dev
```

5. 브라우저에서 접속합니다.

```txt
http://localhost:3000
```

## Supabase Authentication 설정

1. Supabase 프로젝트에서 Authentication > Providers로 이동합니다.
2. Email provider를 활성화합니다.
3. 개발 중 빠른 테스트를 원하면 Confirm email 옵션을 끌 수 있습니다.
4. 실제 배포에서는 Confirm email을 켜는 것을 권장합니다.
5. Project Settings > API에서 아래 값을 확인해 `.env`에 입력합니다.

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_ANON_KEY`는 브라우저에서 회원가입/로그인에 사용합니다. `SUPABASE_SERVICE_ROLE_KEY`는 서버에서 로그인 토큰을 검증하고 사용자별 데이터를 저장할 때만 사용합니다. service role key는 절대 프론트엔드에 노출하지 마세요.

## Supabase Database 설정

SQL Editor에서 아래 SQL을 실행합니다.

```sql
create table roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  job_role text not null,
  skills text not null,
  level text not null,
  roadmap_result jsonb not null,
  progress integer not null default 0,
  created_at timestamptz not null default now()
);

create index roadmaps_user_id_created_at_idx
on roadmaps (user_id, created_at desc);
```

이 프로젝트는 Express 서버에서 service role key로 사용자 토큰을 검증한 뒤 `user_id` 조건을 걸어 조회/수정합니다. 그래서 클라이언트가 Supabase Database를 직접 호출하지 않습니다.

## 로그인 사용자 정책

비로그인 사용자:

- AI 로드맵 생성 가능
- 로드맵 저장 불가
- 진행률 서버 저장 불가
- 이전 데이터 불러오기 불가

로그인 사용자:

- 이메일 회원가입
- 이메일 로그인
- 로그아웃
- 로그인 상태 유지
- 사용자별 로드맵 저장
- 사용자별 이전 데이터 불러오기
- 저장된 로드맵의 진행률 저장

## 환경 변수 설명

| 변수명 | 설명 |
| --- | --- |
| `GEMINI_API_KEY` | Gemini API 호출에 사용하는 서버 전용 키 |
| `GEMINI_MODEL` | 선택 사항. 기본값은 `gemini-2.5-flash-lite` |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase Auth 로그인/회원가입에 사용하는 공개 가능한 anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버에서만 사용하는 service role key |

## API 라우트

### `GET /api/config`

브라우저가 Supabase Auth를 초기화할 수 있도록 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 반환합니다. service role key는 반환하지 않습니다.

### `POST /api/generate-roadmap`

입력값을 기반으로 Gemini API를 호출해 로드맵을 생성합니다. 비로그인 사용자도 사용할 수 있습니다.

```json
{
  "company": "삼성전자",
  "jobRole": "백엔드 개발",
  "skills": "Java, Spring Boot, SQL",
  "level": "초급(신입)"
}
```

### `POST /api/save-roadmap`

로그인 사용자만 사용할 수 있습니다. `Authorization: Bearer <access_token>` 헤더가 필요합니다.

### `GET /api/roadmaps`

로그인한 사용자의 저장된 로드맵 목록만 조회합니다.

### `PATCH /api/roadmaps/:id/progress`

로그인한 사용자의 특정 로드맵 진행률만 수정합니다.

## GitHub 업로드 방법

```bash
git init
git add .
git commit -m "Initial 기업둥이 project"
git remote add origin https://github.com/your-name/gieopdoongi.git
git branch -M main
git push -u origin main
```

## Vercel 배포 방법

1. GitHub에 프로젝트를 업로드합니다.
2. Vercel에서 New Project를 선택합니다.
3. GitHub repository를 import합니다.
4. Environment Variables에 아래 값을 추가합니다.

```txt
GEMINI_API_KEY
GEMINI_MODEL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

5. Deploy를 실행합니다.

`vercel.json`이 포함되어 있어서 Vercel은 `server.js`를 Node.js 서버리스 함수로 실행하고, `public` 폴더의 정적 파일도 함께 제공합니다.

## 보안 참고

- Gemini API Key는 `public/script.js`에 작성하지 않습니다.
- Supabase service role key는 서버 환경 변수로만 사용합니다.
- Supabase anon key는 로그인/회원가입용 공개 키이며, service role key와 다릅니다.
- `.env`는 `.gitignore`에 포함되어 GitHub에 업로드되지 않습니다.
