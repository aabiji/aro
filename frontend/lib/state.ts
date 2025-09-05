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

interface AppStore {
  jwt: string;
  useImperial: boolean;
  workouts: Record<number, WorkoutInfo>;
  periodDates: Record<string, boolean>;

  changedWorkoutIds: Set<number>;
  settingsChanged: boolean;

  workoutsPage: number;
  moreWorkouts: boolean;
  templatesPage: number;
  moreTemplates: boolean;
  periodDatesPage: number;
  morePeriodDates: boolean;

  updateUserData: (userDate: object, settingsChanged?: boolean) => void;
  upsertWorkout: (w: WorkoutInfo, ignoreChange?: boolean) => void;
  removeWorkout: (id: number) => void;
  addExercise: (workoutId: number, exercise: ExerciseInfo) => void;
  updateExercise: (
    workoutId: number,
    exerciseIndex: number,
    exercise: ExerciseInfo,
  ) => void;
  removeExercise: (workoutId: number, exerciseIndex: number) => void;
  togglePeriodDate: (date: string) => void;
  clearChangeSets: () => void;
  setAllData: (jwt: string, json: any) => void;
}

// remember, set() *merges* state
const createAppStore: StateCreator<AppStore> = (set, _get) => ({
  jwt: "",
  useImperial: true,
  workouts: {},
  periodDates: {},

  changedWorkoutIds: new Set(),
  settingsChanged: false,

  workoutsPage: 1,
  moreWorkouts: false,
  templatesPage: 1,
  moreTemplates: false,
  periodDatesPage: 1,
  morePeriodDates: false,

  updateUserData: (userData, settingsChanged) =>
    set((state: AppStore) => {
      return {
        ...state,
        ...userData,
        settingsChanged: settingsChanged ?? false,
      };
    }),

  setAllData: (jwt, json) =>
    set((_state: AppStore) => {
      let workouts = {} as Record<number, WorkoutInfo>;
      for (const w of json.user.workouts) {
        workouts[w.id] = w;
      }

      let periodDates = {} as Record<string, boolean>;
      for (const pd of json.user.periodDates) {
        periodDates[pd.date] = true;
      }

      // TODO: templates aren't loaded on login...

      return {
        jwt,
        workouts,
        periodDates,
        useImperial: json.user.settings.useImperial,
        moreTaggedDates: json.moreTaggedDates,
        moreWorkouts: json.moreWorkouts,
        moreTemplates: json.moreTemplates,
      };
    }),

  clearChangeSets: () =>
    set((_state: AppStore) => ({
      settingsChanged: false,
      changedWorkoutIds: new Set(),
      changedTagIds: new Set(),
      changedTaggedDates: new Set(),
    })),

  upsertWorkout: (w, ignoreChange) =>
    set((state: AppStore) => ({
      changedWorkoutIds:
        ignoreChange === undefined
          ? new Set([...state.changedWorkoutIds, w.id])
          : state.changedWorkoutIds,
      workouts: {
        ...state.workouts,
        [w.id]: {
          ...state.workouts[w.id],
          ...w,
        },
      },
    })),

  removeWorkout: (id) =>
    set((state: AppStore) => {
      let workouts = { ...state.workouts };
      delete workouts[id];
      return { workouts };
    }),

  addExercise: (workoutId, exercise) =>
    set((state: AppStore) => ({
      changedWorkoutIds: new Set([...state.changedWorkoutIds, workoutId]),
      workouts: {
        ...state.workouts,
        [workoutId]: {
          ...state.workouts[workoutId],
          exercises: [...state.workouts[workoutId].exercises, exercise],
        },
      },
    })),

  updateExercise: (workoutId, exerciseIndex, exercise) =>
    set((state: AppStore) => {
      let exercises = [...state.workouts[workoutId].exercises];
      Object.assign(exercises[exerciseIndex], exercise);
      return {
        changedWorkoutIds: new Set([...state.changedWorkoutIds, workoutId]),
        workouts: {
          ...state.workouts,
          [workoutId]: { ...state.workouts[workoutId], exercises },
        },
      };
    }),

  removeExercise: (workoutId, exerciseIndex) =>
    set((state: AppStore) => {
      let exercises = [...state.workouts[workoutId].exercises];
      exercises.splice(exerciseIndex, 1);
      return {
        changedWorkoutIds: new Set([...state.changedWorkoutIds, workoutId]),
        workouts: {
          ...state.workouts,
          [workoutId]: { ...state.workouts[workoutId], exercises },
        },
      };
    }),

  togglePeriodDate: (date) =>
    set((state) => {
      let dates = { ...state.periodDates };
      if (dates[date]) delete dates[date];
      else dates[date] = true;
      return { periodDates: dates };
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


export const useStore = create<AppStore>()(
  persist(createAppStore, {
    name: "app-data",
    storage: createJSONStorage(() => storageBackend),
    partialize: (state) => {
      const excludedFields = ["changedWorkoutIds", "settingsChanged"];
      let clone = { ...state } as Record<string, any>;
      for (const key of excludedFields) delete clone[key];
      return clone;
    },
  }),
);

export const resetStore = async () => {
  useStore.setState(useStore.getInitialState());
  await storageBackend.removeItem("app-data");
};
