/* =========================================================
   GLOW CAMPAIGN — STATE
========================================================= */

window.GlowApp = window.GlowApp || {};


/* =========================================================
   STATE MANAGER
========================================================= */

GlowApp.State = {

  data: null,


  /* =======================================================
     INITIALISE

     1. Try localStorage
     2. Otherwise create default app state
     3. Immediately save fresh state
  ======================================================== */

  init() {

    const savedState = GlowApp.Storage.load();


    if (savedState) {

      this.data = savedState;

    } else {

      this.data = GlowApp.createDefaultAppState();

      GlowApp.Storage.save(
        this.data
      );

    }


    this.migrateLegacyCopy();
    this.migrateFoodLoggingModel();
    this.ensureValidSelections();
    this.save();


    return this.data;
  },


  /* =======================================================
     GET FULL STATE
  ======================================================== */

  get() {
    return this.data;
  },


  /* =======================================================
     SAVE CURRENT STATE
  ======================================================== */

  save() {

    if (!this.data) {
      return false;
    }


    return GlowApp.Storage.save(
      this.data
    );
  },


  /* =======================================================
     ACTIVE CAMPAIGN
  ======================================================== */

  getActiveCampaign() {

    if (!this.data) {
      return null;
    }


    return (
      this.data.campaigns.find(
        campaign =>
          campaign.id === this.data.activeCampaignId
      ) || null
    );
  },


  /* =======================================================
     SET ACTIVE CAMPAIGN
  ======================================================== */

  setActiveCampaign(campaignId) {

    const campaign = this.data.campaigns.find(
      item => item.id === campaignId
    );


    if (!campaign) {
      return false;
    }


    this.data.activeCampaignId = campaignId;

    this.data.ui.selectedDay =
      campaign.currentDay || 1;

    this.data.ui.scheduleDay =
      campaign.currentDay || 1;


    this.save();

    return true;
  },


  /* =======================================================
     SELECTED DAY
  ======================================================== */

  getSelectedDayNumber() {

    return (
      this.data?.ui?.selectedDay ||
      1
    );
  },


  getSelectedDay() {

    const campaign =
      this.getActiveCampaign();


    if (!campaign) {
      return null;
    }


    const selectedDayNumber =
      this.getSelectedDayNumber();


    return (
      campaign.days.find(
        day =>
          day.dayNumber === selectedDayNumber
      ) || null
    );
  },


  /* =======================================================
     GET SPECIFIC DAY
  ======================================================== */

  getDay(dayNumber) {

    const campaign =
      this.getActiveCampaign();


    if (!campaign) {
      return null;
    }


    return (
      campaign.days.find(
        day =>
          day.dayNumber === Number(dayNumber)
      ) || null
    );
  },


  /* =======================================================
     CHANGE SELECTED DAY
  ======================================================== */

  setSelectedDay(dayNumber) {

    const campaign =
      this.getActiveCampaign();


    if (!campaign) {
      return false;
    }


    const numericDay =
      Number(dayNumber);


    if (
      numericDay < 1 ||
      numericDay > campaign.length
    ) {
      return false;
    }


    this.data.ui.selectedDay =
      numericDay;


    this.save();

    return true;
  },


  /* =======================================================
     MOVE TO PREVIOUS / NEXT DAY
  ======================================================== */

  previousDay() {

    const current =
      this.getSelectedDayNumber();


    if (current <= 1) {
      return false;
    }


    return this.setSelectedDay(
      current - 1
    );
  },


  nextDay() {

    const campaign =
      this.getActiveCampaign();


    if (!campaign) {
      return false;
    }


    const current =
      this.getSelectedDayNumber();


    if (current >= campaign.length) {
      return false;
    }


    return this.setSelectedDay(
      current + 1
    );
  },


  /* =======================================================
     CURRENT CAMPAIGN DAY

     This is conceptually different from selectedDay.

     selectedDay:
     what you're currently looking at

     currentDay:
     where you currently are in the campaign
  ======================================================== */

  setCurrentCampaignDay(dayNumber) {

    const campaign =
      this.getActiveCampaign();


    if (!campaign) {
      return false;
    }


    const numericDay =
      Number(dayNumber);


    if (
      numericDay < 1 ||
      numericDay > campaign.length
    ) {
      return false;
    }


    campaign.currentDay =
      numericDay;


    this.save();

    return true;
  },


  /* =======================================================
     ACTIVE VIEW
  ======================================================== */

  getActiveView() {

    return (
      this.data?.ui?.activeView ||
      "today"
    );
  },


  setActiveView(viewName) {

    const allowedViews = [
      "today",
      "campaign",
      "schedule",
      "settings"
    ];


    if (
      !allowedViews.includes(viewName)
    ) {
      return false;
    }


    this.data.ui.activeView =
      viewName;


    this.save();

    return true;
  },


  /* =======================================================
     SCHEDULE EDITOR DAY
  ======================================================== */

  getScheduleDayNumber() {

    return (
      this.data?.ui?.scheduleDay ||
      1
    );
  },


  setScheduleDay(dayNumber) {

    const campaign =
      this.getActiveCampaign();


    if (!campaign) {
      return false;
    }


    const numericDay =
      Number(dayNumber);


    if (
      numericDay < 1 ||
      numericDay > campaign.length
    ) {
      return false;
    }


    this.data.ui.scheduleDay =
      numericDay;


    this.save();

    return true;
  },


  /* =======================================================
     UPDATE DAY

     Generic helper for mutations.

     Example later:

     GlowApp.State.updateDay(1, day => {
       day.food.breakfast = true;
     });
  ======================================================== */

  updateDay(dayNumber, updateFunction) {

    const day =
      this.getDay(dayNumber);


    if (!day) {
      return false;
    }


    if (
      typeof updateFunction !== "function"
    ) {
      return false;
    }


    updateFunction(day);


    this.save();

    return true;
  },


  /* =======================================================
     UPDATE SELECTED DAY
  ======================================================== */

  updateSelectedDay(updateFunction) {

    return this.updateDay(
      this.getSelectedDayNumber(),
      updateFunction
    );
  },


  /* =======================================================
     UPDATE SETTINGS
  ======================================================== */

  updateSettings(updateFunction) {

    if (
      typeof updateFunction !== "function"
    ) {
      return false;
    }


    updateFunction(
      this.data.settings
    );


    this.save();

    return true;
  },


  /* =======================================================
     CREATE NEW CAMPAIGN

     Keeps campaign history.
  ======================================================== */

  createCampaign(name = "Ten Day Run") {

    const campaign =
      GlowApp.createDefaultCampaign();


    campaign.name =
      name.trim() || "Ten Day Run";


    this.data.campaigns.push(
      campaign
    );


    this.data.activeCampaignId =
      campaign.id;

    this.data.ui.selectedDay = 1;
    this.data.ui.scheduleDay = 1;
    this.data.ui.activeView = "today";


    this.save();


    return campaign;
  },


  /* =======================================================
     RESET CURRENT CAMPAIGN

     Keeps the same campaign identity, name and start date,
     but resets all 10 daily states.

     This is useful if you've entered test data and want
     to restart cleanly.
  ======================================================== */

resetActiveCampaign() {

  const campaign =
    this.getActiveCampaign();


  if (!campaign) {
    return false;
  }


  campaign.days.forEach(
    day => {

      /* ---------------------------------------------
         Food
      ---------------------------------------------- */

      day.food = {
        breakfast: false,
        lunch: false,
        snack: false,
        dinner: false,
        continuousGrazing: false
      };


      /* ---------------------------------------------
         Nutrition
      ---------------------------------------------- */

      day.nutrition = {
        calories: null,
        protein: null,
        fibre: null,
        source: "manual",
        manualValues: {
          calories: null,
          protein: null,
          fibre: null
        }
      };


      /* ---------------------------------------------
         Food log

         Clear foods from this run, but keep the global
         IndexedDB food library for fast reuse next time.
      ---------------------------------------------- */

      day.foodLog = {
        breakfast: [],
        lunch: [],
        snack: [],
        dinner: []
      };


      /* ---------------------------------------------
         Water

         Preserve current number of glasses.
      ---------------------------------------------- */

      const waterLength =
        Array.isArray(
          day.water?.glasses
        )
          ? day.water.glasses.length
          : this.data.settings
              .water
              .targetGlasses;


      day.water = {
        glasses:
          Array(
            waterLength
          ).fill(false)
      };


      /* ---------------------------------------------
         Movement

         Preserve workout plan, labels, timing and OR
         groups. Reset completion only.
      ---------------------------------------------- */

      if (
        Array.isArray(day.movement)
      ) {

        day.movement.forEach(
          movement => {

            movement.completed =
              false;

          }
        );

      }


      /* ---------------------------------------------
         Glow
      ---------------------------------------------- */

      day.glow.somatoline =
        false;

      day.glow.skincare =
        false;


      /* ---------------------------------------------
         Dog walk
      ---------------------------------------------- */

      day.dogWalk.completed =
        false;


      /* ---------------------------------------------
         Recovery
      ---------------------------------------------- */

      day.recovery = {
        sleep: null,
        hunger: null,
        soreness: null,
        mood: null
      };


      /* ---------------------------------------------
         Measurements
      ---------------------------------------------- */

      day.measurements = {
        weight: null,
        waist: null,
        hips: null,
        bust: null,
        notes: "",
        progressPhotoReminder: false
      };

    }
  );


  campaign.currentDay =
    1;

  campaign.status =
    "active";


  this.data.ui.selectedDay =
    1;

  this.data.ui.scheduleDay =
    1;

  this.data.ui.activeView =
    "today";


  this.save();


  return true;

},

  /* =======================================================
     DELETE CAMPAIGN

     Not surfaced in the UI yet, but useful internally.
  ======================================================== */

  deleteCampaign(campaignId) {

    if (
      this.data.campaigns.length <= 1
    ) {
      return false;
    }


    const campaignIndex =
      this.data.campaigns.findIndex(
        campaign =>
          campaign.id === campaignId
      );


    if (campaignIndex === -1) {
      return false;
    }


    this.data.campaigns.splice(
      campaignIndex,
      1
    );


    if (
      this.data.activeCampaignId ===
      campaignId
    ) {

      const replacement =
        this.data.campaigns[
          this.data.campaigns.length - 1
        ];


      this.data.activeCampaignId =
        replacement.id;

      this.data.ui.selectedDay =
        replacement.currentDay || 1;

      this.data.ui.scheduleDay =
        replacement.currentDay || 1;
    }


    this.save();

    return true;
  },


  /* =======================================================
     REPLACE FULL STATE

     Mainly for JSON import later.
  ======================================================== */

  replaceState(newState) {

    if (
      !GlowApp.Storage.isValidState(
        newState
      )
    ) {
      return false;
    }


    this.data =
      newState;


    this.migrateLegacyCopy();
    this.migrateFoodLoggingModel();
    this.ensureValidSelections();


    this.save();

    return true;
  },


  /* =======================================================
     FOOD LOGGING MIGRATION

     Older saved runs only contain behavioural meal booleans and
     manually-entered nutrition totals. Keep those intact while
     adding the Phase 2 meal food log structure.
  ======================================================== */

  migrateFoodLoggingModel() {

    if (!this.data?.campaigns) {
      return;
    }


    this.data.version = Math.max(
      Number(this.data.version || 1),
      2
    );


    this.data.campaigns.forEach((campaign) => {

      if (!Array.isArray(campaign.days)) {
        return;
      }


      campaign.days.forEach((day) => {

        if (!day.foodLog || typeof day.foodLog !== "object") {

          day.foodLog = {
            breakfast: [],
            lunch: [],
            snack: [],
            dinner: []
          };
        }


        [
          "breakfast",
          "lunch",
          "snack",
          "dinner"
        ].forEach((meal) => {

          if (!Array.isArray(day.foodLog[meal])) {
            day.foodLog[meal] = [];
          }

        });


        if (!day.nutrition || typeof day.nutrition !== "object") {

          day.nutrition = {
            calories: null,
            protein: null,
            fibre: null
          };
        }


        if (!day.nutrition.source) {
          day.nutrition.source = "manual";
        }


        if (!day.nutrition.manualValues) {

          day.nutrition.manualValues = {
            calories: day.nutrition.calories ?? null,
            protein: day.nutrition.protein ?? null,
            fibre: day.nutrition.fibre ?? null
          };
        }

      });

    });
  },


  /* =======================================================
     LEGACY COPY MIGRATION

     Keeps existing localStorage / older JSON backups from
     surfacing the previous user-facing name. Internal keys
     stay untouched for backward compatibility.
  ======================================================== */

  migrateLegacyCopy() {

    if (!this.data) {
      return;
    }


    if (Array.isArray(this.data.campaigns)) {

      this.data.campaigns.forEach(
        campaign => {

          if (
            campaign.name ===
            "Glow Campaign"
          ) {

            campaign.name =
              "Ten Day Run";

          }

        }
      );

    }


    const rewards =
      this.data.settings?.rewards;


    if (Array.isArray(rewards)) {

      rewards.forEach(
        tier => {

          if (
            tier.label ===
            "Legendary / Perfect-enough campaign"
          ) {

            tier.label =
              "Legendary / Perfect-enough run";

          }

        }
      );

    }

  },


  /* =======================================================
     SAFETY CHECKS

     Helps if imported/saved data references a campaign or
     day that no longer exists.
  ======================================================== */

  ensureValidSelections() {

    if (!this.data) {
      return;
    }


    /* -----------------------------------------------
       Ensure at least one campaign exists
    ------------------------------------------------ */

    if (
      !Array.isArray(this.data.campaigns) ||
      this.data.campaigns.length === 0
    ) {

      const campaign =
        GlowApp.createDefaultCampaign();


      this.data.campaigns = [
        campaign
      ];

      this.data.activeCampaignId =
        campaign.id;
    }


    /* -----------------------------------------------
       Ensure active campaign exists
    ------------------------------------------------ */

    let campaign =
      this.getActiveCampaign();


    if (!campaign) {

      campaign =
        this.data.campaigns[0];

      this.data.activeCampaignId =
        campaign.id;
    }


    /* -----------------------------------------------
       Ensure UI object exists
    ------------------------------------------------ */

    if (!this.data.ui) {

      this.data.ui = {
        activeView: "today",
        selectedDay: 1,
        scheduleDay: 1
      };

    }


    /* -----------------------------------------------
       Validate selected day
    ------------------------------------------------ */

    if (
      !Number.isInteger(
        Number(this.data.ui.selectedDay)
      ) ||
      this.data.ui.selectedDay < 1 ||
      this.data.ui.selectedDay > campaign.length
    ) {

      this.data.ui.selectedDay =
        campaign.currentDay || 1;
    }


    /* -----------------------------------------------
       Validate schedule day
    ------------------------------------------------ */

    if (
      !Number.isInteger(
        Number(this.data.ui.scheduleDay)
      ) ||
      this.data.ui.scheduleDay < 1 ||
      this.data.ui.scheduleDay > campaign.length
    ) {

      this.data.ui.scheduleDay =
        this.data.ui.selectedDay;
    }


    /* -----------------------------------------------
       Validate view
    ------------------------------------------------ */

    const allowedViews = [
      "today",
      "campaign",
      "schedule",
      "settings"
    ];


    if (
      !allowedViews.includes(
        this.data.ui.activeView
      )
    ) {

      this.data.ui.activeView =
        "today";
    }


    this.save();
  }

};