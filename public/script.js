const state = {
  goal: {
    company: "",
    jobRole: "",
    skills: "",
    level: "",
    targetPeriod: "",
    certifications: ""
  },
  roadmap: null,
  jobPostings: [],
  savedRoadmapId: null,
  session: null,
  supabase: null
};

const panels = {
  login: document.querySelector("#loginPanel"),
  signup: document.querySelector("#signupPanel"),
  goal: document.querySelector("#goalPanel"),
  roadmap: document.querySelector("#roadmapPanel"),
  progress: document.querySelector("#progressPanel")
};

const stepButtons = document.querySelectorAll("[data-step-button]");
const goalForm = document.querySelector("#goalForm");
const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const generateButton = document.querySelector("#generateButton");
const regenerateButton = document.querySelector("#regenerateButton");
const saveButton = document.querySelector("#saveButton");
const startProgressButton = document.querySelector("#startProgressButton");
const suggestRolesButton = document.querySelector("#suggestRolesButton");
const suggestSkillsButton = document.querySelector("#suggestSkillsButton");
const recommendCertsButton = document.querySelector("#recommendCertsButton");
const certSuggestions = document.querySelector("#certSuggestions");
const certHint = document.querySelector("#certHint");
const progressSaveButtonRow = document.querySelector("#progressSaveButtonRow");
const progressSaveButton = document.querySelector("#progressSaveButton");
const progressSaveStatus = document.querySelector("#progressSaveStatus");
const loadingBox = document.querySelector("#loadingBox");
const roadmapContent = document.querySelector("#roadmapContent");
const saveStatus = document.querySelector("#saveStatus");
const roleHint = document.querySelector("#roleHint");
const roleSuggestions = document.querySelector("#roleSuggestions");
const skillHint = document.querySelector("#skillHint");
const skillSuggestions = document.querySelector("#skillSuggestions");
let draggedChecklistIndex = null;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPostingDDay(dDay) {
  if (dDay === null || dDay === undefined) {
    return "마감일 확인";
  }
  if (dDay < 0) {
    return "마감됨";
  }
  if (dDay === 0) {
    return "D-Day";
  }
  return `D-${dDay}`;
}

function formatUpdatedAt(value) {
  if (!value) {
    return "고용24 연동";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "고용24 연동";
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} 갱신`;
}

function on(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

const fields = {
  company: document.querySelector("#company"),
  jobRole: document.querySelector("#jobRole"),
  customJobRole: document.querySelector("#customJobRole"),
  skills: document.querySelector("#skills"),
  targetPeriod: document.querySelector("#targetPeriod"),
  customTargetPeriod: document.querySelector("#customTargetPeriod"),
  targetDateRange: document.querySelector("#targetDateRange"),
  targetStartDateInput: document.querySelector("#targetStartDateInput"),
  targetEndDateInput: document.querySelector("#targetEndDateInput"),
  certifications: document.querySelector("#certifications"),
  firstAction: document.querySelector("#firstAction"),
  portfolioDirection: document.querySelector("#portfolioDirection")
};

function todayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDatePeriod(period, fallbackStartDate = new Date()) {
  const value = String(period || "");
  if (!value.startsWith("date:")) {
    return null;
  }

  const [, firstDate, secondDate] = value.split(":");
  const startValue = secondDate ? firstDate : new Date(fallbackStartDate).toISOString().slice(0, 10);
  const endValue = secondDate || firstDate;
  const startDate = new Date(`${startValue}T00:00:00`);
  const endDate = new Date(`${endValue}T00:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return {
    startValue,
    endValue,
    startDate,
    endDate,
    days: Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
  };
}

function openDatePicker(input) {
  if (!input) {
    return;
  }

  input.focus();
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
    } catch (_error) {
      // Some browsers only allow the picker from direct pointer/keyboard activation.
    }
  }
}

function syncDateRangeMin(startInput, endInput) {
  if (!startInput || !endInput) {
    return;
  }

  endInput.min = startInput.value || "";
  if (startInput.value && endInput.value && endInput.value < startInput.value) {
    endInput.value = "";
  }
}

function attachPlanDatesToRoadmap() {
  if (!state.roadmap) {
    return;
  }

  const datePeriod = parseDatePeriod(state.goal?.targetPeriod, state.goal?.createdAt);
  if (datePeriod) {
    state.goal.createdAt = `${datePeriod.startValue}T00:00:00.000Z`;
    state.roadmap.planStartDate = datePeriod.startValue;
    state.roadmap.planEndDate = datePeriod.endValue;
    state.roadmap.targetPeriod = state.goal.targetPeriod;
  }
}

function formatChecklistDuration(days) {
  if (days <= 1) return "1일";
  if (days <= 3) return `${days}일`;
  if (days <= 6) return `${days}일`;
  const weeks = Math.max(1, Math.round(days / 7));
  return weeks === 1 ? "1주" : `${weeks}주`;
}

function estimateChecklistDuration(index, totalItems) {
  const totalDays = getTargetDays(state.goal?.targetPeriod || state.roadmap?.targetPeriod || state.roadmap?.estimatedPeriod);
  const baseDays = Math.max(1, Math.round(totalDays / Math.max(1, totalItems)));
  const weightPattern = [0.45, 0.75, 1, 1.25, 1.6];
  const weight = weightPattern[index % weightPattern.length];
  return formatChecklistDuration(Math.max(1, Math.round(baseDays * weight)));
}

function hydrateChecklistDurations() {
  const checklist = state.roadmap?.checklist || [];
  if (checklist.length === 0) {
    return;
  }

  const editableDurations = checklist
    .filter((item) => !item.durationEdited)
    .map((item) => String(item.duration || "").trim())
    .filter(Boolean);
  const shouldRebalance =
    editableDurations.length === 0 ||
    new Set(editableDurations).size === 1 && ["3-5일", "기간 미정"].includes(editableDurations[0]);

  checklist.forEach((item, index) => {
    if (!item.durationEdited && (!item.duration || shouldRebalance)) {
      item.duration = estimateChecklistDuration(index, checklist.length);
    }
  });
}

function showPanel(name) {
  // 비로그인 사용자도 목표 설정과 로드맵 생성 결과는 볼 수 있고, 저장/진행 관리는 로그인 후 사용합니다.
  const protectedPanels = ["progress"];
  if (!state.session && protectedPanels.includes(name)) {
    name = "login";
  }

  Object.entries(panels).forEach(([panelName, panel]) => {
    if (panel) {
      panel.classList.toggle("active", panelName === name);
    }
  });

  stepButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.stepButton === name);
  });

  // 새롭게 활성화된 패널로 포커스를 이동하여 Tab 키 누름 시 포커스가 헤더 네비게이션으로 초기화되는 현상 방지
  const activePanel = panels[name];
  if (activePanel) {
    activePanel.setAttribute("tabindex", "-1");
    activePanel.style.outline = "none";
    activePanel.focus({ preventScroll: true });
  }
}

function getSelectedLevel() {
  return document.querySelector('input[name="level"]:checked')?.value || "";
}

function getSelectedSkills() {
  const checkedSkills = Array.from(
    document.querySelectorAll('input[name="suggestedSkill"]:checked')
  ).map((input) => input.value);
  const customSkills = fields.skills.value
    .split(/[,，\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

  return Array.from(new Set([...checkedSkills, ...customSkills]));
}

function collectGoal() {
  const customJobRole = fields.customJobRole.value.trim();
  const targetPeriod = fields.targetPeriod.value;
  const customTargetPeriod = fields.customTargetPeriod.value.trim();
  const targetStartDateInput = fields.targetStartDateInput.value;
  const targetEndDateInput = fields.targetEndDateInput.value;
  const selectedSkills = getSelectedSkills();
  
  let finalTargetPeriod = targetPeriod;
  if (targetPeriod === "custom") {
    finalTargetPeriod = customTargetPeriod;
  } else if (targetPeriod === "date" && targetStartDateInput && targetEndDateInput) {
    finalTargetPeriod = `date:${targetStartDateInput}:${targetEndDateInput}`;
  }

  return {
    company: fields.company.value.trim(),
    jobRole: customJobRole || fields.jobRole.value.trim(),
    skills: selectedSkills.join(", "),
    level: getSelectedLevel(),
    targetPeriod: finalTargetPeriod,
    certifications: fields.certifications.value.trim()
  };
}

function setFieldError(fieldName, message) {
  const input = fields[fieldName];
  const wrapper = input.closest(".field");
  const error = wrapper.querySelector(".error-text");
  wrapper.classList.toggle("invalid", Boolean(message));
  if (error) {
    error.textContent = message || "";
  }
}

function validateGoal(showErrors = false) {
  const goal = collectGoal();
  let targetPeriodError = goal.targetPeriod ? "" : "희망 준비 기간을 입력해주세요.";
  if (
    fields.targetPeriod.value === "date" &&
    fields.targetStartDateInput.value &&
    fields.targetEndDateInput.value &&
    fields.targetEndDateInput.value < fields.targetStartDateInput.value
  ) {
    targetPeriodError = "목표 날짜는 시작 날짜 이후로 선택해주세요.";
  }

  const errors = {
    company: goal.company ? "" : "목표 기업을 입력해주세요.",
    jobRole: goal.jobRole ? "" : "희망 직무를 선택해주세요.",
    skills: "",
    level: goal.level ? "" : "경력 수준을 선택해주세요.",
    targetPeriod: targetPeriodError
  };

  if (showErrors) {
    setFieldError("company", errors.company);
    setFieldError("jobRole", errors.jobRole);
    document.querySelector("#levelError").textContent = errors.level;
    setFieldError("targetPeriod", errors.targetPeriod);
  }

  const isValid = Object.values(errors).every((message) => !message);
  generateButton.disabled = !isValid;
  return isValid;
}

function validateAuthForm(email, password, messageElement) {
  if (!email || !password) {
    messageElement.textContent = "이메일과 비밀번호를 모두 입력해주세요.";
    return false;
  }

  if (password.length < 6) {
    messageElement.textContent = "비밀번호는 6자 이상이어야 합니다.";
    return false;
  }

  messageElement.textContent = "";
  return true;
}

function setRoleOptions(roles) {
  const currentValue = fields.jobRole.value;
  fields.jobRole.innerHTML = '<option value="">직무를 선택하세요</option>';

  roles.forEach((role) => {
    const option = document.createElement("option");
    option.value = role;
    option.textContent = role;
    fields.jobRole.appendChild(option);
  });

  if (roles.includes(currentValue)) {
    fields.jobRole.value = currentValue;
  }
}

function renderRoleSuggestions(roles) {
  roleSuggestions.innerHTML = "";

  roles.forEach((role) => {
    const button = document.createElement("button");
    button.className = "role-chip";
    button.type = "button";
    button.textContent = role;
    button.addEventListener("click", () => {
      fields.jobRole.value = role;
      fields.customJobRole.value = "";
      validateGoal(false);
      renderRoleSuggestions(roles);
    });

    if (fields.jobRole.value === role) {
      button.classList.add("active");
    }

    roleSuggestions.appendChild(button);
  });
}

function renderSkillSuggestions(skills) {
  skillSuggestions.innerHTML = "";

  skills.forEach((skill) => {
    const label = document.createElement("label");
    label.className = "skill-check";
    const input = document.createElement("input");
    const text = document.createElement("span");

    input.type = "checkbox";
    input.name = "suggestedSkill";
    input.value = skill;
    text.textContent = skill;
    input.addEventListener("change", () => validateGoal(false));

    label.append(input, text);
    skillSuggestions.appendChild(label);
  });
}

async function suggestRoles() {
  const company = fields.company.value.trim();

  if (!company) {
    setFieldError("company", "목표 기업을 먼저 입력해주세요.");
    return;
  }

  suggestRolesButton.disabled = true;
  roleHint.textContent = "기업과 업종을 분석해 추천 직무를 찾는 중입니다...";

  try {
    const response = await fetch("/api/suggest-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company })
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : { message: "서버가 최신 상태가 아닙니다. 개발 서버를 다시 시작해주세요." };

    if (!response.ok) {
      throw new Error(data.message || "추천 직무를 불러오지 못했습니다.");
    }

    const roles = data.roles || [];
    setRoleOptions(roles);
    renderRoleSuggestions(roles);
    roleHint.textContent = `${company}와 관련성이 높은 직무를 추천했습니다.`;
    validateGoal(false);
  } catch (error) {
    roleHint.textContent = error.message;
  } finally {
    suggestRolesButton.disabled = false;
  }
}

async function suggestSkills() {
  const goal = collectGoal();

  if (!goal.company || !goal.jobRole) {
    skillHint.textContent = "목표 기업과 희망 직무를 먼저 입력해주세요.";
    return;
  }

  suggestSkillsButton.disabled = true;
  skillHint.textContent = "기업과 직무에 필요한 역량을 찾는 중입니다...";

  try {
    const response = await fetch("/api/suggest-skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: goal.company,
        jobRole: goal.jobRole
      })
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : { message: "서버가 최신 상태가 아닙니다. 개발 서버를 다시 시작해주세요." };

    if (!response.ok) {
      throw new Error(data.message || "추천 역량을 불러오지 못했습니다.");
    }

    renderSkillSuggestions(data.skills || []);
    skillHint.textContent = "현재 보유한 역량을 체크하거나 직접 입력하세요. 비워도 분석은 가능합니다.";
    validateGoal(false);
  } catch (error) {
    skillHint.textContent = error.message;
  } finally {
    suggestSkillsButton.disabled = false;
  }
}

function enableStep(name) {
  const button = document.querySelector(`[data-step-button="${name}"]`);
  button.disabled = false;
}

function setLoading(isLoading) {
  if (loadingBox) {
    loadingBox.classList.toggle("hidden", !isLoading);
  }
  if (roadmapContent) {
    roadmapContent.classList.toggle("hidden", isLoading);
  }
  generateButton.disabled = isLoading;
  regenerateButton.disabled = isLoading;
  saveButton.disabled = isLoading || !state.session;
}

function getAuthHeaders() {
  return state.session
    ? { Authorization: `Bearer ${state.session.access_token}` }
    : {};
}

function updateAuthUI() {
  const isLoggedIn = Boolean(state.session);
  const email = state.session?.user?.email || "";

  const userEmailEl = document.querySelector("#userEmail");
  userEmailEl.textContent = email;
  userEmailEl.classList.toggle("hidden", !isLoggedIn);
  
  document.querySelector("#showLoginButton").classList.toggle("hidden", isLoggedIn);
  document.querySelector("#showSignupButton").classList.toggle("hidden", isLoggedIn);
  document.querySelector("#logoutButton").classList.toggle("hidden", !isLoggedIn);
  saveButton.disabled = !isLoggedIn || !state.roadmap;

  if (!isLoggedIn) {
    document.querySelector("#savedRoadmapsHint").textContent =
      "로그인하면 저장한 로드맵을 불러올 수 있습니다.";
    document.querySelector("#savedRoadmapsList").innerHTML = "";
    saveStatus.textContent = state.roadmap
      ? "로그인 후에만 로드맵을 저장할 수 있습니다."
      : "";
  }

  if (progressSaveButtonRow) {
    if (isLoggedIn && state.roadmap && !state.savedRoadmapId) {
      progressSaveButtonRow.classList.remove("hidden");
    } else {
      progressSaveButtonRow.classList.add("hidden");
    }
  }

  updateProgressHint();
}

function updateProgressHint() {
  const hint = document.querySelector("#progressSaveHint");
  if (!hint) {
    return;
  }

  if (!state.session) {
    hint.textContent = "비로그인 상태에서는 진행률을 서버에 저장할 수 없습니다.";
    return;
  }

  if (!state.savedRoadmapId) {
    hint.textContent = "로드맵을 먼저 저장하면 진행률도 사용자 계정에 저장됩니다.";
    return;
  }

  hint.textContent = "체크 상태가 변경될 때마다 Supabase에 진행률이 저장됩니다.";
}

function renderTargetSummary() {
  document.querySelector("#targetSummary").innerHTML = `
    <div><span>목표 기업</span><strong>${state.goal.company}</strong></div>
    <div><span>희망 직무</span><strong>${state.goal.jobRole}</strong></div>
    <div><span>경력 수준</span><strong>${state.goal.level}</strong></div>
  `;
}

function renderList(selector, items, ordered = false) {
  const element = document.querySelector(selector);
  element.innerHTML = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  });

  if (ordered) {
    element.setAttribute("aria-label", "추천 학습 우선순위");
  }
}

function renderWeeks() {
  const weekList = document.querySelector("#weekList");
  weekList.innerHTML = "";

  (state.roadmap.weeks || []).forEach((week) => {
    const article = document.createElement("article");
    article.className = "week-card";

    const tasks = (week.tasks || []).map((task) => `<li>${task}</li>`).join("");

    article.innerHTML = `
      <header>
        <span class="week-badge">${week.week}주</span>
        <h3>${week.title}</h3>
      </header>
      <ul>${tasks}</ul>
    `;
    weekList.appendChild(article);
  });
}

function renderJobPostings() {
  const list = document.querySelector("#jobPostingList");
  const hint = document.querySelector("#jobPostingsHint");
  const updatedAt = document.querySelector("#jobPostingsUpdatedAt");
  const postings = state.roadmap?.jobPostings || state.jobPostings || [];

  if (!list) {
    return;
  }

  if (updatedAt) {
    updatedAt.textContent = formatUpdatedAt(state.roadmap?.jobInsights?.updatedAt);
  }
  list.innerHTML = "";

  if (postings.length === 0) {
    hint.textContent = "WORK24_API_KEY를 설정하면 목표 기업/직무 기준 최신 공고가 표시됩니다.";
    return;
  }

  hint.textContent = "마감일이 가까운 공고와 반복 요구역량을 체크리스트에 반영합니다.";

  postings.slice(0, 5).forEach((posting) => {
    const item = document.createElement("article");
    item.className = "job-posting-card";
    const skills = (posting.requiredSkills || []).slice(0, 4);
    const dDay = formatPostingDDay(posting.dDay);
    const dDayClass = posting.dDay !== null && posting.dDay <= 7 && posting.dDay >= 0 ? "urgent" : "";

    item.innerHTML = `
      <div class="job-posting-main">
        <strong>${escapeHtml(posting.company)}</strong>
        <span class="job-dday ${dDayClass}">${escapeHtml(dDay)}</span>
      </div>
      <a href="${escapeHtml(posting.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(posting.title)}</a>
      <div class="job-posting-meta">
        <span>${escapeHtml(posting.region || "지역 미상")}</span>
        <span>${escapeHtml(posting.career || "경력 무관")}</span>
      </div>
      ${
        skills.length
          ? `<div class="job-skill-tags">${skills.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</div>`
          : ""
      }
    `;
    list.appendChild(item);
  });
}

function renderRoadmap() {
  document.querySelector("#estimatedPeriod").textContent =
    `예상 준비 기간: ${state.roadmap.estimatedPeriod || "4주"}`;

  renderList("#coreSkillsList", state.roadmap.coreSkills || []);
  renderList("#gapsList", state.roadmap.gaps || []);
  renderList("#priorityList", state.roadmap.priorities || [], true);
  renderList("#interviewList", state.roadmap.interviewItems || []);
  renderWeeks();

  fields.firstAction.textContent = state.roadmap.firstAction || "";
  fields.portfolioDirection.textContent = state.roadmap.portfolioDirection || "";
  renderJobPostings();
  saveButton.disabled = !state.session;
}

function syncEditableRoadmap() {
  // Fields are now static and read-only, no sync needed.
}

async function initSupabaseAuth() {
  const response = await fetch("/api/config");
  const config = await response.json();

  if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase) {
    document.querySelector("#savedRoadmapsHint").textContent =
      "Supabase Auth 설정이 필요합니다. .env에 SUPABASE_URL과 SUPABASE_ANON_KEY를 입력하세요.";
    updateAuthUI();
    return;
  }

  state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  updateAuthUI();

  if (state.session) {
    const roadmaps = await loadSavedRoadmaps();
    if (roadmaps && roadmaps.length > 0) {
      loadRoadmapFromRecord(roadmaps[0], {
        openProgress: !new URLSearchParams(window.location.search).has("new")
      });
    }
  }

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    updateAuthUI();

    if (session) {
      const roadmaps = await loadSavedRoadmaps();
      if (roadmaps && roadmaps.length > 0) {
        loadRoadmapFromRecord(roadmaps[0], {
          openProgress: !new URLSearchParams(window.location.search).has("new")
        });
      } else {
        showPanel("goal");
      }
    } else {
      state.savedRoadmapId = null;
      renderSavedRoadmaps([]);
    }
  });
}

async function signUp(email, password) {
  const { data, error } = await state.supabase.auth.signUp({ email, password });

  if (error) {
    throw error;
  }

  return data;
}

async function signIn(email, password) {
  const { data, error } = await state.supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data;
}

async function signOut() {
  if (!state.supabase) {
    return;
  }

  await state.supabase.auth.signOut();

  // 상태 완전 초기화
  state.session = null;
  state.roadmap = null;
  state.jobPostings = [];
  state.savedRoadmapId = null;
  state.goal = {};

  // 폼 및 화면 초기화
  goalForm.reset();
  fields.customJobRole.value = "";
  if (roadmapContent) roadmapContent.classList.add("hidden");
  const checklistBox = document.querySelector("#checklist");
  if (checklistBox) checklistBox.innerHTML = "";

  // 스토리지 완벽 초기화
  localStorage.clear();
  sessionStorage.clear();

  // 상단 스텝 탭 비활성화
  document.querySelector('[data-step-button="roadmap"]').disabled = true;
  document.querySelector('[data-step-button="progress"]').disabled = true;

  // 뒤로가기 방지 및 로그인 패널로 강제 이동
  history.replaceState(null, '', '/');
  showPanel("login");
}

async function generateRoadmap() {
  state.goal = collectGoal();
  state.savedRoadmapId = null;
  saveStatus.textContent = "";
  enableStep("roadmap");
  showPanel("roadmap");
  renderTargetSummary();
  setLoading(true);

  const response = await fetch("/api/generate-roadmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.goal)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "로드맵 생성에 실패했습니다.");
  }

  state.roadmap = data.roadmap;
  state.jobPostings = data.jobPostings || data.roadmap?.jobPostings || [];
  if (state.jobPostings.length > 0) {
    state.roadmap.jobPostings = state.jobPostings;
  }
  if (data.certSchedules) {
    state.roadmap.certSchedules = data.certSchedules;
  }
  if (!parseDatePeriod(state.goal.targetPeriod)) {
    state.goal.createdAt = new Date().toISOString(); // new roadmap starts now
  }
  attachPlanDatesToRoadmap();
  hydrateChecklistDurations();
  renderRoadmap();
  renderProgress();
  setLoading(false);
  updateAuthUI();
}

async function saveRoadmap() {
  if (!state.session) {
    const msg = "로그인 후에만 로드맵을 저장할 수 있습니다.";
    saveStatus.textContent = msg;
    if (progressSaveStatus) progressSaveStatus.textContent = msg;
    showPanel("login");
    return;
  }

  syncEditableRoadmap();
  saveButton.disabled = true;
  if (progressSaveButton) progressSaveButton.disabled = true;
  saveStatus.textContent = "저장 중입니다...";
  if (progressSaveStatus) progressSaveStatus.textContent = "저장 중입니다...";

  const progress = calculateProgress();
  try {
    const response = await fetch("/api/save-roadmap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        ...state.goal,
        roadmap: state.roadmap,
        progress
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data.message || "Supabase 저장에 실패했습니다.";
      saveStatus.textContent = errMsg;
      if (progressSaveStatus) progressSaveStatus.textContent = errMsg;
      saveButton.disabled = false;
      if (progressSaveButton) progressSaveButton.disabled = false;
      return;
    }

    state.savedRoadmapId = data.roadmap.id;
    const successMsg = "사용자 계정에 저장되었습니다.";
    saveStatus.textContent = successMsg;
    if (progressSaveStatus) progressSaveStatus.textContent = successMsg;
    saveButton.disabled = false;
    if (progressSaveButton) progressSaveButton.disabled = false;

    await loadSavedRoadmaps();
    updateProgressHint();
    updateAuthUI();
  } catch (error) {
    const errorMsg = error.message || "저장 오류가 발생했습니다.";
    saveStatus.textContent = errorMsg;
    if (progressSaveStatus) progressSaveStatus.textContent = errorMsg;
    saveButton.disabled = false;
    if (progressSaveButton) progressSaveButton.disabled = false;
  }
}

async function loadSavedRoadmaps() {
  if (!state.session) {
    renderSavedRoadmaps([]);
    return [];
  }

  const response = await fetch("/api/roadmaps", {
    headers: getAuthHeaders()
  });

  const data = await response.json();
  if (!response.ok) {
    document.querySelector("#savedRoadmapsHint").textContent =
      data.message || "이전 로드맵을 불러오지 못했습니다.";
    renderSavedRoadmaps([]);
    return [];
  }

  renderSavedRoadmaps(data.roadmaps || []);
  return data.roadmaps || [];
}

function renderSavedRoadmaps(roadmaps) {
  const list = document.querySelector("#savedRoadmapsList");
  const hint = document.querySelector("#savedRoadmapsHint");
  list.innerHTML = "";

  if (!state.session) {
    hint.textContent = "로그인하면 저장한 로드맵을 불러올 수 있습니다.";
    return;
  }

  if (roadmaps.length === 0) {
    hint.textContent = "아직 저장된 로드맵이 없습니다.";
    return;
  }

  hint.textContent = "저장된 로드맵을 선택하면 진행률을 이어서 관리할 수 있습니다.";

  roadmaps.forEach((item) => {
    const button = document.createElement("button");
    button.className = "saved-item";
    button.type = "button";
    button.innerHTML = `
      <strong>${item.company}</strong>
      <span>${item.job_role} · ${item.level}</span>
      <small>진행률 ${item.progress || 0}%</small>
    `;
    button.addEventListener("click", () => loadRoadmapFromRecord(item));
    list.appendChild(button);
  });
}

function loadRoadmapFromRecord(record, { openProgress = true } = {}) {
  state.goal = {
    company: record.company,
    jobRole: record.job_role,
    skills: record.skills,
    level: record.level,
    targetPeriod: record.roadmap_result?.targetPeriod || record.roadmap_result?.estimatedPeriod || "",
    certifications: record.roadmap_result?.certifications || "",
    createdAt: record.created_at
  };
  state.roadmap = record.roadmap_result;
  state.jobPostings = state.roadmap?.jobPostings || [];
  state.savedRoadmapId = record.id;

  fields.company.value = state.goal.company;
  if (Array.from(fields.jobRole.options).some((option) => option.value === state.goal.jobRole)) {
    fields.jobRole.value = state.goal.jobRole;
    fields.customJobRole.value = "";
  } else {
    fields.jobRole.value = "";
    fields.customJobRole.value = state.goal.jobRole;
  }
  fields.skills.value = state.goal.skills || "";
  skillSuggestions.innerHTML = "";
  skillHint.textContent =
    state.goal.skills
      ? "저장된 보유 역량을 직접 입력칸에 불러왔습니다."
      : "저장된 보유 역량이 없습니다. 필요하면 역량 찾기를 다시 사용할 수 있습니다.";
  document.querySelectorAll('input[name="level"]').forEach((input) => {
    input.checked = input.value === state.goal.level;
  });

  if (fields.targetPeriod) {
    const savedDatePeriod = parseDatePeriod(record.roadmap_result?.targetPeriod, record.created_at);
    fields.customTargetPeriod.classList.add("hidden");
    fields.targetDateRange.classList.add("hidden");
    fields.targetStartDateInput.value = "";
    fields.targetEndDateInput.value = "";

    if (savedDatePeriod) {
      fields.targetPeriod.value = "date";
      fields.targetDateRange.classList.remove("hidden");
      fields.targetStartDateInput.value = savedDatePeriod.startValue;
      fields.targetEndDateInput.value = savedDatePeriod.endValue;
      syncDateRangeMin(fields.targetStartDateInput, fields.targetEndDateInput);
      state.goal.targetPeriod = record.roadmap_result.targetPeriod;
      state.goal.createdAt = `${savedDatePeriod.startValue}T00:00:00.000Z`;
    } else {
      const matchingOption = Array.from(fields.targetPeriod.options).find(opt => 
        opt.value === state.goal.targetPeriod || 
        (state.goal.targetPeriod && opt.value.includes(state.goal.targetPeriod))
      );
      if (matchingOption) {
        fields.targetPeriod.value = matchingOption.value;
      } else {
        fields.targetPeriod.value = "";
      }
    }
  }

  if (fields.certifications) {
    fields.certifications.value = state.goal.certifications;
  }

  enableStep("roadmap");
  enableStep("progress");
  renderTargetSummary();
  renderRoadmap();
  hydrateChecklistDurations();
  renderProgress();
  setLoading(false);
  updateAuthUI();
  
  if (openProgress) {
    if (new URLSearchParams(window.location.search).has("new")) {
      history.replaceState(null, "", window.location.pathname);
    }
    showPanel("progress");
  } else {
    showPanel("goal");
  }
}

function calculateProgress() {
  const checklist = state.roadmap?.checklist || [];
  if (checklist.length === 0) {
    return 0;
  }

  const doneCount = checklist.filter((item) => item.done).length;
  return Math.round((doneCount / checklist.length) * 100);
}

function getTargetDays(periodStr) {
  const str = periodStr || "";
  const datePeriod = parseDatePeriod(str, state.goal?.createdAt);
  if (datePeriod) return datePeriod.days;
  if (str.includes("1개월")) return 30;
  if (str.includes("3개월")) return 90;
  if (str.includes("6개월")) return 180;
  if (str.includes("1년")) return 365;
  const weeks = str.match(/(\d+)주/);
  if (weeks) return parseInt(weeks[1]) * 7;
  const months = str.match(/(\d+)개월/);
  if (months) return parseInt(months[1]) * 30;
  const days = str.match(/(\d+)일/);
  if (days) return parseInt(days[1]);
  return 90;
}

function renderProgress() {
  const checklist = state.roadmap?.checklist || [];
  const doneCount = checklist.filter((item) => item.done).length;
  const taskPercent = calculateProgress();

  // Task Progress
  document.querySelector("#progressPercent").textContent = `${taskPercent}%`;
  document.querySelector("#progressCount").textContent = `${doneCount} / ${checklist.length} 완료`;
  document.querySelector("#progressFill").style.width = `${taskPercent}%`;

  // Time Progress & D-Day
  const storedTargetPeriod = state.goal?.targetPeriod || state.roadmap?.targetPeriod || state.roadmap?.estimatedPeriod;
  const datePeriod = parseDatePeriod(storedTargetPeriod, state.goal?.createdAt);
  const startDate = datePeriod?.startDate || (state.goal?.createdAt ? new Date(state.goal.createdAt) : new Date());
  const targetDays = datePeriod?.days || getTargetDays(storedTargetPeriod);
  
  // Dashboard Header
  const jobRoleStr = state.goal?.jobRole || state.roadmap?.jobRole || "직무명 없음";
  const roleEl = document.querySelector("#dashboardJobRole");
  if (roleEl) roleEl.textContent = `${jobRoleStr} 준비`;
  
  const endMs = startDate.getTime() + (targetDays * 24 * 60 * 60 * 1000);
  const endDate = datePeriod?.endDate || new Date(endMs);
  const formatDt = (d) => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2, '0')}`;
  const periodEl = document.querySelector("#dashboardPeriodText");
  if (periodEl) {
    const periodLabel = datePeriod
      ? `${datePeriod.startValue} ~ ${datePeriod.endValue}`
      : state.goal?.targetPeriod || state.roadmap?.estimatedPeriod || `${targetDays}일`;
    periodEl.textContent = `${formatDt(startDate)} ~ ${formatDt(endDate)} (${periodLabel})`;
  }
  
  const now = new Date();
  const elapsedMs = now - startDate;
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, targetDays - elapsedDays);
  
  let timePercent = Math.round((elapsedDays / targetDays) * 100);
  if (timePercent > 100) timePercent = 100;

  document.querySelector("#timeProgressPercent").textContent = `${timePercent}%`;
  document.querySelector("#timeProgressCount").textContent = `${elapsedDays}일 지남 / 총 ${targetDays}일`;
  document.querySelector("#timeProgressFill").style.width = `${timePercent}%`;
  
  // D-Day Badge
  const dDayBadge = document.querySelector("#dDayBadge");
  const dDayText = document.querySelector("#dDayText");
  const dDayBanner = document.querySelector(".d-day-banner");
  
  if (remainingDays === 0) {
    dDayBadge.textContent = "D-Day!";
    dDayText.textContent = "목표일이 되었습니다. 마지막까지 화이팅!";
    dDayBanner.style.background = "#fee2e2";
    dDayBanner.style.color = "#dc2626";
  } else {
    dDayBadge.textContent = `D-${remainingDays}`;
    dDayText.textContent = `목표일까지 약 ${Math.ceil(remainingDays / 30)}개월 남았습니다.`;
    
    // Warning colors if time progress > task progress significantly
    if (timePercent > taskPercent + 20) {
      dDayBanner.style.background = "#ffedd5";
      dDayBanner.style.color = "#ea580c";
      dDayText.textContent += " (일정이 지연되고 있습니다!)";
    } else {
      dDayBanner.style.background = "var(--primary-soft)";
      dDayBanner.style.color = "var(--primary)";
    }
  }

  document.querySelector("#remainingText").textContent =
    checklist.length - doneCount > 0
      ? `남은 일정: ${checklist.length - doneCount}개`
      : "모든 일정을 완료했습니다.";

  const certContainer = document.querySelector("#certScheduleContainer");
  const certList = document.querySelector("#certScheduleList");
  
  if (state.roadmap?.certSchedules && state.roadmap.certSchedules.length > 0) {
    certContainer.classList.remove("hidden");
    certList.innerHTML = state.roadmap.certSchedules.map(cert => `
      <li style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed var(--line);">
        <strong style="display: block; margin-bottom: 4px;">🎯 ${cert.name}</strong>
        접수일: ${cert.schedule.접수일} <br/>
        시험일: <span style="color: var(--primary); font-weight: 700;">${cert.schedule.시험일}</span> <br/>
        발표일: ${cert.schedule.발표일}
      </li>
    `).join("");
  } else {
    certContainer.classList.add("hidden");
    certList.innerHTML = "";
  }

  renderJobPostings();

  const checklistBox = document.querySelector("#checklist");
  checklistBox.innerHTML = "";

  checklist.forEach((item, index) => {
    const row = document.createElement("article");
    row.className = `check-item ${item.done ? "done" : ""}`;
    row.dataset.index = String(index);
    row.innerHTML = `
      <button
        class="drag-handle"
        type="button"
        draggable="true"
        aria-label="${item.title} 우선순위 변경"
        title="드래그해서 우선순위 변경"
      ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg></button>
      <input type="checkbox" ${item.done ? "checked" : ""} aria-label="${item.title} 완료" />
      <div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </div>
      <div class="check-meta">
        <span class="priority-badge">우선순위 ${index + 1}</span>
        <label class="duration-edit">
          <span>예상 기간</span>
          <input
            type="text"
            value="${escapeHtml(item.duration || "")}"
            placeholder="예: 2일, 1주"
            aria-label="${escapeHtml(item.title)} 예상 기간 수정"
          />
        </label>
        <span class="${item.done ? "status-done" : ""}">${item.done ? "완료" : "진행 중"}</span>
      </div>
    `;

    const dragHandle = row.querySelector(".drag-handle");
    dragHandle.addEventListener("dragstart", (event) => {
      draggedChecklistIndex = index;
      row.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    });

    dragHandle.addEventListener("dragend", () => {
      draggedChecklistIndex = null;
      row.classList.remove("dragging");
    });

    row.addEventListener("dragover", (event) => {
      if (draggedChecklistIndex === null || draggedChecklistIndex === index) {
        return;
      }

      event.preventDefault();
      row.classList.add("drag-over");
      event.dataTransfer.dropEffect = "move";
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", async (event) => {
      event.preventDefault();
      row.classList.remove("drag-over");

      const fromIndex = Number(event.dataTransfer.getData("text/plain"));
      const toIndex = index;

      if (!Number.isInteger(fromIndex) || fromIndex === toIndex) {
        return;
      }

      const [movedItem] = checklist.splice(fromIndex, 1);
      checklist.splice(toIndex, 0, movedItem);
      draggedChecklistIndex = null;
      renderProgress();
      await persistProgress();
    });

    row.addEventListener("click", async (event) => {
      if (event.target.closest(".drag-handle") || event.target.closest(".duration-edit")) {
        return;
      }

      if (window.getSelection().toString().trim() !== "") {
        return;
      }

      const checkbox = row.querySelector("input");
      if (event.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
      }

      item.done = checkbox.checked;
      await persistProgress();
      renderProgress();
    });

    const durationInput = row.querySelector(".duration-edit input");
    durationInput.addEventListener("change", async () => {
      item.duration = durationInput.value.trim();
      item.durationEdited = true;
      await persistProgress();
    });

    checklistBox.appendChild(row);
  });

  updateProgressHint();
}

async function persistProgress() {
  syncEditableRoadmap();

  if (!state.session || !state.savedRoadmapId) {
    updateProgressHint();
    return;
  }

  await fetch(`/api/roadmaps/${state.savedRoadmapId}/progress`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      progress: calculateProgress(),
      roadmap: state.roadmap
    })
  });
}

on(goalForm, "input", () => validateGoal(false));
on(goalForm, "change", () => validateGoal(false));

on(fields.targetPeriod, "change", () => {
  fields.customTargetPeriod.classList.add("hidden");
  fields.targetDateRange.classList.add("hidden");
  fields.customTargetPeriod.value = "";
  fields.targetStartDateInput.value = "";
  fields.targetEndDateInput.value = "";
  
  if (fields.targetPeriod.value === "custom") {
    fields.customTargetPeriod.classList.remove("hidden");
    fields.customTargetPeriod.focus();
  } else if (fields.targetPeriod.value === "date") {
    fields.targetDateRange.classList.remove("hidden");
    fields.targetStartDateInput.value = todayDateValue();
    syncDateRangeMin(fields.targetStartDateInput, fields.targetEndDateInput);
    openDatePicker(fields.targetEndDateInput);
  }
  validateGoal(false);
});
on(fields.customTargetPeriod, "input", () => validateGoal(false));
on(fields.targetStartDateInput, "input", () => {
  syncDateRangeMin(fields.targetStartDateInput, fields.targetEndDateInput);
  validateGoal(false);
});
on(fields.targetEndDateInput, "input", () => validateGoal(false));
on(fields.jobRole, "change", () => {
  if (fields.jobRole.value) {
    fields.customJobRole.value = "";
  }

  const roles = Array.from(fields.jobRole.options)
    .map((option) => option.value)
    .filter(Boolean);
  renderRoleSuggestions(roles);
});
on(fields.customJobRole, "input", () => {
  if (fields.customJobRole.value.trim()) {
    fields.jobRole.value = "";
    renderRoleSuggestions(
      Array.from(fields.jobRole.options)
        .map((option) => option.value)
        .filter(Boolean)
    );
  }
});
on(suggestSkillsButton, "click", suggestSkills);
on(suggestRolesButton, "click", suggestRoles);

on(goalForm, "submit", async (event) => {
  event.preventDefault();

  if (!validateGoal(true)) {
    return;
  }

  try {
    await generateRoadmap();
  } catch (error) {
    setLoading(false);
    saveStatus.textContent = error.message;
  }
});

on(loginForm, "submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#loginEmail").value.trim();
  const password = document.querySelector("#loginPassword").value;
  const message = document.querySelector("#loginMessage");

  if (!validateAuthForm(email, password, message)) {
    return;
  }

  try {
    message.textContent = "로그인 중입니다...";
    await signIn(email, password);
    message.textContent = "";
  } catch (error) {
    message.textContent = error.message || "로그인에 실패했습니다.";
  }
});

on(signupForm, "submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#signupEmail").value.trim();
  const password = document.querySelector("#signupPassword").value;
  const message = document.querySelector("#signupMessage");

  if (!validateAuthForm(email, password, message)) {
    return;
  }

  try {
    message.textContent = "회원가입 중입니다...";
    await signUp(email, password);
    message.textContent = "가입이 완료되었습니다. 이메일 확인 설정을 켠 경우 메일 인증 후 로그인하세요.";
  } catch (error) {
    message.textContent = error.message || "회원가입에 실패했습니다.";
  }
});

on(regenerateButton, "click", async () => {
  try {
    await generateRoadmap();
  } catch (error) {
    setLoading(false);
    saveStatus.textContent = error.message;
  }
});

on(saveButton, "click", saveRoadmap);

function recommendCertifications() {
  const customJobRole = fields.customJobRole.value.trim();
  const selectedJob = customJobRole || fields.jobRole.value.trim();

  if (!selectedJob) {
    certHint.textContent = "희망 직무를 먼저 선택하거나 입력해주세요.";
    certHint.style.color = "#dc2626";
    return;
  }

  certHint.textContent = "직무에 맞는 자격증 추천 목록입니다 (클릭해서 추가):";
  certHint.style.color = "";

  const certMap = {
    "백엔드 개발": ["정보처리기사", "SQLD", "AWS Certified Solutions Architect", "AWS Certified Cloud Practitioner"],
    "프론트엔드 개발": ["정보처리기사", "웹디자인기능사", "AWS Certified Cloud Practitioner"],
    "풀스택 개발": ["정보처리기사", "SQLD", "AWS Certified Solutions Architect"],
    "데이터 분석": ["ADsP (데이터분석준전문가)", "SQLD", "빅데이터분석기사", "사회조사분석사 2급"],
    "AI/ML 엔지니어": ["ADsP (데이터분석준전문가)", "ADP (데이터분석전문가)", "빅데이터분석기사"],
    "PM/서비스 기획": ["PMP (Project Management Professional)", "SQLD", "ADsP (데이터분석준전문가)", "컴퓨터활용능력 1급"],
    "UI/UX 디자이너": ["GTQ 그래픽기술자격 1급", "웹디자인기능사", "컴퓨터그래픽스운용기능사"]
  };

  let certs = [];
  const matchedKey = Object.keys(certMap).find(key => selectedJob.includes(key) || key.includes(selectedJob));
  if (matchedKey) {
    certs = certMap[matchedKey];
  } else {
    certs = ["정보처리기사", "SQLD", "ADsP", "AWS Certified Cloud Practitioner"];
  }

  certSuggestions.innerHTML = "";
  certs.forEach((cert) => {
    const button = document.createElement("button");
    button.className = "role-chip";
    button.type = "button";
    button.textContent = cert;
    button.addEventListener("click", () => {
      let currentVal = fields.certifications.value.trim();
      if (currentVal) {
        const items = currentVal.split(/[,，]/).map(i => i.trim()).filter(Boolean);
        if (!items.includes(cert)) {
          items.push(cert);
          fields.certifications.value = items.join(", ");
        }
      } else {
        fields.certifications.value = cert;
      }
      validateGoal(false);
    });
    certSuggestions.appendChild(button);
  });
}

on(recommendCertsButton, "click", recommendCertifications);
if (progressSaveButton) {
  on(progressSaveButton, "click", saveRoadmap);
}

on(startProgressButton, "click", async () => {
  syncEditableRoadmap();

  if (state.session && !state.savedRoadmapId) {
    saveStatus.textContent = "진행 시작과 함께 로드맵을 자동으로 저장하는 중...";
    if (progressSaveStatus) progressSaveStatus.textContent = "자동 저장 중...";
    await saveRoadmap();
  }

  enableStep("progress");
  renderProgress();
  showPanel("progress");
});

on(document.querySelector("#showLoginButton"), "click", () => showPanel("login"));
on(document.querySelector("#showSignupButton"), "click", () => showPanel("signup"));
on(document.querySelector("#goSignupButton"), "click", () => showPanel("signup"));
on(document.querySelector("#goLoginButton"), "click", () => showPanel("login"));
on(document.querySelector("#logoutButton"), "click", signOut);

stepButtons.forEach((button) => {
  on(button, "click", () => {
    if (!button.disabled) {
      showPanel(button.dataset.stepButton);
    }
  });
});

const recalcPeriodButton = document.querySelector("#recalcPeriodButton");
const recalcPeriodForm = document.querySelector("#recalcPeriodForm");
const newTargetPeriod = document.querySelector("#newTargetPeriod");
const newCustomTargetPeriod = document.querySelector("#newCustomTargetPeriod");
const submitRecalcBtn = document.querySelector("#submitRecalcBtn");
const cancelRecalcBtn = document.querySelector("#cancelRecalcBtn");
const newTargetDateLabel = document.querySelector("#newTargetDateLabel");
const newTargetStartDateInput = document.querySelector("#newTargetStartDateInput");
const newTargetEndDateInput = document.querySelector("#newTargetEndDateInput");
const customNewTargetPeriodLabel = document.querySelector("#customNewTargetPeriodLabel");

if (recalcPeriodButton) {
  function syncRecalcPeriodInputs({ openPicker = false } = {}) {
    if (!customNewTargetPeriodLabel || !newTargetDateLabel || !newTargetStartDateInput || !newTargetEndDateInput) {
      return;
    }

    customNewTargetPeriodLabel.classList.add("hidden");
    newTargetDateLabel.classList.add("hidden");

    if (newTargetPeriod.value === "custom") {
      customNewTargetPeriodLabel.classList.remove("hidden");
      if (openPicker) {
        newCustomTargetPeriod.focus();
      }
      return;
    }

    if (newTargetPeriod.value === "date") {
      newTargetDateLabel.classList.remove("hidden");
      if (!newTargetStartDateInput.value) {
        newTargetStartDateInput.value = todayDateValue();
      }
      syncDateRangeMin(newTargetStartDateInput, newTargetEndDateInput);
      if (openPicker) {
        openDatePicker(newTargetEndDateInput);
      }
    }
  }

  recalcPeriodButton.addEventListener("click", () => {
    recalcPeriodForm.classList.remove("hidden");
    recalcPeriodButton.parentElement.classList.add("hidden");
    syncRecalcPeriodInputs();
  });

  cancelRecalcBtn.addEventListener("click", () => {
    recalcPeriodForm.classList.add("hidden");
    recalcPeriodButton.parentElement.classList.remove("hidden");
  });

  newTargetPeriod.addEventListener("change", () => {
    newCustomTargetPeriod.value = "";
    newTargetStartDateInput.value = "";
    newTargetEndDateInput.value = "";
    syncRecalcPeriodInputs({ openPicker: true });
  });

  newTargetStartDateInput.addEventListener("input", () => {
    syncDateRangeMin(newTargetStartDateInput, newTargetEndDateInput);
  });

  submitRecalcBtn.addEventListener("click", async () => {
    let periodVal = newTargetPeriod.value;
    if (periodVal === "custom") {
      periodVal = newCustomTargetPeriod.value.trim();
      if (!periodVal) {
        alert("새로운 준비 기간을 입력해주세요.");
        return;
      }
    } else if (periodVal === "date") {
      if (!newTargetStartDateInput.value || !newTargetEndDateInput.value) {
        alert("시작 날짜와 목표 날짜를 모두 선택해주세요.");
        return;
      }
      if (newTargetEndDateInput.value < newTargetStartDateInput.value) {
        alert("목표 날짜는 시작 날짜 이후로 선택해주세요.");
        return;
      }
      periodVal = `date:${newTargetStartDateInput.value}:${newTargetEndDateInput.value}`;
    }

    state.goal.targetPeriod = periodVal;
    state.goal.createdAt = newTargetPeriod.value === "date"
      ? `${newTargetStartDateInput.value}T00:00:00.000Z`
      : new Date().toISOString();
    
    fields.targetPeriod.value = newTargetPeriod.value;
    fields.customTargetPeriod.classList.toggle("hidden", newTargetPeriod.value !== "custom");
    fields.targetDateRange.classList.toggle("hidden", newTargetPeriod.value !== "date");
    if (newTargetPeriod.value === "custom") {
      fields.customTargetPeriod.value = newCustomTargetPeriod.value;
    } else if (newTargetPeriod.value === "date") {
      fields.targetStartDateInput.value = newTargetStartDateInput.value;
      fields.targetEndDateInput.value = newTargetEndDateInput.value;
      syncDateRangeMin(fields.targetStartDateInput, fields.targetEndDateInput);
    }
    
    const completedTasks = (state.roadmap?.checklist || []).filter(item => item.done);
    
    setLoading(true);
    try {
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state.goal, completedTasks })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to recalculate");
      }
      
      state.roadmap = data.roadmap;
      state.jobPostings = data.jobPostings || data.roadmap?.jobPostings || state.jobPostings;
      if (state.jobPostings.length > 0) {
        state.roadmap.jobPostings = state.jobPostings;
      }
      if (data.certSchedules) {
        state.roadmap.certSchedules = data.certSchedules;
      }
      attachPlanDatesToRoadmap();
      hydrateChecklistDurations();
      renderRoadmap();
      renderProgress();
      
      if (state.session && state.savedRoadmapId) {
        await persistProgress();
      }
      
      alert("준비 기간 재조정이 완료되었습니다.");
      cancelRecalcBtn.click();
    } catch (error) {
      alert("재조정 중 오류가 발생했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  });
}

const addCustomCheckItemBtn = document.querySelector("#addCustomCheckItemBtn");
const customCheckItemTitle = document.querySelector("#customCheckItemTitle");
const customCheckItemDesc = document.querySelector("#customCheckItemDesc");
const customCheckItemPriority = document.querySelector("#customCheckItemPriority");
const customCheckItemPeriod = document.querySelector("#customCheckItemPeriod");

if (addCustomCheckItemBtn) {
  addCustomCheckItemBtn.addEventListener("click", async () => {
    const title = customCheckItemTitle.value.trim();
    if (!title) {
      alert("항목 제목을 입력해주세요.");
      return;
    }
    
    const desc = customCheckItemDesc.value.trim();
    const priority = customCheckItemPriority.value;
    const period = customCheckItemPeriod.value.trim();
    
    const newItem = {
      id: "custom-" + Date.now(),
      title: `[${priority}] ${title}`,
      description: desc,
      duration: period,
      done: false
    };
    
    if (!state.roadmap.checklist) {
      state.roadmap.checklist = [];
    }
    state.roadmap.checklist.push(newItem);
    
    renderProgress();
    
    if (state.session && state.savedRoadmapId) {
      await persistProgress();
    }
    
    customCheckItemTitle.value = "";
    customCheckItemDesc.value = "";
    customCheckItemPeriod.value = "";
  });
}

initSupabaseAuth();
validateGoal(false);
