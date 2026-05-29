const STORAGE_KEY = 'taskflow.tasks.v1';

const priorityLabels = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const seedTasks = [
  {
    id: 'seed-1',
    title: 'Сформировать список задач',
    description: 'Опишите ключевые задачи проекта и назначьте приоритеты.',
    priority: 'high',
    dueDate: todayOffset(1),
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    title: 'Провести ежедневный обзор',
    description: 'Проверьте прогресс и переведите выполненные задачи в статус готово.',
    priority: 'medium',
    dueDate: todayOffset(0),
    completed: true,
    createdAt: new Date().toISOString(),
  },
];

function todayOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function createTask({ title, description = '', priority = 'medium', dueDate = '' }) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error('Task title is required');
  }

  return {
    id: crypto.randomUUID(),
    title: trimmedTitle,
    description: description.trim(),
    priority,
    dueDate,
    completed: false,
    createdAt: new Date().toISOString(),
  };
}

export function isOverdue(task, now = new Date()) {
  if (!task.dueDate || task.completed) {
    return false;
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${task.dueDate}T00:00:00`);

  return dueDate < today;
}

export function getTaskStats(tasks, now = new Date()) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const overdue = tasks.filter((task) => isOverdue(task, now)).length;
  const active = total - completed;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, active, completed, overdue, completionRate };
}

export function filterTasks(tasks, { status = 'all', query = '' } = {}, now = new Date()) {
  const normalizedQuery = query.trim().toLowerCase();

  return tasks.filter((task) => {
    const matchesStatus =
      status === 'all' ||
      (status === 'completed' && task.completed) ||
      (status === 'active' && !task.completed) ||
      (status === 'overdue' && isOverdue(task, now));
    const searchableText = `${task.title} ${task.description}`.toLowerCase();
    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
}

function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return seedTasks;
  }

  try {
    return JSON.parse(savedTasks);
  } catch {
    return seedTasks;
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(value) {
  if (!value) {
    return 'Без срока';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function renderTask(task, template, handlers) {
  const item = template.content.firstElementChild.cloneNode(true);
  const title = item.querySelector('h3');
  const description = item.querySelector('.task-card__description');
  const badge = item.querySelector('.badge');
  const meta = item.querySelector('.task-card__meta');
  const toggleButton = item.querySelector('[data-action="toggle"]');
  const deleteButton = item.querySelector('[data-action="delete"]');

  item.dataset.priority = task.priority;
  item.classList.toggle('task-card--done', task.completed);
  title.textContent = task.title;
  description.textContent = task.description || 'Описание не указано';
  badge.textContent = priorityLabels[task.priority] ?? priorityLabels.medium;
  badge.dataset.priority = task.priority;
  meta.textContent = `${task.completed ? 'Выполнено' : 'В работе'} · Срок: ${formatDate(task.dueDate)}`;
  toggleButton.textContent = task.completed ? 'Вернуть в работу' : 'Выполнить';
  toggleButton.addEventListener('click', () => handlers.onToggle(task.id));
  deleteButton.addEventListener('click', () => handlers.onDelete(task.id));

  return item;
}

function bootstrap() {
  const form = document.querySelector('#task-form');
  const list = document.querySelector('#task-list');
  const template = document.querySelector('#task-template');
  const emptyState = document.querySelector('#empty-state');
  const search = document.querySelector('#search');
  const statusFilter = document.querySelector('#status-filter');
  const completionRate = document.querySelector('#completion-rate');
  const metrics = {
    total: document.querySelector('#metric-total'),
    active: document.querySelector('#metric-active'),
    completed: document.querySelector('#metric-completed'),
    overdue: document.querySelector('#metric-overdue'),
  };

  let tasks = loadTasks();

  function persistAndRender() {
    saveTasks(tasks);
    render();
  }

  function render() {
    const visibleTasks = filterTasks(tasks, {
      status: statusFilter.value,
      query: search.value,
    });
    const stats = getTaskStats(tasks);

    list.replaceChildren(
      ...visibleTasks.map((task) =>
        renderTask(task, template, {
          onToggle(id) {
            tasks = tasks.map((currentTask) =>
              currentTask.id === id ? { ...currentTask, completed: !currentTask.completed } : currentTask,
            );
            persistAndRender();
          },
          onDelete(id) {
            tasks = tasks.filter((currentTask) => currentTask.id !== id);
            persistAndRender();
          },
        }),
      ),
    );

    emptyState.hidden = visibleTasks.length > 0;
    completionRate.textContent = `${stats.completionRate}%`;
    metrics.total.textContent = stats.total;
    metrics.active.textContent = stats.active;
    metrics.completed.textContent = stats.completed;
    metrics.overdue.textContent = stats.overdue;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const task = createTask(Object.fromEntries(formData.entries()));

    tasks = [task, ...tasks];
    form.reset();
    document.querySelector('#task-priority').value = 'medium';
    persistAndRender();
  });

  search.addEventListener('input', render);
  statusFilter.addEventListener('change', render);
  render();
}

if (typeof document !== 'undefined') {
  bootstrap();
}
