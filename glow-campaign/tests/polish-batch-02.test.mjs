import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
  }
}

function classList() {
  const values = new Set();
  return {
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    toggle: (item, force) => {
      if (force === true) values.add(item);
      else if (force === false) values.delete(item);
      else if (values.has(item)) values.delete(item);
      else values.add(item);
    },
    contains: (item) => values.has(item)
  };
}

function element() {
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    readOnly: false,
    style: {},
    dataset: {},
    classList: classList(),
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; }
  };
}

function loadScript(path) {
  const GlowApp = {};
  const elements = new Map();
  const context = {
    window: { GlowApp },
    GlowApp,
    console,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    fetch: async () => { throw new Error('unexpected fetch'); },
    navigator: {},
    document: {
      getElementById: (id) => elements.get(id) || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => element()
    }
  };
  vm.createContext(context);
  vm.runInContext(read(path), context, { filename: path });
  context.elements = elements;
  return context;
}

await test('Nutrition render completes and updates all progress bars when food log drives nutrition', () => {
  const context = loadScript('js/day-view.js');
  const ids = [
    'calories-input', 'protein-input', 'fibre-input', 'nutrition-card',
    'calories-target-copy', 'protein-target-copy', 'fibre-target-copy',
    'calories-status', 'protein-status', 'fibre-status',
    'calories-target-fill', 'protein-target-fill', 'fibre-target-fill'
  ];
  ids.forEach((id) => context.elements.set(id, element()));

  context.GlowApp.FoodLog = { hasItems: () => true };
  context.GlowApp.Scoring = {
    getNutritionScore: () => ({
      goals: {
        calories: { min: 1200, max: 1500, status: 'below', complete: false },
        protein: { min: 90, status: 'below', complete: false },
        fibre: { min: 25, status: 'below', complete: false }
      }
    }),
    getCaloriesBarPercent: () => 25,
    getProteinBarPercent: () => 40,
    getFibreBarPercent: () => 60
  };

  const day = {
    nutrition: { calories: 300, protein: 36, fibre: 15, source: 'foodLog' }
  };

  context.GlowApp.DayView.renderNutrition(day, {});

  assert.equal(context.elements.get('calories-target-fill').style.width, '25%');
  assert.equal(context.elements.get('protein-target-fill').style.width, '40%');
  assert.equal(context.elements.get('fibre-target-fill').style.width, '60%');
  assert.equal(context.elements.get('calories-input').readOnly, true);
});

await test('Today timeline renders custom Other activities from the schedule', () => {
  const context = loadScript('js/day-view.js');
  const timeline = element();
  context.elements.set('today-timeline', timeline);

  context.GlowApp.DayView.renderTimeline({
    schedule: [
      { id: 'custom-1', category: 'custom', label: 'Check tickets', period: 'morning' }
    ]
  });

  assert.match(timeline.innerHTML, /Check tickets/);
});

await test('Meal calories sit in the same colored strip as meal name and plus action', () => {
  const html = read('index.html');
  const strips = [...html.matchAll(/<div class="meal-log__header meal-log__strip">[\s\S]*?<\/div>\s*<div[\s\S]*?data-meal-items=/g)];
  assert.equal(strips.length, 4);
  for (const strip of strips) {
    assert.match(strip[0], /data-meal-calories=/);
    assert.match(strip[0], /class="meal-add-food"/);
  }
});

await test('Food rows render delete as a swipe-reveal action rather than a permanent button', () => {
  const context = loadScript('js/food-log.js');
  const itemsContainer = element();
  const calories = element();
  context.document.querySelector = (selector) => {
    if (selector === '[data-meal-items="breakfast"]') return itemsContainer;
    if (selector === '[data-meal-calories="breakfast"]') return calories;
    return null;
  };
  context.GlowApp.FoodLog.meals = [{ id: 'breakfast', label: 'Breakfast' }];

  context.GlowApp.FoodLog.render({
    foodLog: {
      breakfast: [{ id: 'f1', name: 'Kiwi', amountG: 100, calories: 61, protein: 1.1, fibre: 3 }]
    },
    nutrition: { source: 'foodLog' }
  });

  assert.match(itemsContainer.innerHTML, /data-swipe-row/);
  assert.match(itemsContainer.innerHTML, /swipe-row__action/);
  assert.match(itemsContainer.innerHTML, /data-remove-food-item="f1"/);
});


await test('Swipe gesture reveals delete without invoking deletion', () => {
  const context = loadScript('js/food-log.js');
  const listeners = {};
  const rowClasses = classList();
  const row = {
    classList: rowClasses,
    dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    setPointerCapture() {},
    releasePointerCapture() {}
  };
  const target = {
    closest: (selector) => {
      if (selector === '.swipe-delete-button') return null;
      if (selector === '[data-swipe-row]') return row;
      return null;
    }
  };
  const container = {
    addEventListener: (name, handler) => { listeners[name] = handler; },
    querySelectorAll: () => []
  };
  let deletes = 0;
  context.GlowApp.FoodLog.removeItem = () => { deletes += 1; };
  context.GlowApp.FoodLog.bindSwipeReveal(container);

  listeners.pointerdown({ target, pointerId: 1, clientX: 120, clientY: 30 });
  listeners.pointermove({ target, pointerId: 1, clientX: 50, clientY: 34, preventDefault() {} });
  listeners.pointerup({ target, pointerId: 1 });

  assert.equal(rowClasses.contains('is-revealed'), true);
  assert.equal(deletes, 0);
});
await test('Schedule default card is read-only with plain time, pencil edit, and swipe delete', () => {
  const context = loadScript('js/schedule-view.js');
  const view = context.GlowApp.ScheduleView;
  const day = { movement: [], schedule: [] };
  const html = view.renderItem(day, {
    id: 'c1', label: 'Check tickets', period: 'morning', category: 'custom'
  });

  assert.doesNotMatch(html, /schedule-item__label-input/);
  assert.doesNotMatch(html, /schedule-item__period"/);
  assert.match(html, />Morning</);
  assert.match(html, /data-schedule-action="edit"/);
  assert.match(html, /data-swipe-row/);
  assert.match(html, /swipe-row__action/);
});

await test('Schedule pencil opens an explicit inline edit state with save and cancel', () => {
  const context = loadScript('js/schedule-view.js');
  const view = context.GlowApp.ScheduleView;
  const day = { movement: [], schedule: [] };
  view.editingItemId = 'c1';
  const html = view.renderItem(day, {
    id: 'c1', label: 'Check tickets', period: 'morning', category: 'custom'
  });

  assert.match(html, /data-schedule-edit-label="c1"/);
  assert.match(html, /data-schedule-edit-period="c1"/);
  assert.match(html, /data-schedule-action="save"/);
  assert.match(html, /data-schedule-action="cancel"/);
});


await test('Schedule save updates both the schedule item and linked movement without exposing OR logic', () => {
  const context = loadScript('js/schedule-view.js');
  const view = context.GlowApp.ScheduleView;
  const day = {
    movement: [
      { id: 'm1', type: 'jog', label: 'Jog', period: 'morning', alternativeGroup: 'day-1-alt' }
    ],
    schedule: [
      { id: 's1', category: 'movement', label: 'Jog', period: 'morning', linkedMovementId: 'm1' }
    ]
  };

  context.GlowApp.State = {
    getScheduleDayNumber: () => 1,
    updateDay: (_dayNumber, updater) => updater(day)
  };
  view.render = () => {};
  view.showToast = () => {};
  view.editingItemId = 's1';

  view.saveItem('s1', 'Easy jog', 'evening');

  assert.equal(day.schedule[0].label, 'Easy jog');
  assert.equal(day.schedule[0].period, 'evening');
  assert.equal(day.movement[0].label, 'Easy jog');
  assert.equal(day.movement[0].period, 'evening');
  assert.equal(day.movement[0].alternativeGroup, 'day-1-alt');
  assert.equal(view.editingItemId, null);
});

await test('PWA shell cache is bumped for batch 02 assets', () => {
  assert.match(read('service-worker.js'), /ten-day-run-shell-v4/);
});
await test('Progress hero uses a dedicated campaign layout hook', () => {
  const html = read('index.html');
  const css = read('css/components.css') + read('css/mobile-first.css');
  assert.match(html, /class="view-header view-header--campaign"/);
  assert.match(css, /\.view-header--campaign/);
  assert.match(css, /grid-template-columns/);
});

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests passed.`);
if (failed.length) process.exit(1);
