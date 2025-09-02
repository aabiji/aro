import { useState } from "react";
import { TagInfo, useStore } from "@/lib/state";
import { request } from "@/lib/utils";

import { FlatList, Pressable, Text, View } from "react-native";
import ColorPicker, { Panel3 } from "reanimated-color-picker";
import { Popup } from "@/components/container";
import { Button, Input } from "@/components/elements";

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
      ${selected ? "border-neutral-400" : "border-neutral-200"} bg-surface-color`
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
            showPicker(event.nativeEvent.locationX, event.nativeEvent.locationY)
          }
          style={{
            backgroundColor: tag.color,
            borderRadius: "50%",
            width: pickerSize,
            height: pickerSize,
          }}>
        </Pressable>

        {editable ? (
          <Input text={tag.name} setText={setName} placeholder="Tag name" />
        ) : (
          <Text className={`ml-2 text-base ${selected ? "font-bold" : ""}`}>
            {tag.name}
          </Text>
        )}

        {editable && (
          <Button icon="trash-outline" transparent iconSize={20}
            iconColor="red" onPress={removeTag} className="ml-auto" />
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
    console.log(x, y);
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
        <View className="flex-row justify-between w-[95%] m-auto">
          <Text className="text-xl">Manage tags</Text>
          <Button icon="add" transparent iconColor="black"
            onPress={() => updateTag("New tag", -1)} />
        </View>

        {Object.keys(store.tags).length == 0 && (
          <Text className="text-center mt-4 text-base text-neutral-400"> No tags </Text>
        )}

        <FlatList
          data={Object.values(store.tags)} className="w-[95%] m-auto"
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
