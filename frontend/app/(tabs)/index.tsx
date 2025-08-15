import { useState } from "react";
import * as Crypto from "expo-crypto";

import { Redirect } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { Selection } from "@/components/select";
import { ScrollContainer } from "@/components/container";

import FemaleIcon from "@/assets/female.svg";
import MaleIcon from "@/assets/male.svg";

export default function Index() {
  //return <Redirect href="/exercise" />;

  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isFemale, setIsFemale] = useState(true);

  /*
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256, password);
  */

  const inputStyle = "bg-white outline-blue-400 border-2 border-gray-200\
    placeholder-gray-400 p-2 mb-4 rounded text-base"

  return (
    <ScrollContainer>
      <View className="m-auto w-[65%]">
        <Text className="text-center text-2xl font-bold mb-4">tracker</Text>

        <View className="bg-white p-4">
          <TextInput
            value={email} placeholder="Email"
            onChangeText={(txt) => setEmail(txt)} className={inputStyle} />

          <TextInput
            value={password} placeholder="Password" secureTextEntry
            onChangeText={(txt) => setPassword(txt)} className={inputStyle} />

          {!isLogin && <TextInput
            value={name} placeholder="Name"
            onChangeText={(txt) => setName(txt)} className={inputStyle} />}

          {!isLogin &&
            <Selection
              className="mb-4"
              choices={["Female", "Male"]} icons={[FemaleIcon, MaleIcon]}
              handleChoice={(index: number) => setIsFemale(index == 0)} />}

          <Pressable className="p-3 bg-blue-500 m-auto rounded w-[100%] mb-2">
            <Text className="font-bold text-center text-white text-lg">
              {isLogin ? "Login" : "Create account"}</Text>
          </Pressable>

          <Pressable
            className="m-auto"
            onPress={() => setIsLogin(!isLogin)}>
            <Text className="text-[15]">
              {isLogin ? "Create account" : "Login"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollContainer>
  );
}
