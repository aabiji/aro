import React, { useState } from "react";
import { useRouter } from "expo-router";

import { Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Ionicons from "@expo/vector-icons/Ionicons";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  transparent?: boolean;
  flatten?: boolean;
}

export function Card({ children, className, transparent, flatten }: CardProps) {
  const { width } = useWindowDimensions();
  const style = `
  mx-auto p-2 ${transparent ? "" : "bg-surface-color"} mb-4 rounded-xl ${className ?? ""}`;
  const cssWidth = flatten ? "100%" : width < 400 ? "92%" : "50%";

  return (
    <View style={{ width: cssWidth }} className={style}>
      {children}
    </View>
  );
}

export function Container({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  return (
    <SafeAreaView style={{ height, flex: 1 }} edges={["top", "bottom", "left", "right"]}>
      <View style={{ width, height }} className="bg-background-color">
        {children}
      </View>
    </SafeAreaView>
  );
}

interface ButtonProps {
  text?: string;
  icon?: string;
  onPress: () => void;
  transparent?: boolean;
  textStyle?: string;
  className?: string;
  disabled?: boolean;
  iconSize?: number;
  iconColor?: string;
}

export function Button({ text, icon, onPress, className, transparent,
  textStyle, iconSize, iconColor }: ButtonProps) {
  const outerStyle = `rounded-xl
    ${transparent ? "" : "bg-primary-500 p-2 disabled:bg-primary-400"}
    ${className ?? ""}`;
  const innerStyle = `text-base text-center ${textStyle ?? ""}
    ${transparent ? "text-accent-500" : "text-surface-color"}`;

  return (
    <Pressable onPress={onPress} className={outerStyle}>
      {text && <Text className={innerStyle}>{text}</Text>}
      {icon && <Ionicons name={icon} size={iconSize ?? 24} color={iconColor ?? "white"} />}
    </Pressable>
  );
}

interface InputProps {
  text: string;
  setText: (txt: string) => void;
  placeholder: string;
  className?: string;
  label?: string;
  password?: boolean;
  numeric?: boolean;
  disabled?: boolean;
}

export function Input({ text, setText, placeholder, className,
  label, password, numeric, disabled }: InputProps) {
  const [shown, setShown] = useState(false);

  const inputStyle =
    `bg-background-color placeholder-grey-400 p-2 rounded-xl text-sm ${className}`;

  const update = (value: string) => {
    if (numeric && /\D/.test(value)) return; // can't have non numeric chars
    setText(value);
  };

  return (
    <View>
      {password
        ? <View className="relative">
          <TextInput
            value={text} placeholder={placeholder} autoComplete="off"
            secureTextEntry={!shown} autoCapitalize="none"
            onChangeText={update} className={inputStyle} />
          <Pressable
            className="absolute right-1 top-[50%] translate-y-[-50%]"
            onPress={() => setShown(!shown)}>
            <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} color="black" size={20} />
          </Pressable>
        </View>
        : <View className="flex-row w-[100%] items-center">
          <TextInput
            value={text} placeholder={placeholder}
            editable={!disabled} maxLength={numeric ? 4 : undefined}
            inputMode={numeric ? "numeric" : "text"} autoCapitalize="none"
            onChangeText={update} className={inputStyle} />
          {label && <Text className="ml-2">{label}</Text>}
        </View>
      }
    </View>
  );
}

interface DropdownProps {
  options: any[];
  current: number;
  setCurrent: (index: number) => void;
  optionElement: (index: number) => React.ReactNode;
  currentElement: React.ReactNode;
}

export function Dropdown(
  { options, current, setCurrent, currentElement, optionElement }: DropdownProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View>
      <View className="flex-row justify-between bg-accent relative items-center rounded-xl">
        <View className="flex-1">{currentElement}</View>
        <Pressable onPress={() => setMenuOpen(!menuOpen)} className="pr-2">
          <Ionicons name={menuOpen ? "chevron-up" : "chevron-down"} size={25} color="white" />
        </Pressable>
      </View>

      {menuOpen && (
        <View className="w-[100%] border-background-color border-2 rounded-xl">
          {options.map((_, i) => {
            if (i == current) return null;
            return (
              <Pressable
                onPress={() => { setCurrent(i); setMenuOpen(false); }} key={i}
                className="p-2 border-t-2 border-background-color">
                {optionElement(i)}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function Checkbox({ label, handleToggle, value }: {
  label: string; handleToggle: () => void; value: boolean;
}) {
  const bg = value ? "bg-accent" : "bg-default-background";
  return (
    <View className="w-full flex-row justify-between items-center mb-2">
      <Text className="text-base"> {label} </Text>
      <Pressable
        className={`${bg} w-[30] h-[30] rounded-full items-center border-2 border-accent`}
        onPress={() => handleToggle()}>
        {value && <Ionicons name="checkmark-outline" color="white" size={22} />}
      </Pressable>
    </View>
  );
}

export function BackHeader({ title }: { title: string; }) {
  const router = useRouter();
  return (
    <View className="w-full flex-row items-center mb-2">
      <Pressable onPress={() => router.back()}>
        <Ionicons name="chevron-back-outline" size={35} color="gray" />
      </Pressable>
      <Text className="text-xl ml-2 text-gray-600">{title}</Text>
    </View>
  );
}
