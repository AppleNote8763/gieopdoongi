# 기업뚱이 인수인계

## 최신 작업 메모

- 저장소: `https://github.com/AppleNote8763/gieopdoongi.git`
- 배포: Vercel, `main` 브랜치 자동 배포
- 앱 표시명: 기업뚱이
- 최신 원격 커밋: `62804a9 Update job posting empty state message and remove supabase hint`
- 현재 로컬에는 아직 커밋하지 않은 변경이 있다. 다음 채팅에서는 반드시 `git status --short --branch`로 확인하고 이어간다.

### 최근 로컬 변경 메모 (2026-05-22, 미커밋)

- 목표 설정 페이지의 **이전 데이터(My Roadmaps)** 카드에 저장된 로드맵 삭제 기능을 추가했다.
  - `DELETE /api/roadmaps/:id` 서버 API 추가
  - 로그인 사용자 본인 소유 로드맵만 삭제하도록 `id` + `user_id` 조건 적용
  - 삭제 버튼과 로드맵 열기 영역을 분리
  - 삭제 버튼은 기본 회색 톤, hover 시에만 약한 경고 색이 보이도록 디자인 조정
- 진행 관리 페이지의 **로드맵 다시 최적화** 폼을 다듬었다.
  - `달력에서 목표일 선택` 선택 시 `기간 선택` 영역이 카드 안에서 밀리거나 겹쳐 보이지 않도록 여백/배치 조정
- 진행 관리 페이지의 **학습 체크리스트 체크 반응 지연**을 개선했다.
  - 체크/해제 즉시 UI와 진행률을 먼저 갱신
  - Supabase 저장은 350ms debounce 후 자동 저장
  - 저장 중 추가 변경이 생기면 저장 완료 후 최신 상태를 다시 저장하는 큐 방식 적용
- 문서 정리:
  - `WORK_HISTORY.md` 신규 작성: 최근 며칠간 만든 기능과 수정 흐름을 코드 설명 없이 작업 히스토리 중심으로 정리
  - `README.md`는 상세 개발 문서가 아니라 주요 기능 소개 위주로 간략화
- 검증:
  - `node --check server.js` 통과
  - `node --check public/script.js` 통과
  - 로컬 `/` 응답 200 확인

### 사용자 Git 운영 선호

- 사용자가 명시적으로 "깃에 올려줘", "푸시해줘", "커밋/푸시해줘"라고 요청할 때만 GitHub에 올린다.
- 자동 커밋/푸시는 하지 않는다.

### 더미 테스트 계정

- 이메일: `111@111.com`
- 비밀번호: `123123`
- Supabase Auth Admin API로 `email_confirm: true` 상태 생성

### 로컬 서버

- `npm run dev`로 실행 확인
- 접속 URL: `http://127.0.0.1:3000/`

---

## 프로젝트 개요

- 프로젝트명: 기업뚱이
- 저장소: `https://github.com/AppleNote8763/gieopdoongi.git`
- 로컬 경로: `C:\Users\user\Desktop\RoadUp AI`
- 실행 방식: Node.js + Express 서버가 `public` 정적 파일을 서빙
- 프론트엔드: HTML, CSS, Vanilla JavaScript
- 백엔드: Node.js, Express
- DB/Auth: Supabase Authentication + Supabase Database
- AI: Gemini API (`gemini-2.5-flash` 모델 사용)
- 채용공고: 고용24 OpenAPI 연동
- 배포: Vercel (`main` 브랜치 자동 배포)

---

## 현재 구현된 기능 (코드 실측 기준)

### Step 1 — 목표 설정

- **목표 기업 입력** + **직무 찾기** 버튼
  - Gemini가 기업/업종 기반 직무 추천
  - 자동차/모빌리티, 게임, 커머스/물류, 오디오 등 산업별 fallback 내장
  - Gemini 과부하(429/503) 또는 timeout 시 fallback 자동 반환
- **희망 직무** 드롭다운 + 직접 입력(customJobRole) 동시 지원
  - 직접 입력값이 있으면 select 값보다 우선 사용
- **역량 찾기** 버튼
  - Gemini가 기업+직무 기반 역량 추천 → 체크박스로 선택 가능
  - 추천 목록에 없는 역량은 직접 입력 가능
  - 체크박스+직접 입력 모두 비어 있어도 AI 분석 가능
- **희망 준비 기간** 선택 (필수)
  - 1개월 / 3개월 / 6개월 / 1년
  - 텍스트 직접 입력
  - 달력에서 **시작 날짜 + 목표 날짜** 선택 (date picker 자동 열림, min 동기화)
- **목표 자격증** 직접 입력 + **자격증 추천** 버튼 (직무별 로컬 매핑 추천)
- **경력 수준** 라디오 선택 (초급/중급/고급)
- AI 분석 시작 버튼: 필수 항목(기업·직무·경력·준비기간) 미충족 시 비활성화

### Step 2 — 로드맵 생성

- Gemini로 맞춤 로드맵 생성
  - 핵심 역량, 보완할 역량, 우선순위, 면접 준비, 포트폴리오 방향, 주차별 실행 계획, 체크리스트
  - 준비 기간이 비어 있으면 직무/역량/경력 난이도 기반으로 기간을 AI가 자동 산정
  - 현재 보유 기술이 없으면 초보자 관점의 기초 다지기 주차 포함
- **고용24 채용공고 자동 연동**
  - 로드맵 생성 시 실제 채용공고 최대 8개 분석
  - coreSkills, priorities, checklist에 공고 요구역량 반영
  - 캐시 TTL 12시간 (같은 조건이면 캐시 반환)
- **자격증 시험 일정 자동 반영**
  - 서버에 하드코딩된 일정 데이터: 정보처리기사, SQLD, ADsP, 컴퓨터활용능력 1급
  - 로드맵/직무와 매칭되는 자격증이 있으면 `certSchedules` 응답에 포함
- 체크리스트 기간 자동 분산 (전체 기간/항목 수 기준, 난이도 가중치 적용)
- 다시 생성 / 로드맵 저장 버튼
- 진행 관리로 이동 버튼 (클릭 시 미저장 로드맵은 자동 저장)

### Step 3 — 진행 관리

- **대시보드 헤더**: 직무명 + 기간 요약 (YYYY.MM ~ YYYY.MM + 선택한 기간 텍스트)
- **D-Day 배너**: 목표일까지 남은 일수, 일정 지연 시 주황색 경고
- **학습 진행률**: 완료된 체크리스트 수 / 전체 (%)
- **시간 진행률**: 경과일 / 총 일수 (%)
- **최신 채용공고 위젯**: 고용24 연동, 최대 5개 표시, D-Day 표기, urgent 스타일링
- **자격증 시험 일정 위젯**: 해당 자격증이 있을 때만 표시
- **체크리스트**:
  - 체크박스로 완료 처리 (항목 전체 클릭 영역)
  - 드래그 핸들로 우선순위 순서 변경 (drop 즉시 저장)
  - 예상 기간 인라인 직접 수정 (`durationEdited` 플래그로 재분산 방지)
  - 완료 항목은 `done: true` 스타일로 구분
- **나만의 항목 추가**: 제목(필수) + 설명 + 우선순위(상/중/하) + 예상 기간
- **로드맵 다시 최적화** 버튼
  - 새로운 준비 기간 선택 (1개월/3개월/6개월/1년/직접입력/달력 선택)
  - 기존에 완료된 항목(`done: true`)을 체크리스트 앞에 보존한 채로 재생성
  - 재생성 완료 후 저장된 로드맵이면 자동으로 서버 저장
- **이전 데이터 (My Roadmaps)**: 저장된 로드맵 목록, 클릭 시 진행 관리로 바로 이동
- 저장된 로드맵 삭제 가능 (삭제 버튼 클릭 → 확인창 → 본인 소유 로드맵만 삭제)

### 인증 (Supabase Auth)

- 이메일 로그인 / 회원가입 / 로그아웃
- 로그인 유지 (세션 자동 복원)
- 비로그인도 목표 설정 / 로드맵 생성 가능
- 저장 / 진행 관리 / 진행률 서버 저장은 로그인 필요
- 로그아웃 시 상태 완전 초기화 (localStorage, sessionStorage 포함)

---

## 서버 API 엔드포인트

| 엔드포인트 | 메서드 | 인증 | 설명 |
|---|---|---|---|
| `/api/config` | GET | 불필요 | Supabase URL/anon key 제공 |
| `/api/suggest-roles` | POST | 불필요 | 기업 기반 직무 추천 (Gemini) |
| `/api/suggest-skills` | POST | 불필요 | 직무 기반 역량 추천 (Gemini) |
| `/api/job-postings` | POST | 불필요 | 고용24 채용공고 조회 |
| `/api/generate-roadmap` | POST | 불필요 | AI 로드맵 생성 |
| `/api/save-roadmap` | POST | 필요 | 로드맵 저장 |
| `/api/roadmaps` | GET | 필요 | 저장된 로드맵 목록 조회 |
| `/api/roadmaps/:id/progress` | PATCH | 필요 | 진행률 + 체크리스트 저장 |
| `/api/roadmaps/:id` | DELETE | 필요 | 저장된 로드맵 삭제 |

---

## 중요한 파일

```txt
public/index.html   - 전체 UI 구조 (SPA, 패널 전환 방식)
public/style.css    - 스타일
public/script.js    - 클라이언트 로직 (1743줄)
server.js           - Express 서버 + 모든 API (1215줄)
supabase/schema.sql - DB 테이블 정의
.env.example        - 환경 변수 예시
WORK_HISTORY.md     - 최근 작업 흐름 요약 문서
.gitignore
vercel.json
package.json
```

---

## 환경 변수

실제 값은 `.env`에 들어 있음. `.env`는 Git에 올리지 않음.

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite   # 실제 서버는 gemini-2.5-flash 하드코딩
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WORK24_API_KEY=                       # 고용24 API 키 (없으면 채용공고만 비어 있음)
```

주의:
- `.env.example`에는 실제 키를 넣지 않는다.
- `.env`는 `.gitignore`에 포함되어 있다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 키다.
- `WORKNET_API_KEY`도 읽음 (이전 명칭 호환).
- Vercel 배포 시 위 환경 변수를 Vercel Project Settings에 직접 등록해야 한다.

---

## Supabase 상태

Supabase 프로젝트명: 기업뚱이

직접 만든 DB 테이블:

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

SQL 파일 위치: `supabase/schema.sql`

Supabase Auth:
- Email provider enabled
- 개발 테스트용으로 `Confirm email`은 OFF 권장
- 로컬 Site URL: `http://localhost:3000`
- Vercel 배포 후에는 Supabase Authentication > URL Configuration에서 Site URL과 Redirect URLs에 Vercel 배포 URL을 추가해야 한다.

---

## 로컬 실행

```bash
npm install
npm run dev
```

접속: `http://localhost:3000` 또는 `http://127.0.0.1:3000`

`.env` 변경 후에는 서버를 반드시 재시작해야 한다.

문법 검사:

```bash
node --check server.js
node --check public/script.js
```

---

## 배포 (Vercel)

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
- Environment Variables에 실제 값 등록 필요

Vercel에서 해야 할 일:
1. GitHub 저장소 `AppleNote8763/gieopdoongi` import
2. 환경 변수 등록 (`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WORK24_API_KEY`)
3. Deploy
4. 배포 URL을 Supabase Auth URL Configuration에 추가
5. 배포 URL에서 회원가입/로그인/로드맵 생성/저장 테스트

Vercel 경고 참고:

```txt
WARNING! Due to `builds` existing in your configuration file, the Build and Development Settings defined in your Project Settings will not apply.
```

`vercel.json`에 `builds`가 있어서 Vercel 대시보드의 설정이 무시된다는 의미이며, 배포 상태가 `Ready`면 정상이다.

---

## 알려진 이슈 이력

| 이슈 | 원인 | 조치 | 커밋 |
|---|---|---|---|
| 직무 찾기 오류 (<!DOCTYPE... is not valid JSON) | 기존 서버가 살아있어 Express fallback HTML 반환 | 서버 재실행 + non-JSON 응답 안전 처리 | `8e547ac` |
| Gemini 503 high demand | 무료 모델 과부하 | 429/503 시 fallback 반환 | `a52ffff` |
| 현대자동차 직무 추천이 일반적 | Gemini가 IT 직무만 반환 | 자동차·모빌리티 키워드 fallback + 산업 특화 직무 우선 배치 | `e8c6e99` |
| 체크리스트 우선순위 변경 불가 | 미구현 | 드래그 핸들 추가, drop 시 배열 재정렬 및 저장 | `1fc66b5` |
| 보유 역량 입력이 필수 | 서버 검증 | skills 서버 필수 검증 제외, 빈 역량이면 초보자 기준 로드맵 생성 | `1fc66b5` |
| selectedSkills is not defined | collectGoal()에서 선언 누락 | getSelectedSkills() 추출 후 호출 | 별도 커밋 |
| 재조정 폼 달력 선택 시 영역 미표시 | hidden 속성/class/display 불일치 | setElementHidden() 추가로 세 가지 동기화 | `Fix recalc date selector visibility` |
| 이전 데이터 삭제 불가 | 삭제 UI/API 없음 | 삭제 버튼 + 본인 소유 로드맵 삭제 API 추가 | 미커밋 |
| 체크리스트 체크 반응 지연 | 저장 완료 후 화면 갱신 | 즉시 UI 갱신 + debounce 자동 저장 큐 적용 | 미커밋 |
| 재조정 폼 기간 선택 레이아웃 어긋남 | 달력 선택 영역 여백/배치 부족 | 재조정 폼 내부 여백과 날짜 입력 배치 조정 | 미커밋 |

---

## 새 채팅에서 이어가는 방법

```txt
이 프로젝트는 C:\Users\user\Desktop\RoadUp AI 에 있고, HANDOFF.md를 먼저 읽고 이어서 작업해줘.
```

새 채팅에서 먼저 해야 할 일:
1. `HANDOFF.md` 읽기
2. `git status --short --branch` 확인
3. 현재 미커밋 변경을 사용자가 만든 변경으로 보고 함부로 되돌리지 않기
4. 필요하면 `server.js`, `public/script.js`, `public/style.css`, `public/index.html` 확인
5. 사용자가 요청한 수정만 진행
6. 수정 후 `node --check server.js`, `node --check public/script.js` 문법 검사
7. 배포 반영이 필요하면 사용자가 명시적으로 요청했을 때만 커밋 후 `git push`

---

## 후속 작업 후보

- Vercel 배포 URL 확인 및 Supabase Auth URL 등록
- 실제 브라우저에서 회원가입/로그인/로드맵 저장/불러오기 E2E 테스트
- 모바일에서 역량 체크박스와 체크리스트 드래그 UX 점검
- 자격증 시험 일정 데이터 자동 갱신 (현재 서버 하드코딩)
- 고용24 API 키 없을 때 UI 안내 문구 개선
