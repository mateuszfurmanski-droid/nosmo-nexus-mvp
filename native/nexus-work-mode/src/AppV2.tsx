import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  discoverCalendar,
  discoverContacts,
  pickDocuments,
  pickPhotos,
  scanWorkFolder,
  type DiscoveryItem,
  type DiscoverySource,
} from "./discovery";
import {
  clearWorkModeState,
  loadWorkModeState,
  saveWorkModeState,
  type AuditEntry,
} from "./storage";

type Screen = "discover" | "review" | "work" | "privacy";

type SourceMeta = {
  title: string;
  detail: string;
  action: string;
};

const SOURCE_META: Record<DiscoverySource, SourceMeta> = {
  contacts: {
    title: "Work contacts",
    detail: "Company, role, business email and construction context.",
    action: "Scan contacts",
  },
  calendar: {
    title: "Work calendar",
    detail: "Projects, site visits, inductions, inspections and meetings.",
    action: "Scan calendar",
  },
  documents: {
    title: "Files + work folder",
    detail: "PDF, Office, BIM/CAD and other project files Android allows Nexus to read.",
    action: "Choose work folder",
  },
  photos: {
    title: "Work photos",
    detail: "Select evidence photos you want Nexus to include in Work Mode.",
    action: "Choose photos",
  },
};

const LIVE = {
  nexus: "https://nosmotechnology.co.uk/nexus.html",
  tree: "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/",
  doorflow: "https://nosmotechnology.co.uk/doorflow.html",
};

function newAudit(action: string, detail: string): AuditEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    action,
    detail,
  };
}

function mergeItems(current: DiscoveryItem[], incoming: DiscoveryItem[]) {
  const map = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, item));
  return [...map.values()].sort((a, b) => b.confidence - a.confidence);
}

export default function AppV2() {
  const [screen, setScreen] = useState<Screen>("discover");
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [workMode, setWorkMode] = useState(false);
  const [activeProject, setActiveProject] = useState("Unassigned work");
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadWorkModeState();
    if (saved) {
      setItems(saved.items);
      setWorkMode(saved.workMode);
      setActiveProject(saved.activeProject);
      setAudit(saved.audit);
      if (saved.workMode) setScreen("work");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveWorkModeState({ workMode, activeProject, items, audit });
  }, [hydrated, workMode, activeProject, items, audit]);

  const selected = useMemo(() => items.filter((item) => item.selected), [items]);
  const counts = useMemo(() => {
    return items.reduce<Record<DiscoverySource, number>>((acc, item) => {
      acc[item.source] += 1;
      return acc;
    }, { contacts: 0, calendar: 0, documents: 0, photos: 0 });
  }, [items]);

  const projectHints = useMemo(() => {
    const labels = new Set<string>();
    selected.forEach((item) => {
      if (!item.projectHint) return;
      if (item.projectHint === "halifax") labels.add("Halifax Project");
      else if (item.projectHint === "riverside") labels.add("Riverside Project");
      else if (item.projectHint === "tesco") labels.add("Tesco Work");
      else labels.add(item.projectHint);
    });
    return [...labels];
  }, [selected]);

  const appendAudit = (action: string, detail: string) => {
    setAudit((current) => [newAudit(action, detail), ...current].slice(0, 100));
  };

  const applyFound = (label: string, found: DiscoveryItem[]) => {
    setItems((current) => mergeItems(current, found));
    appendAudit("DISCOVERY", `${label}: ${found.length} items found.`);
    if (found.length) setScreen("review");
  };

  const runDeviceScan = async () => {
    if (busy) return;
    setBusy("device");
    try {
      let contacts: DiscoveryItem[] = [];
      let calendar: DiscoveryItem[] = [];
      try {
        contacts = await discoverContacts();
      } catch (error) {
        appendAudit("CONTACTS_SKIPPED", error instanceof Error ? error.message : "Contacts unavailable");
      }
      try {
        calendar = await discoverCalendar();
      } catch (error) {
        appendAudit("CALENDAR_SKIPPED", error instanceof Error ? error.message : "Calendar unavailable");
      }
      const found = [...contacts, ...calendar];
      applyFound("Phone scan", found);
      if (!found.length) {
        Alert.alert(
          "No work context found yet",
          "Nexus checked the authorised Contacts and Calendar sources. Add a work folder next — that usually contains the strongest project signals.",
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const runFolderScan = async () => {
    if (busy) return;
    setBusy("folder");
    try {
      const found = await scanWorkFolder();
      applyFound("Work folder", found);
      if (!found.length) Alert.alert("Folder scanned", "No likely work files were found in that folder.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Folder access cancelled or unavailable.";
      appendAudit("FOLDER_SKIPPED", message);
    } finally {
      setBusy(null);
    }
  };

  const runManualFiles = async () => {
    if (busy) return;
    setBusy("files");
    try {
      applyFound("Selected files", await pickDocuments());
    } catch (error) {
      Alert.alert("Files unavailable", error instanceof Error ? error.message : "Could not select files.");
    } finally {
      setBusy(null);
    }
  };

  const runPhotos = async () => {
    if (busy) return;
    setBusy("photos");
    try {
      applyFound("Selected photos", await pickPhotos());
    } catch (error) {
      Alert.alert("Photos unavailable", error instanceof Error ? error.message : "Could not select photos.");
    } finally {
      setBusy(null);
    }
  };

  const toggleItem = (id: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const startWorkMode = () => {
    setWorkMode(true);
    setScreen("work");
    appendAudit("WORK_MODE_ON", `${selected.length} approved work signals. Active context: ${activeProject}.`);
  };

  const setMode = (value: boolean) => {
    setWorkMode(value);
    appendAudit(value ? "WORK_MODE_ON" : "WORK_MODE_OFF", value ? `Active context: ${activeProject}.` : "Work context paused.");
  };

  const openUrl = async (label: string, url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("Android cannot open this link.");
      appendAudit("OPEN", `${label}: ${url}`);
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Cannot open", error instanceof Error ? error.message : `${label} could not be opened.`);
    }
  };

  const chooseProject = (project: string) => {
    setActiveProject(project);
    appendAudit("PROJECT_CONTEXT", `Active project changed to ${project}.`);
  };

  const clearAll = () => {
    Alert.alert(
      "Reset Nexus Work Mode?",
      "This removes Nexus discovery metadata from this phone. It does not delete your contacts, files, photos or calendar events.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            clearWorkModeState();
            setItems([]);
            setAudit([]);
            setWorkMode(false);
            setActiveProject("Unassigned work");
            setScreen("discover");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#030407" />

      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>NEXUS</Text>
          <Text style={styles.product}>Work Mode</Text>
        </View>
        <View style={[styles.status, workMode && styles.statusOn]}>
          <Text style={[styles.statusText, workMode && styles.statusTextOn]}>{workMode ? "WORK" : "PRIVATE"}</Text>
        </View>
      </View>

      <View style={styles.nav}>
        {(["discover", "review", "work", "privacy"] as Screen[]).map((item) => (
          <Pressable key={item} onPress={() => setScreen(item)} style={[styles.navItem, screen === item && styles.navItemOn]}>
            <Text style={[styles.navText, screen === item && styles.navTextOn]}>
              {item === "discover" ? "Discover" : item === "review" ? `Review ${items.length ? `(${items.length})` : ""}` : item === "work" ? "Work" : "Privacy"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {screen === "discover" && (
          <>
            <View style={styles.hero}>
              <Text style={styles.kicker}>PHONE → PROJECT CONTEXT</Text>
              <Text style={styles.heroTitle}>Find the work. Keep the private stuff private.</Text>
              <Text style={styles.body}>
                Nexus scans only sources Android lets you authorise. It identifies likely work contacts, calendar events and project files, then lets you remove wrong matches before Work Mode starts.
              </Text>
              <Pressable style={styles.primary} onPress={runDeviceScan} disabled={Boolean(busy)}>
                <Text style={styles.primaryText}>{busy === "device" ? "Scanning phone…" : "1. Scan contacts + calendar"}</Text>
              </Pressable>
              <Pressable style={styles.primaryAlt} onPress={runFolderScan} disabled={Boolean(busy)}>
                <Text style={styles.primaryAltText}>{busy === "folder" ? "Scanning work folder…" : "2. Choose + scan work folder"}</Text>
              </Pressable>
            </View>

            <Text style={styles.section}>DISCOVERY SOURCES</Text>
            <SourceRow source="contacts" count={counts.contacts} onPress={runDeviceScan} busy={Boolean(busy)} />
            <SourceRow source="calendar" count={counts.calendar} onPress={runDeviceScan} busy={Boolean(busy)} />
            <SourceRow source="documents" count={counts.documents} onPress={runFolderScan} busy={Boolean(busy)} />
            <SourceRow source="photos" count={counts.photos} onPress={runPhotos} busy={Boolean(busy)} />

            <Pressable style={styles.textButton} onPress={runManualFiles} disabled={Boolean(busy)}>
              <Text style={styles.textButtonText}>Or choose individual files</Text>
            </Pressable>

            <View style={styles.info}>
              <Text style={styles.infoTitle}>Android boundary</Text>
              <Text style={styles.infoText}>
                Nexus cannot silently read WhatsApp, Gmail, Work Wallet, Procore or other private app databases. Those become separate authorised connectors. Folder access uses Android's own directory picker.
              </Text>
            </View>
          </>
        )}

        {screen === "review" && (
          <>
            <View style={styles.summary}>
              <Text style={styles.kicker}>DISCOVERY REVIEW</Text>
              <Text style={styles.summaryValue}>{selected.length} approved</Text>
              <Text style={styles.body}>{items.length} discoveries total. Everything is selected by default; tap a row to remove a wrong match.</Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.info}><Text style={styles.infoTitle}>Nothing to review yet.</Text><Text style={styles.infoText}>Run phone discovery or scan a work folder first.</Text></View>
            ) : (
              items.map((item) => <DiscoveryRow key={item.id} item={item} onPress={() => toggleItem(item.id)} />)
            )}

            {items.length > 0 && (
              <Pressable style={styles.primary} onPress={startWorkMode}>
                <Text style={styles.primaryText}>Accept selected + start Work Mode</Text>
              </Pressable>
            )}
          </>
        )}

        {screen === "work" && (
          <>
            <View style={[styles.hero, workMode && styles.heroWork]}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kicker}>ACTIVE WORK CONTEXT</Text>
                  <Text style={styles.heroTitle}>{activeProject}</Text>
                  <Text style={styles.body}>{selected.length} approved signals are available to this Nexus context.</Text>
                </View>
                <Switch value={workMode} onValueChange={setMode} trackColor={{ false: "#26313b", true: "#f5c400" }} thumbColor="#ffffff" />
              </View>
            </View>

            <Text style={styles.section}>PROJECT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectStrip}>
              {["Unassigned work", ...projectHints].filter((value, index, all) => all.indexOf(value) === index).map((project) => (
                <Pressable key={project} onPress={() => chooseProject(project)} style={[styles.projectChip, activeProject === project && styles.projectChipOn]}>
                  <Text style={[styles.projectText, activeProject === project && styles.projectTextOn]}>{project}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.metrics}>
              <Metric value={counts.contacts} label="people" />
              <Metric value={counts.calendar} label="events" />
              <Metric value={counts.documents} label="files" />
              <Metric value={counts.photos} label="photos" />
            </View>

            <Text style={styles.section}>WORK ACTIONS</Text>
            <View style={styles.actionGrid}>
              <Action title="Project World" sub="Relationship Tree" onPress={() => openUrl("Project World", LIVE.tree)} />
              <Action title="NEXUS" sub="Operating layer" onPress={() => openUrl("NEXUS", LIVE.nexus)} />
              <Action title="DoorFlow" sub="Door workflow" onPress={() => openUrl("DoorFlow", LIVE.doorflow)} />
              <Action title="Work files" sub="Scan another folder" onPress={runFolderScan} />
              <Action title="Evidence" sub="Add work photos" onPress={runPhotos} />
              <Action title="Review" sub="Correct discoveries" onPress={() => setScreen("review")} />
            </View>

            {!workMode && (
              <View style={styles.warning}>
                <Text style={styles.warningTitle}>Work Mode is OFF</Text>
                <Text style={styles.infoText}>Turn it on above to mark this phone session as an active work context.</Text>
              </View>
            )}
          </>
        )}

        {screen === "privacy" && (
          <>
            <View style={styles.summary}>
              <Text style={styles.kicker}>LOCAL-FIRST</Text>
              <Text style={styles.summaryValue}>You control every source.</Text>
              <Text style={styles.body}>This build stores discovery metadata locally. It does not upload your phone contents to Nexus servers.</Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.infoTitle}>What this version can read</Text>
              <Text style={styles.infoText}>Contacts after permission · Calendar after permission · folders/files you select · photos you select.</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.infoTitle}>What it cannot silently read</Text>
              <Text style={styles.infoText}>WhatsApp chats · Gmail mailbox · Work Wallet records · Procore · Autodesk · Hilti · private storage of other apps.</Text>
            </View>

            <Text style={styles.section}>RECENT ACTIVITY</Text>
            {audit.slice(0, 20).map((entry) => (
              <View key={entry.id} style={styles.auditRow}>
                <Text style={styles.auditAction}>{entry.action}</Text>
                <Text style={styles.auditText}>{entry.detail}</Text>
              </View>
            ))}

            <Pressable style={styles.danger} onPress={clearAll}>
              <Text style={styles.dangerText}>Reset local Nexus data</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SourceRow({ source, count, onPress, busy }: { source: DiscoverySource; count: number; onPress: () => void; busy: boolean }) {
  const meta = SOURCE_META[source];
  return (
    <Pressable style={styles.sourceRow} onPress={onPress} disabled={busy}>
      <View style={styles.sourceNumber}><Text style={styles.sourceNumberText}>{count}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sourceTitle}>{meta.title}</Text>
        <Text style={styles.sourceDetail}>{meta.detail}</Text>
        <Text style={styles.sourceAction}>{meta.action}</Text>
      </View>
    </Pressable>
  );
}

function DiscoveryRow({ item, onPress }: { item: DiscoveryItem; onPress: () => void }) {
  return (
    <Pressable style={styles.discoveryRow} onPress={onPress}>
      <View style={[styles.check, item.selected && styles.checkOn]}><Text style={styles.checkText}>{item.selected ? "✓" : ""}</Text></View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text numberOfLines={1} style={styles.discoveryTitle}>{item.title}</Text>
          <Text style={styles.confidence}>{item.confidence}%</Text>
        </View>
        <Text style={styles.discoverySub}>{item.subtitle}</Text>
        <Text style={styles.discoveryReason}>{item.reason}</Text>
      </View>
    </Pressable>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Action({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <Text style={styles.actionMark}>↗</Text>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#030407" },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(245,196,0,0.22)" },
  brand: { color: "#f5c400", fontWeight: "900", fontSize: 13, letterSpacing: 3.2 },
  product: { color: "#fff", fontWeight: "800", fontSize: 24, marginTop: 2 },
  status: { borderWidth: 1, borderColor: "#31404c", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#0a1119" },
  statusOn: { borderColor: "#f5c400", backgroundColor: "rgba(245,196,0,0.12)" },
  statusText: { color: "#8292a2", fontWeight: "900", fontSize: 10, letterSpacing: 1.2 },
  statusTextOn: { color: "#f5c400" },
  nav: { flexDirection: "row", paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#151e27", backgroundColor: "#05080d" },
  navItem: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  navItemOn: { borderBottomColor: "#f5c400" },
  navText: { color: "#718090", fontWeight: "800", fontSize: 11 },
  navTextOn: { color: "#fff" },
  content: { padding: 16, paddingBottom: 70, gap: 11 },
  hero: { borderWidth: 1, borderColor: "rgba(70,180,255,0.22)", backgroundColor: "#07101b", borderRadius: 20, padding: 18, marginBottom: 5 },
  heroWork: { borderColor: "rgba(245,196,0,0.45)", backgroundColor: "rgba(245,196,0,0.055)" },
  kicker: { color: "#43e4ff", fontWeight: "900", fontSize: 10, letterSpacing: 1.8, marginBottom: 8 },
  heroTitle: { color: "#fff", fontWeight: "900", fontSize: 28, lineHeight: 31, letterSpacing: -0.8 },
  body: { color: "#9eacbb", fontSize: 14, lineHeight: 20, marginTop: 9 },
  primary: { backgroundColor: "#f5c400", minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginTop: 16 },
  primaryText: { color: "#05070b", fontWeight: "900", fontSize: 14 },
  primaryAlt: { borderWidth: 1, borderColor: "rgba(67,228,255,0.48)", minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginTop: 9, backgroundColor: "rgba(67,228,255,0.055)" },
  primaryAltText: { color: "#66e7ff", fontWeight: "900", fontSize: 14 },
  section: { color: "#69798a", fontWeight: "900", fontSize: 10, letterSpacing: 1.6, marginTop: 13, marginBottom: 2 },
  sourceRow: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14, backgroundColor: "#07101a", borderWidth: 1, borderColor: "#152535", borderRadius: 16 },
  sourceNumber: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#0d2130", borderWidth: 1, borderColor: "#21435a", alignItems: "center", justifyContent: "center" },
  sourceNumberText: { color: "#43e4ff", fontWeight: "900", fontSize: 16 },
  sourceTitle: { color: "#fff", fontWeight: "900", fontSize: 15 },
  sourceDetail: { color: "#8392a0", fontSize: 12, lineHeight: 17, marginTop: 2 },
  sourceAction: { color: "#f5c400", fontWeight: "900", fontSize: 11, marginTop: 5 },
  textButton: { paddingVertical: 11, alignItems: "center" },
  textButtonText: { color: "#77cbe9", fontWeight: "800", fontSize: 12 },
  info: { padding: 15, backgroundColor: "#080d13", borderWidth: 1, borderColor: "#19222d", borderRadius: 16 },
  infoTitle: { color: "#dfe7ef", fontWeight: "900", fontSize: 14 },
  infoText: { color: "#7f8c99", fontSize: 12, lineHeight: 18, marginTop: 5 },
  summary: { padding: 18, borderRadius: 20, backgroundColor: "#07101b", borderWidth: 1, borderColor: "rgba(245,196,0,0.25)" },
  summaryValue: { color: "#fff", fontWeight: "900", fontSize: 27 },
  discoveryRow: { flexDirection: "row", gap: 11, padding: 13, borderRadius: 15, backgroundColor: "#07101a", borderWidth: 1, borderColor: "#152535" },
  check: { width: 27, height: 27, borderRadius: 9, borderWidth: 1, borderColor: "#40515e", alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkOn: { backgroundColor: "#f5c400", borderColor: "#f5c400" },
  checkText: { color: "#030407", fontWeight: "900" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  discoveryTitle: { color: "#fff", fontWeight: "800", fontSize: 14, flex: 1 },
  confidence: { color: "#43e4ff", fontWeight: "900", fontSize: 12 },
  discoverySub: { color: "#91a1af", fontSize: 11, marginTop: 3 },
  discoveryReason: { color: "#657585", fontSize: 10, lineHeight: 15, marginTop: 5 },
  projectStrip: { gap: 8, paddingVertical: 4 },
  projectChip: { borderWidth: 1, borderColor: "#263542", backgroundColor: "#080f16", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  projectChipOn: { borderColor: "#f5c400", backgroundColor: "rgba(245,196,0,0.11)" },
  projectText: { color: "#8493a1", fontWeight: "800", fontSize: 12 },
  projectTextOn: { color: "#f5c400" },
  metrics: { flexDirection: "row", gap: 7, marginTop: 7 },
  metric: { flex: 1, padding: 11, borderRadius: 14, borderWidth: 1, borderColor: "#172635", backgroundColor: "#07101a", alignItems: "center" },
  metricValue: { color: "#fff", fontWeight: "900", fontSize: 20 },
  metricLabel: { color: "#6f8090", fontWeight: "800", fontSize: 10, marginTop: 2 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  action: { width: "48.6%", minHeight: 118, padding: 14, borderRadius: 16, backgroundColor: "#08131d", borderWidth: 1, borderColor: "#1a3447" },
  actionMark: { color: "#43e4ff", fontWeight: "900", fontSize: 17 },
  actionTitle: { color: "#fff", fontWeight: "900", fontSize: 15, marginTop: 17 },
  actionSub: { color: "#718291", fontSize: 11, marginTop: 4 },
  warning: { padding: 15, borderRadius: 16, backgroundColor: "rgba(245,196,0,0.06)", borderWidth: 1, borderColor: "rgba(245,196,0,0.25)" },
  warningTitle: { color: "#f5c400", fontWeight: "900", fontSize: 13 },
  auditRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#151f28" },
  auditAction: { color: "#43e4ff", fontWeight: "900", fontSize: 10, letterSpacing: 0.9 },
  auditText: { color: "#8997a5", fontSize: 11, lineHeight: 16, marginTop: 3 },
  danger: { borderWidth: 1, borderColor: "#713a3a", backgroundColor: "#1a0d0f", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 14 },
  dangerText: { color: "#ff9494", fontWeight: "900", fontSize: 12 },
});
