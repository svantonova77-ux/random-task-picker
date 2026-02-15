const STORAGE_KEY = "random_task_picker_tasks_v1";
const BLOCKS = ["Учеба", "Уборка", "Готовка", "Уход"];

const blockSelect = document.getElementById("block-select");
const pickBtn = document.getElementById("pick-btn");
const doneBtn = document.getElementById("done-btn");
const resetBtn = document.getElementById("reset-btn");
const result = document.getElementById("result");
const addTaskBtn = document.getElementById("add-task-btn");
const taskTitleInput = document.getElementById("task-title");
const taskPeriodInput = document.getElementById("task-period");
const taskList = document.getElementById("task-list");
const emptyBlock = document.getElementById("empty-block");

let selectedTaskIndex = null;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dateFromISO(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function normalizeTask(task) {
  const normalized = {
    block: String(task.block || ""),
    title: String(task.title || "").trim(),
    period_days: Math.max(1, Number(task.period_days) || 1),
    last_done: task.last_done === null ? null : String(task.last_done),
  };

  if (!BLOCKS.includes(normalized.block)) {
    normalized.block = BLOCKS[0];
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.last_done || "")) {
    normalized.last_done = null;
  }

  return normalized;
}

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveTasks([]);
      return [];
    }

    const normalized = parsed.map(normalizeTask).filter((task) => task.title.length > 0);
    saveTasks(normalized);
    return normalized;
  } catch {
    saveTasks([]);
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function isTaskAvailable(task, todayStr) {
  if (task.last_done === null) {
    return true;
  }

  const today = dateFromISO(todayStr);
  const lastDone = dateFromISO(task.last_done);

  if (lastDone > today) {
    return true;
  }

  const nextAvailable = new Date(lastDone);
  nextAvailable.setDate(nextAvailable.getDate() + task.period_days);

  return today >= nextAvailable;
}

function renderTaskList() {
  const chosenBlock = blockSelect.value;
  const tasks = loadTasks();
  const blockTasks = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.block === chosenBlock);

  taskList.innerHTML = "";

  if (blockTasks.length === 0) {
    emptyBlock.classList.remove("hidden");
    return;
  }

  emptyBlock.classList.add("hidden");

  for (const { task, index } of blockTasks) {
    const li = document.createElement("li");
    li.className = "task-item";

    const info = document.createElement("div");
    info.className = "task-meta";

    const titleEl = document.createElement("div");
    titleEl.className = "task-title";
    titleEl.textContent = task.title;

    const periodEl = document.createElement("div");
    periodEl.textContent = `Периодичность: ${task.period_days} дн.`;

    const lastDoneEl = document.createElement("div");
    lastDoneEl.textContent = `Последнее выполнение: ${task.last_done || "никогда"}`;

    info.append(titleEl, periodEl, lastDoneEl);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn danger small";
    deleteBtn.textContent = "Удалить";
    deleteBtn.dataset.index = String(index);

    li.append(info, deleteBtn);
    taskList.append(li);
  }
}

function pickRandomTask() {
  const chosenBlock = blockSelect.value;
  const tasks = loadTasks();
  const todayStr = todayISO();

  const available = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.block === chosenBlock)
    .filter(({ task }) => isTaskAvailable(task, todayStr));

  if (available.length === 0) {
    selectedTaskIndex = null;
    doneBtn.classList.add("hidden");
    result.textContent = "Нет доступных задач в этом блоке\nNO_TASKS";
    return;
  }

  const randomItem = available[Math.floor(Math.random() * available.length)];
  selectedTaskIndex = randomItem.index;
  doneBtn.classList.remove("hidden");
  result.textContent = `${randomItem.task.title}`;
}

function markDone() {
  if (selectedTaskIndex === null) {
    result.textContent = "DONE_ERROR";
    return;
  }

  const tasks = loadTasks();
  if (!tasks[selectedTaskIndex]) {
    selectedTaskIndex = null;
    doneBtn.classList.add("hidden");
    result.textContent = "DONE_ERROR";
    return;
  }

  tasks[selectedTaskIndex].last_done = todayISO();
  saveTasks(tasks);
  selectedTaskIndex = null;
  doneBtn.classList.add("hidden");
  result.textContent = "DONE_OK";
  renderTaskList();
}

function addTask() {
  const title = taskTitleInput.value.trim();
  const periodDays = Math.max(1, Number(taskPeriodInput.value) || 1);

  if (!title) {
    result.textContent = "Введите название задачи";
    taskTitleInput.focus();
    return;
  }

  const tasks = loadTasks();
  tasks.push({
    block: blockSelect.value,
    title,
    period_days: periodDays,
    last_done: null,
  });

  saveTasks(tasks);
  taskTitleInput.value = "";
  taskPeriodInput.value = "1";
  result.textContent = "Задача добавлена";
  renderTaskList();
}

function deleteTask(index) {
  const tasks = loadTasks();
  if (!tasks[index]) {
    return;
  }

  tasks.splice(index, 1);
  saveTasks(tasks);

  selectedTaskIndex = null;
  doneBtn.classList.add("hidden");
  result.textContent = "Задача удалена";
  renderTaskList();
}

function resetData() {
  localStorage.clear();
  selectedTaskIndex = null;
  doneBtn.classList.add("hidden");
  result.textContent = "Данные сброшены";
  renderTaskList();
}

pickBtn.addEventListener("click", pickRandomTask);
doneBtn.addEventListener("click", markDone);
resetBtn.addEventListener("click", resetData);
addTaskBtn.addEventListener("click", addTask);
blockSelect.addEventListener("change", renderTaskList);
taskList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (target.dataset.index !== undefined) {
    deleteTask(Number(target.dataset.index));
  }
});

renderTaskList();
