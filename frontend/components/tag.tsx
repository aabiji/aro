import { useState } from "react";
import { TagInfo, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import ColorPicker, { Panel3 } from "reanimated-color-picker";
import { Popup } from "@/components/container";

import Ionicons from "@expo/vector-icons/Ionicons";

interface TagProps {
  tag: TagInfo;
  selected?: boolean;
  setSelected?: () => void;
  setColor?: (color: string) => void;
  setName?: (name: string) => void;
  showPicker?: (mouseX: number, mouseY: number) => void;
  removeTag?: () => void;
}

export function Tag({ tag, selected, setSelected, showPicker, setName, removeTag }: TagProps) {
  const editable =
    setName !== undefined && showPicker !== undefined && removeTag !== undefined;

  const style = !editable
    ? `
      p-2 border-2 rounded-xl w-fit h-fit flex-row items-center cursor-pointer
      ${selected ? "border-neutral-400" : "border-neutral-200"}`
    : `w-[100%] p-2 border-b border-t border-neutral-200`;
  const pickerSize = editable ? 30 : 25;

  return (
    <Pressable className={style}
      onPress={() => {
        if (!showPicker && !editable) setSelected();
      }}>
      <View className="relative h-fit flex-row gap-2 items-center">
        <Pressable
          disabled={!editable} className="border-1 border-neutral-200"
          onPress={(event) =>
            showPicker(event.nativeEvent.pageX, event.nativeEvent.pageY)
          }
          style={{
            backgroundColor: tag.color,
            borderRadius: "50%",
            width: pickerSize,
            height: pickerSize,
          }}>
        </Pressable>

        {editable ? (
          <TextInput
            className="flex-1 text-base bg-default-background rounded-sm px-3 py-1 outline-none"
            value={tag.name} onChangeText={(value) => setName(value)} />
        ) : (
          <Text className={`ml-2 text-base ${selected ? "font-bold" : ""}`}>
            {tag.name}
          </Text>
        )}

        {editable && (
          <Pressable onPress={removeTag} className="ml-auto">
            <Ionicons name="trash-outline" color="red" size={20} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export function TagManager({ visible, close }: { visible: boolean; close: () => void }) {
  const store = useStore();

  const [showPicker, setShowPicker] = useState(false);
  const [currentTag, setCurrentTag] = useState(-1);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  const showTagPicker = (x: number, y: number, id: number) => {
    setShowPicker(true);
    setCurrentTag(id);
    setPickerPos({ x, y });
  };

  const updateTag = async (name: string, id: number) => {
    if (id === -1) {
      // create tag
      try {
        const body = { tags: [{ name, color: "#000000" }] };
        const json = await request("POST", "/auth/tag", body, store.jwt);
        store.upsertTag(json.tags[0]);
      } catch (err: any) {
        console.log(err.message);
      }
      return;
    }

    store.upsertTag({ id, name });
  };

  const deleteTag = async (id: number) => {
    try {
      await request("DELETE", `/auth/tag?id=${id}`, undefined, store.jwt);
      store.removeTag(id);
    } catch (err: any) {
      console.log(err.message);
    }
    // TODO: remove tag from tagged dates efficiently
  };

  return (
    <Popup visible={visible} close={close}>
      <View>
        <View className="flex-row justify-between w-[55%] m-auto">
          <Text className="text-xl">Manage tags</Text>

          <Pressable onPress={() => updateTag("New tag", -1)}>
            <Ionicons name="add" size={25} color="black" />
          </Pressable>
        </View>

        {Object.keys(store.tags).length == 0 && (
          <Text className="text-center mt-4 text-base text-neutral-400"> No tags </Text>
        )}

        <FlatList
          data={Object.values(store.tags)} className="w-[55%] m-auto"
          renderItem={({ item }) => (
            <Tag
              tag={item}
              showPicker={(mouseX, mouseY) => showTagPicker(mouseX, mouseY, item.id)}
              setName={(name: string) => updateTag(name, item.id)}
              removeTag={() => deleteTag(item.id)}
            />
          )} />

        {showPicker && (
          <View
            style={{
              position: "absolute",
              left: pickerPos.x - 75,
              top: pickerPos.y - 75,
              width: 150, height: 150,
              zIndex: 9999,
            }}
            className="rounded-xl bg-default-background p-2 border-2 border-neutral-200">
            <ColorPicker
              style={{ width: "100%", height: "100%" }}
              onComplete={(color) => {
                store.upsertTag({ id: currentTag, color: color.hex });
                setShowPicker(false);
              }}>
              <Panel3 thumbSize={15} />
            </ColorPicker>
          </View>
        )}
      </View>
    </Popup>
  );
}
