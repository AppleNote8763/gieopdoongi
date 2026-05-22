# 기업뚱이

AI 기반 취업 준비 로드맵 서비스입니다. 목표 기업과 희망 직무를 입력하면 필요한 역량, 준비 일정, 체크리스트를 생성하고 진행 상황을 관리할 수 있습니다.

## 주요 기능

- 목표 기업 기반 직무 추천
- 직무 기반 역량 추천 및 직접 입력
- 준비 기간 선택: 1개월, 3개월, 6개월, 1년, 직접 입력, 달력 선택
- 목표 자격증 입력 및 직무별 자격증 추천
- Gemini API 기반 맞춤 취업 준비 로드맵 생성
- 고용24 채용공고 연동 및 요구 역량 반영
- 주요 자격증 시험 일정 안내
- 체크리스트 완료 처리, 우선순위 변경, 예상 기간 수정
- 학습 진행률과 시간 진행률 대시보드
- 로드맵 다시 최적화
- 로그인 사용자별 로드맵 저장, 불러오기, 삭제

## 기술 스택

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express
- Auth/DB: Supabase
- AI: Gemini API
- 채용공고: 고용24 OpenAPI
- 배포: Vercel

## 실행

```bash
npm install
npm run dev
```

접속 URL:

```txt
http://localhost:3000
```

환경 변수는 `.env.example`을 참고해 `.env`에 설정합니다.

```env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WORK24_API_KEY=
```

`WORK24_API_KEY`가 없어도 로드맵 생성과 저장 기능은 사용할 수 있으며, 채용공고 영역만 비어 있을 수 있습니다.
