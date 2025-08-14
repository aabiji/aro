import { useWindowDimensions, View } from "react-native";

export default function ScrollContainer({ children }) {
  const { width } = useWindowDimensions();
  const containerWidth = width > 1024 ? '40%' : '60%';

  return (
    <View className="m-auto h-[100%] mt-5" style={{ width: containerWidth }}>
      {children}
    </View>
  )
}
