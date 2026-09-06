/* =========================================================
   THE RUN — BRAIN DUMP
========================================================= */
window.GlowApp = window.GlowApp || {};

GlowApp.BrainDump = {
  ensure(campaign) {
    campaign.brainDump ||= { tasks: [] };
    campaign.brainDump.tasks = Array.isArray(campaign.brainDump.tasks) ? campaign.brainDump.tasks : [];
    return campaign.brainDump;
  },

  addTask(campaign, input = {}) {
    this.ensure(campaign);
    const assignment = input.assignment || { type: "unscheduled", dayNumber: null };
    const task = {
      id: GlowApp.createId("task"),
      text: String(input.text || "").trim(),
      category: ["self-care", "adulting", "quests"].includes(input.category) ? input.category : "adulting",
      assignment: {
        type: ["unscheduled", "day", "daily"].includes(assignment.type) ? assignment.type : "unscheduled",
        dayNumber: assignment.type === "day" ? Number(assignment.dayNumber) : null
      },
      startDay: Number(input.startDay || campaign.currentDay || 1),
      dailyCompletions: {},
      createdAt: new Date().toISOString()
    };
    if (!task.text) return null;
    if (task.assignment.type === "day" && (!Number.isInteger(task.assignment.dayNumber) || task.assignment.dayNumber < 1 || task.assignment.dayNumber > 14)) {
      task.assignment = { type: "unscheduled", dayNumber: null };
    }
    campaign.brainDump.tasks.push(task);
    return task;
  },

  updateTask(campaign, taskId, patch = {}) {
    const task = this.ensure(campaign).tasks.find(item => item.id === taskId);
    if (!task) return false;
    if (patch.text !== undefined) task.text = String(patch.text).trim() || task.text;
    if (["self-care", "adulting", "quests"].includes(patch.category)) task.category = patch.category;
    if (patch.assignment) {
      const type = ["unscheduled", "day", "daily"].includes(patch.assignment.type) ? patch.assignment.type : "unscheduled";
      task.assignment = {
        type,
        dayNumber: type === "day" ? Math.max(1, Math.min(14, Number(patch.assignment.dayNumber || 1))) : null
      };
      if (type === "daily" && patch.startDay) task.startDay = Number(patch.startDay);
    }
    return true;
  },

  removeTask(campaign, taskId) {
    const dump = this.ensure(campaign);
    const before = dump.tasks.length;
    dump.tasks = dump.tasks.filter(task => task.id !== taskId);
    return dump.tasks.length !== before;
  },

  getTasksForDay(campaign, dayNumber) {
    const day = Number(dayNumber);
    return this.ensure(campaign).tasks.filter(task => {
      if (task.assignment?.type === "day") return Number(task.assignment.dayNumber) === day;
      if (task.assignment?.type === "daily") return day >= Number(task.startDay || 1);
      return false;
    }).map(task => ({
      ...task,
      completedToday: task.assignment.type === "daily" ? task.dailyCompletions?.[day] === true : false
    }));
  },

  completeTask(campaign, taskId, dayNumber, completed = true) {
    const task = this.ensure(campaign).tasks.find(item => item.id === taskId);
    if (!task) return false;
    if (task.assignment?.type === "daily") {
      task.dailyCompletions ||= {};
      task.dailyCompletions[Number(dayNumber)] = completed === true;
      return true;
    }
    if (completed) return this.removeTask(campaign, taskId);
    return true;
  },

  moveToTomorrow(campaign, taskId, currentDay) {
    const task = this.ensure(campaign).tasks.find(item => item.id === taskId);
    if (!task || task.assignment?.type === "daily") return false;
    const day = Number(currentDay);
    if (day >= 14) task.assignment = { type: "unscheduled", dayNumber: null };
    else task.assignment = { type: "day", dayNumber: day + 1 };
    return true;
  },

  getRolloverTasks(campaign) {
    return this.ensure(campaign).tasks.map(task => {
      const copy = JSON.parse(JSON.stringify(task));
      copy.id = GlowApp.createId("task");
      copy.createdAt = new Date().toISOString();
      copy.dailyCompletions = {};
      if (copy.assignment.type === "daily") {
        copy.assignment = { type: "daily", dayNumber: null };
        copy.startDay = 1;
      } else {
        copy.assignment = { type: "unscheduled", dayNumber: null };
        copy.startDay = 1;
      }
      return copy;
    });
  },

  categoryLabel(category) {
    return category === "self-care" ? "Self care" : category === "quests" ? "Side projects & quests" : "Adulting";
  }
};
