import { useState } from "react";
import * as Crypto from "expo-crypto";
import { useDispatch, useSelector } from "react-redux";
import { workoutActions, userDataActions } from "@/lib/state";
import { request } from "@/lib/utils";

import { Redirect } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScrollContainer } from "@/components/container";

export default function Index() {
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.userData);
  const [authenticated, setAuthenticated] = useState(userData.jwt.length > 0);
  // TODO: what to do when the jwt expires?

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
      const dataJson = await request("GET", "/user", undefined, jwtJson.jwt);
      dispatch(userDataActions.update({ jwt: jwtJson.jwt, ...dataJson.preferences }));
      dispatch(workoutActions.set(dataJson.workouts));
      setAuthenticated(true);
    } catch (err) {
      setErrMsg(err.message);
    }
  };

  const inputStyle =
    "bg-white outline-blue-400 border-2 border-gray-200\
    placeholder-gray-400 p-2 mb-4 rounded text-base";

  if (authenticated) return <Redirect href="/exercise" />;

  return (
    <ScrollContainer>
      <View className="m-auto w-[65%]">
        <Text className="text-center text-2xl font-bold mb-4">athena</Text>

        <View className="bg-white p-4">
          {errMsg.length > 0 && (
            <Text className="mb-2 text-center text-red-500 text-base">{errMsg}</Text>
          )}

          <TextInput
            value={email}
            placeholder="Email"
            onChangeText={(txt) => setEmail(txt)}
            className={inputStyle}
          />

          <TextInput
            value={password}
            placeholder="Password"
            secureTextEntry
            onChangeText={(txt) => setPassword(txt)}
            className={inputStyle}
          />

          <Pressable
            onPress={auth}
            className="p-3 bg-blue-500 m-auto rounded w-[100%] mb-2"
          >
            <Text className="font-bold text-center text-white text-lg">
              {isLogin ? "Login" : "Create account"}
            </Text>
          </Pressable>

          <Pressable className="m-auto" onPress={toggle}>
            <Text className="text-[15]">{isLogin ? "Create account" : "Login"}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollContainer>
  );
}
