import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions } from "@/lib/state";

import { FlatList, View } from "react-native";
import OptButton from "@/components/optbutton";
import ScrollContainer from "@/components/container";
import { WorkoutView } from "@/components/workout_views";

export default function Index() {
  const dispatch = useDispatch();
  const workoutsState = useSelector(state => state.workouts);

  const [workouts, setWorkouts] = useState([]);
  const [templateChoices, setTemplateChoices] = useState([]);

  useEffect(() => {
    setWorkouts(
      workoutsState.workouts
        .map((w, i) => ({ workout: w, index: i }))
        .filter(w => !w.workout.isTemplate)
    );

    setTemplateChoices(
      workoutsState.workouts
        .filter(w => w.isTemplate)
        .map(w => ({ label: w.name, value: w.name }))
    );
  }, [workoutsState]);

  const addWorkout = (templateName: string) => {
    const template = workoutsState.workouts.find(w => w.name == templateName);

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Intl.DateTimeFormat('en-US', options).format(new Date());

    let workout = { ...template, isTemplate: false, date };
    if (workout.exercises === undefined)
      workout.exercises = [];
    else {
      for (const e of workout.exercises) {
        e.weight = e.weight ?? 0;
        w.reps = e.reps ?? [];
        e.duration = e.duration ?? 0;
        e.distance = e.distance ?? 0;
      }
    }
    dispatch(workoutActions.addWorkout({ value: workout }));
  };

  return (
    <ScrollContainer>
      {templateChoices.length > 0 &&
        <OptButton
          choices={templateChoices}
          defaultChoice={templateChoices[0]} message="Start workout"
          handlePress={(choice: string) => addWorkout(choice)} />
      }

      <FlatList
        data={[...workouts].reverse()}
        keyExtractor={item => item.index}
        renderItem={({ item }) =>
          <WorkoutView workout={item.workout} index={item.index} />}
      />
    </ScrollContainer>
  );
}
