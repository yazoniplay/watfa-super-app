import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Canvas } from "@react-three/fiber/native";
import * as THREE from "three";
import * as ImagePicker from "expo-image-picker";
import { AppointmentRow, BarberRow, HaircutHistoryRow, ServiceRow, getConfiguredEndpoint, isSupabaseConfigured, supabase } from "./src/backend";

type HairStyle = {
  id: string;
  name: string;
  description: string;
  topScale: [number, number, number];
  fringe: boolean;
};

const HAIR_STYLES: HairStyle[] = [
  {
    id: "textured",
    name: "Textured crop",
    description: "Short sides · textured top",
    topScale: [0.84, 0.52, 0.78],
    fringe: true,
  },
  {
    id: "curly",
    name: "Curly top",
    description: "Natural volume · low taper",
    topScale: [0.9, 0.65, 0.84],
    fringe: false,
  },
  {
    id: "slick",
    name: "Classic sweep",
    description: "Scissor cut · soft shape",
    topScale: [0.91, 0.43, 0.84],
    fringe: false,
  },
  {
    id: "buzz",
    name: "Buzz cut",
    description: "Uniform · low maintenance",
    topScale: [0.87, 0.24, 0.8],
    fringe: false,
  },
];

function HeadModel({ style, rotation }: { style: HairStyle; rotation: number }) {
  const skin = "#C99170";
  const hair = "#292522";
  const eye = "#211B19";

  return (
    <group rotation={[0, rotation, 0]}>
      {/* A procedural placeholder head: real photo reconstruction comes later. */}
      <mesh position={[0, -0.04, 0]} scale={[0.78, 1.02, 0.72]}>
        <sphereGeometry args={[1, 48, 40]} />
        <meshStandardMaterial color={skin} roughness={0.76} />
      </mesh>

      {/* Ears */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.76, -0.1, 0.02]} scale={[0.16, 0.25, 0.13]}>
          <sphereGeometry args={[1, 24, 20]} />
          <meshStandardMaterial color={skin} roughness={0.82} />
        </mesh>
      ))}

      {/* Hair cap and front fringe */}
      <mesh position={[0, 0.58, -0.005]} scale={style.topScale}>
        <sphereGeometry args={[1, 40, 28]} />
        <meshStandardMaterial color={hair} roughness={0.93} />
      </mesh>
      {style.fringe && (
        <mesh position={[0, 0.42, 0.59]} rotation={[0.15, 0, 0]} scale={[0.57, 0.17, 0.16]}>
          <sphereGeometry args={[1, 28, 20]} />
          <meshStandardMaterial color={hair} roughness={0.96} />
        </mesh>
      )}

      {/* Eyes */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.29, 0.13, 0.635]}>
          <mesh scale={[0.105, 0.052, 0.035]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#F0DCCB" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0, 0.03]} scale={[0.027, 0.033, 0.02]}>
            <sphereGeometry args={[1, 20, 16]} />
            <meshStandardMaterial color={eye} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.075, -0.005]} scale={[0.12, 0.035, 0.035]}>
            <sphereGeometry args={[1, 20, 16]} />
            <meshStandardMaterial color={hair} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Nose */}
      <mesh position={[0, -0.08, 0.72]} rotation={[0.18, 0, 0]} scale={[0.12, 0.2, 0.15]}>
        <sphereGeometry args={[1, 24, 20]} />
        <meshStandardMaterial color="#B97D60" roughness={0.78} />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, -0.39, 0.66]} scale={[0.17, 0.027, 0.025]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#805044" roughness={0.7} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.91, -0.02]} scale={[0.3, 0.38, 0.3]}>
        <cylinderGeometry args={[0.72, 0.88, 1, 24]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
    </group>
  );
}

function ModelStage({ style, rotation, onRotate }: { style: HairStyle; rotation: number; onRotate: (delta: number) => void }) {
  const { width } = useWindowDimensions();
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3,
        onPanResponderMove: (_, gesture) => onRotate(gesture.dx * 0.012),
      }),
    [onRotate],
  );

  return (
    <View style={styles.modelStage} {...panResponder.panHandlers}>
      <View pointerEvents="none" style={styles.modelGlow} />
      <Canvas
        style={{ width: Math.min(width - 44, 390), height: 340 }}
        camera={{ position: [0, 0.05, 4.2], fov: 36 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#171817"]} />
        <ambientLight intensity={1.65} />
        <directionalLight position={[3, 4, 5]} intensity={2.5} />
        <directionalLight position={[-4, 1, -3]} intensity={1.1} color="#D5A879" />
        <Suspense fallback={null}>
          <HeadModel style={style} rotation={rotation} />
        </Suspense>
      </Canvas>
      <View style={styles.dragHint} pointerEvents="none">
        <Text style={styles.dragHintText}>↔  DRAG TO ROTATE</Text>
      </View>
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [mode, setMode] = useState<"Customer" | "Barber">("Customer");
  const [selectedStyle, setSelectedStyle] = useState(HAIR_STYLES[0]);
  const [saved, setSaved] = useState(false);
  const [angleLabel, setAngleLabel] = useState("FRONT");
  const [modelRotation, setModelRotation] = useState(0);
  const [showPlan, setShowPlan] = useState(false);
  const [facePhotoUri, setFacePhotoUri] = useState<string | null>(null);
  const [faceShape, setFaceShape] = useState<"Oval" | "Round" | "Square" | "Heart" | "Not sure">("Not sure");
  const [hairTexture, setHairTexture] = useState<"Straight" | "Wavy" | "Curly" | "Coily" | "Not sure">("Not sure");
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HaircutHistoryRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [generatedPreviewUri, setGeneratedPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSessionEmail(session?.user.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !sessionEmail) { setHistory([]); setAppointments([]); return; }
    void loadAccountData();
  }, [sessionEmail]);

  const loadAccountData = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const [h, a] = await Promise.all([
      supabase.from("haircut_history").select("id,style_name,notes,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("appointments").select("id,starts_at,ends_at,status,payment_status,services(name,price_minor,currency),barber_profiles(shop_name,city)").eq("customer_id", user.id).order("starts_at", { ascending: true }).limit(30),
    ]);
    if (!h.error) setHistory((h.data ?? []) as HaircutHistoryRow[]);
    if (!a.error) setAppointments((a.data ?? []) as unknown as AppointmentRow[]);
  };

  const authenticate = async () => {
    if (!isSupabaseConfigured) { setAccountMessage("Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable accounts."); return; }
    if (!authEmail.trim() || authPassword.length < 8) { setAccountMessage("Enter an email and a password with at least 8 characters."); return; }
    setAuthBusy(true);
    setAccountMessage(null);
    const result = isSignUp
      ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword, options: { data: { display_name: displayName.trim() } } })
      : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
    setAuthBusy(false);
    if (result.error) setAccountMessage(result.error.message);
    else if (isSignUp && !result.data.session) setAccountMessage("Account created. Check your email to confirm, then sign in.");
    else setAccountMessage(isSignUp ? "Account created and signed in." : "Signed in.");
  };

  const signOut = async () => { await supabase.auth.signOut(); setSessionEmail(null); setAccountMessage("Signed out."); };

  const saveCurrentStyle = async () => {
    if (!isSupabaseConfigured || !sessionEmail) { setAccountOpen(true); setAccountMessage("Sign in to save styles to your account."); return; }
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const result = await supabase.from("haircut_history").insert({ user_id: user.id, style_name: selectedStyle.name, notes: "Face shape: " + faceShape + "; hair texture: " + hairTexture });
    if (result.error) Alert.alert("Could not save style", result.error.message);
    else { setSaved(true); await loadAccountData(); Alert.alert("Saved", "Added to your haircut history."); }
  };

  const loadBookingOptions = async () => {
    if (!isSupabaseConfigured) { setBookingMessage("Connect Supabase and add real barber profiles/services first."); return; }
    const [b, s] = await Promise.all([
      supabase.from("barber_profiles").select("user_id,shop_name,bio,city"),
      supabase.from("services").select("id,barber_id,name,description,duration_minutes,price_minor,currency").eq("is_active", true),
    ]);
    if (b.error || s.error) { setBookingMessage(b.error?.message ?? s.error?.message ?? "Could not load services."); return; }
    setBarbers((b.data ?? []) as BarberRow[]);
    setServices((s.data ?? []) as ServiceRow[]);
    setBookingMessage((b.data?.length ?? 0) ? "Choose a barber and service. Availability still needs server-side confirmation." : "No barbers listed yet. Add real barber profiles and services in Supabase.");
  };

  const createBooking = async () => {
    if (!isSupabaseConfigured || !sessionEmail) { setAccountOpen(true); setAccountMessage("Sign in before requesting an appointment."); return; }
    const service = services.find((item) => item.id === selectedService && item.barber_id === selectedBarber);
    const start = new Date(bookingTime);
    if (!service || Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) { setBookingMessage("Choose a barber/service and enter a future date/time, e.g. 2026-12-01T15:30:00+01:00."); return; }
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const end = new Date(start.getTime() + service.duration_minutes * 60000);
    const result = await supabase.from("appointments").insert({ customer_id: user.id, barber_id: selectedBarber, service_id: service.id, starts_at: start.toISOString(), ends_at: end.toISOString(), status: "pending", payment_status: "unpaid" }).select("id").single();
    if (result.error) { setBookingMessage(result.error.message); return; }
    setBookingMessage("Appointment request saved as pending. It is not confirmed until availability is confirmed.");
    await loadAccountData();
    const checkout = getConfiguredEndpoint("CHECKOUT");
    if (checkout && result.data?.id) {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const response = await fetch(checkout, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify({ appointmentId: result.data.id }) });
        const payload = await response.json();
        if (response.ok && typeof payload.url === "string") await Linking.openURL(payload.url);
        else setBookingMessage("Appointment is pending. Checkout failed: " + (payload.error ?? "check endpoint configuration."));
      } catch { setBookingMessage("Appointment is pending, but checkout could not be reached."); }
    }
  };

  const captureFacePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed", "Allow camera access in Android settings to take a face photo. Watfa will not upload it from this screen.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setFacePhotoUri(result.assets[0].uri);
      setRecommendation(null);
      setPreviewMessage(null);
    }
  };

  const getRecommendation = async () => {
    const endpoint = getConfiguredEndpoint("AI_RECOMMEND");
    if (endpoint) {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
          body: JSON.stringify({ faceShape, hairTexture, selectedStyle: selectedStyle.name }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Recommendation service failed.");
        if (typeof payload.recommendation !== "string") throw new Error("Recommendation service returned an invalid response.");
        setRecommendation(payload.recommendation);
        return;
      } catch (error) {
        setPreviewMessage(error instanceof Error ? error.message : "AI recommendation request failed.");
        return;
      }
    }
    const candidates = faceShape === "Round"
      ? ["Textured crop", "Classic sweep"]
      : faceShape === "Square"
        ? ["Curly top", "Classic sweep"]
        : faceShape === "Heart"
          ? ["Textured crop", "Curly top"]
          : faceShape === "Oval"
            ? ["Textured crop", "Curly top", "Classic sweep"]
            : ["Textured crop", "Curly top"];
    const textureNote = hairTexture === "Curly" || hairTexture === "Coily"
      ? "Keep your natural texture and ask the barber to shape the sides around your curl pattern."
      : hairTexture === "Straight"
        ? "Ask for texture on top if you want more movement."
        : "Show your barber a reference photo and confirm how much daily styling you want to do.";
    setRecommendation(candidates.join(" or ") + ". " + textureNote);
  };

  const requestRealisticPreview = async () => {
    const endpoint = getConfiguredEndpoint("AI_PREVIEW");
    if (!endpoint) {
      setPreviewMessage("Add EXPO_PUBLIC_AI_PREVIEW_URL pointing to your secure image-editing backend. No photo was uploaded.");
      return;
    }
    if (!facePhotoUri) {
      setPreviewMessage("Capture a face photo first.");
      return;
    }
    try {
      setPreviewMessage("Uploading your photo to the configured preview service…");
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const body = new FormData();
      body.append("photo", { uri: facePhotoUri, name: "face-photo.jpg", type: "image/jpeg" } as unknown as Blob);
      body.append("style", selectedStyle.name);
      body.append("faceShape", faceShape);
      body.append("hairTexture", hairTexture);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: token ? { Authorization: "Bearer " + token } : undefined,
        body,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Preview generation failed.");
      if (typeof payload.imageUrl !== "string") throw new Error("Preview service must return an imageUrl.");
      setGeneratedPreviewUri(payload.imageUrl);
      setPreviewMessage("Generated preview received. This is an AI visualization, not a guarantee of the final haircut.");
    } catch (error) {
      setPreviewMessage(error instanceof Error ? error.message : "Preview request failed.");
    }
  };

  const chooseAngle = (label: string, degrees: number) => {
    setAngleLabel(label);
    setModelRotation(degrees);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#111211" />
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>W</Text>
            </View>
            <View>
              <Text style={styles.brandName}>WATFA</Text>
              <Text style={styles.brandSub}>AI BARBER STUDIO</Text>
            </View>
          </View>
          <Pressable style={styles.avatarButton} onPress={() => setAccountOpen((value) => !value)}>
            <Text style={styles.avatarInitial}>{sessionEmail ? "✓" : "＋"}</Text>
          </Pressable>
        </View>

        {accountOpen && (
          <View style={styles.featureCard}>
            <Text style={styles.featureEyebrow}>YOUR WATFA ACCOUNT</Text>
            <Text style={styles.featureTitle}>{sessionEmail ? "You're signed in" : (isSignUp ? "Create your account" : "Sign in")}</Text>
            {sessionEmail ? (
              <>
                <Text style={styles.featureDescription}>{sessionEmail}</Text>
                <Pressable style={styles.secondaryButton} onPress={loadAccountData}><Text style={styles.secondaryButtonText}>Refresh saved data</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={signOut}><Text style={styles.secondaryButtonText}>Sign out</Text></Pressable>
                <Text style={styles.fieldLabel}>Saved haircut history</Text>
                {history.length ? history.map((item) => <View key={item.id} style={styles.historyRow}><Text style={styles.historyName}>{item.style_name}</Text><Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString()}</Text></View>) : <Text style={styles.privacyNote}>No saved styles yet.</Text>}
                <Text style={styles.fieldLabel}>Appointments</Text>
                {appointments.length ? appointments.map((item) => <View key={item.id} style={styles.historyRow}><Text style={styles.historyName}>{item.services?.name ?? "Barber appointment"}</Text><Text style={styles.historyDate}>{new Date(item.starts_at).toLocaleString()} · {item.status} · {item.payment_status}</Text></View>) : <Text style={styles.privacyNote}>No appointments yet.</Text>}
              </>
            ) : (
              <>
                {!isSupabaseConfigured && <Text style={styles.statusMessage}>Add Supabase environment variables to enable accounts.</Text>}
                {isSignUp && <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Display name (optional)" placeholderTextColor="#77786F" style={styles.textInput} autoCapitalize="words" />}
                <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="Email address" placeholderTextColor="#77786F" style={styles.textInput} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Password (8+ characters)" placeholderTextColor="#77786F" style={styles.textInput} secureTextEntry autoCapitalize="none" />
                <Pressable style={styles.primaryButton} disabled={authBusy} onPress={authenticate}><Text style={styles.primaryButtonText}>{authBusy ? "Please wait…" : (isSignUp ? "Create account" : "Sign in")}</Text></Pressable>
                <Pressable onPress={() => { setIsSignUp((value) => !value); setAccountMessage(null); }}><Text style={styles.linkText}>{isSignUp ? "Already have an account? Sign in" : "New to Watfa? Create an account"}</Text></Pressable>
              </>
            )}
            {accountMessage && <Text style={styles.statusMessage}>{accountMessage}</Text>}
          </View>
        )}

        <View style={styles.modeRow}>
          <Text style={styles.eyebrow}>YOUR NEXT LOOK, REIMAGINED</Text>
          <View style={styles.modeSwitch}>
            <Pill label="Customer" active={mode === "Customer"} onPress={() => setMode("Customer")} />
            <Pill label="Barber" active={mode === "Barber"} onPress={() => setMode("Barber")} />
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>{mode === "Customer" ? "Find your next" : "Design the perfect"}</Text>
          <Text style={[styles.title, styles.titleAccent]}>{mode === "Customer" ? "signature cut." : "cut, together."}</Text>
          <Text style={styles.subtitle}>
            {mode === "Customer"
              ? "Explore a new style on a rotatable 3D head."
              : "Preview styles with your client before the first clip."}
          </Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureHeadingRow}>
            <View style={styles.featureHeadingCopy}>
              <Text style={styles.featureEyebrow}>PERSONAL FIT</Text>
              <Text style={styles.featureTitle}>Start with your photo</Text>
              <Text style={styles.featureDescription}>Capture a front-facing photo to prepare for personalized hairstyle tools.</Text>
            </View>
            <View style={styles.featureIcon}><Text style={styles.featureIconText}>◎</Text></View>
          </View>
          {facePhotoUri ? (
            <Image source={{ uri: facePhotoUri }} style={styles.facePhoto} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>＋</Text>
              <Text style={styles.photoPlaceholderText}>No photo captured</Text>
            </View>
          )}
          <Pressable style={styles.secondaryButton} onPress={captureFacePhoto}>
            <Text style={styles.secondaryButtonText}>{facePhotoUri ? "Retake face photo" : "Open camera"}</Text>
          </Pressable>
          <Text style={styles.privacyNote}>Privacy: this prototype keeps the photo URI in the current app session. It does not upload or save the image to an account.</Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureEyebrow}>STYLE FINDER</Text>
          <Text style={styles.featureTitle}>Get a starting recommendation</Text>
          <Text style={styles.featureDescription}>Choose what best describes you. This is rule-based guidance for now, not an AI analysis of your photo.</Text>
          <Text style={styles.fieldLabel}>Face shape</Text>
          <View style={styles.choiceWrap}>
            {(["Oval", "Round", "Square", "Heart", "Not sure"] as const).map((item) => (
              <Pill key={item} label={item} active={faceShape === item} onPress={() => setFaceShape(item)} />
            ))}
          </View>
          <Text style={styles.fieldLabel}>Hair texture</Text>
          <View style={styles.choiceWrap}>
            {(["Straight", "Wavy", "Curly", "Coily", "Not sure"] as const).map((item) => (
              <Pill key={item} label={item} active={hairTexture === item} onPress={() => setHairTexture(item)} />
            ))}
          </View>
          <Pressable style={styles.primaryButton} onPress={getRecommendation}>
            <Text style={styles.primaryButtonText}>Suggest styles ↗</Text>
          </Pressable>
          {recommendation && <View style={styles.resultPanel}><Text style={styles.resultTitle}>Your starting point</Text><Text style={styles.resultText}>{recommendation}</Text><Text style={styles.privacyNote}>General style ideas only. Face shape is not a measure of attractiveness, and a barber can adapt the cut to your preferences.</Text></View>}
          <Pressable style={styles.secondaryButton} onPress={requestRealisticPreview}>
            <Text style={styles.secondaryButtonText}>Preview on my photo</Text>
          </Pressable>
          {generatedPreviewUri && <Image source={{ uri: generatedPreviewUri }} style={styles.facePhoto} resizeMode="cover" />}
          {previewMessage && <Text style={styles.statusMessage}>{previewMessage}</Text>}
        </View>

        <View style={styles.viewerCard}>
          <View style={styles.viewerTopline}>
            <View style={styles.liveDot} />
            <Text style={styles.viewerLabel}>{angleLabel}</Text>
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>CONCEPT MODEL</Text>
            </View>
          </View>
          <ModelStage style={selectedStyle} rotation={modelRotation} onRotate={setModelRotation} />
          <View style={styles.angleRow}>
            {["Front", "3/4 view", "Side"].map((label) => (
              <Pressable
                key={label}
                onPress={() => chooseAngle(label.toUpperCase(), label === "Front" ? 0 : label === "Side" ? Math.PI / 2 : Math.PI / 4)}
                style={[styles.angleButton, angleLabel === label.toUpperCase() && styles.angleButtonActive]}
              >
                <Text style={[styles.angleText, angleLabel === label.toUpperCase() && styles.angleTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Choose a direction</Text>
            <Text style={styles.sectionSub}>Styles are demo presets for now</Text>
          </View>
          <Pressable onPress={saveCurrentStyle} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{saved ? "♥ Saved" : "♡ Save"}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleList}>
          {HAIR_STYLES.map((style, index) => {
            const active = style.id === selectedStyle.id;
            return (
              <Pressable
                key={style.id}
                onPress={() => {
                  setSelectedStyle(style);
                  setSaved(false);
                }}
                style={[styles.styleCard, active && styles.styleCardActive]}
              >
                <View style={[styles.styleSwatch, { backgroundColor: ["#39302A", "#3A3028", "#4B3B30", "#302B28"][index] }]}>
                  <View style={[styles.swatchHead, { height: style.id === "buzz" ? 37 : style.id === "curly" ? 48 : 43 }]}>
                    <View style={styles.swatchHair} />
                  </View>
                </View>
                <Text style={[styles.styleName, active && styles.styleNameActive]}>{style.name}</Text>
                <Text style={styles.styleDescription}>{style.description}</Text>
                {active && <View style={styles.selectedLine} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {mode === "Barber" && (
          <View style={styles.planCard}>
            <View style={styles.planIcon}><Text style={styles.planIconText}>✂</Text></View>
            <View style={styles.planCopy}>
              <Text style={styles.planTitle}>Barber cut brief</Text>
              <Text style={styles.planDescription}>Build a reviewable plan for the selected style.</Text>
            </View>
            <Pressable style={styles.planAction} onPress={() => setShowPlan((value) => !value)}>
              <Text style={styles.planActionText}>{showPlan ? "Hide" : "Open"}</Text>
            </Pressable>
            {showPlan && (
              <View style={styles.planDetails}>
                <Text style={styles.planStep}>01  Confirm starting length and hair texture.</Text>
                <Text style={styles.planStep}>02  Agree on fade height and side profile.</Text>
                <Text style={styles.planStep}>03  Shape the top to match the chosen reference.</Text>
                <Text style={styles.planNote}>Draft checklist only — not AI-generated or validated cutting instructions.</Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          style={styles.primaryButton}
          onPress={() => mode === "Customer" ? setMode("Barber") : setShowPlan((value) => !value)}
        >
          <Text style={styles.primaryButtonText}>
            {mode === "Customer" ? "Share with a barber" : "Create cut brief"}  ↗
          </Text>
        </Pressable>

        <View style={styles.featureCard}>
          <Text style={styles.featureEyebrow}>FIND YOUR BARBER</Text>
          <Text style={styles.featureTitle}>Book an appointment</Text>
          <Text style={styles.featureDescription}>Browse services from connected barber accounts. Requests stay pending until the barber confirms availability.</Text>
          <Pressable style={styles.primaryButton} onPress={() => { setBookingOpen((value) => !value); if (!bookingOpen) void loadBookingOptions(); }}>
            <Text style={styles.primaryButtonText}>{bookingOpen ? "Close booking" : "Browse barbers ↗"}</Text>
          </Pressable>
          {bookingOpen && (
            <>
              {barbers.map((barber) => <Pressable key={barber.user_id} style={[styles.optionRow, selectedBarber === barber.user_id && styles.optionRowActive]} onPress={() => { setSelectedBarber(barber.user_id); setSelectedService(""); }}><Text style={styles.historyName}>{barber.shop_name}</Text><Text style={styles.historyDate}>{barber.city ?? "Location not listed"}</Text></Pressable>)}
              {services.filter((service) => service.barber_id === selectedBarber).map((service) => <Pressable key={service.id} style={[styles.optionRow, selectedService === service.id && styles.optionRowActive]} onPress={() => setSelectedService(service.id)}><Text style={styles.historyName}>{service.name}</Text><Text style={styles.historyDate}>{service.duration_minutes} min · {(service.price_minor / 100).toFixed(2)} {service.currency}</Text></Pressable>)}
              <TextInput value={bookingTime} onChangeText={setBookingTime} placeholder="Start time: 2026-12-01T15:30:00+01:00" placeholderTextColor="#77786F" style={styles.textInput} autoCapitalize="none" />
              <Pressable style={styles.primaryButton} onPress={createBooking}><Text style={styles.primaryButtonText}>Request appointment</Text></Pressable>
              {bookingMessage && <Text style={styles.statusMessage}>{bookingMessage}</Text>}
              <Text style={styles.privacyNote}>Payments require a trusted checkout endpoint. Never enter card details directly into Watfa.</Text>
            </>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Prototype preview · This is a procedural demo head, not a scan of your face. Haircut previews and cutting plans are not yet AI-generated.
        </Text>
        <View style={styles.footer}>
          <Text style={styles.footerText}>WATFA © 2026</Text>
          <Text style={styles.footerText}>MADE FOR THE CRAFT</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#111211" },
  page: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, maxWidth: 560, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#D8B68A", alignItems: "center", justifyContent: "center" },
  brandMarkText: { color: "#171713", fontSize: 23, fontWeight: "800", letterSpacing: -1 },
  brandName: { color: "#F4F0E9", fontSize: 15, fontWeight: "800", letterSpacing: 3.5 },
  brandSub: { color: "#85857D", fontSize: 9, letterSpacing: 1.8, marginTop: 3 },
  avatarButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "#41413B", alignItems: "center", justifyContent: "center", backgroundColor: "#1C1D1A" },
  avatarInitial: { color: "#D8B68A", fontSize: 14, fontWeight: "700" },
  modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  eyebrow: { color: "#BFA17B", fontSize: 9, fontWeight: "700", letterSpacing: 1.6 },
  modeSwitch: { flexDirection: "row", backgroundColor: "#1B1C19", padding: 3, borderRadius: 12, gap: 2 },
  pill: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9 },
  pillActive: { backgroundColor: "#D8B68A" },
  pillText: { color: "#9B9A91", fontSize: 11, fontWeight: "600" },
  pillTextActive: { color: "#1B1A17" },
  intro: { marginBottom: 22 },
  title: { color: "#F4F0E9", fontSize: 32, lineHeight: 36, fontWeight: "700", letterSpacing: -1.2 },
  titleAccent: { color: "#D8B68A" },
  subtitle: { color: "#A2A198", fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 310 },
  featureCard: { marginTop: 18, backgroundColor: "#191A17", borderColor: "#30312B", borderWidth: 1, borderRadius: 20, padding: 15, gap: 11 },
  featureHeadingRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureHeadingCopy: { flex: 1 },
  featureIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#343027", alignItems: "center", justifyContent: "center" },
  featureIconText: { color: "#D8B68A", fontSize: 25 },
  featureEyebrow: { color: "#BFA17B", fontSize: 9, fontWeight: "800", letterSpacing: 1.6 },
  featureTitle: { color: "#F0ECE4", fontSize: 17, fontWeight: "700", marginTop: 5 },
  featureDescription: { color: "#A2A198", fontSize: 11, lineHeight: 17, marginTop: 5 },
  photoPlaceholder: { height: 150, borderRadius: 13, borderWidth: 1, borderColor: "#383931", borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "#141512" },
  photoPlaceholderIcon: { color: "#D8B68A", fontSize: 30 },
  photoPlaceholderText: { color: "#8F9087", fontSize: 11, marginTop: 6 },
  facePhoto: { width: "100%", height: 260, borderRadius: 13, backgroundColor: "#242520" },
  secondaryButton: { borderColor: "#4A4539", borderWidth: 1, borderRadius: 12, alignItems: "center", paddingVertical: 13, marginTop: 2 },
  secondaryButtonText: { color: "#D8B68A", fontSize: 12, fontWeight: "800" },
  privacyNote: { color: "#7E8076", fontSize: 10, lineHeight: 15, marginTop: 2 },
  fieldLabel: { color: "#D7D2C8", fontSize: 11, fontWeight: "700", marginTop: 3 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  resultPanel: { backgroundColor: "#24231E", borderRadius: 12, padding: 12, gap: 7 },
  resultTitle: { color: "#E3C69D", fontSize: 12, fontWeight: "800" },
  resultText: { color: "#E3DFD5", fontSize: 12, lineHeight: 19 },
  statusMessage: { color: "#C7B08D", fontSize: 11, lineHeight: 17, marginTop: 4 },
  textInput: { color: "#F0ECE4", backgroundColor: "#121310", borderColor: "#3A3B34", borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, fontSize: 12, marginTop: 5 },
  linkText: { color: "#D8B68A", fontSize: 11, fontWeight: "700", textAlign: "center", paddingVertical: 10 },
  historyRow: { borderTopWidth: 1, borderTopColor: "#34352E", paddingVertical: 10, gap: 4 },
  historyName: { color: "#E7E2D8", fontSize: 12, fontWeight: "700" },
  historyDate: { color: "#96968B", fontSize: 10, lineHeight: 15 },
  optionRow: { borderWidth: 1, borderColor: "#36372F", borderRadius: 10, padding: 11, gap: 4, marginTop: 7 },
  optionRowActive: { borderColor: "#D8B68A", backgroundColor: "#28251F" },
  viewerCard: { backgroundColor: "#171817", borderColor: "#2B2C28", borderWidth: 1, borderRadius: 22, padding: 12, overflow: "hidden" },
  viewerTopline: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 5, paddingTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D8B68A" },
  viewerLabel: { color: "#DAD6CC", fontSize: 10, fontWeight: "700", letterSpacing: 1.4, flex: 1 },
  previewBadge: { backgroundColor: "#2A2924", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  previewBadgeText: { color: "#C7B08D", fontSize: 8, fontWeight: "700", letterSpacing: 0.6 },
  modelStage: { height: 340, alignItems: "center", justifyContent: "center", marginTop: 2, overflow: "hidden" },
  modelGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#393126", opacity: 0.24 },
  dragHint: { position: "absolute", bottom: 6, backgroundColor: "#252622", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  dragHintText: { color: "#BDB9AE", fontSize: 9, letterSpacing: 1.2, fontWeight: "700" },
  angleRow: { flexDirection: "row", backgroundColor: "#20211E", borderRadius: 12, padding: 4, gap: 3, marginTop: 1 },
  angleButton: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
  angleButtonActive: { backgroundColor: "#D8B68A" },
  angleText: { color: "#A4A399", fontSize: 11, fontWeight: "600" },
  angleTextActive: { color: "#191915" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 29, marginBottom: 15 },
  sectionTitle: { color: "#F0ECE4", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  sectionSub: { color: "#8F9087", fontSize: 11, marginTop: 5 },
  saveButton: { borderColor: "#393A34", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  saveButtonText: { color: "#D8B68A", fontSize: 11, fontWeight: "700" },
  styleList: { gap: 10, paddingBottom: 5 },
  styleCard: { width: 145, backgroundColor: "#1A1B18", borderColor: "#2B2C27", borderWidth: 1, borderRadius: 15, padding: 8, overflow: "hidden" },
  styleCardActive: { borderColor: "#D8B68A", backgroundColor: "#24221D" },
  styleSwatch: { height: 78, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  swatchHead: { width: 42, borderRadius: 23, backgroundColor: "#C99170", alignItems: "center", overflow: "hidden" },
  swatchHair: { width: 43, height: 17, borderRadius: 15, backgroundColor: "#292522", marginTop: -2 },
  styleName: { color: "#DAD6CD", fontSize: 12, fontWeight: "700" },
  styleNameActive: { color: "#E3C69D" },
  styleDescription: { color: "#929188", fontSize: 9, marginTop: 5, lineHeight: 13 },
  selectedLine: { height: 2, backgroundColor: "#D8B68A", borderRadius: 1, marginTop: 9 },
  planCard: { marginTop: 20, backgroundColor: "#1C1D19", borderColor: "#35352E", borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  planIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#343027", alignItems: "center", justifyContent: "center" },
  planIconText: { color: "#D8B68A", fontSize: 19 },
  planCopy: { flex: 1, minWidth: 130 },
  planTitle: { color: "#F0ECE4", fontSize: 12, fontWeight: "700" },
  planDescription: { color: "#9C9C91", fontSize: 10, marginTop: 4 },
  planAction: { backgroundColor: "#D8B68A", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  planActionText: { color: "#1A1916", fontSize: 10, fontWeight: "800" },
  planDetails: { width: "100%", borderTopWidth: 1, borderTopColor: "#36362F", paddingTop: 12, gap: 9 },
  planStep: { color: "#D7D2C8", fontSize: 11, lineHeight: 17 },
  planNote: { color: "#C8A97F", fontSize: 10, lineHeight: 15, marginTop: 3 },
  primaryButton: { backgroundColor: "#D8B68A", borderRadius: 14, alignItems: "center", paddingVertical: 16, marginTop: 22 },
  primaryButtonText: { color: "#1B1A17", fontSize: 13, fontWeight: "800", letterSpacing: 0.2 },
  disclaimer: { color: "#77786F", fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 15, paddingHorizontal: 6 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 25, paddingTop: 15, borderTopWidth: 1, borderTopColor: "#292A26" },
  footerText: { color: "#6E7067", fontSize: 8, fontWeight: "700", letterSpacing: 1.2 },
});