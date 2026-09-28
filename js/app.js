/* =========================================================
   GLOW CAMPAIGN — APP BOOTSTRAP
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.App = {

  initialized: false,


  /* =======================================================
     START APPLICATION
  ======================================================== */

  init() {

    if (this.initialized) {
      return;
    }


    /* -----------------------------------------------------
       Ensure core dependencies exist
    ------------------------------------------------------ */

    if (
      !GlowApp.Storage ||
      !GlowApp.State ||
      !GlowApp.Scoring
    ) {

      console.error(
        "The Run: required application files are missing."
      );

      return;
    }


    /* -----------------------------------------------------
       Load or create persistent state
    ------------------------------------------------------ */

    const state =
      GlowApp.State.init();


    if (!state) {

      console.error(
        "The Run: application state could not be initialised."
      );

      return;
    }


    /* -----------------------------------------------------
       Initialise navigation
    ------------------------------------------------------ */

    if (GlowApp.Navigation) {

      GlowApp.Navigation.init();

    }


    /* -----------------------------------------------------
       Initialise individual view controllers

       These checks allow us to create each file gradually.
    ------------------------------------------------------ */

    this.initViewControllers();


    /* -----------------------------------------------------
       Render the initial active view
    ------------------------------------------------------ */

    if (GlowApp.Navigation) {

      GlowApp.Navigation.render();
      GlowApp.Navigation.renderActiveView();

    }


    this.initialized = true;


    console.info(
      "The Run operational.",
      {
        campaign:
          GlowApp.State
            .getActiveCampaign()
            ?.name,

        selectedDay:
          GlowApp.State
            .getSelectedDayNumber()
      }
    );

  },


  /* =======================================================
     VIEW CONTROLLERS
  ======================================================== */

  initViewControllers() {

    const controllers = [

      GlowApp.FoodLog,

      GlowApp.DayView,

      GlowApp.OverviewView,

      GlowApp.PlanView,

      GlowApp.SettingsView,

      GlowApp.Recovery,

      GlowApp.ImportExport,

      GlowApp.PWA

    ];


    controllers.forEach(
      (controller) => {

        if (
          controller &&
          typeof controller.init === "function"
        ) {

          controller.init();

        }

      }
    );

  }

};


/* =========================================================
   BOOT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    GlowApp.App.init();

  }
);