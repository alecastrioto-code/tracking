/* =========================================================
   GLOW CAMPAIGN — SETTINGS VIEW
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.SettingsView = {

  initialized: false,


  /* =======================================================
     INIT
  ======================================================== */

  init() {

    if (this.initialized) {
      return;
    }

    this.bindNutritionSettings();
    this.bindWaterSettings();
    this.bindRewardSettings();

    this.initialized = true;

  },


  /* =======================================================
     MAIN RENDER
  ======================================================== */

  render() {

    const settings =
      GlowApp.State.get().settings;


    if (!settings) {
      return;
    }


    this.setInputValue(
      "setting-calories-max",
      settings.nutrition.caloriesMax
    );

    this.setInputValue(
      "setting-calories-grace-max",
      settings.nutrition.caloriesGraceMax
    );

    this.setInputValue(
      "setting-protein-min",
      settings.nutrition.proteinMin
    );

    this.setInputValue(
      "setting-fibre-min",
      settings.nutrition.fibreMin
    );

    this.setInputValue(
      "setting-water-target",
      settings.water.targetGlasses
    );


    this.renderRewardSettings(
      settings.rewards
    );

  },


  /* =======================================================
     NUTRITION
  ======================================================== */

  bindNutritionSettings() {

    const fields = [

      {
        id: "setting-calories-max",
        key: "caloriesMax"
      },

      {
        id: "setting-calories-grace-max",
        key: "caloriesGraceMax"
      },

      {
        id: "setting-protein-min",
        key: "proteinMin"
      },

      {
        id: "setting-fibre-min",
        key: "fibreMin"
      }

    ];


    fields.forEach(
      field => {

        const input =
          document.getElementById(
            field.id
          );


        if (!input) {
          return;
        }


        input.addEventListener(
          "change",
          () => {

            const value =
              Number(input.value);


            if (
              !Number.isFinite(value) ||
              value < 0
            ) {

              this.render();
              return;

            }


            GlowApp.State.updateSettings(
              settings => {

                settings.nutrition[
                  field.key
                ] = value;

              }
            );


            this.validateCalorieRange();

            this.showToast(
              "Nutrition targets updated."
            );

          }
        );

      }
    );

  },


  validateCalorieRange() {

    const settings = GlowApp.State.get().settings;
    const max = Number(settings.nutrition.caloriesMax);
    const graceMax = Number(settings.nutrition.caloriesGraceMax);

    if (graceMax >= max) {
      return;
    }

    GlowApp.State.updateSettings(
      current => {
        current.nutrition.caloriesGraceMax = max;
      }
    );

    this.render();
    this.showToast("Grace ceiling cannot be below the full-point ceiling.");
  },


  /* =======================================================
     WATER
  ======================================================== */

  bindWaterSettings() {

    const input =
      document.getElementById(
        "setting-water-target"
      );


    if (!input) {
      return;
    }


    input.addEventListener(
      "change",
      () => {

        const target =
          Math.round(
            Number(input.value)
          );


        if (
          !Number.isFinite(target) ||
          target < 1 ||
          target > 20
        ) {

          this.render();
          return;

        }


        GlowApp.State.updateSettings(
          settings => {

            settings.water
              .targetGlasses =
              target;

          }
        );


        this.showToast(
          `Water target set to ${target}.`
        );

      }
    );

  },


  /* =======================================================
     REWARD SETTINGS
  ======================================================== */

  renderRewardSettings(rewards) {

    const container =
      document.getElementById(
        "reward-settings-list"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      rewards
        .map(
          tier => {

            const usesMessage =
              tier.id === "review";


            return `
              <article
                class="reward-setting"
                data-reward-tier="${this.escapeHTML(tier.id)}"
              >

                <div class="reward-setting__heading">

                  <input
                    class="reward-setting__label"
                    type="text"
                    value="${this.escapeAttribute(tier.label)}"
                    data-reward-field="label"
                    data-reward-id="${this.escapeHTML(tier.id)}"
                    aria-label="Reward tier name"
                  >

                </div>


                <div class="reward-setting__range">

                  <label class="field">

                    <span>
                      Minimum %
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value="${tier.minPercent}"
                      data-reward-field="minPercent"
                      data-reward-id="${this.escapeHTML(tier.id)}"
                    >

                  </label>


                  <label class="field">

                    <span>
                      Maximum %
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value="${tier.maxPercent}"
                      data-reward-field="maxPercent"
                      data-reward-id="${this.escapeHTML(tier.id)}"
                    >

                  </label>

                </div>


                <label class="field field--full">

                  <span>
                    ${usesMessage ? "Message" : "Reward"}
                  </span>

                  <input
                    type="text"
                    value="${
                      this.escapeAttribute(
                        usesMessage
                          ? tier.message || ""
                          : tier.reward || ""
                      )
                    }"
                    data-reward-field="${
                      usesMessage
                        ? "message"
                        : "reward"
                    }"
                    data-reward-id="${this.escapeHTML(tier.id)}"
                  >

                </label>

              </article>
            `;

          }
        )
        .join("");

  },


  bindRewardSettings() {

    const container =
      document.getElementById(
        "reward-settings-list"
      );


    if (!container) {
      return;
    }


    container.addEventListener(
      "change",
      event => {

        const input =
          event.target.closest(
            "[data-reward-field]"
          );


        if (!input) {
          return;
        }


        const rewardId =
          input.dataset.rewardId;

        const field =
          input.dataset.rewardField;


        const state =
          GlowApp.State.get();


        const tier =
          state.settings.rewards
            .find(
              reward =>
                reward.id ===
                rewardId
            );


        if (!tier) {
          return;
        }


        if (
          field === "minPercent" ||
          field === "maxPercent"
        ) {

          let value =
            Number(input.value);


          if (
            !Number.isFinite(value)
          ) {

            this.render();
            return;

          }


          value =
            Math.min(
              Math.max(
                value,
                0
              ),
              100
            );


          tier[field] =
            value;

        } else {

          tier[field] =
            input.value.trim();

        }


        GlowApp.State.save();


        this.render();


        this.showToast(
          "Reward tier updated."
        );

      }
    );

  },


  /* =======================================================
     TOAST
  ======================================================== */

  showToast(message) {

    const toast =
      document.getElementById(
        "app-toast"
      );


    if (!toast) {
      return;
    }


    toast.textContent =
      message;

    toast.hidden =
      false;


    clearTimeout(
      this.toastTimer
    );


    this.toastTimer =
      setTimeout(
        () => {

          toast.hidden =
            true;

        },
        1800
      );

  },


  /* =======================================================
     HELPERS
  ======================================================== */

  setInputValue(
    id,
    value
  ) {

    const input =
      document.getElementById(id);


    if (input) {

      input.value =
        value ?? "";

    }

  },


  escapeHTML(value) {

    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  },


  escapeAttribute(value) {

    return this.escapeHTML(value);

  }

};