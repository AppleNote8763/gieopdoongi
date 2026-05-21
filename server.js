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
const geminiModel = "gemini-2.5-flash";
const work24ApiKey = process.env.WORK24_API_KEY || process.env.WORKNET_API_KEY;
const WORK24_LIST_URL =
  "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do";
const JOB_POSTING_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const jobPostingCache = new Map();

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const CERT_SCHEDULES = {
  "정보처리기사": { 접수일: "2026-06-10", 시험일: "2026-07-20", 발표일: "2026-08-15" },
  "SQLD": { 접수일: "2026-08-01", 시험일: "2026-09-05", 발표일: "2026-09-25" },
  "ADsP": { 접수일: "2026-07-15", 시험일: "2026-08-22", 발표일: "2026-09-10" },
  "컴퓨터활용능력 1급": { 접수일: "상시", 시험일: "상시 (매주 월~금)", 발표일: "시험 후 2주 뒤" }
};

const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getXmlTag(xml, tagName) {
  const match = String(xml || "").match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function getXmlBlocks(xml, tagName) {
  return Array.from(
    String(xml || "").matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi"))
  ).map((match) => match[1]);
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  const digits = text.replace(/\D/g, "");

  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  if (text.includes("채용시")) {
    return "";
  }

  return text;
}

function calculateDDay(closeDate) {
  const normalized = normalizeDate(closeDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadline = new Date(`${normalized}T00:00:00`);
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractRequirements(text) {
  const source = String(text || "").toLowerCase();
  const skills = [
    "JavaScript",
    "TypeScript",
    "React",
    "Vue",
    "Node.js",
    "Java",
    "Spring",
    "Python",
    "Django",
    "SQL",
    "MySQL",
    "PostgreSQL",
    "AWS",
    "Docker",
    "Kubernetes",
    "Git",
    "Figma",
    "QA",
    "테스트",
    "자동화",
    "데이터 분석",
    "머신러닝"
  ];
  const certs = ["정보처리기사", "SQLD", "ADsP", "AWS", "컴퓨터활용능력 1급"];

  const requiredSkills = skills.filter((skill) => source.includes(skill.toLowerCase()));
  const certifications = certs.filter((cert) => source.includes(cert.toLowerCase()));

  return {
    requiredSkills: uniq(requiredSkills),
    preferredRequirements: source.includes("우대") ? ["공고 내 우대 조건 확인 필요"] : [],
    certifications: uniq(certifications)
  };
}

function normalizeJobPosting(item, goal = {}) {
  const sourceText = [
    item.title,
    item.company,
    item.industry,
    goal.jobRole,
    goal.skills,
    goal.certifications
  ].join(" ");
  const requirements = extractRequirements(sourceText);
  const closeDate = normalizeDate(item.closeDate);

  return {
    id: item.id || item.wantedAuthNo || `${item.company}-${item.title}`,
    company: item.company || "회사명 미상",
    title: item.title || "채용공고",
    jobRole: goal.jobRole || item.jobsCode || "",
    region: item.region || "",
    career: item.career || "",
    requiredSkills: requirements.requiredSkills,
    preferredRequirements: requirements.preferredRequirements,
    certifications: requirements.certifications,
    closeDate,
    dDay: calculateDDay(closeDate),
    url: item.url || "",
    source: "고용24"
  };
}

function parseWork24ListXml(xml, goal) {
  const wantedBlocks = getXmlBlocks(xml, "wanted");

  return {
    total: Number(getXmlTag(xml, "total") || wantedBlocks.length || 0),
    postings: wantedBlocks.map((block) =>
      normalizeJobPosting(
        {
          id: getXmlTag(block, "wantedAuthNo"),
          company: getXmlTag(block, "company"),
          industry: getXmlTag(block, "indTpNm"),
          title: getXmlTag(block, "title"),
          region: getXmlTag(block, "region"),
          career: getXmlTag(block, "career"),
          closeDate: getXmlTag(block, "closeDt"),
          url: getXmlTag(block, "wantedInfoUrl") || getXmlTag(block, "wantedMobileInfoUrl"),
          jobsCode: getXmlTag(block, "jobsCd")
        },
        goal
      )
    )
  };
}

function getJobPostingCacheKey(goal) {
  return [goal.company, goal.jobRole, goal.skills, goal.certifications]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("|");
}

function scorePosting(posting, goal) {
  const company = String(goal.company || "").toLowerCase();
  const role = String(goal.jobRole || "").toLowerCase();
  const title = `${posting.company} ${posting.title} ${posting.jobRole}`.toLowerCase();
  let score = 0;

  if (company && title.includes(company)) score += 5;
  role.split(/[,\s/]+/).filter(Boolean).forEach((token) => {
    if (title.includes(token)) score += 2;
  });
  score += posting.requiredSkills.length;
  if (posting.dDay !== null && posting.dDay >= 0) score += Math.max(0, 3 - Math.floor(posting.dDay / 14));

  return score;
}

async function fetchWork24JobPostings(goal, options = {}) {
  const cacheKey = getJobPostingCacheKey(goal);
  const cached = jobPostingCache.get(cacheKey);
  const now = Date.now();

  if (!options.forceRefresh && cached && now - cached.updatedAt < JOB_POSTING_CACHE_TTL_MS) {
    return { ...cached.data, cached: true, updatedAt: cached.updatedAt };
  }

  if (!work24ApiKey) {
    return {
      postings: [],
      total: 0,
      updatedAt: now,
      message: "WORK24_API_KEY가 설정되지 않았습니다."
    };
  }

  const keyword = uniq([goal.company, goal.jobRole].map((value) => String(value || "").trim()))
    .join(" ");
  const params = new URLSearchParams({
    authKey: work24ApiKey,
    callTp: "L",
    returnType: "XML",
    startPage: "1",
    display: String(options.display || 10),
    sortOrderBy: "DESC"
  });

  if (keyword) {
    params.set("keyword", keyword);
  }

  const response = await fetchWithTimeout(`${WORK24_LIST_URL}?${params.toString()}`, {}, 12000);
  const xml = await response.text();

  if (!response.ok) {
    throw new Error(`고용24 API 오류: ${response.status} ${xml.slice(0, 160)}`);
  }

  const parsed = parseWork24ListXml(xml, goal);
  const postings = parsed.postings
    .sort((a, b) => scorePosting(b, goal) - scorePosting(a, goal))
    .slice(0, options.display || 10);
  const data = { total: parsed.total, postings, updatedAt: now };

  jobPostingCache.set(cacheKey, { updatedAt: now, data });
  return data;
}

function buildCertSchedulesFromRoadmap(roadmap, input) {
  const text = JSON.stringify({
    certifications: input.certifications,
    jobRole: input.jobRole,
    roadmap,
    jobPostings: input.jobPostings || []
  });

  return Object.keys(CERT_SCHEDULES)
    .filter((cert) => text.includes(cert))
    .map((cert) => ({
      name: cert,
      schedule: CERT_SCHEDULES[cert]
    }));
}

function applyJobPostingInsights(roadmap, input) {
  const postings = Array.isArray(input.jobPostings) ? input.jobPostings : [];
  if (postings.length === 0) {
    return roadmap;
  }

  const requiredSkills = uniq(postings.flatMap((posting) => posting.requiredSkills || []));
  const certifications = uniq(postings.flatMap((posting) => posting.certifications || []));
  const topPostings = postings.slice(0, 3);
  const jobChecklist = [];

  topPostings.forEach((posting, index) => {
    const dDayText = posting.dDay === null ? "마감일 확인" : posting.dDay < 0 ? "마감됨" : `D-${posting.dDay}`;
    jobChecklist.push({
      id: `job-posting-${posting.id || index}`,
      title: `${posting.company} 공고 분석 (${dDayText})`,
      description: `${posting.title} 공고의 필수/우대 역량을 이력서와 체크리스트에 반영하세요.`,
      duration: "1일",
      done: false
    });
  });

  requiredSkills.slice(0, 5).forEach((skill) => {
    jobChecklist.push({
      id: `job-skill-${skill}`,
      title: `${skill} 채용공고 요구역량 보강`,
      description: `최신 관련 공고에서 반복적으로 보이는 ${skill} 요구사항을 학습하고 포트폴리오에 증거를 남기세요.`,
      duration: "3-5일",
      done: false
    });
  });

  certifications.forEach((cert) => {
    jobChecklist.push({
      id: `job-cert-${cert}`,
      title: `${cert} 우대 조건 대응`,
      description: `${cert} 자격증 일정과 준비 범위를 확인하고 로드맵에 반영하세요.`,
      duration: "1주",
      done: false
    });
  });

  return {
    ...roadmap,
    coreSkills: uniq([...requiredSkills, ...(roadmap.coreSkills || [])]),
    priorities: uniq([
      ...requiredSkills.map((skill) => `${skill} 실무 증거 만들기`),
      ...(certifications.length ? certifications.map((cert) => `${cert} 시험 일정 확인`) : []),
      ...(roadmap.priorities || [])
    ]),
    gaps: uniq([
      ...requiredSkills.map((skill) => `채용공고 기준 ${skill} 활용 경험 보강`),
      ...(roadmap.gaps || [])
    ]),
    checklist: uniq([...jobChecklist, ...(roadmap.checklist || [])].map((item) => JSON.stringify(item))).map((item) =>
      JSON.parse(item)
    ),
    jobPostings: postings,
    jobInsights: {
      requiredSkills,
      certifications,
      updatedAt: new Date().toISOString()
    }
  };
}

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

function getFallbackRoadmap({ company, jobRole, skills, level, targetPeriod, certifications }) {
  const currentSkills = skills || "현재 보유 역량";
  let period = "4주";
  let weeksCount = 4;

  if (targetPeriod) {
    if (targetPeriod.includes("1개월") || targetPeriod.includes("4주")) {
      weeksCount = 4;
      period = "4주 (1개월)";
    } else if (targetPeriod.includes("3개월") || targetPeriod.includes("12주")) {
      weeksCount = 8;
      period = "8주 (3개월)";
    } else if (targetPeriod.includes("6개월") || targetPeriod.includes("24주")) {
      weeksCount = 12;
      period = "12주 (6개월)";
    } else if (targetPeriod.includes("12개월") || targetPeriod.includes("1년") || targetPeriod.includes("52주")) {
      weeksCount = 16;
      period = "16주 (1년)";
    }
  }

  const weeks = [];
  for (let i = 1; i <= weeksCount; i++) {
    let weekTitle = "";
    let weekTasks = [];
    if (i === 1) {
      weekTitle = "목표 분석과 기초 보강";
      weekTasks = [
        `${company} ${jobRole} 채용 공고 3개 분석`,
        "요구 기술을 필수, 우대, 보완으로 분류",
        "현재 기술과 부족한 기술 비교표 작성"
      ];
    } else if (i === weeksCount) {
      weekTitle = "지원 준비와 면접 연습";
      weekTasks = [
        `이력서와 포트폴리오를 ${company} 기준으로 수정`,
        "프로젝트 기반 기술 면접 답변 준비",
        "최종 점검 및 모의 면접 실행"
      ];
    } else if (i === weeksCount - 1) {
      weekTitle = "이력서 정리 및 포트폴리오 다듬기";
      weekTasks = [
        "포트폴리오 README 및 시각 자료 정리",
        "이력서 내 문제 해결 과정 기술 보완",
        "동료 피드백 수렴 및 수정"
      ];
    } else {
      weekTitle = `핵심 역량 강화 및 프로젝트 진행 (단계 ${i - 1})`;
      weekTasks = [
        `${jobRole} 실무 프로젝트 기능 개발`,
        `부족한 역량(${currentSkills}) 극복을 위한 학습`,
        "코드 리팩토링 및 테스트 수행"
      ];
    }

    if (certifications && certifications !== "AI 추천" && i % 2 === 0) {
      weekTasks.push(`${certifications} 시험 대비 이론 학습 및 기출문제 풀이`);
    }

    weeks.push({
      week: i,
      title: weekTitle,
      tasks: weekTasks
    });
  }

  const checklist = [];
  weeks.forEach((w) => {
    w.tasks.forEach((t, taskIdx) => {
      checklist.push({
        id: `task-${w.week}-${taskIdx + 1}`,
        title: `${w.title} - ${t.substring(0, 15)}...`,
        description: t,
        duration: "3-5일",
        done: false
      });
    });
  });

  return {
    coreSkills: [
      `${jobRole} 직무 핵심 기술`,
      certifications && certifications !== "AI 추천" ? certifications : "직무 관련 자격증",
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
    weeks: weeks,
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
    checklist: checklist.slice(0, 10),
    estimatedPeriod: period
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

  let response;
  try {
    response = await fetchWithTimeout(
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
      },
      15000
    );
  } catch (error) {
    if (error.name === "AbortError" || error.code === "UND_ERR_CONNECT_TIMEOUT") {
      return getFallbackRoles(company);
    }
    throw error;
  }

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

  let response;
  try {
    response = await fetchWithTimeout(
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
      },
      15000
    );
  } catch (error) {
    if (error.name === "AbortError" || error.code === "UND_ERR_CONNECT_TIMEOUT") {
      return getFallbackSkills(company, jobRole);
    }
    throw error;
  }

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
    return applyJobPostingInsights(getFallbackRoadmap(input), input);
  }

  const relevantCerts = Object.keys(CERT_SCHEDULES).filter(cert => 
    (input.certifications && input.certifications.includes(cert)) || 
    (input.jobRole && input.jobRole.includes(cert))
  );
  
  const certSchedulesText = relevantCerts.length > 0 
    ? `\n[관련 자격증 시험 일정 (반드시 체크리스트와 주차별 일정에 최우선 반영할 것)]\n${relevantCerts.map(cert => `- ${cert}: 접수일(${CERT_SCHEDULES[cert].접수일}), 시험일(${CERT_SCHEDULES[cert].시험일})`).join('\n')}` 
    : "";

  const prompt = `
아래 입력값을 바탕으로 한국어 취업 준비 로드맵을 JSON으로만 생성해줘.

목표 기업: ${input.company}
희망 직무: ${input.jobRole}
현재 보유 기술/역량: ${input.skills || "입력하지 않음"}
경력 수준: ${input.level}
희망 준비 기간: ${input.targetPeriod || "AI 추천"}
목표 자격증: ${input.certifications || "AI 추천"}
${certSchedulesText}
${input.jobPostings && input.jobPostings.length > 0 ? `\n[고용24 최신 관련 채용공고 분석]\n${input.jobPostings.slice(0, 5).map((posting) => {
  const dDayText = posting.dDay === null ? "마감일 확인" : posting.dDay < 0 ? "마감됨" : `D-${posting.dDay}`;
  return `- ${posting.company} / ${posting.title} / ${posting.region || "지역 미상"} / ${posting.career || "경력 무관"} / ${dDayText} / 요구기술: ${(posting.requiredSkills || []).join(", ") || "공고 확인 필요"} / 자격증: ${(posting.certifications || []).join(", ") || "공고 확인 필요"}`;
}).join("\n")}\n* 위 실제 공고에서 반복되는 요구 기술, 우대사항, 자격증을 coreSkills, priorities, weeks, checklist에 우선 반영해줘.` : ""}
${input.completedTasks ? `\n[기존 완료된 학습/과제 항목 (보존 필수)]\n${input.completedTasks.map(t => `- ${t.title}`).join('\n')}\n* 주의: 사용자가 이미 완료한 위 항목들은 체크리스트(checklist) 배열의 앞부분에 반드시 포함시키고 (done: true로 설정), 남은 기간 동안 수행해야 할 새로운 항목들만 추가로 생성해줘. 임박한 시험 일정과 관련된 태스크는 최우선 순위(상단)로 배치해줘.` : ""}

[작성 가이드라인]
1. 준비 기간 설계:
   - '희망 준비 기간'이 "AI 추천"이거나 비어 있는 경우, 목표 기업/직무의 난이도와 사용자 경력/역량을 분석하여 가장 적절한 기간(예: 3개월, 6개월 등)을 스스로 판단하고, 전체 예상 준비 기간('estimatedPeriod') 필드에 기록해줘.
   - 준비 기간에 맞춰 'weeks' 배열의 크기를 유동적으로 생성해줘.
     - 1개월 (4주 내외): 4개 주차 생성
     - 3개월 (8~12주 내외): 8~12개 주차 생성
     - 6개월 이상: 10~12개의 마일스톤 주차 생성 (주요 단계별로 묶어서 표현 가능)
   - 현재 보유 기술이 비어 있으면 처음 시작하는 초보자 관점에서 기초 다지기 주차를 초반에 배치해줘.

2. 자격증 및 시험 준비 전략:
   - '목표 자격증'이 지정되었거나 "AI 추천"일 때 이 직무/기업에 우대되거나 필수적인 자격증(예: 정보처리기사, SQLD, ADsP, AWS 자격증, 어학 등)을 파악하고, 로드맵의 'weeks'와 'checklist'에 시험 일정 확인, 개념 학습, 기출 풀이 등 구체적인 학습 태스크를 포함시켜줘.
   - 'coreSkills'에도 해당 자격증을 핵심 기술로서 표기해줘.

3. 체크리스트 연동:
   - 'weeks'의 세부 태스크와 연동되는 'checklist'를 구체적으로 만들어줘.
   - 각 체크리스트 아이템은 고유한 id("task-1", "task-2", ...)를 가져야 하며, 실제 실행 가능한 상세한 액션 아이템이어야 해.

반드시 다음 JSON 구조를 엄격하게 지켜서 JSON 마크다운 기호 없이 순수 JSON 텍스트 또는 JSON 블록으로만 반환해줘.
{
  "coreSkills": ["필요한 핵심 기술 및 자격증"],
  "gaps": ["부족한 역량"],
  "priorities": ["학습 우선순위"],
  "weeks": [
    {"week": 1, "title": "주차/단계 제목", "tasks": ["할 일 1", "할 일 2"]}
  ],
  "portfolioDirection": "포트폴리오 준비 방향 (목표 자격증이나 학습 결과물을 포트폴리오에 녹여내는 방법 포함)",
  "interviewItems": ["면접 준비 항목 (해당 직무와 자격증/핵심기술 면접 질문 예시 포함)"],
  "firstAction": "오늘 시작할 첫 번째 행동 (매우 구체적인 액션)",
  "checklist": [
    {"id": "task-1", "title": "작업명", "description": "상세 설명", "duration": "예상 기간(예: 3일, 1주일)", "done": false}
  ],
  "estimatedPeriod": "전체 예상 준비 기간 (예: 3개월, 4주, 6개월)"
}
`;

  let response;
  try {
    response = await fetchWithTimeout(
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
      },
      20000
    );
  } catch (error) {
    if (error.name === "AbortError" || error.code === "UND_ERR_CONNECT_TIMEOUT") {
      return applyJobPostingInsights(getFallbackRoadmap(input), input);
    }
    throw error;
  }

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

  return applyJobPostingInsights(normalizeRoadmap(parsed, input), input);
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
      level: req.body.level.trim(),
      targetPeriod: String(req.body.targetPeriod || "").trim(),
      certifications: String(req.body.certifications || "").trim(),
      completedTasks: req.body.completedTasks || null,
      jobPostings: []
    };
    try {
      const postingResult = await fetchWork24JobPostings(input, { display: 8 });
      input.jobPostings = postingResult.postings || [];
    } catch (postingError) {
      input.jobPostingError = postingError.message;
    }

    const roadmap = await generateWithGemini(input);

    const certSchedules = buildCertSchedulesFromRoadmap(roadmap, input);
    roadmap.certSchedules = certSchedules;

    return res.json({
      roadmap,
      certSchedules,
      jobPostings: input.jobPostings,
      jobPostingError: input.jobPostingError || ""
    });
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

app.post("/api/job-postings", async (req, res) => {
  const company = String(req.body.company || "").trim();
  const jobRole = String(req.body.jobRole || "").trim();

  if (!company && !jobRole) {
    return res.status(400).json({ message: "목표 기업 또는 희망 직무가 필요합니다." });
  }

  try {
    const result = await fetchWork24JobPostings(
      {
        company,
        jobRole,
        skills: String(req.body.skills || "").trim(),
        certifications: String(req.body.certifications || "").trim()
      },
      {
        display: Number(req.body.display || 10),
        forceRefresh: Boolean(req.body.forceRefresh)
      }
    );

    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      message: "채용공고를 불러오는 중 오류가 발생했습니다.",
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
    console.log(`기업뚱이 server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
