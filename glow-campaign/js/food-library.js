/* =========================================================
   TEN DAY RUN — LOCAL FOOD LIBRARY

   IndexedDB stores foods the user has already eaten so food
   logging becomes faster over time. A tiny localStorage fallback
   keeps the feature usable if IndexedDB is unavailable.
========================================================= */

window.GlowApp = window.GlowApp || {};

GlowApp.FoodLibrary = {

  DB_NAME: "tenDayRunFoodLibrary",
  DB_VERSION: 1,
  STORE_NAME: "foods",
  FALLBACK_KEY: "tenDayRunFoodLibraryFallback",

  db: null,
  readyPromise: null,
  useFallback: false,


  init() {

    if (this.readyPromise) {
      return this.readyPromise;
    }


    this.readyPromise = this.openDatabase()
      .catch((error) => {

        console.warn(
          "Ten Day Run: IndexedDB unavailable; using localStorage food fallback.",
          error
        );

        this.useFallback = true;
        return null;

      });


    return this.readyPromise;
  },


  openDatabase() {

    if (!("indexedDB" in window)) {
      return Promise.reject(
        new Error("IndexedDB is not supported in this browser.")
      );
    }


    return new Promise((resolve, reject) => {

      const request = indexedDB.open(
        this.DB_NAME,
        this.DB_VERSION
      );


      request.onupgradeneeded = () => {

        const database = request.result;


        if (!database.objectStoreNames.contains(this.STORE_NAME)) {

          const store = database.createObjectStore(
            this.STORE_NAME,
            {
              keyPath: "id"
            }
          );


          store.createIndex(
            "lastUsedAt",
            "lastUsedAt",
            {
              unique: false
            }
          );

          store.createIndex(
            "barcode",
            "barcode",
            {
              unique: false
            }
          );

        }

      };


      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };


      request.onerror = () => {
        reject(
          request.error ||
          new Error("Could not open food database.")
        );
      };

    });
  },


  async getAll() {

    await this.init();


    if (this.useFallback || !this.db) {
      return this.getFallbackFoods();
    }


    return new Promise((resolve, reject) => {

      const transaction = this.db.transaction(
        this.STORE_NAME,
        "readonly"
      );

      const store = transaction.objectStore(
        this.STORE_NAME
      );

      const request = store.getAll();


      request.onsuccess = () => {
        resolve(
          Array.isArray(request.result)
            ? request.result
            : []
        );
      };


      request.onerror = () => {
        reject(
          request.error ||
          new Error("Could not read food library.")
        );
      };

    });
  },


  async getRecents(limit = 8) {

    const foods = await this.getAll();


    return foods
      .slice()
      .sort((a, b) => {

        const timeDifference =
          new Date(b.lastUsedAt || 0).getTime() -
          new Date(a.lastUsedAt || 0).getTime();


        if (timeDifference !== 0) {
          return timeDifference;
        }


        return Number(b.timesUsed || 0) - Number(a.timesUsed || 0);

      })
      .slice(0, limit);
  },


  async search(query, limit = 8) {

    const cleanQuery = String(query || "")
      .trim()
      .toLowerCase();


    if (!cleanQuery) {
      return this.getRecents(limit);
    }


    const foods = await this.getAll();


    return foods
      .filter((food) => {

        const haystack = [
          food.name,
          food.brand,
          food.barcode
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


        return haystack.includes(cleanQuery);

      })
      .sort((a, b) => {

        const usageDifference =
          Number(b.timesUsed || 0) -
          Number(a.timesUsed || 0);


        if (usageDifference !== 0) {
          return usageDifference;
        }


        return (
          new Date(b.lastUsedAt || 0).getTime() -
          new Date(a.lastUsedAt || 0).getTime()
        );

      })
      .slice(0, limit);
  },


  async getById(id) {

    if (!id) {
      return null;
    }


    await this.init();


    if (this.useFallback || !this.db) {

      return (
        this.getFallbackFoods()
          .find(food => food.id === id) ||
        null
      );
    }


    return new Promise((resolve, reject) => {

      const transaction = this.db.transaction(
        this.STORE_NAME,
        "readonly"
      );

      const request = transaction
        .objectStore(this.STORE_NAME)
        .get(id);


      request.onsuccess = () => {
        resolve(request.result || null);
      };


      request.onerror = () => {
        reject(
          request.error ||
          new Error("Could not read food.")
        );
      };

    });
  },


  async rememberFood(food, amountG) {

    if (!food?.name) {
      return null;
    }


    const id =
      food.id ||
      GlowApp.createId("food");


    const existing =
      await this.getById(id);


    const storedFood = {
      id,

      name:
        String(food.name).trim(),

      brand:
        String(food.brand || "").trim(),

      source:
        food.source ||
        existing?.source ||
        "manual",

      barcode:
        food.barcode ||
        existing?.barcode ||
        "",

      per100: {
        calories:
          this.toNullableNumber(
            food.per100?.calories
          ),

        protein:
          this.toNullableNumber(
            food.per100?.protein
          ),

        fibre:
          this.toNullableNumber(
            food.per100?.fibre
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


    if (this.useFallback || !this.db) {

      const foods = this.getFallbackFoods();

      const index = foods.findIndex(
        item => item.id === food.id
      );


      if (index === -1) {
        foods.push(food);
      } else {
        foods[index] = food;
      }


      this.saveFallbackFoods(foods);
      return food;
    }


    return new Promise((resolve, reject) => {

      const transaction = this.db.transaction(
        this.STORE_NAME,
        "readwrite"
      );

      const request = transaction
        .objectStore(this.STORE_NAME)
        .put(food);


      request.onsuccess = () => {
        resolve(food);
      };


      request.onerror = () => {
        reject(
          request.error ||
          new Error("Could not save food.")
        );
      };

    });
  },


  async replaceAll(foods) {

    const safeFoods = Array.isArray(foods)
      ? foods.filter(food => food && food.id && food.name)
      : [];


    await this.init();


    if (this.useFallback || !this.db) {
      this.saveFallbackFoods(safeFoods);
      return true;
    }


    return new Promise((resolve, reject) => {

      const transaction = this.db.transaction(
        this.STORE_NAME,
        "readwrite"
      );

      const store = transaction.objectStore(
        this.STORE_NAME
      );


      store.clear();

      safeFoods.forEach(
        food => store.put(food)
      );


      transaction.oncomplete = () => {
        resolve(true);
      };


      transaction.onerror = () => {
        reject(
          transaction.error ||
          new Error("Could not replace food library.")
        );
      };

    });
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


  getFallbackFoods() {

    try {

      const raw = localStorage.getItem(
        this.FALLBACK_KEY
      );


      if (!raw) {
        return [];
      }


      const foods = JSON.parse(raw);


      return Array.isArray(foods)
        ? foods
        : [];

    } catch (error) {
      return [];
    }
  },


  saveFallbackFoods(foods) {

    try {

      localStorage.setItem(
        this.FALLBACK_KEY,
        JSON.stringify(foods)
      );

    } catch (error) {

      console.warn(
        "Ten Day Run: fallback food library could not be saved.",
        error
      );
    }
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
