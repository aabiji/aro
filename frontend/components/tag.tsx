import { useState } from "react";
import { TagInfo, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import ColorPicker, { Panel3 } from "reanimated-color-picker";

import Feather from "@expo/vector-icons/Feather";

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
      ${selected ? "border-gray-400" : "border-gray-200"}`
    : `w-[100%] p-2 border-b border-t border-gray-200`;
  const pickerSize = editable ? 30 : 25;

  return (
    <Pressable className={style}
      onPress={() => { if (!showPicker && !editable) setSelected() }}>
      <View className="relative h-fit flex-row gap-2 items-center">
        <Pressable
          disabled={!editable}
          onPress={(event) =>
            showPicker(event.nativeEvent.pageX, event.nativeEvent.pageY)
          }
          className="border-1 border-gray-200"
          style={{
            backgroundColor: tag.color,
            borderRadius: "50%",
            width: pickerSize,
            height: pickerSize,
          }}
        ></Pressable>

        {editable ? (
          <TextInput
            className="flex-1 text-base bg-white rounded-sm px-3 py-1 outline-none"
            value={tag.name}
            onChangeText={(value) => setName(value)}
          />
        ) : (
          <Text className={`ml-2 text-base ${selected ? "font-bold" : ""}`}>
            {tag.name}
          </Text>
        )}

        {editable && (
          <Pressable onPress={removeTag} className="ml-auto">
            <Feather name="trash" color="red" size={20} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export function TagManager({ visible, close }: { visible: boolean; close: () => void }) {
  const { jwt, tags, removeTag, upsertTag } = useStore();

  const [showPicker, setShowPicker] = useState(false);
  const [currentTag, setCurrentTag] = useState(-1);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  const showTagPicker = (x: number, y: number, id: number) => {
    setShowPicker(true);
    setCurrentTag(id);
    setPickerPos({ x, y });
  };

  const updateTag = async (name: string, id: number) => {
    if (id == -1) { // create tag
      try {
        const t = { name, color: "#000000" };
        const json = await request("POST", "/auth/tag", t, jwt);
        upsertTag(json.tag);
      } catch (err: any) {
        console.log(err.message);
      }
      return;
    }

    upsertTag({ id, name });
    // TODO: unified way to sync tag updates??
  }

  const deleteTag = async (id: number) => {
    try {
      await request("DELETE", `/auth/tag?id=${id}`, undefined, jwt);
      removeTag(id);
    } catch (err: any) {
      console.log(err.message);
    }
    // TODO: remove tag from tagged dates efficiently
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <Pressable
        onPress={close}
        className="flex-1"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", cursor: "default" }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full h-[50%] absolute bottom-0 bg-neutral-50 shadow-md py-2 cursor-default"
        >
          <View className="flex-row justify-between w-[55%] m-auto">
            <Text className="text-xl">Manage tags</Text>
            <Pressable onPress={() => updateTag("New tag", -1)}>
              <Feather name="plus" size={25} color="black" />
            </Pressable>
          </View>

          {Object.keys(tags).length == 0 && (
            <Text className="text-center mt-4 text-base text-gray-400"> No tags </Text>
          )}

          <FlatList
            data={Object.values(tags)}
            className="w-[55%] m-auto"
            renderItem={({ item }) => (
              <Tag
                tag={item}
                showPicker={(mouseX, mouseY) => showTagPicker(mouseX, mouseY, item.id)}
                setName={(name: string) => updateTag(name, item.id)}
                removeTag={() => deleteTag(item.id)}
              />
            )}
          />
        </Pressable>
      </Pressable>

      {showPicker && (
        <View
          style={{
            position: "absolute",
            left: pickerPos.x - 75,
            top: pickerPos.y - 75,
            width: 150,
            height: 150,
            zIndex: 9999,
          }}
          className="rounded-xl bg-white p-2 border-2 border-gray-200"
        >
          <ColorPicker
            style={{ width: "100%", height: "100%" }}
            onComplete={(color) => {
              upsertTag({ id: currentTag, color: color.hex });
              setShowPicker(false);
            }}>
            <Panel3 thumbSize={15} />
          </ColorPicker>
        </View>
      )}
    </Modal>
  );
}
