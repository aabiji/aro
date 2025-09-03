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

export interface TagInfo {
  id: number;
  name: string;
  color: string;
}

export interface TaggedDate {
  date: string;
  tagIds: number[];
}

interface AppStore {
  jwt: string;
  useImperial: boolean;
  workouts: Record<number, WorkoutInfo>;
  tags: Record<number, TagInfo>;
  taggedDates: Record<string, number[]>;

  changedWorkoutIds: Set<number>;
  changedTaggedDates: Set<string>;
  changedTagIds: Set<number>;
  settingsChanged: boolean;

  workoutsPage: number;
  moreWorkouts: boolean;
  templatesPage: number;
  moreTemplates: boolean;
  taggedDatesPage: number;
  moreTaggedDates: boolean;

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
  upsertTag: (tag: TagInfo, ignoreChange?: boolean) => void;
  removeTag: (id: number) => void;
  toggleTaggedDate: (date: string, tagId: number) => void;
  clearChangeSets: () => void;
  setAllData: (jwt: string, json: any) => void;
}

// remember, set() *merges* state
const createAppStore: StateCreator<AppStore> = (set, _get) => ({
  jwt: "",
  useImperial: true,
  tags: {},
  workouts: {},
  taggedDates: {},

  changedWorkoutIds: new Set(),
  changedTaggedDates: new Set(),
  changedTagIds: new Set(),
  settingsChanged: false,

  workoutsPage: 1,
  moreWorkouts: false,
  templatesPage: 1,
  moreTemplates: false,
  taggedDatesPage: 1,
  moreTaggedDates: false,

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

      let taggedDates = {} as Record<string, number[]>;
      for (const td of json.user.taggedDates) {
        taggedDates[td.date] = td.tagIds;
      }

      let tags = {} as Record<number, TagInfo>;
      for (const t of json.user.tags) {
        tags[t.id] = t;
      }

      // TODO: templates aren't loaded on login...

      return {
        jwt,
        workouts,
        tags,
        taggedDates,
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

  upsertTag: (tag, ignoreChange) =>
    set((state: AppStore) => ({
      changedTagIds:
        ignoreChange === undefined
          ? new Set([...state.changedTagIds, tag.id])
          : state.changedTagIds,
      tags: {
        ...state.tags,
        [tag.id]: {
          ...state.tags[tag.id],
          ...tag,
        },
      },
    })),

  removeTag: (id) =>
    set((state: AppStore) => {
      let tags = { ...state.tags };
      delete tags[id];
      return { tags };
    }),

  toggleTaggedDate: (date, tagId) =>
    set((state: AppStore) => {
      let tagIds =
        state.taggedDates[date] !== undefined ? [...state.taggedDates[date]] : [];
      const index = tagIds.findIndex((id) => id == tagId);
      if (index != -1) tagIds.splice(index, 1);
      else tagIds.push(tagId);
      return {
        changedTaggedDates: new Set([...state.changedTaggedDates, date]),
        taggedDates: { ...state.taggedDates, [date]: tagIds },
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

const excludedFields = [
  "changedWorkoutIds",
  "changedTaggedDates",
  "changedTagIds",
  "settingsChanged",
];

export const useStore = create<AppStore>()(
  persist(createAppStore, {
    name: "app-data",
    storage: createJSONStorage(() => storageBackend),
    partialize: (state) => {
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
