/* =========================================================
   GLOW CAMPAIGN — DEFAULT DATA
========================================================= */

window.GlowApp = window.GlowApp || {};


/* =========================================================
   DEFAULT SETTINGS
========================================================= */

GlowApp.DEFAULT_SETTINGS = {

  nutrition: {
    caloriesMax: 1600,
    caloriesGraceMax: 1700,
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
      reward: "Massage / salon treatment / fancy dinner"
    },

    {
      id: "accomplished",
      label: "Mission accomplished",
      minPercent: 80,
      maxPercent: 94.99,
      reward: "Rent a car + go somewhere nice"
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
   FLEXIBILITY CHALLENGES
========================================================= */

GlowApp.FLEXIBILITY_CHALLENGES = [
  { id: "condiment-oil", label: "Use condiment on one dish — oil" },
  { id: "normal-pasta", label: "Have a normal-sized pasta dish" },
  { id: "breakfast-out", label: "Have breakfast out" },
  { id: "stay-in-bed", label: "Stay in bed late" },
  { id: "leave-half", label: "Leave half of something for tomorrow" },
  { id: "enjoy-before-calories", label: "Eat something you like without checking calories first" },
  { id: "drink-out", label: "Have a drink out" },
  { id: "someone-else-portions", label: "Let someone else portion one meal without correcting or weighing it" },
  { id: "cook-unweighed", label: "Cook one ingredient without weighing it" },
  { id: "bread-twice", label: "Eat bread at two different meals in the same day" },
  { id: "carbs-and-fat", label: "Have a meal containing both carbs and fat without compensating elsewhere" },
  { id: "normal-spread", label: "Use cheese, butter or Philadelphia normally rather than the thinnest possible layer" },
  { id: "later-dinner", label: "Eat dinner later than usual if you’re hungry" },
  { id: "planned-snack", label: "Have the planned snack even if lunch was slightly larger than expected" },
  { id: "choose-menu-want", label: "Choose the thing you actually want from a menu" },
  { id: "dessert-after-meal", label: "Have dessert after a normal meal without making the meal smaller to earn it" },
  { id: "track-afterward", label: "Eat one meal without tracking it until afterward" },
  { id: "no-measuring-day", label: "Take one full day without weighing yourself or measuring anything" },
  { id: "keep-treat", label: "Buy a multi-serving treat and intentionally keep some for another day" },
  { id: "rest-with-food", label: "Have a rest day without reducing food because you didn’t train" },
  { id: "normal-version", label: "Choose the full-fat or normal version of something you normally buy light" },
  { id: "add-carb", label: "Add a carb to a meal because it improves the meal, not because training justifies it" },
  { id: "spontaneous-offer", label: "Eat something spontaneously offered by someone without doing calorie archaeology" }
];


/* =========================================================
   WORKOUT CATALOGUE

   This is the list used later by the schedule editor.
========================================================= */

GlowApp.WORKOUT_TYPES = [

  {
    id: "morning-walk-jog",
    label: "Morning walk / jog",
    defaultPeriod: "morning",
    defaultPoints: 1
  },

  {
    id: "evening-walk",
    label: "Evening walk",
    defaultPeriod: "evening",
    defaultPoints: 2
  },

  {
    id: "upper-back-arms",
    label: "Upper back / arms",
    defaultPeriod: "morning",
    defaultPoints: 1
  },

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
  alternativeGroup = null,
  points = 1
}) {

  return {
    id: GlowApp.createId("movement"),
    type,
    label,
    period,
    completed: false,
    points: Number(points) > 0 ? Number(points) : 1,

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
  linkedMovementType = null,
  linkedMovementId = null,
  points = 1
}) {

  return {
    id: GlowApp.createId("schedule"),
    label,
    period,
    category,
    scored,
    linkedMovementType,
    linkedMovementId,
    points: scored ? (Number(points) > 0 ? Number(points) : 1) : 0
  };

};


/* =========================================================
   HELPER — STANDARD DAILY SCHEDULE ITEMS

   These appear on every day unless later edited.
========================================================= */

GlowApp.createBaseSchedule = function () {

  return [
    GlowApp.createScheduleItem({ label: "Breakfast", period: "morning", category: "food", scored: true }),
    GlowApp.createScheduleItem({ label: "Lunch", period: "midday", category: "food", scored: true }),
    GlowApp.createScheduleItem({ label: "Snack / treat", period: "afternoon", category: "food", scored: true }),
    GlowApp.createScheduleItem({ label: "Dinner", period: "evening", category: "food", scored: true })
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
        linkedMovementType: movement.type,
        linkedMovementId: movement.id,
        points: movement.points
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

  GlowApp.addMovementToSchedule(schedule, movement);

  const selfCareDefinitions = [
    ...(options.morningRoutine ? [{ label: "Morning routine", period: "morning" }] : []),
    { label: "Evening routine", period: "evening" }
  ];

  const selfCareCompletions = {};

  selfCareDefinitions.forEach(definition => {
    const item = GlowApp.createScheduleItem({
      label: definition.label,
      period: definition.period,
      category: "glow",
      scored: true,
      points: 1
    });

    schedule.push(item);
    selfCareCompletions[item.id] = false;
  });

  const isFlexibilityDay = dayNumber % 2 === 1;

  return {
    dayNumber,

    food: {
      breakfast: false,
      lunch: false,
      snack: false,
      dinner: false,
      continuousGrazing: false,
      binge: false,
      bingeReflection: ""
    },

    nutrition: {
      calories: null,
      protein: null,
      fibre: null,
      source: "manual",
      manualValues: { calories: null, protein: null, fibre: null }
    },

    foodLog: { breakfast: [], lunch: [], snack: [], dinner: [] },

    water: { glasses: [false, false, false, false, false, false] },

    /* Legacy object retained so old helper code/imports fail safely. */
    glow: {
      somatoline: false,
      skincare: false,
      skincareLabel: options.skincareLabel || GlowApp.DEFAULT_SETTINGS.glow.skincareLabel,
      glowDay: { enabled: false, label: "", note: "" }
    },

    selfCare: {
      completions: selfCareCompletions
    },

    movement,

    /* Legacy dog state retained, but the v3 plan scores evening walk as movement. */
    dogWalk: { completed: false },

    challenge: isFlexibilityDay
      ? { type: "flexibility", challengeId: null, label: "", done: false }
      : { type: "disconnection", challengeId: "disconnection", label: "30 minutes of disconnection", done: false },

    recovery: { sleep: null, hunger: null, soreness: null, mood: null },

    schedule,

    measurements: {
      weight: null, waist: null, hips: null, bust: null, notes: "", progressPhotoReminder: false
    }
  };

};


/* =========================================================
   INITIAL 10-DAY PLAN
========================================================= */

GlowApp.createDefaultDays = function () {

  const strengthPlan = {
    1: { type: "glute-strength", label: "Glutes strength" },
    2: { type: "abs", label: "Abs" },
    3: { type: "total-body-conditioning", label: "Total body conditioning" },
    5: { type: "glute-strength", label: "Glutes strength" },
    6: { type: "abs", label: "Abs" },
    7: { type: "upper-back-arms", label: "Upper back / arms" },
    9: { type: "glute-strength", label: "Glutes strength" },
    10: { type: "abs", label: "Abs" }
  };

  return Array.from({ length: 10 }, (_, index) => {
    const dayNumber = index + 1;
    const restDay = dayNumber === 4 || dayNumber === 8;
    const movement = [];

    if (!restDay) {
      movement.push(
        GlowApp.createMovementItem({
          type: "morning-walk-jog",
          label: "Morning walk / jog",
          period: "morning",
          points: 1
        }),
        GlowApp.createMovementItem({
          type: strengthPlan[dayNumber].type,
          label: strengthPlan[dayNumber].label,
          period: "morning",
          points: 1
        })
      );
    }

    movement.push(
      GlowApp.createMovementItem({
        type: "evening-walk",
        label: "Evening walk",
        period: "evening",
        points: 2
      })
    );

    return GlowApp.createEmptyDayState(
      dayNumber,
      movement,
      { morningRoutine: [1, 4, 8].includes(dayNumber) }
    );
  });

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

    challengePool: GlowApp.FLEXIBILITY_CHALLENGES.map(item => item.id),

    days: GlowApp.createDefaultDays()

  };

};


/* =========================================================
   DEFAULT APP STATE
========================================================= */

GlowApp.createDefaultAppState = function () {

  const campaign = GlowApp.createDefaultCampaign();

  return {

    version: 3,

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