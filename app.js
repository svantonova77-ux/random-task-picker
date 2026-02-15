const STORAGE_KEY = "random_task_picker_tasks_v1";
const BLOCKS = ["Учеба", "Уборка", "Готовка", "Уход"];

const STARTER_TASKS = [
  { block: "Учеба", title: "Повторить 20 новых слов", period_days: 1, last_done: null },
  { block: "Учеба", title: "Решить 5 задач по математике", period_days: 2, last_done: null },
  { block: "Учеба", title: "Прочитать 10 страниц книги", period_days: 1, last_done: null },
  { block: "Учеба", title: "Сделать конспект одной темы", period_days: 3, last_done: null },
  { block: "Уборка", title: "Протереть пыль на столе и полках", period_days: 2, last_done: null },
  { block: "Уборка", title: "Пропылесосить комнату", period_days: 3, last_done: null },
  { block: "Уборка", title: "Разобрать рабочий стол", period_days: 1, last_done: null },
  { block: "Уборка", title: "Поменять постельное белье", period_days: 7, last_done: null },
  { block: "Готовка", title: "Приготовить простой салат", period_days: 1, last_done: null },
  { block: "Готовка", title: "Сварить суп на 2 дня", period_days: 4, last_done: null },
  { block: "Готовка", title: "Сделать полезный перекус", period_days: 2, last_done: null },
  { block: "Готовка", title: "Испечь что-то к чаю", period_days: 5, last_done: null },
  { block: "Уход", title: "Сделать растяжку 10 минут", period_days: 1, last_done: null },
  { block: "Уход", title: "Нанести увлажняющую маску", period_days: 3, last_done: null },
  { block: "Уход", title: "Сделать прогулку 30 минут", period_days: 1, last_done: null },
  { block: "Уход", title: "Лечь спать до 23:00", period_days: 2, last_done: null },
];

const blockSelect = document.getElementById("block-select");
const pickBtn = document.getElementById("pick-btn");
const doneBtn = document.getElementById("done-btn");
const resetBtn = document.getElementById("reset-btn");
const result = document.getElementById("result");

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
    title: String(task.title || ""),
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
    const starter = STARTER_TASKS.map((task) => ({ ...task }));
    saveTasks(starter);
    return starter;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const starter = STARTER_TASKS.map((task) => ({ ...task }));
      saveTasks(starter);
      return starter;
    }

    const normalized = parsed.map(normalizeTask);
    saveTasks(normalized);
    return normalized;
  } catch {
    const starter = STARTER_TASKS.map((task) => ({ ...task }));
    saveTasks(starter);
    return starter;
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
}

function resetData() {
  const starter = STARTER_TASKS.map((task) => ({ ...task }));
  saveTasks(starter);
  selectedTaskIndex = null;
  doneBtn.classList.add("hidden");
  result.textContent = "Данные сброшены";
}

pickBtn.addEventListener("click", pickRandomTask);
doneBtn.addEventListener("click", markDone);
resetBtn.addEventListener("click", resetData);

loadTasks();
