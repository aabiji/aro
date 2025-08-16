import { Platform } from "react-native";
import { MMKV } from "react-native-mmkv";
import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore, persistReducer, Storage,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER
} from "redux-persist";

import { rootReducer } from "./state";

const isWeb = Platform.OS === "web";
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const storage = new MMKV();

const storageBackend: Storage = {
  setItem: async (key: string, value: string): Promise<boolean> => {
    if (isWeb && !isBrowser) return Promise.resolve(false);

    storage.set(key, value);
    return Promise.resolve(true);
  },

  getItem: async (key: string): Promise<string | null> => {
    if (isWeb && !isBrowser) return Promise.resolve(null);

    const value = storage.getString(key);
    return Promise.resolve(value ?? null);
  },

  removeItem: async (key: string): Promise<boolean> => {
    if (isWeb && !isBrowser) return Promise.resolve(false);

    storage.delete(key);
    return Promise.resolve(true);
  },
};

const persistConfig = { key: "root", storage: storageBackend };
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});
export const persistor = persistStore(store);
