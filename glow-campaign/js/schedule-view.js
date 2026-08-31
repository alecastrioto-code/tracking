/* =========================================================
   GLOW CAMPAIGN — SCHEDULE VIEW

   Editable:
   - One activity-add flow for Training / Self care / Other
   - Workout selection, timing and labels
   - Custom unscored schedule items
   - Timeline labels / timing
   - Remove non-food items

   Fixed food goals stay visible but are not editable.
   Movement edits affect movement scoring. Existing alternative-group
   data remains intact, but the implementation detail is no longer
   exposed in the UI.
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.ScheduleView = {

  initialized: false,
  editingItemId: null,
  swipeState: null,

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

    this.setupAddActivityControls();

    this.bindDayTabs();
    this.bindAddActivity();
    this.bindEditor();

    this.initialized = true;

  },


  /* =======================================================
     ADD ACTIVITY CONTROLS
  ======================================================== */

  setupAddActivityControls() {

    const trainingSelect =
      document.getElementById(
        "schedule-training-type"
      );

    const periodSelect =
      document.getElementById(
        "schedule-activity-period"
      );


    if (trainingSelect) {

      trainingSelect.innerHTML =
        GlowApp.WORKOUT_TYPES
          .map(
            workout => `
              <option value="${this.escapeHTML(workout.id)}">
                ${this.escapeHTML(workout.label)}
              </option>
            `
          )
          .join("");
    }


    if (periodSelect) {

      periodSelect.innerHTML =
        this.periods
          .map(
            period => `
              <option value="${period.id}">
                ${period.label}
              </option>
            `
          )
          .join("");
    }


    this.updateAddActivityFields();
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

    this.setText(
      "schedule-add-day-number",
      dayNumber
    );

    this.renderBlocks(day);

    this.updateAddActivityFields();

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
     ADD ACTIVITY
  ======================================================== */

  bindAddActivity() {

    const openButton =
      document.getElementById(
        "add-schedule-item-button"
      );

    const panel =
      document.getElementById(
        "schedule-add-panel"
      );

    const cancelButton =
      document.getElementById(
        "cancel-schedule-activity-button"
      );

    const confirmButton =
      document.getElementById(
        "confirm-schedule-activity-button"
      );

    const categorySelect =
      document.getElementById(
        "schedule-activity-category"
      );

    const trainingSelect =
      document.getElementById(
        "schedule-training-type"
      );

    const selfCareSelect =
      document.getElementById(
        "schedule-self-care-type"
      );


    openButton?.addEventListener(
      "click",
      () => {

        if (!panel) {
          return;
        }

        panel.hidden = !panel.hidden;

        if (!panel.hidden) {
          this.updateAddActivityFields();
          categorySelect?.focus();
        }
      }
    );


    cancelButton?.addEventListener(
      "click",
      () => {
        if (panel) {
          panel.hidden = true;
        }
      }
    );


    categorySelect?.addEventListener(
      "change",
      () => this.updateAddActivityFields()
    );

    trainingSelect?.addEventListener(
      "change",
      () => this.updateAddActivityFields()
    );

    selfCareSelect?.addEventListener(
      "change",
      () => this.updateAddActivityFields()
    );


    confirmButton?.addEventListener(
      "click",
      () => {

        const category =
          categorySelect?.value ||
          "movement";

        const dayNumber =
          GlowApp.State
            .getScheduleDayNumber();

        const periodSelect =
          document.getElementById(
            "schedule-activity-period"
          );

        const customInput =
          document.getElementById(
            "schedule-custom-label"
          );

        let period =
          periodSelect?.value ||
          "afternoon";

        let label = "";


        if (category === "movement") {

          const workout =
            GlowApp.WORKOUT_TYPES.find(
              item =>
                item.id ===
                trainingSelect?.value
            );

          if (!workout) {
            return;
          }

          label = workout.label;

          if (workout.id === "glute-pump") {
            period = "afternoon";
          }


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

              scheduleItem.linkedMovementId =
                movement.id;

              day.schedule.push(
                scheduleItem
              );
            }
          );

        } else {

          if (category === "glow") {

            const selfCareType =
              selfCareSelect?.value ||
              "somatoline";

            if (selfCareType === "somatoline") {
              label = "Somatoline";
            } else if (selfCareType === "skincare") {
              label = "Skincare";
            } else {
              label = String(
                customInput?.value ||
                ""
              ).trim();
            }

          } else {

            label = String(
              customInput?.value ||
              ""
            ).trim();
          }


          if (!label) {

            customInput?.focus();
            this.showToast(
              "Name the activity first."
            );
            return;
          }


          GlowApp.State.updateDay(
            dayNumber,
            day => {

              day.schedule.push(
                GlowApp.createScheduleItem({
                  label,
                  period,
                  category:
                    category === "glow"
                      ? "glow"
                      : "custom",
                  scored: false
                })
              );
            }
          );
        }


        if (customInput) {
          customInput.value = "";
        }

        if (panel) {
          panel.hidden = true;
        }

        this.render();
        this.showToast(
          `${label} added.`
        );
      }
    );
  },


  updateAddActivityFields() {

    const category =
      document.getElementById(
        "schedule-activity-category"
      )?.value ||
      "movement";

    const trainingField =
      document.getElementById(
        "schedule-training-field"
      );

    const selfCareField =
      document.getElementById(
        "schedule-self-care-field"
      );

    const customField =
      document.getElementById(
        "schedule-custom-field"
      );

    const selfCareType =
      document.getElementById(
        "schedule-self-care-type"
      )?.value ||
      "somatoline";

    const trainingType =
      document.getElementById(
        "schedule-training-type"
      )?.value ||
      "";

    const periodSelect =
      document.getElementById(
        "schedule-activity-period"
      );


    if (trainingField) {
      trainingField.hidden =
        category !== "movement";
    }

    if (selfCareField) {
      selfCareField.hidden =
        category !== "glow";
    }

    if (customField) {
      customField.hidden =
        !(
          category === "custom" ||
          (
            category === "glow" &&
            selfCareType === "other"
          )
        );
    }


    if (periodSelect) {

      const glutePump =
        category === "movement" &&
        trainingType === "glute-pump";

      if (glutePump) {
        periodSelect.value = "afternoon";
      }

      periodSelect.disabled =
        glutePump;
    }
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


    this.bindSwipeReveal(editor);


    editor.addEventListener(
      "click",
      event => {

        if (event.target.closest(
          '[data-swipe-row][data-swipe-handled="true"]'
        )) {
          event.preventDefault();
          return;
        }

        const control =
          event.target.closest(
            "[data-schedule-action]"
          );


        if (!control) {

          if (!event.target.closest(
            "[data-swipe-row].is-revealed"
          )) {
            this.closeSwipeRows(editor);
          }

          return;
        }


        const action =
          control.dataset.scheduleAction;

        const scheduleId =
          control.dataset.scheduleId;


        if (!scheduleId) {
          return;
        }


        if (action === "edit") {

          this.editingItemId =
            scheduleId;

          this.closeSwipeRows(editor);
          this.render();
          return;
        }


        if (action === "cancel") {

          this.editingItemId = null;
          this.render();
          return;
        }


        if (action === "save") {

          const editRow =
            control.closest(
              "[data-schedule-editor-item]"
            );

          const labelInput =
            editRow?.querySelector(
              "[data-schedule-edit-label]"
            );

          const periodSelect =
            editRow?.querySelector(
              "[data-schedule-edit-period]"
            );


          this.saveItem(
            scheduleId,
            labelInput?.value || "",
            periodSelect?.value || ""
          );

          return;
        }


        if (action === "delete") {

          this.deleteItem(
            scheduleId
          );
        }

      }
    );
  },


  bindSwipeReveal(container) {

    container.addEventListener(
      "pointerdown",
      event => {


        if (event.target.closest(
          ".swipe-delete-button"
        )) {
          return;
        }

        const row = event.target.closest(
          "[data-swipe-row]"
        );

        if (!row) {
          return;
        }

        this.closeSwipeRows(container, row);
        row.classList.remove("is-revealed");
        row.classList.add("is-swiping");

        this.swipeState = {
          row,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          deltaX: 0,
          horizontal: false
        };

        row.setPointerCapture?.(
          event.pointerId
        );
      }
    );


    container.addEventListener(
      "pointermove",
      event => {

        const state =
          this.swipeState;

        if (
          !state ||
          state.pointerId !== event.pointerId
        ) {
          return;
        }

        const deltaX =
          event.clientX - state.startX;

        const deltaY =
          event.clientY - state.startY;


        if (
          !state.horizontal &&
          Math.abs(deltaY) > Math.abs(deltaX)
        ) {
          return;
        }


        if (Math.abs(deltaX) > 8) {
          state.horizontal = true;
        }


        if (!state.horizontal) {
          return;
        }


        state.deltaX =
          Math.max(
            -92,
            Math.min(0, deltaX)
          );

        state.row.style.setProperty(
          "--swipe-offset",
          `${state.deltaX}px`
        );

        event.preventDefault();
      }
    );


    const finishSwipe = event => {

      const state =
        this.swipeState;

      if (
        !state ||
        state.pointerId !== event.pointerId
      ) {
        return;
      }


      const reveal =
        state.horizontal &&
        state.deltaX <= -42;

      state.row.classList.toggle(
        "is-revealed",
        reveal
      );

      if (state.horizontal) {
        state.row.dataset.swipeHandled =
          "true";

        setTimeout(
          () => {
            delete state.row.dataset.swipeHandled;
          },
          0
        );
      }

      state.row.classList.remove(
        "is-swiping"
      );

      state.row.style.removeProperty(
        "--swipe-offset"
      );

      state.row.releasePointerCapture?.(
        event.pointerId
      );

      this.swipeState = null;
    };


    container.addEventListener(
      "pointerup",
      finishSwipe
    );

    container.addEventListener(
      "pointercancel",
      finishSwipe
    );
  },


  closeSwipeRows(container, except = null) {

    container
      .querySelectorAll(
        "[data-swipe-row].is-revealed"
      )
      .forEach(row => {

        if (row !== except) {
          row.classList.remove(
            "is-revealed"
          );
        }

      });
  },


  saveItem(
    scheduleId,
    label,
    period
  ) {

    const cleanLabel =
      String(label || "").trim();

    const validPeriod =
      this.periods.some(
        item => item.id === period
      );


    if (!cleanLabel) {
      this.showToast(
        "Give the activity a name."
      );
      return;
    }


    if (!validPeriod) {
      return;
    }


    const dayNumber =
      GlowApp.State
        .getScheduleDayNumber();

    let forcedAfternoon = false;


    GlowApp.State.updateDay(
      dayNumber,
      day => {

        const scheduleItem =
          day.schedule.find(
            item =>
              item.id === scheduleId
          );


        if (
          !scheduleItem ||
          scheduleItem.category === "food"
        ) {
          return;
        }


        const movement =
          this.getLinkedMovement(
            day,
            scheduleItem
          );


        scheduleItem.label =
          cleanLabel;


        if (movement) {
          movement.label = cleanLabel;
        }


        if (movement?.type === "glute-pump") {

          scheduleItem.period =
            "afternoon";

          movement.period =
            "afternoon";

          forcedAfternoon = true;
          return;
        }


        scheduleItem.period =
          period;


        if (movement) {
          movement.period = period;
        }

      }
    );


    this.editingItemId = null;
    this.render();


    if (forcedAfternoon) {
      this.showToast(
        "Glute pump stays in the afternoon."
      );
    }
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


        if (
          !scheduleItem ||
          scheduleItem.category === "food"
        ) {
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


        if (
          !scheduleItem ||
          scheduleItem.category === "food"
        ) {
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


        if (
          !scheduleItem ||
          scheduleItem.category === "food"
        ) {
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


    if (this.editingItemId === scheduleId) {
      this.editingItemId = null;
    }


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

    const isFood =
      item.category === "food";

    const isSelfCare =
      item.category === "glow";

    const isOther =
      item.category === "custom";

    const isEditing =
      !isFood &&
      this.editingItemId === item.id;


    let badge = "Other";

    if (movement) {
      badge = "Training";
    } else if (isFood) {
      badge = "Food goal";
    } else if (item.category === "dog") {
      badge = "Dog walk";
    } else if (isSelfCare) {
      badge = "Self care";
    }


    const classes = [
      "schedule-item",
      movement ? "schedule-item--movement" : "",
      isFood ? "schedule-item--fixed" : "",
      isSelfCare ? "schedule-item--self-care" : "",
      isOther ? "schedule-item--other" : "",
      isEditing ? "schedule-item--editing" : ""
    ]
      .filter(Boolean)
      .join(" ");


    const meta = `
      <div class="schedule-item__meta">
        <span class="schedule-item__badge">
          ${badge}
        </span>

        ${
          movement?.type === "glute-pump"
            ? `
              <span class="schedule-item__note">
                afternoon only
              </span>
            `
            : ""
        }
      </div>
    `;


    if (isFood) {

      return `
        <article class="${classes}">
          ${meta}

          <div class="schedule-item__static-label">
            <strong>${this.escapeHTML(item.label)}</strong>
          </div>
        </article>
      `;
    }


    const periodLabel =
      this.periods.find(
        period => period.id === item.period
      )?.label ||
      item.period ||
      "Unscheduled";


    const periodOptions =
      this.periods
        .map(
          period => `
            <option
              value="${period.id}"
              ${
                item.period === period.id
                  ? "selected"
                  : ""
              }
            >
              ${period.label}
            </option>
          `
        )
        .join("");


    if (isEditing) {

      return `
        <article
          class="${classes}"
          data-schedule-editor-item="${this.escapeHTML(item.id)}"
        >
          ${meta}

          <div class="schedule-item__edit-grid">
            <label class="schedule-item__edit-field">
              <span>Activity</span>
              <input
                class="schedule-item__label-input"
                type="text"
                value="${this.escapeAttribute(item.label)}"
                data-schedule-edit-label="${this.escapeHTML(item.id)}"
                aria-label="Activity name"
              >
            </label>

            <label class="schedule-item__edit-field">
              <span>Time</span>
              <select
                class="schedule-item__period"
                data-schedule-edit-period="${this.escapeHTML(item.id)}"
                aria-label="Schedule period"
                ${
                  movement?.type === "glute-pump"
                    ? "disabled"
                    : ""
                }
              >
                ${periodOptions}
              </select>
            </label>
          </div>

          <div class="schedule-item__edit-actions">
            <button
              class="secondary-button schedule-edit-cancel"
              type="button"
              data-schedule-action="cancel"
              data-schedule-id="${this.escapeHTML(item.id)}"
            >
              Cancel
            </button>

            <button
              class="primary-button schedule-edit-save"
              type="button"
              data-schedule-action="save"
              data-schedule-id="${this.escapeHTML(item.id)}"
            >
              Save
            </button>
          </div>
        </article>
      `;
    }


    return `
      <div
        class="swipe-row schedule-swipe-row"
        data-swipe-row
      >
        <article class="${classes} swipe-row__content">

          ${meta}

          <div class="schedule-item__display">
            <div class="schedule-item__display-copy">
              <strong>${this.escapeHTML(item.label)}</strong>
              <span>${this.escapeHTML(periodLabel)}</span>
            </div>

            <button
              class="schedule-edit-button"
              type="button"
              data-schedule-action="edit"
              data-schedule-id="${this.escapeHTML(item.id)}"
              aria-label="Edit ${this.escapeAttribute(item.label)}"
              title="Edit"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M4 20h4l11-11-4-4L4 16v4Z"></path>
                <path d="m13.5 6.5 4 4"></path>
              </svg>
            </button>
          </div>

        </article>

        <div class="swipe-row__action">
          <button
            class="swipe-delete-button schedule-delete-button"
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
            <span>Remove</span>
          </button>
        </div>
      </div>
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