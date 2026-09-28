/* =========================================================
   GLOW CAMPAIGN — RECOVERY

   Recovery is tracked but NEVER scored.

   Responsibilities:
   - Bind daily recovery sliders
   - Persist recovery values
   - Reload values when switching days
   - Build 10-day recovery series
   - Render lightweight SVG trend strips
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.Recovery = {

  initialized: false,


  /* =======================================================
     CONTROL DEFINITIONS
  ======================================================== */

  controls: [

    {
      id: "sleep-rating",
      outputId: "sleep-rating-output",
      key: "sleep",
      label: "Sleep quality",
      min: 1,
      max: 5,
      fallback: 3,
      lowLabel: "Low",
      highLabel: "High"
    },

    {
      id: "hunger-rating",
      outputId: "hunger-rating-output",
      key: "hunger",
      label: "Hunger",
      min: 1,
      max: 5,
      fallback: 3,
      lowLabel: "Low",
      highLabel: "High"
    },

    {
      id: "soreness-rating",
      outputId: "soreness-rating-output",
      key: "soreness",
      label: "Soreness",
      min: 0,
      max: 3,
      fallback: 0,
      lowLabel: "None",
      highLabel: "High"
    },

    {
      id: "mood-rating",
      outputId: "mood-rating-output",
      key: "mood",
      label: "Mood / energy",
      min: 1,
      max: 5,
      fallback: 3,
      lowLabel: "Low",
      highLabel: "High"
    }

  ],


  /* =======================================================
     INIT
  ======================================================== */

  init() {

    if (this.initialized) {
      return;
    }


    this.bindControls();

    this.initialized = true;

  },


  /* =======================================================
     BIND DAILY SLIDERS
  ======================================================== */

  bindControls() {

    this.controls.forEach(
      control => {

        const input =
          document.getElementById(
            control.id
          );

        const output =
          document.getElementById(
            control.outputId
          );


        if (!input) {
          return;
        }


        input.addEventListener(
          "input",
          () => {

            const value =
              Number(input.value);


            if (output) {

              output.value =
                String(value);

              output.textContent =
                String(value);

            }


            GlowApp.State.updateSelectedDay(
              day => {

                if (!day.recovery) {

                  day.recovery = {
                    sleep: null,
                    hunger: null,
                    soreness: null,
                    mood: null
                  };

                }


                day.recovery[
                  control.key
                ] = value;

              }
            );


            input.dataset.logged =
              "true";


            this.updateControlAppearance(
              control,
              value
            );

          }
        );

      }
    );

  },


  /* =======================================================
     RENDER CURRENT DAY
  ======================================================== */

  render() {

    const day =
      GlowApp.State.getSelectedDay();


    if (!day) {
      return;
    }


    this.controls.forEach(
      control => {

        this.renderControl(
          day,
          control
        );

      }
    );

  },


  /* =======================================================
     RENDER ONE DAILY CONTROL
  ======================================================== */

  renderControl(
    day,
    control
  ) {

    const input =
      document.getElementById(
        control.id
      );

    const output =
      document.getElementById(
        control.outputId
      );


    if (!input) {
      return;
    }


    const storedValue =
      day?.recovery?.[
        control.key
      ];


    const hasStoredValue =
      storedValue !== null &&
      storedValue !== undefined &&
      storedValue !== "";


    const displayValue =
      hasStoredValue
        ? Number(storedValue)
        : control.fallback;


    input.value =
      String(displayValue);

    input.setAttribute(
      "value",
      String(displayValue)
    );


    input.dataset.logged =
      hasStoredValue
        ? "true"
        : "false";


    if (output) {

      output.value =
        String(displayValue);

      output.textContent =
        String(displayValue);

    }


    this.updateControlAppearance(
      control,
      displayValue
    );

  },


  /* =======================================================
     SLIDER APPEARANCE
  ======================================================== */

  updateControlAppearance(
    control,
    value
  ) {

    const input =
      document.getElementById(
        control.id
      );


    if (!input) {
      return;
    }


    const range =
      control.max -
      control.min;


    const percentage =
      range > 0
        ? (
            (value - control.min) /
            range
          ) * 100
        : 0;


    input.style.setProperty(
      "--range-progress",
      `${percentage}%`
    );

  },


  /* =======================================================
     CAMPAIGN SERIES
  ======================================================== */

  getCampaignSeries(
    campaign =
      GlowApp.State.getActiveCampaign()
  ) {

    const result = {
      sleep: [],
      hunger: [],
      soreness: [],
      mood: []
    };


    if (
      !campaign ||
      !Array.isArray(campaign.days)
    ) {
      return result;
    }


    campaign.days.forEach(
      day => {

        const recovery =
          GlowApp.Scoring
            .getRecoveryData(day);


        result.sleep.push({
          day: day.dayNumber,
          value: recovery.sleep
        });


        result.hunger.push({
          day: day.dayNumber,
          value: recovery.hunger
        });


        result.soreness.push({
          day: day.dayNumber,
          value: recovery.soreness
        });


        result.mood.push({
          day: day.dayNumber,
          value: recovery.mood
        });

      }
    );


    return result;

  },


  /* =======================================================
     LOGGED DAY COUNT
  ======================================================== */

  getLoggedDayCount(
    campaign =
      GlowApp.State.getActiveCampaign()
  ) {

    if (
      !campaign ||
      !Array.isArray(campaign.days)
    ) {
      return 0;
    }


    return campaign.days.filter(
      day => {

        const recovery =
          day.recovery || {};


        return [
          recovery.sleep,
          recovery.hunger,
          recovery.soreness,
          recovery.mood
        ].some(
          value =>
            value !== null &&
            value !== undefined &&
            value !== ""
        );

      }
    ).length;

  },


  /* =======================================================
     RENDER OVERVIEW TREND CARDS
  ======================================================== */

  renderOverviewTrends(
    campaign =
      GlowApp.State.getActiveCampaign()
  ) {

    if (!campaign) {
      return;
    }


    const cards =
      document.querySelectorAll(
        ".trend-card"
      );


    if (!cards.length) {
      return;
    }


    const series =
      this.getCampaignSeries(
        campaign
      );


    const configs = [

      {
        key: "sleep",
        label: "Sleep quality",
        min: 1,
        max: 5,
        direction:
          "Higher is generally better"
      },

      {
        key: "hunger",
        label: "Hunger",
        min: 1,
        max: 5,
        direction:
          "Watch for sustained increases"
      },

      {
        key: "soreness",
        label: "Soreness",
        min: 0,
        max: 3,
        direction:
          "Watch for accumulation"
      },

      {
        key: "mood",
        label: "Mood / energy",
        min: 1,
        max: 5,
        direction:
          "Watch for sustained decline"
      }

    ];


    configs.forEach(
      (config, index) => {

        const card =
          cards[index];


        if (!card) {
          return;
        }


        const values =
          series[
            config.key
          ];


        card.innerHTML =
          this.buildTrendCard(
            config,
            values
          );

      }
    );

  },


  /* =======================================================
     BUILD TREND CARD
  ======================================================== */

  buildTrendCard(
    config,
    values
  ) {

    const logged =
      values.filter(
        point =>
          point.value !== null &&
          point.value !== undefined
      );


    if (logged.length === 0) {

      return `
        <div class="trend-card__header">

          <div>
            <span class="trend-card__title">
              ${config.label}
            </span>

            <small>
              ${config.direction}
            </small>
          </div>

          <strong class="trend-card__latest">
            —
          </strong>

        </div>


        <div class="trend-empty">
          No recovery data yet
        </div>
      `;

    }


    const latest =
      logged[
        logged.length - 1
      ];


    const previous =
      logged.length > 1
        ? logged[
            logged.length - 2
          ]
        : null;


    const change =
      previous
        ? latest.value -
          previous.value
        : null;


    const changeLabel =
      this.getChangeLabel(
        change
      );


    const chart =
      this.buildSparkline(
        values,
        config.min,
        config.max
      );


    return `
      <div class="trend-card__header">

        <div>

          <span class="trend-card__title">
            ${config.label}
          </span>

          <small>
            ${config.direction}
          </small>

        </div>


        <div class="trend-card__metric">

          <strong class="trend-card__latest">
            ${latest.value}
          </strong>

          <span class="trend-card__change">
            ${changeLabel}
          </span>

        </div>

      </div>


      <div class="trend-chart">

        ${chart}

      </div>


      <div class="trend-days">

        ${values
          .map(
            point => `
              <span class="${point.value === null ? "is-empty" : ""}">
                ${point.day}
              </span>
            `
          )
          .join("")}

      </div>
    `;

  },


  /* =======================================================
     SVG SPARKLINE

     Missing recovery days create breaks in the line rather
     than being treated as zero.
  ======================================================== */

  buildSparkline(
    values,
    min,
    max
  ) {

    const width =
      100;

    const height =
      42;

    const paddingX =
      4;

    const paddingY =
      5;


    const usableWidth =
      width -
      paddingX * 2;

    const usableHeight =
      height -
      paddingY * 2;


    const range =
      max - min;


    const points =
      values.map(
        (item, index) => {

          if (
            item.value === null ||
            item.value === undefined
          ) {

            return {
              ...item,
              x:
                paddingX +
                (
                  index /
                  Math.max(
                    values.length - 1,
                    1
                  )
                ) *
                usableWidth,

              y: null
            };

          }


          const normalized =
            range > 0
              ? (
                  item.value -
                  min
                ) /
                range
              : 0;


          return {

            ...item,

            x:
              paddingX +
              (
                index /
                Math.max(
                  values.length - 1,
                  1
                )
              ) *
              usableWidth,

            y:
              paddingY +
              (
                1 -
                normalized
              ) *
              usableHeight

          };

        }
      );


    let path =
      "";

    let previousWasLogged =
      false;


    points.forEach(
      point => {

        if (
          point.y === null
        ) {

          previousWasLogged =
            false;

          return;
        }


        if (!previousWasLogged) {

          path +=
            `M ${point.x} ${point.y} `;

        } else {

          path +=
            `L ${point.x} ${point.y} `;

        }


        previousWasLogged =
          true;

      }
    );


    const circles =
      points
        .filter(
          point =>
            point.y !== null
        )
        .map(
          point => `
            <circle
              cx="${point.x}"
              cy="${point.y}"
              r="2"
            ></circle>
          `
        )
        .join("");


    return `
      <svg
        class="trend-svg"
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="none"
        role="img"
        aria-label="10-day recovery trend"
      >

        <line
          class="trend-svg__guide"
          x1="${paddingX}"
          y1="${paddingY}"
          x2="${width - paddingX}"
          y2="${paddingY}"
        ></line>

        <line
          class="trend-svg__guide"
          x1="${paddingX}"
          y1="${height / 2}"
          x2="${width - paddingX}"
          y2="${height / 2}"
        ></line>

        <line
          class="trend-svg__guide"
          x1="${paddingX}"
          y1="${height - paddingY}"
          x2="${width - paddingX}"
          y2="${height - paddingY}"
        ></line>


        <path
          class="trend-svg__line"
          d="${path.trim()}"
        ></path>


        <g class="trend-svg__points">
          ${circles}
        </g>

      </svg>
    `;

  },


  /* =======================================================
     CHANGE LABEL

     Neutral by design.

     We don't call recovery values "good" or "bad".
  ======================================================== */

  getChangeLabel(change) {

    if (
      change === null ||
      change === undefined
    ) {
      return "first log";
    }


    if (change > 0) {
      return `↑ ${change}`;
    }


    if (change < 0) {
      return `↓ ${Math.abs(change)}`;
    }


    return "→ same";

  }

};