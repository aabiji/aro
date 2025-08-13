import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Dropdown } from 'react-native-element-dropdown';
import Feather from "@expo/vector-icons/Feather";

function NumInput({ num, setNum, label }) {
  const update = (value) => {
    const n = Number(value);
    if (!isNaN(n) && n >= 0) setNum(n);
  }

  return (
    <View className="items-center flex-row">
      <TextInput
        inputMode="numeric" value={num} placeholder="0"
        onChangeText={update} maxLength={5}
        className="bg-gray-100 rounded-sm px-2 py-1 outline-none inline-block w-[50px] text-center" />
      {label && <Text className="ml-2">{label}</Text>}
    </View>
  );
}

function EditableExercise({ exercise }) {
  return (
    <View className="flex-row justify-between border-t border-gray-100 p-2">
      <TextInput
        value={exercise.name}
        placeholder="Exercise name"
        className="outline-none bg-gray-100 px-2" />


      {exercise.type == "strength" &&
        <NumInput num={exercise.weight} label="lbs" />}

      <Pressable className="bg-transparent p-2">
        <Feather name="trash" color="red" size={18} />
      </Pressable>
    </View>
  );
}

function Template({ template }) {
  const buttonChoices = [
    { label: "Strength exercise", value: 0 },
    { label: "Cardio exercise", value: 1 },
  ];
  const [exerciseType, setExerciseType] = useState(null);

  return (
    <View className="w-[60%] m-auto border border-gray-200 p-2 bg-white mt-5">
      <Text className="text-xl">{template.name}</Text>

      {template.exercises.map(e =>
        <View className="px-1 border-t border-gray-100">
          <EditableExercise exercise={e} />
        </View>
      )}

      <Pressable
        className="m-auto text-center bg-blue-50 flex-row w-[45%] justify-between p-4 mt-5">
        <Dropdown
          data={buttonChoices}
          value={exerciseType}
          placeholder="Exercise type"
          labelField="label" valueField="value"
          style={{ flexGrow: 1 }}
          onChange={item => setExerciseType(item.value)}
          renderItem={item => <Text className="p-2">{item.label}</Text>}
        />
        <Feather name="plus" color="black" size={20} className="ml-2" />
      </Pressable>
    </View>
  );
}

function Exercise({ exercise }) {
  const str = `${exercise.name} (${exercise.weight} lbs)`;
  return (
    <View className="flex-row justify-between items-center p-2">
      <View className="items-center flex-row max-w-[40%]">
        <Text className="text-l font-bold mr-2 mr-5">{str}</Text>
      </View>

      <View className="flex-row items-center">
        <View className="grid grid-cols-4 grid-flow-row gap-2">
          {exercise.reps.map((r, i) => <NumInput key={i} num={r} />)}
        </View>

        <Pressable className="bg-transparent px-4 px-2 rounded">
          <Feather name="plus" color="blue" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

function Workout({ entry }) {
  return (
    <View className="w-[60%] m-auto border border-gray-200 p-2 bg-white mt-5">
      <Text className="text-xl">{entry.date}</Text>
      {entry.exercises.map(e =>
        <View className="py-2 px-1 border-t border-gray-100">
          <Exercise exercise={e} />
        </View>
      )}
    </View>
  );
}

export default function Index() {
  const entries = [
    {
      date: "June 26, 2025",
      exercises: [
        { name: "Lat pulldown", weight: 80, reps: [9, 10, 9, 10] },
        { name: "Incline press", weight: 30, reps: [13, 10, 10, 8] },
        { name: "Assisted pull ups", weight: 25, reps: [9, 8, 7, 8] },
        { name: "Dips", weight: 25, reps: [5, 4, 4, 4] },
        { name: "Lateral raise", weight: 20, reps: [6, 7, 6, 6] }
      ],
    },
    {
      date: "July 3, 2025",
      exercises: [
        { name: "Seated leg press", weight: 50, reps: [10, 12, 13, 12] },
        { name: "Leg extension", weight: 60, reps: [12, 10, 12, 11] },
        { name: "MTS abdominal crunch", weight: 30, reps: [8, 9, 8, 9] },
        { name: "Romanian deadlift", weight: 50, reps: [11, 11, 9, 10] },
      ]
    },
  ];

  const templates = [
    {
      name: "Template A",
      exercises: [
        { name: "Lat pulldown", weight: 70, type: "strength" },
        { name: "Bent over row", weight: 50, type: "strength" },
        { name: "Ab crunch", weight: 30, type: "strength" },
        { name: "Assisted pull up", weight: 40, type: "strength" },
      ],
    },
    {
      name: "Template B",
      exercises: [
        { name: "Seated leg press", weight: 50, type: "strength" },
        { name: "Leg extension", weight: 60, type: "strength" },
        { name: "MTS abdominal crunch", weight: 30, type: "strength" },
        { name: "Romanian deadlift", weight: 50, type: "strength" },
      ],
    },
  ];

  return (
    <View>
      <FlatList
        data={templates}
        renderItem={({ item }) => <Template template={item} />}
        keyExtractor={item => item.name}
      />
      <FlatList
        data={entries}
        renderItem={({ item }) => <Workout entry={item} />}
        keyExtractor={item => item.date}
      />
    </View>
  );
}
