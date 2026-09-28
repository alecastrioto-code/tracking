/* =========================================================
   THE RUN — SPRINT ARCHIVES / ROLLOVER
========================================================= */
window.GlowApp = window.GlowApp || {};

GlowApp.SprintArchive = {
  fullScore(campaign, settings) {
    const scores = (campaign?.days || []).map(day => GlowApp.Scoring.getDayScore(day, settings));
    const earned = scores.reduce((sum, score) => sum + score.earned, 0);
    const possible = scores.reduce((sum, score) => sum + score.possible, 0);
    return { earned, possible, percentage: GlowApp.Scoring.toPercentage(earned, possible), scores };
  },

  createSummary(campaign, settings) {
    const full = this.fullScore(campaign, settings);
    const scoreTrend = (campaign?.days || []).map((day, index) => ({ dayNumber: day.dayNumber, percentage: full.scores[index].percentage }));
    const calorieTrend = (campaign?.days || []).map(day => ({
      dayNumber: day.dayNumber,
      calories: day.food?.binge === true ? null : (GlowApp.Scoring.toValidNumber(day.nutrition?.calories)),
      binge: day.food?.binge === true
    }));
    let challengePassed = 0, challengeDone = 0;
    (campaign?.days || []).forEach((day, index) => {
      const status = GlowApp.Scoring.getChallengeStatus(day, full.scores[index]);
      if (status.done) challengeDone += 1;
      if (status.passed) challengePassed += 1;
    });
    const trainingSummary = GlowApp.TrainingPlan?.completionSummary
      ? GlowApp.TrainingPlan.completionSummary(campaign)
      : (() => {
          let completed=0, possible=0;
          (campaign?.days || []).forEach(day => (day.movement || []).filter(item => item.scored !== false).forEach(item => { possible++; if (item.completed) completed++; }));
          return { completed, possible };
        })();
    const endDate = new Date();
    return {
      id: GlowApp.createId("archive"),
      startDate: campaign?.startDate || "",
      endDate: endDate.toISOString().slice(0,10),
      finalScore: full.percentage,
      scoreTrend,
      calorieTrend,
      challengeSummary: { passed: challengePassed, done: challengeDone, total: 14 },
      trainingSummary,
      completed: true
    };
  },

  copyDietPlan(sourceCampaign, targetCampaign) {
    if (!sourceCampaign || !targetCampaign) return;
    targetCampaign.days.forEach(targetDay => {
      const sourceDay = sourceCampaign.days.find(day => day.dayNumber === targetDay.dayNumber);
      if (!sourceDay) return;
      ["breakfast","lunch","snack","dinner"].forEach(meal => {
        const planned = (sourceDay.foodLog?.[meal] || []).filter(item => item.planned === true);
        targetDay.foodLog[meal] = planned.map(item => ({
          ...JSON.parse(JSON.stringify(item)),
          id: GlowApp.createId("diet-food"),
          eaten: false,
          eatenAt: null
        }));
        targetDay.mealMeta[meal].mealName = sourceDay.mealMeta?.[meal]?.mealName || "";
        targetDay.mealMeta[meal].confirmedAt = null;
      });
    });
    targetCampaign.dietPlan = sourceCampaign.dietPlan?.status === "loaded"
      ? { importedAt:new Date().toISOString(), sourceFileName:sourceCampaign.dietPlan.sourceFileName || "Previous sprint", status:"loaded" }
      : { importedAt:null, sourceFileName:null, status:"empty" };
  },

  startNextSprint(stateData, options = {}) {
    const current = stateData?.campaigns?.find(c => c.id === stateData.activeCampaignId);
    if (!current) return null;
    const archive = this.createSummary(current, stateData.settings);
    stateData.archives ||= [];
    stateData.archives.unshift(archive);
    const next = GlowApp.createDefaultCampaign();
    next.brainDump.tasks = GlowApp.BrainDump?.getRolloverTasks ? GlowApp.BrainDump.getRolloverTasks(current) : [];
    if (options.reuseDietPlan === true) this.copyDietPlan(current, next);
    stateData.campaigns = [next];
    stateData.activeCampaignId = next.id;
    stateData.ui.activeView = "today";
    stateData.ui.selectedDay = 1;
    stateData.ui.planDay = 1;
    stateData.ui.scheduleDay = 1;
    return { archive, next };
  }
};
