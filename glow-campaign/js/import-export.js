/* =========================================================
   THE RUN — IMPORT / EXPORT + SPRINT MANAGEMENT
========================================================= */
window.GlowApp = window.GlowApp || {};

GlowApp.ImportExport = {
  initialized: false,
  pendingAction: null,
  toastTimer: null,

  init() {
    if (this.initialized) return;
    this.bindExport();
    this.bindImport();
    this.bindNewCampaign();
    this.bindResetCampaign();
    this.bindDialog();
    this.initialized = true;
  },

  bindExport() {
    document.getElementById("export-data-button")?.addEventListener("click", () => this.exportJSON());
  },

  async exportJSON() {
    const state = GlowApp.State.get();
    if (!state) return;
    const foodLibrary = GlowApp.FoodLibrary ? await GlowApp.FoodLibrary.exportAll() : [];
    const backup = {
      format: "the-run-backup",
      version: GlowApp.APP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      state,
      foodLibrary
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `the-run-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    this.showToast("Backup exported.");
  },

  bindImport() {
    const input = document.getElementById("import-data-input");
    if (!input) return;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const wrapped = data?.format === "the-run-backup";
        const importedState = wrapped ? data.state : data;
        const importedFoodLibrary = wrapped && Array.isArray(data.foodLibrary) ? data.foodLibrary : null;

        if (!GlowApp.Storage.isValidState(importedState) || Number(importedState.version) !== GlowApp.APP_SCHEMA_VERSION) {
          throw new Error("This backup uses an older or incompatible data model.");
        }

        this.openDialog({
          eyebrow: "Import backup",
          title: "Replace current The Run data?",
          message: "This replaces the current sprint, archives, Brain Dump and settings on this device. Compatible backups also restore your saved food library.",
          confirmLabel: "Import backup",
          action: async () => {
            if (!GlowApp.State.replaceState(importedState)) {
              this.showToast("Import failed.");
              return;
            }
            if (importedFoodLibrary && GlowApp.FoodLibrary) {
              try { await GlowApp.FoodLibrary.replaceAll(importedFoodLibrary); }
              catch (error) { console.warn("The Run: food library could not be restored.", error); }
            }
            GlowApp.Navigation.render();
            GlowApp.Navigation.renderActiveView();
            this.showToast("Backup imported.");
          }
        });
      } catch (error) {
        console.error("The Run: import failed.", error);
        this.showToast(error?.message || "That file is not a valid The Run backup.");
      } finally {
        input.value = "";
      }
    });
  },

  bindNewCampaign() {
    document.getElementById("new-campaign-button")?.addEventListener("click", () => {
      this.openDialog({
        eyebrow: "Fresh sprint",
        title: "Start a fresh 14-day sprint?",
        message: "This clears the current in-progress sprint instead of archiving an incomplete run. Your saved food memory remains on this device.",
        confirmLabel: "Start fresh sprint",
        action: () => {
          if (!GlowApp.State.resetActiveCampaign()) return;
          GlowApp.Navigation.render();
          GlowApp.Navigation.renderActiveView();
          this.showToast("Fresh sprint started.");
        }
      });
    });
  },

  bindResetCampaign() {
    document.getElementById("reset-campaign-button")?.addEventListener("click", () => {
      this.openDialog({
        eyebrow: "Reset sprint",
        title: "Erase this sprint’s progress?",
        message: "This resets all 14 days, the food plan, Brain Dump, training choices, recovery values, measurements and completion data. Saved food memory is not deleted.",
        confirmLabel: "Reset sprint",
        action: () => {
          if (!GlowApp.State.resetActiveCampaign()) return;
          GlowApp.Navigation.render();
          GlowApp.Navigation.renderActiveView();
          this.showToast("Sprint reset.");
        }
      });
    });
  },

  bindDialog() {
    const dialog = document.getElementById("app-dialog");
    if (!dialog) return;
    document.getElementById("dialog-cancel-button")?.addEventListener("click", () => this.closeDialog());
    document.getElementById("dialog-confirm-button")?.addEventListener("click", () => {
      const action = this.pendingAction;
      this.pendingAction = null;
      this.closeDialog();
      if (typeof action === "function") action();
    });
    dialog.addEventListener("click", event => { if (event.target === dialog) this.closeDialog(); });
    dialog.addEventListener("cancel", () => { this.pendingAction = null; });
  },

  openDialog({ eyebrow = "Confirm action", title = "Are you sure?", message = "", confirmLabel = "Confirm", action }) {
    const dialog = document.getElementById("app-dialog");
    if (!dialog) return;
    this.setText("dialog-eyebrow", eyebrow);
    this.setText("dialog-title", title);
    this.setText("dialog-message", message);
    this.setText("dialog-confirm-button", confirmLabel);
    this.pendingAction = action;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  },

  closeDialog() {
    const dialog = document.getElementById("app-dialog");
    this.pendingAction = null;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  },

  showToast(message) {
    const toast = document.getElementById("app-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  },

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
};
