/* =========================================================
   THE RUN — DEFAULT DATA / SCHEMA V4
========================================================= */

window.GlowApp = window.GlowApp || {};

GlowApp.APP_SCHEMA_VERSION = 4;
GlowApp.RUN_LENGTH = 14;

GlowApp.DEFAULT_SETTINGS = {
  nutrition: {
    caloriesMax: 1400,
    caloriesGraceMax: 1500,
    proteinMin: 90,
    fibreMin: 25
  },
  water: {
    targetGlasses: 6,
    labels: ["Waking", "Breakfast", "Mid-morning", "Pre-lunch", "Lunch", "Before 16:00"]
  },
  glow: { skincareLabel: "PM skincare" },
  mealWindows: {
    breakfast: { start: "08:00", end: "09:30" },
    lunch: { start: "12:00", end: "13:30" },
    snack: { start: "15:00", end: "16:00" },
    dinner: { start: "18:00", end: "20:00" }
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

/* Training catalogue kept structured so Today and Plan can share one source. */
GlowApp.TRAINING_ROUTINES = {
  "abs-25": {
    id: "abs-25",
    title: "Abs — 25 min",
    style: "Tabata · 45 sec work / 15 sec rest",
    equipment: "10 kg dumbbell for selected exercises",
    exercises: [
      "Crunch hold with hundreds — vertical arm movements alongside body",
      "Crunches",
      "Toe-touch crunches",
      "Crescent moon crunches",
      "Butterfly crunches",
      "Double leg lift",
      "Single leg lift",
      "Reverse crunches",
      "Flutters",
      "Double D with legs",
      "Leg pull-pull switch — alternate knee-to-chest pulse with opposite leg straight/raised",
      "Boat movements holding 10 kg dumbbell with arms",
      "Deadbug with 10 kg dumbbell",
      "Same-side arm/leg deadbugs",
      "Normal deadbugs",
      "Side plank — left",
      "Side plank — right",
      "Plank",
      "Long-lever plank",
      "Hip twists both sides + butt-up plank",
      "Torture twists",
      "Sit-ups",
      "Earthquake hold — torso leaning back",
      "Sit-up with torsion",
      "Plank on hands"
    ]
  },
  "glutes-long": {
    id: "glutes-long",
    title: "Glutes strength — Long",
    style: "Strength",
    equipment: "Barbell/dumbbells, bench, elastic band",
    exercises: [
      "Hip thrusts — 4 × 10, double squeeze, 60 kg",
      "Step-ups — 3 × 8, 20 kg",
      "RDLs — 4 × 10, 40 kg",
      "Bulgarian split squats — 4 × 10 each leg, 20 kg",
      "Kickbacks with elastic band — 3 × 15",
      "Abductions with elastic band — 3 × 30",
      "Bridge holds — 3 × 1 min",
      "Optional extra-energy skill work — 8 reps per leg single-leg squat to bench / pistol-squat practice"
    ]
  },
  "glutes-short": {
    id: "glutes-short",
    title: "Glutes strength — Short",
    style: "Strength",
    equipment: "Barbell/dumbbells, bench",
    exercises: [
      "Hip thrusts — 4 × 10, double squeeze, 60 kg",
      "Step-ups — 3 × 8, 20 kg",
      "RDLs — 4 × 10, 40 kg",
      "Single-leg squat to bench — 3 × 8 / pistol-squat practice"
    ]
  },
  "upper-back-tabata": {
    id: "upper-back-tabata",
    title: "Upper back / arms — Tabata",
    style: "45 sec work / 15 sec rest · 3 continuous rounds",
    equipment: "5–7.5 kg; rows up to 10 kg",
    exercises: [
      "Overhead press with scapular squeeze",
      "Push-ups — knees as needed; progress toward full",
      "Triceps pulses",
      "Plank walk",
      "Rows — left",
      "Rows — right",
      "Bent-over flies or chest press"
    ]
  },
  "upper-back-strength": {
    id: "upper-back-strength",
    title: "Upper back / arms — Strength with pauses",
    style: "Strength with pauses",
    equipment: "7.5–10 kg dumbbells",
    exercises: [
      "Rows left — 10 kg, 4 × 10",
      "Rows right — 10 kg, 4 × 10",
      "Bent-over flies — 7.5 kg, 4 × 8",
      "Overhead press — 7.5 kg, 4 × 10",
      "Chest press — 10 kg, 4 × 10",
      "Skull crushers — 7.5 kg, 4 × 8",
      "Push-ups — 4 × 10, progress toward no knees"
    ]
  },
  "upper-back-combo": {
    id: "upper-back-combo",
    title: "Upper back + arms + abs",
    style: "Choose one upper-back option, then Abs — 25 min",
    equipment: "5–10 kg dumbbells; 10 kg dumbbell for selected abs exercises",
    sections: [
      { title: "Option A — Tabata · 45 sec work / 15 sec rest · 3 rounds", exercises: [
        "Overhead press with scapular squeeze", "Push-ups — knees as needed; progress toward full", "Triceps pulses", "Plank walk", "Rows — left", "Rows — right", "Bent-over flies or chest press"
      ]},
      { title: "Option B — Strength with pauses", exercises: [
        "Rows left — 10 kg, 4 × 10", "Rows right — 10 kg, 4 × 10", "Bent-over flies — 7.5 kg, 4 × 8", "Overhead press — 7.5 kg, 4 × 10", "Chest press — 10 kg, 4 × 10", "Skull crushers — 7.5 kg, 4 × 8", "Push-ups — 4 × 10, progress toward no knees"
      ]},
      { title: "Abs — 25 min · 45 sec work / 15 sec rest", exercises: [
        "Crunch hold with hundreds", "Crunches", "Toe-touch crunches", "Crescent moon crunches", "Butterfly crunches", "Double leg lift", "Single leg lift", "Reverse crunches", "Flutters", "Double D with legs", "Leg pull-pull switch", "Boat movements with 10 kg dumbbell", "Deadbug with 10 kg dumbbell", "Same-side arm/leg deadbugs", "Normal deadbugs", "Side plank — left", "Side plank — right", "Plank", "Long-lever plank", "Hip twists + butt-up plank", "Torture twists", "Sit-ups", "Earthquake hold", "Sit-up with torsion", "Plank on hands"
      ]}
    ],
    exercises: []
  },
  "total-body": {
    id: "total-body",
    title: "Total Body Conditioning",
    style: "Nike Training session",
    equipment: "See Nike Training session",
    exercises: ["Nike Training session — routine details not added yet."]
  }
};

/* Legacy selector compatibility. */
GlowApp.WORKOUT_TYPES = [
  { id: "walk-cardio", label: "Walk / cardio", defaultPeriod: "morning", defaultPoints: 1 },
  { id: "glutes-long", label: "Glutes strength — Long", defaultPeriod: "afternoon", defaultPoints: 1 },
  { id: "glutes-short", label: "Glutes strength — Short", defaultPeriod: "afternoon", defaultPoints: 1 },
  { id: "abs-25", label: "Abs — 25 min", defaultPeriod: "afternoon", defaultPoints: 1 },
  { id: "total-body", label: "Total Body Conditioning", defaultPeriod: "afternoon", defaultPoints: 1 },
  { id: "upper-back-abs", label: "Upper back + arms + abs", defaultPeriod: "afternoon", defaultPoints: 1 },
  { id: "optional-morning-walk", label: "Optional morning walk", defaultPeriod: "morning", defaultPoints: 0 }
];

GlowApp.createId = function (prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

GlowApp.createMovementItem = function ({
  type,
  label,
  period = "morning",
  alternativeGroup = null,
  points = 1,
  scored = true,
  optional = false,
  workoutId = null,
  recovery = false,
  choiceDay = null,
  dependsOnDay = null
}) {
  const numericPoints = Number(points);
  return {
    id: GlowApp.createId("movement"),
    type,
    label,
    period,
    completed: false,
    scored: scored !== false,
    points: scored === false ? 0 : (Number.isFinite(numericPoints) && numericPoints >= 0 ? numericPoints : 1),
    alternativeGroup,
    optional: optional === true,
    workoutId,
    recovery: recovery === true,
    choiceDay,
    dependsOnDay
  };
};

GlowApp.createScheduleItem = function ({
  label,
  period,
  category,
  scored = false,
  linkedMovementType = null,
  linkedMovementId = null,
  points = 1
}) {
  const numericPoints = Number(points);
  return {
    id: GlowApp.createId("schedule"),
    label,
    period,
    category,
    scored,
    linkedMovementType,
    linkedMovementId,
    points: scored ? (Number.isFinite(numericPoints) && numericPoints >= 0 ? numericPoints : 1) : 0
  };
};

GlowApp.createBaseSchedule = function () {
  return [
    GlowApp.createScheduleItem({ label: "Breakfast", period: "morning", category: "food", scored: true }),
    GlowApp.createScheduleItem({ label: "Lunch", period: "midday", category: "food", scored: true }),
    GlowApp.createScheduleItem({ label: "Snack", period: "afternoon", category: "food", scored: true }),
    GlowApp.createScheduleItem({ label: "Dinner", period: "evening", category: "food", scored: true })
  ];
};

GlowApp.addMovementToSchedule = function (schedule, movementItems) {
  movementItems.forEach(movement => {
    schedule.push(GlowApp.createScheduleItem({
      label: movement.label,
      period: movement.period,
      category: "movement",
      scored: movement.scored !== false,
      linkedMovementType: movement.type,
      linkedMovementId: movement.id,
      points: movement.points
    }));
  });
  return schedule;
};

GlowApp.getTrainingCycleDay = function (dayNumber) {
  return ((Number(dayNumber) - 1) % 7) + 1;
};

GlowApp.createTrainingMovementForDay = function (dayNumber, choices = {}) {
  const cycleDay = GlowApp.getTrainingCycleDay(dayNumber);
  const branchRoot = dayNumber > 7 ? 12 : 5;
  const choice = choices?.[branchRoot] || null;

  switch (cycleDay) {
    case 1:
      return [
        GlowApp.createMovementItem({ type: "optional-morning-walk", label: "Optional morning walk", period: "morning", points: 0, scored: false, optional: true }),
        GlowApp.createMovementItem({ type: "glutes-long", label: "Glutes strength — Long", period: "afternoon", points: 1, workoutId: "glutes-long" })
      ];
    case 2:
      return [GlowApp.createMovementItem({ type: "walk-cardio", label: "Walk / cardio", period: "morning", points: 1 })];
    case 3:
      return [
        GlowApp.createMovementItem({ type: "protect-sleep", label: "Protect sleep", period: "morning", points: 0, scored: false, recovery: true }),
        GlowApp.createMovementItem({ type: "glutes-short", label: "Glutes strength — Short", period: "afternoon", points: 1, workoutId: "glutes-short" }),
        GlowApp.createMovementItem({ type: "abs-25", label: "Abs — 25 min", period: "afternoon", points: 1, workoutId: "abs-25" })
      ];
    case 4:
      return [GlowApp.createMovementItem({ type: "walk-cardio", label: "Walk / cardio", period: "morning", points: 1 })];
    case 5: {
      const selected = choice === "upper-back-abs"
        ? { type: "upper-back-abs", label: "Upper back + arms + abs", workoutId: "upper-back-combo" }
        : choice === "total-body"
          ? { type: "total-body", label: "Total Body Conditioning", workoutId: "total-body" }
          : { type: "training-choice", label: "Choose today’s strength session", workoutId: null };
      return [
        GlowApp.createMovementItem({ type: "optional-morning-walk", label: "Optional morning walk", period: "morning", points: 0, scored: false, optional: true }),
        GlowApp.createMovementItem({ ...selected, period: "afternoon", points: 1, choiceDay: branchRoot })
      ];
    }
    case 6: {
      const selected = choice === "upper-back-abs"
        ? { type: "glutes-long", label: "Glutes strength — Long", workoutId: "glutes-long" }
        : choice === "total-body"
          ? { type: "abs-25", label: "Abs — 25 min", workoutId: "abs-25" }
          : { type: "branch-session", label: "Training based on previous day choice", workoutId: null };
      return [
        GlowApp.createMovementItem({ type: "protect-sleep", label: "Protect sleep", period: "morning", points: 0, scored: false, recovery: true }),
        GlowApp.createMovementItem({ ...selected, period: "afternoon", points: 1, dependsOnDay: branchRoot })
      ];
    }
    case 7:
    default:
      return [GlowApp.createMovementItem({ type: "walk-cardio", label: "Walk / cardio", period: "morning", points: 1 })];
  }
};

GlowApp.createEmptyDayState = function (dayNumber, movement = [], options = {}) {
  const schedule = GlowApp.createBaseSchedule();
  GlowApp.addMovementToSchedule(schedule, movement);

  const selfCareDefinitions = [
    ...(options.morningRoutine ? [{ label: "Morning routine", period: "morning" }] : []),
    { label: "Evening routine", period: "evening" }
  ];
  const selfCareCompletions = {};
  selfCareDefinitions.forEach(definition => {
    const item = GlowApp.createScheduleItem({ ...definition, category: "glow", scored: true, points: 1 });
    schedule.push(item);
    selfCareCompletions[item.id] = false;
  });

  const mealMeta = {};
  ["breakfast", "lunch", "snack", "dinner"].forEach(meal => {
    mealMeta[meal] = { mealName: "", confirmedAt: null };
  });

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
    mealMeta,
    nutrition: {
      calories: null,
      protein: null,
      fibre: null,
      source: "manual",
      manualValues: { calories: null, protein: null, fibre: null }
    },
    foodLog: { breakfast: [], lunch: [], snack: [], dinner: [] },
    water: { glasses: [false, false, false, false, false, false] },
    glow: {
      somatoline: false,
      skincare: false,
      skincareLabel: options.skincareLabel || GlowApp.DEFAULT_SETTINGS.glow.skincareLabel,
      glowDay: { enabled: false, label: "", note: "" }
    },
    selfCare: { completions: selfCareCompletions },
    movement,
    dogWalk: { completed: false },
    challenge: dayNumber % 2 === 1
      ? { type: "flexibility", challengeId: null, label: "", done: false }
      : { type: "disconnection", challengeId: "disconnection", label: "30 minutes of disconnection", done: false },
    recovery: { sleep: null, hunger: null, soreness: null, mood: null },
    schedule,
    measurements: { weight: null, waist: null, hips: null, bust: null, notes: "", progressPhotoReminder: false }
  };
};

GlowApp.createDefaultDays = function (trainingChoices = { 5: null, 12: null }) {
  return Array.from({ length: GlowApp.RUN_LENGTH }, (_, index) => {
    const dayNumber = index + 1;
    return GlowApp.createEmptyDayState(
      dayNumber,
      GlowApp.createTrainingMovementForDay(dayNumber, trainingChoices),
      { morningRoutine: [1, 4, 8, 12].includes(dayNumber) }
    );
  });
};

GlowApp.createDefaultCampaign = function () {
  const now = new Date();
  const trainingChoices = { 5: null, 12: null };
  return {
    id: GlowApp.createId("campaign"),
    name: "The Run",
    createdAt: now.toISOString(),
    startDate: now.toISOString().slice(0, 10),
    length: GlowApp.RUN_LENGTH,
    currentDay: 1,
    status: "active",
    challengePool: GlowApp.FLEXIBILITY_CHALLENGES.map(item => item.id),
    brainDump: { tasks: [] },
    grocery: { manualByTargetDay: {}, checkedByTargetDay: {} },
    trainingChoices,
    dietPlan: { importedAt: null, sourceFileName: null, status: "empty" },
    days: GlowApp.createDefaultDays(trainingChoices)
  };
};

GlowApp.createDefaultAppState = function () {
  const campaign = GlowApp.createDefaultCampaign();
  return {
    version: GlowApp.APP_SCHEMA_VERSION,
    settings: JSON.parse(JSON.stringify(GlowApp.DEFAULT_SETTINGS)),
    campaigns: [campaign],
    archives: [],
    activeCampaignId: campaign.id,
    ui: {
      activeView: "today",
      selectedDay: 1,
      planDay: 1,
      planSection: "brain-dump",
      scheduleDay: 1
    }
  };
};
