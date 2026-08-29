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
    this.bindGlowSettings();
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
      "setting-calories-min",
      settings.nutrition.caloriesMin
    );

    this.setInputValue(
      "setting-calories-max",
      settings.nutrition.caloriesMax
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

    this.setInputValue(
      "setting-skincare-label",
      settings.glow.skincareLabel
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
        id: "setting-calories-min",
        key: "caloriesMin"
      },

      {
        id: "setting-calories-max",
        key: "caloriesMax"
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

    const settings =
      GlowApp.State.get().settings;


    const min =
      Number(
        settings.nutrition
          .caloriesMin
      );

    const max =
      Number(
        settings.nutrition
          .caloriesMax
      );


    if (min <= max) {
      return;
    }


    /*
      If the values cross, swap them rather than leaving
      impossible scoring rules.
    */

    GlowApp.State.updateSettings(
      current => {

        current.nutrition
          .caloriesMin = max;

        current.nutrition
          .caloriesMax = min;

      }
    );


    this.render();


    this.showToast(
      "Calorie bounds reordered."
    );

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
     GLOW LABEL
  ======================================================== */

  bindGlowSettings() {

    const input =
      document.getElementById(
        "setting-skincare-label"
      );


    if (!input) {
      return;
    }


    input.addEventListener(
      "change",
      () => {

        const label =
          input.value.trim();


        if (!label) {

          this.render();
          return;

        }


        this.updateSkincareLabel(
          label
        );


        this.showToast(
          "Self-care label updated."
        );

      }
    );

  },


  updateSkincareLabel(newLabel) {

    const state =
      GlowApp.State.get();


    const oldLabel =
      state.settings.glow
        .skincareLabel;


    /*
      Update global default.
    */

    state.settings.glow
      .skincareLabel =
      newLabel;


    /*
      Existing days that still use the old default follow
      the new label.

      If you later customise an individual day manually,
      that custom wording is preserved.
    */

    state.campaigns.forEach(
      campaign => {

        campaign.days.forEach(
          day => {

            if (
              !day.glow
                .skincareLabel ||
              day.glow
                .skincareLabel ===
                oldLabel
            ) {

              day.glow
                .skincareLabel =
                newLabel;

            }


            /*
              Keep the timeline copy aligned as well.
            */

            day.schedule
              ?.forEach(
                item => {

                  if (
                    item.category ===
                      "glow" &&
                    (
                      item.label ===
                        oldLabel ||
                      item.label ===
                        "PM skincare"
                    )
                  ) {

                    item.label =
                      newLabel;

                  }

                }
              );

          }
        );

      }
    );


    GlowApp.State.save();

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