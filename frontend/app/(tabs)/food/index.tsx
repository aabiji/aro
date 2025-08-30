import { useEffect, useRef, useState } from "react";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { request } from "@/lib/utils";

import { Card, Container } from "@/components/container";
import { Platform, Pressable, Text, View } from "react-native";
import { Svg, Polygon } from "react-native-svg";

export default function SearchPage() {
  const [permission, requestPermission] = useCameraPermissions();
  const [outlinePoints, setOutlinePoints] = useState([]);
  const [barcode, setBarcode] = useState("");
  let timeout = useRef(null);

  const handleBarcode = async (result: BarcodeScanningResult) => {
    setBarcode(result.data);
    console.log(result.data)
    setOutlinePoints(result.cornerPoints ?? []);

    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      setBarcode("");
      setOutlinePoints([]);
    }, 1000);
  }

  useEffect(() => {
    return () => { if (timeout.current) clearTimeout(timeout.current); }
  }, []);

  const searchFood = async () => {
    try {
      const url = `/food/barcode?barcode=${barcode}&os=${Platform.OS}`;
      const json = await request("GET", url, undefined, undefined);
      console.log(json.food); // TODO: handle the result!
    } catch (err: any) {
      if (err.msg === "Food not found")
        console.log(":(");
      else
        console.log("ERROR!", err);
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <Container>
        <Card>
          <Text>We need your permission to use the camera</Text>
          <Pressable onPress={requestPermission} className="bg-primary-500 p-2">
            <Text className="text-center text-white">Grant permission</Text>
          </Pressable>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <View style={{ flex: 1 }}>
        <CameraView style={{ height: "78%" }} onBarcodeScanned={handleBarcode} />
        <Pressable style={{ height: "20%" }}
          onPress={() => searchFood()}
          className="disabled:bg-neutral-500 bg-primary-500 w-[100%] p-2"
          disabled={outlinePoints.length === 0} >
          <Text className="text-white text-center">Search barcode</Text>
        </Pressable>
      </View>

      {outlinePoints.length > 0 && (
        <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <Polygon
            points={outlinePoints.map(p => `${p.x},${p.y}`).join(" ")}
            fill="rgba(0, 0, 0, 0)" stroke="lime" strokeWidth="1" />
        </Svg>
      )}
    </Container>
  );
}
