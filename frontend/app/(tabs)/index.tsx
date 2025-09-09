import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import { useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { Image } from "expo-image";
import { Text, View } from "react-native";
import { Container, Card, Button, Input } from "@/components/elements";

export default function Index() {
  const store = useStore();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const syncUserData = async (jwt: string) => {
    const payload = {
      page: 0,
      getSettings: true,
      getTemplates: true,
      getWorkouts: true,
      getPeriodDays: true,
      getWeightEntries: true,
      unixTimestamp: store.lastUpdateTime,
    };
    try {
      const json = await request("POST", "/auth/user", payload, jwt);
       store.updateUserData(jwt, json);
      router.replace("/food");
    } catch (err: any) {
      console.log("ERROR!", err);
      // do nothing, since failing this request
      // (because of an invalid jwt or something)
      // should prompt the user to reauthenticate anyways
      // TODO: redirect to network error page in case of that
    }
  };

  useEffect(() => {
    if (store.jwt.length > 0)
      syncUserData(store.jwt);
  }, []);

  const toggle = () => {
    setIsLogin(!isLogin);
    setErrMsg("");
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrMsg("Invalid email");
      return false;
    }

    const pwRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
    const passwordValid = password.length >= 8 && pwRegex.test(password);
    if (!passwordValid) {
      setErrMsg(
        "Password must include a number, special character, and be 8+ characters",
      );
      return false;
    }

    setErrMsg("");
    return true;
  };

  const auth = async () => {
    if (!validateForm()) return;

    const passwordHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password,
    );
    const body = { email, password: passwordHash };
    const endpoint = isLogin ? "/login" : "/signup";

    try {
      const json = await request("POST", endpoint, body);
      syncUserData(json.jwt);
    } catch (err: any) {
      setErrMsg(err.message);
    }
  };

  return (
    <Container>
      <View className="flex-1 justify-center">
        <Image
          source={require("@/assets/banner.png")}
          style={{ width: "65%", height: "10%", marginHorizontal: "auto" }} />

        <Card>
          <View className="p-4 flex-column gap-4">
            {errMsg.length > 0 && (
              <Text className="text-center text-error text-base">{errMsg}</Text>
            )}

            <Input text={email} placeholder="Email" className="flex-1"
              setText={(txt: string) => setEmail(txt.trim())} />

            <Input text={password} placeholder="Password" password
              setText={(txt: string) => setPassword(txt.trim())} />

            <Button
              onPress={toggle} className="ml-auto" textStyle="text-xs" transparent
              text={isLogin ? "Create account" : "Login"} />

            <Button onPress={auth} text={isLogin ? "Login" : "Create account"} />
          </View>
        </Card>
      </View>
    </Container>
  );
}
