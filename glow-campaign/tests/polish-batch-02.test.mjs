import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const results = [];
async function test(name, fn) {
  try { await fn(); results.push({name,ok:true}); console.log(`✓ ${name}`); }
  catch (error) { results.push({name,ok:false,error}); console.error(`✗ ${name}`); console.error(`  ${error.message}`); }
}
function classList() {
  const values = new Set();
  return { add:(...xs)=>xs.forEach(x=>values.add(x)), remove:(...xs)=>xs.forEach(x=>values.delete(x)), toggle:(x,force)=>{ if(force===true)values.add(x); else if(force===false)values.delete(x); else if(values.has(x))values.delete(x); else values.add(x); }, contains:x=>values.has(x) };
}
function element() {
  return { value:'', textContent:'', innerHTML:'', hidden:false, readOnly:false, disabled:false, style:{}, dataset:{}, classList:classList(), setAttribute(){}, removeAttribute(){}, addEventListener(){}, querySelector(){return null;}, querySelectorAll(){return [];}, closest(){return null;} };
}
function loadScript(path) {
  const GlowApp = {}; const elements = new Map();
  const context = { window:{GlowApp}, GlowApp, console, URLSearchParams, setTimeout, clearTimeout, fetch:async()=>{throw new Error('unexpected fetch');}, navigator:{}, document:{ getElementById:id=>elements.get(id)||null, querySelector:()=>null, querySelectorAll:()=>[], addEventListener:()=>{}, createElement:()=>element() } };
  vm.createContext(context); vm.runInContext(read(path), context, {filename:path}); context.elements=elements; return context;
}

await test('Nutrition render completes and updates all progress bars from eaten food', () => {
  const context = loadScript('js/day-view.js');
  ['calories-input','protein-input','fibre-input','nutrition-card','nutrition-plan-summary','calories-target-copy','protein-target-copy','fibre-target-copy','calories-status','protein-status','fibre-status','calories-target-fill','protein-target-fill','fibre-target-fill'].forEach(id=>context.elements.set(id,element()));
  context.GlowApp.FoodLog = {
    getAllItems: () => [{eaten:true}],
    getPlannedTotals: () => ({itemCount:2,calories:450}),
    getTotals: () => ({itemCount:1,calories:300})
  };
  context.GlowApp.Scoring = {
    getNutritionScore: () => ({goals:{ calories:{max:1400,graceMax:1500,value:300,status:'complete',complete:true}, protein:{min:90,status:'below',complete:false}, fibre:{min:25,status:'below',complete:false} }}),
    getCaloriesBarPercent:()=>25, getProteinBarPercent:()=>40, getFibreBarPercent:()=>60
  };
  const day={nutrition:{calories:300,protein:36,fibre:15,source:'foodLog'}};
  context.GlowApp.DayView.renderNutrition(day, {});
  assert.equal(context.elements.get('calories-target-fill').style.width,'25%');
  assert.equal(context.elements.get('protein-target-fill').style.width,'40%');
  assert.equal(context.elements.get('fibre-target-fill').style.width,'60%');
  assert.equal(context.elements.get('calories-input').readOnly,true);
  assert.match(context.elements.get('nutrition-plan-summary').textContent,/300 kcal eaten · 450 kcal planned/);
});

await test('Today no longer exposes the generic schedule timeline', () => {
  const html=read('index.html');
  assert.doesNotMatch(html,/id="today-timeline"/);
  assert.doesNotMatch(html,/Operation schedule/);
  assert.match(html,/id="adulting-quests-card"/);
});

await test('Each meal strip contains the summary, meal toggle and plus action', () => {
  const html=read('index.html');
  const strips=[...html.matchAll(/<div class="meal-log__header meal-log__strip">[\s\S]*?<\/div>\s*<div class="meal-food-items"/g)];
  assert.equal(strips.length,4);
  for (const strip of strips) {
    assert.match(strip[0],/data-meal-summary=/);
    assert.match(strip[0],/data-toggle-meal=/);
    assert.match(strip[0],/class="meal-add-food"/);
  }
});

await test('Food rows expose Edit and Remove behind the swipe row', () => {
  const context=loadScript('js/food-log.js'); const items=element();
  context.document.querySelector=selector=>selector==='[data-meal-items="breakfast"]'?items:null;
  context.GlowApp.FoodLog.meals=[{id:'breakfast',label:'Breakfast'}];
  context.GlowApp.FoodLog.expandedMeals.add('1:breakfast');
  context.GlowApp.FoodLog.render({dayNumber:1,food:{},mealMeta:{breakfast:{mealName:'',confirmedAt:null}},foodLog:{breakfast:[{id:'f1',name:'Kiwi',planned:true,eaten:false,quantity:1,unit:'piece',calories:61,protein:1.1,fibre:3}],lunch:[],snack:[],dinner:[]},nutrition:{source:'manual'}});
  assert.match(items.innerHTML,/data-swipe-row/);
  assert.match(items.innerHTML,/data-edit-food-item="f1"/);
  assert.match(items.innerHTML,/data-remove-food-item="f1"/);
});

await test('Swipe gesture reveals actions without invoking deletion', () => {
  const context=loadScript('js/food-log.js'); const listeners={}; const rowClasses=classList();
  const row={classList:rowClasses,dataset:{},style:{setProperty(){},removeProperty(){}},setPointerCapture(){},releasePointerCapture(){}};
  const target={closest:selector=>selector==='[data-swipe-row]'?row:null};
  const container={addEventListener:(name,handler)=>listeners[name]=handler,querySelectorAll:()=>[]};
  let deletes=0; context.GlowApp.FoodLog.removeItem=()=>{deletes+=1;}; context.GlowApp.FoodLog.bindSwipeReveal(container);
  listeners.pointerdown({target,pointerId:1,clientX:120,clientY:30}); listeners.pointermove({target,pointerId:1,clientX:45,clientY:34,preventDefault(){}}); listeners.pointerup({target,pointerId:1});
  assert.equal(rowClasses.contains('is-revealed'),true); assert.equal(deletes,0);
});

await test('Plan has Brain Dump, Training and Food Plan sections instead of inline Schedule editor', () => {
  const html=read('index.html');
  assert.match(html,/id="brain-dump-panel"/); assert.match(html,/id="training-plan-panel"/); assert.match(html,/id="food-plan-panel"/);
  assert.doesNotMatch(html,/id="add-schedule-item-button"/);
});

await test('Brain Dump task edit exposes category, assignment and save/cancel controls', () => {
  const source=read('js/plan-view.js');
  assert.match(source,/data-task-category/); assert.match(source,/data-task-assignment/); assert.match(source,/Repeat every day/); assert.match(source,/data-brain-action="save"/); assert.match(source,/data-brain-action="cancel"/);
});

await test('PWA shell uses the v3.0 cache and new state modules', () => {
  const sw=read('service-worker.js');
  assert.match(sw,/the-run-shell-v6/); assert.match(sw,/\.\/js\/diet-plan\.js/); assert.match(sw,/\.\/js\/brain-dump\.js/); assert.doesNotMatch(sw,/schedule-view\.js/);
});

await test('Progress hero uses a dedicated campaign layout hook', () => {
  const html=read('index.html'); const css=read('css/components.css')+read('css/mobile-first.css');
  assert.match(html,/class="view-header view-header--campaign"/); assert.match(css,/\.view-header--campaign/); assert.match(css,/grid-template-columns/);
});

const failed=results.filter(x=>!x.ok); console.log(`\n${results.length-failed.length}/${results.length} tests passed.`); if(failed.length) process.exit(1);
