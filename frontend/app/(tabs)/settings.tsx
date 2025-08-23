import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { userDataActions, workoutActions } from "@/lib/state";
import { useFocusEffect, useRouter } from "expo-router";
import { persistor } from "@/lib/storage";
import { request } from "@/lib/utils";

import { Pressable, Text, View } from "react-native";
import { ScrollContainer } from "@/components/container";

import Feather from "@expo/vector-icons/Feather";

function Checkbox({ label, handleToggle, value }) {
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
  const router = useRouter();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.userData);
  const [deleted, setDeleted] = useState(false);

  const deleteAccount = async () => {
    try {
      await request("DELETE", "/auth/user", undefined, userData.jwt);
      await persistor.purge();
      setDeleted(true);
      router.replace("/");
    } catch (err) {
      console.log("ERROR!", err.message);
    }
  };

  const syncSettings = async () => {
    try {
      const body = { ...userData };
      delete body.jwt;
      await request("POST", "/auth/user", body, userData.jwt);
    } catch (err) {
      console.log("ERROR!", err.message);
    }
  };

  useFocusEffect(
    useCallback(() => { return () => { if (!deleted) syncSettings(); }; }, [deleted]),
  );

  return (
    <ScrollContainer>
      <Checkbox
        label="Use imperial units"
        value={userData.use_imperial}
        handleToggle={() =>
          dispatch(userDataActions.update({ use_imperial: !userData.use_imperial }))
        }
      />

      <Pressable className="bg-red-500 p-2 rounded" onPress={() => deleteAccount()}>
        <Text className="text-white text-center"> Delete account </Text>
      </Pressable>

      <Text className="text-center mt-2"> Athena, © Abigail A. 2025- </Text>
    </ScrollContainer>
  );
}
