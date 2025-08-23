import { combineReducers, createSlice, PayloadAction } from "@reduxjs/toolkit";

export enum ExerciseType {
  Resistance,
  Cardio,
}

interface Action<T> {
  value: T;
  // workouts
  workoutIndex?: number;
  exerciseIndex?: number;
  // tags and events
  tagIndex?: number;
  date?: string;
}

// NOTE: see the corresponding backend api request types
export interface ExerciseInfo {
  id?: number;
  exercise_type: ExerciseType;
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

const workoutsSlice = createSlice({
  name: "workout",
  initialState: { workouts: [] as WorkoutInfo[] },
  reducers: {
    set: (state, a: PayloadAction<WorkoutInfo[]>) => {
      state.workouts = a.payload;
    },

    setTemplateName: (state, a: PayloadAction<Action<string>>) => {
      state.workouts[a.payload.workoutIndex!].tag = a.payload.value;
    },

    addWorkout: (state, a: PayloadAction<Action<WorkoutInfo>>) => {
      state.workouts.push(a.payload.value);
    },

    removeWorkout: (state, a: PayloadAction<Action<null>>) => {
      state.workouts.splice(a.payload.workoutIndex!, 1);
    },

    updateWorkout: (state, a: PayloadAction<Action<WorkoutInfo>>) => {
      state.workouts[a.payload.workoutIndex!] = a.payload.value;
    },

    addExercise: (state, a: PayloadAction<Action<ExerciseInfo>>) => {
      state.workouts[a.payload.workoutIndex!].exercises.push(a.payload.value);
    },

    removeExercise: (state, a: PayloadAction<Action<null>>) => {
      state.workouts[a.payload.workoutIndex!].exercises.splice(
        a.payload.exerciseIndex!,
        1,
      );
    },

    updateExercise: (state, a: PayloadAction<Action<object>>) => {
      Object.assign(
        state.workouts[a.payload.workoutIndex!].exercises[a.payload.exerciseIndex!],
        a.payload.value,
      );
    },
  },
});

const userData = createSlice({
  name: "user-data",
  initialState: {
    jwt: "", id: 0,
    useImperial: true,
  },
  reducers: {
    update: (state, a: PayloadAction<object>) => { Object.assign(state, a.payload); },
  },
});

export interface TagInfo {
  name: string;
  color: string;
  selected?: boolean;
  problematic?: boolean;
}

const tagData = createSlice({
  name: "tags",
  initialState: {
    tags: [] as TagInfo[],
    taggedDates: {} as Record<string, string[]>, // map dates to tag names
  },
  reducers: {
    addTag: (state, a: PayloadAction<TagInfo>) => {
      state.tags.push(a.payload);
    },
    removeTag: (state, a: PayloadAction<number>) => {
      state.tags.splice(a.payload);
    },
    updateTag: (state, a: PayloadAction<Action<TagInfo>>) => {
      Object.assign(state.tags[a.payload.tagIndex!], a.payload.value);
    },
    // toggle a tag on a specific date: add it if missing, remove it otherwise
    toggleDate: (state, a: PayloadAction<Action<string>>) => {
      let tagNames = state.taggedDates[a.payload.date!] ?? [];

      const index = tagNames.findIndex((tagName) => tagName == a.payload.value);
      if (index != -1) tagNames.splice(index, 1);
      else tagNames.push(a.payload.value);

      state.taggedDates[a.payload.date!] = tagNames;
    },
  },
});

export const workoutActions = workoutsSlice.actions;
export const userDataActions = userData.actions;
export const tagActions = tagData.actions;

export const rootReducer = combineReducers({
  workouts: workoutsSlice.reducer,
  userData: userData.reducer,
  tagData: tagData.reducer,
});
