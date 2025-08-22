import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { tagActions, TagInfo } from "@/lib/state";

import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import ColorPicker, { Panel3 } from "reanimated-color-picker";

import Feather from "@expo/vector-icons/Feather";

interface TagProps {
  tag: TagInfo;
  setSelected?: (value: boolean) => void;
  setColor?: (color: string) => void;
  setName?: (name: string) => void;
  showPicker?: (mouseX: number, mouseY: number) => void;
  removeTag?: () => void;
}

export function Tag({ tag, setSelected, showPicker, setName, removeTag }: TagProps) {
  const editable = setName !== undefined && showPicker !== undefined && removeTag !== undefined;

  const select = () => { if (!showPicker && !editable) setSelected(!tag.selected); }

  const style = !editable
    ? `
      p-2 border-2 rounded-xl w-fit h-fit flex-row items-center cursor-pointer
      ${tag.selected ? "border-gray-400" : "border-gray-200"}`
    : `w-[100%] p-2 border-b border-t ${tag.problematic ? "border-red-500" : "border-gray-200"}`;
  const pickerSize = editable ? 30 : 25;

  return (
    <Pressable onPress={select} className={style}>
      <View className="relative h-fit flex-row gap-2 items-center">
        <Pressable
          disabled={!editable}
          onPress={(event) => showPicker(event.nativeEvent.pageX, event.nativeEvent.pageY)}
          className="border-1 border-gray-200"
          style={{
            backgroundColor: tag.color, borderRadius: "50%",
            width: pickerSize, height: pickerSize
          }}></Pressable>

        {editable
          ? <TextInput
            className="flex-1 text-base bg-white rounded-sm px-3 py-1 outline-none"
            value={tag.name}
            onChangeText={(value) => setName(value)} />
          : <Text className={`ml-2 text-base ${tag.selected ? "font-bold" : ""}`}>
            {tag.name}
          </Text>}

        {editable &&
          <Pressable onPress={removeTag} className="ml-auto">
            <Feather name="trash" color="red" size={20} />
          </Pressable>}
      </View>
    </Pressable>
  );
}

export function TagManager({ visible, close }: { visible: boolean, close: () => void }) {
  const dispatch = useDispatch();
  const tagData = useSelector(state => state.tagData);

  const [showPicker, setShowPicker] = useState(false);
  const [tagIndex, setTagIndex] = useState(-1);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  const showTagPicker = (x: number, y: number, index: number) => {
    setShowPicker(true);
    setTagIndex(index);
    setPickerPos({ x, y });
  }

  const updateTag = (name: string, index: number) => {
    // cannot have duplicates
    const problematic = tagData.tags.findIndex(tag => tag.name == name.trim()) != -1;

    if (index == -1) {
      dispatch(tagActions.addTag({
        name, color: "#000000",
        selected: false, problematic
      }));
    } else {
      dispatch(tagActions.updateTag({
        tagIndex: index, value: { name, problematic }
      }));
    }
  }

  const handleClose = () => {
    const invalid = tagData.tags.findIndex(tag => tag.problematic) != -1;
    if (!invalid) close();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <Pressable
        onPress={handleClose}
        className="flex-1"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", cursor: "default" }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full h-[50%] absolute bottom-0 bg-neutral-50 shadow-md py-2 cursor-default">
          <View className="flex-row justify-between w-[55%] m-auto">
            <Text className="text-xl">Manage tags</Text>
            <Pressable onPress={() => updateTag("New tag", -1)}>
              <Feather name="plus" size={25} color="black" />
            </Pressable>
          </View>

          {tagData.tags.length == 0 &&
            <Text className="text-center mt-4 text-base text-gray-400"> No tags </Text>}

          <FlatList
            data={tagData.tags}
            className="w-[55%] m-auto"
            renderItem={({ item, index }) => (
              <Tag tag={item}
                showPicker={(mouseX, mouseY) => showTagPicker(mouseX, mouseY, index)}
                setName={(name: string) => updateTag(name, index)}
                removeTag={() => dispatch(tagActions.removeTag(index))} />
            )} />
        </Pressable>
      </Pressable>

      {showPicker &&
        <View
          style={{
            position: "absolute", left: pickerPos.x - 75,
            top: pickerPos.y - 75, width: 150, height: 150,
            zIndex: 9999,
          }}
          className="rounded-xl bg-white p-2 border-2 border-gray-200">
          <ColorPicker
            style={{ width: "100%", height: "100%" }}
            onComplete={(color) => {
              dispatch(tagActions.updateTag({
                tagIndex: tagIndex, value: { color: color.hex }
              }));
              setShowPicker(false);
            }}>
            <Panel3 thumbSize={15} />
          </ColorPicker>
        </View>}
    </Modal>
  );
}
