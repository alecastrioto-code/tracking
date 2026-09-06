/* =========================================================
   THE RUN — STATE MANAGER (SCHEMA V4)
========================================================= */

window.GlowApp = window.GlowApp || {};

GlowApp.State = {
  data: null,

  init() {
    const savedState = GlowApp.Storage.load();

    if (savedState && Number(savedState.version || 0) < GlowApp.APP_SCHEMA_VERSION) {
      this.data = this.createV4FromLegacy(savedState);
      GlowApp.Storage.save(this.data);
    } else if (savedState) {
      this.data = savedState;
    } else {
      this.data = GlowApp.createDefaultAppState();
      GlowApp.Storage.save(this.data);
    }

    this.ensureV4Model();
    this.ensureValidSelections();
    this.syncCurrentDayFromDate();
    this.ensureChallengeForDay(this.getSelectedDayNumber());
    this.save();
    return this.data;
  },


  syncCurrentDayFromDate(now = new Date()) {
    const campaign = this.getActiveCampaign();
    if (!campaign?.startDate) return false;
    const start = new Date(`${campaign.startDate}T00:00:00`);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (Number.isNaN(start.getTime())) return false;
    const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const elapsed = Math.floor((today - startLocal) / 86400000);
    const current = Math.max(1, Math.min(GlowApp.RUN_LENGTH, elapsed + 1));
    campaign.currentDay = current;
    if (this.data?.ui?.activeView === "today") {
      this.data.ui.selectedDay = current;
    }
    if (!Number.isInteger(Number(this.data?.ui?.planDay))) this.data.ui.planDay = current;
    return true;
  },

  createV4FromLegacy(savedState) {
    const fresh = GlowApp.createDefaultAppState();
    const oldSettings = savedState?.settings || {};

    if (Number.isFinite(Number(oldSettings?.nutrition?.proteinMin))) {
      fresh.settings.nutrition.proteinMin = Number(oldSettings.nutrition.proteinMin);
    }
    if (Number.isFinite(Number(oldSettings?.nutrition?.fibreMin))) {
      fresh.settings.nutrition.fibreMin = Number(oldSettings.nutrition.fibreMin);
    }
    if (Number.isFinite(Number(oldSettings?.water?.targetGlasses))) {
      fresh.settings.water.targetGlasses = Number(oldSettings.water.targetGlasses);
    }
    if (Array.isArray(oldSettings?.water?.labels) && oldSettings.water.labels.length) {
      fresh.settings.water.labels = oldSettings.water.labels.slice();
    }
    if (Array.isArray(oldSettings?.rewards) && oldSettings.rewards.length) {
      const byId = Object.fromEntries(oldSettings.rewards.map(item => [item.id, item]));
      fresh.settings.rewards = fresh.settings.rewards.map(defaultTier => ({
        ...defaultTier,
        ...(byId[defaultTier.id] || {})
      }));
    }

    /* v3.0 intentionally forces the new calorie model and meal windows. */
    fresh.settings.nutrition.caloriesMax = 1400;
    fresh.settings.nutrition.caloriesGraceMax = 1500;
    fresh.settings.mealWindows = JSON.parse(JSON.stringify(GlowApp.DEFAULT_SETTINGS.mealWindows));
    fresh.version = GlowApp.APP_SCHEMA_VERSION;
    return fresh;
  },

  ensureV4Model() {
    if (!this.data) return;
    this.data.version = GlowApp.APP_SCHEMA_VERSION;
    this.data.archives = Array.isArray(this.data.archives) ? this.data.archives : [];
    this.data.settings = this.data.settings || JSON.parse(JSON.stringify(GlowApp.DEFAULT_SETTINGS));
    this.data.settings.nutrition = this.data.settings.nutrition || {};
    this.data.settings.nutrition.caloriesMax = 1400;
    this.data.settings.nutrition.caloriesGraceMax = 1500;
    this.data.settings.mealWindows = this.data.settings.mealWindows || JSON.parse(JSON.stringify(GlowApp.DEFAULT_SETTINGS.mealWindows));

    (this.data.campaigns || []).forEach(campaign => {
      campaign.name = "The Run";
      campaign.length = 14;
      campaign.challengePool = Array.isArray(campaign.challengePool)
        ? campaign.challengePool
        : GlowApp.FLEXIBILITY_CHALLENGES.map(item => item.id);
      campaign.brainDump = campaign.brainDump && typeof campaign.brainDump === "object" ? campaign.brainDump : { tasks: [] };
      campaign.brainDump.tasks = Array.isArray(campaign.brainDump.tasks) ? campaign.brainDump.tasks : [];
      campaign.grocery = campaign.grocery && typeof campaign.grocery === "object"
        ? campaign.grocery
        : { manualByTargetDay: {}, checkedByTargetDay: {} };
      campaign.grocery.manualByTargetDay ||= {};
      campaign.grocery.checkedByTargetDay ||= {};
      campaign.trainingChoices = campaign.trainingChoices || { 5: null, 12: null };
      campaign.dietPlan = campaign.dietPlan || { importedAt: null, sourceFileName: null, status: "empty" };

      if (!Array.isArray(campaign.days) || campaign.days.length !== 14) {
        campaign.days = GlowApp.createDefaultDays(campaign.trainingChoices);
        campaign.currentDay = 1;
      }

      campaign.days.forEach(day => this.ensureDayModel(day));
    });
  },

  ensureDayModel(day) {
    if (!day) return;
    day.food ||= { breakfast:false, lunch:false, snack:false, dinner:false, continuousGrazing:false, binge:false, bingeReflection:"" };
    day.food.continuousGrazing = day.food.continuousGrazing === true;
    day.food.binge = day.food.binge === true;
    day.food.bingeReflection ||= "";
    day.foodLog ||= { breakfast: [], lunch: [], snack: [], dinner: [] };
    day.mealMeta ||= {};

    ["breakfast", "lunch", "snack", "dinner"].forEach(meal => {
      day.foodLog[meal] = Array.isArray(day.foodLog[meal]) ? day.foodLog[meal] : [];
      day.mealMeta[meal] ||= { mealName: "", confirmedAt: null };
      day.foodLog[meal].forEach(item => {
        if (item.planned === undefined) item.planned = false;
        if (item.eaten === undefined) item.eaten = true;
        item.origin ||= item.source === "diet" ? "diet" : "manual";
        if (item.quantity === undefined) item.quantity = item.amountG ?? item.grams ?? 0;
        if (!item.unit) item.unit = item.amountG != null ? "g" : "portion";
        if (item.grams === undefined) item.grams = item.amountG ?? null;
        item.nutritionStatus ||= "resolved";
        item.eatenAt = item.eaten ? (item.eatenAt || item.addedAt || null) : null;
      });
    });

    day.nutrition ||= { calories:null, protein:null, fibre:null, source:"manual", manualValues:{ calories:null, protein:null, fibre:null } };
    day.nutrition.manualValues ||= { calories:day.nutrition.calories ?? null, protein:day.nutrition.protein ?? null, fibre:day.nutrition.fibre ?? null };
    day.selfCare ||= { completions: {} };
    day.selfCare.completions ||= {};
    day.movement = Array.isArray(day.movement) ? day.movement : [];
    day.schedule = Array.isArray(day.schedule) ? day.schedule : [];
    day.challenge ||= day.dayNumber % 2 === 0
      ? { type:"disconnection", challengeId:"disconnection", label:"30 minutes of disconnection", done:false }
      : { type:"flexibility", challengeId:null, label:"", done:false };
    day.measurements ||= { weight:null, waist:null, hips:null, bust:null, notes:"", progressPhotoReminder:false };
  },

  get() { return this.data; },
  save() { return this.data ? GlowApp.Storage.save(this.data) : false; },

  getActiveCampaign() {
    return this.data?.campaigns?.find(campaign => campaign.id === this.data.activeCampaignId) || null;
  },

  setActiveCampaign(campaignId) {
    const campaign = this.data?.campaigns?.find(item => item.id === campaignId);
    if (!campaign) return false;
    this.data.activeCampaignId = campaignId;
    this.data.ui.selectedDay = campaign.currentDay || 1;
    this.data.ui.planDay = campaign.currentDay || 1;
    this.data.ui.scheduleDay = this.data.ui.planDay;
    this.save();
    return true;
  },

  getSelectedDayNumber() { return Number(this.data?.ui?.selectedDay || 1); },
  getSelectedDay() { return this.getDay(this.getSelectedDayNumber()); },
  getDay(dayNumber) {
    return this.getActiveCampaign()?.days?.find(day => Number(day.dayNumber) === Number(dayNumber)) || null;
  },

  setSelectedDay(dayNumber) {
    const campaign = this.getActiveCampaign();
    const numeric = Number(dayNumber);
    if (!campaign || !Number.isInteger(numeric) || numeric < 1 || numeric > campaign.length) return false;
    this.data.ui.selectedDay = numeric;
    this.ensureChallengeForDay(numeric);
    this.save();
    return true;
  },

  previousDay() { return this.getSelectedDayNumber() > 1 ? this.setSelectedDay(this.getSelectedDayNumber() - 1) : false; },
  nextDay() {
    const campaign = this.getActiveCampaign();
    return campaign && this.getSelectedDayNumber() < campaign.length
      ? this.setSelectedDay(this.getSelectedDayNumber() + 1)
      : false;
  },

  setCurrentCampaignDay(dayNumber) {
    const campaign = this.getActiveCampaign();
    const numeric = Number(dayNumber);
    if (!campaign || !Number.isInteger(numeric) || numeric < 1 || numeric > campaign.length) return false;
    campaign.currentDay = numeric;
    this.save();
    return true;
  },

  getActiveView() { return this.data?.ui?.activeView || "today"; },
  setActiveView(viewName) {
    const normalized = viewName === "schedule" ? "plan" : viewName;
    if (!["today", "campaign", "plan", "settings"].includes(normalized)) return false;
    this.data.ui.activeView = normalized;
    this.save();
    return true;
  },

  getPlanDayNumber() { return Number(this.data?.ui?.planDay || this.getSelectedDayNumber() || 1); },
  setPlanDay(dayNumber) {
    const campaign = this.getActiveCampaign();
    const numeric = Number(dayNumber);
    if (!campaign || !Number.isInteger(numeric) || numeric < 1 || numeric > campaign.length) return false;
    this.data.ui.planDay = numeric;
    this.data.ui.scheduleDay = numeric;
    this.save();
    return true;
  },
  getScheduleDayNumber() { return this.getPlanDayNumber(); },
  setScheduleDay(dayNumber) { return this.setPlanDay(dayNumber); },

  setPlanSection(section) {
    if (!["brain-dump", "training", "food-plan"].includes(section)) return false;
    this.data.ui.planSection = section;
    this.save();
    return true;
  },

  ensureChallengeForDay(dayNumber) {
    const campaign = this.getActiveCampaign();
    const day = this.getDay(dayNumber);
    if (!campaign || !day) return null;

    if (Number(dayNumber) % 2 === 0) {
      day.challenge = day.challenge?.type === "disconnection"
        ? day.challenge
        : { type:"disconnection", challengeId:"disconnection", label:"30 minutes of disconnection", done:false };
      day.challenge.label = "30 minutes of disconnection";
      return day.challenge;
    }

    if (!day.challenge || day.challenge.type !== "flexibility") {
      day.challenge = { type:"flexibility", challengeId:null, label:"", done:false };
    }
    if (day.challenge.challengeId) return day.challenge;

    const previousDayNumber = Number(dayNumber) - 2;
    if (previousDayNumber >= 1) {
      const previous = this.getDay(previousDayNumber);
      this.ensureChallengeForDay(previousDayNumber);
      if (previous?.challenge?.challengeId) {
        const previousScore = GlowApp.Scoring.getDayScore(previous, this.data.settings);
        const previousStatus = GlowApp.Scoring.getChallengeStatus(previous, previousScore);
        if (!previousStatus.passed) {
          day.challenge.challengeId = previous.challenge.challengeId;
          day.challenge.label = previous.challenge.label;
          return day.challenge;
        }
      }
    }

    const passedIds = new Set();
    campaign.days
      .filter(candidate => candidate.dayNumber < Number(dayNumber) && candidate.challenge?.type === "flexibility")
      .forEach(candidate => {
        if (!candidate.challenge?.challengeId) return;
        const score = GlowApp.Scoring.getDayScore(candidate, this.data.settings);
        if (GlowApp.Scoring.getChallengeStatus(candidate, score).passed) passedIds.add(candidate.challenge.challengeId);
      });

    const pool = (campaign.challengePool?.length ? campaign.challengePool : GlowApp.FLEXIBILITY_CHALLENGES.map(item => item.id))
      .filter(id => !passedIds.has(id));
    const source = pool.length ? pool : GlowApp.FLEXIBILITY_CHALLENGES.map(item => item.id);
    const id = source[Math.floor(Math.random() * source.length)];
    const definition = GlowApp.FLEXIBILITY_CHALLENGES.find(item => item.id === id);
    if (definition) {
      day.challenge.challengeId = definition.id;
      day.challenge.label = definition.label;
    }
    campaign.challengePool = source.slice();
    return day.challenge;
  },

  updateDay(dayNumber, updateFunction) {
    const day = this.getDay(dayNumber);
    if (!day || typeof updateFunction !== "function") return false;
    updateFunction(day);
    this.ensureDayModel(day);
    this.save();
    return true;
  },

  updateSelectedDay(updateFunction) { return this.updateDay(this.getSelectedDayNumber(), updateFunction); },

  updateSettings(updateFunction) {
    if (!this.data?.settings || typeof updateFunction !== "function") return false;
    updateFunction(this.data.settings);
    this.data.settings.nutrition.caloriesMax = 1400;
    this.data.settings.nutrition.caloriesGraceMax = 1500;
    this.save();
    return true;
  },

  createCampaign(name = "The Run") {
    const campaign = GlowApp.createDefaultCampaign();
    campaign.name = String(name || "The Run").trim() || "The Run";
    this.data.campaigns.push(campaign);
    this.data.activeCampaignId = campaign.id;
    this.data.ui.selectedDay = 1;
    this.data.ui.planDay = 1;
    this.data.ui.scheduleDay = 1;
    this.data.ui.activeView = "today";
    this.save();
    return campaign;
  },

  resetActiveCampaign() {
    const campaign = this.getActiveCampaign();
    if (!campaign) return false;
    const fresh = GlowApp.createDefaultCampaign();
    campaign.name = "The Run";
    campaign.startDate = fresh.startDate;
    campaign.createdAt = fresh.createdAt;
    campaign.length = 14;
    campaign.currentDay = 1;
    campaign.status = "active";
    campaign.challengePool = fresh.challengePool;
    campaign.brainDump = fresh.brainDump;
    campaign.grocery = fresh.grocery;
    campaign.trainingChoices = fresh.trainingChoices;
    campaign.dietPlan = fresh.dietPlan;
    campaign.days = fresh.days;
    this.data.ui.selectedDay = 1;
    this.data.ui.planDay = 1;
    this.data.ui.scheduleDay = 1;
    this.data.ui.activeView = "today";
    this.save();
    this.ensureChallengeForDay(1);
    return true;
  },

  deleteCampaign(campaignId) {
    if (!Array.isArray(this.data?.campaigns) || this.data.campaigns.length <= 1) return false;
    const index = this.data.campaigns.findIndex(c => c.id === campaignId);
    if (index < 0) return false;
    this.data.campaigns.splice(index, 1);
    if (this.data.activeCampaignId === campaignId) {
      this.data.activeCampaignId = this.data.campaigns[this.data.campaigns.length - 1].id;
    }
    this.ensureValidSelections();
    this.save();
    return true;
  },

  replaceState(newState) {
    if (!GlowApp.Storage.isValidState(newState) || Number(newState.version) !== GlowApp.APP_SCHEMA_VERSION) return false;
    this.data = newState;
    this.ensureV4Model();
    this.ensureValidSelections();
    this.save();
    return true;
  },

  /* Legacy method names retained for older controllers/tests. */
  migrateFoodLoggingModel() { this.ensureV4Model(); },
  migrateLegacyCopy() { this.ensureV4Model(); },

  ensureValidSelections() {
    if (!this.data) return;
    if (!Array.isArray(this.data.campaigns) || !this.data.campaigns.length) {
      const campaign = GlowApp.createDefaultCampaign();
      this.data.campaigns = [campaign];
      this.data.activeCampaignId = campaign.id;
    }
    let campaign = this.getActiveCampaign();
    if (!campaign) {
      campaign = this.data.campaigns[0];
      this.data.activeCampaignId = campaign.id;
    }
    this.data.ui ||= {};
    if (this.data.ui.activeView === "schedule") this.data.ui.activeView = "plan";
    if (!["today", "campaign", "plan", "settings"].includes(this.data.ui.activeView)) this.data.ui.activeView = "today";
    const validDay = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= campaign.length;
    if (!validDay(this.data.ui.selectedDay)) this.data.ui.selectedDay = campaign.currentDay || 1;
    if (!validDay(this.data.ui.planDay)) this.data.ui.planDay = this.data.ui.selectedDay;
    this.data.ui.scheduleDay = this.data.ui.planDay;
    if (!["brain-dump", "training", "food-plan"].includes(this.data.ui.planSection)) this.data.ui.planSection = "brain-dump";
    this.save();
  }
};
