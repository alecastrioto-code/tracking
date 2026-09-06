import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');

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

function createContext() {
  const GlowApp = {};
  const storage = new Map();
  const context = {
    window: { GlowApp }, GlowApp, console, Math, Date, JSON, URLSearchParams,
    setTimeout, clearTimeout,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => ({})
    }
  };
  vm.createContext(context);
  return context;
}
function load(ctx, path) { vm.runInContext(read(path), ctx, { filename: path }); }
function core(...extra) {
  const ctx = createContext();
  load(ctx, 'js/defaults.js');
  load(ctx, 'js/storage.js');
  load(ctx, 'js/scoring.js');
  for (const file of extra) load(ctx, file);
  return ctx;
}

await test('schema v4 creates a 14-day The Run sprint with new calorie targets and meal windows', () => {
  const { GlowApp } = core();
  const state = GlowApp.createDefaultAppState();
  assert.equal(state.version, 4);
  assert.equal(state.campaigns[0].name, 'The Run');
  assert.equal(state.campaigns[0].length, 14);
  assert.equal(state.campaigns[0].days.length, 14);
  assert.equal(state.settings.nutrition.caloriesMax, 1400);
  assert.equal(state.settings.nutrition.caloriesGraceMax, 1500);
  assert.deepEqual(JSON.parse(JSON.stringify(state.settings.mealWindows)), {
    breakfast: { start: '08:00', end: '09:30' },
    lunch: { start: '12:00', end: '13:30' },
    snack: { start: '15:00', end: '16:00' },
    dinner: { start: '18:00', end: '20:00' }
  });
});

await test('calorie scoring uses 1400 full score and 1500 grace', () => {
  const { GlowApp } = core();
  const settings = GlowApp.DEFAULT_SETTINGS;
  const day = calories => ({ food: { binge: false }, nutrition: { calories, protein: 100, fibre: 30 } });
  assert.equal(GlowApp.Scoring.getNutritionScore(day(1400), settings).goals.calories.earned, 1);
  assert.equal(GlowApp.Scoring.getNutritionScore(day(1401), settings).goals.calories.earned, 0.9);
  assert.equal(GlowApp.Scoring.getNutritionScore(day(1500), settings).goals.calories.earned, 0.9);
  assert.equal(GlowApp.Scoring.getNutritionScore(day(1501), settings).goals.calories.earned, 0);
  assert.equal(GlowApp.Scoring.getNutritionScore(day(700), settings).goals.calories.earned, 1);
});

await test('training cycle repeats across 14 days and optional/protect sleep blocks do not score', () => {
  const { GlowApp } = core();
  const days = GlowApp.createDefaultDays();
  assert.equal(days.length, 14);
  for (let d = 8; d <= 14; d++) {
    const a = days[d - 1].movement.map(x => [x.type, x.scored !== false, x.points]);
    const b = days[d - 8].movement.map(x => [x.type, x.scored !== false, x.points]);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), `day ${d}`);
  }
  assert.equal(GlowApp.Scoring.getMovementScore(days[0]).possible, 1);
  assert.equal(GlowApp.Scoring.getMovementScore(days[2]).possible, 2);
  assert.equal(GlowApp.Scoring.getMovementScore(days[1]).possible, 1);
});

await test('morning routine exists only on days 1, 4, 8 and 12', () => {
  const { GlowApp } = core();
  GlowApp.createDefaultDays().forEach(day => {
    const labels = day.schedule.filter(x => x.category === 'glow').map(x => x.label);
    assert.equal(labels.includes('Morning routine'), [1,4,8,12].includes(day.dayNumber), `day ${day.dayNumber}`);
    assert.equal(labels.includes('Evening routine'), true);
  });
});

await test('v3 persisted state migrates once to v4 while preserving compatible settings and food memory key', () => {
  const ctx = core('js/state.js');
  const { GlowApp } = ctx;
  const legacy = GlowApp.createDefaultAppState();
  legacy.version = 3;
  legacy.settings.nutrition.proteinMin = 105;
  legacy.settings.water.targetGlasses = 8;
  legacy.settings.nutrition.caloriesMax = 1600;
  legacy.campaigns[0].currentDay = 4;
  legacy.campaigns[0].days[0].food.breakfast = true;
  ctx.localStorage.setItem(GlowApp.STORAGE_KEY, JSON.stringify(legacy));
  ctx.localStorage.setItem('tenDayRunFoodLibraryV2', JSON.stringify([{ id: 'kiwi' }]));
  const migrated = GlowApp.State.init();
  assert.equal(migrated.version, 4);
  assert.equal(migrated.campaigns[0].length, 14);
  assert.equal(migrated.campaigns[0].currentDay, 1);
  assert.equal(migrated.campaigns[0].days[0].food.breakfast, false);
  assert.equal(migrated.settings.nutrition.proteinMin, 105);
  assert.equal(migrated.settings.water.targetGlasses, 8);
  assert.equal(migrated.settings.nutrition.caloriesMax, 1400);
  assert.equal(ctx.localStorage.getItem('tenDayRunFoodLibraryV2'), JSON.stringify([{ id: 'kiwi' }]));
  migrated.campaigns[0].days[0].food.breakfast = true;
  GlowApp.State.save();
  GlowApp.State.data = null;
  assert.equal(GlowApp.State.init().campaigns[0].days[0].food.breakfast, true);
});

await test('diet parser validates ingredient rows and builds planned uneaten food', async () => {
  const ctx = core('js/diet-plan.js');
  const { GlowApp } = ctx;
  const csv = [
    'day,meal,meal_name,ingredient,quantity,unit,kcal,protein,fibre,notes',
    '1,breakfast,Yoghurt bowl,Greek yoghurt,150,g,90,15,0,',
    '1,breakfast,Yoghurt bowl,Kiwi,1,piece,45,1,2.5,'
  ].join('\n');
  const prepared = await GlowApp.DietPlan.prepareImport(csv, 'diet.csv', { resolveNutrition: false });
  assert.equal(prepared.blockingErrors.length, 0);
  assert.equal(prepared.rows.length, 2);
  assert.equal(prepared.rows[0].planned, true);
  assert.equal(prepared.rows[0].eaten, false);
  assert.equal(prepared.rows[0].origin, 'diet');
});

await test('diet parser blocks invalid day and allows missing nutrition as needs review', async () => {
  const ctx = core('js/diet-plan.js');
  const { GlowApp } = ctx;
  const invalid = await GlowApp.DietPlan.prepareImport('day,meal,meal_name,ingredient,quantity,unit\n15,lunch,Lunch,Pasta,90,g', 'bad.csv', { resolveNutrition: false });
  assert.ok(invalid.blockingErrors.length > 0);
  const unresolved = await GlowApp.DietPlan.prepareImport('day,meal,meal_name,ingredient,quantity,unit\n1,lunch,Lunch,Pasta,90,g', 'ok.csv', { resolveNutrition: false });
  assert.equal(unresolved.blockingErrors.length, 0);
  assert.equal(unresolved.rows[0].nutritionStatus, 'needs-review');
});

await test('actual nutrition counts eaten items only while planned totals remain separate', () => {
  const ctx = core('js/food-log.js');
  const { GlowApp } = ctx;
  const day = GlowApp.createDefaultDays()[0];
  day.foodLog.breakfast = [
    { id:'a', name:'A', planned:true, eaten:false, calories:100, protein:10, fibre:2 },
    { id:'b', name:'B', planned:true, eaten:true, calories:200, protein:20, fibre:3 }
  ];
  const actual = GlowApp.FoodLog.getTotals(day);
  const planned = GlowApp.FoodLog.getPlannedTotals(day);
  assert.equal(actual.calories, 200);
  assert.equal(planned.calories, 300);
});

await test('mark meal eaten confirms all planned ingredients and sets rhythm fact', () => {
  const ctx = core('js/food-log.js');
  const { GlowApp } = ctx;
  const day = GlowApp.createDefaultDays()[0];
  day.foodLog.breakfast = [
    { id:'a', name:'A', planned:true, eaten:false, calories:100, protein:1, fibre:1 },
    { id:'b', name:'B', planned:true, eaten:false, calories:100, protein:1, fibre:1 }
  ];
  GlowApp.FoodLog.confirmMealOnDay(day, 'breakfast', new Date('2026-09-06T08:30:00Z'));
  assert.equal(day.food.breakfast, true);
  assert.equal(day.foodLog.breakfast.every(x => x.eaten === true), true);
  assert.ok(day.mealMeta.breakfast.confirmedAt);
});

await test('grocery derivation merges only same ingredient and same unit', () => {
  const ctx = core('js/diet-plan.js');
  const { GlowApp } = ctx;
  const day = GlowApp.createDefaultDays()[0];
  day.foodLog.breakfast = [
    { name:'Greek yoghurt', quantity:150, unit:'g', planned:true },
    { name:'Eggs', quantity:2, unit:'piece', planned:true }
  ];
  day.foodLog.snack = [
    { name:'greek yoghurt', quantity:100, unit:'g', planned:true },
    { name:'Greek yoghurt', quantity:1, unit:'pot', planned:true },
    { name:'Eggs', quantity:1, unit:'piece', planned:true }
  ];
  const list = GlowApp.DietPlan.deriveGrocery(day);
  const yoghurtG = list.find(x => x.name.toLowerCase() === 'greek yoghurt' && x.unit === 'g');
  const yoghurtPot = list.find(x => x.name.toLowerCase() === 'greek yoghurt' && x.unit === 'pot');
  const eggs = list.find(x => x.name.toLowerCase() === 'eggs');
  assert.equal(yoghurtG.quantity, 250);
  assert.equal(yoghurtPot.quantity, 1);
  assert.equal(eggs.quantity, 3);
});

await test('brain dump task assignment, daily repeat, completion and rollover are non-scoring state', () => {
  const ctx = core('js/brain-dump.js');
  const { GlowApp } = ctx;
  const campaign = GlowApp.createDefaultCampaign();
  const one = GlowApp.BrainDump.addTask(campaign, { text:'Laundry', category:'adulting', assignment:{ type:'day', dayNumber:2 } });
  const daily = GlowApp.BrainDump.addTask(campaign, { text:'Journal', category:'self-care', assignment:{ type:'daily', dayNumber:null } });
  assert.equal(GlowApp.BrainDump.getTasksForDay(campaign, 1).some(t => t.id === one.id), false);
  assert.equal(GlowApp.BrainDump.getTasksForDay(campaign, 2).some(t => t.id === one.id), true);
  assert.equal(GlowApp.BrainDump.getTasksForDay(campaign, 7).some(t => t.id === daily.id), true);
  GlowApp.BrainDump.completeTask(campaign, one.id, 2, true);
  assert.equal(campaign.brainDump.tasks.some(t => t.id === one.id), false);
  GlowApp.BrainDump.completeTask(campaign, daily.id, 2, true);
  assert.equal(campaign.brainDump.tasks.some(t => t.id === daily.id), true);
  const rollover = GlowApp.BrainDump.getRolloverTasks(campaign);
  assert.equal(rollover.some(t => t.text === 'Journal' && t.assignment.type === 'daily'), true);
});

await test('training branch updates day 6 and repeats for day 12 to 13', () => {
  const ctx = core('js/training-plan.js');
  const { GlowApp } = ctx;
  const campaign = GlowApp.createDefaultCampaign();
  GlowApp.TrainingPlan.applyChoice(campaign, 5, 'total-body');
  assert.match(campaign.days[5].movement.find(x => x.scored !== false).label, /Abs/i);
  GlowApp.TrainingPlan.applyChoice(campaign, 12, 'upper-back-abs');
  assert.match(campaign.days[12].movement.find(x => x.scored !== false).label, /Glutes strength — Long/i);
});

await test('meal window helper returns upcoming/open/eaten/outside without scoring', () => {
  const ctx = core('js/meal-windows.js');
  const { GlowApp } = ctx;
  const settings = GlowApp.DEFAULT_SETTINGS;
  assert.equal(GlowApp.MealWindows.getState('lunch', null, settings, '11:30').status, 'upcoming');
  assert.equal(GlowApp.MealWindows.getState('lunch', null, settings, '12:30').status, 'open');
  assert.equal(GlowApp.MealWindows.getState('lunch', '2026-09-06T12:42:00', settings, '14:00').status, 'eaten');
  assert.equal(GlowApp.MealWindows.getState('lunch', '2026-09-06T14:42:00', settings, '14:00').status, 'outside');
});

await test('archive snapshot stores summary only and calorie gaps for binge days', () => {
  const ctx = core('js/sprint-archive.js');
  const { GlowApp } = ctx;
  const campaign = GlowApp.createDefaultCampaign();
  campaign.currentDay = 14;
  campaign.days[0].nutrition.calories = 1300;
  campaign.days[1].food.binge = true;
  campaign.days[1].nutrition.calories = 2200;
  const archive = GlowApp.SprintArchive.createSummary(campaign, GlowApp.DEFAULT_SETTINGS);
  assert.equal(archive.scoreTrend.length, 14);
  assert.equal(archive.calorieTrend[1].calories, null);
  assert.equal(archive.calorieTrend[1].binge, true);
  assert.equal('days' in archive, false);
  assert.equal('brainDump' in archive, false);
});

await test('v3 HTML exposes Plan, Brain Dump, Training, Food Plan, groceries and workout sheet', () => {
  const html = read('index.html');
  assert.match(html, /data-view-link="plan"/);
  assert.match(html, /id="brain-dump-panel"/);
  assert.match(html, /id="training-plan-panel"/);
  assert.match(html, /id="food-plan-panel"/);
  assert.match(html, /id="tomorrow-grocery-card"/);
  assert.match(html, /id="workout-detail-dialog"/);
  assert.match(html, /The Run/);
  assert.doesNotMatch(html, /Operation schedule/);
});



await test('diet replacement preserves eaten factual rows and their meal title while replacing uneaten plan', async () => {
  const ctx = core('js/diet-plan.js');
  const { GlowApp } = ctx;
  const campaign = GlowApp.createDefaultCampaign();
  const day = campaign.days[0];
  day.mealMeta.breakfast.mealName = 'Original breakfast';
  day.foodLog.breakfast = [
    { id:'eaten', name:'Actual yoghurt', planned:true, eaten:true, quantity:150, unit:'g', calories:100, protein:12, fibre:0 },
    { id:'old-plan', name:'Old planned kiwi', planned:true, eaten:false, quantity:1, unit:'piece', calories:40, protein:1, fibre:2 }
  ];
  const prepared = await GlowApp.DietPlan.prepareImport([
    'day,meal,meal_name,ingredient,quantity,unit,kcal,protein,fibre',
    '1,breakfast,New breakfast,Oats,40,g,150,5,4'
  ].join('\n'), 'new.csv', { resolveNutrition:false });
  const result = GlowApp.DietPlan.commitImport(campaign, prepared);
  assert.equal(result.ok, true);
  assert.equal(day.foodLog.breakfast.some(item => item.id === 'eaten'), true);
  assert.equal(day.foodLog.breakfast.some(item => item.id === 'old-plan'), false);
  assert.equal(day.foodLog.breakfast.some(item => item.name === 'Oats' && item.eaten === false), true);
  assert.equal(day.mealMeta.breakfast.mealName, 'Original breakfast');
});

await test('starting a next sprint archives summary, rolls tasks and optionally reuses diet as uneaten', () => {
  const ctx = core('js/brain-dump.js', 'js/training-plan.js', 'js/sprint-archive.js');
  const { GlowApp } = ctx;
  const state = GlowApp.createDefaultAppState();
  const current = state.campaigns[0];
  GlowApp.BrainDump.addTask(current, { text:'Laundry', category:'adulting', assignment:{type:'day',dayNumber:14} });
  GlowApp.BrainDump.addTask(current, { text:'Journal', category:'self-care', assignment:{type:'daily'} });
  current.foodLog = current.foodLog || {};
  current.days[0].mealMeta.breakfast.mealName = 'Yoghurt bowl';
  current.days[0].foodLog.breakfast.push({ id:'diet1', name:'Yoghurt', planned:true, eaten:true, quantity:150, unit:'g', calories:90, protein:15, fibre:0 });
  current.dietPlan = { importedAt:'2026-09-01T00:00:00Z', sourceFileName:'diet.csv', status:'loaded' };
  const result = GlowApp.SprintArchive.startNextSprint(state, { reuseDietPlan:true });
  assert.ok(result);
  assert.equal(state.archives.length, 1);
  assert.equal(state.campaigns.length, 1);
  assert.notEqual(state.campaigns[0].id, current.id);
  const nextTasks = state.campaigns[0].brainDump.tasks;
  assert.equal(nextTasks.find(t => t.text === 'Laundry').assignment.type, 'unscheduled');
  assert.equal(nextTasks.find(t => t.text === 'Journal').assignment.type, 'daily');
  const copied = state.campaigns[0].days[0].foodLog.breakfast[0];
  assert.equal(copied.name, 'Yoghurt');
  assert.equal(copied.eaten, false);
  assert.equal(state.campaigns[0].days[0].mealMeta.breakfast.mealName, 'Yoghurt bowl');
});

await test('static Progress shell exposes all 14 day selectors before runtime enhancement', () => {
  const html = read('index.html');
  const headerBlock = html.match(/<table\s+[\s\S]*?id="campaign-board"[\s\S]*?<\/thead>/)?.[0] || '';
  for (let day = 1; day <= 14; day++) assert.match(headerBlock, new RegExp(`data-day-select="${day}"`));
});

await test('service worker shell only references files that exist and excludes obsolete schedule controller', () => {
  const sw = read('service-worker.js');
  assert.doesNotMatch(sw, /schedule-view\.js/);
  const paths = [...sw.matchAll(/"\.\/([^\"]+)"/g)].map(match => match[1]).filter(path => path && path !== '');
  for (const path of paths) assert.equal(fs.existsSync(new URL(path, root)), true, path);
});


await test('individual eaten toggles set meal timing without requiring whole-meal confirmation', () => {
  const ctx = core('js/food-log.js');
  const { GlowApp } = ctx;
  const day = GlowApp.createDefaultDays()[0];
  day.foodLog.lunch = [{ id:'l1', name:'Pasta', planned:true, eaten:false, calories:300, protein:10, fibre:4 }];
  GlowApp.FoodLog.toggleItemEatenOnDay(day, 'lunch', 'l1', true);
  assert.equal(day.food.lunch, true);
  assert.ok(day.mealMeta.lunch.confirmedAt);
});
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests passed.`);
if (failed.length) process.exitCode = 1;
