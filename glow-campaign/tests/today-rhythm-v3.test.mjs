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

function createContext(extra = {}) {
  const GlowApp = {};
  const storage = new Map();
  const context = {
    window: { GlowApp },
    GlowApp,
    console,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Math,
    Date,
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
    },
    ...extra
  };
  vm.createContext(context);
  return context;
}

function load(context, path) {
  vm.runInContext(read(path), context, { filename: path });
}

function loadCore() {
  const context = createContext();
  load(context, 'js/defaults.js');
  load(context, 'js/scoring.js');
  return context;
}

await test('calorie scoring is 1 through 1600, 0.9 through 1700, then 0', () => {
  const { GlowApp } = loadCore();
  const settings = GlowApp.DEFAULT_SETTINGS;
  const makeDay = calories => ({
    food: { binge: false },
    nutrition: { calories, protein: 100, fibre: 30 }
  });

  const atTarget = GlowApp.Scoring.getNutritionScore(makeDay(1600), settings);
  const grace = GlowApp.Scoring.getNutritionScore(makeDay(1650), settings);
  const edge = GlowApp.Scoring.getNutritionScore(makeDay(1700), settings);
  const above = GlowApp.Scoring.getNutritionScore(makeDay(1701), settings);
  const low = GlowApp.Scoring.getNutritionScore(makeDay(900), settings);

  assert.equal(atTarget.goals.calories.earned, 1);
  assert.equal(grace.goals.calories.earned, 0.9);
  assert.equal(edge.goals.calories.earned, 0.9);
  assert.equal(above.goals.calories.earned, 0);
  assert.equal(low.goals.calories.earned, 1);
  assert.equal(grace.earned, 2.9);
});

await test('binge forces Food Rhythm and calorie score to zero without double penalty', () => {
  const { GlowApp } = loadCore();
  const day = {
    food: {
      breakfast: true, lunch: true, snack: true, dinner: true,
      continuousGrazing: false,
      binge: true,
      bingeReflection: 'What happened and what I can do next.'
    },
    nutrition: { calories: 1500, protein: 100, fibre: 30 }
  };

  const food = GlowApp.Scoring.getFoodScore(day);
  const nutrition = GlowApp.Scoring.getNutritionScore(day, GlowApp.DEFAULT_SETTINGS);

  assert.equal(food.earned, 0);
  assert.equal(food.bingeOverride, true);
  assert.equal(nutrition.goals.calories.earned, 0);
  assert.equal(nutrition.earned, 2);
});

await test('new default movement schedule is 4 points on training days and 2 on rest days', () => {
  const { GlowApp } = loadCore();
  const days = GlowApp.createDefaultDays();

  const expectedStrength = {
    1: 'Glutes strength',
    2: 'Abs',
    3: 'Total body conditioning',
    5: 'Glutes strength',
    6: 'Abs',
    7: 'Upper back / arms',
    9: 'Glutes strength',
    10: 'Abs'
  };

  for (const day of days) {
    const score = GlowApp.Scoring.getMovementScore(day);
    if ([4, 8].includes(day.dayNumber)) {
      assert.equal(score.possible, 2, `day ${day.dayNumber}`);
      assert.deepEqual(JSON.parse(JSON.stringify(day.movement.map(item => item.label))), ['Evening walk']);
    } else {
      assert.equal(score.possible, 4, `day ${day.dayNumber}`);
      assert.equal(day.movement[0].label, 'Morning walk / jog');
      assert.equal(day.movement[1].label, expectedStrength[day.dayNumber]);
      assert.equal(day.movement[2].label, 'Evening walk');
      assert.equal(day.movement[2].points, 2);
    }
  }
});

await test('self care seeds Evening routine daily and Morning routine on days 1, 4, 8', () => {
  const { GlowApp } = loadCore();
  const days = GlowApp.createDefaultDays();

  for (const day of days) {
    const selfCare = day.schedule.filter(item => item.category === 'glow');
    assert.equal(selfCare.some(item => item.label === 'Evening routine'), true);
    assert.equal(
      selfCare.some(item => item.label === 'Morning routine'),
      [1, 4, 8].includes(day.dayNumber),
      `day ${day.dayNumber}`
    );
    assert.equal(GlowApp.Scoring.getGlowScore(day).possible, [1, 4, 8].includes(day.dayNumber) ? 2 : 1);
  }
});

await test('challenge is extra: pass requires done plus at least 90 percent normal daily score', () => {
  const { GlowApp } = loadCore();
  const day = { challenge: { done: true } };
  assert.equal(GlowApp.Scoring.getChallengeStatus(day, { percentage: 90 }).passed, true);
  assert.equal(GlowApp.Scoring.getChallengeStatus(day, { percentage: 89 }).passed, false);
  day.challenge.done = false;
  assert.equal(GlowApp.Scoring.getChallengeStatus(day, { percentage: 100 }).passed, false);
});

await test('challenge cadence alternates flexibility and 30 minutes of disconnection', () => {
  const { GlowApp } = loadCore();
  const campaign = GlowApp.createDefaultCampaign();
  campaign.days.forEach(day => {
    if (day.dayNumber % 2 === 0) {
      assert.equal(day.challenge.type, 'disconnection');
      assert.equal(day.challenge.label, '30 minutes of disconnection');
    } else {
      assert.equal(day.challenge.type, 'flexibility');
    }
  });
});

await test('failed flexibility challenge repeats; passed challenge advances to unused challenge', () => {
  const context = createContext();
  load(context, 'js/defaults.js');
  load(context, 'js/storage.js');
  load(context, 'js/scoring.js');
  load(context, 'js/state.js');
  const { GlowApp } = context;
  GlowApp.State.data = GlowApp.createDefaultAppState();
  const campaign = GlowApp.State.getActiveCampaign();

  const day1 = campaign.days[0];
  GlowApp.State.ensureChallengeForDay(1);
  const firstId = day1.challenge.challengeId;
  assert.ok(firstId);

  day1.challenge.done = false;
  GlowApp.State.ensureChallengeForDay(3);
  assert.equal(campaign.days[2].challenge.challengeId, firstId);

  campaign.days[2].challenge.done = true;
  const originalGetDayScore = GlowApp.Scoring.getDayScore;
  GlowApp.Scoring.getDayScore = day => ({ percentage: day.dayNumber === 3 ? 95 : 0 });
  GlowApp.State.ensureChallengeForDay(5);
  assert.notEqual(campaign.days[4].challenge.challengeId, firstId);
  GlowApp.Scoring.getDayScore = originalGetDayScore;
});

await test('binge days are gaps in calorie trend and carry a binge marker', () => {
  const context = createContext();
  load(context, 'js/recovery.js');
  const campaign = {
    days: [
      { dayNumber: 1, food: { binge: false }, nutrition: { calories: 1550 } },
      { dayNumber: 2, food: { binge: true }, nutrition: { calories: 2200 } },
      { dayNumber: 3, food: { binge: false }, nutrition: { calories: 1650 } }
    ]
  };
  const series = context.GlowApp.Recovery.getCalorieSeries(campaign);
  assert.deepEqual(JSON.parse(JSON.stringify(series)), [
    { day: 1, value: 1550, binge: false },
    { day: 2, value: null, binge: true },
    { day: 3, value: 1650, binge: false }
  ]);
});

await test('v3 upgrade resets old run exactly once while preserving separate food memory', () => {
  const context = createContext();
  load(context, 'js/defaults.js');
  load(context, 'js/storage.js');
  load(context, 'js/scoring.js');
  load(context, 'js/state.js');
  const { GlowApp } = context;

  const old = GlowApp.createDefaultAppState();
  old.version = 2;
  old.campaigns[0].currentDay = 4;
  old.campaigns[0].days[0].food.breakfast = true;
  context.localStorage.setItem(GlowApp.STORAGE_KEY, JSON.stringify(old));
  context.localStorage.setItem('tenDayRunFoodLibraryV2', JSON.stringify([{ id: 'kiwi' }]));

  const fresh = GlowApp.State.init();
  assert.equal(fresh.version, 3);
  assert.equal(fresh.campaigns.length, 1);
  assert.equal(fresh.campaigns[0].currentDay, 1);
  assert.equal(fresh.campaigns[0].days[0].food.breakfast, false);
  assert.equal(context.localStorage.getItem('tenDayRunFoodLibraryV2'), JSON.stringify([{ id: 'kiwi' }]));

  fresh.campaigns[0].days[0].food.breakfast = true;
  GlowApp.State.save();
  GlowApp.State.data = null;
  const reopened = GlowApp.State.init();
  assert.equal(reopened.campaigns[0].days[0].food.breakfast, true);
});

await test('Today UI contains binge reflection and challenge, and uses Today’s Rhythm title', () => {
  const html = read('index.html');
  assert.match(html, /id="binge-toggle"/);
  assert.match(html, /id="binge-reflection"/);
  assert.match(html, /id="daily-challenge-card"/);
  assert.match(html, /Today’s Rhythm/);
});

await test('old dedicated dog-walk score card is removed from Today', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /id="dog-walk-card"/);
});

await test('PWA cache is bumped for the v3 behavior model', () => {
  assert.match(read('service-worker.js'), /ten-day-run-shell-v4/);
});

const failed = results.filter(result => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests passed.`);
if (failed.length) process.exit(1);
