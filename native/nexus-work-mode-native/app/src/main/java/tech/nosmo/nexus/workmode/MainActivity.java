package tech.nosmo.nexus.workmode;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.provider.CalendarContract;
import android.provider.ContactsContract;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends Activity {
    private static final int REQ_DISCOVERY_PERMISSIONS = 100;
    private static final int REQ_WORK_FOLDER = 101;
    private static final int REQ_PHOTOS = 102;

    private static final int BG = Color.rgb(4, 12, 28);
    private static final int PANEL = Color.rgb(9, 27, 55);
    private static final int PANEL_SOFT = Color.rgb(12, 38, 76);
    private static final int BLUE = Color.rgb(38, 132, 255);
    private static final int BLUE_DARK = Color.rgb(18, 82, 168);
    private static final int CYAN = Color.rgb(78, 203, 255);
    private static final int TEXT = Color.rgb(235, 246, 255);
    private static final int MUTED = Color.rgb(153, 181, 213);
    private static final int GREEN = Color.rgb(62, 226, 167);
    private static final int TILE = Color.rgb(10, 34, 67);

    private static final String TREE_URL = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/";
    private static final String DOORFLOW_URL = "https://nosmotechnology.co.uk/doorflow.html";
    private static final String AI_CONTEXT_VERSION = "android-work-discovery-v1";
    private static final String PREF_THEME = "visualTheme";
    private static final String PREF_ACCENT = "visualAccent";

    private final ArrayList<Signal> signals = new ArrayList<>();
    private final Set<String> dedupe = new HashSet<>();
    private SharedPreferences prefs;

    private static class Signal {
        final String source;
        final String title;
        final String detail;
        final int confidence;
        boolean selected;

        Signal(String source, String title, String detail, int confidence) {
            this.source = source;
            this.title = title;
            this.detail = detail;
            this.confidence = confidence;
            this.selected = true;
        }

        String summary() {
            return source + " · " + title + " · " + confidence + "%";
        }
    }

    private static class ThemeProfile {
        final String id;
        final String accentId;
        final String name;
        final int bg;
        final int panel;
        final int panelSoft;
        final int raised;
        final int tile;
        final int text;
        final int muted;
        final int border;
        final int accent;
        final int accentSoft;
        final int success;
        final int warning;
        final int danger;
        final int radius;

        ThemeProfile(String id, String accentId, String name, int bg, int panel, int panelSoft, int raised, int tile, int text, int muted, int border, int accent, int accentSoft, int success, int warning, int danger, int radius) {
            this.id = id;
            this.accentId = accentId;
            this.name = name;
            this.bg = bg;
            this.panel = panel;
            this.panelSoft = panelSoft;
            this.raised = raised;
            this.tile = tile;
            this.text = text;
            this.muted = muted;
            this.border = border;
            this.accent = accent;
            this.accentSoft = accentSoft;
            this.success = success;
            this.warning = warning;
            this.danger = danger;
            this.radius = radius;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("nexus_work_mode", MODE_PRIVATE);
        applySystemBars();

        if (prefs.getBoolean("workMode", false)) {
            showWorkMode();
        } else {
            showWelcome();
        }
    }

    private void applySystemBars() {
        ThemeProfile t = theme();
        getWindow().setStatusBarColor(t.bg);
        getWindow().setNavigationBarColor(t.bg);
    }

    private ThemeProfile theme() {
        String themeId = prefs == null ? "nexus-blue" : prefs.getString(PREF_THEME, "nexus-blue");
        String accentId = prefs == null ? "cyan" : prefs.getString(PREF_ACCENT, "cyan");
        int accent = accentColor(accentId);
        int accentSoft = accentSoftColor(accentId);

        if ("nexus-light".equals(themeId)) {
            return new ThemeProfile("nexus-light", accentId, "Nexus Light", Color.rgb(244, 247, 251), Color.WHITE, Color.rgb(234, 241, 250), Color.rgb(248, 250, 253), Color.WHITE, Color.rgb(18, 32, 51), Color.rgb(96, 112, 137), Color.rgb(201, 216, 234), accent, accentSoft, Color.rgb(18, 168, 121), Color.rgb(217, 154, 0), Color.rgb(217, 65, 93), 22);
        }

        if ("industrial-steel-gold".equals(themeId)) {
            return new ThemeProfile("industrial-steel-gold", accentId, "Steel / Gold", Color.rgb(8, 9, 11), Color.rgb(21, 23, 27), Color.rgb(32, 36, 42), Color.rgb(42, 47, 54), Color.rgb(28, 31, 36), Color.rgb(241, 241, 234), Color.rgb(167, 169, 165), Color.rgb(91, 81, 64), accent, accentSoft, Color.rgb(98, 214, 163), Color.rgb(255, 211, 106), Color.rgb(255, 91, 91), 14);
        }

        return new ThemeProfile("nexus-blue", accentId, "Nexus Blue", BG, PANEL, PANEL_SOFT, Color.rgb(16, 46, 94), TILE, TEXT, MUTED, BLUE_DARK, accent, accentSoft, GREEN, Color.rgb(245, 197, 66), Color.rgb(255, 90, 122), 22);
    }

    private int accentColor(String accentId) {
        if ("gold".equals(accentId)) return Color.rgb(255, 211, 106);
        if ("laser-green".equals(accentId)) return Color.rgb(57, 255, 136);
        return CYAN;
    }

    private int accentSoftColor(String accentId) {
        if ("gold".equals(accentId)) return Color.rgb(111, 80, 25);
        if ("laser-green".equals(accentId)) return Color.rgb(13, 83, 50);
        return Color.rgb(6, 33, 66);
    }

    private void setVisualTheme(String themeId, String accentId) {
        prefs.edit()
                .putString(PREF_THEME, themeId)
                .putString(PREF_ACCENT, accentId)
                .apply();
        applySystemBars();
        ThemeProfile t = theme();
        Toast.makeText(this, "Theme: " + t.name + " / " + t.accentId, Toast.LENGTH_SHORT).show();
        showWorkMode();
    }

    private void showWelcome() {
        LinearLayout root = page();
        addBrand(root);
        addTitle(root, "AI Work Mode");
        addBody(root, "NEXUS prepares an AI-ready work context from Android sources you approve. Start with contacts and calendar, then add a project folder or selected work photos.");
        addStatus(root, "BLUE NEXUS · AI CONTEXT READY", theme().accent);

        Button start = primaryButton("Start discovery");
        start.setOnClickListener(v -> startDiscovery());
        root.addView(start, fullWidth(dp(60)));

        Button ai = secondaryButton("Ask Nexus AI");
        ai.setOnClickListener(v -> openUrl(aiAssistantUrl("home")));
        root.addView(ai, fullWidth(dp(56)));

        Button tree = secondaryButton("Open Project World");
        tree.setOnClickListener(v -> openUrl(workTreeUrl("home")));
        root.addView(tree, fullWidth(dp(56)));

        addSmall(root, "Privacy boundary: no AI key in this APK, no Accessibility Service, no WhatsApp/Gmail database scraping, no unrestricted storage crawl. AI inference must run in Nexus web/backend after this app hands off an AI context packet.");
        setPage(root);
    }

    private void startDiscovery() {
        ArrayList<String> missing = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.READ_CONTACTS);
        }
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.READ_CALENDAR);
        }

        if (!missing.isEmpty()) {
            requestPermissions(missing.toArray(new String[0]), REQ_DISCOVERY_PERMISSIONS);
        } else {
            scanPhoneSources();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_DISCOVERY_PERMISSIONS) {
            scanPhoneSources();
        }
    }

    private void scanPhoneSources() {
        signals.clear();
        dedupe.clear();

        int contacts = 0;
        int calendar = 0;
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
            contacts = scanContacts();
        }
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            calendar = scanCalendar();
        }

        Toast.makeText(this, "Phone scan: " + contacts + " contacts, " + calendar + " calendar signals", Toast.LENGTH_LONG).show();
        showReview();
    }

    private int scanContacts() {
        int before = signals.size();
        ContentResolver resolver = getContentResolver();

        String[] orgProjection = new String[]{ContactsContract.CommonDataKinds.Organization.DISPLAY_NAME, ContactsContract.CommonDataKinds.Organization.COMPANY, ContactsContract.CommonDataKinds.Organization.TITLE};
        String selection = ContactsContract.Data.MIMETYPE + "=?";
        String[] args = new String[]{ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE};

        try (Cursor cursor = resolver.query(ContactsContract.Data.CONTENT_URI, orgProjection, selection, args, null)) {
            if (cursor != null) {
                int nameIx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Organization.DISPLAY_NAME);
                int companyIx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Organization.COMPANY);
                int titleIx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Organization.TITLE);
                while (cursor.moveToNext() && signals.size() < 250) {
                    String name = value(cursor, nameIx);
                    String company = value(cursor, companyIx);
                    String title = value(cursor, titleIx);
                    String joined = joinNonEmpty(name, company, title);
                    if (joined.isEmpty()) continue;
                    int score = workScore(joined);
                    if (score < 45 && company.isEmpty() && title.isEmpty()) continue;
                    addSignal("CONTACT", nonEmpty(name, company, "Work contact"), joinNonEmpty(company, title), Math.max(score, 55));
                }
            }
        } catch (Exception ignored) {
        }

        String[] contactProjection = new String[]{ContactsContract.Contacts.DISPLAY_NAME_PRIMARY};
        try (Cursor cursor = resolver.query(ContactsContract.Contacts.CONTENT_URI, contactProjection, null, null, null)) {
            if (cursor != null) {
                int nameIx = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY);
                while (cursor.moveToNext() && signals.size() < 300) {
                    String name = value(cursor, nameIx);
                    if (name.isEmpty()) continue;
                    int score = workScore(name);
                    if (score >= 60) {
                        addSignal("CONTACT", name, "Matched work/project keywords", score);
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return signals.size() - before;
    }

    private int scanCalendar() {
        int before = signals.size();
        long now = System.currentTimeMillis();
        long from = now - (120L * 24L * 60L * 60L * 1000L);
        long to = now + (180L * 24L * 60L * 60L * 1000L);

        String[] projection = new String[]{CalendarContract.Events.TITLE, CalendarContract.Events.EVENT_LOCATION, CalendarContract.Events.DESCRIPTION, CalendarContract.Events.DTSTART};
        String selection = CalendarContract.Events.DTSTART + ">=? AND " + CalendarContract.Events.DTSTART + "<=?";
        String[] args = new String[]{String.valueOf(from), String.valueOf(to)};

        try (Cursor cursor = getContentResolver().query(CalendarContract.Events.CONTENT_URI, projection, selection, args, CalendarContract.Events.DTSTART + " DESC")) {
            if (cursor != null) {
                int titleIx = cursor.getColumnIndex(CalendarContract.Events.TITLE);
                int locationIx = cursor.getColumnIndex(CalendarContract.Events.EVENT_LOCATION);
                int descriptionIx = cursor.getColumnIndex(CalendarContract.Events.DESCRIPTION);
                while (cursor.moveToNext() && signals.size() < 450) {
                    String title = value(cursor, titleIx);
                    String location = value(cursor, locationIx);
                    String description = value(cursor, descriptionIx);
                    String joined = joinNonEmpty(title, location, description);
                    if (joined.isEmpty()) continue;
                    int score = workScore(joined);
                    if (score >= 45 || (!location.isEmpty() && score >= 30)) {
                        addSignal("CALENDAR", nonEmpty(title, "Work calendar event"), joinNonEmpty(location, trim(description, 80)), Math.max(score, 50));
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return signals.size() - before;
    }

    private void chooseWorkFolder() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, REQ_WORK_FOLDER);
    }

    private void choosePhotos() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType("image/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(intent, REQ_PHOTOS);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null) return;

        if (requestCode == REQ_WORK_FOLDER && data.getData() != null) {
            Uri treeUri = data.getData();
            try {
                getContentResolver().takePersistableUriPermission(treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                prefs.edit().putString("workFolderUri", treeUri.toString()).apply();
            } catch (Exception ignored) {
            }
            int found = scanFolder(treeUri);
            Toast.makeText(this, "Folder scan: " + found + " likely work files", Toast.LENGTH_LONG).show();
            showReview();
        } else if (requestCode == REQ_PHOTOS) {
            int count = addPickedPhotos(data);
            Toast.makeText(this, count + " photos added", Toast.LENGTH_SHORT).show();
            showReview();
        }
    }

    private int scanFolder(Uri treeUri) {
        int before = signals.size();
        try {
            String rootId = DocumentsContract.getTreeDocumentId(treeUri);
            scanFolderChildren(treeUri, rootId, 0, "");
        } catch (Exception ignored) {
        }
        return signals.size() - before;
    }

    private void scanFolderChildren(Uri treeUri, String parentId, int depth, String path) {
        if (depth > 2 || signals.size() >= 650) return;
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, parentId);
        String[] projection = new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE};

        try (Cursor cursor = getContentResolver().query(childrenUri, projection, null, null, null)) {
            if (cursor == null) return;
            int idIx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID);
            int nameIx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
            int mimeIx = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE);
            while (cursor.moveToNext() && signals.size() < 650) {
                String id = value(cursor, idIx);
                String name = value(cursor, nameIx);
                String mime = value(cursor, mimeIx);
                if (name.isEmpty()) continue;
                String nextPath = path.isEmpty() ? name : path + "/" + name;
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    if (depth < 2) scanFolderChildren(treeUri, id, depth + 1, nextPath);
                } else if (likelyWorkFile(name)) {
                    int score = Math.max(workScore(nextPath), 60);
                    addSignal("FILE", name, trim(path, 100), score);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private int addPickedPhotos(Intent data) {
        int before = signals.size();
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) {
                Uri uri = clip.getItemAt(i).getUri();
                addSignal("PHOTO", displayName(uri), "Selected work evidence", 70);
            }
        } else if (data.getData() != null) {
            Uri uri = data.getData();
            addSignal("PHOTO", displayName(uri), "Selected work evidence", 70);
        }
        return signals.size() - before;
    }

    private String displayName(Uri uri) {
        String result = "Selected photo";
        String[] projection = new String[]{OpenableColumns.DISPLAY_NAME};
        try (Cursor cursor = getContentResolver().query(uri, projection, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int ix = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                String value = value(cursor, ix);
                if (!value.isEmpty()) result = value;
            }
        } catch (Exception ignored) {
        }
        return result;
    }

    private void showReview() {
        LinearLayout root = page();
        addBrand(root);
        addTitle(root, "AI Discovery Review");
        addBody(root, signals.isEmpty() ? "No strong work signals found yet. Add a project folder or selected photos." : signals.size() + " work signals found. They are selected by default — untick anything that does not belong to work. Nexus AI will receive a bounded handoff packet, not raw phone data.");
        addStatus(root, selectedCount() + " SELECTED", theme().accent);

        Button folder = secondaryButton("+ Add / scan work folder");
        folder.setOnClickListener(v -> chooseWorkFolder());
        root.addView(folder, fullWidth(dp(54)));

        Button photos = secondaryButton("+ Add work photos");
        photos.setOnClickListener(v -> choosePhotos());
        root.addView(photos, fullWidth(dp(54)));

        addSection(root, "FOUND CONTEXT");
        int shown = 0;
        for (Signal signal : signals) {
            if (shown >= 80) break;
            CheckBox box = new CheckBox(this);
            box.setText(signal.source + " · " + signal.title + (signal.detail.isEmpty() ? "" : "\n" + signal.detail) + "\nconfidence " + signal.confidence + "%");
            box.setTextColor(theme().text);
            box.setTextSize(14);
            box.setChecked(signal.selected);
            box.setPadding(dp(4), dp(8), dp(4), dp(8));
            box.setOnCheckedChangeListener((buttonView, isChecked) -> signal.selected = isChecked);
            root.addView(box, wrapHeight());
            shown++;
        }
        if (signals.size() > shown) addSmall(root, "+ " + (signals.size() - shown) + " more signals retained in this scan.");

        Button ask = primaryButton("Ask Nexus AI with this context");
        ask.setOnClickListener(v -> {
            persistAiContext();
            openUrl(aiAssistantUrl("review"));
        });
        root.addView(ask, fullWidth(dp(62)));

        Button start = secondaryButton("Accept + start Work Mode");
        start.setOnClickListener(v -> enableWorkMode());
        root.addView(start, fullWidth(dp(54)));

        Button tree = secondaryButton("Preview Project World");
        tree.setOnClickListener(v -> openUrl(workTreeUrl("review")));
        root.addView(tree, fullWidth(dp(54)));

        Button rescan = secondaryButton("Rescan phone");
        rescan.setOnClickListener(v -> startDiscovery());
        root.addView(rescan, fullWidth(dp(54)));
        setPage(root);
    }

    private void enableWorkMode() {
        String project = inferProject();
        int accepted = selectedCount();
        prefs.edit()
                .putBoolean("workMode", true)
                .putString("activeProject", project)
                .putInt("acceptedSignals", accepted)
                .putString("signalSummary", selectedSummary())
                .putString("aiContextPacket", aiContextPacket(project, accepted))
                .apply();
        Toast.makeText(this, "NEXUS Work Mode ON", Toast.LENGTH_LONG).show();
        showWorkMode();
    }

    private void persistAiContext() {
        String project = inferProject();
        prefs.edit()
                .putString("activeProject", project)
                .putInt("acceptedSignals", selectedCount())
                .putString("signalSummary", selectedSummary())
                .putString("aiContextPacket", aiContextPacket(project, selectedCount()))
                .apply();
    }

    private void showWorkMode() {
        LinearLayout root = page();
        addWorkModeHero(root);
        addLauncherGrid(root);
        addThemeSwitcher(root);
        addValueBar(root);
        addSmall(root, "Native Android beta 0.5.4-launcher-shell · Visual theme system: Blue, Light, Steel/Gold plus Cyan, Gold, Laser Green accents. Apps open normally; Nexus web/backend owns AI model calls and project permission enforcement.");
        setPage(root);
    }

    private void addWorkModeHero(LinearLayout root) {
        ThemeProfile t = theme();

        TextView brand = new TextView(this);
        brand.setText("NOSMO");
        brand.setTextColor(t.text);
        brand.setTextSize(17);
        brand.setTypeface(Typeface.DEFAULT_BOLD);
        brand.setLetterSpacing(0.18f);
        brand.setGravity(Gravity.CENTER);
        root.addView(brand, fullWidth(dp(34)));

        TextView title = new TextView(this);
        title.setText("Nexus Work Mode");
        title.setTextColor(t.text);
        title.setTextSize(31);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(4), 0, dp(4));
        root.addView(title, wrapHeight());

        TextView subtitle = new TextView(this);
        subtitle.setText("One tap. Total focus.");
        subtitle.setTextColor(t.muted);
        subtitle.setTextSize(15);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, 0, 0, dp(18));
        root.addView(subtitle, wrapHeight());

        TextView status = new TextView(this);
        status.setText("◈  Nexus Work Mode Active");
        status.setTextColor(t.text);
        status.setTextSize(13);
        status.setTypeface(Typeface.DEFAULT_BOLD);
        status.setGravity(Gravity.CENTER);
        status.setPadding(dp(12), dp(9), dp(12), dp(9));
        status.setBackground(rounded(t.accentSoft, dp(24), t.accent, 1));
        LinearLayout.LayoutParams statusLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
        statusLp.setMargins(dp(22), dp(4), dp(22), dp(12));
        root.addView(status, statusLp);

        String project = prefs.getString("activeProject", "Unassigned work");
        int accepted = prefs.getInt("acceptedSignals", 0);
        TextView context = new TextView(this);
        context.setText(project + " · " + accepted + " approved signals");
        context.setTextColor(t.accent);
        context.setTextSize(12);
        context.setGravity(Gravity.CENTER);
        context.setPadding(0, 0, 0, dp(12));
        root.addView(context, wrapHeight());
    }

    private void addLauncherGrid(LinearLayout root) {
        addTileRow(root, launcherTile("N", "Nexus", () -> openUrl(aiAssistantUrl("work-mode-launcher"))), launcherTile("WA", "WhatsApp", () -> openPackageOrWeb("com.whatsapp", "https://wa.me/")), launcherTile("TEL", "Phone", () -> openIntent(new Intent(Intent.ACTION_DIAL))));
        addTileRow(root, launcherTile("CAM", "Camera", this::openCamera), launcherTile("MAP", "Maps", () -> openIntent(new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=construction%20site")))), launcherTile("GM", "Gmail", () -> openPackageOrWeb("com.google.android.gm", "mailto:")));
        addTileRow(root, launcherTile("XLS", "Excel", () -> openPackageOrWeb("com.microsoft.office.excel", "https://www.office.com/launch/excel")), launcherTile("DOC", "Docs", () -> openPackageOrWeb("com.google.android.apps.docs.editors.docs", "https://docs.google.com/document/")), launcherTile("DRV", "Drive", () -> openPackageOrWeb("com.google.android.apps.docs", "https://drive.google.com/")));
        addTileRow(root, launcherTile("T", "Teams", () -> openPackageOrWeb("com.microsoft.teams", "https://teams.microsoft.com/")), launcherTile("DF", "DoorFlow", () -> openUrl(doorflowUrl())), launcherTile("NX", "Nexus Portal", () -> openUrl(workTreeUrl("nexus-portal"))));
    }

    private Button launcherTile(String icon, String label, Runnable action) {
        ThemeProfile t = theme();
        Button tile = new Button(this);
        tile.setText(icon + "\n" + label);
        tile.setAllCaps(false);
        tile.setTextColor(t.text);
        tile.setTextSize(13);
        tile.setTypeface(Typeface.DEFAULT_BOLD);
        tile.setGravity(Gravity.CENTER);
        tile.setPadding(dp(5), dp(8), dp(5), dp(8));
        tile.setBackground(rounded(t.tile, dp(t.radius), t.border, 1));
        tile.setOnClickListener(v -> action.run());
        return tile;
    }

    private void addTileRow(LinearLayout root, Button left, Button middle, Button right) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setPadding(0, 0, 0, dp(10));
        row.addView(left, tileLp(0));
        row.addView(middle, tileLp(dp(10)));
        row.addView(right, tileLp(0));
        root.addView(row, fullWidth(dp(104)));
    }

    private LinearLayout.LayoutParams tileLp(int sideMargin) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(92), 1f);
        lp.setMargins(sideMargin == 0 ? 0 : dp(2), 0, sideMargin == 0 ? 0 : dp(2), 0);
        return lp;
    }

    private void addThemeSwitcher(LinearLayout root) {
        ThemeProfile t = theme();
        addSection(root, "VISUAL MODE");

        TextView current = new TextView(this);
        current.setText("Theme: " + t.name + " · Accent: " + t.accentId);
        current.setTextColor(t.muted);
        current.setTextSize(12);
        current.setGravity(Gravity.CENTER);
        current.setPadding(0, 0, 0, dp(6));
        root.addView(current, wrapHeight());

        addThemeRow(root, themeButton("Blue", "nexus-blue", t.accentId), themeButton("Light", "nexus-light", t.accentId), themeButton("Steel", "industrial-steel-gold", t.accentId));
        addThemeRow(root, themeButton("Cyan", t.id, "cyan"), themeButton("Gold", t.id, "gold"), themeButton("Laser", t.id, "laser-green"));
    }

    private Button themeButton(String label, String themeId, String accentId) {
        ThemeProfile t = theme();
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(12);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(t.text);
        boolean selected = t.id.equals(themeId) && t.accentId.equals(accentId);
        button.setBackground(rounded(selected ? t.accentSoft : t.panel, dp(16), selected ? t.accent : t.border, 1));
        button.setOnClickListener(v -> setVisualTheme(themeId, accentId));
        return button;
    }

    private void addThemeRow(LinearLayout root, Button left, Button middle, Button right) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.addView(left, chipLp(0));
        row.addView(middle, chipLp(dp(8)));
        row.addView(right, chipLp(0));
        root.addView(row, fullWidth(dp(50)));
    }

    private LinearLayout.LayoutParams chipLp(int sideMargin) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(42), 1f);
        lp.setMargins(sideMargin == 0 ? 0 : dp(2), 0, sideMargin == 0 ? 0 : dp(2), 0);
        return lp;
    }

    private void addValueBar(LinearLayout root) {
        ThemeProfile t = theme();
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setPadding(dp(8), dp(10), dp(8), dp(10));
        row.setBackground(rounded(t.panelSoft, dp(22), t.border, 1));
        row.addView(valueChip("One Tap", "Instant transition"), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        row.addView(valueChip("Distraction Free", "Work-first shell"), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        row.addView(valueChip("Secure", "Project context"), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        LinearLayout.LayoutParams lp = fullWidth(dp(82));
        lp.setMargins(0, dp(8), 0, dp(10));
        root.addView(row, lp);
    }

    private TextView valueChip(String title, String detail) {
        ThemeProfile t = theme();
        TextView chip = new TextView(this);
        chip.setText(title + "\n" + detail);
        chip.setTextColor(t.text);
        chip.setTextSize(10);
        chip.setGravity(Gravity.CENTER);
        chip.setLineSpacing(dp(1), 1.0f);
        return chip;
    }

    private void openCamera() {
        openIntent(new Intent("android.media.action.IMAGE_CAPTURE"));
    }

    private void openPackageOrWeb(String packageName, String fallbackUrl) {
        try {
            Intent launch = getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch != null) {
                startActivity(launch);
                return;
            }
        } catch (Exception ignored) {
        }
        openUrl(fallbackUrl);
    }

    private void openIntent(Intent intent) {
        try {
            startActivity(intent);
        } catch (Exception ex) {
            Toast.makeText(this, "App not available", Toast.LENGTH_SHORT).show();
        }
    }

    private String workTreeUrl(String surface) {
        String project = prefs == null ? "Unassigned work" : prefs.getString("activeProject", "Unassigned work");
        int accepted = prefs == null ? selectedCount() : prefs.getInt("acceptedSignals", selectedCount());
        return Uri.parse(TREE_URL).buildUpon()
                .appendQueryParameter("nexusMode", "work")
                .appendQueryParameter("nexusClient", "android-native")
                .appendQueryParameter("nexusSurface", surface)
                .appendQueryParameter("nexusProject", slug(project))
                .appendQueryParameter("acceptedSignals", String.valueOf(accepted))
                .build()
                .toString();
    }

    private String aiAssistantUrl(String surface) {
        String project = prefs == null ? inferProject() : prefs.getString("activeProject", inferProject());
        int accepted = prefs == null ? selectedCount() : prefs.getInt("acceptedSignals", selectedCount());
        return Uri.parse(TREE_URL).buildUpon()
                .appendQueryParameter("nexusMode", "work")
                .appendQueryParameter("nexusClient", "android-native")
                .appendQueryParameter("nexusSurface", "ai-assistant")
                .appendQueryParameter("nexusIntent", "ask-nexus")
                .appendQueryParameter("nexusAiContext", AI_CONTEXT_VERSION)
                .appendQueryParameter("nexusProject", slug(project))
                .appendQueryParameter("acceptedSignals", String.valueOf(accepted))
                .appendQueryParameter("signalTypes", sourceBreakdown())
                .appendQueryParameter("nexusPrompt", aiPrompt(surface))
                .build()
                .toString();
    }

    private String doorflowUrl() {
        String project = prefs == null ? "Unassigned work" : prefs.getString("activeProject", "Unassigned work");
        return Uri.parse(DOORFLOW_URL).buildUpon()
                .appendQueryParameter("nexusMode", "work")
                .appendQueryParameter("nexusClient", "android-native")
                .appendQueryParameter("nexusProject", slug(project))
                .appendQueryParameter("nexusAiContext", AI_CONTEXT_VERSION)
                .build()
                .toString();
    }

    private String aiPrompt(String surface) {
        return "Use the Android Work Mode context to identify the active project, likely work package, missing evidence, immediate next action, and the best Nexus Project Graph node to open. Surface=" + surface + ". Do not treat phone discovery as authority; resolve project permissions in Nexus.";
    }

    private String aiContextPacket(String project, int accepted) {
        ThemeProfile t = theme();
        return "version=" + AI_CONTEXT_VERSION + "; client=android-native" + "; theme=blue-nexus" + "; visualTheme=" + t.id + "; visualAccent=" + t.accentId + "; project=" + slug(project) + "; acceptedSignals=" + accepted + "; signalTypes=" + sourceBreakdown() + "; modelCall=server-side-only";
    }

    private String sourceBreakdown() {
        int contacts = 0;
        int calendar = 0;
        int files = 0;
        int photos = 0;
        int other = 0;
        for (Signal signal : signals) {
            if (!signal.selected) continue;
            if ("CONTACT".equals(signal.source)) contacts++;
            else if ("CALENDAR".equals(signal.source)) calendar++;
            else if ("FILE".equals(signal.source)) files++;
            else if ("PHOTO".equals(signal.source)) photos++;
            else other++;
        }
        if (signals.isEmpty() && prefs != null) {
            String packet = prefs.getString("aiContextPacket", "");
            if (!packet.isEmpty()) return "persisted-local-packet";
        }
        return "contact:" + contacts + ",calendar:" + calendar + ",file:" + files + ",photo:" + photos + ",other:" + other;
    }

    private String inferProject() {
        List<String> ordered = Arrays.asList("halifax", "tesco", "riverside", "lloyds", "nosmo");
        for (String candidate : ordered) {
            for (Signal signal : signals) {
                if (!signal.selected) continue;
                String haystack = (signal.title + " " + signal.detail).toLowerCase(Locale.UK);
                if (haystack.contains(candidate)) {
                    if (candidate.equals("halifax")) return "Halifax Project";
                    if (candidate.equals("tesco")) return "Tesco Work";
                    if (candidate.equals("riverside")) return "Riverside Project";
                    if (candidate.equals("lloyds")) return "Lloyds Project";
                    if (candidate.equals("nosmo")) return "NOSMO / Nexus";
                }
            }
        }
        return "Unassigned work";
    }

    private void addSignal(String source, String title, String detail, int confidence) {
        String cleanTitle = title == null ? "" : title.trim();
        String cleanDetail = detail == null ? "" : detail.trim();
        String key = (source + "|" + cleanTitle + "|" + cleanDetail).toLowerCase(Locale.UK);
        if (cleanTitle.isEmpty() || dedupe.contains(key)) return;
        dedupe.add(key);
        signals.add(new Signal(source, cleanTitle, cleanDetail, Math.min(99, Math.max(1, confidence))));
    }

    private int selectedCount() {
        int count = 0;
        for (Signal signal : signals) if (signal.selected) count++;
        return count;
    }

    private String selectedSummary() {
        StringBuilder out = new StringBuilder();
        int shown = 0;
        for (Signal signal : signals) {
            if (!signal.selected) continue;
            if (shown > 0) out.append("\n");
            out.append("• ").append(signal.summary());
            shown++;
            if (shown >= 6) break;
        }
        int remaining = selectedCount() - shown;
        if (remaining > 0) out.append("\n+ ").append(remaining).append(" more approved signals");
        return out.toString();
    }

    private int workScore(String value) {
        String s = value == null ? "" : value.toLowerCase(Locale.UK);
        int score = 0;
        String[] strong = new String[]{"nosmo", "nexus", "halifax", "tesco", "riverside", "lloyds", "doorflow", "fabstation", "work wallet", "workwallet", "procore", "autodesk"};
        String[] construction = new String[]{"site", "project", "construction", "joiner", "carpenter", "manager", "supervisor", "bim", "ifc", "drawing", "floor", "room", "inspection", "snag", "handover", "commissioning", "fire", "door", "electrical", "hvac", "mep", "ceiling", "drywall", "drylining", "qa", "qc", "rfi", "programme", "schedule"};
        for (String token : strong) if (s.contains(token)) score += 35;
        for (String token : construction) if (s.contains(token)) score += 16;
        if (s.endsWith(".pdf") || s.endsWith(".xlsx") || s.endsWith(".xls") || s.endsWith(".docx") || s.endsWith(".pptx") || s.endsWith(".ifc") || s.endsWith(".dwg")) score += 25;
        return Math.min(score, 99);
    }

    private boolean likelyWorkFile(String name) {
        String n = name == null ? "" : name.toLowerCase(Locale.UK);
        if (n.endsWith(".pdf") || n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".docx") || n.endsWith(".pptx") || n.endsWith(".ifc") || n.endsWith(".dwg") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png")) {
            return true;
        }
        return workScore(n) >= 45;
    }

    private String joinNonEmpty(String... values) {
        StringBuilder out = new StringBuilder();
        for (String value : values) {
            if (value == null) continue;
            String clean = value.trim();
            if (clean.isEmpty()) continue;
            if (out.length() > 0) out.append(" · ");
            out.append(clean);
        }
        return out.toString();
    }

    private String nonEmpty(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) return value.trim();
        }
        return "";
    }

    private String trim(String value, int max) {
        if (value == null) return "";
        String clean = value.trim();
        if (clean.length() <= max) return clean;
        return clean.substring(0, Math.max(0, max - 1)) + "…";
    }

    private String value(Cursor cursor, int index) {
        if (cursor == null || index < 0) return "";
        try {
            String value = cursor.getString(index);
            return value == null ? "" : value;
        } catch (Exception ignored) {
            return "";
        }
    }

    private String slug(String value) {
        String clean = value == null ? "unassigned-work" : value.toLowerCase(Locale.UK);
        clean = clean.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        return clean.isEmpty() ? "unassigned-work" : clean;
    }

    private LinearLayout page() {
        ThemeProfile t = theme();
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(18), dp(18), dp(28));
        root.setBackgroundColor(t.bg);
        return root;
    }

    private void setPage(LinearLayout root) {
        ThemeProfile t = theme();
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(false);
        scroll.setBackgroundColor(t.bg);
        scroll.addView(root, new ScrollView.LayoutParams(ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));
        setContentView(scroll);
    }

    private void addBrand(LinearLayout root) {
        ThemeProfile t = theme();
        TextView brand = new TextView(this);
        brand.setText("NEXUS");
        brand.setTextColor(t.accent);
        brand.setTextSize(15);
        brand.setTypeface(Typeface.DEFAULT_BOLD);
        brand.setLetterSpacing(0.22f);
        brand.setGravity(Gravity.CENTER_VERTICAL);
        brand.setPadding(dp(14), dp(10), dp(14), dp(10));
        brand.setBackground(rounded(t.panelSoft, dp(18), t.border, 1));
        LinearLayout.LayoutParams lp = fullWidth(dp(44));
        lp.setMargins(0, 0, 0, dp(18));
        root.addView(brand, lp);
    }

    private void addTitle(LinearLayout root, String text) {
        ThemeProfile t = theme();
        TextView title = new TextView(this);
        title.setText(text);
        title.setTextColor(t.text);
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, dp(10));
        root.addView(title, wrapHeight());
    }

    private void addBody(LinearLayout root, String text) {
        ThemeProfile t = theme();
        TextView body = new TextView(this);
        body.setText(text);
        body.setTextColor(t.muted);
        body.setTextSize(15);
        body.setLineSpacing(dp(2), 1.05f);
        body.setPadding(0, 0, 0, dp(14));
        root.addView(body, wrapHeight());
    }

    private void addStatus(LinearLayout root, String text, int color) {
        ThemeProfile t = theme();
        TextView status = new TextView(this);
        status.setText(text);
        status.setTextColor(color);
        status.setTextSize(12);
        status.setTypeface(Typeface.DEFAULT_BOLD);
        status.setPadding(dp(12), dp(8), dp(12), dp(8));
        status.setBackground(rounded(t.accentSoft, dp(16), t.border, 1));
        LinearLayout.LayoutParams lp = fullWidth(dp(40));
        lp.setMargins(0, 0, 0, dp(14));
        root.addView(status, lp);
    }

    private void addSection(LinearLayout root, String text) {
        ThemeProfile t = theme();
        TextView section = new TextView(this);
        section.setText(text);
        section.setTextColor(t.accent);
        section.setTextSize(12);
        section.setTypeface(Typeface.DEFAULT_BOLD);
        section.setLetterSpacing(0.08f);
        section.setPadding(0, dp(16), 0, dp(8));
        root.addView(section, wrapHeight());
    }

    private void addSmall(LinearLayout root, String text) {
        ThemeProfile t = theme();
        TextView small = new TextView(this);
        small.setText(text);
        small.setTextColor(t.muted);
        small.setTextSize(12);
        small.setLineSpacing(dp(2), 1.05f);
        small.setPadding(0, dp(8), 0, dp(12));
        root.addView(small, wrapHeight());
    }

    private Button primaryButton(String text) {
        return button(text, true);
    }

    private Button secondaryButton(String text) {
        return button(text, false);
    }

    private Button button(String text, boolean primary) {
        ThemeProfile t = theme();
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextSize(15);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(primary ? Color.WHITE : t.text);
        int fill = primary ? t.accent : t.panel;
        int stroke = primary ? t.accent : t.border;
        button.setBackground(rounded(fill, dp(18), stroke, 1));
        button.setGravity(Gravity.CENTER);
        button.setPadding(dp(12), 0, dp(12), 0);
        return button;
    }

    private GradientDrawable rounded(int fill, int radius, int strokeColor, int strokeWidth) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(radius);
        drawable.setStroke(dp(strokeWidth), strokeColor);
        return drawable;
    }

    private LinearLayout.LayoutParams fullWidth(int height) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, height);
        lp.setMargins(0, dp(6), 0, dp(8));
        return lp;
    }

    private LinearLayout.LayoutParams wrapHeight() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ex) {
            Toast.makeText(this, "Cannot open Nexus link", Toast.LENGTH_SHORT).show();
        }
    }
}
