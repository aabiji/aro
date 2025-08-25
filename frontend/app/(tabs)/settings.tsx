import { useRouter } from "expo-router";
import { resetStore, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { ScrollContainer } from "@/components/container";

import Feather from "@expo/vector-icons/Feather";

function Checkbox(
  { label, handleToggle, value }:
  { label: string; handleToggle: () => void; value: boolean; }) {
  const bg = value ? "bg-blue-500" : "bg-white";
  return (
    <View className="w-full flex-row justify-between items-center mb-2">
      <Text className="text-base"> {label} </Text>
      <Pressable
        className={`${bg} w-[20] h-[20] rounded items-center border-2 border-blue-500`}
        onPress={() => handleToggle()}
      >
        {value && <Feather name="check" color="white" size={15} />}
      </Pressable>
    </View>
  );
}

export default function Settings() {
  const { jwt, useImperial, updateUserData } = useStore();
  const router = useRouter();

  const deleteAccount = async () => {
    try {
      await request("DELETE", "/auth/user", undefined, jwt);
      await resetStore();
      router.replace("/");
    } catch (err: any) {
      console.log("ERROR!", err.message);
    }
  };

  return (
    <ScrollContainer syncState>
      <Checkbox
        label="Use imperial units" value={useImperial}
        handleToggle={() => updateUserData({ useImperial: !useImperial })} />

      <Pressable className="bg-red-500 p-2 rounded" onPress={() => deleteAccount()}>
        <Text className="text-white text-center"> Delete account </Text>
      </Pressable>

      <Text className="text-center mt-2"> Athena, © Abigail A. 2025- </Text>
    </ScrollContainer>
  );
}
