/* =========================================================
   GLOW CAMPAIGN — IMPORT / EXPORT + CAMPAIGN MANAGEMENT
========================================================= */

window.GlowApp = window.GlowApp || {};


GlowApp.ImportExport = {

  initialized: false,

  pendingAction: null,


  /* =======================================================
     INIT
  ======================================================== */

  init() {

    if (this.initialized) {
      return;
    }


    this.bindExport();
    this.bindImport();
    this.bindNewCampaign();
    this.bindResetCampaign();
    this.bindDialog();

    this.initialized = true;

  },


  /* =======================================================
     EXPORT JSON
  ======================================================== */

  bindExport() {

    const button =
      document.getElementById(
        "export-data-button"
      );


    if (!button) {
      return;
    }


    button.addEventListener(
      "click",
      () => {

        this.exportJSON();

      }
    );

  },


  async exportJSON() {

    const state =
      GlowApp.State.get();


    if (!state) {
      return;
    }


    const foodLibrary =
      GlowApp.FoodLibrary
        ? await GlowApp.FoodLibrary.exportAll()
        : [];


    const backup = {
      format: "ten-day-run-backup",
      version: 2,
      exportedAt: new Date().toISOString(),
      state,
      foodLibrary
    };


    const payload =
      JSON.stringify(
        backup,
        null,
        2
      );


    const blob =
      new Blob(
        [payload],
        {
          type:
            "application/json"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const anchor =
      document.createElement(
        "a"
      );


    const date =
      new Date()
        .toISOString()
        .slice(0, 10);


    anchor.href =
      url;

    anchor.download =
      `ten-day-run-backup-${date}.json`;


    document.body.appendChild(
      anchor
    );


    anchor.click();


    anchor.remove();


    URL.revokeObjectURL(
      url
    );


    this.showToast(
      "Backup exported."
    );

  },


  /* =======================================================
     IMPORT JSON
  ======================================================== */

  bindImport() {

    const input =
      document.getElementById(
        "import-data-input"
      );


    if (!input) {
      return;
    }


    input.addEventListener(
      "change",
      async () => {

        const file =
          input.files?.[0];


        if (!file) {
          return;
        }


        try {

          const text =
            await file.text();


          const data =
            JSON.parse(text);


          /*
            Version 2 backups wrap app state together with the
            IndexedDB food library. Older state-only backups remain
            valid and import exactly as before.
          */
          const importedState =
            data?.format === "ten-day-run-backup"
              ? data.state
              : data;

          const importedFoodLibrary =
            data?.format === "ten-day-run-backup" &&
            Array.isArray(data.foodLibrary)
              ? data.foodLibrary
              : null;


          if (
            !GlowApp.Storage
              .isValidState(importedState)
          ) {

            throw new Error(
              "Invalid Ten Day Run backup."
            );

          }


          /*
            Don't import immediately.

            Make it an explicit destructive confirmation.
          */

          this.openDialog({
            eyebrow:
              "Import backup",

            title:
              "Replace current data?",

            message:
              "Importing this backup will replace the current local Ten Day Run data on this device. New backups also restore your saved food library.",

            confirmLabel:
              "Import backup",

            action:
              async () => {

                const success =
                  GlowApp.State
                    .replaceState(importedState);


                if (!success) {

                  this.showToast(
                    "Import failed."
                  );

                  return;

                }


                if (
                  importedFoodLibrary &&
                  GlowApp.FoodLibrary
                ) {

                  try {

                    await GlowApp.FoodLibrary
                      .replaceAll(importedFoodLibrary);

                  } catch (foodLibraryError) {

                    console.warn(
                      "Ten Day Run: app data imported, but the food library could not be restored.",
                      foodLibraryError
                    );
                  }
                }


                GlowApp.Navigation
                  .render();

                GlowApp.Navigation
                  .renderActiveView();


                this.showToast(
                  "Backup imported."
                );

              }
          });


        } catch (error) {

          console.error(
            "Ten Day Run: import failed.",
            error
          );


          this.showToast(
            "That file is not a valid Ten Day Run backup."
          );

        } finally {

          /*
            Reset file input so importing the same backup
            again later still triggers change.
          */

          input.value =
            "";

        }

      }
    );

  },


  /* =======================================================
     CREATE NEW CAMPAIGN
  ======================================================== */

  bindNewCampaign() {

    const button =
      document.getElementById(
        "new-campaign-button"
      );


    if (!button) {
      return;
    }


    button.addEventListener(
      "click",
      () => {

        this.openDialog({
          eyebrow:
            "New operation",

          title:
            "Start a fresh 10-day run?",

          message:
            "Your current run will stay saved in local history. A new blank 10-day run will become active.",

          confirmLabel:
            "Start new run",

          action:
            () => {

              const campaign =
                GlowApp.State
                  .createCampaign(
                    "Ten Day Run"
                  );


              if (!campaign) {
                return;
              }


              GlowApp.Navigation
                .render();

              GlowApp.Navigation
                .renderActiveView();


              this.showToast(
                "New run created."
              );

            }
        });

      }
    );

  },


  /* =======================================================
     RESET CURRENT CAMPAIGN
  ======================================================== */

  bindResetCampaign() {

    const button =
      document.getElementById(
        "reset-campaign-button"
      );


    if (!button) {
      return;
    }


    button.addEventListener(
      "click",
      () => {

        this.openDialog({
          eyebrow:
            "Reset run",

          title:
            "Erase this run's progress?",

          message:
            "This resets all 10 days, workouts, nutrition entries, recovery values, measurements and completion data for the current run.",

          confirmLabel:
            "Reset run",

          action:
            () => {

              const success =
                GlowApp.State
                  .resetActiveCampaign();


              if (!success) {
                return;
              }


              GlowApp.Navigation
                .render();

              GlowApp.Navigation
                .renderActiveView();


              this.showToast(
                "Run reset."
              );

            }
        });

      }
    );

  },


  /* =======================================================
     DIALOG
  ======================================================== */

  bindDialog() {

    const dialog =
      document.getElementById(
        "app-dialog"
      );

    const cancel =
      document.getElementById(
        "dialog-cancel-button"
      );

    const confirm =
      document.getElementById(
        "dialog-confirm-button"
      );


    if (!dialog) {
      return;
    }


    if (cancel) {

      cancel.addEventListener(
        "click",
        () => {

          this.closeDialog();

        }
      );

    }


    if (confirm) {

      confirm.addEventListener(
        "click",
        () => {

          if (
            typeof this.pendingAction ===
            "function"
          ) {

            const action =
              this.pendingAction;


            /*
              Clear before execution so an exception cannot
              accidentally leave the old destructive action
              attached to the dialog.
            */

            this.pendingAction =
              null;


            this.closeDialog();


            action();

          } else {

            this.closeDialog();

          }

        }
      );

    }


    /*
      Clicking the native backdrop closes the dialog.
    */

    dialog.addEventListener(
      "click",
      event => {

        if (
          event.target === dialog
        ) {

          this.closeDialog();

        }

      }
    );


    /*
      Escape should also clear pending action.
    */

    dialog.addEventListener(
      "cancel",
      () => {

        this.pendingAction =
          null;

      }
    );

  },


  openDialog({
    eyebrow =
      "Confirm action",

    title =
      "Are you sure?",

    message =
      "",

    confirmLabel =
      "Confirm",

    action
  }) {

    const dialog =
      document.getElementById(
        "app-dialog"
      );


    if (!dialog) {
      return;
    }


    this.setText(
      "dialog-eyebrow",
      eyebrow
    );

    this.setText(
      "dialog-title",
      title
    );

    this.setText(
      "dialog-message",
      message
    );

    this.setText(
      "dialog-confirm-button",
      confirmLabel
    );


    this.pendingAction =
      action;


    if (
      typeof dialog.showModal ===
      "function"
    ) {

      dialog.showModal();

    } else {

      dialog.setAttribute(
        "open",
        ""
      );

    }

  },


  closeDialog() {

    const dialog =
      document.getElementById(
        "app-dialog"
      );


    if (!dialog) {
      return;
    }


    this.pendingAction =
      null;


    if (
      typeof dialog.close ===
      "function"
    ) {

      dialog.close();

    } else {

      dialog.removeAttribute(
        "open"
      );

    }

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
      document.getElementById(
        id
      );


    if (element) {

      element.textContent =
        value;

    }

  }

};