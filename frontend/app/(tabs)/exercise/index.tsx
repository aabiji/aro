import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions, ExerciseInfo } from "@/lib/state";
import { request } from "@/lib/http";

import { FlatList, Text, View } from "react-native";
import WorkoutStateSync from "@/components/sync";
import { Section, ScrollContainer, Empty } from "@/components/container";
import { WorkoutRecordMemo } from "@/components/workouts";
import { SelectButton } from "@/components/select";

export default function Index() {
  const opts = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Intl.DateTimeFormat('en-US', opts).format(new Date());

  const dispatch = useDispatch();
  const workoutsState = useSelector(state => state.workouts);
  const userData = useSelector(state => state.userData);

  const workouts = useMemo(() => {
    return workoutsState.workouts
      .map((w, i) => ({ workout: w, index: i }))
      .filter(w => !w.workout.is_template)
  }, [workoutsState]);

  const choices = useMemo(() => {
    return workoutsState.workouts
      .filter(w => w.is_template && w.exercises.length > 0)
      .map(w => ({ label: w.tag, value: w.tag }));
  }, [workoutsState]);

  const addWorkout = async (templateName: string) => {
    const template = workoutsState.workouts.find(w => w.tag == templateName);
    let body = { id: null, is_template: false, tag: today, exercises: [] as ExerciseInfo[] };

    for (const e of template.exercises) {
      body.exercises.push({
        id: null, name: e.name,
        exercise_type: e.exercise_type,
        reps: [], duration: 0, distance: 0,
        weight: e.weight ?? 0
      });
    }

    try {
      const json = await request("POST", "/workout", body, userData.jwt);
      dispatch(workoutActions.addWorkout({ value: json.workout }));
    } catch (err) {
      console.log("ERROR!", err.message);
    }
  };

  return (
    <WorkoutStateSync>
      <ScrollContainer>
        <FlatList
          data={[...workouts].reverse()}
          keyExtractor={item => item.index.toString()}
          ListHeaderComponent={
            <View>
              <Text className="font-bold text-xl mb-2">{today}</Text>
              {choices.length == 0
                ? <Empty messages={["You have no workout templates"]} />
                : <Section>
                  <SelectButton
                    choices={choices}
                    defaultChoice={choices[0].value}
                    message="Add workout"
                    handlePress={(choice: string) => addWorkout(choice)} />
                </Section>}
              <View className="mt-2 mb-2 border-b-2 border-gray-200"></View>
            </View>
          }
          renderItem={({ item, index }) => {
            const prev = workouts[workouts.length - 1 - index].workout.tag;
            const showDate = index > 0 &&
              prev !== workouts[workouts.length - index].workout.tag;

            return (
              <View>
                {showDate &&
                  <Text className="font-bold text-xl mb-2">{item.workout.tag}</Text>}
                <WorkoutRecordMemo
                  disabled={item.workout.tag != today}
                  workout={item.workout} index={item.index} />
              </View>
            );
          }}
        />
      </ScrollContainer>
    </WorkoutStateSync>
  );
}
