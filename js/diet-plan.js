/* =========================================================
   THE RUN — DIET PLAN / CSV IMPORT / GROCERY DERIVATION
========================================================= */
window.GlowApp = window.GlowApp || {};

GlowApp.DietPlan = {
  REQUIRED: ["day", "meal", "meal_name", "ingredient", "quantity", "unit"],
  MEALS: ["breakfast", "lunch", "snack", "dinner"],
  preparedImport: null,

  parseCSV(text) {
    const source = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (ch === '"') {
        if (quoted && source[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        row.push(field); field = "";
      } else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && source[i + 1] === '\n') i++;
        row.push(field); field = "";
        if (row.some(value => String(value).trim() !== "")) rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
    if (quoted) throw new Error("CSV contains an unclosed quoted field.");
    row.push(field);
    if (row.some(value => String(value).trim() !== "")) rows.push(row);
    if (!rows.length) return { headers: [], rows: [] };
    const headers = rows[0].map(value => this.normalizeHeader(value));
    return {
      headers,
      rows: rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, String(values[index] ?? "").trim()])))
    };
  },

  normalizeHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  },

  number(value) {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(String(value).replace(",", "."));
    return Number.isFinite(num) ? num : null;
  },

  async prepareImport(text, fileName = "diet.csv", options = {}) {
    let parsed;
    const blockingErrors = [];
    try { parsed = this.parseCSV(text); }
    catch (error) {
      return { fileName, rows: [], blockingErrors: [error.message], warnings: [], unresolvedCount: 0, dayCount: 0, mealCount: 0 };
    }

    this.REQUIRED.forEach(header => {
      if (!parsed.headers.includes(header)) blockingErrors.push(`Missing required column: ${header}.`);
    });

    const rows = [];
    const warnings = [];
    for (let index = 0; index < parsed.rows.length; index++) {
      const raw = parsed.rows[index];
      const rowNumber = index + 2;
      const day = Number(raw.day);
      const meal = String(raw.meal || "").toLowerCase().trim();
      const mealName = String(raw.meal_name || "").trim();
      const ingredient = String(raw.ingredient || "").trim();
      const quantity = this.number(raw.quantity);
      const unit = String(raw.unit || "").trim();
      const gramsRaw = this.number(raw.grams);

      if (!Number.isInteger(day) || day < 1 || day > 14) blockingErrors.push(`Row ${rowNumber}: day must be between 1 and 14.`);
      if (!this.MEALS.includes(meal)) blockingErrors.push(`Row ${rowNumber}: meal must be breakfast, lunch, snack or dinner.`);
      if (!mealName) blockingErrors.push(`Row ${rowNumber}: meal_name is required.`);
      if (!ingredient) blockingErrors.push(`Row ${rowNumber}: ingredient is required.`);
      if (quantity === null || quantity <= 0) blockingErrors.push(`Row ${rowNumber}: quantity must be greater than 0.`);
      if (!unit) blockingErrors.push(`Row ${rowNumber}: unit is required.`);
      if (!Number.isInteger(day) || day < 1 || day > 14 || !this.MEALS.includes(meal) || !mealName || !ingredient || quantity === null || quantity <= 0 || !unit) continue;

      let calories = this.number(raw.kcal);
      let protein = this.number(raw.protein);
      let fibre = this.number(raw.fibre);
      let nutritionStatus = [calories, protein, fibre].every(value => value !== null) ? "resolved" : "needs-review";
      let grams = gramsRaw;
      if (grams === null && /^g(?:rams?)?$/i.test(unit)) grams = quantity;
      let per100 = null;

      if (nutritionStatus === "needs-review" && options.resolveNutrition !== false && grams && GlowApp.FoodLog?.searchUSDA) {
        try {
          const matches = await GlowApp.FoodLog.searchUSDA(ingredient);
          const match = matches?.[0];
          if (match?.per100 && match.per100.calories != null && match.per100.protein != null && match.per100.fibre != null) {
            per100 = { ...match.per100 };
            calories = this.round(match.per100.calories * grams / 100, 1);
            protein = this.round(match.per100.protein * grams / 100, 1);
            fibre = this.round(match.per100.fibre * grams / 100, 1);
            nutritionStatus = "resolved";
          }
        } catch (error) {
          warnings.push(`Row ${rowNumber}: nutrition lookup unavailable for ${ingredient}.`);
        }
      }

      if (nutritionStatus === "resolved" && grams && !per100) {
        per100 = {
          calories: this.round(calories * 100 / grams, 2),
          protein: this.round(protein * 100 / grams, 2),
          fibre: this.round(fibre * 100 / grams, 2)
        };
      }

      rows.push({
        id: GlowApp.createId("diet-food"),
        day,
        meal,
        mealName,
        name: ingredient,
        ingredient,
        brand: "",
        origin: "diet",
        source: "diet",
        planned: true,
        eaten: false,
        quantity,
        unit,
        grams,
        amountG: grams,
        per100,
        calories: calories ?? 0,
        protein: protein ?? 0,
        fibre: fibre ?? 0,
        notes: String(raw.notes || "").trim(),
        nutritionStatus,
        addedAt: new Date().toISOString(),
        eatenAt: null
      });
    }

    const daySet = new Set(rows.map(row => row.day));
    const missingDays = Array.from({ length: 14 }, (_, index) => index + 1).filter(day => !daySet.has(day));
    if (missingDays.length) warnings.push(`No planned ingredients found for Day${missingDays.length === 1 ? "" : "s"} ${missingDays.join(", ")}.`);
    const mealSet = new Set(rows.map(row => `${row.day}:${row.meal}`));
    const prepared = {
      fileName,
      rows,
      blockingErrors: [...new Set(blockingErrors)],
      warnings,
      unresolvedCount: rows.filter(row => row.nutritionStatus === "needs-review").length,
      dayCount: daySet.size,
      mealCount: mealSet.size,
      ingredientCount: rows.length
    };
    this.preparedImport = prepared;
    return prepared;
  },

  commitImport(campaign, prepared = this.preparedImport) {
    if (!campaign || !prepared || prepared.blockingErrors?.length) return { ok: false, reason: "invalid" };
    const actualDays = [];
    campaign.days.forEach(day => {
      ["breakfast", "lunch", "snack", "dinner"].forEach(meal => {
        const existing = Array.isArray(day.foodLog?.[meal]) ? day.foodLog[meal] : [];
        const hadEaten = existing.some(item => item.eaten === true);
        if (hadEaten) actualDays.push(day.dayNumber);
        day.foodLog[meal] = existing.filter(item => item.eaten === true);
        if (!day.mealMeta) day.mealMeta = {};
        day.mealMeta[meal] ||= { mealName: "", confirmedAt: null };
        /* Keep factual meal metadata once food has actually been eaten. */
        if (!hadEaten) {
          day.mealMeta[meal].mealName = "";
          day.mealMeta[meal].confirmedAt = null;
        }
      });
    });

    prepared.rows.forEach(row => {
      const day = campaign.days.find(item => item.dayNumber === row.day);
      if (!day) return;
      const hasEatenHistory = day.foodLog[row.meal].some(item => item.eaten === true);
      day.foodLog[row.meal].push({ ...row });
      if (!hasEatenHistory) day.mealMeta[row.meal].mealName = row.mealName;
    });

    campaign.dietPlan = {
      importedAt: new Date().toISOString(),
      sourceFileName: prepared.fileName,
      status: "loaded"
    };
    return { ok: true, actualDays: [...new Set(actualDays)] };
  },

  deriveGrocery(day) {
    if (!day?.foodLog) return [];
    const aggregated = new Map();
    this.MEALS.forEach(meal => {
      (day.foodLog[meal] || []).filter(item => item.planned === true).forEach(item => {
        const name = String(item.name || item.ingredient || "").trim();
        const unit = String(item.unit || "").trim();
        const quantity = Number(item.quantity ?? item.amountG ?? 0);
        if (!name || !unit || !Number.isFinite(quantity) || quantity <= 0) return;
        const key = `${name.toLowerCase().replace(/\s+/g, " ")}|${unit.toLowerCase().replace(/\s+/g, " ")}`;
        if (!aggregated.has(key)) {
          aggregated.set(key, { id: `generated-${key}`, name, unit, quantity: 0, meals: new Set(), generated: true });
        }
        const target = aggregated.get(key);
        target.quantity += quantity;
        target.meals.add(meal);
      });
    });
    return [...aggregated.values()].map(item => ({
      ...item,
      quantity: this.round(item.quantity, 2),
      mealCount: item.meals.size,
      meals: [...item.meals]
    }));
  },

  getPlannedMealTotals(day, meal) {
    const items = (day?.foodLog?.[meal] || []).filter(item => item.planned === true);
    return items.reduce((totals, item) => {
      totals.calories += Number(item.calories || 0);
      totals.protein += Number(item.protein || 0);
      totals.fibre += Number(item.fibre || 0);
      totals.itemCount += 1;
      return totals;
    }, { calories: 0, protein: 0, fibre: 0, itemCount: 0 });
  },

  round(value, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  }
};
