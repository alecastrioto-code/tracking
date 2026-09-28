/* =========================================================
   GLOW CAMPAIGN — NAVIGATION
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.Navigation = {

  /* =======================================================
     INITIALISE
  ======================================================== */

  init() {

    this.bindMainNavigation();
    this.bindMobileMenu();
    this.bindDayNavigation();
    this.bindDaySelectors();

    this.render();

  },


  /* =======================================================
     MAIN VIEW NAVIGATION
  ======================================================== */

  bindMainNavigation() {

    const links = document.querySelectorAll(
      "[data-view-link]"
    );


    links.forEach((link) => {

      link.addEventListener(
        "click",
        (event) => {

          event.preventDefault();

          const viewName =
            link.dataset.viewLink;


          if (!viewName) {
            return;
          }


          this.goToView(viewName);

        }
      );

    });

  },


  goToView(viewName) {

    const changed =
      GlowApp.State.setActiveView(
        viewName
      );


    if (!changed) {
      return;
    }


    this.render();


    /* -----------------------------------------------------
       Let individual views render themselves when they exist
    ------------------------------------------------------ */

    this.renderActiveView();

  },


  /* =======================================================
     RENDER CURRENT VIEW
  ======================================================== */

  render() {

    const activeView =
      GlowApp.State.getActiveView();


    const views =
      document.querySelectorAll(
        ".app-view"
      );


    views.forEach((view) => {

      const isActive =
        view.dataset.view === activeView;


      view.hidden =
        !isActive;


      view.classList.toggle(
        "is-active",
        isActive
      );

    });


    /* -----------------------------------------------------
       Update navigation buttons
    ------------------------------------------------------ */

    const navLinks =
      document.querySelectorAll(
        ".main-navigation [data-view-link]"
      );


    navLinks.forEach((link) => {

      const isActive =
        link.dataset.viewLink ===
        activeView;


      link.classList.toggle(
        "is-active",
        isActive
      );


      if (isActive) {

        link.setAttribute(
          "aria-current",
          "page"
        );

      } else {

        link.removeAttribute(
          "aria-current"
        );

      }

    });


    this.closeMobileMenu();

  },


  /* =======================================================
     ASK ACTIVE VIEW TO RENDER

     These files do not exist yet when navigation.js loads,
     so every check is deliberately defensive.
  ======================================================== */

  renderActiveView() {

    const activeView =
      GlowApp.State.getActiveView();


    switch (activeView) {

      case "today":

  if (
    GlowApp.DayView &&
    typeof GlowApp.DayView.render === "function"
  ) {

    GlowApp.DayView.render();

  } else {

    this.renderDayShell();

  }


  /*
    Recovery is intentionally its own subsystem.

    Always force it to reload whenever the selected
    Today view/day changes.
  */

  if (
    GlowApp.Recovery &&
    typeof GlowApp.Recovery.render === "function"
  ) {

    GlowApp.Recovery.render();

  }

  break;


      case "campaign":

        if (
          GlowApp.OverviewView &&
          typeof GlowApp.OverviewView.render === "function"
        ) {

          GlowApp.OverviewView.render();

        }

        break;


      case "schedule":

        if (
          GlowApp.ScheduleView &&
          typeof GlowApp.ScheduleView.render === "function"
        ) {

          GlowApp.ScheduleView.render();

        }

        break;


      case "settings":

        if (
          GlowApp.SettingsView &&
          typeof GlowApp.SettingsView.render === "function"
        ) {

          GlowApp.SettingsView.render();

        }

        break;

    }

  },


  /* =======================================================
     TEMPORARY DAY SHELL RENDERER

     Until day-view.js exists, this keeps the day heading
     and previous/next buttons functioning.
  ======================================================== */

  renderDayShell() {

    const campaign =
      GlowApp.State.getActiveCampaign();


    const dayNumber =
      GlowApp.State.getSelectedDayNumber();


    if (!campaign) {
      return;
    }


    const dayNumberElement =
      document.getElementById(
        "current-day-number"
      );


    if (dayNumberElement) {

      dayNumberElement.textContent =
        dayNumber;

    }


    const previousButton =
      document.getElementById(
        "previous-day-button"
      );


    const nextButton =
      document.getElementById(
        "next-day-button"
      );


    if (previousButton) {

      previousButton.disabled =
        dayNumber <= 1;

    }


    if (nextButton) {

      nextButton.disabled =
        dayNumber >= campaign.length;

    }


    /* -----------------------------------------------------
       Show Day 10 measurement panel only on Day 10
    ------------------------------------------------------ */

    const measurements =
      document.getElementById(
        "day-10-measurements"
      );


    if (measurements) {

      measurements.hidden =
        dayNumber !== 10;

    }

  },


  /* =======================================================
     PREVIOUS / NEXT DAY
  ======================================================== */

  bindDayNavigation() {

    const previousButton =
      document.getElementById(
        "previous-day-button"
      );


    const nextButton =
      document.getElementById(
        "next-day-button"
      );


    if (previousButton) {

      previousButton.addEventListener(
        "click",
        () => {

          const changed =
            GlowApp.State.previousDay();


          if (!changed) {
            return;
          }


          this.renderActiveView();

        }
      );

    }


    if (nextButton) {

      nextButton.addEventListener(
        "click",
        () => {

          const changed =
            GlowApp.State.nextDay();


          if (!changed) {
            return;
          }


          this.renderActiveView();

        }
      );

    }

  },


  /* =======================================================
     CAMPAIGN BOARD DAY SELECTORS

     Later the overview will generate additional buttons.
     Event delegation means we do not need to rebind them.
  ======================================================== */

  bindDaySelectors() {

    document.addEventListener(
      "click",
      (event) => {

        const button =
          event.target.closest(
            "[data-day-select]"
          );


        if (!button) {
          return;
        }


        const dayNumber =
          Number(
            button.dataset.daySelect
          );


        if (!dayNumber) {
          return;
        }


        const changed =
          GlowApp.State.setSelectedDay(
            dayNumber
          );


        if (!changed) {
          return;
        }


        GlowApp.State.setActiveView(
          "today"
        );


        this.render();
        this.renderActiveView();

      }
    );

  },


  /* =======================================================
     MOBILE MENU
  ======================================================== */

  bindMobileMenu() {

    const button =
      document.getElementById(
        "mobile-menu-button"
      );


    const navigation =
      document.getElementById(
        "main-navigation"
      );


    if (
      !button ||
      !navigation
    ) {
      return;
    }


    button.addEventListener(
      "click",
      () => {

        const isOpen =
          navigation.classList.toggle(
            "is-open"
          );


        button.setAttribute(
          "aria-expanded",
          String(isOpen)
        );

        button.setAttribute(
          "aria-label",
          isOpen
            ? "Close navigation"
            : "Open navigation"
        );

      }
    );


    /* -----------------------------------------------------
       Close menu if window becomes desktop sized
    ------------------------------------------------------ */

    window.addEventListener(
      "resize",
      () => {

        if (
          window.innerWidth > 720
        ) {

          this.closeMobileMenu();

        }

      }
    );

  },


  closeMobileMenu() {

    const button =
      document.getElementById(
        "mobile-menu-button"
      );


    const navigation =
      document.getElementById(
        "main-navigation"
      );


    if (navigation) {

      navigation.classList.remove(
        "is-open"
      );

    }


    if (button) {

      button.setAttribute(
        "aria-expanded",
        "false"
      );

      button.setAttribute(
        "aria-label",
        "Open navigation"
      );

    }

  }

};