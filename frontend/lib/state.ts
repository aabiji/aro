import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Exercise {
  exerciseType: string;
  name: string;
  // strength exercises
  weight?: number;
  reps?: number[];
  // cardio exercises
  duration?: number;
  distance?: number;
}

export interface Workout {
  // if it's a template, it simply defines what
  // a workout consists of, so it won't include
  // reps or duration or anything like that
  isTemplate: boolean;
  exercises: Exercise[];
  name: string;
  date?: string;
}

interface Action<T> {
  workoutIndex?: number;
  exerciseIndex?: number;
  value: T;
}

const workoutsSlice = createSlice({
  name: "workout",
  initialState: { workouts: [] as Workout[] },
  reducers: {
    setWorkoutName: (state, a: PayloadAction<Action<string>>) => {
      state.workouts[a.payload.workoutIndex!].name = a.payload.value;
    },

    addWorkout: (state, a: PayloadAction<Action<Workout>>) => {
      state.workouts.push(a.payload.value);
    },

    removeWorkout: (state, a: PayloadAction<Action<null>>) => {
      state.workouts.splice(a.payload.workoutIndex!, 1);
    },

    addExercise: (state, a: PayloadAction<Action<Exercise>>) => {
      state.workouts[a.payload.workoutIndex!].exercises.push(a.payload.value);
    },

    removeExercise: (state, a: PayloadAction<Action<null>>) => {
      state.workouts[a.payload.workoutIndex!].exercises.splice(a.payload.exerciseIndex!, 1);
    },

    updateExercise: (state, a: PayloadAction<Action<object>>) => {
      Object.assign(
        state.workouts[a.payload.workoutIndex!].exercises[a.payload.exerciseIndex!],
        a.payload.value,
      );
    }
  }
});

export const workoutActions = workoutsSlice.actions;

export const store = configureStore({
  reducer: {
    workouts: workoutsSlice.reducer,
  }
});
