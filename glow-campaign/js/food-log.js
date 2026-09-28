/* =========================================================
   TEN DAY RUN — FOOD LOGGING

   Phase 2A / 2B:
   - meal-level food records
   - automatic nutrition totals
   - recent foods from reliable localStorage food memory
   - barcode lookup through Open Food Facts
   - text search through Open Food Facts full-text endpoint
   - manual fallback

   Camera scanning uses ZXing Browser and is loaded only when
   requested. It requires HTTPS (or another secure context).
========================================================= */

window.GlowApp = window.GlowApp || {};

GlowApp.FoodLog = {

  initialized: false,

  meals: [
    {
      id: "breakfast",
      label: "Breakfast"
    },
    {
      id: "lunch",
      label: "Lunch"
    },
    {
      id: "snack",
      label: "Snack / treat"
    },
    {
      id: "dinner",
      label: "Dinner"
    }
  ],

  activeMeal: null,
  activeFood: null,
  searchResults: [],
  recentFoods: [],
  scanner: null,
  scannerControls: null,
  scannerLibraryPromise: null,
  scannerRunning: false,
  scannerLocked: false,
  barcodeSessionId: 0,
  describedAmountG: null,


  init() {

    if (this.initialized) {
      return;
    }


    GlowApp.FoodLibrary?.init();

    this.bindMealCard();
    this.bindDialog();

    this.initialized = true;
  },


  /* ======================================================
     DAY MODEL
  ======================================================= */

  ensureDayModel(day) {

    if (!day) {
      return;
    }


    if (!day.foodLog || typeof day.foodLog !== "object") {

      day.foodLog = {
        breakfast: [],
        lunch: [],
        snack: [],
        dinner: []
      };
    }


    this.meals.forEach((meal) => {

      if (!Array.isArray(day.foodLog[meal.id])) {
        day.foodLog[meal.id] = [];
      }

    });


    if (!day.nutrition || typeof day.nutrition !== "object") {

      day.nutrition = {
        calories: null,
        protein: null,
        fibre: null
      };
    }


    if (!day.nutrition.source) {
      day.nutrition.source = "manual";
    }


    if (!day.nutrition.manualValues) {

      day.nutrition.manualValues = {
        calories:
          day.nutrition.calories ?? null,
        protein:
          day.nutrition.protein ?? null,
        fibre:
          day.nutrition.fibre ?? null
      };
    }
  },


  hasItems(day) {

    this.ensureDayModel(day);


    return this.meals.some(
      meal => day.foodLog[meal.id].length > 0
    );
  },


  getAllItems(day) {

    this.ensureDayModel(day);


    return this.meals.flatMap(
      meal => day.foodLog[meal.id]
    );
  },


  getTotals(day) {

    const items = this.getAllItems(day);


    const totals = items.reduce(
      (sum, item) => {

        sum.calories += Number(item.calories || 0);
        sum.protein += Number(item.protein || 0);
        sum.fibre += Number(item.fibre || 0);

        return sum;

      },
      {
        calories: 0,
        protein: 0,
        fibre: 0
      }
    );


    return {
      calories: Math.round(totals.calories),
      protein: this.round(totals.protein, 1),
      fibre: this.round(totals.fibre, 1),
      itemCount: items.length
    };
  },


  syncNutrition(day) {

    this.ensureDayModel(day);


    const hasItems = this.hasItems(day);


    if (hasItems) {

      if (day.nutrition.source !== "foodLog") {

        day.nutrition.manualValues = {
          calories:
            day.nutrition.calories ?? null,
          protein:
            day.nutrition.protein ?? null,
          fibre:
            day.nutrition.fibre ?? null
        };
      }


      const totals = this.getTotals(day);


      day.nutrition.calories = totals.calories;
      day.nutrition.protein = totals.protein;
      day.nutrition.fibre = totals.fibre;
      day.nutrition.source = "foodLog";

      return;
    }


    if (day.nutrition.source === "foodLog") {

      const backup =
        day.nutrition.manualValues || {};


      day.nutrition.calories =
        backup.calories ?? null;

      day.nutrition.protein =
        backup.protein ?? null;

      day.nutrition.fibre =
        backup.fibre ?? null;

      day.nutrition.source = "manual";
    }
  },


  /* ======================================================
     TODAY RENDERING
  ======================================================= */

  render(day) {

    if (!day) {
      return;
    }


    this.ensureDayModel(day);
    this.syncNutrition(day);


    this.meals.forEach((meal) => {

      const container = document.querySelector(
        `[data-meal-items="${meal.id}"]`
      );


      if (!container) {
        return;
      }


      const items = day.foodLog[meal.id];


      if (!items.length) {

        container.innerHTML = "";
        container.hidden = true;
        return;
      }


      container.hidden = false;

      container.innerHTML = items
        .map((item) => {

          const brand = item.brand
            ? `<span>${this.escapeHTML(item.brand)}</span>`
            : "";


          return `
            <article class="meal-food-item">

              <div class="meal-food-item__main">
                <strong>${this.escapeHTML(item.name)}</strong>

                <small>
                  ${brand}
                  <span>${this.formatAmount(item.amountG)}</span>
                  <span>${this.formatNumber(item.calories, 0)} kcal</span>
                  <span>${this.formatNumber(item.protein, 1)}g protein</span>
                </small>
              </div>

              <button
                class="meal-food-item__remove"
                type="button"
                data-remove-food-item="${this.escapeAttribute(item.id)}"
                data-remove-food-meal="${meal.id}"
                aria-label="Remove ${this.escapeAttribute(item.name)} from ${meal.label}"
                title="Remove"
              >
                <span aria-hidden="true">×</span>
              </button>

            </article>
          `;

        })
        .join("");

    });


    this.renderNutritionSource(day);
  },


  renderNutritionSource(day) {

    const note = document.getElementById(
      "nutrition-source-note"
    );


    if (!note) {
      return;
    }


    if (!this.hasItems(day)) {

      note.innerHTML = `
        Enter totals manually, or add foods above to calculate them automatically.
      `;

      note.classList.remove(
        "nutrition-source-note--auto"
      );

      return;
    }


    const totals = this.getTotals(day);


    note.innerHTML = `
      <strong>Calculated from ${totals.itemCount} logged ${totals.itemCount === 1 ? "food" : "foods"}.</strong>
      Remove the food log entries to return to manual totals.
    `;

    note.classList.add(
      "nutrition-source-note--auto"
    );
  },


  bindMealCard() {

    const card = document.getElementById(
      "food-card"
    );


    if (!card) {
      return;
    }


    card.addEventListener(
      "click",
      (event) => {

        const addButton = event.target.closest(
          "[data-add-food]"
        );


        if (addButton) {

          this.openDialog(
            addButton.dataset.addFood
          );

          return;
        }


        const removeButton = event.target.closest(
          "[data-remove-food-item]"
        );


        if (removeButton) {

          this.removeItem(
            removeButton.dataset.removeFoodMeal,
            removeButton.dataset.removeFoodItem
          );
        }

      }
    );
  },


  async removeItem(mealId, itemId) {

    GlowApp.State.updateSelectedDay(
      (day) => {

        this.ensureDayModel(day);

        day.foodLog[mealId] =
          day.foodLog[mealId]
            .filter(item => item.id !== itemId);

        this.syncNutrition(day);

      }
    );


    this.refreshToday();
  },


  /* ======================================================
     FOOD SHEET
  ======================================================= */

  bindDialog() {

    const dialog = document.getElementById(
      "food-log-dialog"
    );


    if (!dialog) {
      return;
    }


    document.getElementById(
      "food-log-close"
    )?.addEventListener(
      "click",
      () => this.closeDialog()
    );


    dialog.addEventListener(
      "cancel",
      () => {
        this.stopScanner();
      }
    );


    dialog.addEventListener(
      "close",
      () => {
        this.stopScanner();
      }
    );


    dialog.addEventListener(
      "click",
      (event) => {

        if (event.target === dialog) {
          this.closeDialog();
          return;
        }


        const recentButton = event.target.closest(
          "[data-recent-food-index]"
        );


        if (recentButton) {

          const food = this.recentFoods[
            Number(recentButton.dataset.recentFoodIndex)
          ];


          if (food) {
            this.openConfirm(food, food.lastAmount || 100);
          }

          return;
        }


        const resultButton = event.target.closest(
          "[data-food-result-index]"
        );


        if (resultButton) {

          const food = this.searchResults[
            Number(resultButton.dataset.foodResultIndex)
          ];


          if (food) {

            this.openConfirm(
              food,
              this.describedAmountG ||
              food.lastAmount ||
              food.defaultAmount ||
              100
            );
          }

        }

      }
    );


    document.getElementById(
      "food-search-form"
    )?.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();

        const input = document.getElementById(
          "food-search-input"
        );


        this.searchFood(
          input?.value || ""
        );

      }
    );


    document.getElementById(
      "food-scan-button"
    )?.addEventListener(
      "click",
      () => this.openBarcodePanel()
    );


    document.getElementById(
      "food-manual-button"
    )?.addEventListener(
      "click",
      () => this.openConfirm(
        {
          id: null,
          name: "",
          brand: "",
          source: "manual",
          barcode: "",
          per100: {
            calories: null,
            protein: null,
            fibre: null
          }
        },
        100
      )
    );


    document.getElementById(
      "food-sheet-back"
    )?.addEventListener(
      "click",
      () => this.showHome()
    );


    document.getElementById(
      "food-barcode-form"
    )?.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();

        const input = document.getElementById(
          "food-barcode-input"
        );

        const barcode = String(
          input?.value || ""
        )
          .replace(/\D/g, "")
          .trim();


        if (!barcode) {

          this.setBarcodeStatus(
            "Enter the numbers printed under the barcode."
          );

          return;
        }


        this.lookupBarcode(barcode);

      }
    );


    document.getElementById(
      "food-confirm-form"
    )?.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();
        this.confirmFood();

      }
    );
  },


  async openDialog(mealId) {

    const meal = this.meals.find(
      item => item.id === mealId
    );


    if (!meal) {
      return;
    }


    this.activeMeal = mealId;
    this.activeFood = null;
    this.searchResults = [];
    this.describedAmountG = null;


    const dialog = document.getElementById(
      "food-log-dialog"
    );


    if (!dialog) {
      return;
    }


    const mealLabel = document.getElementById(
      "food-log-meal-label"
    );


    if (mealLabel) {
      mealLabel.textContent = meal.label;
    }


    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }


    this.showHome();
    await this.renderRecents();
  },


  closeDialog() {

    const dialog = document.getElementById(
      "food-log-dialog"
    );


    this.barcodeSessionId += 1;
    this.stopScanner();


    if (!dialog) {
      return;
    }


    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  },


  showPanel(panelId) {

    [
      "food-entry-home",
      "food-search-panel",
      "food-barcode-panel",
      "food-confirm-panel"
    ].forEach((id) => {

      const panel = document.getElementById(id);


      if (panel) {
        panel.hidden = id !== panelId;
      }

    });


    const back = document.getElementById(
      "food-sheet-back"
    );


    if (back) {
      back.hidden = panelId === "food-entry-home";
    }
  },


  showHome() {

    this.barcodeSessionId += 1;
    this.stopScanner();
    this.showPanel("food-entry-home");


    const input = document.getElementById(
      "food-search-input"
    );


    if (input) {
      input.value = "";
    }


    this.renderRecents();
  },


  async renderRecents() {

    const container = document.getElementById(
      "food-recent-list"
    );


    if (!container) {
      return;
    }


    container.innerHTML = `
      <p class="food-sheet__loading">Loading your recent foods…</p>
    `;


    try {

      this.recentFoods =
        await GlowApp.FoodLibrary.getRecents(8);


      if (!this.recentFoods.length) {

        container.innerHTML = `
          <p class="food-sheet__empty">
            Foods you add will appear here for one-tap reuse.
          </p>
        `;

        return;
      }


      container.innerHTML = this.recentFoods
        .map((food, index) => `
          <button
            class="food-result food-result--recent"
            type="button"
            data-recent-food-index="${index}"
          >
            <span class="food-result__main">
              <strong>${this.escapeHTML(food.name)}</strong>
              <small>
                ${food.brand ? `${this.escapeHTML(food.brand)} · ` : ""}
                last ${this.formatAmount(food.lastAmount || 100)}
              </small>
            </span>

            <span class="food-result__macro">
              ${this.calculateCalories(food, food.lastAmount || 100)} kcal
            </span>
          </button>
        `)
        .join("");

    } catch (error) {

      container.innerHTML = `
        <p class="food-sheet__empty">
          Recent foods could not be loaded on this device.
        </p>
      `;
    }
  },


  /* ======================================================
     SEARCH
  ======================================================= */

  async searchFood(rawQuery) {

    const parsed = this.parseDescribedFood(rawQuery);


    if (!parsed.query) {

      const status = document.getElementById(
        "food-search-status"
      );


      if (status) {
        status.textContent = "Describe or search for a food first.";
      }

      return;
    }


    this.describedAmountG = parsed.amountG;
    this.showPanel("food-search-panel");


    const status = document.getElementById(
      "food-search-status"
    );

    const resultsContainer = document.getElementById(
      "food-search-results"
    );


    if (status) {

      status.textContent = parsed.amountG
        ? `Searching “${parsed.query}” · using ${parsed.amountG}g as the starting amount.`
        : `Searching “${parsed.query}”…`;
    }


    if (resultsContainer) {
      resultsContainer.innerHTML = "";
    }


    let localFoods = [];
    let remoteFoods = [];
    let remoteError = null;


    try {
      localFoods = await GlowApp.FoodLibrary.search(parsed.query, 6);
    } catch (error) {
      localFoods = [];
    }


    try {
      remoteFoods = await this.searchOpenFoodFacts(parsed.query);
    } catch (error) {
      remoteError = error;
    }


    const taggedLocalFoods = localFoods.map(
      food => ({
        ...food,
        resultSourceLabel: "Your foods"
      })
    );


    const seen = new Set(
      taggedLocalFoods.map(food => food.id)
    );


    const uniqueRemote = remoteFoods
      .filter(food => !seen.has(food.id))
      .map(food => ({
        ...food,
        resultSourceLabel: "Open Food Facts"
      }));


    this.searchResults = [
      ...taggedLocalFoods,
      ...uniqueRemote
    ];


    if (!this.searchResults.length) {

      if (status) {

        status.textContent = remoteError
          ? "No local match. Online search is unavailable right now — you can still add it manually."
          : "Nothing reliable found. Add it manually instead.";
      }


      if (resultsContainer) {

        resultsContainer.innerHTML = `
          <button
            class="secondary-button food-search-manual-fallback"
            type="button"
            id="food-search-manual-fallback"
          >
            Add manually
          </button>
        `;


        document.getElementById(
          "food-search-manual-fallback"
        )?.addEventListener(
          "click",
          () => this.openConfirm(
            {
              id: null,
              name: parsed.query,
              brand: "",
              source: "manual",
              barcode: "",
              per100: {
                calories: null,
                protein: null,
                fibre: null
              }
            },
            parsed.amountG || 100
          ),
          {
            once: true
          }
        );
      }


      return;
    }


    if (status) {

      const onlineCopy = remoteError
        ? "Online results unavailable; showing foods saved on this device."
        : "Your foods are ranked first, followed by database matches.";

      status.textContent = onlineCopy;
    }


    if (resultsContainer) {

      resultsContainer.innerHTML = this.searchResults
        .map((food, index) => {

          const calories = food.per100?.calories;
          const protein = food.per100?.protein;


          return `
            <button
              class="food-result"
              type="button"
              data-food-result-index="${index}"
            >
              <span class="food-result__main">
                <strong>${this.escapeHTML(food.name || "Unnamed food")}</strong>
                <small>
                  ${food.brand ? `${this.escapeHTML(food.brand)} · ` : ""}
                  ${this.escapeHTML(food.resultSourceLabel || "Food")}
                </small>
              </span>

              <span class="food-result__macro">
                ${calories === null || calories === undefined ? "—" : `${this.formatNumber(calories, 0)} kcal`}
                <small>/ 100g</small>
                ${protein === null || protein === undefined ? "" : `<small>${this.formatNumber(protein, 1)}g protein</small>`}
              </span>
            </button>
          `;

        })
        .join("");
    }
  },


  parseDescribedFood(rawQuery) {

    const value = String(rawQuery || "").trim();


    if (!value) {
      return {
        query: "",
        amountG: null
      };
    }


    const amountMatch = value.match(
      /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:g|grams?)\b/i
    );


    const amountG = amountMatch
      ? Number(
          amountMatch[1].replace(",", ".")
        )
      : null;


    const query = amountMatch
      ? value
          .replace(amountMatch[0], " ")
          .replace(/\s+/g, " ")
          .trim()
      : value;


    return {
      query,
      amountG:
        Number.isFinite(amountG) && amountG > 0
          ? amountG
          : null
    };
  },


  async searchOpenFoodFacts(query) {

    /*
      Open Food Facts' current v2/v3 product APIs do not offer
      general full-text search. Their documented legacy v1 search
      endpoint still does, so this adapter is intentionally isolated
      here and can be swapped for Search-a-licious later.
    */

    const params = new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "12",
      fields:
        "code,product_name,brands,nutriments,serving_size,quantity,image_front_small_url"
    });


    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );


    if (!response.ok) {
      throw new Error(
        `Food search failed (${response.status}).`
      );
    }


    const data = await response.json();


    return (Array.isArray(data.products) ? data.products : [])
      .map(product => this.normalizeOpenFoodFactsProduct(product))
      .filter(food => food && food.name)
      .slice(0, 12);
  },


  /* ======================================================
     BARCODE
  ======================================================= */

  async openBarcodePanel() {

    this.showPanel("food-barcode-panel");

    const sessionId = ++this.barcodeSessionId;


    const input = document.getElementById(
      "food-barcode-input"
    );


    if (input) {
      input.value = "";
    }


    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia
    ) {

      this.setBarcodeStatus(
        "Camera access needs HTTPS and a supported browser. You can type the barcode below."
      );

      return;
    }


    this.setBarcodeStatus(
      "Preparing camera…"
    );


    try {

      await this.ensureScannerLibrary();


      if (sessionId !== this.barcodeSessionId) {
        return;
      }


      await this.startScanner();

    } catch (error) {

      console.warn(
        "Ten Day Run: barcode camera could not start.",
        error
      );


      if (sessionId !== this.barcodeSessionId) {
        return;
      }


      const message =
        error?.name === "NotAllowedError" ||
        error?.name === "SecurityError"
          ? "Camera permission is blocked. Allow camera access for this site, then try Scan barcode again."
          : error?.name === "NotFoundError"
            ? "No camera was found on this device. You can type the barcode below."
            : error?.name === "NotReadableError"
              ? "The camera is busy in another app. Close it there and try again."
              : "Camera could not start. You can still type the barcode below.";


      this.setBarcodeStatus(message);
    }
  },


  ensureScannerLibrary() {

    if (
      window.ZXingBrowser?.BrowserMultiFormatReader
    ) {
      return Promise.resolve(window.ZXingBrowser);
    }


    if (this.scannerLibraryPromise) {
      return this.scannerLibraryPromise;
    }


    const sources = [
      "https://cdn.jsdelivr.net/npm/@zxing/browser@0.2.1/umd/zxing-browser.min.js",
      "https://unpkg.com/@zxing/browser@0.2.1/umd/zxing-browser.min.js"
    ];


    this.scannerLibraryPromise = this.loadExternalScript(
      sources,
      () => Boolean(
        window.ZXingBrowser?.BrowserMultiFormatReader
      )
    ).then(() => window.ZXingBrowser);


    return this.scannerLibraryPromise;
  },


  loadExternalScript(sources, readyCheck) {

    return new Promise((resolve, reject) => {

      let sourceIndex = 0;


      const tryNext = () => {

        if (readyCheck()) {
          resolve();
          return;
        }


        if (sourceIndex >= sources.length) {
          reject(
            new Error("Barcode scanner library could not be downloaded.")
          );
          return;
        }


        const source = sources[sourceIndex];
        sourceIndex += 1;

        const script = document.createElement("script");

        script.src = source;
        script.async = true;
        script.crossOrigin = "anonymous";


        script.addEventListener(
          "load",
          () => {

            if (readyCheck()) {
              resolve();
            } else {
              script.remove();
              tryNext();
            }

          },
          { once: true }
        );


        script.addEventListener(
          "error",
          () => {
            script.remove();
            tryNext();
          },
          { once: true }
        );


        document.head.appendChild(script);
      };


      tryNext();
    });
  },


  async startScanner() {

    await this.stopScanner();


    const reader = document.getElementById(
      "food-barcode-reader"
    );


    if (
      !reader ||
      !window.ZXingBrowser?.BrowserMultiFormatReader
    ) {
      throw new Error("Barcode reader is unavailable.");
    }


    reader.innerHTML = `
      <video
        class="food-barcode-video"
        id="food-barcode-video"
        playsinline
        muted
        autoplay
        aria-label="Live camera preview for barcode scanning"
      ></video>

      <div class="food-barcode-guide" aria-hidden="true">
        <span></span>
      </div>
    `;


    const video = document.getElementById(
      "food-barcode-video"
    );


    if (!video) {
      throw new Error("Camera preview could not be created.");
    }


    this.scanner = new window.ZXingBrowser.BrowserMultiFormatReader(
      undefined,
      {
        delayBetweenScanAttempts: 80,
        delayBetweenScanSuccess: 500
      }
    );

    this.scannerLocked = false;


    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };


    this.scannerControls = await this.scanner.decodeFromConstraints(
      constraints,
      video,
      async (result) => {

        if (
          !result ||
          this.scannerLocked
        ) {
          return;
        }


        const rawText =
          typeof result.getText === "function"
            ? result.getText()
            : result.text || String(result || "");

        const barcode = String(rawText || "")
          .replace(/\D/g, "");


        if (
          barcode.length < 8 ||
          barcode.length > 14
        ) {
          return;
        }


        this.scannerLocked = true;

        this.setBarcodeStatus(
          `Barcode ${barcode} detected. Looking up product…`
        );


        await this.stopScanner();
        await this.lookupBarcode(barcode);

      }
    );


    this.scannerRunning = true;


    this.setBarcodeStatus(
      "Camera ready. Hold the barcode inside the frame."
    );
  },


  async stopScanner() {

    const controls = this.scannerControls;


    this.scannerControls = null;
    this.scannerRunning = false;
    this.scannerLocked = false;


    try {
      controls?.stop?.();
    } catch (error) {
      /* The stream may already be stopped. */
    }


    const video = document.getElementById(
      "food-barcode-video"
    );


    try {

      const stream = video?.srcObject;


      if (stream?.getTracks) {
        stream.getTracks().forEach(track => track.stop());
      }


      if (video) {
        video.srcObject = null;
      }

    } catch (error) {
      /* No action needed. */
    }


    this.scanner = null;
  },


  async lookupBarcode(barcode) {

    this.setBarcodeStatus(
      `Looking up ${barcode}…`
    );


    try {

      const fields = [
        "code",
        "product_name",
        "brands",
        "nutriments",
        "serving_size",
        "quantity",
        "image_front_small_url"
      ].join(",");


      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );


      if (!response.ok) {
        throw new Error(
          `Barcode lookup failed (${response.status}).`
        );
      }


      const data = await response.json();


      if (
        Number(data.status) !== 1 ||
        !data.product
      ) {

        this.setBarcodeStatus(
          "Product not found. Add the nutrition manually and it will be remembered for next time."
        );


        this.openConfirm(
          {
            id: `barcode:${barcode}`,
            name: "",
            brand: "",
            source: "barcode-manual",
            barcode,
            per100: {
              calories: null,
              protein: null,
              fibre: null
            }
          },
          100
        );

        return;
      }


      const food = this.normalizeOpenFoodFactsProduct(
        data.product,
        barcode
      );


      this.openConfirm(
        food,
        food.defaultAmount || 100
      );

    } catch (error) {

      console.warn(
        "Ten Day Run: barcode lookup failed.",
        error
      );


      this.setBarcodeStatus(
        "Online lookup failed. You can enter the barcode product manually."
      );
    }
  },


  setBarcodeStatus(message) {

    const status = document.getElementById(
      "food-barcode-status"
    );


    if (status) {
      status.textContent = message;
    }
  },


  /* ======================================================
     CONFIRM / ADD FOOD
  ======================================================= */

  openConfirm(food, amountG = 100) {

    this.stopScanner();
    this.showPanel("food-confirm-panel");


    this.activeFood = {
      ...food,
      per100: {
        calories:
          this.toNullableNumber(food?.per100?.calories),
        protein:
          this.toNullableNumber(food?.per100?.protein),
        fibre:
          this.toNullableNumber(food?.per100?.fibre)
      }
    };


    this.setInput(
      "food-confirm-name",
      food?.name || ""
    );

    this.setInput(
      "food-confirm-brand",
      food?.brand || ""
    );

    this.setInput(
      "food-confirm-amount",
      Number(amountG) > 0
        ? this.round(Number(amountG), 1)
        : 100
    );

    this.setInput(
      "food-confirm-calories",
      food?.per100?.calories ?? ""
    );

    this.setInput(
      "food-confirm-protein",
      food?.per100?.protein ?? ""
    );

    this.setInput(
      "food-confirm-fibre",
      food?.per100?.fibre ?? ""
    );


    const source = document.getElementById(
      "food-confirm-source"
    );


    if (source) {

      source.textContent = this.getSourceCopy(food);
    }


    const error = document.getElementById(
      "food-confirm-error"
    );


    if (error) {
      error.hidden = true;
      error.textContent = "";
    }


    this.updateConfirmPreview();


    [
      "food-confirm-amount",
      "food-confirm-calories",
      "food-confirm-protein",
      "food-confirm-fibre"
    ].forEach((id) => {

      const input = document.getElementById(id);


      if (input && !input.dataset.previewBound) {

        input.addEventListener(
          "input",
          () => this.updateConfirmPreview()
        );

        input.dataset.previewBound = "true";
      }

    });


    setTimeout(
      () => document.getElementById(
        "food-confirm-name"
      )?.focus(),
      0
    );
  },


  updateConfirmPreview() {

    const preview = document.getElementById(
      "food-confirm-preview"
    );


    if (!preview) {
      return;
    }


    const amount = this.readNumber(
      "food-confirm-amount"
    );

    const caloriesPer100 = this.readNumber(
      "food-confirm-calories"
    );

    const proteinPer100 = this.readNumber(
      "food-confirm-protein"
    );

    const fibrePer100 = this.readNumber(
      "food-confirm-fibre"
    );


    if (
      amount === null ||
      amount <= 0 ||
      caloriesPer100 === null ||
      proteinPer100 === null ||
      fibrePer100 === null
    ) {

      preview.textContent =
        "Complete the nutrition values to calculate this portion.";

      return;
    }


    preview.innerHTML = `
      <strong>${this.formatNumber(caloriesPer100 * amount / 100, 0)} kcal</strong>
      <span>${this.formatNumber(proteinPer100 * amount / 100, 1)}g protein</span>
      <span>${this.formatNumber(fibrePer100 * amount / 100, 1)}g fibre</span>
    `;
  },


  async confirmFood() {

    const name = String(
      document.getElementById(
        "food-confirm-name"
      )?.value || ""
    ).trim();

    const brand = String(
      document.getElementById(
        "food-confirm-brand"
      )?.value || ""
    ).trim();

    const amountG = this.readNumber(
      "food-confirm-amount"
    );

    const caloriesPer100 = this.readNumber(
      "food-confirm-calories"
    );

    const proteinPer100 = this.readNumber(
      "food-confirm-protein"
    );

    const fibrePer100 = this.readNumber(
      "food-confirm-fibre"
    );


    const error = document.getElementById(
      "food-confirm-error"
    );


    if (
      !name ||
      amountG === null ||
      amountG <= 0 ||
      caloriesPer100 === null ||
      caloriesPer100 < 0 ||
      proteinPer100 === null ||
      proteinPer100 < 0 ||
      fibrePer100 === null ||
      fibrePer100 < 0
    ) {

      if (error) {

        error.hidden = false;
        error.textContent =
          "Add a name, amount, calories, protein and fibre. Use 0 when a nutrient is genuinely zero.";
      }

      return;
    }


    if (!this.activeMeal) {
      return;
    }


    const sourceFood = this.activeFood || {};

    const libraryFood = {
      id:
        sourceFood.id ||
        GlowApp.createId("food"),

      name,
      brand,

      source:
        sourceFood.source ||
        "manual",

      barcode:
        sourceFood.barcode || "",

      per100: {
        calories: caloriesPer100,
        protein: proteinPer100,
        fibre: fibrePer100
      }
    };


    const mealItem = {
      id: GlowApp.createId("meal-food"),

      libraryId:
        libraryFood.id,

      name,
      brand,

      source:
        libraryFood.source,

      barcode:
        libraryFood.barcode,

      amountG:
        this.round(amountG, 1),

      per100: {
        calories: caloriesPer100,
        protein: proteinPer100,
        fibre: fibrePer100
      },

      calories:
        this.round(
          caloriesPer100 * amountG / 100,
          1
        ),

      protein:
        this.round(
          proteinPer100 * amountG / 100,
          1
        ),

      fibre:
        this.round(
          fibrePer100 * amountG / 100,
          1
        ),

      addedAt:
        new Date().toISOString()
    };


    GlowApp.State.updateSelectedDay(
      (day) => {

        this.ensureDayModel(day);

        day.foodLog[this.activeMeal]
          .push(mealItem);


        /*
          Logging food strongly implies the planned meal happened,
          but Food Rhythm remains a separate, overridable behaviour.
        */
        day.food[this.activeMeal] = true;

        this.syncNutrition(day);

      }
    );


    try {

      await GlowApp.FoodLibrary.rememberFood(
        libraryFood,
        amountG
      );

    } catch (libraryError) {

      console.warn(
        "Ten Day Run: food was logged but could not be added to the local food library.",
        libraryError
      );
    }


    this.closeDialog();
    this.refreshToday();
    this.showToast(`${name} added.`);
  },


  refreshToday() {

    const day = GlowApp.State.getSelectedDay();
    const settings = GlowApp.State.get().settings;


    if (!day) {
      return;
    }


    this.render(day);


    if (GlowApp.DayView) {

      GlowApp.DayView.renderFood(day);
      GlowApp.DayView.renderNutrition(day, settings);
      GlowApp.DayView.renderScoring(day, settings);
    }
  },


  /* ======================================================
     OPEN FOOD FACTS NORMALISATION
  ======================================================= */

  normalizeOpenFoodFactsProduct(product, fallbackBarcode = "") {

    if (!product) {
      return null;
    }


    const nutriments = product.nutriments || {};


    let calories = this.toNullableNumber(
      nutriments["energy-kcal_100g"]
    );


    if (calories === null) {

      const energyKj = this.toNullableNumber(
        nutriments["energy-kj_100g"]
      );


      if (energyKj !== null) {
        calories = this.round(energyKj / 4.184, 1);
      }
    }


    const protein = this.toNullableNumber(
      nutriments.proteins_100g
    );

    const fibre = this.toNullableNumber(
      nutriments.fiber_100g ??
      nutriments.fibre_100g ??
      nutriments.fibers_100g
    );


    const barcode = String(
      product.code || fallbackBarcode || ""
    ).trim();


    return {
      id:
        barcode
          ? `off:${barcode}`
          : GlowApp.createId("off-food"),

      name:
        product.product_name ||
        product.generic_name ||
        "Unnamed product",

      brand:
        product.brands || "",

      source:
        "openfoodfacts",

      barcode,

      defaultAmount:
        this.parseGramAmount(
          product.serving_size
        ) ||
        100,

      per100: {
        calories,
        protein,
        fibre
      }
    };
  },


  parseGramAmount(value) {

    if (!value) {
      return null;
    }


    const match = String(value).match(
      /(\d+(?:[.,]\d+)?)\s*g\b/i
    );


    if (!match) {
      return null;
    }


    const amount = Number(
      match[1].replace(",", ".")
    );


    return Number.isFinite(amount) && amount > 0
      ? amount
      : null;
  },


  getSourceCopy(food) {

    if (food?.source === "openfoodfacts") {
      return "Product data from Open Food Facts. Check the package if anything looks wrong.";
    }


    if (food?.source === "barcode-manual") {
      return "Barcode not found. Enter the package nutrition once and this product will be remembered locally.";
    }


    if (food?.timesUsed) {
      return `Saved on this device · used ${food.timesUsed} ${food.timesUsed === 1 ? "time" : "times"}.`;
    }


    return "Manual food. Values are stored on this device for faster logging next time.";
  },


  /* ======================================================
     HELPERS
  ======================================================= */

  calculateCalories(food, amountG) {

    const calories = this.toNullableNumber(
      food?.per100?.calories
    );


    if (calories === null) {
      return "—";
    }


    return this.formatNumber(
      calories * Number(amountG || 100) / 100,
      0
    );
  },


  setInput(id, value) {

    const input = document.getElementById(id);


    if (input) {
      input.value = value ?? "";
    }
  },


  readNumber(id) {

    const value = document.getElementById(id)?.value;


    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return null;
    }


    const number = Number(value);


    return Number.isFinite(number)
      ? number
      : null;
  },


  toNullableNumber(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }


    const number = Number(value);


    return Number.isFinite(number)
      ? number
      : null;
  },


  round(value, decimals = 1) {

    const multiplier = 10 ** decimals;


    return Math.round(
      Number(value) * multiplier
    ) / multiplier;
  },


  formatNumber(value, decimals = 1) {

    const number = Number(value);


    if (!Number.isFinite(number)) {
      return "—";
    }


    return number.toLocaleString(
      undefined,
      {
        maximumFractionDigits: decimals
      }
    );
  },


  formatAmount(amount) {

    const number = Number(amount);


    return Number.isFinite(number)
      ? `${this.formatNumber(number, 1)}g`
      : "—";
  },


  showToast(message) {

    const toast = document.getElementById(
      "app-toast"
    );


    if (!toast) {
      return;
    }


    toast.textContent = message;
    toast.hidden = false;


    clearTimeout(this.toastTimer);


    this.toastTimer = setTimeout(
      () => {
        toast.hidden = true;
      },
      1800
    );
  },


  escapeHTML(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },


  escapeAttribute(value) {
    return this.escapeHTML(value);
  }

};
