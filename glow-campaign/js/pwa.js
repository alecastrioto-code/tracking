/* =========================================================
   TEN DAY RUN — PWA BOOTSTRAP
========================================================= */

window.GlowApp = window.GlowApp || {};

GlowApp.PWA = {

  initialized: false,


  init() {

    if (this.initialized) {
      return;
    }


    this.initialized = true;


    if (!("serviceWorker" in navigator)) {
      return;
    }


    if (
      !window.isSecureContext &&
      location.hostname !== "localhost" &&
      location.hostname !== "127.0.0.1"
    ) {
      return;
    }


    window.addEventListener(
      "load",
      () => {

        navigator.serviceWorker
          .register("./service-worker.js", {
            scope: "./"
          })
          .catch((error) => {

            console.warn(
              "Ten Day Run: service worker could not be registered.",
              error
            );

          });

      },
      { once: true }
    );
  }

};
