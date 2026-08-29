/* =========================================================
   GLOW CAMPAIGN — STORAGE
========================================================= */

window.GlowApp = window.GlowApp || {};


/* =========================================================
   STORAGE KEY
========================================================= */

GlowApp.STORAGE_KEY = "glowCampaignApp";


/* =========================================================
   SAVE
========================================================= */

GlowApp.Storage = {

  save(state) {

    try {

      const serializedState = JSON.stringify(state);

      localStorage.setItem(
        GlowApp.STORAGE_KEY,
        serializedState
      );

      return true;

    } catch (error) {

      console.error(
        "Ten Day Run: failed to save state.",
        error
      );

      return false;
    }

  },


  /* =======================================================
     LOAD
  ======================================================== */

  load() {

    try {

      const savedState = localStorage.getItem(
        GlowApp.STORAGE_KEY
      );


      if (!savedState) {
        return null;
      }


      const parsedState = JSON.parse(savedState);


      if (!GlowApp.Storage.isValidState(parsedState)) {

        console.warn(
          "Ten Day Run: stored data was invalid."
        );

        return null;
      }


      return parsedState;

    } catch (error) {

      console.error(
        "Ten Day Run: failed to load saved state.",
        error
      );

      return null;
    }

  },


  /* =======================================================
     REMOVE ALL SAVED APP DATA

     This does NOT automatically create a new campaign.
  ======================================================== */

  clear() {

    try {

      localStorage.removeItem(
        GlowApp.STORAGE_KEY
      );

      return true;

    } catch (error) {

      console.error(
        "Ten Day Run: failed to clear storage.",
        error
      );

      return false;
    }

  },


  /* =======================================================
     BASIC VALIDATION

     Keep this intentionally lightweight for MVP.

     Later we can add migrations if the data model changes.
  ======================================================== */

  isValidState(state) {

    if (!state || typeof state !== "object") {
      return false;
    }


    if (!Array.isArray(state.campaigns)) {
      return false;
    }


    if (!state.settings) {
      return false;
    }


    if (!state.ui) {
      return false;
    }


    return true;
  }

};