import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import Feather from "@expo/vector-icons/Feather";

export default function OptButton({ choices, defaultChoice, message, handlePress, icon }) {
  const [choice, setChoice] = useState(defaultChoice);

  return (
    <View className="w-full items-center justify-center border border-gray-100">
      <Dropdown
        data={choices}
        value={choice}
        labelField="label"
        valueField="value"
        dropdownPosition="bottom"
        style={{ width: "100%", padding: 10 }}
        placeholderStyle={{ color: "black", textAlign: "center", fontSize: 14 }}
        selectedTextStyle={{ color: "black", textAlign: "center", fontSize: 14 }}
        containerStyle={{ backgroundColor: "white", paddingVertical: 6 }}
        onChange={(item) => setChoice(item.value)}
        renderRightIcon={() => <Feather name="chevron-down" size={20} color="black" />}
        renderItem={(item) => (
          <Text className="text-center text-black text-sm py-1">{item.label}</Text>
        )}
      />

      <Pressable
        className="flex-row items-center justify-center w-full bg-blue-500 py-2"
        onPress={() => handlePress(choice)}>
        {icon && <Feather name={icon} size={20} color="white" />}
        <Text className="text-white font-bold text-base ml-2">{message}</Text>
      </Pressable>
    </View>
  );
}
