import { Text, TextInput, View } from "react-native";

interface InputProps {
  num: number;
  setNum: (n: number) => void;
  label?: string;
  disabled?: boolean;
}

export default function NumInput({ num, setNum, label, disabled }: InputProps) {
  const update = (value: string) => {
    if (/\D/.test(value)) return; // can't have non numeric chars
    setNum(Number(value));
  };

  return (
    <View className="items-center flex-row">
      <TextInput
        editable={disabled !== undefined ? !disabled : true}
        inputMode="numeric"
        value={String(num)}
        placeholder="0"
        onChangeText={update}
        maxLength={4}
        className="bg-neutral-100 rounded-sm px-2 py-1 outline-none inline-block w-[50px] text-center"
      />
      {label && <Text className="ml-2">{label}</Text>}
    </View>
  );
}
