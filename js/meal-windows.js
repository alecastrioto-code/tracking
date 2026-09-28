/* =========================================================
   THE RUN — MEAL WINDOW GUIDANCE
========================================================= */
window.GlowApp = window.GlowApp || {};

GlowApp.MealWindows = {
  toMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]), minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  },

  formatEatenTime(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  },

  getState(meal, confirmedAt, settings, currentHHMM = null) {
    const window = settings?.mealWindows?.[meal] || GlowApp.DEFAULT_SETTINGS.mealWindows[meal];
    const start = this.toMinutes(window?.start), end = this.toMinutes(window?.end);
    const eatenTime = confirmedAt ? this.formatEatenTime(confirmedAt) : "";
    const eatenMinutes = eatenTime ? this.toMinutes(eatenTime) : null;
    if (eatenMinutes !== null) {
      const inside = start !== null && end !== null && eatenMinutes >= start && eatenMinutes <= end;
      return { status: inside ? "eaten" : "outside", label: inside ? `Eaten ${eatenTime}` : `Outside planned window · ${eatenTime}`, window };
    }
    const now = currentHHMM || `${String(new Date().getHours()).padStart(2,"0")}:${String(new Date().getMinutes()).padStart(2,"0")}`;
    const minutes = this.toMinutes(now);
    if (minutes === null || start === null || end === null) return { status:"upcoming", label:`${window.start}–${window.end}`, window };
    if (minutes < start) return { status:"upcoming", label:`Upcoming · ${window.start}–${window.end}`, window };
    if (minutes <= end) return { status:"open", label:`Window open · until ${window.end}`, window };
    return { status:"past", label:`${window.start}–${window.end}`, window };
  }
};
