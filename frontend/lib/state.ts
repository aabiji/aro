import Constants from "expo-constants";
import { MMKV } from "react-native-mmkv";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { create, StateCreator } from "zustand";

export enum ExerciseType { Resistance, Cardio };

export interface ExerciseInfo {
  id?: number;
  exerciseType: ExerciseType;
  name: string;
  weight: number;
  reps: number[];
  duration: number;
  distance: number;
}

export interface WorkoutInfo {
  id: number;
  isTemplate: boolean;
  exercises: ExerciseInfo[];
  tag: string;
}

interface PaginatedData<T> {
  page: number;
  more: boolean;
  values: Record<string, T>;
}

type DataKey = "workouts" | "templates" | "periodDays" | "weightEntries";
const keys = ["workouts", "templates", "periodDays", "weightEntries"];

type Data = {
  [K in DataKey]: PaginatedData<
    K extends "workouts" | "templates"
    ? WorkoutInfo
    : K extends "periodDays" ? boolean : number>
}

export interface AppState {
  jwt: string;
  useImperial: boolean;
  lastUpdateTime: number;
  data: Data;

  updateUserData: (jwt: string, json: any) => void;
  paginate: (dataType: DataKey, more: boolean) => void;

  upsertWorkout: (w: WorkoutInfo) => void;
  removeWorkout: (id: number) => void;

  addExercise: (workoutId: number, exercise: ExerciseInfo) => void;
  updateExercise: (workoutId: number, exerciseIndex: number, exercise: ExerciseInfo) => void;
  removeExercise: (workoutId: number, exerciseIndex: number) => void;

  togglePeriodDay: (day: string) => void;
  updateSettings: (userData: object) => void;
}

function updateExercises(state: AppState, workoutId: number,
  exercises: ExerciseInfo[]): Partial<AppState> {
  const key = workoutId in state.data.workouts.values ? "workouts" : "templates";
  return {
    data: {
      ...state.data,
      [key]: {
        ...state.data[key],
        values: {
          ...state.data[key].values,
          [workoutId]: { ...state.data[key].values[workoutId], exercises }
        }
      }
    }
  };
}

// remember, set() *merges* state
const createAppStore: StateCreator<AppState> = (set, _get) => ({
  jwt: "",
  useImperial: true,
  lastUpdateTime: 0,
  data: Object.fromEntries(keys.map(k =>
    [k, { page: 1, more: false, values: {} }])) as Data,

  updateSettings: (userData) =>
    set((state: AppState) => ({ ...state, ...userData })),

  updateUserData: (jwt, json) =>
    set((state: AppState) => {
      let data = structuredClone(state.data);

      for (const w of json.user.workouts) {
        if (w.deleted) {
          if (w.isTemplate) delete data.templates.values[w.id];
          else delete data.workouts.values[w.id];
        } else {
          if (w.isTemplate) data.templates.values[w.id] = w;
          else data.workouts.values[w.id] = w;
        }
     }

      for (const pd of json.user.periodDays) {
        if (pd.deleted) delete data.periodDays.values[pd.date];
        else data.periodDays.values[pd.date] = true;
      }

      for (const w of json.user.weightEntries) {
        if (w.deleted) delete data.weightEntries.values[w.date];
        data.weightEntries.values[w.date] = w.value;
      }

      return {
        jwt, ressources: data, lastUpdateTime: Date.now(),
        useImperial: json.user.settings.useImperial,
      };
    }),

  paginate: (dataType, more) =>
    set((state: AppState) => ({
      data: {
        ...state.data,
        [dataType]: {
          ...state.data[dataType],
          page: state.data[dataType].page + 1,
          more,
        }
      }
    })),

  upsertWorkout: (w) =>
    set((state: AppState) => {
      const key = w.isTemplate ? "templates" : "workouts";
      return {
        data: {
          ...state.data,
          [key]: {
            ...state.data[key],
            values: {
              ...state.data[key].values,
              [w.id]: { ...state.data[key].values[w.id], ...w }
            },
          }
        },
    }}),

  removeWorkout: (id) =>
    set((state: AppState) => {
      const key = id in state.data.workouts.values ? "workouts" : "templates";
      let values = { ...state.data[key].values };
      delete values[id];
      return {
        data: {
          ...state.data,
          [key]: { ...state.data[key], values }
        }
      };
    }),

  addExercise: (workoutId, exercise) =>
    set((state: AppState) => {
      const key = workoutId in state.data.workouts.values ? "workouts" : "templates";
      const exercises = [...state.data[key].values[workoutId].exercises, exercise];
      return updateExercises(state, workoutId, exercises);
    }),

  updateExercise: (workoutId, exerciseIndex, exercise) =>
    set((state: AppState) => {
      const key = workoutId in state.data.workouts.values ? "workouts" : "templates";
      let exercises = [...state.data[key].values[workoutId].exercises];
      Object.assign(exercises[exerciseIndex], exercise);
      return updateExercises(state, workoutId, exercises);
    }),

  removeExercise: (workoutId, exerciseIndex) =>
    set((state: AppState) => {
      const key = workoutId in state.data.workouts.values ? "workouts" : "templates";
      let exercises = [...state.data[key].values[workoutId].exercises];
      exercises.splice(exerciseIndex, 1);
      return updateExercises(state, workoutId, exercises);
    }),

  togglePeriodDay: (day) =>
    set((state: AppState) => {
      let days = { ...state.data.periodDays.values };
      if (days[day]) delete days[day];
      else days[day] = true;
      return {
        data: {
          ...state.data,
          periodDays: { ...state.data.periodDays, values: days }
        }
      };
    }),
});

const mmvkStorage = new MMKV();

const storageBackend: StateStorage = {
  getItem: (key) => mmvkStorage.getString(key) ?? null,
  removeItem: (key) => {
    mmvkStorage.delete(key);
  },
  setItem: (key, value) => {
    mmvkStorage.set(key, value);
  },
};

export const useStore = create<AppState>()(
  persist(createAppStore, {
    name: `aro-${Constants.installationId}`,
    storage: createJSONStorage(() => storageBackend),
  }),
);

export const resetStore = async () => {
  useStore.setState(useStore.getInitialState());
  await storageBackend.removeItem(`aro-${Constants.installationId}`);
};
