/* =========================================================
   GLOW CAMPAIGN — SCORING
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.Scoring = {


  /* =======================================================
     FOOD RHYTHM

     4 possible points:
     - breakfast
     - lunch
     - snack
     - dinner

     Special rule:
     continuous grazing = automatic 0 / 4

     Meal checkboxes are still preserved as factual data.
  ======================================================== */

  getFoodScore(day) {

    const possible = 4;


    if (!day?.food) {

      return {
        earned: 0,
        possible,
        percentage: 0,
        grazingOverride: false
      };

    }


    if (day.food.continuousGrazing) {

      return {
        earned: 0,
        possible,
        percentage: 0,
        grazingOverride: true
      };

    }


    const mealKeys = [
      "breakfast",
      "lunch",
      "snack",
      "dinner"
    ];


    const earned =
      mealKeys.filter(
        key => day.food[key] === true
      ).length;


    return {
      earned,
      possible,
      percentage:
        this.toPercentage(
          earned,
          possible
        ),
      grazingOverride: false
    };

  },


  /* =======================================================
     NUTRITION

     3 possible points:

     Calories:
     must be BETWEEN min and max inclusive.

     Protein:
     >= minimum.

     Fibre:
     >= minimum.

     Important:
     calories under the lower boundary do NOT score.
  ======================================================== */

  getNutritionScore(
    day,
    settings
  ) {

    const possible = 3;


    const targets =
      settings?.nutrition ||
      GlowApp.DEFAULT_SETTINGS.nutrition;


    const nutrition =
      day?.nutrition || {};


    const calories =
      this.toValidNumber(
        nutrition.calories
      );

    const protein =
      this.toValidNumber(
        nutrition.protein
      );

    const fibre =
      this.toValidNumber(
        nutrition.fibre
      );


    const caloriesComplete =
      calories !== null &&
      calories >= targets.caloriesMin &&
      calories <= targets.caloriesMax;


    const proteinComplete =
      protein !== null &&
      protein >= targets.proteinMin;


    const fibreComplete =
      fibre !== null &&
      fibre >= targets.fibreMin;


    const earned = [
      caloriesComplete,
      proteinComplete,
      fibreComplete
    ].filter(Boolean).length;


    return {

      earned,
      possible,

      percentage:
        this.toPercentage(
          earned,
          possible
        ),

      goals: {

        calories: {
          value: calories,
          complete: caloriesComplete,

          min: targets.caloriesMin,
          max: targets.caloriesMax,

          status:
            this.getCaloriesStatus(
              calories,
              targets.caloriesMin,
              targets.caloriesMax
            )
        },


        protein: {
          value: protein,
          complete: proteinComplete,

          min: targets.proteinMin,

          status:
            this.getMinimumTargetStatus(
              protein,
              targets.proteinMin
            )
        },


        fibre: {
          value: fibre,
          complete: fibreComplete,

          min: targets.fibreMin,

          status:
            this.getMinimumTargetStatus(
              fibre,
              targets.fibreMin
            )
        }

      }

    };

  },


  /* =======================================================
     WATER

     All target glasses must be completed for 1 point.

     Partial water completion is still returned so the UI
     can display 4 / 6, but daily scoring is binary.
  ======================================================== */

  getWaterScore(
    day,
    settings
  ) {

    const possible = 1;


    const target =
      Number(
        settings?.water?.targetGlasses ??
        GlowApp.DEFAULT_SETTINGS.water.targetGlasses
      );


    const glasses =
      Array.isArray(day?.water?.glasses)
        ? day.water.glasses
        : [];


    const completedGlasses =
      glasses
        .slice(0, target)
        .filter(Boolean)
        .length;


    const complete =
      target > 0 &&
      completedGlasses >= target;


    const earned =
      complete ? 1 : 0;


    return {

      earned,
      possible,

      percentage:
        this.toPercentage(
          earned,
          possible
        ),

      completedGlasses,
      targetGlasses: target,

      glassPercentage:
        this.toPercentage(
          completedGlasses,
          target
        ),

      complete

    };

  },


  /* =======================================================
     GLOW

     2 points:
     - Somatoline
     - PM skincare

     Glow Day is deliberately ignored here.
  ======================================================== */

  getGlowScore(day) {

    const possible = 2;


    const somatoline =
      day?.glow?.somatoline === true;

    const skincare =
      day?.glow?.skincare === true;


    const earned = [
      somatoline,
      skincare
    ].filter(Boolean).length;


    return {

      earned,
      possible,

      percentage:
        this.toPercentage(
          earned,
          possible
        ),

      goals: {
        somatoline,
        skincare
      }

    };

  },


  /* =======================================================
     DOG WALK
  ======================================================== */

  getDogWalkScore(day) {

    const possible = 1;


    const complete =
      day?.dogWalk?.completed === true;


    const earned =
      complete ? 1 : 0;


    return {
      earned,
      possible,

      percentage:
        this.toPercentage(
          earned,
          possible
        ),

      complete
    };

  },


  /* =======================================================
     MOVEMENT

     Normally:
     each movement item = 1 available point.

     Alternative groups:
     multiple movements sharing the same alternativeGroup
     collectively create only ONE possible point.

     Example Day 4:

     Easy walk
     OR
     Easy jog

     possible = 1

     completing either earns that one point.
  ======================================================== */

  getMovementScore(day) {

    const movement =
      Array.isArray(day?.movement)
        ? day.movement
        : [];


    if (movement.length === 0) {

      return {
        earned: 0,
        possible: 0,
        percentage: 0,
        groups: []
      };

    }


    const independentItems = [];

    const alternativeGroups = {};


    movement.forEach((item) => {

      if (item.alternativeGroup) {

        if (
          !alternativeGroups[
            item.alternativeGroup
          ]
        ) {

          alternativeGroups[
            item.alternativeGroup
          ] = [];

        }


        alternativeGroups[
          item.alternativeGroup
        ].push(item);

      } else {

        independentItems.push(item);

      }

    });


    /* -----------------------------------------------------
       Normal movement items
    ------------------------------------------------------ */

    const independentEarned =
      independentItems.filter(
        item => item.completed === true
      ).length;


    const independentPossible =
      independentItems.length;


    /* -----------------------------------------------------
       Alternative movement groups

       Each group = maximum 1 point.
    ------------------------------------------------------ */

    const groupResults =
      Object.entries(
        alternativeGroups
      ).map(
        ([groupId, items]) => {

          const complete =
            items.some(
              item =>
                item.completed === true
            );


          return {

            id: groupId,

            complete,

            earned:
              complete ? 1 : 0,

            possible: 1,

            items: items.map(
              item => ({
                id: item.id,
                label: item.label,
                completed:
                  item.completed === true
              })
            )

          };

        }
      );


    const alternativeEarned =
      groupResults.reduce(
        (total, group) =>
          total + group.earned,
        0
      );


    const alternativePossible =
      groupResults.length;


    const earned =
      independentEarned +
      alternativeEarned;


    const possible =
      independentPossible +
      alternativePossible;


    return {

      earned,
      possible,

      percentage:
        this.toPercentage(
          earned,
          possible
        ),

      groups: groupResults

    };

  },


  /* =======================================================
     COMPLETE DAY SCORE

     Fixed scored categories:
     Food       4
     Nutrition  3
     Water      1
     Glow       2
     Dog walk   1
               --
               11

     Movement maximum is added dynamically.
  ======================================================== */

  getDayScore(
    day,
    settings
  ) {

    const food =
      this.getFoodScore(day);

    const nutrition =
      this.getNutritionScore(
        day,
        settings
      );

    const water =
      this.getWaterScore(
        day,
        settings
      );

    const movement =
      this.getMovementScore(day);

    const glow =
      this.getGlowScore(day);

    const dogWalk =
      this.getDogWalkScore(day);


    const categories = {
      food,
      nutrition,
      water,
      movement,
      glow,
      dogWalk
    };


    const earned =
      Object.values(categories)
        .reduce(
          (total, category) =>
            total + category.earned,
          0
        );


    const possible =
      Object.values(categories)
        .reduce(
          (total, category) =>
            total + category.possible,
          0
        );


    return {

      earned,
      possible,

      percentage:
        this.toPercentage(
          earned,
          possible
        ),

      categories

    };

  },


  /* =======================================================
     CAMPAIGN SCORE

     IMPORTANT:

     We sum earned points and possible points across all
     campaign days.

     We do NOT average daily percentages because different
     days have different movement denominators.
  ======================================================== */

  getCampaignScore(
    campaign,
    settings
  ) {

    const days =
      Array.isArray(campaign?.days)
        ? campaign.days
        : [];


    const dailyScores =
      days.map(
        day => ({
          dayNumber: day.dayNumber,
          ...this.getDayScore(
            day,
            settings
          )
        })
      );


    const earned =
      dailyScores.reduce(
        (total, day) =>
          total + day.earned,
        0
      );


    const possible =
      dailyScores.reduce(
        (total, day) =>
          total + day.possible,
        0
      );


    return {

      earned,
      possible,

      percentage:
        this.toPercentage(
          earned,
          possible
        ),

      days: dailyScores

    };

  },


  /* =======================================================
     CATEGORY COMPLETION FOR CAMPAIGN BOARD

     Returns each category as 0–100%.

     Allows campaign-board cells to show:
     empty / partial / complete.
  ======================================================== */

  getDayCategoryProgress(
    day,
    settings
  ) {

    const score =
      this.getDayScore(
        day,
        settings
      );


    return {

      food:
        score.categories.food.percentage,

      nutrition:
        score.categories.nutrition.percentage,

      water:
        score.categories.water.glassPercentage,

      movement:
        score.categories.movement.percentage,

      dogWalk:
        score.categories.dogWalk.percentage,

      glow:
        score.categories.glow.percentage

    };

  },


  /* =======================================================
     REWARD TIER

     Reward is determined ONLY from campaign behavior score.
  ======================================================== */

  getRewardTier(
    campaign,
    settings
  ) {

    const campaignScore =
      this.getCampaignScore(
        campaign,
        settings
      );


    const percentage =
      campaignScore.percentage;


    const tiers =
      settings?.rewards ||
      GlowApp.DEFAULT_SETTINGS.rewards;


    const matchingTier =
      tiers.find(
        tier => {

          return (
            percentage >=
              Number(tier.minPercent) &&

            percentage <=
              Number(tier.maxPercent)
          );

        }
      );


    return {

      percentage,

      tier:
        matchingTier || null,

      campaignScore

    };

  },


  /* =======================================================
     CALORIE STATUS

     Used by the Nutrition UI.

     "below" is deliberately NOT framed as positive.
  ======================================================== */

  getCaloriesStatus(
    value,
    min,
    max
  ) {

    if (value === null) {
      return "not-logged";
    }


    if (value < min) {
      return "below";
    }


    if (value > max) {
      return "above";
    }


    return "complete";

  },


  /* =======================================================
     MINIMUM TARGET STATUS
  ======================================================== */

  getMinimumTargetStatus(
    value,
    minimum
  ) {

    if (value === null) {
      return "not-logged";
    }


    if (value >= minimum) {
      return "complete";
    }


    return "below";

  },


  /* =======================================================
     TARGET BAR HELPERS

     Returns a safe 0–100 visual percentage.

     These are visual only and DO NOT affect scoring.
  ======================================================== */

  getCaloriesBarPercent(
    value,
    settings
  ) {

    const nutritionSettings =
      settings?.nutrition ||
      GlowApp.DEFAULT_SETTINGS.nutrition;


    const numericValue =
      this.toValidNumber(value);


    if (numericValue === null) {
      return 0;
    }


    const max =
      Number(
        nutritionSettings.caloriesMax
      );


    if (
      !Number.isFinite(max) ||
      max <= 0
    ) {
      return 0;
    }


    return this.clamp(
      (numericValue / max) * 100,
      0,
      100
    );

  },


  getProteinBarPercent(
    value,
    settings
  ) {

    const target =
      Number(
        settings?.nutrition?.proteinMin ??
        GlowApp.DEFAULT_SETTINGS.nutrition.proteinMin
      );


    return this.getMinimumBarPercent(
      value,
      target
    );

  },


  getFibreBarPercent(
    value,
    settings
  ) {

    const target =
      Number(
        settings?.nutrition?.fibreMin ??
        GlowApp.DEFAULT_SETTINGS.nutrition.fibreMin
      );


    return this.getMinimumBarPercent(
      value,
      target
    );

  },


  getMinimumBarPercent(
    value,
    target
  ) {

    const numericValue =
      this.toValidNumber(value);


    if (
      numericValue === null ||
      !Number.isFinite(target) ||
      target <= 0
    ) {
      return 0;
    }


    return this.clamp(
      (numericValue / target) * 100,
      0,
      100
    );

  },


  /* =======================================================
     RECOVERY

     Not a score.

     This function simply gives us normalized tracking data
     for charts later.
  ======================================================== */

  getRecoveryData(day) {

    return {

      sleep:
        this.toValidNumber(
          day?.recovery?.sleep
        ),

      hunger:
        this.toValidNumber(
          day?.recovery?.hunger
        ),

      soreness:
        this.toValidNumber(
          day?.recovery?.soreness
        ),

      mood:
        this.toValidNumber(
          day?.recovery?.mood
        )

    };

  },


  /* =======================================================
     HELPERS
  ======================================================== */

  toPercentage(
    earned,
    possible
  ) {

    if (
      !Number.isFinite(possible) ||
      possible <= 0
    ) {
      return 0;
    }


    const percentage =
      (earned / possible) * 100;


    return Math.round(
      this.clamp(
        percentage,
        0,
        100
      )
    );

  },


  toValidNumber(value) {

    /*
      Important:
      Number("") becomes 0, which would falsely count an
      empty field as data.

      So blank/null values are intercepted first.
    */

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }


    const numeric =
      Number(value);


    if (
      !Number.isFinite(numeric)
    ) {
      return null;
    }


    return numeric;

  },


  clamp(
    value,
    min,
    max
  ) {

    return Math.min(
      Math.max(
        value,
        min
      ),
      max
    );

  }

};