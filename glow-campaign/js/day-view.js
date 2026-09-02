/* =========================================================
   GLOW CAMPAIGN — DAY VIEW

   Responsibilities:
   - Render the selected day
   - Bind daily inputs
   - Save changes
   - Calculate live scores
   - Render movement dynamically
   - Render today's timeline
   - Handle Day 10 informational tracking

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
    this.bindChallenge();
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

    this.renderChallenge(day);

    this.renderTimeline(day);

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
      GlowApp.FoodLog?.hasItems(day);


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

    const container =
      document.getElementById(
        "movement-list"
      );


    if (!container) {
      return;
    }


    const movement =
      Array.isArray(day.movement)
        ? day.movement
        : [];


    if (movement.length === 0) {

      container.innerHTML = `
        <p class="card-intro">
          No scored movement assigned today.
        </p>
      `;

      return;
    }


    container.innerHTML =
      movement
        .map(
          item => {

            const period =
              this.formatPeriod(
                item.period
              );


            const points =
              Number(item.points || 1);

            const detail =
              item.alternativeGroup
                ? `${period} · choose one · ${points} pt${points === 1 ? "" : "s"}`
                : `${period} · ${points} pt${points === 1 ? "" : "s"}`;


            return `
              <label class="movement-row">

                <input
                  type="checkbox"
                  data-movement-id="${this.escapeHTML(item.id)}"
                  ${item.completed ? "checked" : ""}
                >

                <span class="custom-checkbox"></span>

                <span class="movement-row__content">
                  <strong>
                    ${this.escapeHTML(item.label)}
                  </strong>

                  <small>
                    ${this.escapeHTML(detail)}
                  </small>
                </span>

              </label>
            `;

          }
        )
        .join("");

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
     TIMELINE
  ======================================================== */

  renderTimeline(day) {

    const container =
      document.getElementById(
        "today-timeline"
      );


    if (!container) {
      return;
    }


    const schedule =
      Array.isArray(day.schedule)
        ? day.schedule
        : [];


    const periods = [
      {
        id: "morning",
        label: "Morning"
      },
      {
        id: "midday",
        label: "Midday"
      },
      {
        id: "afternoon",
        label: "Afternoon"
      },
      {
        id: "evening",
        label: "Evening"
      }
    ];


    container.innerHTML =
      periods
        .map(
          period => {

            const items =
              schedule.filter(
                item =>
                  item.period ===
                  period.id
              );


            const itemMarkup =
              items.length
                ? items
                    .map(
                      item => `
                        <li>
                          ${this.escapeHTML(item.label)}
                        </li>
                      `
                    )
                    .join("")
                : `
                    <li class="muted">
                      —
                    </li>
                  `;


            return `
              <section class="timeline-block">

                <header>
                  <span class="timeline-block__marker"></span>

                  <h3>
                    ${period.label}
                  </h3>
                </header>

                <ul>
                  ${itemMarkup}
                </ul>

              </section>
            `;

          }
        )
        .join("");

  },


  /* =======================================================
     DAY 10 MEASUREMENTS

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
                  on Day 10, but this defensive guard prevents
                  accidental writes from another day.
                */

                if (
                  day.dayNumber !== 10
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
                day.dayNumber !== 10
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
        "day-10-measurements"
      );


    if (!panel) {
      return;
    }


    const isDay10 =
      day.dayNumber === 10;


    panel.hidden =
      !isDay10;


    if (!isDay10) {
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