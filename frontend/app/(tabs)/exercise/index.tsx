import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions } from "@/lib/state";

import { FlatList, Text, View } from "react-native";
import { Section, ScrollContainer, Empty } from "@/components/container";
import { WorkoutRecordMemo } from "@/components/workouts";
import SelectButton from "@/components/select";

export default function Index() {
  const opts = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Intl.DateTimeFormat('en-US', opts).format(new Date());

  const dispatch = useDispatch();
  const workoutsState = useSelector(state => state.workouts);

  const workouts = useMemo(() => {
    return workoutsState.workouts
      .map((w, i) => ({ workout: w, index: i }))
      .filter(w => !w.workout.isTemplate)
  }, [workoutsState]);

  const choices = useMemo(() => {
    return workoutsState.workouts
      .filter(w => w.isTemplate && w.exercises.length > 0)
      .map(w => ({ label: w.name, value: w.name }));
  }, [workoutsState]);

  const addWorkout = (templateName: string) => {
    const template = workoutsState.workouts.find(w => w.name == templateName);
    let workout = { isTemplate: false, date: today, name: template.name };

    let exercises = [];
    for (const e of template.exercises) {
      exercises.push({
        name: e.name,
        exerciseType: e.exerciseType,
        reps: [], duration: 0, distance: 0,
        weight: e.weight ?? 0
      });
    }
    workout.exercises = exercises;

    dispatch(workoutActions.addWorkout({ value: workout }));
  };

  return (
    <ScrollContainer>
      {choices.length == 0 && <Empty messages={
        ["You have no workout templates", "Create one to get started"]} />
      }

      {choices.length > 0 &&
        <FlatList
          data={[...workouts].reverse()}
          keyExtractor={item => item.index.toString()}
          ListHeaderComponent={
            <View>
              <Text className="font-bold text-xl mb-2">{today}</Text>
              <Section>
                <SelectButton
                  choices={choices}
                  defaultChoice={choices[0].value}
                  message="Add workout"
                  handlePress={(choice: string) => addWorkout(choice)} />
              </Section>
              <View className="border-b-2 border-gray-200"></View>
            </View>
          }
          renderItem={({ item, index }) => {
            const prev = workouts[workouts.length - 1 - index].workout.date;
            const showDate = index > 0 &&
              prev !== workouts[workouts.length - index].workout.date;

            return (
              <View>
                {showDate &&
                  <Text className="font-bold text-xl mb-2">{item.workout.date}</Text>}
                <WorkoutRecordMemo workout={item.workout} index={item.index} />
              </View>
            );
          }}
        />}
    </ScrollContainer>
  );
}
