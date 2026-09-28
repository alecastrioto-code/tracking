/* =========================================================
   TEN DAY RUN — CYCLE TRACKING

   Calendar-based estimate only.
   It is not a fertility or contraception tool.
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.Cycle = {

  initialized: false,


  init() {

    if (this.initialized) {
      return;
    }


    this.bindSettings();

    this.initialized = true;
  },


  bindSettings() {

    const dateInputs = [
      "setting-cycle-period-1",
      "setting-cycle-period-2",
      "setting-cycle-period-3"
    ];


    dateInputs.forEach(
      (id, index) => {

        const input =
          document.getElementById(id);


        if (!input) {
          return;
        }


        input.addEventListener(
          "change",
          () => {

            GlowApp.State.updateSettings(
              settings => {

                if (!settings.cycle) {
                  settings.cycle =
                    JSON.parse(
                      JSON.stringify(
                        GlowApp.DEFAULT_SETTINGS.cycle
                      )
                    );
                }


                settings.cycle
                  .recentPeriodStarts[index] =
                  input.value || "";
              }
            );


            this.renderSettings();

            GlowApp.SettingsView?.showToast?.(
              "Cycle dates updated."
            );
          }
        );
      }
    );


    const bleedingInput =
      document.getElementById(
        "setting-cycle-bleeding-length"
      );


    if (bleedingInput) {

      bleedingInput.addEventListener(
        "change",
        () => {

          const value =
            Math.min(
              10,
              Math.max(
                1,
                Math.round(
                  Number(bleedingInput.value) || 5
                )
              )
            );


          GlowApp.State.updateSettings(
            settings => {
              settings.cycle.bleedingLength =
                value;
            }
          );


          this.renderSettings();

          GlowApp.SettingsView?.showToast?.(
            "Cycle settings updated."
          );
        }
      );
    }


    const hormonalInput =
      document.getElementById(
        "setting-cycle-hormonal-suppression"
      );


    if (hormonalInput) {

      hormonalInput.addEventListener(
        "change",
        () => {

          GlowApp.State.updateSettings(
            settings => {
              settings.cycle.hormonalSuppression =
                hormonalInput.value === "yes";
            }
          );


          this.renderSettings();

          GlowApp.SettingsView?.showToast?.(
            "Cycle settings updated."
          );
        }
      );
    }
  },


  renderSettings() {

    const cycle =
      GlowApp.State.get()?.settings?.cycle;


    if (!cycle) {
      return;
    }


    const values =
      Array.isArray(cycle.recentPeriodStarts)
        ? cycle.recentPeriodStarts
        : ["", "", ""];


    [1, 2, 3].forEach(
      number => {

        const input =
          document.getElementById(
            `setting-cycle-period-${number}`
          );


        if (input) {
          input.value =
            values[number - 1] || "";
        }
      }
    );


    const bleedingInput =
      document.getElementById(
        "setting-cycle-bleeding-length"
      );


    if (bleedingInput) {
      bleedingInput.value =
        cycle.bleedingLength || 5;
    }


    const hormonalInput =
      document.getElementById(
        "setting-cycle-hormonal-suppression"
      );


    if (hormonalInput) {
      hormonalInput.value =
        cycle.hormonalSuppression
          ? "yes"
          : "no";
    }


    const preview =
      document.getElementById(
        "cycle-settings-preview"
      );


    if (preview) {

      const estimate =
        this.getEstimateForDate(
          GlowApp.todayISO()
        );


      preview.textContent =
        estimate
          ? estimate.hormonalSuppression
            ? "Phase prediction is disabled; symptom tracking stays available."
            : `${estimate.phaseLabel} · cycle day ${estimate.cycleDay} · average ${estimate.averageCycleLength} days`
          : "Add at least one recent period start date to show a phase estimate.";
    }
  },


  render(day) {

    const card =
      document.getElementById(
        "cycle-insight-card"
      );


    if (!card) {
      return;
    }


    const dayDate =
      GlowApp.State.getDateForDay(
        day.dayNumber
      );

    const estimate =
      this.getEstimateForDate(dayDate);


    if (!estimate) {
      card.hidden = true;
      return;
    }


    card.hidden = false;


    this.setText(
      "cycle-phase-label",
      estimate.phaseLabel
    );


    this.setText(
      "cycle-day-label",
      estimate.hormonalSuppression
        ? "Phase estimate off"
        : `Estimated cycle day ${estimate.cycleDay}`
    );


    this.setText(
      "cycle-next-period",
      estimate.nextPeriod
        ? this.formatDate(estimate.nextPeriod)
        : "—"
    );


    this.setText(
      "cycle-average-length",
      estimate.averageCycleLength
        ? `${estimate.averageCycleLength} days`
        : "Not enough history"
    );


    const list =
      document.getElementById(
        "cycle-attention-list"
      );


    if (list) {
      list.innerHTML =
        estimate.attention
          .map(
            item => `
              <li>
                <span aria-hidden="true"></span>
                ${this.escapeHTML(item)}
              </li>
            `
          )
          .join("");
    }


    const track =
      document.getElementById(
        "cycle-phase-track"
      );


    if (track) {
      track.dataset.phase =
        estimate.phaseKey;
    }
  },


  getEstimateForDate(targetDate) {

    const cycle =
      GlowApp.State.get()?.settings?.cycle;


    if (
      !cycle ||
      !GlowApp.isISODate(targetDate)
    ) {
      return null;
    }


    const starts =
      (cycle.recentPeriodStarts || [])
        .filter(GlowApp.isISODate)
        .sort((a, b) => b.localeCompare(a));


    if (starts.length === 0) {
      return null;
    }


    const averageCycleLength =
      this.getAverageCycleLength(starts);

    const bleedingLength =
      Math.min(
        10,
        Math.max(
          1,
          Math.round(
            Number(cycle.bleedingLength) || 5
          )
        )
      );


    let anchor =
      starts.find(
        date => date <= targetDate
      ) || starts[starts.length - 1];


    while (
      GlowApp.daysBetweenISO(
        targetDate,
        anchor
      ) >= averageCycleLength
    ) {
      anchor = GlowApp.addDaysISO(
        anchor,
        averageCycleLength
      );
    }


    const rawDay =
      GlowApp.daysBetweenISO(
        targetDate,
        anchor
      );

    const cycleDay =
      Math.max(
        1,
        (rawDay ?? 0) + 1
      );


    let nextPeriod =
      GlowApp.addDaysISO(
        anchor,
        averageCycleLength
      );


    while (nextPeriod < targetDate) {
      nextPeriod =
        GlowApp.addDaysISO(
          nextPeriod,
          averageCycleLength
        );
    }


    if (cycle.hormonalSuppression) {
      return {
        hormonalSuppression: true,
        averageCycleLength,
        cycleDay,
        nextPeriod,
        phaseKey: "tracking",
        phaseLabel: "Track symptoms",
        attention: [
          "Use bleeding, mood, sleep, hunger, soreness and energy as your useful signals.",
          "Compare patterns with your own baseline instead of assuming a four-phase pattern.",
          "Keep this informational rather than using it to make fertility or contraception decisions."
        ]
      };
    }


    const ovulationDay =
      Math.max(
        bleedingLength + 2,
        averageCycleLength - 14
      );


    let phaseKey = "luteal";
    let phaseLabel = "Luteal phase";


    if (cycleDay <= bleedingLength) {
      phaseKey = "menstrual";
      phaseLabel = "Menstrual phase";
    } else if (cycleDay < ovulationDay - 2) {
      phaseKey = "follicular";
      phaseLabel = "Follicular phase";
    } else if (cycleDay <= ovulationDay + 2) {
      phaseKey = "ovulation";
      phaseLabel = "Ovulation window";
    }


    const attentionByPhase = {
      menstrual: [
        "Notice bleeding, cramps and fatigue rather than forcing the planned intensity.",
        "Use your recovery check to decide whether the day needs adapting.",
        "Keep hydration, food and sleep support steady."
      ],

      follicular: [
        "Notice whether energy and recovery feel different from your usual baseline.",
        "Do not increase training intensity just because the phase estimate says follicular.",
        "Keep normal fueling and recovery habits."
      ],

      ovulation: [
        "Treat this as a rough calendar estimate, not a precise ovulation reading.",
        "Log energy and perceived effort so your own patterns become more useful over time.",
        "Keep normal recovery, hydration and fueling habits."
      ],

      luteal: [
        "Pay attention to hunger or cravings, sleep quality, mood and perceived effort.",
        "If symptoms rise, adapt from your actual recovery data rather than a rigid phase rule.",
        "Look for repeat patterns across cycles before changing the plan."
      ]
    };


    return {
      hormonalSuppression: false,
      averageCycleLength,
      cycleDay,
      nextPeriod,
      phaseKey,
      phaseLabel,
      attention:
        attentionByPhase[phaseKey]
    };
  },


  getAverageCycleLength(starts) {

    const gaps = [];


    for (
      let index = 0;
      index < starts.length - 1;
      index += 1
    ) {

      const gap =
        GlowApp.daysBetweenISO(
          starts[index],
          starts[index + 1]
        );


      if (
        Number.isFinite(gap) &&
        gap >= 15 &&
        gap <= 60
      ) {
        gaps.push(gap);
      }
    }


    if (gaps.length === 0) {
      return 28;
    }


    return Math.round(
      gaps.reduce(
        (total, value) => total + value,
        0
      ) / gaps.length
    );
  },


  formatDate(isoDate) {

    return new Intl.DateTimeFormat(
      undefined,
      {
        day: "numeric",
        month: "short",
        timeZone: "UTC"
      }
    ).format(
      new Date(`${isoDate}T00:00:00Z`)
    );
  },


  setText(id, value) {

    const element =
      document.getElementById(id);


    if (element) {
      element.textContent = value;
    }
  },


  escapeHTML(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
};
