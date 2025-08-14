import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions } from "@/lib/state";

import { FlatList, Text, View } from "react-native";
import { Section, ScrollContainer, Empty } from "@/components/container";
import { WorkoutRecord } from "@/components/workouts";
import SelectButton from "@/components/select";

export default function Index() {
  const dispatch = useDispatch();
  const workoutsState = useSelector(state => state.workouts);

  const [archived, setArchived] = useState([]);
  const [current, setCurrent] = useState([]);
  const [choices, setChoices] = useState([]);

  useEffect(() => {
    setArchived(
      workoutsState.workouts
        .map((w, i) => ({ workout: w, index: i }))
        .filter(w => !w.workout.isTemplate && w.workout.date != today)
    );

    setCurrent(
      workoutsState.workouts
        .map((w, i) => ({ workout: w, index: i }))
        .filter(w => !w.workout.isTemplate && w.workout.date == today)
    );

    setChoices(
      workoutsState.workouts
        .filter(w => w.isTemplate && w.exercises.length > 0)
        .map(w => ({ label: w.name, value: w.name }))
    );
  }, [workoutsState]);

  const opts = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Intl.DateTimeFormat('en-US', opts).format(new Date());

  const addWorkout = (templateName: string) => {
    const template = workoutsState.workouts.find(w => w.name == templateName);

    let workout = { ...template, isTemplate: false, date: today };
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
      {choices.length == 0 && <Empty messages={
        ["You have no workout templates", "Create one to get started"]} />
      }

      {choices.length > 0 &&
        <View>
          <Text className="font-bold text-xl mb-2">{today}</Text>

          <Section>
            <SelectButton
              choices={choices}
              defaultChoice={choices[0]} message="Add workout"
              handlePress={(choice: string) => addWorkout(choice)} />
          </Section>

          <FlatList
            data={current}
            keyExtractor={item => item.index}
            renderItem={({ item }) =>
              <WorkoutRecord workout={item.workout} index={item.index} />
            }
          />

          <View className="border-b-2 border-gray-200"></View>

          {archived.length == 0 &&
            <Empty messages={["You have no workouts logged"]} />}

          <FlatList
            data={[...archived].reverse()}
            keyExtractor={item => item.index}
            renderItem={({ item, index }) => {
              const sameDay = archived[index].workout.date == item.workout.date;
              return (
                <View>
                  {!sameDay &&
                    <Text className="font-bold text-xl mb-2">{item.workout.date}</Text>}
                  <WorkoutRecord workout={item.workout} index={item.index} />
                </View>
              );
            }}
          />
        </View>}
    </ScrollContainer>
  );
}
