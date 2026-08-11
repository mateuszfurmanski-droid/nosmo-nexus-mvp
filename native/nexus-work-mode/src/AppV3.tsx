import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

type DiscoveryItem = {
  id: string;
  title: string;
  subtitle: string;
  confidence: number;
  reason: string;
  selected: boolean;
  source: "contacts" | "calendar" | "documents" | "photos";
};

const NEXUS_TREE = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/";

export default function AppV3() {
  const [status, setStatus] = useState("READY");
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [workMode, setWorkMode] = useState(false);
  const [bootShown, setBootShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBootShown(true);
      Alert.alert(
        "NEXUS Work Mode is running",
        "This safe-build has started correctly. Tap Start discovery to let Nexus request Android permissions and find work context.",
      );
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const startDiscovery = async () => {
    setStatus("LOADING DISCOVERY");
    try {
      const discovery = await import("./discovery");
      const found: DiscoveryItem[] = [];
      try {
        setStatus("CONTACTS");
        found.push(...await discovery.discoverContacts());
      } catch (error) {
        Alert.alert("Contacts skipped", error instanceof Error ? error.message : "Contacts unavailable");
      }
      try {
        setStatus("CALENDAR");
        found.push(...await discovery.discoverCalendar());
      } catch (error) {
        Alert.alert("Calendar skipped", error instanceof Error ? error.message : "Calendar unavailable");
      }
      setItems(found);
      setStatus("DISCOVERY COMPLETE");
      Alert.alert("Discovery complete", `${found.length} likely work items found. You can now activate Work Mode or scan a work folder.`);
    } catch (error) {
      setStatus("DISCOVERY MODULE ERROR");
      Alert.alert("Nexus diagnostic", error instanceof Error ? error.message : "Discovery module could not load.");
    }
  };

  const scanFolder = async () => {
    setStatus("FOLDER PICKER");
    try {
      const discovery = await import("./discovery");
      const found = await discovery.scanWorkFolder();
      setItems((current) => [...current, ...found]);
      setStatus("FOLDER SCANNED");
      Alert.alert("Folder scanned", `${found.length} likely work files found.`);
    } catch (error) {
      setStatus("FOLDER ERROR");
      Alert.alert("Folder scan", error instanceof Error ? error.message : "Folder access failed or was cancelled.");
    }
  };

  const toggleWorkMode = () => {
    const next = !workMode;
    setWorkMode(next);
    setStatus(next ? "WORK MODE ACTIVE" : "READY");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#030407" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>NEXUS</Text>
            <Text style={styles.title}>Work Mode</Text>
          </View>
          <View style={[styles.badge, workMode && styles.badgeOn]}>
            <Text style={[styles.badgeText, workMode && styles.badgeTextOn]}>{workMode ? "ACTIVE" : "PRIVATE"}</Text>
          </View>
        </View>

        <View style={styles.bootCard}>
          <Text style={styles.kicker}>SAFE BOOT · v0.3</Text>
          <Text style={styles.hero}>Your phone is now in the Nexus entry layer.</Text>
          <Text style={styles.body}>If you can see this screen, the Android app itself has started correctly. Discovery modules load only when you ask for them, so a source failure cannot make the whole app disappear.</Text>
          <Text style={styles.status}>STATUS: {status}</Text>
          <Text style={styles.small}>Boot confirmation: {bootShown ? "OK" : "starting…"}</Text>
        </View>

        <Pressable style={styles.primary} onPress={startDiscovery}>
          <Text style={styles.primaryText}>START DISCOVERY</Text>
          <Text style={styles.primarySub}>Contacts + Calendar permissions</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={scanFolder}>
          <Text style={styles.secondaryText}>CHOOSE + SCAN WORK FOLDER</Text>
          <Text style={styles.secondarySub}>PDF · Office · BIM/CAD · project files</Text>
        </Pressable>

        <Pressable style={[styles.workButton, workMode && styles.workButtonOn]} onPress={toggleWorkMode}>
          <Text style={styles.workText}>{workMode ? "WORK MODE ON" : "TURN WORK MODE ON"}</Text>
        </Pressable>

        <View style={styles.summary}>
          <Text style={styles.summaryBig}>{items.length}</Text>
          <Text style={styles.summaryLabel}>work signals found</Text>
          {items.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSub}>{item.source} · {item.confidence}%</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.link} onPress={() => Linking.openURL(NEXUS_TREE)}>
          <Text style={styles.linkText}>OPEN NEXUS PROJECT WORLD ↗</Text>
        </Pressable>

        <Text style={styles.foot}>NEXUS Work Mode diagnostic safe-build. No private app database is read without an explicit Android permission or picker.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#030407" },
  content: { padding: 20, paddingBottom: 48 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  brand: { color: "#f5c400", fontSize: 14, fontWeight: "900", letterSpacing: 3 },
  title: { color: "#ffffff", fontSize: 30, fontWeight: "900" },
  badge: { borderWidth: 1, borderColor: "#45525f", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  badgeOn: { borderColor: "#f5c400", backgroundColor: "rgba(245,196,0,.12)" },
  badgeText: { color: "#93a0ad", fontWeight: "900", fontSize: 11 },
  badgeTextOn: { color: "#f5c400" },
  bootCard: { borderWidth: 1, borderColor: "rgba(245,196,0,.30)", backgroundColor: "#090d14", padding: 20, borderRadius: 18, marginBottom: 16 },
  kicker: { color: "#f5c400", fontWeight: "900", fontSize: 11, letterSpacing: 1.8, marginBottom: 10 },
  hero: { color: "#fff", fontSize: 28, lineHeight: 32, fontWeight: "900", marginBottom: 12 },
  body: { color: "#aeb8ca", fontSize: 15, lineHeight: 22 },
  status: { color: "#43e4ff", fontWeight: "900", marginTop: 16, fontSize: 12 },
  small: { color: "#718092", marginTop: 6, fontSize: 12 },
  primary: { backgroundColor: "#f5c400", padding: 18, borderRadius: 16, marginBottom: 12 },
  primaryText: { color: "#05070b", fontWeight: "900", fontSize: 18 },
  primarySub: { color: "#3b3200", fontWeight: "700", marginTop: 3 },
  secondary: { borderWidth: 1, borderColor: "rgba(67,228,255,.35)", backgroundColor: "rgba(67,228,255,.06)", padding: 18, borderRadius: 16, marginBottom: 12 },
  secondaryText: { color: "#e9fbff", fontWeight: "900", fontSize: 16 },
  secondarySub: { color: "#8cb5bf", marginTop: 4 },
  workButton: { borderWidth: 1, borderColor: "#3f4b57", padding: 18, borderRadius: 16, marginBottom: 16, alignItems: "center" },
  workButtonOn: { borderColor: "#f5c400", backgroundColor: "rgba(245,196,0,.10)" },
  workText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  summary: { backgroundColor: "#080c12", padding: 18, borderRadius: 16, marginBottom: 14 },
  summaryBig: { color: "#fff", fontWeight: "900", fontSize: 38 },
  summaryLabel: { color: "#8190a0", marginBottom: 10 },
  item: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#17202a" },
  itemTitle: { color: "#fff", fontWeight: "800" },
  itemSub: { color: "#8090a0", marginTop: 2, fontSize: 12 },
  link: { padding: 17, borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,196,0,.30)", alignItems: "center" },
  linkText: { color: "#f5c400", fontWeight: "900" },
  foot: { color: "#667483", fontSize: 11, lineHeight: 16, marginTop: 18, textAlign: "center" },
});
