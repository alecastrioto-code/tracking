/* =========================================================
   GLOW CAMPAIGN — DEFAULT DATA
========================================================= */

window.GlowApp = window.GlowApp || {};


/* =========================================================
   DEFAULT SETTINGS
========================================================= */

GlowApp.DEFAULT_SETTINGS = {

  nutrition: {
    caloriesMin: 1200,
    caloriesMax: 1500,
    proteinMin: 90,
    fibreMin: 25
  },

  water: {
    targetGlasses: 6,

    labels: [
      "Waking",
      "Breakfast",
      "Mid-morning",
      "Pre-lunch",
      "Lunch",
      "Before 16:00"
    ]
  },

  glow: {
    skincareLabel: "PM skincare"
  },

  rewards: [
    {
      id: "legendary",
      label: "Legendary / Perfect-enough run",
      minPercent: 95,
      maxPercent: 100,
      reward: "Buy an outfit or piece of clothing I really want"
    },

    {
      id: "accomplished",
      label: "Mission accomplished",
      minPercent: 80,
      maxPercent: 94.99,
      reward: "Massage / salon / beauty treatment"
    },

    {
      id: "review",
      label: "Review & redesign",
      minPercent: 0,
      maxPercent: 79.99,
      reward: "",
      message: "Review where the system failed and redesign."
    }
  ]

};


/* =========================================================
   WORKOUT CATALOGUE

   This is the list used later by the schedule editor.
========================================================= */

GlowApp.WORKOUT_TYPES = [

  {
    id: "glute-strength",
    label: "Glute strength / hypertrophy",
    defaultPeriod: "morning"
  },

  {
    id: "glute-conditioning",
    label: "Glute conditioning",
    defaultPeriod: "morning"
  },

  {
    id: "glute-pump",
    label: "Glute pump",
    defaultPeriod: "afternoon",
    note: "Afternoon only"
  },

  {
    id: "total-body-conditioning",
    label: "Total-body conditioning",
    defaultPeriod: "morning"
  },

  {
    id: "arms-pilates",
    label: "Arms conditioning / Pilates",
    defaultPeriod: "morning"
  },

  {
    id: "upper-back-strength",
    label: "Upper-back strength",
    defaultPeriod: "morning"
  },

  {
    id: "abs",
    label: "Abs",
    defaultPeriod: "afternoon"
  },

  {
    id: "mobility",
    label: "Mobility",
    defaultPeriod: "evening"
  },

  {
    id: "jog",
    label: "Jog",
    defaultPeriod: "morning"
  },

  {
    id: "walk",
    label: "Walk",
    defaultPeriod: "afternoon"
  }

];


/* =========================================================
   HELPER — CREATE UNIQUE IDS

   Simple local ID generator.
   Good enough for a local personal app.
========================================================= */

GlowApp.createId = function (prefix = "item") {

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8);

  const timePart = Date.now()
    .toString(36);

  return `${prefix}-${timePart}-${randomPart}`;
};


/* =========================================================
   HELPER — CREATE MOVEMENT ITEM
========================================================= */

GlowApp.createMovementItem = function ({
  type,
  label,
  period = "morning",
  alternativeGroup = null
}) {

  return {
    id: GlowApp.createId("movement"),
    type,
    label,
    period,
    completed: false,

    /*
      Normally every movement item is worth one point.

      If multiple items share the same alternativeGroup,
      completing any one of them satisfies one group point.

      Example:
      Day 4 walk OR jog.
    */
    alternativeGroup
  };

};


/* =========================================================
   HELPER — CREATE SCHEDULE ITEM
========================================================= */

GlowApp.createScheduleItem = function ({
  label,
  period,
  category,
  scored = false,
  linkedMovementType = null
}) {

  return {
    id: GlowApp.createId("schedule"),
    label,
    period,
    category,
    scored,
    linkedMovementType
  };

};


/* =========================================================
   HELPER — STANDARD DAILY SCHEDULE ITEMS

   These appear on every day unless later edited.
========================================================= */

GlowApp.createBaseSchedule = function () {

  return [

    GlowApp.createScheduleItem({
      label: "Breakfast",
      period: "morning",
      category: "food",
      scored: true
    }),

    GlowApp.createScheduleItem({
      label: "Lunch",
      period: "midday",
      category: "food",
      scored: true
    }),

    GlowApp.createScheduleItem({
      label: "Snack / treat",
      period: "afternoon",
      category: "food",
      scored: true
    }),

    GlowApp.createScheduleItem({
      label: "Evening dog walk",
      period: "evening",
      category: "dog",
      scored: true
    }),

    GlowApp.createScheduleItem({
      label: "Dinner",
      period: "evening",
      category: "food",
      scored: true
    }),

    GlowApp.createScheduleItem({
      label: "PM skincare",
      period: "evening",
      category: "glow",
      scored: true
    })

  ];

};


/* =========================================================
   HELPER — ADD MOVEMENT TO SCHEDULE

   Keeps movement data and timeline data aligned initially.
========================================================= */

GlowApp.addMovementToSchedule = function (
  schedule,
  movementItems
) {

  movementItems.forEach((movement) => {

    schedule.push(
      GlowApp.createScheduleItem({
        label: movement.label,
        period: movement.period,
        category: "movement",
        scored: true,
        linkedMovementType: movement.type
      })
    );

  });

  return schedule;

};


/* =========================================================
   HELPER — EMPTY DAILY STATE
========================================================= */

GlowApp.createEmptyDayState = function (
  dayNumber,
  movement,
  options = {}
) {

  const schedule = GlowApp.createBaseSchedule();

  GlowApp.addMovementToSchedule(
    schedule,
    movement
  );


  return {

    dayNumber,


    /* -----------------------------------------------------
       FOOD RHYTHM
    ------------------------------------------------------ */

    food: {
      breakfast: false,
      lunch: false,
      snack: false,
      dinner: false,
      continuousGrazing: false
    },


    /* -----------------------------------------------------
       NUTRITION
    ------------------------------------------------------ */

    nutrition: {
      calories: null,
      protein: null,
      fibre: null,

      /*
        Manual values stay available as a fallback. Once foods are
        logged, food-log.js derives the visible totals automatically.
      */
      source: "manual",

      manualValues: {
        calories: null,
        protein: null,
        fibre: null
      }
    },


    /* -----------------------------------------------------
       FOOD LOG

       Food Rhythm above remains behavioural scoring.
       Food Log records what was eaten within each meal.
    ------------------------------------------------------ */

    foodLog: {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: []
    },


    /* -----------------------------------------------------
       WATER
    ------------------------------------------------------ */

    water: {
      glasses: [
        false,
        false,
        false,
        false,
        false,
        false
      ]
    },


    /* -----------------------------------------------------
       GLOW
    ------------------------------------------------------ */

    glow: {
      somatoline: false,
      skincare: false,

      skincareLabel:
        options.skincareLabel ||
        GlowApp.DEFAULT_SETTINGS.glow.skincareLabel,

      glowDay: {
        enabled: options.glowDay?.enabled || false,
        label: options.glowDay?.label || "",
        note: options.glowDay?.note || ""
      }
    },


    /* -----------------------------------------------------
       MOVEMENT
    ------------------------------------------------------ */

    movement,


    /* -----------------------------------------------------
       DOG WALK
    ------------------------------------------------------ */

    dogWalk: {
      completed: false
    },


    /* -----------------------------------------------------
       RECOVERY — NEVER SCORED

       Null means "not logged yet".
       We don't default these to 3, because that would make
       it look as though recovery data exists when it doesn't.
    ------------------------------------------------------ */

    recovery: {
      sleep: null,
      hunger: null,
      soreness: null,
      mood: null
    },


    /* -----------------------------------------------------
       TIMELINE / SCHEDULE
    ------------------------------------------------------ */

    schedule,


    /* -----------------------------------------------------
       DAY 10 INFORMATIONAL TRACKING
    ------------------------------------------------------ */

    measurements: {
      weight: null,
      waist: null,
      hips: null,
      bust: null,
      notes: "",
      progressPhotoReminder: false
    }

  };

};


/* =========================================================
   INITIAL 10-DAY PLAN
========================================================= */

GlowApp.createDefaultDays = function () {

  /* =======================================================
     DAY 1
  ======================================================== */

  const day1Movement = [

    GlowApp.createMovementItem({
      type: "jog",
      label: "Jog",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "glute-strength",
      label: "Glute strength",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "abs",
      label: "Abs",
      period: "afternoon"
    })

  ];


  /* =======================================================
     DAY 2
  ======================================================== */

  const day2Movement = [

    GlowApp.createMovementItem({
      type: "jog",
      label: "Jog",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "total-body-conditioning",
      label: "Total-body conditioning",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "mobility",
      label: "Mobility",
      period: "evening"
    })

  ];


  /* =======================================================
     DAY 3
  ======================================================== */

  const day3Movement = [

    GlowApp.createMovementItem({
      type: "upper-back-strength",
      label: "Upper-back strength",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "abs",
      label: "Abs",
      period: "afternoon"
    }),

    GlowApp.createMovementItem({
      type: "walk",
      label: "Walk",
      period: "afternoon"
    })

  ];


  /* =======================================================
     DAY 4

     Walk OR jog = one available movement point.
  ======================================================== */

  const day4Movement = [

    GlowApp.createMovementItem({
      type: "walk",
      label: "Easy walk",
      period: "morning",
      alternativeGroup: "day4-easy-cardio"
    }),

    GlowApp.createMovementItem({
      type: "jog",
      label: "Easy jog",
      period: "morning",
      alternativeGroup: "day4-easy-cardio"
    })

  ];


  /* =======================================================
     DAY 5
  ======================================================== */

  const day5Movement = [

    GlowApp.createMovementItem({
      type: "jog",
      label: "Jog",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "glute-strength",
      label: "Glute strength",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "glute-pump",
      label: "Glute pump",
      period: "afternoon"
    })

  ];


  /* =======================================================
     DAY 6
  ======================================================== */

  const day6Movement = [

    GlowApp.createMovementItem({
      type: "total-body-conditioning",
      label: "Total-body conditioning",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "walk",
      label: "Walk",
      period: "afternoon"
    })

  ];


  /* =======================================================
     DAY 7
  ======================================================== */

  const day7Movement = [

    GlowApp.createMovementItem({
      type: "glute-strength",
      label: "Glute strength",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "walk",
      label: "Walk",
      period: "afternoon"
    })

  ];


  /* =======================================================
     DAY 8
  ======================================================== */

  const day8Movement = [

    GlowApp.createMovementItem({
      type: "jog",
      label: "Jog",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "glute-strength",
      label: "Glute strength",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "abs",
      label: "Abs",
      period: "afternoon"
    })

  ];


  /* =======================================================
     DAY 9
  ======================================================== */

  const day9Movement = [

    GlowApp.createMovementItem({
      type: "jog",
      label: "Jog",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "arms-pilates",
      label: "Arms conditioning / Pilates",
      period: "afternoon"
    }),

    GlowApp.createMovementItem({
      type: "mobility",
      label: "Mobility",
      period: "evening"
    })

  ];


  /* =======================================================
     DAY 10
  ======================================================== */

  const day10Movement = [

    GlowApp.createMovementItem({
      type: "glute-conditioning",
      label: "Glute conditioning",
      period: "morning"
    }),

    GlowApp.createMovementItem({
      type: "abs",
      label: "Abs",
      period: "afternoon"
    }),

    GlowApp.createMovementItem({
      type: "walk",
      label: "Walk",
      period: "afternoon"
    })

  ];


  /* =======================================================
     RETURN DAYS
  ======================================================== */

  return [

    GlowApp.createEmptyDayState(
      1,
      day1Movement
    ),

    GlowApp.createEmptyDayState(
      2,
      day2Movement
    ),

    GlowApp.createEmptyDayState(
      3,
      day3Movement
    ),

    GlowApp.createEmptyDayState(
      4,
      day4Movement
    ),

    GlowApp.createEmptyDayState(
      5,
      day5Movement
    ),

    GlowApp.createEmptyDayState(
      6,
      day6Movement
    ),

    GlowApp.createEmptyDayState(
      7,
      day7Movement
    ),

    GlowApp.createEmptyDayState(
      8,
      day8Movement
    ),

    GlowApp.createEmptyDayState(
      9,
      day9Movement
    ),

    GlowApp.createEmptyDayState(
      10,
      day10Movement
    )

  ];

};


/* =========================================================
   DEFAULT CAMPAIGN
========================================================= */

GlowApp.createDefaultCampaign = function () {

  const now = new Date();

  return {

    id: GlowApp.createId("campaign"),

    name: "Ten Day Run",

    createdAt: now.toISOString(),

    startDate: now
      .toISOString()
      .slice(0, 10),

    length: 10,

    currentDay: 1,

    status: "active",

    days: GlowApp.createDefaultDays()

  };

};


/* =========================================================
   DEFAULT APP STATE
========================================================= */

GlowApp.createDefaultAppState = function () {

  const campaign = GlowApp.createDefaultCampaign();

  return {

    version: 2,

    settings: JSON.parse(
      JSON.stringify(
        GlowApp.DEFAULT_SETTINGS
      )
    ),

    campaigns: [
      campaign
    ],

    activeCampaignId: campaign.id,

    ui: {
      activeView: "today",
      selectedDay: 1,
      scheduleDay: 1
    }

  };

};