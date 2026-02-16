const STORAGE_KEY = "random_task_picker_tasks_v1";
const BLOCKS_STORAGE_KEY = "random_task_picker_blocks_v1";

const blockSelect = document.getElementById("block-select");
const addBlockBtn = document.getElementById("add-block-btn");
const renameBlockBtn = document.getElementById("rename-block-btn");
const deleteBlockBtn = document.getElementById("delete-block-btn");
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

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveBlocks(blocks) {
  localStorage.setItem(BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
}

function normalizeBlockName(name) {
  return String(name || "").trim();
}

function normalizeTask(task, blocks) {
  const normalized = {
    block: normalizeBlockName(task.block),
    title: String(task.title || "").trim(),
    period_days: Math.max(1, Number(task.period_days) || 1),
    last_done: task.last_done === null ? null : String(task.last_done),
  };

  if (!normalized.block) {
    normalized.block = blocks[0];
  }

  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(normalized.last_done || "")) {
    normalized.last_done = null;
  }

  return normalized;
}

function loadBlocks() {
  const raw = localStorage.getItem(BLOCKS_STORAGE_KEY);
  if (!raw) {
    const defaults = ["Мой блок"];
    saveBlocks(defaults);
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const defaults = ["Мой блок"];
      saveBlocks(defaults);
      return defaults;
    }

    if (parsed.length === 0) {
      const defaults = ["Мой блок"];
      saveBlocks(defaults);
      return defaults;
    }

    const hasEmpty = parsed.some((item) => normalizeBlockName(item).length === 0);
    if (hasEmpty) {
      const defaults = ["Мой блок"];
      saveBlocks(defaults);
      return defaults;
    }

    const cleaned = [];
    for (const item of parsed) {
      const name = normalizeBlockName(item);
      if (name && !cleaned.includes(name)) {
        cleaned.push(name);
      }
    }

    if (cleaned.length === 0) {
      const defaults = ["Мой блок"];
      saveBlocks(defaults);
      return defaults;
    }

    if (cleaned.length !== parsed.length) {
      saveBlocks(cleaned);
    }

    return cleaned;
  } catch {
    const defaults = ["Мой блок"];
    saveBlocks(defaults);
    return defaults;
  }
}

function loadTasks() {
  const blocks = loadBlocks();
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

    const normalized = parsed.map((task) => normalizeTask(task, blocks)).filter((task) => task.title.length > 0);
    saveTasks(normalized);
    return normalized;
  } catch {
    saveTasks([]);
    return [];
  }
}

function migrateTasksToExistingBlocks(blocks) {
  const rawTasks = localStorage.getItem(STORAGE_KEY);
  if (!rawTasks) {
    return;
  }

  let parsedTasks = [];
  try {
    const candidate = JSON.parse(rawTasks);
    if (Array.isArray(candidate)) {
      parsedTasks = candidate;
    }
  } catch {
    parsedTasks = [];
  }

  const migrated = parsedTasks.map((task) => {
    const normalizedTask = normalizeTask(task, blocks);
    if (!blocks.includes(normalizedTask.block)) {
      normalizedTask.block = blocks[0];
    }
    return normalizedTask;
  });

  saveTasks(migrated);
}

function initializeData() {
  const blocks = loadBlocks();
  migrateTasksToExistingBlocks(blocks);

  const normalizedTasks = loadTasks();
  saveTasks(normalizedTasks);

  renderBlockOptions();
}

function renderBlockOptions(preferredBlock) {
  const blocks = loadBlocks();
  const currentBlock = preferredBlock || blockSelect.value;
  const selectedBlock = blocks.includes(currentBlock) ? currentBlock : blocks[0];

  blockSelect.innerHTML = "";
  for (const block of blocks) {
    const option = document.createElement("option");
    option.value = block;
    option.textContent = block;
    blockSelect.append(option);
  }

  blockSelect.value = selectedBlock;
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
  const blocks = loadBlocks();
  const chosenBlock = blocks.includes(blockSelect.value) ? blockSelect.value : blocks[0];
  if (blockSelect.value !== chosenBlock) {
    blockSelect.value = chosenBlock;
  }

  const tasks = loadTasks();
  const blockTasks = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.block === chosenBlock);

  const diagnostics = document.getElementById("diagnostics");
  diagnostics.textContent = `Блоков: ${blocks.length}, Задач в блоке: ${blockTasks.length}`;

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

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const taskDoneBtn = document.createElement("button");
    taskDoneBtn.className = "btn success small";
    taskDoneBtn.textContent = "Сделано";
    taskDoneBtn.dataset.action = "done";
    taskDoneBtn.dataset.index = String(index);

    const editBtn = document.createElement("button");
    editBtn.className = "btn small";
    editBtn.textContent = "Редактировать";
    editBtn.dataset.action = "edit";
    editBtn.dataset.index = String(index);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn danger small";
    deleteBtn.textContent = "Удалить";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.index = String(index);

    actions.append(taskDoneBtn, editBtn, deleteBtn);
    li.append(info, actions);
    taskList.append(li);
  }
}

function refreshUI(preferredBlock) {
  renderBlockOptions(preferredBlock);
  renderTaskList();
}

function clearSelectedTask() {
  selectedTaskIndex = null;
  doneBtn.classList.add("hidden");
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
    clearSelectedTask();
    result.textContent = "Нет доступных задач в этом блоке\nNO_TASKS";
    return;
  }

  const randomItem = available[Math.floor(Math.random() * available.length)];
  selectedTaskIndex = randomItem.index;
  doneBtn.classList.remove("hidden");
  result.textContent = `${randomItem.task.title}`;
}

function markSelectedDone() {
  if (selectedTaskIndex === null) {
    result.textContent = "DONE_ERROR";
    return;
  }

  markTaskDone(selectedTaskIndex);
}

function markTaskDone(index) {
  const tasks = loadTasks();
  if (!tasks[index]) {
    clearSelectedTask();
    result.textContent = "DONE_ERROR";
    return;
  }

  tasks[index].last_done = todayISO();
  saveTasks(tasks);

  if (selectedTaskIndex === index) {
    clearSelectedTask();
  }

  result.textContent = "DONE_OK";
  renderTaskList();
}

function addTask() {
  const blocks = loadBlocks();
  const selectedBlock = blocks.includes(blockSelect.value) ? blockSelect.value : "";
  if (!selectedBlock) {
    result.textContent = "Не выбран блок для добавления задачи";
    refreshUI(blocks[0]);
    return;
  }

  const title = taskTitleInput.value.trim();
  const periodDays = Math.max(1, Number(taskPeriodInput.value) || 1);

  if (!title) {
    result.textContent = "Введите название задачи";
    taskTitleInput.focus();
    return;
  }

  const tasks = loadTasks();
  tasks.push({
    block: selectedBlock,
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

function editTask(index) {
  const tasks = loadTasks();
  if (!tasks[index]) {
    return;
  }

  const currentTask = tasks[index];
  const nextTitleRaw = prompt("Новое название задачи", currentTask.title);
  if (nextTitleRaw === null) {
    return;
  }

  const nextTitle = nextTitleRaw.trim();
  if (!nextTitle) {
    result.textContent = "Название не может быть пустым";
    return;
  }

  const nextPeriodRaw = prompt("Новая периодичность (дней)", String(currentTask.period_days));
  if (nextPeriodRaw === null) {
    return;
  }

  const nextPeriod = Math.max(1, Number(nextPeriodRaw) || 0);
  if (!Number.isFinite(nextPeriod) || nextPeriod < 1) {
    result.textContent = "Периодичность должна быть от 1 дня";
    return;
  }

  currentTask.title = nextTitle;
  currentTask.period_days = nextPeriod;
  saveTasks(tasks);

  result.textContent = "Задача обновлена";
  renderTaskList();
}

function deleteTask(index) {
  const tasks = loadTasks();
  if (!tasks[index]) {
    return;
  }

  tasks.splice(index, 1);
  saveTasks(tasks);

  if (selectedTaskIndex === index) {
    clearSelectedTask();
  } else if (selectedTaskIndex !== null && selectedTaskIndex > index) {
    selectedTaskIndex -= 1;
  }

  result.textContent = "Задача удалена";
  renderTaskList();
}

function addBlock() {
  const nameRaw = prompt("Название нового блока");
  if (nameRaw === null) {
    return;
  }

  const name = normalizeBlockName(nameRaw);
  if (!name) {
    result.textContent = "Название блока не может быть пустым";
    return;
  }

  const blocks = loadBlocks();
  if (blocks.includes(name)) {
    result.textContent = "Блок с таким названием уже существует";
    return;
  }

  blocks.push(name);
  saveBlocks(blocks);
  clearSelectedTask();
  result.textContent = "Блок добавлен";
  refreshUI(name);
}

function renameBlock() {
  const currentBlock = blockSelect.value;
  if (!currentBlock) {
    refreshUI(loadBlocks()[0]);
    return;
  }

  const nameRaw = prompt("Новое название блока", currentBlock);
  if (nameRaw === null) {
    return;
  }

  const nextName = normalizeBlockName(nameRaw);
  if (!nextName) {
    result.textContent = "Название блока не может быть пустым";
    return;
  }

  const blocks = loadBlocks();
  if (nextName !== currentBlock && blocks.includes(nextName)) {
    result.textContent = "Блок с таким названием уже существует";
    return;
  }

  const updatedBlocks = blocks.map((block) => (block === currentBlock ? nextName : block));
  saveBlocks(updatedBlocks);

  const tasks = loadTasks().map((task) => (task.block === currentBlock ? { ...task, block: nextName } : task));
  saveTasks(tasks);

  clearSelectedTask();
  result.textContent = "Блок переименован";
  refreshUI(nextName);
}

function deleteBlock() {
  const currentBlock = blockSelect.value;
  const blocks = loadBlocks();

  if (!currentBlock || !blocks.includes(currentBlock)) {
    refreshUI(blocks[0]);
    return;
  }

  if (!confirm(`Удалить блок «${currentBlock}»?`)) {
    return;
  }

  const tasks = loadTasks();
  const blockTasksCount = tasks.filter((task) => task.block === currentBlock).length;

  let mode = "A";
  if (blockTasksCount > 0) {
    const modeRaw = prompt(
      "Что сделать с задачами блока?\nA — удалить все задачи блока\nB — перенести в другой блок\nВведите A или B",
      "A",
    );

    if (modeRaw === null) {
      return;
    }

    mode = modeRaw.trim().toUpperCase();
    if (!["A", "B"].includes(mode)) {
      result.textContent = "Нужно выбрать A или B";
      return;
    }
  }

  const remainingBlocks = blocks.filter((block) => block !== currentBlock);
  let updatedTasks = tasks;
  let nextSelectedBlock = remainingBlocks[0] || "Мой блок";

  if (mode === "A") {
    updatedTasks = tasks.filter((task) => task.block !== currentBlock);
  } else {
    if (remainingBlocks.length === 0) {
      result.textContent = "Нельзя перенести задачи: нет другого блока";
      return;
    }

    const targetRaw = prompt(
      `Введите название блока для переноса:\n${remainingBlocks.join(", ")}`,
      remainingBlocks[0],
    );

    if (targetRaw === null) {
      return;
    }

    const targetBlock = normalizeBlockName(targetRaw);
    if (!remainingBlocks.includes(targetBlock)) {
      result.textContent = "Укажите существующий блок для переноса";
      return;
    }

    updatedTasks = tasks.map((task) => (task.block === currentBlock ? { ...task, block: targetBlock } : task));
    nextSelectedBlock = targetBlock;
  }

  const finalBlocks = remainingBlocks.length > 0 ? remainingBlocks : ["Мой блок"];
  saveBlocks(finalBlocks);
  saveTasks(updatedTasks);

  clearSelectedTask();
  result.textContent = "Блок удален";
  refreshUI(nextSelectedBlock);
}

function resetData() {
  localStorage.clear();
  clearSelectedTask();
  initializeData();
  result.textContent = "Данные сброшены";
  renderTaskList();
}

pickBtn.addEventListener("click", pickRandomTask);
doneBtn.addEventListener("click", markSelectedDone);
resetBtn.addEventListener("click", resetData);
addTaskBtn.addEventListener("click", addTask);
addBlockBtn.addEventListener("click", addBlock);
renameBlockBtn.addEventListener("click", renameBlock);
deleteBlockBtn.addEventListener("click", deleteBlock);
blockSelect.addEventListener("change", () => {
  clearSelectedTask();
  renderTaskList();
});

taskList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const index = Number(target.dataset.index);
  if (!Number.isInteger(index)) {
    return;
  }

  if (target.dataset.action === "done") {
    markTaskDone(index);
    return;
  }

  if (target.dataset.action === "edit") {
    editTask(index);
    return;
  }

  if (target.dataset.action === "delete") {
    deleteTask(index);
  }
});

initializeData();
renderTaskList();
