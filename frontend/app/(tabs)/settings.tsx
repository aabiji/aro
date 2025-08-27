import { useRouter } from "expo-router";
import { resetStore, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { ScrollContainer, Section } from "@/components/container";

import Feather from "@expo/vector-icons/Feather";

function Checkbox({
  label,
  handleToggle,
  value,
}: {
  label: string;
  handleToggle: () => void;
  value: boolean;
}) {
  const bg = value ? "bg-primary-500" : "bg-default-background";
  return (
    <View className="w-full flex-row justify-between items-center mb-2">
      <Text className="text-base"> {label} </Text>
      <Pressable
        className={`${bg} w-[20] h-[20] rounded items-center border-2 border-primary-500`}
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

  const logout = async (deleteAccount: boolean) => {
    await resetStore();
    if (deleteAccount) {
      try {
        await request("DELETE", "/auth/user", undefined, jwt);
      } catch (err: any) {
        console.log("ERROR!", err.message);
      }
    }
    router.replace("/");
  };

  return (
    <ScrollContainer syncState>
      <Section className="absolute top-[10px] left-[25%]">
        <Checkbox
          label="Use imperial units"
          value={useImperial}
          handleToggle={() =>
            updateUserData({ useImperial: !useImperial }, true)
          }
        />

        <Pressable
          className="bg-warning-500 p-2 rounded"
          onPress={() => logout(false)}
        >
          <Text className="text-default-background text-center">Logout</Text>
        </Pressable>

        <Pressable
          className="bg-error-500 p-2 rounded"
          onPress={() => logout(true)}
        >
          <Text className="text-default-background text-center">
            Delete account
          </Text>
        </Pressable>

        <Text className="text-center mt-2"> Athena, © Abigail A. 2025- </Text>
      </Section>
    </ScrollContainer>
  );
}
