import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import { MMKV } from "react-native-mmkv";

import { rootReducer } from "./state";

const storage = new MMKV();

const storageBackend = {
  setItem: async (key: string, value: string): Promise<boolean> => {
    storage.set(key, value);
    return Promise.resolve(true);
  },

  getItem: async (key: string): Promise<string | null> => {
    const value = storage.getString(key);
    return Promise.resolve(value ?? null);
  },

  removeItem: async (key: string): Promise<boolean> => {
    storage.delete(key);
    return Promise.resolve(true);
  },
};

const persistConfig = { key: "root", storage: storageBackend };
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({ reducer: { workouts: persistedReducer } });
export const persistor = persistStore(store);
