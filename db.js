/**
 * db.js — Thin IndexedDB wrapper for ListR
 *
 * Stores: frequentLists, frequentItems, weeklyLists, weeklyItems
 */

const DB_NAME = 'listr-db';
const DB_VERSION = 1;

const DB_STORES = {
  frequentLists: { keyPath: 'id' },
  frequentItems: { keyPath: 'id', indexes: [{ name: 'listId', keyPath: 'listId' }] },
  weeklyLists:   { keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status' }] },
  weeklyItems:   { keyPath: 'id', indexes: [{ name: 'listId', keyPath: 'listId' }] },
};

const DB = (() => {
  let _db = null;

  /** Open (or reuse) the database connection */
  function open() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        for (const [storeName, config] of Object.entries(DB_STORES)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
            if (config.indexes) {
              for (const idx of config.indexes) {
                store.createIndex(idx.name, idx.keyPath, { unique: false });
              }
            }
          }
        }
      };

      request.onsuccess = (event) => {
        _db = event.target.result;
        resolve(_db);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /** Run a transaction and return a promise */
  function tx(storeNames, mode, callback) {
    return open().then((db) => {
      return new Promise((resolve, reject) => {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        const transaction = db.transaction(names, mode);
        transaction.onerror = (e) => reject(e.target.error);

        const stores = {};
        for (const name of names) stores[name] = transaction.objectStore(name);

        const result = callback(names.length === 1 ? stores[names[0]] : stores, transaction);

        if (result instanceof IDBRequest) {
          result.onsuccess = (e) => resolve(e.target.result);
          result.onerror   = (e) => reject(e.target.error);
        } else if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          transaction.oncomplete = () => resolve(result);
        }
      });
    });
  }

  /** Wrap an IDBRequest in a promise */
  function req(idbRequest) {
    return new Promise((resolve, reject) => {
      idbRequest.onsuccess = (e) => resolve(e.target.result);
      idbRequest.onerror   = (e) => reject(e.target.error);
    });
  }

  /** Get all records from a store */
  function getAll(storeName) {
    return tx(storeName, 'readonly', (store) => store.getAll());
  }

  /** Get a single record by id */
  function get(storeName, id) {
    return tx(storeName, 'readonly', (store) => store.get(id));
  }

  /** Get all records matching an index value */
  function getAllByIndex(storeName, indexName, value) {
    return tx(storeName, 'readonly', (store) => {
      return store.index(indexName).getAll(value);
    });
  }

  /** Put (insert or update) a record */
  function put(storeName, record) {
    return tx(storeName, 'readwrite', (store) => store.put(record));
  }

  /** Put multiple records in one transaction */
  function putMany(storeName, records) {
    return tx(storeName, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        let count = 0;
        if (records.length === 0) { resolve(); return; }
        for (const record of records) {
          const r = store.put(record);
          r.onsuccess = () => { if (++count === records.length) resolve(); };
          r.onerror   = (e) => reject(e.target.error);
        }
      });
    });
  }

  /** Delete a record by id */
  function remove(storeName, id) {
    return tx(storeName, 'readwrite', (store) => store.delete(id));
  }

  /** Delete all records matching an index value */
  function removeAllByIndex(storeName, indexName, value) {
    return tx(storeName, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const idx = store.index(indexName);
        const cursorReq = idx.openCursor(IDBKeyRange.only(value));
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursorReq.onerror = (e) => reject(e.target.error);
      });
    });
  }

  /** Clear all records from a store */
  function clear(storeName) {
    return tx(storeName, 'readwrite', (store) => store.clear());
  }

  /** Clear all data from every store */
  function clearAll() {
    return Promise.all(Object.keys(DB_STORES).map(clear));
  }

  /** Generate a UUID v4 */
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  return {
    open,
    getAll,
    get,
    getAllByIndex,
    put,
    putMany,
    remove,
    removeAllByIndex,
    clear,
    clearAll,
    uuid,
  };
})();
