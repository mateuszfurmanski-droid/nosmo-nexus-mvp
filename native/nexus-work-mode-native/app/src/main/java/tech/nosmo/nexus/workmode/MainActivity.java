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
import android.net.Uri;
import android.os.Bundle;
import android.provider.CalendarContract;
import android.provider.ContactsContract;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int REQ_DISCOVERY_PERMISSIONS = 41;
    private static final int REQ_WORK_FOLDER = 42;
    private static final int REQ_PHOTOS = 43;

    private static final String PREFS = "nexus_work_mode";
    private static final String TREE_URL = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/";
    private static final String DOORFLOW_URL = "https://nosmotechnology.co.uk/doorflow.html";
    private static final String NEXUS_URL = "https://nosmotechnology.co.uk/nexus.html";

    private final ArrayList<Signal> signals = new ArrayList<>();
    private SharedPreferences prefs;
    private boolean workMode;
    private boolean editingContext;
    private String activeProject = "Unassigned work";
    private int acceptedSignals;

    private final String[] keywords = new String[]{
            "construction", "project", "site", "joiner", "carpenter", "manager", "engineer",
            "electric", "electrical", "door", "fire", "bim", "drawing", "dwg", "rvt", "ifc",
            "snag", "inspection", "induction", "permit", "tesco", "halifax", "lloyds",
            "riverside", "nosmo", "procore", "hilti", "work wallet", "fabstation", "contractor",
            "subcontract", "ceiling", "commission", "fitout", "fit out", "installation", "qa", "qc"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(3, 4, 7));
        getWindow().setNavigationBarColor(Color.rgb(3, 4, 7));

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        loadState();
        render();
    }

    private void loadState() {
        Map<String, ?> all = prefs.getAll();
        workMode = readBoolean(all.get("workMode"), false);
        activeProject = readString(all.get("activeProject"), "Unassigned work");
        acceptedSignals = readInt(all.get("acceptedSignals"), 0);

        String encoded = readString(all.get("signalsV2"), "");
        if (!encoded.isEmpty()) {
            for (String line : encoded.split("\\n")) {
                Signal signal = Signal.decode(line);
                if (signal != null) signals.add(signal);
            }
        }
    }

    private void render() {
        if (workMode && !editingContext) {
            setContentView(buildWorkModeView());
        } else {
            setContentView(buildDiscoveryView());
        }
    }

    private View buildWorkModeView() {
        LinearLayout root = pageRoot();
        addBrand(root);
        addTitle(root, "WORK MODE");

        TextView on = text("ON", 17, Color.rgb(72, 232, 185), true);
        on.setGravity(Gravity.CENTER);
        root.addView(on, fullWidth(dp(50)));

        addSection(root, "ACTIVE CONTEXT", Color.rgb(245, 196, 0));

        TextView project = text(activeProject, 20, Color.rgb(190, 201, 214), false);
        project.setGravity(Gravity.CENTER);
        root.addView(project, fullWidth(dp(48)));

        TextView count = text(acceptedSignals + " approved work signals", 18, Color.rgb(190, 201, 214), false);
        count.setGravity(Gravity.CENTER);
        root.addView(count, fullWidth(dp(42)));

        Button world = primaryButton("PROJECT WORLD / RELATIONSHIP TREE");
        world.setOnClickListener(v -> openProjectWorld());
        root.addView(world, fullWidth(dp(70)));

        Button doorflow = secondaryButton("DOORFLOW");
        doorflow.setOnClickListener(v -> openUrl(DOORFLOW_URL));
        root.addView(doorflow, fullWidth(dp(62)));

        Button nexus = secondaryButton("OPEN NEXUS");
        nexus.setOnClickListener(v -> openUrl(NEXUS_URL));
        root.addView(nexus, fullWidth(dp(62)));

        Button update = secondaryButton("UPDATE WORK CONTEXT");
        update.setOnClickListener(v -> {
            editingContext = true;
            render();
        });
        root.addView(update, fullWidth(dp(62)));

        Button off = secondaryButton("TURN WORK MODE OFF");
        off.setOnClickListener(v -> {
            workMode = false;
            editingContext = false;
            persist();
            Toast.makeText(this, "Work Mode OFF", Toast.LENGTH_SHORT).show();
            render();
        });
        root.addView(off, fullWidth(dp(62)));

        TextView footer = text(
                "Native Android beta 0.5.1 · accepted context stays local on this device until Project Graph sync is enabled.",
                11, Color.rgb(112, 126, 142), false);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(dp(8), dp(18), dp(8), dp(12));
        root.addView(footer, fullWidthWrap());
        return wrap(root);
    }

    private View buildDiscoveryView() {
        LinearLayout root = pageRoot();
        addBrand(root);
        addTitle(root, "WORK MODE");

        TextView intro = text(
                "NEXUS discovers work context only from Android sources you approve. Start with contacts and calendar, then add a project folder or selected photos.",
                14, Color.rgb(190, 201, 214), false);
        intro.setGravity(Gravity.CENTER);
        intro.setLineSpacing(0f, 1.18f);
        root.addView(intro, fullWidthWrap());

        if (acceptedSignals > 0 && !signals.isEmpty()) {
            TextView existing = text("ACTIVE CONTEXT · " + activeProject + " · " + acceptedSignals + " accepted", 12, Color.rgb(72, 232, 185), true);
            existing.setGravity(Gravity.CENTER);
            existing.setPadding(0, dp(12), 0, dp(6));
            root.addView(existing, fullWidthWrap());
        } else if (acceptedSignals > 0) {
            TextView existing = text("CURRENT CONTEXT · " + activeProject + " · " + acceptedSignals + " accepted signals", 12, Color.rgb(72, 232, 185), true);
            existing.setGravity(Gravity.CENTER);
            existing.setPadding(0, dp(12), 0, dp(6));
            root.addView(existing, fullWidthWrap());
        }

        addSection(root, "1 · DISCOVER", Color.rgb(245, 196, 0));

        Button scan = primaryButton(signals.isEmpty() ? "START DISCOVERY" : "RESCAN PHONE");
        scan.setOnClickListener(v -> requestAndScanPhone());
        root.addView(scan, fullWidth(dp(62)));

        Button folder = secondaryButton("+ ADD / SCAN WORK FOLDER");
        folder.setOnClickListener(v -> chooseWorkFolder());
        root.addView(folder, fullWidth(dp(58)));

        Button photos = secondaryButton("+ ADD WORK PHOTOS");
        photos.setOnClickListener(v -> choosePhotos());
        root.addView(photos, fullWidth(dp(58)));

        addSection(root, "2 · DISCOVERY REVIEW", Color.rgb(245, 196, 0));

        if (signals.isEmpty()) {
            TextView empty = panelText(acceptedSignals > 0
                    ? "Your current Work Mode context is preserved. Rescan the phone or add a folder/photos to update it."
                    : "No strong work signals found yet. Add a project folder or selected photos.");
            root.addView(empty, fullWidthWrap());
        } else {
            TextView found = panelText(signals.size() + " work signals found. They are selected by default — untick anything that does not belong to work.");
            root.addView(found, fullWidthWrap());

            int shown = Math.min(40, signals.size());
            for (int i = 0; i < shown; i++) {
                Signal signal = signals.get(i);
                CheckBox check = new CheckBox(this);
                check.setChecked(signal.accepted);
                check.setTextColor(Color.rgb(225, 232, 238));
                check.setTextSize(13);
                check.setPadding(dp(8), dp(7), dp(8), dp(7));
                check.setButtonTintList(android.content.res.ColorStateList.valueOf(Color.rgb(245, 196, 0)));
                String detail = signal.detail.isEmpty() ? "" : "\n" + signal.detail;
                check.setText(signal.category + " · " + signal.title + detail + " · " + signal.confidence + "%");
                check.setOnCheckedChangeListener((buttonView, isChecked) -> signal.accepted = isChecked);
                root.addView(check, fullWidthWrap());
            }
            if (signals.size() > shown) {
                TextView more = text("+ " + (signals.size() - shown) + " more signals retained in this discovery", 11, Color.rgb(112, 126, 142), false);
                more.setPadding(dp(8), dp(6), dp(8), dp(6));
                root.addView(more, fullWidthWrap());
            }
        }

        addSection(root, "3 · WORK MODE", Color.rgb(245, 196, 0));

        Button accept = primaryButton(signals.isEmpty() && acceptedSignals > 0
                ? "RETURN TO WORK MODE"
                : "ACCEPT + START WORK MODE");
        accept.setOnClickListener(v -> acceptAndStartWorkMode());
        root.addView(accept, fullWidth(dp(66)));

        if (!signals.isEmpty()) {
            Button clear = secondaryButton("CLEAR FOUND CONTEXT");
            clear.setOnClickListener(v -> {
                signals.clear();
                render();
            });
            root.addView(clear, fullWidth(dp(54)));
        }

        TextView privacy = text(
                "Privacy boundary: no Accessibility Service, no WhatsApp/Gmail database scraping, no unrestricted storage crawl. Android permissions and system pickers only.",
                11, Color.rgb(112, 126, 142), false);
        privacy.setGravity(Gravity.CENTER);
        privacy.setPadding(dp(6), dp(18), dp(6), dp(14));
        root.addView(privacy, fullWidthWrap());

        return wrap(root);
    }

    private void requestAndScanPhone() {
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
            scanPhoneContext();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_DISCOVERY_PERMISSIONS) scanPhoneContext();
    }

    private void scanPhoneContext() {
        int before = signals.size();
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) scanContacts();
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) scanCalendar();
        dedupeSignals();
        Toast.makeText(this, "Phone scan: " + Math.max(0, signals.size() - before) + " new work signals", Toast.LENGTH_LONG).show();
        render();
    }

    private void scanContacts() {
        ContentResolver resolver = getContentResolver();
        Map<Long, StringBuilder> details = new HashMap<>();

        String[] dataProjection = new String[]{
                ContactsContract.Data.CONTACT_ID,
                ContactsContract.Data.MIMETYPE,
                ContactsContract.Data.DATA1,
                ContactsContract.Data.DATA4
        };
        String selection = ContactsContract.Data.MIMETYPE + "=? OR " + ContactsContract.Data.MIMETYPE + "=?";
        String[] args = new String[]{
                ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE,
                ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE
        };

        try (Cursor c = resolver.query(ContactsContract.Data.CONTENT_URI, dataProjection, selection, args, null)) {
            if (c != null) {
                while (c.moveToNext()) {
                    long id = c.getLong(0);
                    String a = c.getString(2);
                    String b = c.getString(3);
                    StringBuilder sb = details.computeIfAbsent(id, key -> new StringBuilder());
                    if (a != null) sb.append(' ').append(a);
                    if (b != null) sb.append(' ').append(b);
                }
            }
        } catch (Exception ignored) {
        }

        String[] projection = new String[]{ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY};
        try (Cursor c = resolver.query(ContactsContract.Contacts.CONTENT_URI, projection, null, null, null)) {
            if (c == null) return;
            int inspected = 0;
            while (c.moveToNext() && inspected < 1800 && signals.size() < 220) {
                inspected++;
                long id = c.getLong(0);
                String name = c.getString(1);
                String extra = details.containsKey(id) ? details.get(id).toString() : "";
                String joined = safe(name, "") + " " + extra;
                int score = score(joined);
                if (score > 0) {
                    signals.add(new Signal("CONTACT", safe(name, "Work contact"), clean(extra), confidence(score), true));
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void scanCalendar() {
        long now = System.currentTimeMillis();
        long range = 120L * 24L * 60L * 60L * 1000L;
        String[] projection = new String[]{
                CalendarContract.Events.TITLE,
                CalendarContract.Events.EVENT_LOCATION,
                CalendarContract.Events.DESCRIPTION,
                CalendarContract.Events.DTSTART
        };
        String selection = CalendarContract.Events.DTSTART + ">? AND " + CalendarContract.Events.DTSTART + "<?";
        String[] args = new String[]{String.valueOf(now - range), String.valueOf(now + range)};
        try (Cursor c = getContentResolver().query(
                CalendarContract.Events.CONTENT_URI,
                projection,
                selection,
                args,
                CalendarContract.Events.DTSTART + " DESC")) {
            if (c == null) return;
            int inspected = 0;
            while (c.moveToNext() && inspected < 1000 && signals.size() < 280) {
                inspected++;
                String title = c.getString(0);
                String location = c.getString(1);
                String description = c.getString(2);
                String joined = safe(title, "") + " " + safe(location, "") + " " + safe(description, "");
                int score = score(joined);
                if (score > 0) {
                    String detail = safe(location, "");
                    signals.add(new Signal("CALENDAR", safe(title, "Work calendar event"), detail, confidence(score), true));
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void chooseWorkFolder() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
                Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, REQ_WORK_FOLDER);
    }

    private void choosePhotos() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType("image/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(intent, REQ_PHOTOS);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null) return;

        if (requestCode == REQ_WORK_FOLDER && data.getData() != null) {
            Uri tree = data.getData();
            int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            try {
                getContentResolver().takePersistableUriPermission(tree, flags & Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {
            }
            int before = signals.size();
            try {
                String rootId = DocumentsContract.getTreeDocumentId(tree);
                scanDirectory(tree, rootId, 0, new int[]{0});
            } catch (Exception e) {
                Toast.makeText(this, "Folder selected, but Android did not expose its contents.", Toast.LENGTH_LONG).show();
            }
            dedupeSignals();
            Toast.makeText(this, "Folder scan: " + Math.max(0, signals.size() - before) + " likely work files", Toast.LENGTH_LONG).show();
            render();
            return;
        }

        if (requestCode == REQ_PHOTOS) {
            int before = signals.size();
            ClipData clip = data.getClipData();
            if (clip != null) {
                for (int i = 0; i < clip.getItemCount() && i < 80; i++) addPickedPhoto(clip.getItemAt(i).getUri());
            } else if (data.getData() != null) {
                addPickedPhoto(data.getData());
            }
            dedupeSignals();
            Toast.makeText(this, (signals.size() - before) + " photos added", Toast.LENGTH_LONG).show();
            render();
        }
    }

    private void addPickedPhoto(Uri uri) {
        if (uri == null) return;
        try {
            getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {
        }
        String name = queryDisplayName(uri);
        signals.add(new Signal("PHOTO", safe(name, "Selected photo"), "Selected work evidence", 78, true));
    }

    private String queryDisplayName(Uri uri) {
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignored) {
        }
        return "Selected photo";
    }

    private void scanDirectory(Uri tree, String documentId, int depth, int[] visited) {
        if (depth > 6 || visited[0] >= 450 || signals.size() >= 360) return;
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, documentId);
        String[] projection = new String[]{
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE
        };
        try (Cursor c = getContentResolver().query(children, projection, null, null, null)) {
            if (c == null) return;
            while (c.moveToNext() && visited[0] < 450 && signals.size() < 360) {
                visited[0]++;
                String childId = c.getString(0);
                String name = c.getString(1);
                String mime = c.getString(2);
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    scanDirectory(tree, childId, depth + 1, visited);
                } else if (isLikelyWorkFile(name, mime)) {
                    int score = Math.max(1, score(name));
                    signals.add(new Signal("FILE", safe(name, "Project file"), "Matched work/project keywords", confidence(score), true));
                }
            }
        } catch (Exception ignored) {
        }
    }

    private boolean isLikelyWorkFile(String name, String mime) {
        String value = (safe(name, "") + " " + safe(mime, "")).toLowerCase(Locale.ROOT);
        if (score(value) > 0) return true;
        String[] extensions = new String[]{
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".dwg", ".dxf", ".ifc", ".rvt",
                ".nwd", ".nwc", ".ppt", ".pptx", ".csv", ".txt", ".zip"
        };
        for (String ext : extensions) if (value.endsWith(ext)) return true;
        return false;
    }

    private void acceptAndStartWorkMode() {
        if (signals.isEmpty()) {
            if (acceptedSignals > 0) {
                workMode = true;
                editingContext = false;
                persist();
                render();
                return;
            }
            Toast.makeText(this, "No work context selected yet", Toast.LENGTH_SHORT).show();
            return;
        }

        int selected = 0;
        for (Signal signal : signals) if (signal.accepted) selected++;
        if (selected == 0) {
            Toast.makeText(this, "Select at least one work signal", Toast.LENGTH_SHORT).show();
            return;
        }

        acceptedSignals = selected;
        activeProject = inferProjectFromAccepted();
        workMode = true;
        editingContext = false;
        persist();
        Toast.makeText(this, "NEXUS Work Mode ON", Toast.LENGTH_SHORT).show();
        render();
    }

    private String inferProjectFromAccepted() {
        StringBuilder joined = new StringBuilder();
        for (Signal signal : signals) {
            if (signal.accepted) joined.append(' ').append(signal.title).append(' ').append(signal.detail);
        }
        String lower = joined.toString().toLowerCase(Locale.ROOT);
        if (lower.contains("tesco")) return "Tesco Work";
        if (lower.contains("halifax")) return "Halifax Project";
        if (lower.contains("lloyds")) return "Lloyds Project";
        if (lower.contains("riverside")) return "Riverside Project";
        if (lower.contains("nosmo") || lower.contains("nexus")) return "NOSMO / Nexus";
        return activeProject.equals("Unassigned work") ? "Detected work context" : activeProject;
    }

    private void openProjectWorld() {
        Uri url = Uri.parse(TREE_URL).buildUpon()
                .appendQueryParameter("world", "workmode")
                .appendQueryParameter("project", activeProject)
                .appendQueryParameter("signals", String.valueOf(acceptedSignals))
                .appendQueryParameter("source", "android")
                .build();
        openUrl(url.toString());
    }

    private void persist() {
        StringBuilder encoded = new StringBuilder();
        for (Signal signal : signals) {
            if (encoded.length() > 0) encoded.append('\n');
            encoded.append(signal.encode());
        }
        prefs.edit()
                .putBoolean("workMode", workMode)
                .putString("activeProject", activeProject)
                .putInt("acceptedSignals", acceptedSignals)
                .putString("signalsV2", encoded.toString())
                .apply();
    }

    private void dedupeSignals() {
        LinkedHashMap<String, Signal> unique = new LinkedHashMap<>();
        for (Signal signal : signals) {
            String key = (signal.category + "|" + signal.title + "|" + signal.detail).toLowerCase(Locale.ROOT);
            if (!unique.containsKey(key)) unique.put(key, signal);
        }
        signals.clear();
        signals.addAll(unique.values());
    }

    private int score(String text) {
        if (text == null) return 0;
        String lower = text.toLowerCase(Locale.ROOT);
        int points = 0;
        for (String keyword : keywords) if (lower.contains(keyword)) points++;
        return points;
    }

    private int confidence(int score) {
        return Math.min(98, 55 + score * 9);
    }

    private LinearLayout pageRoot() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(24), dp(32), dp(24), dp(30));
        root.setBackgroundColor(Color.rgb(3, 4, 7));
        return root;
    }

    private ScrollView wrap(LinearLayout root) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(3, 4, 7));
        scroll.addView(root, new ScrollView.LayoutParams(ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));
        return scroll;
    }

    private void addBrand(LinearLayout root) {
        TextView brand = text("N E X U S", 16, Color.rgb(245, 196, 0), true);
        brand.setGravity(Gravity.CENTER);
        brand.setLetterSpacing(0.10f);
        root.addView(brand, fullWidth(dp(48)));
    }

    private void addTitle(LinearLayout root, String value) {
        TextView title = text(value, 27, Color.WHITE, true);
        title.setGravity(Gravity.CENTER);
        root.addView(title, fullWidth(dp(74)));
    }

    private void addSection(LinearLayout root, String value, int color) {
        TextView section = text(value, 12, color, true);
        section.setLetterSpacing(0.08f);
        section.setPadding(0, dp(18), 0, dp(6));
        root.addView(section, fullWidthWrap());
    }

    private TextView panelText(String value) {
        TextView view = text(value, 13, Color.rgb(216, 224, 232), false);
        view.setPadding(dp(14), dp(14), dp(14), dp(14));
        view.setBackgroundColor(Color.rgb(17, 21, 28));
        return view;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(color);
        view.setTextSize(size);
        if (bold) view.setTypeface(null, 1);
        return view;
    }

    private Button primaryButton(String value) {
        Button button = new Button(this);
        button.setText(value);
        button.setTextColor(Color.rgb(3, 4, 7));
        button.setTextSize(13);
        button.setTypeface(null, 1);
        button.setBackgroundColor(Color.rgb(245, 196, 0));
        button.setAllCaps(false);
        return button;
    }

    private Button secondaryButton(String value) {
        Button button = new Button(this);
        button.setText(value);
        button.setTextColor(Color.WHITE);
        button.setTextSize(13);
        button.setTypeface(null, 1);
        button.setBackgroundColor(Color.rgb(22, 28, 36));
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams fullWidth(int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, height);
        params.setMargins(0, dp(7), 0, dp(7));
        return params;
    }

    private LinearLayout.LayoutParams fullWidthWrap() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(7), 0, dp(7));
        return params;
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "No browser available", Toast.LENGTH_SHORT).show();
        }
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private String clean(String value) {
        return safe(value, "").replaceAll("\\s+", " ").trim();
    }

    private String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private boolean readBoolean(Object value, boolean fallback) {
        if (value instanceof Boolean) return (Boolean) value;
        if (value instanceof String) return Boolean.parseBoolean((String) value);
        return fallback;
    }

    private int readInt(Object value, int fallback) {
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Long) return ((Long) value).intValue();
        if (value instanceof String) {
            try { return Integer.parseInt((String) value); } catch (Exception ignored) { }
        }
        return fallback;
    }

    private String readString(Object value, String fallback) {
        return value instanceof String ? (String) value : fallback;
    }

    private static class Signal {
        final String category;
        final String title;
        final String detail;
        final int confidence;
        boolean accepted;

        Signal(String category, String title, String detail, int confidence, boolean accepted) {
            this.category = category;
            this.title = title;
            this.detail = detail;
            this.confidence = confidence;
            this.accepted = accepted;
        }

        String encode() {
            return Uri.encode(category) + "|" + Uri.encode(title) + "|" + Uri.encode(detail) + "|" + confidence + "|" + (accepted ? "1" : "0");
        }

        static Signal decode(String line) {
            if (line == null || line.trim().isEmpty()) return null;
            String[] parts = line.split("\\|", -1);
            if (parts.length != 5) return null;
            try {
                return new Signal(
                        Uri.decode(parts[0]),
                        Uri.decode(parts[1]),
                        Uri.decode(parts[2]),
                        Integer.parseInt(parts[3]),
                        "1".equals(parts[4])
                );
            } catch (Exception ignored) {
                return null;
            }
        }
    }
}
