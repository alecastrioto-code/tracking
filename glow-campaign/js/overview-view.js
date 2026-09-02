/* =========================================================
   GLOW CAMPAIGN — OVERVIEW VIEW

   Responsibilities:
   - Campaign behavioral completion
   - 10-day matrix
   - Partial / complete cell visualization
   - Reward status
   - Basic recovery telemetry status

   Recovery charts themselves come next.
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.OverviewView = {

  initialized: false,


  /* =======================================================
     BOARD CONFIGURATION
  ======================================================== */

  rows: [

    {
      id: "food",
      label: "Food structure"
    },

    {
      id: "nutrition",
      label: "Nutrition"
    },

    {
      id: "water",
      label: "Water"
    },

    {
      id: "movement",
      label: "Movement"
    },

    {
      id: "glow",
      label: "Today’s Rhythm"
    }

  ],


  /* =======================================================
     INIT
  ======================================================== */

  init() {

    if (this.initialized) {
      return;
    }


    this.initialized = true;

  },


  /* =======================================================
     MAIN RENDER
  ======================================================== */

  render() {

    const campaign =
      GlowApp.State.getActiveCampaign();

    const state =
      GlowApp.State.get();

    const settings =
      state?.settings;


    if (!campaign) {
      return;
    }


    const score =
      GlowApp.Scoring.getCampaignScore(
        campaign,
        settings
      );


    this.renderCampaignScore(
      score
    );


    this.renderBoard(
      campaign,
      settings
    );


    this.renderRewardStatus(
      campaign,
      settings,
      score
    );


    this.renderRecoveryStatus(
      campaign
    );

  },


  /* =======================================================
     CAMPAIGN SCORE
  ======================================================== */

  renderCampaignScore(score) {

    this.setText(
      "campaign-percentage",
      `${score.percentage}%`
    );

    this.setText(
      "campaign-points",
      `${score.earned} / ${score.possible} pts`
    );


    const progress =
      document.getElementById(
        "campaign-progress"
      );

    const fill =
      document.getElementById(
        "campaign-progress-fill"
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


      fill.style.background =
        score.percentage === 100
          ? "var(--signal)"
          : "var(--accent)";

    }

  },


  /* =======================================================
     CAMPAIGN BOARD
  ======================================================== */

  renderBoard(
    campaign,
    settings
  ) {

    const tbody =
      document.getElementById(
        "campaign-board-body"
      );


    if (!tbody) {
      return;
    }


    const dayProgress =
      campaign.days.map(
        day => {

          return {
            dayNumber:
              day.dayNumber,

            categories:
              GlowApp.Scoring
                .getDayCategoryProgress(
                  day,
                  settings
                )
          };

        }
      );


    tbody.innerHTML =
      this.rows
        .map(
          row => {

            const cells =
              dayProgress
                .map(
                  day => {

                    const percentage =
                      day.categories[
                        row.id
                      ] ?? 0;


                    const complete =
                      percentage >= 100;


                    return `
                      <td
                        class="
                          campaign-cell
                          ${complete ? "is-complete" : ""}
                        "
                        data-category="${this.escapeHTML(row.id)}"
                        data-day="${day.dayNumber}"
                        aria-label="
                          Day ${day.dayNumber},
                          ${this.escapeHTML(row.label)},
                          ${percentage}% complete
                        "
                      >

                        <button
                          type="button"
                          class="campaign-cell__button"
                          data-day-select="${day.dayNumber}"
                          aria-label="
                            Open Day ${day.dayNumber}:
                            ${this.escapeHTML(row.label)}
                            ${percentage}% complete
                          "
                        >

                          <span
                            class="campaign-cell__fill"
                            style="--cell-progress: ${percentage}%"
                            aria-hidden="true"
                          ></span>

                          <span
                            class="campaign-cell__value"
                            aria-hidden="true"
                          >
                            ${this.getCellSymbol(
                              percentage
                            )}
                          </span>

                        </button>

                      </td>
                    `;

                  }
                )
                .join("");


            return `
              <tr>

                <th scope="row">
                  ${this.escapeHTML(row.label)}
                </th>

                ${cells}

              </tr>
            `;

          }
        )
        .join("");

  },


  /* =======================================================
     CELL SYMBOL

     Visual reinforcement on top of the fill.

     0     = blank
     1–99  = dot
     100   = check
  ======================================================== */

  getCellSymbol(percentage) {

    if (percentage >= 100) {
      return "✓";
    }


    if (percentage > 0) {
      return "•";
    }


    return "";

  },


  /* =======================================================
     REWARD STATUS

     Important UX decision:

     While the campaign is still underway we do NOT call
     the lowest current mathematical tier a failure.

     The final reward tier only becomes meaningful once all
     ten days are complete.

     For now this panel shows trajectory neutrally.
  ======================================================== */

  renderRewardStatus(
    campaign,
    settings,
    score
  ) {

    const title =
      document.getElementById(
        "reward-title"
      );

    const description =
      document.getElementById(
        "reward-description"
      );


    if (
      !title ||
      !description
    ) {
      return;
    }


    const reward =
      GlowApp.Scoring.getRewardTier(
        campaign,
        settings
      );


    /*
      We don't currently have a "day closed" concept.

      Treat the campaign as final only when Day 10 has
      actually begun AND has some behavioral data.

      Later we can replace this with an explicit
      "Finish campaign" action.
    */

    const day10 =
      campaign.days.find(
        day =>
          day.dayNumber === 10
      );


    const day10Score =
      day10
        ? GlowApp.Scoring.getDayScore(
            day10,
            settings
          )
        : null;


    const day10Started =
      day10Score
        ? day10Score.earned > 0 ||
          this.dayContainsInput(day10)
        : false;


    const isFinalStage =
      campaign.currentDay >= 10 &&
      day10Started;


    if (!isFinalStage) {

      title.textContent =
        `${score.percentage}% overall completion`;


      description.textContent =
        "Reward tier is determined by behavioral completion across the full 10-day run. Measurements never affect it.";

      return;

    }


    if (!reward.tier) {

      title.textContent =
        "Run complete";

      description.textContent =
        `${reward.percentage}% behavioral completion.`;

      return;

    }


    title.textContent =
      reward.tier.label;


    if (reward.tier.reward) {

      description.textContent =
        `${reward.percentage}% behavioral completion · Reward: ${reward.tier.reward}`;

    } else {

      description.textContent =
        `${reward.percentage}% behavioral completion · ${
          reward.tier.message ||
          "Review the system and redesign what didn't work."
        }`;

    }

  },


  /* =======================================================
     HAS DAY DATA?

     Only used to avoid pretending Day 10 is finished simply
     because the campaign object contains a Day 10 shell.
  ======================================================== */

  dayContainsInput(day) {

    if (!day) {
      return false;
    }


    const foodUsed =
      Object.values(
        day.food || {}
      ).some(
        value => value === true
      );


    const nutritionUsed =
      Object.values(
        day.nutrition || {}
      ).some(
        value =>
          value !== null &&
          value !== undefined &&
          value !== ""
      );


    const waterUsed =
      Array.isArray(
        day.water?.glasses
      ) &&
      day.water.glasses.some(Boolean);


    const movementUsed =
      Array.isArray(day.movement) &&
      day.movement.some(
        item =>
          item.completed === true
      );


    const selfCareUsed =
      Object.values(
        day.selfCare?.completions || {}
      ).some(Boolean);


    return (
      foodUsed ||
      nutritionUsed ||
      waterUsed ||
      movementUsed ||
      selfCareUsed
    );

  },


  /* =======================================================
     RECOVERY STATUS

     Actual charts arrive in the next stage.

     For now the overview makes clear whether we have
     telemetry available.
  ======================================================== */

renderRecoveryStatus(campaign) {

  if (!GlowApp.Recovery) {
    return;
  }

  if (typeof GlowApp.Recovery.renderCalorieTrend === "function") {
    GlowApp.Recovery.renderCalorieTrend(campaign);
  }

  if (typeof GlowApp.Recovery.renderOverviewTrends === "function") {
    GlowApp.Recovery.renderOverviewTrends(campaign);
  }

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