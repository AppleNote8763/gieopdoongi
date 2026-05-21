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

const fields = {
  company: document.querySelector("#company"),
  jobRole: document.querySelector("#jobRole"),
  customJobRole: document.querySelector("#customJobRole"),
  skills: document.querySelector("#skills"),
  targetPeriod: document.querySelector("#targetPeriod"),
  certifications: document.querySelector("#certifications"),
  firstAction: document.querySelector("#firstAction"),
  portfolioDirection: document.querySelector("#portfolioDirection")
};

function showPanel(name) {
  Object.entries(panels).forEach(([panelName, panel]) => {
    panel.classList.toggle("active", panelName === name);
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
  const selectedSkills = getSelectedSkills();

  return {
    company: fields.company.value.trim(),
    jobRole: customJobRole || fields.jobRole.value.trim(),
    skills: selectedSkills.join(", "),
    level: getSelectedLevel(),
    targetPeriod: fields.targetPeriod.value,
    certifications: fields.certifications.value.trim()
  };
}

function setFieldError(fieldName, message) {
  const input = fields[fieldName];
  const wrapper = input.closest(".field");
  const error = wrapper.querySelector(".error-text");
  wrapper.classList.toggle("invalid", Boolean(message));
  error.textContent = message || "";
}

function validateGoal(showErrors = false) {
  const goal = collectGoal();
  const errors = {
    company: goal.company ? "" : "목표 기업을 입력해주세요.",
    jobRole: goal.jobRole ? "" : "희망 직무를 선택해주세요.",
    skills: "",
    level: goal.level ? "" : "경력 수준을 선택해주세요."
  };

  if (showErrors) {
    setFieldError("company", errors.company);
    setFieldError("jobRole", errors.jobRole);
    setFieldError("skills", errors.skills);
    document.querySelector("#levelError").textContent = errors.level;
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
  loadingBox.classList.toggle("hidden", !isLoading);
  roadmapContent.classList.toggle("hidden", isLoading);
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
  const email = state.session?.user?.email || "로그인하지 않음";

  document.querySelector("#userEmail").textContent = email;
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
    await loadSavedRoadmaps();
  }

  state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    updateAuthUI();

    if (session) {
      await loadSavedRoadmaps();
      showPanel("goal");
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
    return;
  }

  const response = await fetch("/api/roadmaps", {
    headers: getAuthHeaders()
  });

  const data = await response.json();
  if (!response.ok) {
    document.querySelector("#savedRoadmapsHint").textContent =
      data.message || "이전 로드맵을 불러오지 못했습니다.";
    renderSavedRoadmaps([]);
    return;
  }

  renderSavedRoadmaps(data.roadmaps || []);
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

function loadRoadmapFromRecord(record) {
  state.goal = {
    company: record.company,
    jobRole: record.job_role,
    skills: record.skills,
    level: record.level,
    targetPeriod: record.roadmap_result?.estimatedPeriod || "",
    certifications: record.roadmap_result?.certifications || ""
  };
  state.roadmap = record.roadmap_result;
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

  if (fields.certifications) {
    fields.certifications.value = state.goal.certifications;
  }

  enableStep("roadmap");
  enableStep("progress");
  renderTargetSummary();
  renderRoadmap();
  renderProgress();
  setLoading(false);
  updateAuthUI();
  showPanel("progress");
}

function calculateProgress() {
  const checklist = state.roadmap?.checklist || [];
  if (checklist.length === 0) {
    return 0;
  }

  const doneCount = checklist.filter((item) => item.done).length;
  return Math.round((doneCount / checklist.length) * 100);
}

function renderProgress() {
  const checklist = state.roadmap?.checklist || [];
  const doneCount = checklist.filter((item) => item.done).length;
  const percent = calculateProgress();

  document.querySelector("#progressPercent").textContent = `${percent}%`;
  document.querySelector("#progressCount").textContent =
    `${doneCount} / ${checklist.length} 완료`;
  document.querySelector("#progressFill").style.width = `${percent}%`;
  document.querySelector("#remainingText").textContent =
    checklist.length - doneCount > 0
      ? `남은 일정: ${checklist.length - doneCount}개`
      : "모든 일정을 완료했습니다.";

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
      >☰</button>
      <input type="checkbox" ${item.done ? "checked" : ""} aria-label="${item.title} 완료" />
      <div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </div>
      <div class="check-meta">
        <span class="priority-badge">우선순위 ${index + 1}</span>
        <span>${item.duration || "기간 미정"}</span>
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

    row.querySelector("input").addEventListener("change", async (event) => {
      item.done = event.target.checked;
      await persistProgress();
      renderProgress();
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

goalForm.addEventListener("input", () => validateGoal(false));
goalForm.addEventListener("change", () => validateGoal(false));
fields.jobRole.addEventListener("change", () => {
  if (fields.jobRole.value) {
    fields.customJobRole.value = "";
  }

  const roles = Array.from(fields.jobRole.options)
    .map((option) => option.value)
    .filter(Boolean);
  renderRoleSuggestions(roles);
});
fields.customJobRole.addEventListener("input", () => {
  if (fields.customJobRole.value.trim()) {
    fields.jobRole.value = "";
    renderRoleSuggestions(
      Array.from(fields.jobRole.options)
        .map((option) => option.value)
        .filter(Boolean)
    );
  }
});
suggestSkillsButton.addEventListener("click", suggestSkills);
suggestRolesButton.addEventListener("click", suggestRoles);

goalForm.addEventListener("submit", async (event) => {
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

loginForm.addEventListener("submit", async (event) => {
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

signupForm.addEventListener("submit", async (event) => {
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

regenerateButton.addEventListener("click", async () => {
  try {
    await generateRoadmap();
  } catch (error) {
    setLoading(false);
    saveStatus.textContent = error.message;
  }
});

saveButton.addEventListener("click", saveRoadmap);

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

recommendCertsButton.addEventListener("click", recommendCertifications);
if (progressSaveButton) {
  progressSaveButton.addEventListener("click", saveRoadmap);
}

startProgressButton.addEventListener("click", async () => {
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

document.querySelector("#showLoginButton").addEventListener("click", () => showPanel("login"));
document.querySelector("#showSignupButton").addEventListener("click", () => showPanel("signup"));
document.querySelector("#goSignupButton").addEventListener("click", () => showPanel("signup"));
document.querySelector("#goLoginButton").addEventListener("click", () => showPanel("login"));
document.querySelector("#logoutButton").addEventListener("click", signOut);

stepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!button.disabled) {
      showPanel(button.dataset.stepButton);
    }
  });
});

initSupabaseAuth();
validateGoal(false);
