import { useState } from "react";
import * as Crypto from "expo-crypto";
import { useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { Redirect } from "expo-router";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { Container, Card } from "@/components/container";
import { Button, Input } from "@/components/elements";

export default function Index() {
  // TODO: what to do when the jwt expires?
  const store = useStore();
  const authenticated = store.jwt.length > 0;

  const [isLogin, setIsLogin] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      const jwtJson = await request("POST", endpoint, body);
      const payload = {
        page: 0, includeSettings: true,
        includeTemplates: true, includeWorkouts: true,
        includeTags: true, includeTaggedDates: true,
      };
      const dataJson = await request("POST", "/auth/userInfo", payload, jwtJson.jwt);
      store.setAllData(jwtJson.jwt, dataJson);
    } catch (err: any) {
      setErrMsg(err.message);
    }
  };

  if (authenticated) return <Redirect href="/exercise" />;

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

            <Input text={email} placeholder="Email"
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
