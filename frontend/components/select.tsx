import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import Feather from "@expo/vector-icons/Feather";

export function SelectButton({ choices, defaultChoice, message, handlePress, icon }) {
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

export function Selection({ choices, icons, handleChoice, className }) {
  const [selected, setSelected] = useState(0);
  const select = (index: number) => {
    setSelected(index);
    handleChoice(index);
  }
  const extra = className ?? "";

  return (
    <View className="flex-row justify-between bg-white border-gray-100 border-2">
      {choices.map((_, index) => {
        const color = index == selected ? "white" : "blue";
        const textColor = index == selected ? "text-white" : "text-black";
        const style = index == selected ? "bg-blue-400 text-white p-1" : "bg-transparent p-1";
        const Icon = icons ? icons[index] : undefined;
        return (
          <Pressable
            onPress={() => select(index)} key={index}
            className={`items-center flex-1 flex-column p-2 ${style} ${extra}`}>
            {Icon && <Icon fill={color} stroke={color} width={25} height={25} />}
            <Text className={textColor}>{choices[index]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
