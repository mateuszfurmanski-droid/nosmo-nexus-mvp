import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  type DiscoveryItem,
  type DiscoverySource,
} from "./src/discovery";
import {
  clearWorkModeState,
  loadWorkModeState,
  saveWorkModeState,
  type AuditEntry,
} from "./src/storage";

type Tab = "discover" | "review" | "work" | "privacy";

const SOURCE_META: Record<DiscoverySource, { label: string; detail: string; glyph: string }> = {
  contacts: {
    label: "Contacts",
    detail: "Reads only after Android permission and keeps likely work contacts.",
    glyph: "◎",
  },
  calendar: {
    label: "Calendar",
    detail: "Checks authorised events for project and construction context.",
    glyph: "□",
  },
  documents: {
    label: "Documents",
    detail: "You choose the PDFs, spreadsheets, Word files or images Nexus may inspect.",
    glyph: "▤",
  },
  photos: {
    label: "Photos",
    detail: "You choose work photos through the Android media picker.",
    glyph: "◫",
  },
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "discover", label: "Discover" },
  { id: "review", label: "Review" },
  { id: "work", label: "Work Mode" },
  { id: "privacy", label: "Privacy" },
];

function auditEntry(action: string, detail: string): AuditEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    action,
    detail,
  };
}

function mergeItems(current: DiscoveryItem[], incoming: DiscoveryItem[]) {
  const byId = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

function SourceCard({
  source,
  count,
  busy,
  onPress,
}: {
  source: DiscoverySource;
  count: number;
  busy: boolean;
  onPress: () => void;
}) {
  const meta = SOURCE_META[source];
  return (
    <Pressable style={styles.sourceCard} onPress={onPress} disabled={busy}>
      <View style={styles.sourceGlyph}><Text style={styles.sourceGlyphText}>{meta.glyph}</Text></View>
      <View style={styles.sourceCopy}>
        <View style={styles.rowBetween}>
          <Text style={styles.sourceTitle}>{meta.label}</Text>
          <Text style={styles.countBadge}>{count}</Text>
        </View>
        <Text style={styles.sourceDetail}>{meta.detail}</Text>
        <Text style={styles.sourceAction}>{busy ? "Scanning…" : source === "documents" || source === "photos" ? "Choose source" : "Scan source"}</Text>
      </View>
    </Pressable>
  );
}

function DiscoveryRow({ item, onToggle }: { item: DiscoveryItem; onToggle: () => void }) {
  return (
    <Pressable style={styles.discoveryRow} onPress={onToggle}>
      <View style={[styles.check, item.selected && styles.checkOn]}>
        <Text style={styles.checkText}>{item.selected ? "✓" : ""}</Text>
      </View>
      <View style={styles.discoveryCopy}>
        <View style={styles.rowBetween}>
          <Text numberOfLines={1} style={styles.discoveryTitle}>{item.title}</Text>
          <Text style={styles.confidence}>{item.confidence}%</Text>
        </View>
        <Text style={styles.discoverySubtitle}>{item.subtitle}</Text>
        <Text style={styles.discoveryReason}>{item.reason}</Text>
        <Text style={styles.sourcePill}>{SOURCE_META[item.source].label}</Text>
      </View>
    </Pressable>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("discover");
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [workMode, setWorkMode] = useState(false);
  const [activeProject, setActiveProject] = useState("Unassigned work");
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [busySource, setBusySource] = useState<DiscoverySource | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadWorkModeState();
    if (saved) {
      setItems(saved.items);
      setWorkMode(saved.workMode);
      setActiveProject(saved.activeProject);
      setAudit(saved.audit);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveWorkModeState({ workMode, activeProject, items, audit });
  }, [hydrated, workMode, activeProject, items, audit]);

  const selected = useMemo(() => items.filter((item) => item.selected), [items]);
  const projectHints = useMemo(() => {
    const hints = new Set(selected.map((item) => item.projectHint).filter((value): value is string => Boolean(value)));
    return [...hints].map((value) => value === "halifax" ? "Halifax Project" : value === "riverside" ? "Riverside Project" : value);
  }, [selected]);

  const counts = useMemo(() => {
    return items.reduce<Record<DiscoverySource, number>>((acc, item) => {
      acc[item.source] += 1;
      return acc;
    }, { contacts: 0, calendar: 0, documents: 0, photos: 0 });
  }, [items]);

  const appendAudit = (action: string, detail: string) => {
    setAudit((current) => [auditEntry(action, detail), ...current].slice(0, 80));
  };

  const runSource = async (source: DiscoverySource) => {
    if (busySource) return;
    setBusySource(source);
    try {
      const found = source === "contacts"
        ? await discoverContacts()
        : source === "calendar"
          ? await discoverCalendar()
          : source === "documents"
            ? await pickDocuments()
            : await pickPhotos();

      setItems((current) => mergeItems(current, found));
      appendAudit("DISCOVERY", `${SOURCE_META[source].label}: ${found.length} work-relevant items added for review.`);
      if (found.length > 0) setTab("review");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Source scan failed.";
      appendAudit("SOURCE_BLOCKED", `${SOURCE_META[source].label}: ${message}`);
      Alert.alert("Nexus source unavailable", message);
    } finally {
      setBusySource(null);
    }
  };

  const scanAuthorisedDeviceSources = async () => {
    if (busySource) return;
    setBusySource("contacts");
    try {
      const contacts = await discoverContacts();
      setBusySource("calendar");
      const calendar = await discoverCalendar();
      const found = [...contacts, ...calendar];
      setItems((current) => mergeItems(current, found));
      appendAudit("DEVICE_SCAN", `${found.length} work signals discovered from authorised device sources.`);
      if (found.length > 0) setTab("review");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Device scan stopped.";
      appendAudit("DEVICE_SCAN_STOPPED", message);
      Alert.alert("Scan stopped", `${message}\n\nYou can scan each source separately from Discover.`);
    } finally {
      setBusySource(null);
    }
  };

  const toggleItem = (id: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const toggleWorkMode = (value: boolean) => {
    setWorkMode(value);
    appendAudit(value ? "WORK_MODE_ON" : "WORK_MODE_OFF", value ? `Active project: ${activeProject}.` : "Work context paused.");
    if (value) setTab("work");
  };

  const chooseProject = (project: string) => {
    setActiveProject(project);
    appendAudit("PROJECT_CONTEXT", `Active project changed to ${project}.`);
  };

  const clearAll = () => {
    Alert.alert(
      "Remove local Nexus data?",
      "This deletes imported discovery metadata and the local activity log from this device. It does not delete your original contacts, files, photos or calendar events.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            clearWorkModeState();
            setItems([]);
            setAudit([]);
            setWorkMode(false);
            setActiveProject("Unassigned work");
            setTab("discover");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#061016" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>NOSMO NEXUS</Text>
          <Text style={styles.product}>Work Mode</Text>
        </View>
        <View style={[styles.modeBadge, workMode && styles.modeBadgeOn]}>
          <Text style={[styles.modeBadgeText, workMode && styles.modeBadgeTextOn]}>{workMode ? "ACTIVE" : "PRIVATE"}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((entry) => (
          <Pressable key={entry.id} style={[styles.tab, tab === entry.id && styles.tabActive]} onPress={() => setTab(entry.id)}>
            <Text style={[styles.tabText, tab === entry.id && styles.tabTextActive]}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "discover" && (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>ANDROID-FIRST PRIVATE DISCOVERY</Text>
              <Text style={styles.heroTitle}>Find what matters for work.</Text>
              <Text style={styles.heroBody}>
                Nexus builds a local work layer from sources you explicitly authorise. It does not read private app databases, bypass Android permissions or treat another app as accessible just because it is installed.
              </Text>
              <Pressable style={styles.primaryButton} onPress={scanAuthorisedDeviceSources} disabled={Boolean(busySource)}>
                <Text style={styles.primaryButtonText}>{busySource ? "Scanning authorised source…" : "Scan contacts + calendar"}</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>SOURCES</Text>
            {(Object.keys(SOURCE_META) as DiscoverySource[]).map((source) => (
              <SourceCard key={source} source={source} count={counts[source]} busy={busySource === source} onPress={() => runSource(source)} />
            ))}

            <View style={styles.boundaryCard}>
              <Text style={styles.boundaryTitle}>Next connector layer</Text>
              <Text style={styles.boundaryText}>Work Wallet · Microsoft 365 / OneDrive / SharePoint · Gmail · Procore · Autodesk · Hilti</Text>
              <Text style={styles.boundaryFoot}>These require their own approved API/OAuth connectors. Nexus will not scrape their private storage.</Text>
            </View>
          </>
        )}

        {tab === "review" && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.eyebrow}>DISCOVERY REVIEW</Text>
              <Text style={styles.summaryBig}>{selected.length} selected</Text>
              <Text style={styles.heroBody}>{items.length} total discoveries. Items are selected by default; tap any row to exclude a wrong match before it enters your Work Mode context.</Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nothing imported yet.</Text>
                <Text style={styles.heroBody}>Open Discover and authorise a source.</Text>
              </View>
            ) : items.map((item) => (
              <DiscoveryRow key={item.id} item={item} onToggle={() => toggleItem(item.id)} />
            ))}

            {items.length > 0 && (
              <Pressable style={styles.primaryButton} onPress={() => toggleWorkMode(true)}>
                <Text style={styles.primaryButtonText}>Accept selected + start Work Mode</Text>
              </Pressable>
            )}
          </>
        )}

        {tab === "work" && (
          <>
            <View style={[styles.heroCard, workMode && styles.workHeroOn]}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>WORK CONTEXT</Text>
                  <Text style={styles.heroTitle}>{activeProject}</Text>
                  <Text style={styles.heroBody}>{selected.length} approved local signals available to the Nexus work graph.</Text>
                </View>
                <Switch value={workMode} onValueChange={toggleWorkMode} trackColor={{ false: "#27343b", true: "#21d4c2" }} thumbColor="#ffffff" />
              </View>
            </View>

            <Text style={styles.sectionLabel}>PROJECT CONTEXT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectStrip}>
              {["Unassigned work", ...projectHints].filter((value, index, array) => array.indexOf(value) === index).map((project) => (
                <Pressable key={project} onPress={() => chooseProject(project)} style={[styles.projectChip, activeProject === project && styles.projectChipActive]}>
                  <Text style={[styles.projectChipText, activeProject === project && styles.projectChipTextActive]}>{project}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.metricsGrid}>
              <View style={styles.metric}><Text style={styles.metricValue}>{counts.contacts}</Text><Text style={styles.metricLabel}>people</Text></View>
              <View style={styles.metric}><Text style={styles.metricValue}>{counts.documents}</Text><Text style={styles.metricLabel}>docs</Text></View>
              <View style={styles.metric}><Text style={styles.metricValue}>{counts.photos}</Text><Text style={styles.metricLabel}>evidence</Text></View>
              <View style={styles.metric}><Text style={styles.metricValue}>{counts.calendar}</Text><Text style={styles.metricLabel}>events</Text></View>
            </View>

            <Text style={styles.sectionLabel}>NEXUS WORKSPACE</Text>
            <View style={styles.quickGrid}>
              {["Relationship Tree", "Person Cards", "Tasks", "Documents", "DoorFlow", "Electrical", "BIM / FabStation", "Ask Nexus"].map((label) => (
                <Pressable key={label} style={styles.quickTile} onPress={() => appendAudit("MODULE_OPEN", `${label} opened from ${activeProject}.`)}>
                  <Text style={styles.quickTileMark}>+</Text>
                  <Text style={styles.quickTileText}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {!workMode && (
              <View style={styles.boundaryCard}>
                <Text style={styles.boundaryTitle}>Work Mode is paused</Text>
                <Text style={styles.boundaryText}>Discovery data remains local, but Nexus is not presenting it as an active project context.</Text>
              </View>
            )}
          </>
        )}

        {tab === "privacy" && (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.eyebrow}>PRIVACY + AUDIT</Text>
              <Text style={styles.summaryBig}>Local first.</Text>
              <Text style={styles.heroBody}>The MVP stores discovery metadata in the app's private local document area. Original phone data remains in its source. No cloud sync is enabled in this branch.</Text>
            </View>

            <View style={styles.boundaryCard}>
              <Text style={styles.boundaryTitle}>Access boundary</Text>
              <Text style={styles.boundaryText}>Contacts and calendar require Android permission. Documents and photos require explicit picker selection. WhatsApp, Gmail, Work Wallet and other apps are not read directly.</Text>
            </View>

            <Text style={styles.sectionLabel}>LOCAL ACTIVITY</Text>
            {audit.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.heroBody}>No local activity recorded yet.</Text></View>
            ) : audit.slice(0, 20).map((entry) => (
              <View key={entry.id} style={styles.auditRow}>
                <Text style={styles.auditAction}>{entry.action}</Text>
                <Text style={styles.auditDetail}>{entry.detail}</Text>
                <Text style={styles.auditTime}>{new Date(entry.at).toLocaleString()}</Text>
              </View>
            ))}

            <Pressable style={styles.dangerButton} onPress={clearAll}>
              <Text style={styles.dangerButtonText}>Remove all local Nexus data</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#061016" },
  header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#1c2a31" },
  brand: { color: "#62f0df", fontSize: 11, fontWeight: "800", letterSpacing: 2.2 },
  product: { color: "#f5fbfc", fontSize: 24, fontWeight: "800", marginTop: 2 },
  modeBadge: { borderWidth: 1, borderColor: "#34444c", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#0c171c" },
  modeBadgeOn: { borderColor: "#21d4c2", backgroundColor: "#0b2928" },
  modeBadgeText: { color: "#81949d", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  modeBadgeTextOn: { color: "#62f0df" },
  tabBar: { flexDirection: "row", paddingHorizontal: 10, paddingTop: 8, gap: 4, backgroundColor: "#061016" },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12 },
  tabActive: { backgroundColor: "#102128" },
  tabText: { color: "#71848d", fontSize: 11, fontWeight: "700" },
  tabTextActive: { color: "#e9ffff" },
  scroll: { padding: 14, paddingBottom: 40, gap: 10 },
  heroCard: { borderRadius: 22, borderWidth: 1, borderColor: "#1f343d", backgroundColor: "#0a171d", padding: 18 },
  workHeroOn: { borderColor: "#1e887f", backgroundColor: "#0a1e1e" },
  eyebrow: { color: "#62f0df", fontSize: 10, fontWeight: "800", letterSpacing: 1.6, marginBottom: 7 },
  heroTitle: { color: "#f4fbfc", fontSize: 28, lineHeight: 32, fontWeight: "800" },
  heroBody: { color: "#8ea2aa", fontSize: 13, lineHeight: 19, marginTop: 9 },
  primaryButton: { marginTop: 14, backgroundColor: "#62f0df", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  primaryButtonText: { color: "#041012", fontWeight: "900", fontSize: 13 },
  sectionLabel: { color: "#62767f", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 8, marginBottom: 2 },
  sourceCard: { borderRadius: 18, borderWidth: 1, borderColor: "#192a32", backgroundColor: "#09151a", padding: 14, flexDirection: "row", gap: 12 },
  sourceGlyph: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#10252a", alignItems: "center", justifyContent: "center" },
  sourceGlyphText: { color: "#62f0df", fontSize: 20, fontWeight: "700" },
  sourceCopy: { flex: 1 },
  sourceTitle: { color: "#e9f4f6", fontSize: 15, fontWeight: "800" },
  sourceDetail: { color: "#7d9199", fontSize: 12, lineHeight: 17, marginTop: 4 },
  sourceAction: { color: "#62f0df", fontSize: 11, fontWeight: "800", marginTop: 8 },
  countBadge: { color: "#a7bec5", backgroundColor: "#14232a", overflow: "hidden", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: "800" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  boundaryCard: { borderRadius: 18, borderWidth: 1, borderColor: "#24343b", backgroundColor: "#0a1418", padding: 15 },
  boundaryTitle: { color: "#dce9ec", fontSize: 13, fontWeight: "800" },
  boundaryText: { color: "#8da0a7", fontSize: 12, lineHeight: 18, marginTop: 6 },
  boundaryFoot: { color: "#5f737b", fontSize: 11, lineHeight: 16, marginTop: 8 },
  summaryCard: { borderRadius: 20, borderWidth: 1, borderColor: "#1c3138", backgroundColor: "#0a161b", padding: 17 },
  summaryBig: { color: "#f4fbfc", fontSize: 25, fontWeight: "900" },
  emptyCard: { borderRadius: 18, borderWidth: 1, borderColor: "#1b2b32", backgroundColor: "#081318", padding: 16 },
  emptyTitle: { color: "#dce7ea", fontSize: 15, fontWeight: "800" },
  discoveryRow: { borderRadius: 18, borderWidth: 1, borderColor: "#1a2a31", backgroundColor: "#081419", padding: 13, flexDirection: "row", gap: 11 },
  check: { width: 25, height: 25, borderRadius: 8, borderWidth: 1, borderColor: "#41545d", alignItems: "center", justifyContent: "center", marginTop: 2 },
  checkOn: { borderColor: "#62f0df", backgroundColor: "#123c39" },
  checkText: { color: "#62f0df", fontSize: 14, fontWeight: "900" },
  discoveryCopy: { flex: 1 },
  discoveryTitle: { flex: 1, color: "#eef7f8", fontSize: 14, fontWeight: "800" },
  discoverySubtitle: { color: "#8ea0a8", fontSize: 12, marginTop: 3 },
  discoveryReason: { color: "#657a83", fontSize: 11, lineHeight: 16, marginTop: 5 },
  confidence: { color: "#62f0df", fontSize: 11, fontWeight: "900" },
  sourcePill: { alignSelf: "flex-start", color: "#87a1aa", borderWidth: 1, borderColor: "#263941", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: "800", marginTop: 7 },
  projectStrip: { gap: 8, paddingRight: 10 },
  projectChip: { borderWidth: 1, borderColor: "#263940", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: "#0b171c" },
  projectChipActive: { borderColor: "#62f0df", backgroundColor: "#10312f" },
  projectChipText: { color: "#82969e", fontSize: 11, fontWeight: "800" },
  projectChipTextActive: { color: "#e5ffff" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "48.5%", borderRadius: 16, borderWidth: 1, borderColor: "#1b2d34", backgroundColor: "#081419", padding: 14 },
  metricValue: { color: "#effafa", fontSize: 24, fontWeight: "900" },
  metricLabel: { color: "#71858d", fontSize: 11, fontWeight: "700", marginTop: 2 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickTile: { width: "48.5%", minHeight: 88, borderRadius: 17, borderWidth: 1, borderColor: "#1d3037", backgroundColor: "#09161b", padding: 13, justifyContent: "space-between" },
  quickTileMark: { color: "#62f0df", fontSize: 21, fontWeight: "400" },
  quickTileText: { color: "#dfeaec", fontSize: 12, fontWeight: "800" },
  auditRow: { borderRadius: 15, borderWidth: 1, borderColor: "#182a31", backgroundColor: "#081318", padding: 12 },
  auditAction: { color: "#62f0df", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  auditDetail: { color: "#9aadb4", fontSize: 12, lineHeight: 17, marginTop: 4 },
  auditTime: { color: "#566b73", fontSize: 10, marginTop: 6 },
  dangerButton: { marginTop: 8, borderWidth: 1, borderColor: "#68333a", backgroundColor: "#211115", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  dangerButtonText: { color: "#ff9ca7", fontSize: 12, fontWeight: "900" },
});
