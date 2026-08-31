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

function loadScript(path) {
  const GlowApp = {};
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
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => ({})
    }
  };
  vm.createContext(context);
  vm.runInContext(read(path), context, { filename: path });
  return context;
}

await test('Today hero removes the Current mission eyebrow', () => {
  assert.doesNotMatch(read('index.html'), /Current mission/);
});

await test('Nutrition source disclaimer is removed from the page', () => {
  assert.doesNotMatch(read('index.html'), /id="nutrition-source-note"/);
});

await test('Progress no longer renders the current reward tier card', () => {
  assert.doesNotMatch(read('index.html'), /class="reward-panel"/);
});

await test('Schedule has one top-level Add activity CTA', () => {
  const html = read('index.html');
  assert.match(html, /id="add-schedule-item-button"[^>]*>[\s\S]*?Add activity/);
  assert.doesNotMatch(read('js/schedule-view.js'), /\+ Add workout|\+ Custom item/);
});

await test('Food meal controls use a compact plus-only button with accessible label', () => {
  const html = read('index.html');
  const buttons = [...html.matchAll(/<button[\s\S]*?class="meal-add-food"[\s\S]*?<\/button>/g)];
  assert.equal(buttons.length, 4);
  for (const match of buttons) {
    assert.match(match[0], /aria-label="Add food to /);
    assert.doesNotMatch(match[0], />\s*Add food\s*</);
  }
});

await test('Generic food search is inserted before packaged-product results', async () => {
  const context = loadScript('js/food-log.js');
  const { GlowApp } = context;
  const status = { textContent: '' };
  const results = { innerHTML: '' };
  context.document.getElementById = (id) => {
    if (id === 'food-search-status') return status;
    if (id === 'food-search-results') return results;
    return null;
  };
  GlowApp.FoodLibrary = { search: async () => [] };
  GlowApp.FoodLog.showPanel = () => {};
  GlowApp.FoodLog.searchUSDA = async () => [{
    id: 'usda-1',
    name: 'Kiwifruit, green, raw',
    brand: '',
    source: 'usda',
    per100: { calories: 61, protein: 1.1, fibre: 3 }
  }];
  GlowApp.FoodLog.searchOpenFoodFacts = async () => [{
    id: 'off-1',
    name: 'Kiwi yoghurt',
    brand: 'Example',
    source: 'openfoodfacts',
    per100: { calories: 90, protein: 4, fibre: 0 }
  }];

  await GlowApp.FoodLog.searchFood('kiwi');

  assert.equal(GlowApp.FoodLog.searchResults.length, 2);
  assert.equal(GlowApp.FoodLog.searchResults[0].id, 'usda-1');
  assert.equal(GlowApp.FoodLog.searchResults[0].resultSourceLabel, 'USDA generic food');
  assert.equal(GlowApp.FoodLog.searchResults[1].id, 'off-1');
});

await test('USDA foods normalize to the existing per-100g food model', () => {
  const context = loadScript('js/food-log.js');
  const food = context.GlowApp.FoodLog.normalizeUSDAFood({
    fdcId: 123,
    description: 'Kiwifruit, green, raw',
    dataType: 'SR Legacy',
    foodNutrients: [
      { nutrientId: 1008, nutrientName: 'Energy', unitName: 'KCAL', value: 61 },
      { nutrientId: 1003, nutrientName: 'Protein', unitName: 'G', value: 1.14 },
      { nutrientId: 1079, nutrientName: 'Fiber, total dietary', unitName: 'G', value: 3 }
    ]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(food.per100)), {
    calories: 61,
    protein: 1.14,
    fibre: 3
  });
  assert.equal(food.source, 'usda');
});

await test('Meal totals expose calories beside each meal heading', () => {
  const context = loadScript('js/food-log.js');
  const day = {
    foodLog: {
      breakfast: [{ calories: 100 }, { calories: 125.4 }],
      lunch: [], snack: [], dinner: []
    },
    nutrition: {}
  };
  assert.equal(context.GlowApp.FoodLog.getMealCalories(day, 'breakfast'), 225);
});

await test('Schedule hides OR-group controls while preserving movement data', () => {
  const context = loadScript('js/schedule-view.js');
  const view = context.GlowApp.ScheduleView;
  const day = {
    dayNumber: 1,
    movement: [{ id: 'm1', type: 'jog', label: 'Jog', period: 'morning', alternativeGroup: 'day-1-alt' }],
    schedule: []
  };
  const item = {
    id: 's1', label: 'Jog', period: 'morning', category: 'movement', linkedMovementId: 'm1'
  };
  const html = view.renderItem(day, item);
  assert.doesNotMatch(html, /OR group|data-schedule-action="alternative"/);
});

await test('Food schedule goals are fixed, not editable or removable', () => {
  const context = loadScript('js/schedule-view.js');
  const html = context.GlowApp.ScheduleView.renderItem(
    { movement: [], schedule: [] },
    { id: 'food-1', label: 'Breakfast', period: 'morning', category: 'food' }
  );
  assert.doesNotMatch(html, /data-schedule-action="label"/);
  assert.doesNotMatch(html, /data-schedule-action="period"/);
  assert.doesNotMatch(html, /data-schedule-action="delete"/);
  assert.match(html, /schedule-item--fixed/);
});

await test('Schedule category skins distinguish self care and other', () => {
  const context = loadScript('js/schedule-view.js');
  const view = context.GlowApp.ScheduleView;
  const day = { movement: [], schedule: [] };
  assert.match(view.renderItem(day, { id: 'g1', label: 'Somatoline', period: 'evening', category: 'glow' }), /schedule-item--self-care/);
  assert.match(view.renderItem(day, { id: 'c1', label: 'Read', period: 'evening', category: 'custom' }), /schedule-item--other/);
});

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests passed.`);
if (failed.length) process.exit(1);
