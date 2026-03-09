const STORAGE_KEYS = {
  profile: "profile",
  tasks: "tasks",
  user: "user",
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key} from storage`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStoredTasks() {
  return readJson(STORAGE_KEYS.tasks, []);
}

function getStoredProfile() {
  return readJson(STORAGE_KEYS.profile, {});
}

function getStoredUser() {
  return localStorage.getItem(STORAGE_KEYS.user) || "";
}

function hasPrototypeSession() {
  return getStoredUser().trim() !== "";
}

function updatePrototypeRouteState() {
  const currentPage = document.body.dataset.page || "auth";
  const isAuthPage = currentPage === "auth";

  if (isAuthPage && hasPrototypeSession()) {
    window.location.replace("dashboard.html");
    return false;
  }

  if (!isAuthPage && !hasPrototypeSession()) {
    window.location.replace("index.html");
    return false;
  }

  return true;
}

function setActiveNavLink() {
  const currentPage = document.body.dataset.page;
  if (!currentPage) return;

  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const isActive = link.dataset.navLink === currentPage;
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function login() {
  const email = document.getElementById("email");
  if (!email) return;

  const emailValue = email.value.trim();

  if (emailValue === "") {
    alert("Enter an email to open the prototype.");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.user, emailValue);
  window.location.href = "dashboard.html";
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.user);
  window.location.href = "index.html";
}

let tasks = getStoredTasks();

function saveTasks() {
  writeJson(STORAGE_KEYS.tasks, tasks);
}

function addTask() {
  const input = document.getElementById("taskInput");
  const type = document.getElementById("taskType");
  const dueDate = document.getElementById("taskDueDate");

  if (!input || !type || !dueDate) return;

  const taskText = input.value.trim();
  if (taskText === "") return;

  tasks.push({
    text: taskText,
    status: "pending",
    type: type.value,
    dueDate: dueDate.value,
  });

  saveTasks();
  renderTasks();
  updateDashboard();
  updateDashboardDetails();

  input.value = "";
  type.value = "Feature";
  dueDate.value = "";
}

function deleteTask(index) {
  if (!tasks[index]) return;

  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
  updateDashboard();
  updateDashboardDetails();
}

function createLaneCount(count) {
  const label = document.createElement("p");
  label.className = "lane-count";
  label.innerText = `${count} ${count === 1 ? "task" : "tasks"}`;
  return label;
}

function renderTasks() {
  const pending = document.getElementById("pending");
  const progress = document.getElementById("progress");
  const deployed = document.getElementById("deployed");

  if (!pending || !progress || !deployed) return;

  pending.innerHTML = "";
  progress.innerHTML = "";
  deployed.innerHTML = "";

  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const progressTasks = tasks.filter((task) => task.status === "progress");
  const deployedTasks = tasks.filter((task) => task.status === "deployed");

  pending.appendChild(createLaneCount(pendingTasks.length));
  progress.appendChild(createLaneCount(progressTasks.length));
  deployed.appendChild(createLaneCount(deployedTasks.length));

  tasks.forEach((task, index) => {
    const card = document.createElement("div");
    card.className = "task";
    card.draggable = true;
    card.dataset.index = index;

    const textSpan = document.createElement("span");
    textSpan.innerText = task.text;
    textSpan.addEventListener("click", (event) => {
      event.stopPropagation();
      editTask(index);
    });

    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", String(index));
    });

    const typeTag = document.createElement("small");
    typeTag.className = "task-type";
    typeTag.innerText = task.type || "Feature";

    const dueTag = document.createElement("small");
    dueTag.className = "task-due";
    dueTag.innerText = task.dueDate ? `Due ${task.dueDate}` : "No date";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.innerText = "X";
    deleteBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteTask(index);
    });

    card.append(textSpan, typeTag, dueTag, deleteBtn);

    if (task.status === "pending") {
      pending.appendChild(card);
    } else if (task.status === "progress") {
      progress.appendChild(card);
    } else {
      deployed.appendChild(card);
    }
  });
}

function updateDashboard() {
  const storedTasks = getStoredTasks();

  const totalEl = document.getElementById("totalTasks");
  const pendingEl = document.getElementById("pendingTasks");
  const progressEl = document.getElementById("progressTasks");
  const deployedEl = document.getElementById("deployedTasks");

  if (!totalEl || !pendingEl || !progressEl || !deployedEl) return;

  totalEl.innerText = storedTasks.length;
  pendingEl.innerText = storedTasks.filter((task) => task.status === "pending").length;
  progressEl.innerText = storedTasks.filter((task) => task.status === "progress").length;
  deployedEl.innerText = storedTasks.filter((task) => task.status === "deployed").length;
}

function updateDashboardDetails() {
  const storedTasks = getStoredTasks();

  const completionRateEl = document.getElementById("completionRate");
  const completionBarEl = document.getElementById("completionBar");
  const recentTasksEl = document.getElementById("recentTasks");

  if (!completionRateEl || !completionBarEl || !recentTasksEl) return;

  const deployedCount = storedTasks.filter((task) => task.status === "deployed").length;
  const percentage = storedTasks.length === 0 ? 0 : Math.round((deployedCount / storedTasks.length) * 100);

  completionRateEl.innerText = `${percentage}% shipped`;
  completionBarEl.style.width = `${percentage}%`;
  recentTasksEl.innerHTML = "";

  if (storedTasks.length === 0) {
    recentTasksEl.innerHTML = "<p>No tasks yet. Add work items from the task board.</p>";
    return;
  }

  storedTasks
    .slice(-3)
    .reverse()
    .forEach((task) => {
      const item = document.createElement("p");
      item.innerText = `${task.text} - ${task.status}`;
      recentTasksEl.appendChild(item);
    });
}

function saveProfile() {
  const profile = {
    name: document.getElementById("profileName")?.value.trim() || "",
    role: document.getElementById("profileRole")?.value.trim() || "",
    about: document.getElementById("profileAbout")?.value.trim() || "",
    portfolio: document.getElementById("profilePortfolio")?.value.trim() || "",
    contact: document.getElementById("profileContact")?.value.trim() || "",
  };

  writeJson(STORAGE_KEYS.profile, profile);
  loadProfile();
  showUser();
}

function loadProfile() {
  const profile = getStoredProfile();

  const nameInput = document.getElementById("profileName");
  const roleInput = document.getElementById("profileRole");
  const aboutInput = document.getElementById("profileAbout");
  const portfolioInput = document.getElementById("profilePortfolio");
  const contactInput = document.getElementById("profileContact");

  if (nameInput) nameInput.value = profile.name || "";
  if (roleInput) roleInput.value = profile.role || "";
  if (aboutInput) aboutInput.value = profile.about || "";
  if (portfolioInput) portfolioInput.value = profile.portfolio || "";
  if (contactInput) contactInput.value = profile.contact || "";

  const previewName = document.getElementById("previewName");
  const previewRole = document.getElementById("previewRole");
  const previewAbout = document.getElementById("previewAbout");
  const previewPortfolio = document.getElementById("previewPortfolio");
  const previewContact = document.getElementById("previewContact");

  if (previewName) previewName.innerText = profile.name || "Builder Name";
  if (previewRole) previewRole.innerText = profile.role || "Role";
  if (previewAbout) {
    previewAbout.innerText = profile.about || "Add an about section to make the product feel complete.";
  }
  if (previewPortfolio) {
    previewPortfolio.innerText = profile.portfolio || "No portfolio links saved yet.";
  }
  if (previewContact) {
    previewContact.innerText = profile.contact || "No contact information saved yet.";
  }

  const dashboardProfileName = document.getElementById("dashboardProfileName");
  const dashboardProfileRole = document.getElementById("dashboardProfileRole");
  const dashboardProfileAbout = document.getElementById("dashboardProfileAbout");
  const dashboardProfilePortfolio = document.getElementById("dashboardProfilePortfolio");
  const dashboardProfileContact = document.getElementById("dashboardProfileContact");

  if (dashboardProfileName) {
    dashboardProfileName.innerText = profile.name || "Builder Profile";
  }
  if (dashboardProfileRole) {
    dashboardProfileRole.innerText = profile.role || "No role saved yet.";
  }
  if (dashboardProfileAbout) {
    dashboardProfileAbout.innerText =
      profile.about || "Add your about section to make the prototype feel like a real product.";
  }
  if (dashboardProfilePortfolio) {
    dashboardProfilePortfolio.innerText = profile.portfolio || "Portfolio not set";
  }
  if (dashboardProfileContact) {
    dashboardProfileContact.innerText = profile.contact || "Contact not set";
  }
}

function showUser() {
  const greeting = document.getElementById("userGreeting");
  if (!greeting) return;

  const profile = getStoredProfile();
  const savedUser = getStoredUser();

  if (profile.name && profile.name.trim() !== "") {
    greeting.innerText = profile.name;
  } else if (savedUser) {
    greeting.innerText = savedUser;
  } else {
    greeting.innerText = "Builder";
  }
}

function setupDrop(column, status) {
  if (!column) return;

  column.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  column.addEventListener("drop", (event) => {
    event.preventDefault();

    const index = event.dataTransfer.getData("text/plain");
    if (index === "" || !tasks[index]) return;

    tasks[index].status = status;
    saveTasks();
    renderTasks();
    updateDashboard();
    updateDashboardDetails();
  });
}

function editTask(index) {
  if (!tasks[index]) return;

  const newText = prompt("Edit task name:", tasks[index].text);
  if (newText === null) return;

  const cleanedText = newText.trim();
  if (cleanedText === "") return;

  tasks[index].text = cleanedText;
  saveTasks();
  renderTasks();
  updateDashboard();
  updateDashboardDetails();
}

document.addEventListener("DOMContentLoaded", () => {
  if (!updatePrototypeRouteState()) return;

  tasks = getStoredTasks();
  setActiveNavLink();

  const loginForm = document.getElementById("loginForm");
  const taskForm = document.getElementById("taskForm");
  const profileForm = document.getElementById("profileForm");
  const logoutButton = document.getElementById("logoutButton");
  const pendingCol = document.getElementById("pending");
  const progressCol = document.getElementById("progress");
  const deployedCol = document.getElementById("deployed");

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      login();
    });
  }

  if (taskForm) {
    taskForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addTask();
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveProfile();
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  setupDrop(pendingCol, "pending");
  setupDrop(progressCol, "progress");
  setupDrop(deployedCol, "deployed");

  renderTasks();
  updateDashboard();
  updateDashboardDetails();
  loadProfile();
  showUser();
});
