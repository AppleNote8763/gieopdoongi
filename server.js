require("dotenv").config();

const path = require("path");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

function validateGoalInput(body) {
  const required = ["company", "jobRole", "level"];
  const missing = required.filter((key) => !String(body[key] || "").trim());

  if (missing.length > 0) {
    return `필수 입력값이 비어 있습니다: ${missing.join(", ")}`;
  }

  return null;
}

async function requireAuth(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(500).json({ message: "Supabase 서버 환경 변수가 설정되지 않았습니다." });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: "로그인 세션이 유효하지 않습니다." });
  }

  req.user = data.user;
  next();
}

function getFallbackRoadmap({ company, jobRole, skills, level }) {
  const currentSkills = skills || "현재 보유 역량";

  return {
    coreSkills: [
      `${jobRole} 직무 핵심 기술`,
      "문제 해결력과 자료 구조 이해",
      "Git, 배포, 협업 도구 사용 경험",
      `${company} 서비스와 채용 공고 기반 도메인 이해`
    ],
    gaps: [
      `${currentSkills}를 실무 결과물로 보여주는 포트폴리오 보강`,
      "프로젝트 의사결정 과정을 면접에서 설명하는 연습",
      "채용 공고 요구 역량과 현재 역량 사이의 우선순위 정리"
    ],
    priorities: [
      "채용 공고 분석",
      "핵심 기술 심화 학습",
      "직무형 포트폴리오 프로젝트 제작",
      "이력서와 README 정리",
      "기술 면접 답변 연습"
    ],
    weeks: [
      {
        week: 1,
        title: "목표 분석과 기초 보강",
        tasks: [
          `${company} ${jobRole} 채용 공고 3개 분석`,
          "요구 기술을 필수, 우대, 보완으로 분류",
          "현재 기술과 부족한 기술 비교표 작성"
        ]
      },
      {
        week: 2,
        title: "핵심 기술 심화",
        tasks: [
          "가장 중요한 기술 2개 집중 학습",
          "학습 내용을 작은 예제로 구현",
          "문제 해결 과정을 기록"
        ]
      },
      {
        week: 3,
        title: "포트폴리오 프로젝트 제작",
        tasks: [
          "직무와 연결되는 미니 프로젝트 완성",
          "README에 문제, 해결 방법, 결과 정리",
          "GitHub 저장소 정리"
        ]
      },
      {
        week: 4,
        title: "지원 준비와 면접 연습",
        tasks: [
          "이력서와 포트폴리오를 목표 기업 기준으로 수정",
          "프로젝트 기반 기술 면접 답변 준비",
          "지원 일정과 회고 체크리스트 작성"
        ]
      }
    ],
    portfolioDirection:
      `${company}의 ${jobRole} 업무와 연결되는 문제를 정하고, ${currentSkills}를 활용해 작동 결과와 의사결정 과정을 함께 보여주세요.`,
    interviewItems: [
      "자기소개와 지원 동기",
      "핵심 기술 개념 설명",
      "프로젝트 문제 해결 과정",
      "협업 경험과 피드백 반영 사례",
      "목표 기업 서비스 개선 아이디어"
    ],
    firstAction:
      `오늘 ${company}의 ${jobRole} 채용 공고 1개를 찾아 필수 기술 5개를 정리하세요.`,
    checklist: [
      {
        id: "task-1",
        title: "채용 공고 분석",
        description: `${company} ${jobRole} 공고에서 필수 역량과 우대 역량 분리`,
        duration: "1일",
        done: false
      },
      {
        id: "task-2",
        title: "핵심 기술 학습",
        description: "가장 중요한 기술 2개를 예제와 함께 학습",
        duration: "1주",
        done: false
      },
      {
        id: "task-3",
        title: "포트폴리오 프로젝트",
        description: "직무와 연결되는 작은 프로젝트 완성",
        duration: "2주",
        done: false
      },
      {
        id: "task-4",
        title: "README와 이력서 정리",
        description: "프로젝트 배경, 역할, 결과를 문서화",
        duration: "3일",
        done: false
      },
      {
        id: "task-5",
        title: "면접 답변 연습",
        description: "기술 질문과 프로젝트 설명을 말로 연습",
        duration: "3일",
        done: false
      }
    ],
    estimatedPeriod: level === "초급(신입)" ? "4주" : "3~4주"
  };
}

function normalizeRoadmap(parsed, input) {
  const fallback = getFallbackRoadmap(input);

  return {
    coreSkills: Array.isArray(parsed.coreSkills) ? parsed.coreSkills : fallback.coreSkills,
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : fallback.gaps,
    priorities: Array.isArray(parsed.priorities) ? parsed.priorities : fallback.priorities,
    weeks: Array.isArray(parsed.weeks) ? parsed.weeks : fallback.weeks,
    portfolioDirection: parsed.portfolioDirection || fallback.portfolioDirection,
    interviewItems: Array.isArray(parsed.interviewItems)
      ? parsed.interviewItems
      : fallback.interviewItems,
    firstAction: parsed.firstAction || fallback.firstAction,
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist : fallback.checklist,
    estimatedPeriod: parsed.estimatedPeriod || fallback.estimatedPeriod
  };
}

function parseGeminiJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw error;
    }

    return JSON.parse(jsonMatch[0]);
  }
}

function getFallbackRoles(company) {
  const value = company.toLowerCase();

  if (/(hyundai|kia|automotive|mobility|motor|vehicle|car|ev|현대자동차|현대차|기아|자동차|모빌리티|전기차|자율주행|차량)/i.test(value)) {
    return [
      "차량 제어 소프트웨어 개발",
      "자율주행/ADAS 엔지니어",
      "전동화 시스템 개발",
      "커넥티드카 서비스 개발",
      "차량 데이터 분석",
      "임베디드 소프트웨어 개발",
      "생산기술/스마트팩토리",
      "품질보증/차량 검증",
      "모빌리티 서비스 기획"
    ];
  }

  if (/(sound|audio|music|yamaha|shure|bose|sony|음향|오디오|악기|레코딩|사운드)/i.test(value)) {
    return [
      "오디오 DSP 엔지니어",
      "음향 하드웨어 엔지니어",
      "임베디드 오디오 개발자",
      "오디오 소프트웨어 개발자",
      "음향 제품 기획",
      "사운드 디자이너",
      "음향 시스템 엔지니어",
      "레코딩 장비 QA 엔지니어",
      "기술 영업/세일즈 엔지니어"
    ];
  }

  if (/(coupang|쿠팡|배달|물류|커머스|commerce|market)/i.test(value)) {
    return [
      "백엔드 개발",
      "물류 시스템 개발",
      "데이터 분석",
      "머신러닝 엔지니어",
      "프로덕트 매니저",
      "풀필먼트 운영 기획",
      "프론트엔드 개발",
      "보안 엔지니어"
    ];
  }

  if (/(game|게임|nexon|netmarble|ncsoft|krafton|넥슨|넷마블|크래프톤)/i.test(value)) {
    return [
      "게임 클라이언트 개발",
      "게임 서버 개발",
      "게임 기획",
      "레벨 디자이너",
      "QA 테스터",
      "데이터 분석",
      "라이브 운영 PM",
      "3D 아티스트"
    ];
  }

  return [
    "백엔드 개발",
    "프론트엔드 개발",
    "풀스택 개발",
    "데이터 분석",
    "AI/ML 엔지니어",
    "PM/서비스 기획",
    "UI/UX 디자이너",
    "QA 엔지니어"
  ];
}

function getFallbackSkills(company, jobRole) {
  const value = `${company} ${jobRole}`.toLowerCase();

  if (/(hyundai|kia|automotive|mobility|motor|vehicle|car|ev|현대자동차|현대차|기아|자동차|모빌리티|전기차|자율주행|차량|adas|전동화)/i.test(value)) {
    return [
      "차량 제어 기초",
      "임베디드 C/C++",
      "CAN 통신 이해",
      "센서 데이터 처리",
      "전기전자 회로 기초",
      "MATLAB/Simulink",
      "Python 데이터 분석",
      "품질 문제 해결 역량",
      "자동차 산업 도메인 이해"
    ];
  }

  if (/(data|데이터|분석|analytics|scientist)/i.test(value)) {
    return [
      "SQL",
      "Python",
      "통계 기초",
      "데이터 시각화",
      "대시보드 작성",
      "A/B 테스트 이해",
      "비즈니스 문제 정의",
      "데이터 전처리"
    ];
  }

  if (/(backend|server|백엔드|서버)/i.test(value)) {
    return [
      "HTTP/API 설계",
      "Node.js 또는 Java/Spring",
      "SQL",
      "데이터베이스 설계",
      "인증/인가",
      "Git 협업",
      "배포와 로그 확인",
      "테스트 코드 작성"
    ];
  }

  if (/(frontend|프론트엔드|ui|ux)/i.test(value)) {
    return [
      "HTML/CSS",
      "JavaScript",
      "반응형 UI",
      "접근성 기초",
      "브라우저 디버깅",
      "API 연동",
      "상태 관리",
      "사용자 흐름 설계"
    ];
  }

  return [
    "문제 해결력",
    "Git 협업",
    "기초 프로그래밍",
    "데이터 이해",
    "문서화 역량",
    "포트폴리오 프로젝트 경험",
    "면접 답변 정리",
    "목표 산업 이해"
  ];
}

function normalizeRoles(parsed, company) {
  const roles = Array.isArray(parsed.roles) ? parsed.roles : [];
  const cleanRoles = roles
    .map((role) => String(role || "").trim())
    .filter(Boolean)
    .slice(0, 10);

  const fallbackRoles = getFallbackRoles(company);
  const genericFallbackRoles = getFallbackRoles("");
  const hasIndustryFallback = fallbackRoles.join("|") !== genericFallbackRoles.join("|");

  if (cleanRoles.length === 0) {
    return fallbackRoles;
  }

  if (hasIndustryFallback) {
    return Array.from(new Set([...fallbackRoles.slice(0, 7), ...cleanRoles])).slice(0, 10);
  }

  return cleanRoles;
}

function normalizeSkills(parsed, company, jobRole) {
  const skills = Array.isArray(parsed.skills) ? parsed.skills : [];
  const cleanSkills = skills
    .map((skill) => String(skill || "").trim())
    .filter(Boolean)
    .slice(0, 12);

  return cleanSkills.length > 0 ? cleanSkills : getFallbackSkills(company, jobRole);
}

async function generateRoleSuggestions(company) {
  if (!geminiApiKey) {
    return getFallbackRoles(company);
  }

  const prompt = `
기업명 또는 산업 키워드: ${company}

이 기업 또는 업종에서 취업 준비자가 지원할 만한 직군/직무를 한국어로 추천해줘.
실시간 채용 공고처럼 단정하지 말고, 기업과 산업 특성을 바탕으로 가능성 높은 직군을 추천해줘.
너무 일반적인 직무만 나열하지 말고 업종 특화 직무를 우선 포함해줘.

반드시 아래 JSON만 반환해줘.
{
  "roles": ["직무명 1", "직무명 2", "직무명 3"]
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "너는 기업과 산업을 분석해 취업 가능한 직군을 추천하는 커리어 리서처야."
            }
          ]
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    if (response.status === 429 || response.status === 503) {
      return getFallbackRoles(company);
    }

    const detail = await response.text();
    throw new Error(`Gemini API 오류: ${detail}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = parseGeminiJson(content);

  return normalizeRoles(parsed, company);
}

async function generateSkillSuggestions(company, jobRole) {
  if (!geminiApiKey) {
    return getFallbackSkills(company, jobRole);
  }

  const prompt = `
목표 기업: ${company}
희망 직무: ${jobRole}

이 기업과 직무를 준비하는 사람이 현재 보유 여부를 체크해볼 만한 핵심 역량/기술을 한국어로 추천해줘.
너무 추상적인 태도보다 체크박스로 고를 수 있는 구체적인 기술, 도메인 지식, 업무 역량을 우선해줘.
실시간 채용 공고처럼 단정하지 말고, 기업과 산업 특성을 바탕으로 가능성 높은 역량을 추천해줘.

반드시 아래 JSON만 반환해줘.
{
  "skills": ["역량 1", "역량 2", "역량 3"]
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "너는 기업, 산업, 직무를 바탕으로 취업 준비자가 보유 역량을 점검할 체크리스트를 만드는 커리어 리서처야."
            }
          ]
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    if (response.status === 429 || response.status === 503) {
      return getFallbackSkills(company, jobRole);
    }

    const detail = await response.text();
    throw new Error(`Gemini API 오류: ${detail}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = parseGeminiJson(content);

  return normalizeSkills(parsed, company, jobRole);
}

async function generateWithGemini(input) {
  if (!geminiApiKey) {
    return getFallbackRoadmap(input);
  }

  const prompt = `
아래 입력값을 바탕으로 한국어 취업 준비 로드맵을 JSON으로만 생성해줘.

목표 기업: ${input.company}
희망 직무: ${input.jobRole}
현재 보유 기술/역량: ${input.skills || "입력하지 않음"}
경력 수준: ${input.level}

현재 보유 기술/역량이 비어 있으면, 해당 직무를 처음 준비하는 사람으로 보고 기초 점검부터 시작하는 로드맵을 만들어줘.

반드시 다음 JSON 구조를 지켜줘.
{
  "coreSkills": ["필요한 핵심 기술"],
  "gaps": ["부족한 역량"],
  "priorities": ["학습 우선순위"],
  "weeks": [
    {"week": 1, "title": "주차 제목", "tasks": ["할 일"]},
    {"week": 2, "title": "주차 제목", "tasks": ["할 일"]},
    {"week": 3, "title": "주차 제목", "tasks": ["할 일"]},
    {"week": 4, "title": "주차 제목", "tasks": ["할 일"]}
  ],
  "portfolioDirection": "포트폴리오 준비 방향",
  "interviewItems": ["면접 준비 항목"],
  "firstAction": "오늘 시작할 첫 번째 행동",
  "checklist": [
    {"id": "task-1", "title": "작업명", "description": "설명", "duration": "예상 기간", "done": false}
  ],
  "estimatedPeriod": "전체 예상 준비 기간"
}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "너는 채용 공고와 직무 역량을 분석해 초보자도 실행 가능한 취업 준비 계획을 만드는 커리어 코치야."
            }
          ]
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text();

    if (response.status === 429 || response.status === 503) {
      return getFallbackRoadmap(input);
    }

    throw new Error(`Gemini API 오류: ${detail}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = parseGeminiJson(content);

  return normalizeRoadmap(parsed, input);
}

app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: supabaseUrl || "",
    supabaseAnonKey: supabaseAnonKey || ""
  });
});

app.post("/api/generate-roadmap", async (req, res) => {
  const error = validateGoalInput(req.body);
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const input = {
      company: req.body.company.trim(),
      jobRole: req.body.jobRole.trim(),
      skills: String(req.body.skills || "").trim(),
      level: req.body.level.trim()
    };
    const roadmap = await generateWithGemini(input);

    return res.json({ roadmap });
  } catch (err) {
    return res.status(500).json({
      message: "로드맵 생성 중 오류가 발생했습니다.",
      detail: err.message
    });
  }
});

app.post("/api/suggest-roles", async (req, res) => {
  const company = String(req.body.company || "").trim();

  if (!company) {
    return res.status(400).json({ message: "목표 기업을 먼저 입력해주세요." });
  }

  try {
    const roles = await generateRoleSuggestions(company);
    return res.json({ roles });
  } catch (err) {
    return res.status(500).json({
      message: "추천 직무를 불러오는 중 오류가 발생했습니다.",
      detail: err.message
    });
  }
});

app.post("/api/suggest-skills", async (req, res) => {
  const company = String(req.body.company || "").trim();
  const jobRole = String(req.body.jobRole || "").trim();

  if (!company || !jobRole) {
    return res.status(400).json({ message: "목표 기업과 희망 직무를 먼저 입력해주세요." });
  }

  try {
    const skills = await generateSkillSuggestions(company, jobRole);
    return res.json({ skills });
  } catch (err) {
    return res.status(500).json({
      message: "추천 역량을 불러오는 중 오류가 발생했습니다.",
      detail: err.message
    });
  }
});

app.post("/api/save-roadmap", requireAuth, async (req, res) => {
  const { company, jobRole, skills, level, roadmap, progress = 0 } = req.body;
  const error = validateGoalInput({ company, jobRole, skills, level });

  if (error || !roadmap) {
    return res.status(400).json({ message: error || "로드맵 데이터가 없습니다." });
  }

  const { data, error: dbError } = await supabaseAdmin
    .from("roadmaps")
    .insert({
      user_id: req.user.id,
      company,
      job_role: jobRole,
      skills: String(skills || ""),
      level,
      roadmap_result: roadmap,
      progress
    })
    .select()
    .single();

  if (dbError) {
    return res.status(500).json({ message: "로드맵 저장 실패", detail: dbError.message });
  }

  return res.status(201).json({ roadmap: data });
});

app.get("/api/roadmaps", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("roadmaps")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: "로드맵 조회 실패", detail: error.message });
  }

  return res.json({ roadmaps: data });
});

app.patch("/api/roadmaps/:id/progress", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { progress, roadmap } = req.body;

  const { data, error } = await supabaseAdmin
    .from("roadmaps")
    .update({ progress, roadmap_result: roadmap })
    .eq("id", id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: "진행률 저장 실패", detail: error.message });
  }

  return res.json({ roadmap: data });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`기업둥이 server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
