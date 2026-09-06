/* =========================================================
   THE RUN — DAY VIEW

   Responsibilities:
   - Render the selected day
   - Bind daily inputs
   - Save changes
   - Calculate live scores
   - Render movement dynamically
   - Render today tasks and grocery list
   - Handle Day 14 informational tracking

   Recovery controls are deliberately left to recovery.js.
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.DayView = {

  initialized: false,


  /* =======================================================
     INITIALISE
  ======================================================== */

  init() {

    if (this.initialized) {
      return;
    }

    this.bindFood();
    this.bindNutrition();
    this.bindWater();
    this.bindMovement();
    this.bindGlow();
    this.bindTasks();
    this.bindChallenge();
    this.bindGrocery();
    this.bindMeasurements();

    this.initialized = true;

  },


  /* =======================================================
     MAIN RENDER
  ======================================================== */

  render() {

    GlowApp.State.ensureChallengeForDay?.(
      GlowApp.State.getSelectedDayNumber()
    );

    const day =
      GlowApp.State.getSelectedDay();

    const campaign =
      GlowApp.State.getActiveCampaign();

    const settings =
      GlowApp.State.get().settings;


    if (
      !day ||
      !campaign
    ) {
      return;
    }


    this.renderHero(
      day,
      campaign,
      settings
    );

    this.renderGlowDay(day);

    this.renderFood(day);

    if (
      GlowApp.FoodLog &&
      typeof GlowApp.FoodLog.render === "function"
    ) {
      GlowApp.FoodLog.render(day);
    }

    this.renderNutrition(
      day,
      settings
    );

    this.renderWater(
      day,
      settings
    );

    this.renderMovement(day);

    this.renderGlow(day);

    this.renderTasks(day);

    this.renderChallenge(day);

    this.renderMealWindows(day);

    this.renderGrocery(day);

    this.renderMeasurements(day);

    this.renderScoring(
      day,
      settings
    );

  },


  /* =======================================================
     HERO
  ======================================================== */

  renderHero(
    day,
    campaign,
    settings
  ) {

    const dayNumberElement =
      document.getElementById(
        "current-day-number"
      );

    const previousButton =
      document.getElementById(
        "previous-day-button"
      );

    const nextButton =
      document.getElementById(
        "next-day-button"
      );


    if (dayNumberElement) {

      dayNumberElement.textContent =
        day.dayNumber;

    }


    if (previousButton) {

      previousButton.disabled =
        day.dayNumber <= 1;

      previousButton.setAttribute(
        "aria-disabled",
        String(day.dayNumber <= 1)
      );

    }


    if (nextButton) {

      nextButton.disabled =
        day.dayNumber >= campaign.length;

      nextButton.setAttribute(
        "aria-disabled",
        String(
          day.dayNumber >= campaign.length
        )
      );

    }


    this.renderOverallScore(
      day,
      settings
    );

  },


  /* =======================================================
     OVERALL SCORE
  ======================================================== */

  renderOverallScore(
    day,
    settings
  ) {

    const score =
      GlowApp.Scoring.getDayScore(
        day,
        settings
      );


    this.setText(
      "day-score-earned",
      score.earned
    );

    this.setText(
      "day-score-possible",
      score.possible
    );

    this.setText(
      "day-score-percentage",
      `${score.percentage}%`
    );


    const progress =
      document.getElementById(
        "day-progress"
      );

    const fill =
      document.getElementById(
        "day-progress-fill"
      );


    if (progress) {

      progress.setAttribute(
        "aria-valuenow",
        String(score.percentage)
      );

      progress.setAttribute(
        "aria-valuetext",
        `${score.earned} of ${score.possible} behavioral points`
      );

    }


    if (fill) {

      fill.style.width =
        `${score.percentage}%`;


      /*
        Acid signal color is reserved for a sealed day.
      */

      fill.style.background =
        score.percentage === 100
          ? "var(--signal)"
          : "var(--accent)";

    }


    this.setText(
      "day-status-message",
      this.getDayStatusMessage(
        score.percentage
      )
    );

  },


  getDayStatusMessage(percentage) {

    if (percentage === 100) {
      return "Day secured.";
    }

    if (percentage >= 90) {
      return "Nearly sealed.";
    }

    if (percentage >= 70) {
      return "Strong day.";
    }

    if (percentage >= 40) {
      return "Momentum building.";
    }

    if (percentage > 0) {
      return "Run in motion.";
    }

    return "Mission active.";

  },


  /* =======================================================
     GLOW DAY
  ======================================================== */

  renderGlowDay(day) {

    const banner =
      document.getElementById(
        "glow-day-banner"
      );

    const description =
      document.getElementById(
        "glow-day-description"
      );


    if (!banner) {
      return;
    }


    const glowDay =
      day.glow?.glowDay;


    const enabled =
      glowDay?.enabled === true;


    banner.hidden =
      !enabled;


    if (
      enabled &&
      description
    ) {

      description.textContent =
        glowDay.note ||
        glowDay.label ||
        "Do something unnecessarily fabulous for yourself.";

    }

  },


  /* =======================================================
     FOOD
  ======================================================== */

  bindFood() {

    const mealCheckboxes =
      document.querySelectorAll(
        "[data-food-meal]"
      );

    mealCheckboxes.forEach(
      checkbox => {
        checkbox.addEventListener(
          "change",
          () => {
            const meal = checkbox.dataset.foodMeal;
            if (!meal) return;

            GlowApp.State.updateSelectedDay(
              day => {
                if (day.food && meal in day.food) {
                  day.food[meal] = checkbox.checked;
                }
              }
            );

            this.renderScoringOnly();
          }
        );
      }
    );

    const grazingToggle =
      document.getElementById("continuous-grazing");

    if (grazingToggle) {
      grazingToggle.addEventListener(
        "change",
        () => {
          GlowApp.State.updateSelectedDay(
            day => {
              day.food.continuousGrazing = grazingToggle.checked;
            }
          );
          this.renderFood(GlowApp.State.getSelectedDay());
          this.renderScoringOnly();
        }
      );
    }

    const bingeToggle =
      document.getElementById("binge-toggle");

    if (bingeToggle) {
      bingeToggle.addEventListener(
        "change",
        () => {
          GlowApp.State.updateSelectedDay(
            day => {
              day.food.binge = bingeToggle.checked;
              if (!bingeToggle.checked) {
                day.food.bingeReflection = day.food.bingeReflection || "";
              }
            }
          );

          const day = GlowApp.State.getSelectedDay();
          const settings = GlowApp.State.get().settings;
          this.renderFood(day);
          this.renderNutritionStatus(day, settings);
          this.renderScoring(day, settings);
        }
      );
    }

    const reflection =
      document.getElementById("binge-reflection");

    if (reflection) {
      reflection.addEventListener(
        "input",
        () => {
          GlowApp.State.updateSelectedDay(
            day => {
              day.food.bingeReflection = reflection.value;
            }
          );
          this.renderBingeReflectionStatus(
            GlowApp.State.getSelectedDay()
          );
        }
      );
    }
  },


  renderFood(day) {

    if (!day?.food) return;

    document.querySelectorAll("[data-food-meal]")
      .forEach(checkbox => {
        checkbox.checked = day.food[checkbox.dataset.foodMeal] === true;
      });

    const grazingToggle = document.getElementById("continuous-grazing");
    if (grazingToggle) {
      grazingToggle.checked = day.food.continuousGrazing === true;
    }

    const grazingAlert = document.getElementById("grazing-alert");
    if (grazingAlert) {
      grazingAlert.hidden = day.food.continuousGrazing !== true;
    }

    const bingeToggle = document.getElementById("binge-toggle");
    if (bingeToggle) {
      bingeToggle.checked = day.food.binge === true;
    }

    const reflectionWrap = document.getElementById("binge-reflection-wrap");
    if (reflectionWrap) {
      reflectionWrap.hidden = day.food.binge !== true;
    }

    const reflection = document.getElementById("binge-reflection");
    if (reflection) {
      reflection.value = day.food.bingeReflection || "";
      reflection.required = day.food.binge === true;
    }

    this.renderBingeReflectionStatus(day);
  },


  renderBingeReflectionStatus(day) {

    const status = document.getElementById("binge-reflection-status");
    if (!status) return;

    if (day?.food?.binge !== true) {
      status.textContent = "Required when binge is marked.";
      status.classList.remove("is-complete", "is-missed");
      return;
    }

    const complete = Boolean(day.food.bingeReflection?.trim());
    status.textContent = complete
      ? "Reflection saved."
      : "Add a short reflection to close the day.";
    status.classList.toggle("is-complete", complete);
    status.classList.toggle("is-missed", !complete);
  },


  /* =======================================================
     NUTRITION
  ======================================================== */

  bindNutrition() {

    const fields = [
      {
        elementId: "calories-input",
        key: "calories"
      },
      {
        elementId: "protein-input",
        key: "protein"
      },
      {
        elementId: "fibre-input",
        key: "fibre"
      }
    ];


    fields.forEach(
      ({ elementId, key }) => {

        const input =
          document.getElementById(
            elementId
          );


        if (!input) {
          return;
        }


        input.addEventListener(
          "input",
          () => {

            const value =
              GlowApp.Scoring
                .toValidNumber(
                  input.value
                );


            GlowApp.State.updateSelectedDay(
              (day) => {

                /*
                  When meal foods exist, nutrition is derived from
                  the food log and these fields are read-only.
                */
                if (day.nutrition?.source === "foodLog") {
                  return;
                }


                day.nutrition[key] = value;
                day.nutrition.source = "manual";


                if (!day.nutrition.manualValues) {

                  day.nutrition.manualValues = {
                    calories: null,
                    protein: null,
                    fibre: null
                  };
                }


                day.nutrition.manualValues[key] = value;

              }
            );


            /*
              Do not fully rerender the form here.

              Replacing input values while somebody is typing
              can cause cursor jumps.
            */

            const day =
              GlowApp.State.getSelectedDay();

            const settings =
              GlowApp.State.get().settings;


            this.renderNutritionStatus(
              day,
              settings
            );

            this.renderScoring(
              day,
              settings
            );

          }
        );

      }
    );

  },


  renderNutrition(
    day,
    settings
  ) {

    const caloriesInput =
      document.getElementById(
        "calories-input"
      );

    const proteinInput =
      document.getElementById(
        "protein-input"
      );

    const fibreInput =
      document.getElementById(
        "fibre-input"
      );


    if (caloriesInput) {

      caloriesInput.value =
        day.nutrition?.calories ?? "";

    }


    if (proteinInput) {

      proteinInput.value =
        day.nutrition?.protein ?? "";

    }


    if (fibreInput) {

      fibreInput.value =
        day.nutrition?.fibre ?? "";

    }


    const nutritionIsAutomatic =
      day.nutrition?.source === "foodLog" &&
      (GlowApp.FoodLog?.getAllItems?.(day)?.length || 0) > 0;


    [
      caloriesInput,
      proteinInput,
      fibreInput
    ].forEach((input) => {

      if (!input) {
        return;
      }


      input.readOnly = nutritionIsAutomatic;
      input.setAttribute(
        "aria-readonly",
        String(nutritionIsAutomatic)
      );

    });


    document.getElementById(
      "nutrition-card"
    )?.classList.toggle(
      "nutrition-card--automatic",
      Boolean(nutritionIsAutomatic)
    );

    const planned = GlowApp.FoodLog?.getPlannedTotals?.(day);
    const actual = GlowApp.FoodLog?.getTotals?.(day);
    const planSummary = document.getElementById("nutrition-plan-summary");
    if (planSummary) {
      if (planned?.itemCount) {
        planSummary.textContent = `${actual?.calories || 0} kcal eaten · ${planned.calories} kcal planned`;
      } else {
        planSummary.textContent = "No food plan loaded for this day.";
      }
    }

    this.renderNutritionStatus(
      day,
      settings
    );

  },


  renderNutritionStatus(
    day,
    settings
  ) {

    const score =
      GlowApp.Scoring.getNutritionScore(
        day,
        settings
      );


    /* -----------------------------------------------------
       Target copy
    ------------------------------------------------------ */

    this.setText(
      "calories-target-copy",
      `Full point ≤${score.goals.calories.max} kcal · 0.9 through ${score.goals.calories.graceMax}`
    );

    this.setText(
      "protein-target-copy",
      `Target ${score.goals.protein.min}g+`
    );

    this.setText(
      "fibre-target-copy",
      `Target ${score.goals.fibre.min}g+`
    );


    /* -----------------------------------------------------
       Status text
    ------------------------------------------------------ */

    this.renderMetricStatus(
      "calories-status",
      score.goals.calories.status,
      "calories"
    );

    this.renderMetricStatus(
      "protein-status",
      score.goals.protein.status,
      "minimum"
    );

    this.renderMetricStatus(
      "fibre-status",
      score.goals.fibre.status,
      "minimum"
    );


    /* -----------------------------------------------------
       Bars
    ------------------------------------------------------ */

    const caloriesPercent =
      GlowApp.Scoring
        .getCaloriesBarPercent(
          score.goals.calories.value,
          settings
        );

    const proteinPercent =
      GlowApp.Scoring
        .getProteinBarPercent(
          day.nutrition?.protein,
          settings
        );

    const fibrePercent =
      GlowApp.Scoring
        .getFibreBarPercent(
          day.nutrition?.fibre,
          settings
        );


    this.renderTargetBar(
      "calories-target-fill",
      caloriesPercent,
      score.goals.calories.complete
    );

    this.renderTargetBar(
      "protein-target-fill",
      proteinPercent,
      score.goals.protein.complete
    );

    this.renderTargetBar(
      "fibre-target-fill",
      fibrePercent,
      score.goals.fibre.complete
    );

  },


  renderMetricStatus(
    elementId,
    status,
    type
  ) {

    const element =
      document.getElementById(
        elementId
      );


    if (!element) {
      return;
    }


    element.classList.remove(
      "is-complete",
      "is-missed"
    );


    let label =
      "Not logged";


    if (status === "complete") {

      label =
        "Target hit";

      element.classList.add(
        "is-complete"
      );

    }


    if (status === "below") {

      label =
        type === "calories"
          ? "Below range"
          : "Below target";

      element.classList.add(
        "is-missed"
      );

    }


    if (status === "grace") {

      label =
        "Grace · 0.9";

    }


    if (status === "binge-untracked") {

      label =
        "Binge · untracked";

      element.classList.add(
        "is-missed"
      );

    }


    if (status === "above") {

      label =
        "Above target";

      element.classList.add(
        "is-missed"
      );

    }


    element.textContent =
      label;

  },


  renderTargetBar(
    elementId,
    percentage,
    complete
  ) {

    const fill =
      document.getElementById(
        elementId
      );


    if (!fill) {
      return;
    }


    fill.style.width =
      `${percentage}%`;


    fill.style.background =
      complete
        ? "var(--success)"
        : "var(--accent)";

  },


  /* =======================================================
     WATER
  ======================================================== */

  bindWater() {

    const container =
      document.getElementById(
        "water-glasses"
      );


    if (!container) {
      return;
    }


    /*
      Event delegation lets us regenerate the water glasses
      later if the target changes.
    */

    container.addEventListener(
      "click",
      (event) => {

        const button =
          event.target.closest(
            "[data-water-index]"
          );


        if (!button) {
          return;
        }


        const index =
          Number(
            button.dataset.waterIndex
          );


        if (
          !Number.isInteger(index) ||
          index < 0
        ) {
          return;
        }


        GlowApp.State.updateSelectedDay(
          (day) => {

            this.ensureWaterArray(
              day
            );


            day.water.glasses[index] =
              !day.water.glasses[index];

          }
        );


        const day =
          GlowApp.State.getSelectedDay();

        const settings =
          GlowApp.State.get().settings;


        this.renderWater(
          day,
          settings
        );

        this.renderScoring(
          day,
          settings
        );

      }
    );

  },


  renderWater(
    day,
    settings
  ) {

    const container =
      document.getElementById(
        "water-glasses"
      );


    if (!container) {
      return;
    }


    const target =
      Math.max(
        1,
        Number(
          settings?.water?.targetGlasses ??
          6
        )
      );


    this.ensureWaterArray(
      day,
      target
    );


    const labels =
      settings?.water?.labels || [];


    container.innerHTML =
      Array.from(
        { length: target },
        (_, index) => {

          const completed =
            day.water.glasses[index] === true;


          const label =
            labels[index] ||
            `Glass ${index + 1}`;


          return `
            <button
              class="water-glass"
              type="button"
              data-water-index="${index}"
              aria-pressed="${completed}"
              aria-label="${this.escapeHTML(label)}: ${completed ? "completed" : "not completed"}"
            >
              <span
                class="water-glass__vessel"
                aria-hidden="true"
              >
                <span class="water-glass__fill"></span>
              </span>

              <span class="water-glass__label">
                ${this.escapeHTML(label)}
              </span>
            </button>
          `;

        }
      ).join("");


    const waterScore =
      GlowApp.Scoring.getWaterScore(
        day,
        settings
      );


    this.setText(
      "water-count",
      waterScore.completedGlasses
    );


    /*
      The HTML initially says "/ 6 glasses".

      Replace the full paragraph so Settings can eventually
      alter the target cleanly.
    */

    const counter =
      document.querySelector(
        ".water-counter"
      );


    if (counter) {

      counter.innerHTML =
        `<strong id="water-count">${waterScore.completedGlasses}</strong> / ${waterScore.targetGlasses} glasses`;

    }

  },


  ensureWaterArray(
    day,
    targetOverride = null
  ) {

    if (!day.water) {

      day.water = {
        glasses: []
      };

    }


    if (
      !Array.isArray(
        day.water.glasses
      )
    ) {

      day.water.glasses = [];

    }


    const target =
      targetOverride ??
      Number(
        GlowApp.State
          .get()
          .settings
          ?.water
          ?.targetGlasses ??
        6
      );


    while (
      day.water.glasses.length <
      target
    ) {

      day.water.glasses.push(
        false
      );

    }

  },


  /* =======================================================
     MOVEMENT
  ======================================================== */

  bindMovement() {

    const container =
      document.getElementById(
        "movement-list"
      );


    if (!container) {
      return;
    }


    container.addEventListener("click", event => {
      const workout = event.target.closest("[data-day-workout]");
      if (workout) { GlowApp.PlanView?.openWorkout?.(workout.dataset.dayWorkout); return; }
      if (event.target.closest("[data-movement-choose]")) { GlowApp.Navigation?.goToView?.("plan"); GlowApp.State.setPlanSection?.("training"); GlowApp.PlanView?.render?.(); }
    });

    container.addEventListener(
      "change",
      (event) => {

        const checkbox =
          event.target.closest(
            "[data-movement-id]"
          );


        if (!checkbox) {
          return;
        }


        const movementId =
          checkbox.dataset.movementId;


        GlowApp.State.updateSelectedDay(
          (day) => {

            const item =
              day.movement.find(
                movement =>
                  movement.id ===
                  movementId
              );


            if (!item) {
              return;
            }


            /*
              OR-group behavior:

              Checking one activity automatically unchecks
              the other alternatives in the same group.

              This makes Day 4 truly "walk OR jog".
            */

            if (
              checkbox.checked &&
              item.alternativeGroup
            ) {

              day.movement.forEach(
                movement => {

                  if (
                    movement.alternativeGroup ===
                    item.alternativeGroup
                  ) {

                    movement.completed =
                      false;

                  }

                }
              );

            }


            item.completed =
              checkbox.checked;

          }
        );


        const day =
          GlowApp.State.getSelectedDay();

        const settings =
          GlowApp.State.get().settings;


        this.renderMovement(day);

        this.renderScoring(
          day,
          settings
        );

      }
    );

  },


  renderMovement(day) {
    const container = document.getElementById("movement-list");
    if (!container) return;
    const movement = Array.isArray(day?.movement) ? day.movement : [];
    if (!movement.length) { container.innerHTML = `<p class="card-intro">No movement planned today.</p>`; return; }
    container.innerHTML = movement.map(item => {
      const period = this.formatPeriod(item.period);
      if (item.recovery) {
        return `<div class="movement-row movement-row--rest"><span class="movement-badge">REST</span><span class="movement-row__content"><strong>${this.escapeHTML(item.label)}</strong><small>${this.escapeHTML(period)} · protect the sleep window</small></span></div>`;
      }
      const unresolved = item.type === "training-choice" || item.type === "branch-session";
      const badge = item.optional ? "OPTIONAL" : `${Number(item.points || 1)} PT`;
      const checkboxId = `movement-check-${item.id}`;
      const checkControl = unresolved
        ? `<span class="movement-check movement-check--disabled" aria-hidden="true"><span class="custom-checkbox custom-checkbox--disabled"></span></span>`
        : `<label class="movement-check" for="${this.escapeHTML(checkboxId)}"><input id="${this.escapeHTML(checkboxId)}" type="checkbox" data-movement-id="${this.escapeHTML(item.id)}" ${item.completed ? "checked" : ""}><span class="custom-checkbox" aria-hidden="true"></span></label>`;
      return `<div class="movement-row ${item.optional ? "movement-row--optional" : ""}">
        ${checkControl}
        <span class="movement-row__content"><span class="movement-badge">${badge}</span><strong>${this.escapeHTML(item.label)}</strong><small>${this.escapeHTML(period)}</small></span>
        <span class="movement-row__actions">${item.workoutId ? `<button class="text-button" type="button" data-day-workout="${this.escapeHTML(item.workoutId)}">View workout</button>` : ""}${unresolved ? `<button class="text-button" type="button" data-movement-choose>Choose in Plan</button>` : ""}</span>
      </div>`;
    }).join("");
  },


  /* =======================================================
     GLOW
  ======================================================== */

  bindGlow() {

    const container =
      document.getElementById("self-care-list");

    if (!container) return;

    container.addEventListener(
      "change",
      event => {
        const checkbox = event.target.closest("[data-self-care-id]");
        if (!checkbox) return;

        const id = checkbox.dataset.selfCareId;
        GlowApp.State.updateSelectedDay(
          day => {
            if (!day.selfCare) day.selfCare = { completions: {} };
            if (!day.selfCare.completions) day.selfCare.completions = {};
            day.selfCare.completions[id] = checkbox.checked;
          }
        );

        this.renderScoringOnly();
      }
    );
  },


  renderGlow(day) {

    const container =
      document.getElementById("self-care-list");

    if (!container) return;

    const goals = (day.schedule || [])
      .filter(item => item.category === "glow" && item.scored !== false);

    if (!goals.length) {
      container.innerHTML = `<p class="card-intro">No self-care routine scheduled today.</p>`;
      return;
    }

    const completions = day.selfCare?.completions || {};
    container.innerHTML = goals.map(item => `
      <label class="check-row self-care-row">
        <input
          type="checkbox"
          data-self-care-id="${this.escapeHTML(item.id)}"
          ${completions[item.id] === true ? "checked" : ""}
        >
        <span class="custom-checkbox"></span>
        <span class="check-row__copy">
          <strong>${this.escapeHTML(item.label)}</strong>
          <small>${this.escapeHTML(this.formatPeriod(item.period))} · ${Number(item.points || 1)} pt</small>
        </span>
      </label>
    `).join("");
  },


  /* =======================================================
     BRAIN DUMP TASKS — NON-SCORING
  ======================================================== */

  bindTasks() {
    const handler = (event) => {
      const checkbox = event.target.closest("[data-today-task-id]");
      if (!checkbox) return;
      const campaign = GlowApp.State.getActiveCampaign();
      if (!campaign) return;
      GlowApp.BrainDump?.completeTask?.(campaign, checkbox.dataset.todayTaskId, GlowApp.State.getSelectedDayNumber(), checkbox.checked);
      GlowApp.State.save();
      this.renderTasks(GlowApp.State.getSelectedDay());
      GlowApp.PlanView?.renderBrainDump?.();
    };
    document.getElementById("extra-self-care-list")?.addEventListener("change", handler);
    document.getElementById("adulting-quests-list")?.addEventListener("change", handler);

    const clickHandler = (event) => {
      const move = event.target.closest("[data-task-move-tomorrow]");
      if (!move) return;
      const campaign = GlowApp.State.getActiveCampaign();
      if (!campaign) return;
      GlowApp.BrainDump?.moveToTomorrow?.(campaign, move.dataset.taskMoveTomorrow, GlowApp.State.getSelectedDayNumber());
      GlowApp.State.save();
      this.renderTasks(GlowApp.State.getSelectedDay());
      GlowApp.PlanView?.renderBrainDump?.();
    };
    document.getElementById("extra-self-care-list")?.addEventListener("click", clickHandler);
    document.getElementById("adulting-quests-list")?.addEventListener("click", clickHandler);
  },

  renderTasks(day = GlowApp.State.getSelectedDay()) {
    const campaign = GlowApp.State.getActiveCampaign();
    if (!campaign || !day || !GlowApp.BrainDump) return;
    const tasks = GlowApp.BrainDump.getTasksForDay(campaign, day.dayNumber);
    const selfCare = tasks.filter(task => task.category === "self-care");
    const others = tasks.filter(task => task.category === "adulting" || task.category === "quests");
    this.renderTaskList("extra-self-care-list", selfCare);
    this.renderTaskList("adulting-quests-list", others, true);
  },

  renderTaskList(elementId, tasks, showCategory = false) {
    const container = document.getElementById(elementId);
    if (!container) return;
    if (!tasks.length) {
      container.innerHTML = `<p class="task-empty">Nothing assigned here today.</p>`;
      return;
    }
    const dayNumber = GlowApp.State.getSelectedDayNumber();
    container.innerHTML = tasks.map(task => `
      <div class="today-task-row">
        <label>
          <input type="checkbox" data-today-task-id="${this.escapeHTML(task.id)}" ${task.completedToday ? "checked" : ""}>
          <span class="custom-checkbox"></span>
          <span class="today-task-row__copy">
            ${showCategory ? `<small class="task-category task-category--${this.escapeHTML(task.category)}">${this.escapeHTML(GlowApp.BrainDump.categoryLabel(task.category))}</small>` : ""}
            <strong>${this.escapeHTML(task.text)}</strong>
            ${task.assignment?.type === "daily" ? `<small>Repeat every day</small>` : ""}
          </span>
        </label>
        ${task.assignment?.type !== "daily" ? `<button class="text-button task-tomorrow" type="button" data-task-move-tomorrow="${this.escapeHTML(task.id)}">${dayNumber >= 14 ? "Carry over" : "Tomorrow →"}</button>` : ""}
      </div>`).join("");
  },

  /* =======================================================
     MEAL WINDOW GUIDANCE — NON-SCORING
  ======================================================== */

  renderMealWindows(day) {
    if (!day || !GlowApp.MealWindows) return;
    const campaign = GlowApp.State.getActiveCampaign();
    const settings = GlowApp.State.get().settings;
    ["breakfast","lunch","snack","dinner"].forEach(meal => {
      const element = document.querySelector(`[data-meal-window="${meal}"]`);
      if (!element) return;
      const confirmedAt = day.mealMeta?.[meal]?.confirmedAt || null;
      if (day.dayNumber === Number(campaign?.currentDay || 1)) {
        const state = GlowApp.MealWindows.getState(meal, confirmedAt, settings);
        element.textContent = state.label;
        element.dataset.windowState = state.status;
      } else if (confirmedAt) {
        const state = GlowApp.MealWindows.getState(meal, confirmedAt, settings, "00:00");
        element.textContent = state.label;
        element.dataset.windowState = state.status;
      } else {
        const window = settings.mealWindows?.[meal];
        element.textContent = window ? `${window.start}–${window.end}` : "";
        element.dataset.windowState = "static";
      }
    });
  },

  /* =======================================================
     TOMORROW GROCERY — NON-SCORING
  ======================================================== */

  bindGrocery() {
    document.getElementById("grocery-manual-add")?.addEventListener("click", () => {
      const input = document.getElementById("grocery-manual-input");
      const campaign = GlowApp.State.getActiveCampaign();
      const targetDay = GlowApp.State.getSelectedDayNumber() + 1;
      if (!input || !campaign || targetDay > 14 || !input.value.trim()) return;
      campaign.grocery ||= { manualByTargetDay:{}, checkedByTargetDay:{} };
      campaign.grocery.manualByTargetDay[targetDay] ||= [];
      campaign.grocery.manualByTargetDay[targetDay].push({ id:GlowApp.createId("grocery"), name:input.value.trim(), manual:true });
      input.value = ""; GlowApp.State.save(); this.renderGrocery(GlowApp.State.getSelectedDay());
    });
    document.getElementById("tomorrow-grocery-list")?.addEventListener("change", event => {
      const checkbox = event.target.closest("[data-grocery-id]");
      if (!checkbox) return;
      const campaign = GlowApp.State.getActiveCampaign();
      const targetDay = Number(checkbox.dataset.groceryTargetDay);
      campaign.grocery ||= { manualByTargetDay:{}, checkedByTargetDay:{} };
      campaign.grocery.checkedByTargetDay[targetDay] ||= {};
      campaign.grocery.checkedByTargetDay[targetDay][checkbox.dataset.groceryId] = checkbox.checked;
      GlowApp.State.save();

      if (checkbox.checked) {
        const row = checkbox.closest(".grocery-row");
        row?.classList.add("is-completing");
        checkbox.disabled = true;
        setTimeout(() => this.renderGrocery(GlowApp.State.getSelectedDay()), 260);
      }
    });
  },

  renderGrocery(day) {
    const card = document.getElementById("tomorrow-grocery-card");
    const list = document.getElementById("tomorrow-grocery-list");
    const targetLabel = document.getElementById("grocery-target-day");
    if (!card || !list || !day) return;
    const campaign = GlowApp.State.getActiveCampaign();
    const targetDay = day.dayNumber + 1;
    if (targetDay > 14) {
      if (targetLabel) targetLabel.textContent = "Sprint complete";
      list.innerHTML = `<p class="task-empty">No Day 15 list — this sprint ends here.</p>`;
      document.querySelector(".grocery-add")?.setAttribute("hidden", "");
      return;
    }
    document.querySelector(".grocery-add")?.removeAttribute("hidden");
    if (targetLabel) targetLabel.textContent = `Day ${targetDay}`;
    const nextDay = campaign?.days?.find(item => item.dayNumber === targetDay);
    const generated = GlowApp.DietPlan?.deriveGrocery?.(nextDay) || [];
    campaign.grocery ||= { manualByTargetDay:{}, checkedByTargetDay:{} };
    const manual = campaign.grocery.manualByTargetDay?.[targetDay] || [];
    const checked = campaign.grocery.checkedByTargetDay?.[targetDay] || {};
    const rows = [
      ...generated.map(item => ({ ...item, id:item.id || `generated-${item.name}-${item.unit}` })),
      ...manual.map(item => ({ ...item, unit:"", quantity:null, mealCount:0 }))
    ];
    if (!rows.length) {
      list.innerHTML = nextDay && GlowApp.FoodLog?.getPlannedTotals?.(nextDay)?.itemCount
        ? `<p class="task-empty">No grocery quantities could be derived.</p>`
        : `<p class="task-empty">No food plan for tomorrow yet. Add it in Plan → Food Plan.</p>`;
      return;
    }

    const visibleRows = rows.filter(item => !checked[item.id]);
    if (!visibleRows.length) {
      list.innerHTML = `<p class="task-empty">All sorted for tomorrow.</p>`;
      return;
    }

    list.innerHTML = visibleRows.map(item => {
      const quantity = item.quantity != null ? `${item.quantity} ${item.unit}`.trim() : "";
      const source = item.generated && item.mealCount ? `${item.mealCount} meal${item.mealCount === 1 ? "" : "s"}` : item.manual ? "Manual" : "";
      return `<label class="grocery-row"><input type="checkbox" data-grocery-id="${this.escapeHTML(item.id)}" data-grocery-target-day="${targetDay}"><span class="custom-checkbox" aria-hidden="true"></span><span class="grocery-row__copy"><strong>${this.escapeHTML(item.name)}</strong><small>${this.escapeHTML([quantity,source].filter(Boolean).join(" · "))}</small></span></label>`;
    }).join("");
  },

  /* =======================================================
     DAILY CHALLENGE — EXTRA TO SCORE
  ======================================================== */

  bindChallenge() {

    const checkbox =
      document.getElementById("challenge-done");

    if (!checkbox) return;

    checkbox.addEventListener(
      "change",
      () => {
        GlowApp.State.updateSelectedDay(
          day => {
            if (!day.challenge) return;
            day.challenge.done = checkbox.checked;
          }
        );
        this.renderScoringOnly();
      }
    );
  },


  renderChallenge(day) {

    if (!day?.challenge) return;

    this.setText(
      "daily-challenge-type",
      day.challenge.type === "disconnection"
        ? "Reset challenge"
        : "Flexibility challenge"
    );

    this.setText(
      "daily-challenge-copy",
      day.challenge.label || "Challenge loading…"
    );

    const checkbox = document.getElementById("challenge-done");
    if (checkbox) checkbox.checked = day.challenge.done === true;

    const settings = GlowApp.State.get().settings;
    const score = GlowApp.Scoring.getDayScore(day, settings);
    this.renderChallengeStatus(day, score);
  },


  renderChallengeStatus(day, score) {

    const element = document.getElementById("daily-challenge-status");
    if (!element || !day?.challenge) return;

    const status = GlowApp.Scoring.getChallengeStatus(day, score);
    element.classList.toggle("is-complete", status.passed);
    element.classList.toggle("is-pending", day.challenge.done === true && !status.passed);

    if (status.passed) {
      element.textContent = "Passed";
    } else if (day.challenge.done === true) {
      element.textContent = `${score.percentage}% · needs 90%`;
    } else {
      element.textContent = "Not done";
    }
  },


  /* =======================================================
     DAY 14 MEASUREMENTS

     INFORMATION ONLY — NEVER INCLUDED IN SCORING.
  ======================================================== */

  bindMeasurements() {

    const fields = [

      {
        id: "measurement-weight",
        key: "weight",
        event: "input"
      },

      {
        id: "measurement-waist",
        key: "waist",
        event: "input"
      },

      {
        id: "measurement-hips",
        key: "hips",
        event: "input"
      },

      {
        id: "measurement-bust",
        key: "bust",
        event: "input"
      },

      {
        id: "measurement-notes",
        key: "notes",
        event: "input"
      }

    ];


    fields.forEach(
      field => {

        const element =
          document.getElementById(
            field.id
          );


        if (!element) {
          return;
        }


        element.addEventListener(
          field.event,
          () => {

            GlowApp.State.updateSelectedDay(
              (day) => {

                /*
                  Measurements should only exist meaningfully
                  on Day 14, but this defensive guard prevents
                  accidental writes from another day.
                */

                if (
                  day.dayNumber !== 14
                ) {
                  return;
                }


                if (
                  field.key === "notes"
                ) {

                  day.measurements.notes =
                    element.value;

                } else {

                  day.measurements[field.key] =
                    GlowApp.Scoring
                      .toValidNumber(
                        element.value
                      );

                }

              }
            );

          }
        );

      }
    );


    const photoReminder =
      document.getElementById(
        "progress-photo-reminder"
      );


    if (photoReminder) {

      photoReminder.addEventListener(
        "change",
        () => {

          GlowApp.State.updateSelectedDay(
            (day) => {

              if (
                day.dayNumber !== 14
              ) {
                return;
              }


              day.measurements
                .progressPhotoReminder =
                photoReminder.checked;

            }
          );

        }
      );

    }

  },


  renderMeasurements(day) {

    const panel =
      document.getElementById(
        "day-14-measurements"
      );


    if (!panel) {
      return;
    }


    const isDay14 =
      day.dayNumber === 14;


    panel.hidden =
      !isDay14;


    if (!isDay14) {
      return;
    }


    const measurements =
      day.measurements || {};


    this.setInputValue(
      "measurement-weight",
      measurements.weight
    );

    this.setInputValue(
      "measurement-waist",
      measurements.waist
    );

    this.setInputValue(
      "measurement-hips",
      measurements.hips
    );

    this.setInputValue(
      "measurement-bust",
      measurements.bust
    );


    const notes =
      document.getElementById(
        "measurement-notes"
      );


    if (notes) {

      notes.value =
        measurements.notes || "";

    }


    const photoReminder =
      document.getElementById(
        "progress-photo-reminder"
      );


    if (photoReminder) {

      photoReminder.checked =
        measurements
          .progressPhotoReminder === true;

    }

  },


  /* =======================================================
     SCORE RENDERING
  ======================================================== */

  renderScoringOnly() {

    const day =
      GlowApp.State.getSelectedDay();

    const settings =
      GlowApp.State.get().settings;


    if (!day) {
      return;
    }


    this.renderScoring(
      day,
      settings
    );

  },


  renderScoring(
    day,
    settings
  ) {

    const score =
      GlowApp.Scoring.getDayScore(
        day,
        settings
      );


    /* -----------------------------------------------------
       Overall
    ------------------------------------------------------ */

    this.renderOverallScore(
      day,
      settings
    );


    /* -----------------------------------------------------
       Food
    ------------------------------------------------------ */

    this.setText(
      "food-score",
      score.categories.food.earned
    );


    /* -----------------------------------------------------
       Nutrition
    ------------------------------------------------------ */

    this.setText(
      "nutrition-score",
      score.categories.nutrition.earned
    );


    /* -----------------------------------------------------
       Water
    ------------------------------------------------------ */

    this.setText(
      "water-score",
      score.categories.water.earned
    );


    /* -----------------------------------------------------
       Movement
    ------------------------------------------------------ */

    this.setText(
      "movement-score",
      score.categories.movement.earned
    );

    this.setText(
      "movement-possible",
      score.categories.movement.possible
    );


    /* -----------------------------------------------------
       Glow
    ------------------------------------------------------ */

    this.setText(
      "glow-score",
      score.categories.glow.earned
    );

    this.setText(
      "glow-possible",
      score.categories.glow.possible
    );

    this.renderChallengeStatus(day, score);

  },


  /* =======================================================
     HELPERS
  ======================================================== */

  setText(
    elementId,
    value
  ) {

    const element =
      document.getElementById(
        elementId
      );


    if (element) {

      element.textContent =
        value;

    }

  },


  setInputValue(
    elementId,
    value
  ) {

    const element =
      document.getElementById(
        elementId
      );


    if (!element) {
      return;
    }


    element.value =
      value ?? "";

  },


  formatPeriod(period) {

    const labels = {
      morning: "Morning",
      midday: "Midday",
      afternoon: "Afternoon",
      evening: "Evening"
    };


    return (
      labels[period] ||
      period ||
      ""
    );

  },


  escapeHTML(value) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }

};