import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const dayView = read('js/day-view.js');
const foodLog = read('js/food-log.js');
const planView = read('js/plan-view.js');
const settingsView = read('js/settings-view.js');
const components = read('css/components.css');
const mobile = read('css/mobile-first.css');
const sw = read('service-worker.js');

const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); console.log(`✓ ${name}`); }
  catch (error) { results.push({ name, ok: false }); console.error(`✗ ${name}`); console.error(`  ${error.message}`); }
}

test('movement checkbox has an accessible label hit target so tapping the custom box toggles it', () => {
  assert.match(dayView, /const checkboxId = `movement-check-\$\{item\.id\}`/);
  assert.match(dayView, /<input id="\$\{this\.escapeHTML\(checkboxId\)\}" type="checkbox" data-movement-id=/);
  assert.match(dayView, /<label class="movement-check" for="\$\{this\.escapeHTML\(checkboxId\)\}">/);
});

test('custom checkbox rows hide the native checkbox for ingredients, brain-dump tasks and groceries', () => {
  assert.match(components, /\.meal-food-item__eaten input\[type="checkbox"\][\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/);
  assert.match(components, /\.today-task-row > label input\[type="checkbox"\][\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/);
  assert.match(components, /\.grocery-row input\[type="checkbox"\][\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/);
});

test('grocery completion strikes through then removes checked items from subsequent renders', () => {
  assert.match(dayView, /const visibleRows = rows\.filter\(item => !checked\[item\.id\]\)/);
  assert.match(dayView, /row\?\.classList\.add\("is-completing"\)/);
  assert.match(dayView, /setTimeout\(\(\) => this\.renderGrocery\(GlowApp\.State\.getSelectedDay\(\)\),\s*\d+\)/s);
  assert.match(components, /\.grocery-row\.is-completing[\s\S]*?text-decoration:\s*line-through;/);
});

test('Food Plan import fails gracefully and file picker is visually contained', () => {
  assert.match(planView, /try\s*\{[\s\S]*?file\.text\(\)[\s\S]*?prepareImport[\s\S]*?\}\s*catch\s*\(error\)/);
  assert.match(components, /\.file-button input\[type="file"\][\s\S]*?position:\s*absolute;[\s\S]*?opacity:\s*0;/);
  assert.match(components, /\.food-plan-day-content[\s\S]*?min-width:\s*0;/);
});

test('meal window settings have a stable responsive layout and a single save helper', () => {
  assert.match(settingsView, /saveMealWindow\(meal, edge, value\)/);
  assert.match(settingsView, /this\.saveMealWindow\(meal, edge, event\.target\.value\)/);
  assert.match(components, /\.meal-window-settings[\s\S]*?display:\s*grid;/);
  assert.match(components, /\.meal-window-settings input\[type="time"\][\s\S]*?min-width:\s*0;/);
});



test('meal window save helper updates valid windows and rejects inverted windows', () => {
  const GlowApp = {
    DEFAULT_SETTINGS: { mealWindows: {
      breakfast:{start:'08:00',end:'09:30'}, lunch:{start:'12:00',end:'13:30'}, snack:{start:'15:00',end:'16:00'}, dinner:{start:'18:00',end:'20:00'}
    } },
    State: {
      data: { settings: { mealWindows: {
        breakfast:{start:'08:00',end:'09:30'}, lunch:{start:'12:00',end:'13:30'}, snack:{start:'15:00',end:'16:00'}, dinner:{start:'18:00',end:'20:00'}
      } } },
      get() { return this.data; },
      updateSettings(fn) { fn(this.data.settings); },
      getSelectedDay() { return null; }
    },
    DayView: {}
  };
  const context = { window:{GlowApp}, GlowApp, document:{getElementById:()=>null}, console, JSON, clearTimeout, setTimeout };
  vm.createContext(context);
  vm.runInContext(settingsView, context);
  assert.equal(GlowApp.SettingsView.saveMealWindow('lunch','start','12:15'), true);
  assert.equal(GlowApp.State.data.settings.mealWindows.lunch.start, '12:15');
  assert.equal(GlowApp.SettingsView.saveMealWindow('lunch','end','11:00'), false);
  assert.equal(GlowApp.State.data.settings.mealWindows.lunch.end, '13:30');
});

test('Today ingredient rows are opaque', () => {
  assert.match(components, /\.meal-food-swipe \.meal-food-item[\s\S]*?background:\s*#fff;/);
});

test('collapsed planned meals show phase, total calories and window only', () => {
  assert.match(foodLog, /if \(title\) title\.textContent = meal\.label;/);
  assert.match(foodLog, /if \(summary\) summary\.textContent = planned\.length\s*\? `\$\{plannedCalories\} kcal`/s);
  assert.doesNotMatch(foodLog, /\$\{plannedCalories\} kcal planned · \$\{planned\.length\} ingredient/);
});

test('mark eaten uses the same compact icon treatment as the plus button', () => {
  assert.match(foodLog, /confirm\.textContent = allPlannedEaten \? "✓" : "✓";/);
  assert.match(foodLog, /confirm\.setAttribute\("aria-label", allPlannedEaten \? `\$\{meal\.label\} eaten` : `Mark \$\{meal\.label\.toLowerCase\(\)\} eaten`\)/);
  assert.match(components, /\.meal-confirm-button,[\s\n]*\.meal-add-food\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;/);
  assert.match(components, /\.meal-confirm-button\[hidden\]\s*\{\s*display:\s*none;/);
});

test('14-day selector buttons all use the same tappable width', () => {
  assert.match(components, /\.day-tabs--scroll button\s*\{[\s\S]*?flex:\s*0 0 44px;[\s\S]*?width:\s*44px;[\s\S]*?min-width:\s*44px;/);
});

test('PWA cache is bumped for interaction fixes', () => {
  assert.match(sw, /const CACHE_NAME = "the-run-shell-v6"/);
});

const failed = results.filter(x => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests passed.`);
if (failed.length) process.exitCode = 1;
