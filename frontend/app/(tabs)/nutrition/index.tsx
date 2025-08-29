import { useState } from "react";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { request } from "@/lib/utils";

import { Card, Container } from "@/components/container";
import { Platform, Pressable, Text, View } from "react-native";

export default function SearchPage() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <Container>
        <Card>
          <Text>We need your permission to use the camera</Text>
          <Pressable onPress={requestPermission} className="bg-primary-500 text-white p-2 text-xl">
            <Text>Grant permission</Text>
          </Pressable>
        </Card>
      </Container>
    );
  }

  const handleBarcode = async (result: BarcodeScanningResult) => {
    console.log(result.data);

    // TODO: change to .org
    const url = `https://world.openfoodfacts.net/api/v2/product/${result.data}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `aro - ${Platform.OS} - Version 2.1 - https://aro.com - scan`,
      },
    });
    const json = await response.json();
    console.log(response.status, response.ok, json);

    //try {
    //  const json = await request("GET", `/nutrition?barcode=${result.data}`, undefined, undefined);
    //} catch (err: any) {
    //  console.log("ERROR!", err);
    //}

    CameraView.dismissScanner();
  };

  return (
    <Container>
      <Pressable
        className="bg-primary-500 text-white p-2 text-xl"
        onPress={() => CameraView.launchScanner()}>
        <Text>Open barcode scanner</Text>
      </Pressable>
      <CameraView
        className="flex-1"
        onBarcodeScanned={handleBarcode}
        enableTorch={true} />
    </Container>
  );
}
