/* =========================================================
   THE RUN — PROGRESS / SPRINT OVERVIEW
========================================================= */
window.GlowApp = window.GlowApp || {};

GlowApp.OverviewView = {
  initialized: false,

  rows: [
    { id: "food", label: "Food structure" },
    { id: "nutrition", label: "Nutrition" },
    { id: "water", label: "Water" },
    { id: "movement", label: "Movement" },
    { id: "glow", label: "Today’s Rhythm" }
  ],

  init() {
    if (this.initialized) return;
    this.bindSprintEndActions();
    this.initialized = true;
  },

  render() {
    const campaign = GlowApp.State.getActiveCampaign();
    const state = GlowApp.State.get();
    const settings = state?.settings;
    if (!campaign || !settings) return;

    const score = GlowApp.Scoring.getCampaignScore(campaign, settings);
    this.renderCampaignScore(score, campaign);
    this.renderBoard(campaign, settings);
    this.renderRewardStatus(campaign, settings, score);
    this.renderChallengeHistory(campaign, settings);
    this.renderTrainingSummary(campaign);
    this.renderArchives(state, campaign, settings);
    this.renderSprintEnd(campaign);
    this.renderRecoveryStatus(campaign);
  },

  renderCampaignScore(score, campaign) {
    this.setText("campaign-percentage", `${score.percentage}%`);
    this.setText("campaign-points", `${score.earned} / ${score.possible} pts`);
    const dayLabel = document.getElementById("campaign-day-label");
    if (dayLabel) dayLabel.textContent = `Day ${Math.min(Number(campaign.currentDay || 1), 14)} / 14`;

    const progress = document.getElementById("campaign-progress");
    const fill = document.getElementById("campaign-progress-fill");
    if (progress) {
      progress.setAttribute("aria-valuenow", String(score.percentage));
      progress.setAttribute("aria-valuetext", `${score.earned} of ${score.possible} behavioral points`);
    }
    if (fill) fill.style.width = `${score.percentage}%`;
  },

  renderBoard(campaign, settings) {
    const table = document.getElementById("campaign-board");
    const tbody = document.getElementById("campaign-board-body");
    if (!table || !tbody) return;

    const thead = table.querySelector("thead");
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th scope="col">Mission</th>
          ${campaign.days.map(day => `
            <th scope="col">
              <button type="button" data-day-select="${day.dayNumber}">D${day.dayNumber}</button>
            </th>
          `).join("")}
        </tr>`;
    }

    const dayProgress = campaign.days.map(day => ({
      dayNumber: day.dayNumber,
      categories: GlowApp.Scoring.getDayCategoryProgress(day, settings)
    }));

    tbody.innerHTML = this.rows.map(row => `
      <tr>
        <th scope="row">${this.escapeHTML(row.label)}</th>
        ${dayProgress.map(day => {
          const percentage = day.categories[row.id] ?? 0;
          return `
            <td class="campaign-cell ${percentage >= 100 ? "is-complete" : ""}" data-category="${row.id}" data-day="${day.dayNumber}">
              <button type="button" class="campaign-cell__button" data-day-select="${day.dayNumber}" aria-label="Open Day ${day.dayNumber}: ${this.escapeHTML(row.label)} ${percentage}% complete">
                <span class="campaign-cell__fill" style="--cell-progress:${percentage}%" aria-hidden="true"></span>
                <span class="campaign-cell__value" aria-hidden="true">${this.getCellSymbol(percentage)}</span>
              </button>
            </td>`;
        }).join("")}
      </tr>`).join("");
  },

  getCellSymbol(percentage) {
    if (percentage >= 100) return "✓";
    if (percentage > 0) return "•";
    return "";
  },

  renderRewardStatus(campaign, settings, score) {
    const panel = document.getElementById("final-reward-panel");
    const title = document.getElementById("reward-title");
    const description = document.getElementById("reward-description");
    if (!panel || !title || !description) return;

    const day14 = campaign.days.find(day => day.dayNumber === 14);
    const isFinalStage = campaign.status === "complete" || (campaign.currentDay >= 14 && this.dayContainsInput(day14));
    panel.hidden = !isFinalStage;
    if (!isFinalStage) return;

    const reward = GlowApp.Scoring.getRewardTier(campaign, settings);
    title.textContent = reward.tier?.label || "Sprint complete";
    const experience = this.getRewardExperience(reward.tier, campaign);
    description.textContent = experience
      ? `${reward.percentage}% behavioral completion · Experience: ${experience}`
      : `${reward.percentage}% behavioral completion.`;
  },

  getRewardExperience(tier, campaign) {
    if (!tier?.reward) return "";
    if (tier.id !== "legendary") return tier.reward;
    const options = ["Massage", "Salon treatment", "Fancy dinner"];
    const source = String(campaign?.id || "the-run");
    const hash = [...source].reduce((total, char) => total + char.charCodeAt(0), 0);
    return options[hash % options.length];
  },

  dayContainsInput(day) {
    if (!day) return false;
    const foodUsed = Object.values(day.food || {}).some(value => value === true) ||
      Object.values(day.foodLog || {}).some(items => Array.isArray(items) && items.some(item => item.eaten === true));
    const nutritionUsed = Object.values(day.nutrition || {}).some(value => value !== null && value !== undefined && value !== "" && typeof value !== "object");
    const waterUsed = Array.isArray(day.water?.glasses) && day.water.glasses.some(Boolean);
    const movementUsed = Array.isArray(day.movement) && day.movement.some(item => item.completed === true);
    const selfCareUsed = Object.values(day.selfCare?.completions || {}).some(Boolean);
    return foodUsed || nutritionUsed || waterUsed || movementUsed || selfCareUsed || day.challenge?.done === true;
  },

  renderChallengeHistory(campaign, settings) {
    const container = document.getElementById("challenge-history-strip");
    if (!container) return;
    container.innerHTML = campaign.days.map(day => {
      const score = GlowApp.Scoring.getDayScore(day, settings);
      const status = GlowApp.Scoring.getChallengeStatus(day, score);
      const isDisconnection = day.challenge?.type === "disconnection";
      const symbol = status.passed ? "✓" : status.done ? "•" : isDisconnection ? "◌" : "×";
      const state = status.passed ? "is-passed" : status.done ? "is-done" : "is-open";
      const label = day.challenge?.label || (isDisconnection ? "30 minutes of disconnection" : "Flexibility challenge");
      return `<button type="button" class="challenge-history-day ${state}" data-day-select="${day.dayNumber}" title="Day ${day.dayNumber}: ${this.escapeHTML(label)}">${symbol}<small>D${day.dayNumber}</small></button>`;
    }).join("");
  },

  renderTrainingSummary(campaign) {
    const summary = GlowApp.TrainingPlan?.completionSummary?.(campaign) || { completed: 0, possible: 0 };
    this.setText("training-progress-summary", `${summary.completed} / ${summary.possible} required blocks`);
  },

  renderArchives(state, campaign, settings) {
    const container = document.getElementById("archive-comparison");
    if (!container) return;
    const previous = Array.isArray(state.archives) ? state.archives[0] : null;
    if (!previous) {
      container.innerHTML = `<p class="plan-help">No previous sprint yet. Your first completed 14-day summary will appear here.</p>`;
      return;
    }

    const current = GlowApp.Scoring.getCampaignScore(campaign, settings);
    const delta = current.percentage - Number(previous.finalScore || 0);
    const deltaLabel = delta === 0 ? "same score" : `${delta > 0 ? "+" : ""}${Math.round(delta)} pts vs previous`;
    const currentTrend = campaign.days.map(day =>
      day.dayNumber <= Number(campaign.currentDay || 1)
        ? GlowApp.Scoring.getDayScore(day, settings).percentage
        : null
    );
    const previousTrend = (previous.scoreTrend || []).map(item => Number(item.percentage || 0));

    container.innerHTML = `
      <article class="archive-comparison-card">
        <div><span>Previous sprint</span><strong>${this.escapeHTML(previous.startDate || "")} → ${this.escapeHTML(previous.endDate || "")}</strong></div>
        <div><span>Final score</span><strong>${Number(previous.finalScore || 0)}%</strong></div>
        <div><span>Current comparison</span><strong>${this.escapeHTML(deltaLabel)}</strong></div>
        <div><span>Challenges</span><strong>${Number(previous.challengeSummary?.passed || 0)} passed</strong></div>
        <div><span>Training</span><strong>${Number(previous.trainingSummary?.completed || 0)} / ${Number(previous.trainingSummary?.possible || 0)}</strong></div>
      </article>
      <div class="archive-trends" aria-label="Current and previous sprint score trend">
        <div><span>Current</span>${this.renderScoreTrendStrip(currentTrend)}</div>
        <div><span>Previous</span>${this.renderScoreTrendStrip(previousTrend)}</div>
      </div>`;
  },

  renderScoreTrendStrip(values) {
    const normalized = Array.from({ length: 14 }, (_, index) => {
      const value = values?.[index];
      return Number.isFinite(Number(value)) ? Number(value) : null;
    });
    return `<div class="archive-trend-strip">${normalized.map((value, index) => `
      <span class="archive-trend-day ${value === null ? "is-empty" : ""}" title="Day ${index + 1}${value === null ? "" : ` · ${Math.round(value)}%`}">
        <i style="--trend-height:${value === null ? 4 : Math.max(4, Math.min(100, value))}%"></i>
      </span>`).join("")}</div>`;
  },

  renderSprintEnd(campaign) {
    const panel = document.getElementById("sprint-end-panel");
    if (!panel) return;
    const day14 = campaign.days.find(day => day.dayNumber === 14);
    const ready = campaign.currentDay >= 14 && this.dayContainsInput(day14);
    panel.hidden = !ready;
  },

  bindSprintEndActions() {
    document.getElementById("start-next-empty")?.addEventListener("click", () => this.startNextSprint(false));
    document.getElementById("start-next-reuse")?.addEventListener("click", () => this.startNextSprint(true));
  },

  startNextSprint(reuseDietPlan) {
    const state = GlowApp.State.get();
    if (!state || !GlowApp.SprintArchive) return;
    const result = GlowApp.SprintArchive.startNextSprint(state, { reuseDietPlan });
    if (!result) return;
    result.archive.completed = true;
    GlowApp.Storage.save(state);
    GlowApp.State.data = state;
    GlowApp.Navigation.render();
    GlowApp.Navigation.renderActiveView();
    GlowApp.ImportExport?.showToast?.(reuseDietPlan ? "New sprint started with the previous food plan." : "New sprint started.");
  },

  renderRecoveryStatus(campaign) {
    if (!GlowApp.Recovery) return;
    GlowApp.Recovery.renderCalorieTrend?.(campaign);
    GlowApp.Recovery.renderOverviewTrends?.(campaign);
  },

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
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
