import { useState } from "react";
import * as Crypto from "expo-crypto";
import { useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { Redirect } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { Container, Card } from "@/components/container";

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

  const inputStyle =
    "bg-default-background outline-primary-400 border-2 border-neutral-200\
    placeholder-neutral-400 p-2 mb-4 rounded text-base";

  if (authenticated) return <Redirect href="/exercise" />;

  return (
    <Container>
      <Card className="">
        <Text className="text-center text-2xl font-bold">aro</Text>

        <View className="bg-default-background p-4">
          {errMsg.length > 0 && (
            <Text className="mb-2 text-center text-red-500 text-base">{errMsg}</Text>
          )}

          <TextInput
            value={email} placeholder="Email" autoCapitalize="none"
            onChangeText={(txt: string) => setEmail(txt)}
            className={inputStyle} />

          <TextInput
            value={password} placeholder="Password"
            secureTextEntry autoCapitalize="none"
            onChangeText={(txt: string) => setPassword(txt)}
            className={inputStyle} />

          <Pressable
            onPress={auth}
            className="p-3 bg-primary-500 m-auto rounded w-[100%] mb-2">
            <Text className="font-bold text-center text-white text-lg">
              {isLogin ? "Login" : "Create account"}
            </Text>
          </Pressable>

          <Pressable className="m-auto" onPress={toggle}>
            <Text className="text-[15px] text-default-font">{isLogin ? "Create account" : "Login"}</Text>
          </Pressable>
        </View>
      </Card>
    </Container>
  );
}
