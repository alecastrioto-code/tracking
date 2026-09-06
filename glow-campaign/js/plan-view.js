/* =========================================================
   THE RUN — PLAN VIEW
   Brain Dump + Training Plan + Food Plan
========================================================= */
window.GlowApp = window.GlowApp || {};

GlowApp.PlanView = {
  initialized: false,
  editingTaskId: null,
  ingredientContext: null,
  preparedDiet: null,

  init() {
    if (this.initialized) return;
    this.bindSections();
    this.bindBrainDump();
    this.bindTraining();
    this.bindFoodPlan();
    this.bindIngredientDialog();
    this.bindWorkoutDialog();
    this.initialized = true;
  },

  render() {
    const state = GlowApp.State.get();
    const section = state.ui.planSection || "brain-dump";
    document.querySelectorAll("[data-plan-section]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.planSection === section);
      button.setAttribute("aria-selected", String(button.dataset.planSection === section));
    });
    ["brain-dump", "training", "food-plan"].forEach(name => {
      const panel = document.getElementById(name === "training" ? "training-plan-panel" : `${name}-panel`);
      if (panel) panel.hidden = name !== section;
    });
    this.renderBrainDump();
    this.renderTraining();
    this.renderFoodPlan();
  },

  bindSections() {
    document.getElementById("plan-section-tabs")?.addEventListener("click", event => {
      const button = event.target.closest("[data-plan-section]");
      if (!button) return;
      GlowApp.State.setPlanSection(button.dataset.planSection);
      this.render();
    });
  },

  bindBrainDump() {
    document.getElementById("brain-dump-add")?.addEventListener("click", () => this.captureTask());
    document.getElementById("brain-dump-input")?.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); this.captureTask(); }
    });

    const list = document.getElementById("brain-dump-list");
    if (!list) return;
    GlowApp.FoodLog?.bindSwipeReveal?.(list);
    list.addEventListener("change", event => {
      const assignment = event.target.closest("[data-task-assignment]");
      if (!assignment) return;
      const row = assignment.closest("[data-brain-task]");
      const dayField = row?.querySelector(".brain-task__day-field");
      if (dayField) dayField.hidden = assignment.value !== "day";
    });
    list.addEventListener("click", event => {
      const action = event.target.closest("[data-brain-action]");
      if (!action) return;
      const id = action.dataset.taskId;
      const campaign = GlowApp.State.getActiveCampaign();
      if (!campaign || !id) return;
      if (action.dataset.brainAction === "edit") { this.editingTaskId = id; this.renderBrainDump(); return; }
      if (action.dataset.brainAction === "cancel") { this.editingTaskId = null; this.renderBrainDump(); return; }
      if (action.dataset.brainAction === "remove") {
        GlowApp.BrainDump.removeTask(campaign, id); GlowApp.State.save(); this.renderBrainDump(); GlowApp.DayView?.renderTasks?.(); return;
      }
      if (action.dataset.brainAction === "save") {
        const row = list.querySelector(`[data-brain-task="${this.escapeAttr(id)}"]`);
        if (!row) return;
        const assignmentType = row.querySelector("[data-task-assignment]")?.value || "unscheduled";
        GlowApp.BrainDump.updateTask(campaign, id, {
          text: row.querySelector("[data-task-text]")?.value || "",
          category: row.querySelector("[data-task-category]")?.value || "adulting",
          assignment: {
            type: assignmentType,
            dayNumber: assignmentType === "day" ? Number(row.querySelector("[data-task-day]")?.value || 1) : null
          },
          startDay: campaign.currentDay || 1
        });
        this.editingTaskId = null; GlowApp.State.save(); this.renderBrainDump(); GlowApp.DayView?.renderTasks?.();
      }
    });
  },

  captureTask() {
    const input = document.getElementById("brain-dump-input");
    const campaign = GlowApp.State.getActiveCampaign();
    if (!input || !campaign || !input.value.trim()) return;
    const task = GlowApp.BrainDump.addTask(campaign, {
      text: input.value,
      category: "adulting",
      assignment: { type: "unscheduled", dayNumber: null },
      startDay: campaign.currentDay || 1
    });
    if (!task) return;
    input.value = "";
    this.editingTaskId = task.id;
    GlowApp.State.save();
    this.renderBrainDump();
  },

  renderBrainDump() {
    const container = document.getElementById("brain-dump-list");
    const campaign = GlowApp.State.getActiveCampaign();
    if (!container || !campaign) return;
    const tasks = GlowApp.BrainDump.ensure(campaign).tasks;
    if (!tasks.length) {
      container.innerHTML = `<div class="plan-empty"><strong>Brain clear.</strong><span>Drop something above when it starts taking up space.</span></div>`;
      return;
    }
    container.innerHTML = tasks.map(task => {
      if (task.id === this.editingTaskId) {
        return `<article class="brain-task brain-task--editing" data-brain-task="${this.escapeAttr(task.id)}">
          <input class="brain-task__text-input" data-task-text value="${this.escapeAttr(task.text)}" aria-label="Task">
          <div class="brain-task__edit-grid">
            <label>Category<select data-task-category>
              ${this.option("self-care", "Self care", task.category)}
              ${this.option("adulting", "Adulting (house / chores / work)", task.category)}
              ${this.option("quests", "Side projects & quests", task.category)}
            </select></label>
            <label>When<select data-task-assignment>
              ${this.option("unscheduled", "Unscheduled", task.assignment?.type)}
              ${this.option("day", "Sprint day", task.assignment?.type)}
              ${this.option("daily", "Repeat every day", task.assignment?.type)}
            </select></label>
            <label class="brain-task__day-field" ${task.assignment?.type === "day" ? "" : "hidden"}>Day<select data-task-day>${this.dayOptions(task.assignment?.dayNumber || GlowApp.State.getPlanDayNumber())}</select></label>
          </div>
          <div class="brain-task__edit-actions">
            <button class="secondary-button" data-brain-action="cancel" data-task-id="${this.escapeAttr(task.id)}">Cancel</button>
            <button class="primary-button" data-brain-action="save" data-task-id="${this.escapeAttr(task.id)}">Save</button>
          </div>
        </article>`;
      }
      const assignment = task.assignment?.type === "daily" ? "EVERY DAY" : task.assignment?.type === "day" ? `DAY ${task.assignment.dayNumber}` : "UNSCHEDULED";
      const overdue = task.assignment?.type === "day" && Number(task.assignment.dayNumber) < Number(campaign.currentDay || 1);
      return `<div class="swipe-row brain-task-swipe" data-swipe-row>
        <article class="brain-task swipe-row__content" data-brain-task="${this.escapeAttr(task.id)}">
          <div class="brain-task__tags"><span class="task-category task-category--${task.category}">${this.escape(GlowApp.BrainDump.categoryLabel(task.category))}</span><span class="task-assignment ${overdue ? "is-overdue" : ""}">${overdue ? "OVERDUE · " : ""}${assignment}</span></div>
          <strong>${this.escape(task.text)}</strong>
        </article>
        <div class="swipe-row__action swipe-row__action--dual">
          <button class="swipe-edit-button" data-brain-action="edit" data-task-id="${this.escapeAttr(task.id)}">Edit</button>
          <button class="swipe-delete-button" data-brain-action="remove" data-task-id="${this.escapeAttr(task.id)}">Remove</button>
        </div>
      </div>`;
    }).join("");
  },

  bindTraining() {
    const container = document.getElementById("training-plan-list");
    if (!container) return;
    container.addEventListener("change", event => {
      const choice = event.target.closest("[data-training-choice-day]");
      if (choice) {
        const campaign = GlowApp.State.getActiveCampaign();
        if (GlowApp.TrainingPlan.applyChoice(campaign, Number(choice.dataset.trainingChoiceDay), choice.value)) {
          GlowApp.State.save(); this.renderTraining(); GlowApp.DayView?.render();
        }
        return;
      }
      const replace = event.target.closest("[data-training-replace]");
      if (replace && replace.value) {
        const campaign = GlowApp.State.getActiveCampaign();
        GlowApp.TrainingPlan.replaceBlock(campaign, Number(replace.dataset.day), replace.dataset.movementId, replace.value);
        GlowApp.State.save(); this.renderTraining(); GlowApp.DayView?.render();
      }
    });
    container.addEventListener("click", event => {
      const view = event.target.closest("[data-view-workout]");
      if (view) this.openWorkout(view.dataset.viewWorkout);
    });
  },

  renderTraining() {
    const container = document.getElementById("training-plan-list");
    const campaign = GlowApp.State.getActiveCampaign();
    if (!container || !campaign) return;
    container.innerHTML = campaign.days.map(day => {
      const choiceDay = [5,12].includes(day.dayNumber);
      const items = (day.movement || []).map(item => {
        const label = item.recovery ? `<span class="training-tag training-tag--rest">REST</span>` : item.optional ? `<span class="training-tag">OPTIONAL</span>` : `<span class="training-tag training-tag--score">${item.points} PT</span>`;
        const workout = item.workoutId ? `<button class="text-button" type="button" data-view-workout="${this.escapeAttr(item.workoutId)}">View workout</button>` : "";
        const edit = item.scored !== false && !choiceDay ? `<select class="training-change" data-training-replace data-day="${day.dayNumber}" data-movement-id="${this.escapeAttr(item.id)}"><option value="">Change…</option><option value="walk-cardio">Walk / cardio</option><option value="glutes-long">Glutes long</option><option value="glutes-short">Glutes short</option><option value="abs-25">Abs 25</option><option value="total-body">Total body</option><option value="upper-back-tabata">Upper back tabata</option><option value="upper-back-strength">Upper back strength</option></select>` : "";
        return `<li>${label}<div><strong>${this.escape(item.label)}</strong><small>${this.escape(this.periodLabel(item.period))}</small></div>${workout}${edit}</li>`;
      }).join("");
      const choice = choiceDay ? `<label class="training-choice">Choose session<select data-training-choice-day="${day.dayNumber}"><option value="">Choose…</option>${this.option("total-body","Total Body Conditioning",campaign.trainingChoices?.[day.dayNumber])}${this.option("upper-back-abs","Upper back + arms + abs",campaign.trainingChoices?.[day.dayNumber])}</select></label>` : "";
      return `<article class="training-day-card"><header><span>DAY ${day.dayNumber}</span><strong>${day.dayNumber > 7 ? "WEEK 2" : "WEEK 1"}</strong></header>${choice}<ul>${items}</ul></article>`;
    }).join("");
  },

  bindFoodPlan() {
    document.getElementById("diet-csv-file")?.addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const status = document.getElementById("diet-import-status");
      if (status) status.textContent = "Reading and checking your plan…";
      const text = await file.text();
      this.preparedDiet = await GlowApp.DietPlan.prepareImport(text, file.name, { resolveNutrition: true });
      this.renderDietPreview();
    });
    document.getElementById("diet-import-replace")?.addEventListener("click", () => {
      const campaign = GlowApp.State.getActiveCampaign();
      if (!campaign || !this.preparedDiet) return;
      const result = GlowApp.DietPlan.commitImport(campaign, this.preparedDiet);
      if (!result.ok) return;
      campaign.days.forEach(day => GlowApp.FoodLog?.syncNutrition?.(day));
      GlowApp.State.save();
      this.preparedDiet = null;
      const input = document.getElementById("diet-csv-file"); if (input) input.value = "";
      this.renderDietPreview(); this.renderFoodPlan(); GlowApp.DayView?.render();
      this.toast("Food plan replaced.");
    });
    document.getElementById("diet-template-download")?.addEventListener("click", () => this.downloadTemplate());
    document.getElementById("food-plan-day-tabs")?.addEventListener("click", event => {
      const button = event.target.closest("[data-plan-day]");
      if (!button) return;
      GlowApp.State.setPlanDay(Number(button.dataset.planDay));
      this.renderFoodPlan();
    });
    document.getElementById("food-plan-day-content")?.addEventListener("click", event => {
      const add = event.target.closest("[data-plan-add-ingredient]");
      if (add) { this.openIngredientEditor(Number(add.dataset.day), add.dataset.meal, null, { planned:true }); return; }
      const edit = event.target.closest("[data-plan-edit-ingredient]");
      if (edit) { this.openIngredientEditor(Number(edit.dataset.day), edit.dataset.meal, edit.dataset.itemId, { planned:true }); return; }
      const remove = event.target.closest("[data-plan-remove-ingredient]");
      if (remove) {
        const day = GlowApp.State.getDay(Number(remove.dataset.day));
        if (day) day.foodLog[remove.dataset.meal] = (day.foodLog[remove.dataset.meal] || []).filter(item => item.id !== remove.dataset.itemId || item.eaten === true);
        GlowApp.State.save(); this.renderFoodPlan(); GlowApp.DayView?.render();
      }
    });
    document.getElementById("food-plan-day-content")?.addEventListener("change", event => {
      const input = event.target.closest("[data-plan-meal-name]");
      if (!input) return;
      const day = GlowApp.State.getDay(Number(input.dataset.day));
      if (!day) return;
      day.mealMeta[input.dataset.meal].mealName = input.value.trim(); GlowApp.State.save(); GlowApp.DayView?.render();
    });
  },

  renderDietPreview() {
    const status = document.getElementById("diet-import-status");
    const preview = document.getElementById("diet-import-preview");
    const replace = document.getElementById("diet-import-replace");
    if (!status || !preview || !replace) return;
    if (!this.preparedDiet) {
      const campaign = GlowApp.State.getActiveCampaign();
      status.textContent = campaign?.dietPlan?.status === "loaded" ? `Loaded: ${campaign.dietPlan.sourceFileName || "diet plan"}` : "No diet plan loaded yet.";
      preview.innerHTML = ""; replace.hidden = true; return;
    }
    const p = this.preparedDiet;
    const campaign = GlowApp.State.getActiveCampaign();
    const touchedDays = new Set((p.rows || []).map(row => Number(row.day)));
    const actualDays = (campaign?.days || []).filter(day =>
      touchedDays.has(day.dayNumber) && GlowApp.FoodLog.meals.some(meal => (day.foodLog?.[meal.id] || []).some(item => item.eaten === true))
    ).map(day => day.dayNumber);
    status.textContent = p.blockingErrors.length ? "Fix the CSV before importing." : `${p.dayCount} days · ${p.mealCount} meals · ${p.ingredientCount} ingredients`;
    preview.innerHTML = [
      ...p.blockingErrors.map(error => `<li class="is-error">${this.escape(error)}</li>`),
      ...(p.unresolvedCount ? [`<li>${p.unresolvedCount} ingredients need nutrition review.</li>`] : []),
      ...(actualDays.length ? [`<li>Days ${actualDays.join(", ")} already contain eaten food. Actual history will be kept; only the plan is replaced.</li>`] : []),
      ...p.warnings.map(warning => `<li>${this.escape(warning)}</li>`)
    ].join("");
    replace.hidden = p.blockingErrors.length > 0;
  },

  renderFoodPlan() {
    const tabs = document.getElementById("food-plan-day-tabs");
    const container = document.getElementById("food-plan-day-content");
    const campaign = GlowApp.State.getActiveCampaign();
    if (!tabs || !container || !campaign) return;
    const selected = GlowApp.State.getPlanDayNumber();
    tabs.innerHTML = campaign.days.map(day => `<button type="button" class="${day.dayNumber === selected ? "is-active" : ""}" data-plan-day="${day.dayNumber}">D${day.dayNumber}</button>`).join("");
    const day = GlowApp.State.getDay(selected);
    if (!day) return;
    container.innerHTML = GlowApp.FoodLog.meals.map(meal => {
      const items = (day.foodLog?.[meal.id] || []).filter(item => item.planned === true);
      const totals = GlowApp.DietPlan.getPlannedMealTotals(day, meal.id);
      return `<details class="plan-meal" ${items.length ? "" : "open"}><summary><div><span>${this.escape(meal.label)}</span><strong>${totals.itemCount ? `${Math.round(totals.calories)} kcal · ${totals.itemCount} ingredient${totals.itemCount === 1 ? "" : "s"}` : "No plan yet"}</strong></div><span>⌄</span></summary>
        <div class="plan-meal__body"><label class="plan-meal-name">Meal name<input data-plan-meal-name data-day="${day.dayNumber}" data-meal="${meal.id}" value="${this.escapeAttr(day.mealMeta?.[meal.id]?.mealName || "")}" placeholder="e.g. Yoghurt bowl"></label>
          <div class="plan-ingredient-list">${items.length ? items.map(item => item.eaten === true
            ? `<article class="plan-ingredient plan-ingredient--eaten"><strong>${this.escape(item.name)}</strong><small>${this.escape(this.quantityLabel(item))} · ${Math.round(Number(item.calories || 0))} kcal · Eaten · edit actual in Today</small></article>`
            : `<div class="swipe-row plan-ingredient-swipe" data-swipe-row><article class="plan-ingredient swipe-row__content"><strong>${this.escape(item.name)}</strong><small>${this.escape(this.quantityLabel(item))} · ${Math.round(Number(item.calories || 0))} kcal ${item.nutritionStatus === "needs-review" ? "· Needs review" : ""}</small></article><div class="swipe-row__action swipe-row__action--dual"><button class="swipe-edit-button" data-plan-edit-ingredient data-day="${day.dayNumber}" data-meal="${meal.id}" data-item-id="${this.escapeAttr(item.id)}">Edit</button><button class="swipe-delete-button" data-plan-remove-ingredient data-day="${day.dayNumber}" data-meal="${meal.id}" data-item-id="${this.escapeAttr(item.id)}">Remove</button></div></div>`).join("") : `<p class="plan-empty-inline">No ingredients yet.</p>`}</div>
          <button class="secondary-button plan-add-ingredient" type="button" data-plan-add-ingredient data-day="${day.dayNumber}" data-meal="${meal.id}">+ Add ingredient</button>
        </div></details>`;
    }).join("");
    container.querySelectorAll(".plan-ingredient-list").forEach(list => GlowApp.FoodLog?.bindSwipeReveal?.(list));
    this.renderDietPreview();
  },

  bindIngredientDialog() {
    const dialog = document.getElementById("ingredient-editor-dialog");
    document.getElementById("ingredient-editor-close")?.addEventListener("click", () => dialog?.close?.());
    document.getElementById("ingredient-editor-cancel")?.addEventListener("click", () => dialog?.close?.());
    document.getElementById("ingredient-editor-save")?.addEventListener("click", () => this.saveIngredientEditor());
  },

  openIngredientEditor(dayNumber, meal, itemId = null, options = {}) {
    const day = GlowApp.State.getDay(dayNumber);
    if (!day) return;
    const item = itemId ? (day.foodLog?.[meal] || []).find(entry => entry.id === itemId) : null;
    this.ingredientContext = { dayNumber, meal, itemId, planned: options.planned !== false };
    const set = (id, value) => { const el=document.getElementById(id); if (el) el.value=value ?? ""; };
    set("ingredient-name", item?.name || ""); set("ingredient-quantity", item?.quantity ?? item?.amountG ?? ""); set("ingredient-unit", item?.unit || "g"); set("ingredient-grams", item?.grams ?? item?.amountG ?? ""); set("ingredient-kcal", item?.calories ?? ""); set("ingredient-protein", item?.protein ?? ""); set("ingredient-fibre", item?.fibre ?? ""); set("ingredient-notes", item?.notes || "");
    const title = document.getElementById("ingredient-editor-title"); if (title) title.textContent = item ? "Edit ingredient" : "Add ingredient";
    const dialog = document.getElementById("ingredient-editor-dialog"); dialog?.showModal?.(); if (dialog && !dialog.open) dialog.setAttribute("open", "");
  },

  saveIngredientEditor() {
    const c = this.ingredientContext; if (!c) return;
    const day = GlowApp.State.getDay(c.dayNumber); if (!day) return;
    const val = id => document.getElementById(id)?.value ?? "";
    const num = id => { const n=Number(val(id)); return Number.isFinite(n) ? n : null; };
    const name = String(val("ingredient-name")).trim(), quantity=num("ingredient-quantity"), unit=String(val("ingredient-unit")).trim();
    if (!name || quantity === null || quantity <= 0 || !unit) { this.toast("Add an ingredient, quantity and unit."); return; }
    const calories=num("ingredient-kcal"), protein=num("ingredient-protein"), fibre=num("ingredient-fibre"), grams=num("ingredient-grams");
    let item = c.itemId ? (day.foodLog[c.meal] || []).find(entry => entry.id === c.itemId) : null;
    if (!item) {
      item = { id:GlowApp.createId("meal-food"), libraryId:null, brand:"", source:"manual", origin:c.planned ? "diet" : "manual", addedAt:new Date().toISOString(), eatenAt:null };
      day.foodLog[c.meal].push(item);
    }
    Object.assign(item, { name, quantity, unit, grams, amountG:grams, planned:c.planned, eaten:c.planned ? (item.eaten === true) : true, calories:calories ?? 0, protein:protein ?? 0, fibre:fibre ?? 0, notes:String(val("ingredient-notes")).trim(), nutritionStatus:[calories,protein,fibre].every(x=>x!==null)?"resolved":"needs-review" });
    if (!c.planned) item.eatenAt ||= new Date().toISOString();
    if (grams && [calories,protein,fibre].every(x=>x!==null)) item.per100 = { calories:calories*100/grams, protein:protein*100/grams, fibre:fibre*100/grams };
    GlowApp.FoodLog.syncNutrition(day); GlowApp.State.save();
    document.getElementById("ingredient-editor-dialog")?.close?.();
    this.renderFoodPlan(); GlowApp.FoodLog.render(day); GlowApp.DayView?.render();
  },

  bindWorkoutDialog() {
    const dialog = document.getElementById("workout-detail-dialog");
    document.getElementById("workout-detail-close")?.addEventListener("click", () => dialog?.close?.());
  },

  openWorkout(workoutId) {
    const routine = GlowApp.TrainingPlan.getRoutine(workoutId); if (!routine) return;
    const set = (id, value) => { const el=document.getElementById(id); if (el) el.textContent=value || ""; };
    set("workout-detail-title", routine.title); set("workout-detail-style", routine.style); set("workout-detail-equipment", routine.equipment);
    const body = document.getElementById("workout-detail-body");
    if (body) {
      body.innerHTML = routine.sections?.length
        ? routine.sections.map(section => `<section class="workout-section"><h3>${this.escape(section.title)}</h3><ol>${section.exercises.map(x=>`<li>${this.escape(x)}</li>`).join("")}</ol></section>`).join("")
        : `<ol>${(routine.exercises || []).map(x=>`<li>${this.escape(x)}</li>`).join("")}</ol>`;
    }
    const dialog = document.getElementById("workout-detail-dialog"); dialog?.showModal?.(); if (dialog && !dialog.open) dialog.setAttribute("open", "");
  },

  downloadTemplate() {
    const csv = "day,meal,meal_name,ingredient,quantity,unit,grams,kcal,protein,fibre,notes\n1,breakfast,Yoghurt bowl,Greek yoghurt,150,g,150,90,15,0,\n1,breakfast,Yoghurt bowl,Kiwi,1,piece,,45,1,2.5,";
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download="the-run-diet-template.csv"; link.click(); setTimeout(()=>URL.revokeObjectURL(url),0);
  },

  dayOptions(selected) { return Array.from({length:14},(_,i)=>`<option value="${i+1}" ${Number(selected)===i+1?"selected":""}>Day ${i+1}</option>`).join(""); },
  option(value,label,selected) { return `<option value="${this.escapeAttr(value)}" ${String(selected)===String(value)?"selected":""}>${this.escape(label)}</option>`; },
  quantityLabel(item) { return `${Number(item.quantity ?? item.amountG ?? 0)} ${item.unit || (item.amountG != null ? "g" : "")}`.trim(); },
  periodLabel(period) { return period === "morning" ? "Morning" : period === "afternoon" ? "Afternoon" : period === "evening" ? "Evening" : "Midday"; },
  toast(message) { const toast=document.getElementById("app-toast"); if (!toast) return; toast.textContent=message; toast.hidden=false; clearTimeout(this.toastTimer); this.toastTimer=setTimeout(()=>toast.hidden=true,1800); },
  escape(value) { return String(value ?? "").replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); },
  escapeAttr(value) { return this.escape(value); }
};
