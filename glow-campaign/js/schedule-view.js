/* =========================================================
   GLOW CAMPAIGN — SCHEDULE VIEW

   Editable:
   - Workout selection
   - Workout timing
   - Workout labels
   - Movement OR-groups
   - Custom unscored schedule items
   - Timeline labels / timing
   - Remove items

   Movement edits affect movement scoring.
   Ordinary schedule edits do not alter fixed campaign rules.
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.ScheduleView = {

  initialized: false,

  periods: [
    { id: "morning", label: "Morning" },
    { id: "midday", label: "Midday" },
    { id: "afternoon", label: "Afternoon" },
    { id: "evening", label: "Evening" }
  ],


  /* =======================================================
     INIT
  ======================================================== */

  init() {

    if (this.initialized) {
      return;
    }

    this.injectWorkoutControls();

    this.bindDayTabs();
    this.bindAddWorkout();
    this.bindAddCustomItem();
    this.bindEditor();

    this.initialized = true;

  },


  /* =======================================================
     WORKOUT ADD CONTROLS

     Inject these so you don't need another index.html edit.
  ======================================================== */

  injectWorkoutControls() {

    const existing =
      document.getElementById(
        "schedule-workout-controls"
      );

    if (existing) {
      return;
    }


    const addItemButton =
      document.getElementById(
        "add-schedule-item-button"
      );


    if (!addItemButton) {
      return;
    }


    addItemButton.textContent =
      "+ Custom item";

    addItemButton.classList.remove(
      "primary-button"
    );

    addItemButton.classList.add(
      "secondary-button"
    );


    const wrapper =
      document.createElement("div");


    wrapper.id =
      "schedule-workout-controls";

    wrapper.className =
      "schedule-editor__actions";


    const workoutOptions =
      GlowApp.WORKOUT_TYPES
        .map(
          workout => `
            <option value="${this.escapeHTML(workout.id)}">
              ${this.escapeHTML(workout.label)}
            </option>
          `
        )
        .join("");


    const periodOptions =
      this.periods
        .map(
          period => `
            <option value="${period.id}">
              ${period.label}
            </option>
          `
        )
        .join("");


    wrapper.innerHTML = `
      <div class="schedule-add-control">

        <select
          id="schedule-workout-type"
          aria-label="Workout type"
        >
          ${workoutOptions}
        </select>


        <select
          id="schedule-workout-period"
          aria-label="Workout time"
        >
          ${periodOptions}
        </select>


        <button
          class="primary-button"
          type="button"
          id="add-workout-button"
        >
          + Add workout
        </button>


        <span
          id="custom-item-button-slot"
        ></span>

      </div>
    `;


    addItemButton.parentNode.insertBefore(
      wrapper,
      addItemButton
    );


    const slot =
      document.getElementById(
        "custom-item-button-slot"
      );


    if (slot) {

      slot.appendChild(
        addItemButton
      );

    }

  },


  /* =======================================================
     MAIN RENDER
  ======================================================== */

  render() {

    const dayNumber =
      GlowApp.State.getScheduleDayNumber();

    const day =
      GlowApp.State.getDay(
        dayNumber
      );


    if (!day) {
      return;
    }


    this.ensureMovementLinks(day);

    this.renderDayTabs(
      dayNumber
    );

    this.setText(
      "schedule-editor-day-number",
      dayNumber
    );

    this.renderBlocks(day);

    this.updateWorkoutPeriodControl();

  },


  /* =======================================================
     DAY TABS
  ======================================================== */

  bindDayTabs() {

    const tabs =
      document.getElementById(
        "schedule-day-tabs"
      );


    if (!tabs) {
      return;
    }


    tabs.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-schedule-day]"
          );


        if (!button) {
          return;
        }


        const dayNumber =
          Number(
            button.dataset.scheduleDay
          );


        if (
          !GlowApp.State
            .setScheduleDay(
              dayNumber
            )
        ) {
          return;
        }


        this.render();

      }
    );

  },


  renderDayTabs(activeDay) {

    const buttons =
      document.querySelectorAll(
        "[data-schedule-day]"
      );


    buttons.forEach(
      button => {

        const isActive =
          Number(
            button.dataset.scheduleDay
          ) === activeDay;


        button.classList.toggle(
          "is-active",
          isActive
        );


        button.setAttribute(
          "aria-selected",
          String(isActive)
        );

      }
    );

  },


  /* =======================================================
     ADD WORKOUT
  ======================================================== */

  bindAddWorkout() {

    document.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "#add-workout-button"
          );


        if (!button) {
          return;
        }


        const typeSelect =
          document.getElementById(
            "schedule-workout-type"
          );

        const periodSelect =
          document.getElementById(
            "schedule-workout-period"
          );


        if (
          !typeSelect ||
          !periodSelect
        ) {
          return;
        }


        const workout =
          GlowApp.WORKOUT_TYPES.find(
            item =>
              item.id ===
              typeSelect.value
          );


        if (!workout) {
          return;
        }


        let period =
          periodSelect.value;


        /*
          Explicit campaign rule:
          glute pump = afternoon only.
        */

        if (
          workout.id ===
          "glute-pump"
        ) {

          period =
            "afternoon";

        }


        const dayNumber =
          GlowApp.State
            .getScheduleDayNumber();


        GlowApp.State.updateDay(
          dayNumber,
          day => {

            const movement =
              GlowApp.createMovementItem({
                type: workout.id,
                label: workout.label,
                period
              });


            day.movement.push(
              movement
            );


            const scheduleItem =
              GlowApp.createScheduleItem({
                label: workout.label,
                period,
                category: "movement",
                scored: true,
                linkedMovementType:
                  workout.id
              });


            /*
              New field for reliable syncing.

              Existing campaign data is upgraded automatically
              by ensureMovementLinks().
            */

            scheduleItem.linkedMovementId =
              movement.id;


            day.schedule.push(
              scheduleItem
            );

          }
        );


        this.render();

        this.showToast(
          `${workout.label} added.`
        );

      }
    );

  },


  /* =======================================================
     KEEP GLUTE PUMP AFTERNOON
  ======================================================== */

  updateWorkoutPeriodControl() {

    const workoutSelect =
      document.getElementById(
        "schedule-workout-type"
      );

    const periodSelect =
      document.getElementById(
        "schedule-workout-period"
      );


    if (
      !workoutSelect ||
      !periodSelect
    ) {
      return;
    }


    const update = () => {

      const isGlutePump =
        workoutSelect.value ===
        "glute-pump";


      if (isGlutePump) {

        periodSelect.value =
          "afternoon";

        periodSelect.disabled =
          true;

      } else {

        periodSelect.disabled =
          false;

      }

    };


    if (
      workoutSelect.dataset.bound !==
      "true"
    ) {

      workoutSelect.addEventListener(
        "change",
        update
      );


      workoutSelect.dataset.bound =
        "true";

    }


    update();

  },


  /* =======================================================
     ADD CUSTOM TIMELINE ITEM

     This is deliberately unscored.
  ======================================================== */

  bindAddCustomItem() {

    const button =
      document.getElementById(
        "add-schedule-item-button"
      );


    if (!button) {
      return;
    }


    button.addEventListener(
      "click",
      () => {

        const dayNumber =
          GlowApp.State
            .getScheduleDayNumber();


        GlowApp.State.updateDay(
          dayNumber,
          day => {

            day.schedule.push(
              GlowApp.createScheduleItem({
                label: "New item",
                period: "afternoon",
                category: "custom",
                scored: false
              })
            );

          }
        );


        this.render();

      }
    );

  },


  /* =======================================================
     EDITOR EVENT DELEGATION
  ======================================================== */

  bindEditor() {

    const editor =
      document.getElementById(
        "schedule-editor-blocks"
      );


    if (!editor) {
      return;
    }


    /* -----------------------------------------------------
       Text / select changes
    ------------------------------------------------------ */

    editor.addEventListener(
      "change",
      event => {

        const control =
          event.target.closest(
            "[data-schedule-action]"
          );


        if (!control) {
          return;
        }


        const action =
          control.dataset.scheduleAction;

        const scheduleId =
          control.dataset.scheduleId;


        if (!scheduleId) {
          return;
        }


        if (
          action === "label"
        ) {

          this.updateLabel(
            scheduleId,
            control.value
          );

        }


        if (
          action === "period"
        ) {

          this.updatePeriod(
            scheduleId,
            control.value
          );

        }


        if (
          action === "alternative"
        ) {

          this.updateAlternativeGroup(
            scheduleId,
            control.checked
          );

        }

      }
    );


    /*
      Label editing feels nicer live rather than only on blur.
    */

    editor.addEventListener(
      "input",
      event => {

        const control =
          event.target.closest(
            '[data-schedule-action="label"]'
          );


        if (!control) {
          return;
        }


        this.updateLabel(
          control.dataset.scheduleId,
          control.value,
          false
        );

      }
    );


    /* -----------------------------------------------------
       Delete
    ------------------------------------------------------ */

    editor.addEventListener(
      "click",
      event => {

        const deleteButton =
          event.target.closest(
            '[data-schedule-action="delete"]'
          );


        if (!deleteButton) {
          return;
        }


        this.deleteItem(
          deleteButton.dataset.scheduleId
        );

      }
    );

  },


  /* =======================================================
     UPDATE LABEL
  ======================================================== */

  updateLabel(
    scheduleId,
    label,
    rerender = true
  ) {

    const dayNumber =
      GlowApp.State
        .getScheduleDayNumber();


    GlowApp.State.updateDay(
      dayNumber,
      day => {

        const scheduleItem =
          day.schedule.find(
            item =>
              item.id ===
              scheduleId
          );


        if (!scheduleItem) {
          return;
        }


        scheduleItem.label =
          label;


        /*
          If it's movement, Today needs the same label.
        */

        const movement =
          this.getLinkedMovement(
            day,
            scheduleItem
          );


        if (movement) {

          movement.label =
            label;

        }

      }
    );


    if (rerender) {
      this.render();
    }

  },


  /* =======================================================
     UPDATE PERIOD
  ======================================================== */

  updatePeriod(
    scheduleId,
    period
  ) {

    const valid =
      this.periods.some(
        item =>
          item.id === period
      );


    if (!valid) {
      return;
    }


    const dayNumber =
      GlowApp.State
        .getScheduleDayNumber();


    let forcedAfternoon =
      false;


    GlowApp.State.updateDay(
      dayNumber,
      day => {

        const scheduleItem =
          day.schedule.find(
            item =>
              item.id ===
              scheduleId
          );


        if (!scheduleItem) {
          return;
        }


        const movement =
          this.getLinkedMovement(
            day,
            scheduleItem
          );


        /*
          Campaign constraint:
          Glute pump stays afternoon-only.
        */

        if (
          movement?.type ===
          "glute-pump"
        ) {

          scheduleItem.period =
            "afternoon";

          movement.period =
            "afternoon";

          forcedAfternoon =
            true;

          return;

        }


        scheduleItem.period =
          period;


        if (movement) {

          movement.period =
            period;

        }

      }
    );


    this.render();


    if (forcedAfternoon) {

      this.showToast(
        "Glute pump stays in the afternoon."
      );

    }

  },


  /* =======================================================
     OR / ALTERNATIVE MOVEMENT GROUP

     MVP supports one OR-group per day.

     Example Day 4:
       Easy walk OR Easy jog

     Both items share the same alternativeGroup,
     so together they are worth one possible point.
  ======================================================== */

  updateAlternativeGroup(
    scheduleId,
    checked
  ) {

    const dayNumber =
      GlowApp.State
        .getScheduleDayNumber();


    GlowApp.State.updateDay(
      dayNumber,
      day => {

        const scheduleItem =
          day.schedule.find(
            item =>
              item.id ===
              scheduleId
          );


        if (!scheduleItem) {
          return;
        }


        const movement =
          this.getLinkedMovement(
            day,
            scheduleItem
          );


        if (!movement) {
          return;
        }


        movement.alternativeGroup =
          checked
            ? `day-${day.dayNumber}-alternative`
            : null;

      }
    );


    this.render();

  },


  /* =======================================================
     DELETE ITEM
  ======================================================== */

  deleteItem(scheduleId) {

    const dayNumber =
      GlowApp.State
        .getScheduleDayNumber();


    let removedMovement =
      false;


    GlowApp.State.updateDay(
      dayNumber,
      day => {

        const scheduleItem =
          day.schedule.find(
            item =>
              item.id ===
              scheduleId
          );


        if (!scheduleItem) {
          return;
        }


        const movement =
          this.getLinkedMovement(
            day,
            scheduleItem
          );


        /*
          Removing a movement item removes the associated
          scored workout, therefore changing the denominator.
        */

        if (movement) {

          day.movement =
            day.movement.filter(
              item =>
                item.id !==
                movement.id
            );


          removedMovement =
            true;

        }


        day.schedule =
          day.schedule.filter(
            item =>
              item.id !==
              scheduleId
          );

      }
    );


    this.render();


    this.showToast(
      removedMovement
        ? "Workout removed from today's scoring plan."
        : "Schedule item removed."
    );

  },


  /* =======================================================
     RENDER BLOCKS
  ======================================================== */

  renderBlocks(day) {

    const container =
      document.getElementById(
        "schedule-editor-blocks"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      this.periods
        .map(
          period => {

            const items =
              day.schedule.filter(
                item =>
                  item.period ===
                  period.id
              );


            return `
              <section class="schedule-block">

                <header class="schedule-block__header">

                  <h3>
                    ${period.label}
                  </h3>

                  <span class="schedule-block__count">
                    ${items.length}
                  </span>

                </header>


                <div class="schedule-block__items">

                  ${
                    items.length
                      ? items
                          .map(
                            item =>
                              this.renderItem(
                                day,
                                item
                              )
                          )
                          .join("")
                      : `
                        <p class="schedule-block__empty">
                          Nothing scheduled.
                        </p>
                      `
                  }

                </div>

              </section>
            `;

          }
        )
        .join("");

  },


  /* =======================================================
     RENDER ITEM
  ======================================================== */

  renderItem(
    day,
    item
  ) {

    const movement =
      this.getLinkedMovement(
        day,
        item
      );


    const periodOptions =
      this.periods
        .map(
          period => `
            <option
              value="${period.id}"
              ${
                item.period ===
                period.id
                  ? "selected"
                  : ""
              }
            >
              ${period.label}
            </option>
          `
        )
        .join("");


    let badge =
      "Timeline";


    if (movement) {

      badge =
        "Scored workout";

    } else if (
      item.category === "food"
    ) {

      badge =
        "Food goal";

    } else if (
      item.category === "dog"
    ) {

      badge =
        "Dog walk";

    } else if (
      item.category === "glow"
    ) {

      badge =
        "Self care";

    }


    const alternativeControl =
      movement
        ? `
          <label class="or-toggle">

            <input
              type="checkbox"
              data-schedule-action="alternative"
              data-schedule-id="${this.escapeHTML(item.id)}"
              ${
                movement.alternativeGroup
                  ? "checked"
                  : ""
              }
            >

            <span>
              OR group
            </span>

          </label>
        `
        : "";


    return `
      <article
        class="
          schedule-item
          ${movement ? "schedule-item--movement" : ""}
        "
      >

        <div class="schedule-item__main">

          <input
            class="schedule-item__label-input"
            type="text"
            value="${this.escapeAttribute(item.label)}"
            data-schedule-action="label"
            data-schedule-id="${this.escapeHTML(item.id)}"
            aria-label="Schedule item label"
          >


          <div class="schedule-item__meta">

            <span class="schedule-item__badge">
              ${badge}
            </span>

            ${
              movement?.type ===
              "glute-pump"
                ? `
                  <span class="schedule-item__note">
                    afternoon only
                  </span>
                `
                : ""
            }

          </div>

        </div>


        <div class="schedule-item__controls">

          <select
            class="schedule-item__period"
            data-schedule-action="period"
            data-schedule-id="${this.escapeHTML(item.id)}"
            aria-label="Schedule period"
            ${
              movement?.type ===
              "glute-pump"
                ? "disabled"
                : ""
            }
          >
            ${periodOptions}
          </select>


          ${alternativeControl}


          <button
            class="schedule-delete-button"
            type="button"
            data-schedule-action="delete"
            data-schedule-id="${this.escapeHTML(item.id)}"
            aria-label="Remove ${this.escapeAttribute(item.label)}"
            title="Remove"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4 7h16"></path>
              <path d="M9 7V4h6v3"></path>
              <path d="M7 7l1 13h8l1-13"></path>
              <path d="M10 11v5"></path>
              <path d="M14 11v5"></path>
            </svg>
          </button>

        </div>

      </article>
    `;

  },


  /* =======================================================
     MIGRATION / LINK MOVEMENT ITEMS

     Your existing localStorage campaign was created before
     linkedMovementId existed.

     This quietly upgrades it by matching schedule items to
     movement objects.
  ======================================================== */

  ensureMovementLinks(day) {

    if (
      !Array.isArray(day.schedule) ||
      !Array.isArray(day.movement)
    ) {
      return;
    }


    const alreadyUsed =
      new Set(
        day.schedule
          .map(
            item =>
              item.linkedMovementId
          )
          .filter(Boolean)
      );


    let changed =
      false;


    day.schedule.forEach(
      scheduleItem => {

        if (
          scheduleItem.category !==
          "movement"
        ) {
          return;
        }


        if (
          scheduleItem.linkedMovementId
        ) {
          return;
        }


        const movement =
          day.movement.find(
            item => {

              if (
                alreadyUsed.has(
                  item.id
                )
              ) {
                return false;
              }


              if (
                scheduleItem
                  .linkedMovementType &&
                item.type ===
                  scheduleItem
                    .linkedMovementType
              ) {
                return true;
              }


              return (
                item.label ===
                scheduleItem.label
              );

            }
          );


        if (!movement) {
          return;
        }


        scheduleItem.linkedMovementId =
          movement.id;


        scheduleItem.linkedMovementType =
          movement.type;


        alreadyUsed.add(
          movement.id
        );


        changed =
          true;

      }
    );


    if (changed) {

      GlowApp.State.save();

    }

  },


  /* =======================================================
     GET LINKED MOVEMENT
  ======================================================== */

  getLinkedMovement(
    day,
    scheduleItem
  ) {

    if (
      !scheduleItem ||
      scheduleItem.category !==
      "movement"
    ) {
      return null;
    }


    if (
      scheduleItem.linkedMovementId
    ) {

      const direct =
        day.movement.find(
          movement =>
            movement.id ===
            scheduleItem
              .linkedMovementId
        );


      if (direct) {
        return direct;
      }

    }


    /*
      Legacy fallback.
    */

    return (
      day.movement.find(
        movement =>
          movement.type ===
            scheduleItem
              .linkedMovementType &&
          movement.label ===
            scheduleItem.label
      ) ||
      null
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
        2200
      );

  },


  /* =======================================================
     HELPERS
  ======================================================== */

  setText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);


    if (element) {

      element.textContent =
        value;

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