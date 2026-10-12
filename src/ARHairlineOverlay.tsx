import React, { useRef } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

type Props = {
  onClose: () => void;
  onCapture: (uri: string) => void;
};

export default function ARHairlineOverlay({ onClose, onCapture }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const takePhoto = async () => {
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.85, mirror: true });
      if (photo?.uri) onCapture(photo.uri);
    } catch {
      // Keep the live guide open if the device camera cannot capture.
    }
  };

  if (!permission) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#D8B68A" /><Text style={styles.copy}>Checking camera permission…</Text></SafeAreaView>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>AR hairline guide</Text>
        <Text style={styles.copy}>Watfa needs camera access to show a guide over your live camera view.</Text>
        <Pressable style={styles.button} onPress={requestPermission}><Text style={styles.buttonText}>Allow camera</Text></Pressable>
        <Pressable style={styles.backButton} onPress={onClose}><Text style={styles.copy}>Go back</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="front" />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.topPill}><Text style={styles.topPillText}>WATFA · HAIRLINE GUIDE</Text></View>
        <View style={styles.faceGuide}>
          <View style={styles.templeLeft} />
          <View style={styles.templeRight} />
          <View style={styles.hairline}>
            <View style={styles.hairlineSegment1} />
            <View style={styles.hairlineSegment2} />
            <View style={styles.hairlineSegment3} />
            <View style={styles.hairlineSegment4} />
            <View style={styles.hairlineSegment5} />
          </View>
          <View style={styles.centerMark} />
          <Text style={styles.alignLabel}>ALIGN HAIRLINE HERE</Text>
        </View>
        <View style={styles.guideCaption}>
          <Text style={styles.guideTitle}>Position your face in the frame</Text>
          <Text style={styles.copy}>Move the guide manually. This prototype does not auto-track your face.</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <Pressable style={styles.backButton} onPress={onClose}><Text style={styles.copy}>Cancel</Text></Pressable>
        <Pressable style={styles.captureButton} onPress={takePhoto}><View style={styles.captureInner} /></Pressable>
        <View style={styles.controlSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#111211" },
  center: { flex: 1, backgroundColor: "#111211", alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  title: { color: "#F4F0E9", fontSize: 22, fontWeight: "700" },
  copy: { color: "#D0CDC3", fontSize: 12, lineHeight: 18, textAlign: "center" },
  button: { backgroundColor: "#D8B68A", paddingHorizontal: 22, paddingVertical: 13, borderRadius: 12 },
  buttonText: { color: "#1B1A17", fontSize: 12, fontWeight: "800" },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  topPill: { position: "absolute", top: 24, backgroundColor: "rgba(17,18,17,0.78)", borderColor: "rgba(216,182,138,0.6)", borderWidth: 1, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 9 },
  topPillText: { color: "#E4C9A4", fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  faceGuide: { width: 270, height: 360, borderWidth: 1.5, borderColor: "rgba(216,182,138,0.7)", borderRadius: 140, alignItems: "center", justifyContent: "flex-start" },
  hairline: { position: "absolute", top: 94, left: 33, right: 33, height: 3, flexDirection: "row", alignItems: "center" },
  hairlineSegment1: { flex: 1, height: 2, backgroundColor: "#71F4D0", transform: [{ rotate: "-20deg" }], borderRadius: 2 },
  hairlineSegment2: { flex: 1, height: 2, backgroundColor: "#71F4D0", transform: [{ rotate: "-9deg" }], borderRadius: 2 },
  hairlineSegment3: { flex: 1, height: 2, backgroundColor: "#FFFFFF", borderRadius: 2 },
  hairlineSegment4: { flex: 1, height: 2, backgroundColor: "#71F4D0", transform: [{ rotate: "9deg" }], borderRadius: 2 },
  hairlineSegment5: { flex: 1, height: 2, backgroundColor: "#71F4D0", transform: [{ rotate: "20deg" }], borderRadius: 2 },
  templeLeft: { position: "absolute", left: 28, top: 110, width: 18, height: 62, borderLeftWidth: 2, borderColor: "rgba(113,244,208,0.9)", borderRadius: 14 },
  templeRight: { position: "absolute", right: 28, top: 110, width: 18, height: 62, borderRightWidth: 2, borderColor: "rgba(113,244,208,0.9)", borderRadius: 14 },
  centerMark: { position: "absolute", top: 83, width: 8, height: 8, borderRadius: 4, backgroundColor: "#71F4D0" },
  alignLabel: { position: "absolute", top: 110, color: "#71F4D0", fontSize: 9, fontWeight: "800", letterSpacing: 1, backgroundColor: "rgba(17,18,17,0.65)", paddingHorizontal: 7, paddingVertical: 4, overflow: "hidden" },
  guideCaption: { position: "absolute", bottom: 118, left: 24, right: 24, alignItems: "center", backgroundColor: "rgba(17,18,17,0.72)", borderRadius: 14, padding: 13, gap: 5 },
  guideTitle: { color: "#F4F0E9", fontSize: 15, fontWeight: "700" },
  controls: { position: "absolute", bottom: 22, left: 22, right: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { minWidth: 70, alignItems: "center", justifyContent: "center", padding: 12 },
  captureButton: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: "#F4F0E9", alignItems: "center", justifyContent: "center" },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#D8B68A" },
  controlSpacer: { minWidth: 70 },
});
