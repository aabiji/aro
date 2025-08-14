import { useState } from "react";

import { Pressable, Text, TextInput, View } from "react-native";
import { Dropdown } from 'react-native-element-dropdown';

import Feather from "@expo/vector-icons/Feather";

export default function OptButton({ choices, defaultChoice, message, handlePress }) {
  const [choice, setChoice] = useState(defaultChoice);

  return (
    <View className="flex-row items-center justify-between mt-5 bg-blue-50">
      <Dropdown
        data={choices}
        value={choice}
        labelField="label"
        valueField="value"
        dropdownPosition="bottom"
        mode="default"
        style={{ flex: 1 }}
        onChange={item => setChoice(item.value)}
        renderItem={item => <Text className="p-4 text-center">{item.label}</Text>}
      />
      <Pressable
        onPress={() => handlePress(choice)}
        className="p-4 bg-blue-200">
        <Feather name="plus" color="white" size={20} />
        <Text>{message}</Text>
      </Pressable>
    </View>
  );
}
