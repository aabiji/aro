import { useWindowDimensions, Image, Text, View } from "react-native";

export function ScrollContainer({ children }) {
  const { width } = useWindowDimensions();
  const containerWidth = width > 1024 ? '40%' : '60%';

  return (
    <View className="m-auto h-[100%] mt-5" style={{ width: containerWidth }}>
      {children}
    </View>
  )
}

export function Section({ children }) {
  return (
    <View className="w-[100%] m-auto border border-gray-200 p-2 bg-white mb-5">
      {children}
    </View>
  )
}

export function Empty({ messages }) {
  return (
    <View className="items-center">
      <Image source={require("@/assets/icons/dumbell.svg")} />
      {messages.map((_, i) =>
        <Text className="text-xl text-gray-500" key={i}>{messages[i]}</Text>)}
    </View>
  );
}
