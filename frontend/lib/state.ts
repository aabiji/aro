import { MMKV } from "react-native-mmkv";
import { persist, StateStorage } from "zustand/middleware";
import { create, StateCreator } from "zustand";

export enum ExerciseType { Resistance, Cardio }

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
  workouts: Record<number, WorkoutInfo>,
  tags: Record<number, TagInfo>,
  taggedDates: Record<string, number[]>,

  updateUserData: (userDate: object) => void;
  upsertWorkout: (w: WorkoutInfo) => void;
  removeWorkout: (id: number) => void;
  addExercise: (workoutId: number, exercise: ExerciseInfo) => void;
  updateExercise: (workoutId: number, exerciseIndex: number, exercise: ExerciseInfo) => void;
  removeExercise: (workoutId: number, exerciseIndex: number) => void;
  upsertTag: (tag: TagInfo) => void;
  removeTag: (id: number) => void;
  toggleTaggedDate: (date: string, tagId: number) => void;
}

const createAppStore: StateCreator<AppStore> = (set, _get) =>  ({
  jwt: "",
  useImperial: true,
  tags: {},
  workouts: {},
  taggedDates: {},

  updateUserData: (userData) => set((_state: AppStore) => ({ ...userData })),

  upsertWorkout: (w) =>
    set((state: AppStore) => ({
      workouts: {
        ...state.workouts,
        [w.id]: {
          ...state.workouts[w.id],
          ...w,
        }
      }
    })),

  removeWorkout: (id) =>
    set((state: AppStore) => {
      let workouts = { ...state.workouts };
      delete workouts[id];
      return { workouts };
    }),

  addExercise: (workoutId, exercise) =>
    set((state: AppStore) => ({
      workouts: {
        ...state.workouts,
        [workoutId]: {
          ...state.workouts[workoutId],
          exercises: [...state.workouts[workoutId].exercises, exercise ]
        }
      }
    })),

  updateExercise: (workoutId, exerciseIndex, exercise) =>
    set((state: AppStore) => {
      let exercises = [...state.workouts[workoutId].exercises];
      Object.assign(exercises[exerciseIndex], exercise);
      return {
        workouts: {
          ...state.workouts,
          [workoutId]: { ...state.workouts[workoutId], exercises }
        }
      }
    }),

  removeExercise: (workoutId, exerciseIndex) =>
    set((state: AppStore) => {
      let exercises = [...state.workouts[workoutId].exercises];
      exercises.splice(exerciseIndex, 1);
      return {
        workouts: {
          ...state.workouts,
          [workoutId]: { ...state.workouts[workoutId], exercises }
        }
      }
    }),

  upsertTag: (tag) =>
    set((state: AppStore) => ({
      tags: {
        ...state.tags,
        [tag.id]: {
          ...state.tags[tag.id],
          ...tag,
        }
      }
    })),

  removeTag: (id) =>
    set((state: AppStore) => {
      let tags = { ...state.tags };
      delete tags[id];
      return { tags };
    }),

  toggleTaggedDate: (date, tagId) =>
    set((state: AppStore) => {
      const existingIds = state.taggedDates[date];
      const index = existingIds.findIndex(id => id == tagId);

      let tagIds = existingIds !== undefined ? [...existingIds] : [];
      if (index != -1)
        tagIds.splice(index, 1);
      else
        tagIds.push(tagId);

      return { taggedDates: { ...state.taggedDates, [date]: tagIds }};
    }),
});

const mmvkStorage = new MMKV();

const storage: StateStorage = {
  getItem: (name) => mmvkStorage.getString(name) ?? null,
  removeItem: (name) => { mmvkStorage.delete(name) },
  setItem: (name, value) => { mmvkStorage.set(name, value) },
};

export const useStore = create<AppStore>()(
  persist(createAppStore, { name: "app-data", storage })
)

export const resetStore = async () => {
  useStore.setState({
    jwt: "",
    useImperial: true,
    workouts: {},
    tags: {},
    taggedDates: {},
    updateUserData: useStore.getState().updateUserData,
    upsertWorkout: useStore.getState().upsertWorkout,
    removeWorkout: useStore.getState().removeWorkout,
    addExercise: useStore.getState().addExercise,
    updateExercise: useStore.getState().updateExercise,
    removeExercise: useStore.getState().removeExercise,
    upsertTag: useStore.getState().upsertTag,
    removeTag: useStore.getState().removeTag,
    toggleTaggedDate: useStore.getState().toggleTaggedDate,
  });

  await storage.removeItem("app-data");
};