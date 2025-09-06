import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { resetStore, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { Text, View } from "react-native";
import { Container, Card, Button, Checkbox } from "@/components/elements";

export default function Settings() {
  const store = useStore();
  const router = useRouter();

  const toggleUnits = async () => {
    store.updateUserData({ useImperial: !store.useImperial });
    const url = `/auth/settings?imperial=${store.useImperial}`;
    try {
      await request("POST", url, undefined, store.jwt);
    } catch (err: any) {
      console.log(err)
    }
  }

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
    <Container>
      <Card>
        <Checkbox label="Use imperial units" value={store.useImperial} handleToggle={toggleUnits} />

        <Button text="Give feedback" onPress={sendFeedback} className="mb-2" />

        <View className="flex-row w-full gap-2">
          <Button text="Logout" onPress={() => logout(false)} className="bg-warning flex-1" />
          <Button text="Delete account" onPress={() => logout(true)} className="bg-error flex-1" />
        </View>

        <Text className="text-center mt-2 text-xs text-grey-400">© aro, 2025 - now</Text>
      </Card>
    </Container>
  );
}
