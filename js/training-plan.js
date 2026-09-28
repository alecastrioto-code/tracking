/* =========================================================
   THE RUN — TRAINING PLAN
========================================================= */
window.GlowApp = window.GlowApp || {};

GlowApp.TrainingPlan = {
  choices: [
    { id: "total-body", label: "Total Body Conditioning" },
    { id: "upper-back-abs", label: "Upper back + arms + abs" }
  ],

  syncDaySchedule(day) {
    if (!day) return;
    day.schedule = (day.schedule || []).filter(item => item.category !== "movement");
    GlowApp.addMovementToSchedule(day.schedule, day.movement || []);
  },

  applyChoice(campaign, choiceDay, choice) {
    const dayNumber = Number(choiceDay);
    if (![5, 12].includes(dayNumber) || !["total-body", "upper-back-abs"].includes(choice)) return false;
    campaign.trainingChoices ||= { 5: null, 12: null };
    campaign.trainingChoices[dayNumber] = choice;
    [dayNumber, dayNumber + 1].forEach(number => {
      const day = campaign.days.find(item => item.dayNumber === number);
      if (!day) return;
      const previousOptionalCompletion = Object.fromEntries((day.movement || []).map(item => [item.type, item.completed === true]));
      day.movement = GlowApp.createTrainingMovementForDay(number, campaign.trainingChoices);
      day.movement.forEach(item => {
        if (item.scored === false && previousOptionalCompletion[item.type]) item.completed = true;
      });
      this.syncDaySchedule(day);
    });
    return true;
  },

  replaceBlock(campaign, dayNumber, movementId, workoutType) {
    const day = campaign?.days?.find(item => item.dayNumber === Number(dayNumber));
    const item = day?.movement?.find(movement => movement.id === movementId);
    if (!item || item.scored === false) return false;
    const definitions = {
      "walk-cardio": { type:"walk-cardio", label:"Walk / cardio", workoutId:null },
      "glutes-long": { type:"glutes-long", label:"Glutes strength — Long", workoutId:"glutes-long" },
      "glutes-short": { type:"glutes-short", label:"Glutes strength — Short", workoutId:"glutes-short" },
      "abs-25": { type:"abs-25", label:"Abs — 25 min", workoutId:"abs-25" },
      "total-body": { type:"total-body", label:"Total Body Conditioning", workoutId:"total-body" },
      "upper-back-tabata": { type:"upper-back-abs", label:"Upper back + arms + abs — Tabata", workoutId:"upper-back-tabata" },
      "upper-back-strength": { type:"upper-back-abs", label:"Upper back + arms — Strength with pauses", workoutId:"upper-back-strength" }
    };
    const definition = definitions[workoutType];
    if (!definition) return false;
    Object.assign(item, definition, { completed:false, scored:true, points:1 });
    this.syncDaySchedule(day);
    return true;
  },

  getRoutine(workoutId) { return GlowApp.TRAINING_ROUTINES?.[workoutId] || null; },

  getDaySummary(campaign, dayNumber) {
    const day = campaign?.days?.find(item => item.dayNumber === Number(dayNumber));
    return (day?.movement || []).map(item => ({ ...item }));
  },

  completionSummary(campaign) {
    let completed = 0, possible = 0;
    (campaign?.days || []).forEach(day => {
      (day.movement || []).filter(item => item.scored !== false).forEach(item => {
        possible += 1;
        if (item.completed === true) completed += 1;
      });
    });
    return { completed, possible };
  }
};
