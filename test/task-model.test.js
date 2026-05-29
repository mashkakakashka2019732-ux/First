import test from 'node:test';
import assert from 'node:assert/strict';
import { createTask, filterTasks, getTaskStats, isOverdue } from '../src/app.js';

test('createTask trims input and creates an active task', () => {
  const task = createTask({
    title: '  Подготовить релиз  ',
    description: '  Проверить чеклист  ',
    priority: 'high',
    dueDate: '2026-06-01',
  });

  assert.equal(task.title, 'Подготовить релиз');
  assert.equal(task.description, 'Проверить чеклист');
  assert.equal(task.priority, 'high');
  assert.equal(task.completed, false);
  assert.match(task.id, /.+/);
});

test('createTask rejects an empty title', () => {
  assert.throws(() => createTask({ title: '   ' }), /Task title is required/);
});

test('isOverdue ignores completed tasks and detects active overdue tasks', () => {
  const now = new Date('2026-05-29T12:00:00Z');

  assert.equal(isOverdue({ dueDate: '2026-05-28', completed: false }, now), true);
  assert.equal(isOverdue({ dueDate: '2026-05-28', completed: true }, now), false);
  assert.equal(isOverdue({ dueDate: '2026-05-29', completed: false }, now), false);
});

test('getTaskStats returns dashboard counters', () => {
  const now = new Date('2026-05-29T12:00:00Z');
  const tasks = [
    { completed: false, dueDate: '2026-05-28' },
    { completed: true, dueDate: '2026-05-27' },
    { completed: false, dueDate: '2026-06-01' },
  ];

  assert.deepEqual(getTaskStats(tasks, now), {
    total: 3,
    active: 2,
    completed: 1,
    overdue: 1,
    completionRate: 33,
  });
});

test('filterTasks combines status and text search', () => {
  const now = new Date('2026-05-29T12:00:00Z');
  const tasks = [
    { title: 'Написать тесты', description: 'Покрыть модель', completed: false, dueDate: '2026-06-01' },
    { title: 'Закрыть баг', description: 'Просроченный дефект', completed: false, dueDate: '2026-05-27' },
    { title: 'Обновить README', description: 'Документация', completed: true, dueDate: '2026-05-27' },
  ];

  assert.deepEqual(filterTasks(tasks, { status: 'overdue', query: 'баг' }, now), [tasks[1]]);
  assert.deepEqual(filterTasks(tasks, { status: 'completed', query: 'readme' }, now), [tasks[2]]);
});
