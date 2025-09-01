import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { resetStore, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { Container, Card } from "@/components/container";

import Ionicons from "@expo/vector-icons/Ionicons";

function Checkbox({ label, handleToggle, value }: {
  label: string; handleToggle: () => void; value: boolean;
}) {
  const bg = value ? "bg-primary-500" : "bg-default-background";
  return (
    <View className="w-full flex-row justify-between items-center mb-2">
      <Text className="text-base"> {label} </Text>
      <Pressable
        className={`${bg} w-[20] h-[20] rounded items-center border-2 border-primary-500`}
        onPress={() => handleToggle()}>
        {value && <Ionicons name="checkmark-outline" color="white" size={15} />}
      </Pressable>
    </View>
  );
}

export default function Settings() {
  const store = useStore();
  const router = useRouter();

  const logout = async (deleteAccount: boolean) => {
    await resetStore();
    if (deleteAccount) {
      try {
        await request("DELETE", "/auth/user", undefined, store.jwt);
      } catch (err: any) {
        console.log("ERROR!", err.message);
      }
    }
    router.replace("/");
  };

  const sendFeedback = () => {
    const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
    const subject = "I have some feedback...";
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(mailtoUrl);
  };

  return (
    <Container syncState>
      <Card>
        <Checkbox
          label="Use imperial units" value={store.useImperial}
          handleToggle={() => store.updateUserData({ useImperial: !store.useImperial }, true)}
        />

        <Pressable
          onPress={sendFeedback}
          className="bg-primary-500 p-2 rounded mb-2">
          <Text className="text-default-background text-center">Give feedback</Text>
        </Pressable>

        <View className="flex-row w-full gap-2">
          <Pressable className="bg-warning-500 p-2 rounded flex-1" onPress={() => logout(false)}>
            <Text className="text-default-background text-center">Logout</Text>
          </Pressable>

          <Pressable className="bg-error-500 p-2 rounded flex-1" onPress={() => logout(true)}>
            <Text className="text-default-background text-center">Delete account</Text>
          </Pressable>
        </View>

        <Text className="text-center mt-2 text-xs"> aro, © Abigail A. 2025- </Text>
      </Card>
    </Container>
  );
}
