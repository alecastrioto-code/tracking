/* =========================================================
   TEN DAY RUN — LOCAL FOOD LIBRARY

   MVP reliability pass:
   - localStorage is the canonical store
   - previous IndexedDB/fallback data is migrated when possible
   - recent + frequent foods are ranked locally
   - barcode/name duplicates are merged rather than multiplied

   The API stays asynchronous so import/export and food-log code
   do not need to care which persistence layer is underneath.
========================================================= */

window.GlowApp = window.GlowApp || {};

GlowApp.FoodLibrary = {

  STORAGE_KEY: "tenDayRunFoodLibraryV2",
  LEGACY_FALLBACK_KEY: "tenDayRunFoodLibraryFallback",
  LEGACY_DB_NAME: "tenDayRunFoodLibrary",
  LEGACY_STORE_NAME: "foods",
  MIGRATION_KEY: "tenDayRunFoodLibraryV2Migrated",

  initialized: false,
  readyPromise: null,


  init() {

    if (this.readyPromise) {
      return this.readyPromise;
    }


    this.readyPromise = this.migrateLegacyData()
      .catch((error) => {

        console.warn(
          "Ten Day Run: legacy food migration was skipped.",
          error
        );

      })
      .finally(() => {
        this.initialized = true;
      });


    return this.readyPromise;
  },


  async getAll() {

    await this.init();

    return this.getStoredFoods();
  },


  async getRecents(limit = 8) {

    const foods = await this.getAll();


    return foods
      .slice()
      .sort((a, b) => {

        const timeDifference =
          this.dateValue(b.lastUsedAt) -
          this.dateValue(a.lastUsedAt);


        if (timeDifference !== 0) {
          return timeDifference;
        }


        return Number(b.timesUsed || 0) - Number(a.timesUsed || 0);

      })
      .slice(0, limit);
  },


  async getFrequent(limit = 8) {

    const foods = await this.getAll();


    return foods
      .slice()
      .sort((a, b) => {

        const usageDifference =
          Number(b.timesUsed || 0) -
          Number(a.timesUsed || 0);


        if (usageDifference !== 0) {
          return usageDifference;
        }


        return this.dateValue(b.lastUsedAt) - this.dateValue(a.lastUsedAt);

      })
      .slice(0, limit);
  },


  async search(query, limit = 8) {

    const cleanQuery = this.normaliseText(query);


    if (!cleanQuery) {
      return this.getRecents(limit);
    }


    const foods = await this.getAll();


    return foods
      .map((food) => ({
        food,
        score: this.getSearchScore(food, cleanQuery)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => {

        if (b.score !== a.score) {
          return b.score - a.score;
        }


        const usageDifference =
          Number(b.food.timesUsed || 0) -
          Number(a.food.timesUsed || 0);


        if (usageDifference !== 0) {
          return usageDifference;
        }


        return this.dateValue(b.food.lastUsedAt) - this.dateValue(a.food.lastUsedAt);

      })
      .slice(0, limit)
      .map(item => item.food);
  },


  async getById(id) {

    if (!id) {
      return null;
    }


    const foods = await this.getAll();


    return (
      foods.find(food => food.id === id) ||
      null
    );
  },


  async rememberFood(food, amountG) {

    if (!food?.name) {
      return null;
    }


    const foods = await this.getAll();

    const existing = this.findExistingFood(
      foods,
      food
    );


    const id =
      existing?.id ||
      food.id ||
      GlowApp.createId("food");


    const storedFood = {
      id,

      name:
        String(food.name).trim(),

      brand:
        String(food.brand || existing?.brand || "").trim(),

      source:
        food.source ||
        existing?.source ||
        "manual",

      barcode:
        String(food.barcode || existing?.barcode || "").trim(),

      per100: {
        calories:
          this.toNullableNumber(
            food.per100?.calories ?? existing?.per100?.calories
          ),

        protein:
          this.toNullableNumber(
            food.per100?.protein ?? existing?.per100?.protein
          ),

        fibre:
          this.toNullableNumber(
            food.per100?.fibre ?? existing?.per100?.fibre
          )
      },

      lastAmount:
        Number(amountG) > 0
          ? Number(amountG)
          : Number(existing?.lastAmount || 100),

      timesUsed:
        Number(existing?.timesUsed || 0) + 1,

      lastUsedAt:
        new Date().toISOString()
    };


    await this.put(storedFood);


    return storedFood;
  },


  async put(food) {

    await this.init();


    if (!food?.id || !food?.name) {
      throw new Error("Food library item is incomplete.");
    }


    const foods = this.getStoredFoods();

    const duplicate = this.findExistingFood(
      foods,
      food
    );


    const index = foods.findIndex(
      item => item.id === (duplicate?.id || food.id)
    );


    const safeFood = {
      ...food,
      id: duplicate?.id || food.id
    };


    if (index === -1) {
      foods.push(safeFood);
    } else {
      foods[index] = safeFood;
    }


    this.saveStoredFoods(foods);

    return safeFood;
  },


  async replaceAll(foods) {

    const safeFoods = this.dedupeFoods(
      Array.isArray(foods)
        ? foods.filter(food => food && food.id && food.name)
        : []
    );


    this.saveStoredFoods(safeFoods);
    return true;
  },


  async exportAll() {

    try {
      return await this.getAll();
    } catch (error) {

      console.warn(
        "Ten Day Run: food library could not be exported.",
        error
      );

      return [];
    }
  },


  /* ======================================================
     STORAGE
  ======================================================= */

  getStoredFoods() {

    try {

      const raw = localStorage.getItem(
        this.STORAGE_KEY
      );


      if (!raw) {
        return [];
      }


      const foods = JSON.parse(raw);


      return Array.isArray(foods)
        ? foods
        : [];

    } catch (error) {

      console.warn(
        "Ten Day Run: saved foods could not be read.",
        error
      );

      return [];
    }
  },


  saveStoredFoods(foods) {

    try {

      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(foods)
      );

    } catch (error) {

      console.error(
        "Ten Day Run: saved foods could not be written.",
        error
      );

      throw error;
    }
  },


  /* ======================================================
     LEGACY MIGRATION
  ======================================================= */

  async migrateLegacyData() {

    try {

      if (
        localStorage.getItem(this.MIGRATION_KEY) === "1"
      ) {
        return;
      }

    } catch (error) {
      return;
    }


    const currentFoods = this.getStoredFoods();
    const legacyFoods = [];


    try {

      const raw = localStorage.getItem(
        this.LEGACY_FALLBACK_KEY
      );


      if (raw) {

        const parsed = JSON.parse(raw);


        if (Array.isArray(parsed)) {
          legacyFoods.push(...parsed);
        }
      }

    } catch (error) {
      /* Ignore malformed old fallback data. */
    }


    try {

      const indexedFoods = await this.readLegacyIndexedDB();


      if (Array.isArray(indexedFoods)) {
        legacyFoods.push(...indexedFoods);
      }

    } catch (error) {
      /* Legacy IndexedDB is best-effort only. */
    }


    if (legacyFoods.length) {

      const merged = this.dedupeFoods([
        ...currentFoods,
        ...legacyFoods
      ]);


      this.saveStoredFoods(merged);
    }


    try {
      localStorage.setItem(this.MIGRATION_KEY, "1");
    } catch (error) {
      /* No action needed. */
    }
  },


  readLegacyIndexedDB() {

    if (!("indexedDB" in window)) {
      return Promise.resolve([]);
    }


    return new Promise((resolve) => {

      let createdFreshDatabase = false;

      const request = indexedDB.open(
        this.LEGACY_DB_NAME,
        1
      );


      request.onupgradeneeded = () => {
        createdFreshDatabase = true;
      };


      request.onerror = () => {
        resolve([]);
      };


      request.onsuccess = () => {

        const database = request.result;


        if (
          createdFreshDatabase ||
          !database.objectStoreNames.contains(this.LEGACY_STORE_NAME)
        ) {

          database.close();


          if (createdFreshDatabase) {
            indexedDB.deleteDatabase(this.LEGACY_DB_NAME);
          }


          resolve([]);
          return;
        }


        try {

          const transaction = database.transaction(
            this.LEGACY_STORE_NAME,
            "readonly"
          );

          const store = transaction.objectStore(
            this.LEGACY_STORE_NAME
          );

          const getAllRequest = store.getAll();


          getAllRequest.onsuccess = () => {
            database.close();
            resolve(
              Array.isArray(getAllRequest.result)
                ? getAllRequest.result
                : []
            );
          };


          getAllRequest.onerror = () => {
            database.close();
            resolve([]);
          };

        } catch (error) {
          database.close();
          resolve([]);
        }
      };

    });
  },


  /* ======================================================
     MATCHING / DEDUPE
  ======================================================= */

  findExistingFood(foods, candidate) {

    const barcode = String(candidate?.barcode || "").trim();


    if (barcode) {

      const barcodeMatch = foods.find(
        food => String(food.barcode || "").trim() === barcode
      );


      if (barcodeMatch) {
        return barcodeMatch;
      }
    }


    if (candidate?.id) {

      const idMatch = foods.find(
        food => food.id === candidate.id
      );


      if (idMatch) {
        return idMatch;
      }
    }


    const name = this.normaliseText(candidate?.name);
    const brand = this.normaliseText(candidate?.brand);


    if (!name) {
      return null;
    }


    return foods.find((food) => {

      return (
        this.normaliseText(food.name) === name &&
        this.normaliseText(food.brand) === brand
      );

    }) || null;
  },


  dedupeFoods(foods) {

    const result = [];


    foods.forEach((food) => {

      if (!food?.name) {
        return;
      }


      const candidate = {
        ...food,
        id:
          food.id ||
          GlowApp.createId("food")
      };


      const existing = this.findExistingFood(
        result,
        candidate
      );


      if (!existing) {
        result.push(candidate);
        return;
      }


      const existingIndex = result.findIndex(
        item => item.id === existing.id
      );


      const candidateIsNewer =
        this.dateValue(candidate.lastUsedAt) >=
        this.dateValue(existing.lastUsedAt);


      const merged = {
        ...(candidateIsNewer ? existing : candidate),
        ...(candidateIsNewer ? candidate : existing),
        id: existing.id,
        timesUsed: Math.max(
          Number(existing.timesUsed || 0),
          Number(candidate.timesUsed || 0)
        ),
        lastUsedAt:
          candidateIsNewer
            ? candidate.lastUsedAt
            : existing.lastUsedAt
      };


      result[existingIndex] = merged;
    });


    return result;
  },


  getSearchScore(food, cleanQuery) {

    const name = this.normaliseText(food.name);
    const brand = this.normaliseText(food.brand);
    const barcode = this.normaliseText(food.barcode);


    if (barcode && barcode === cleanQuery) {
      return 120;
    }


    if (name === cleanQuery) {
      return 100;
    }


    if (name.startsWith(cleanQuery)) {
      return 80;
    }


    if (name.includes(cleanQuery)) {
      return 65;
    }


    if (brand.startsWith(cleanQuery)) {
      return 45;
    }


    if (brand.includes(cleanQuery)) {
      return 35;
    }


    const queryTokens = cleanQuery
      .split(/\s+/)
      .filter(Boolean);

    const haystack = `${name} ${brand}`;


    if (
      queryTokens.length &&
      queryTokens.every(token => haystack.includes(token))
    ) {
      return 50;
    }


    return 0;
  },


  normaliseText(value) {

    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  },


  dateValue(value) {

    const time = new Date(value || 0).getTime();

    return Number.isFinite(time)
      ? time
      : 0;
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
  }

};
