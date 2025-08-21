import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { eventsActions } from "@/lib/state";
import { formatDate } from "@/lib/utils";

import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { ScrollContainer } from "@/components/container";
import ColorPicker, { Panel3 } from "reanimated-color-picker";

import Feather from "@expo/vector-icons/Feather";

function Tag({ name, color, selected, toggleSelect, setColor, setName, removeTag }) {
  const editable = setName !== undefined && setColor !== undefined && removeTag !== undefined;

  const style = !editable
    ? `
      p-2 border-2 rounded-xl w-fit h-fit flex-row items-center cursor-pointer
      ${selected ? "border-gray-400" : "border-gray-200"}`
    : `w-[100%] border-b border-t border-gray-200 p-2`;

  const pickerContainerStyle = `
    rounded-xl bg-white p-2 w-[150px] h-[150px]
    rounded absolute border-2 border-gray-200
  `;
  const pickerSize = editable ? 30 : 25;

  const [showPicker, setShowPicker] = useState(false);
  const select = () => { if (!showPicker && !editable) toggleSelect(!selected); }

  return (
    <Pressable onPress={select} className={style}>
      <View className="relative h-fit flex-row gap-2 items-center">
        <Pressable
          disabled={!editable}
          onPress={() => setShowPicker(!showPicker)}
          className="border-1 border-gray-200"
          style={{
            backgroundColor: color, borderRadius: "50%",
            width: pickerSize, height: pickerSize
          }}></Pressable>

        {editable
          ? <TextInput
            className="flex-1 text-base bg-white rounded-sm px-3 py-1 outline-none"
            value={name}
            onChangeText={(value) => setName(value)} />
          : <Text className={`ml-2 text-base ${selected ? "font-bold" : ""}`}>
            {name}
          </Text>
        }

        {editable &&
          <Pressable onPress={removeTag} className="ml-auto">
            <Feather name="trash" color="red" size={20} />
          </Pressable>}
      </View>

      {showPicker &&
        <View className={pickerContainerStyle}>
          <ColorPicker
            style={{ width: "100%", height: "100%" }}
            onComplete={(color) => {
              setColor(color.hex);
              setShowPicker(false);
            }}>
            <Panel3 thumbSize={15} />
          </ColorPicker>
        </View>}
    </Pressable>
  );
}

function TagManager({ visible, close }) {
  const dispatch = useDispatch();
  const eventsData = useSelector(state => state.events);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
      <Pressable
        onPress={close}
        className="flex-1"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full h-[50%] absolute bottom-0 bg-neutral-50 shadow-md py-2">
          <View className="flex-row justify-between w-[55%] m-auto">
            <Text className="text-xl">Manage tags</Text>
            <Pressable onPress={() => dispatch(eventsActions.addTag({
              name: "New tag", color: "#ffffff", selected: false,
            }))}>
              <Feather name="plus" size={25} color="black" />
            </Pressable>
          </View>

          {eventsData.tags.length == 0 &&
            <Text className="text-center mt-4 text-base text-gray-400"> No tags </Text>}

          <FlatList
            data={eventsData.tags}
            className="w-[55%] m-auto"
            renderItem={({ item, index }) => (
              <Tag
                name={item.name} color={item.color}
                setColor={(color: string) =>
                  dispatch(eventsActions.updateTag({ tagIndex: index, value: { color } }))}
                setName={(name: string) =>
                  dispatch(eventsActions.updateTag({ tagIndex: index, value: { name } }))}
                removeTag={() => dispatch(eventsActions.removeTag(index))} />
            )} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CalendarTile({ day, date, toggleTile }) {
  const eventsData = useSelector(state => state.events);

  let colors = [];
  if (day !== undefined && eventsData.events[date] !== undefined) {
    for (const tagName of eventsData.events[date]) {
      colors.push(eventsData.tags.find(tag => tag.name == tagName).color);
    }
  }

  return (
    <Pressable
      onPress={toggleTile}
      className="flex-column w-[14.27%] aspect-square border-r border-b border-gray-400">
      {colors.map((color, index) =>
        <View key={index}
          style={{ flex: 1, backgroundColor: color, opacity: 0.5 }} />)}
      {day !== undefined &&
        <Text className="absolute right-[10px] top-[10px]">{day + 1}</Text>}
    </Pressable>
  );
}

export default function EventsPage() {
  const dispatch = useDispatch();
  const eventsData = useSelector(state => state.events);

  const [date, setDate] = useState(new Date());
  const [calendarTiles, setCalendarTiles] = useState([]);

  // udpate the calendar tiles
  useEffect(() => {
    const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const startDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    // mark days in the calendar grid (there's a max of 7 rows)
    let tiles = [];
    for (let i = 0; i < 42; i++) {
      const day = i - startDay;
      tiles.push(i < startDay || day >= length ? undefined : day);
    }

    // remove completely empty week rows
    while (true) {
      if (!tiles.slice(-7).every(v => v === undefined))
        break;
      tiles = tiles.slice(0, tiles.length - 7);
    }

    setCalendarTiles(tiles);
  }, [date, eventsData.tags, eventsData.events]);

  const months = [
    "January", "Febuary", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const changeMonth = (delta: number) => {
    let copy = new Date(date);
    copy.setMonth(copy.getMonth() + delta);
    setDate(copy);
  }

  const [modalVisible, setModalVisible] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(-1);

  const toggleTagSelect = (index: number) => {
    // can only select one at a time
    if (currentSelection != -1) {
      dispatch(eventsActions.updateTag({
        tagIndex: currentSelection,
        value: { selected: !eventsData.tags[currentSelection].selected }
      }));
    }

    const selected = !eventsData.tags[index].selected;
    setCurrentSelection(selected ? index : -1);
    dispatch(eventsActions.updateTag({ tagIndex: index, value: { selected } }));
  }

  // add/remove tag to a calendar date
  const toggleEvent = (index: number) => {
    if (currentSelection == -1 || calendarTiles[index] === undefined) return;

    const startDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const currentDate = new Date(date.getFullYear(), date.getMonth(), index - startDay);

    dispatch(eventsActions.toggleEvent({
      date: formatDate(currentDate),
      value: eventsData.tags[currentSelection].name
    }));
  }

  return (
    <ScrollContainer>
      <View className="flex-row justify-between">
        <Text className="text-xl">Tags</Text>
        <Pressable onPress={() => setModalVisible(true)}>
          <Feather name="command" color="black" size={18} />
        </Pressable>
      </View>

      <View
        className="mb-2 border-b border-gray-200 flex-row items-center flex-wrap h-max-[100px]">
        {eventsData.tags.map((tag, index) =>
          <Tag key={index} name={tag.name} color={tag.color}
            selected={eventsData.tags[index].selected}
            toggleSelect={() => toggleTagSelect(index)} />
        )}
      </View>

      <TagManager visible={modalVisible} close={() => setModalVisible(false)} />

      <View>
        <View className="flex-row justify-between items-center mb-4">
          <Pressable onPress={() => changeMonth(-1)}>
            <Feather name="arrow-left" size={26} color="black" />
          </Pressable>
          <Text className="text-xl">{months[date.getMonth()]}, {date.getFullYear()}</Text>
          <Pressable onPress={() => changeMonth(1)}>
            <Feather name="arrow-right" size={26} color="black" />
          </Pressable>
        </View>

        <View
          className="flex-row flex-wrap border-l border-t border-gray-400">
          {calendarTiles.map((day, index) => {
            const str = day ? formatDate(new Date(date.getFullYear(), date.getMonth(), day)) : "";
            return <CalendarTile day={day} date={str} toggleTile={() => toggleEvent(index)} />;
          })}
        </View>
      </View>
    </ScrollContainer>
  );
}
