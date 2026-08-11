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
import android.view.Gravity;
import android.view.View;
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

    private static final int BG = Color.rgb(3, 4, 7);
    private static final int GOLD = Color.rgb(245, 196, 0);
    private static final int TEXT = Color.rgb(238, 242, 247);
    private static final int MUTED = Color.rgb(164, 176, 190);
    private static final int GREEN = Color.rgb(72, 232, 185);
    private static final int PANEL = Color.rgb(20, 25, 31);

    private static final String NEXUS_URL = "https://nosmotechnology.co.uk/nexus.html";
    private static final String TREE_URL = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/";
    private static final String DOORFLOW_URL = "https://nosmotechnology.co.uk/doorflow.html";

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
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        prefs = getSharedPreferences("nexus_work_mode", MODE_PRIVATE);

        if (prefs.getBoolean("workMode", false)) {
            showWorkMode();
        } else {
            showWelcome();
        }
    }

    private void showWelcome() {
        LinearLayout root = page();
        addBrand(root);
        addTitle(root, "Work Mode");
        addBody(root,
                "NEXUS discovers work context only from Android sources you approve. Start with contacts and calendar, then add a project folder or selected photos.");
        addStatus(root, "READY", GREEN);

        Button start = primaryButton("START DISCOVERY");
        start.setOnClickListener(v -> startDiscovery());
        root.addView(start, fullWidth(dp(60)));

        Button nexus = secondaryButton("OPEN NEXUS");
        nexus.setOnClickListener(v -> openUrl(NEXUS_URL));
        root.addView(nexus, fullWidth(dp(56)));

        addSmall(root,
                "Privacy boundary: no Accessibility Service, no WhatsApp/Gmail database scraping, no unrestricted storage crawl. Android permissions and system pickers only.");
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

        Toast.makeText(this,
                "Phone scan: " + contacts + " contacts, " + calendar + " calendar signals",
                Toast.LENGTH_LONG).show();
        showReview();
    }

    private int scanContacts() {
        int before = signals.size();
        ContentResolver resolver = getContentResolver();

        String[] orgProjection = new String[]{
                ContactsContract.CommonDataKinds.Organization.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Organization.COMPANY,
                ContactsContract.CommonDataKinds.Organization.TITLE
        };
        String selection = ContactsContract.Data.MIMETYPE + "=?";
        String[] args = new String[]{ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE};

        try (Cursor cursor = resolver.query(
                ContactsContract.Data.CONTENT_URI,
                orgProjection,
                selection,
                args,
                null)) {
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
                    addSignal("CONTACT", nonEmpty(name, company, "Work contact"),
                            joinNonEmpty(company, title), Math.max(score, 55));
                }
            }
        } catch (Exception ignored) {
        }

        String[] contactProjection = new String[]{ContactsContract.Contacts.DISPLAY_NAME_PRIMARY};
        try (Cursor cursor = resolver.query(
                ContactsContract.Contacts.CONTENT_URI,
                contactProjection,
                null,
                null,
                null)) {
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

        String[] projection = new String[]{
                CalendarContract.Events.TITLE,
                CalendarContract.Events.EVENT_LOCATION,
                CalendarContract.Events.DESCRIPTION,
                CalendarContract.Events.DTSTART
        };
        String selection = CalendarContract.Events.DTSTART + ">=? AND " +
                CalendarContract.Events.DTSTART + "<=?";
        String[] args = new String[]{String.valueOf(from), String.valueOf(to)};

        try (Cursor cursor = getContentResolver().query(
                CalendarContract.Events.CONTENT_URI,
                projection,
                selection,
                args,
                CalendarContract.Events.DTSTART + " DESC")) {
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
                        addSignal("CALENDAR", nonEmpty(title, "Work calendar event"),
                                joinNonEmpty(location, trim(description, 80)), Math.max(score, 50));
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return signals.size() - before;
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
                getContentResolver().takePersistableUriPermission(
                        treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
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
        String[] projection = new String[]{
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE
        };

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
        String[] projection = new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME};
        try (Cursor cursor = getContentResolver().query(uri, projection, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int ix = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME);
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
        addTitle(root, "Discovery Review");
        int selectedCount = selectedCount();
        addBody(root, signals.isEmpty()
                ? "No strong work signals found yet. Add a project folder or selected photos."
                : signals.size() + " work signals found. They are selected by default — untick anything that does not belong to work.");
        addStatus(root, selectedCount + " SELECTED", GREEN);

        Button folder = secondaryButton("+ ADD / SCAN WORK FOLDER");
        folder.setOnClickListener(v -> chooseWorkFolder());
        root.addView(folder, fullWidth(dp(54)));

        Button photos = secondaryButton("+ ADD WORK PHOTOS");
        photos.setOnClickListener(v -> choosePhotos());
        root.addView(photos, fullWidth(dp(54)));

        addSection(root, "FOUND CONTEXT");
        int shown = 0;
        for (Signal signal : signals) {
            if (shown >= 80) break;
            CheckBox box = new CheckBox(this);
            box.setText(signal.source + " · " + signal.title +
                    (signal.detail.isEmpty() ? "" : "\n" + signal.detail) +
                    "\nconfidence " + signal.confidence + "%");
            box.setTextColor(TEXT);
            box.setTextSize(14);
            box.setChecked(signal.selected);
            box.setPadding(dp(4), dp(8), dp(4), dp(8));
            box.setOnCheckedChangeListener((buttonView, isChecked) -> signal.selected = isChecked);
            root.addView(box, wrapHeight());
            shown++;
        }
        if (signals.size() > shown) {
            addSmall(root, "+ " + (signals.size() - shown) + " more signals retained in this scan.");
        }

        Button start = primaryButton("ACCEPT + START WORK MODE");
        start.setOnClickListener(v -> enableWorkMode());
        root.addView(start, fullWidth(dp(62)));

        Button rescan = secondaryButton("RESCAN PHONE");
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
                .apply();
        Toast.makeText(this, "NEXUS Work Mode ON", Toast.LENGTH_LONG).show();
        showWorkMode();
    }

    private void showWorkMode() {
        LinearLayout root = page();
        addBrand(root);
        addTitle(root, "WORK MODE");
        addStatus(root, "ON", GREEN);

        String project = prefs.getString("activeProject", "Unassigned work");
        int accepted = prefs.getInt("acceptedSignals", 0);
        addSection(root, "ACTIVE CONTEXT");
        addBody(root, project + "\n" + accepted + " approved work signals");

        Button tree = primaryButton("PROJECT WORLD / RELATIONSHIP TREE");
        tree.setOnClickListener(v -> openUrl(TREE_URL));
        root.addView(tree, fullWidth(dp(62)));

        Button doorflow = secondaryButton("DOORFLOW");
        doorflow.setOnClickListener(v -> openUrl(DOORFLOW_URL));
        root.addView(doorflow, fullWidth(dp(54)));

        Button nexus = secondaryButton("OPEN NEXUS");
        nexus.setOnClickListener(v -> openUrl(NEXUS_URL));
        root.addView(nexus, fullWidth(dp(54)));

        Button update = secondaryButton("UPDATE WORK CONTEXT");
        update.setOnClickListener(v -> {
            signals.clear();
            dedupe.clear();
            startDiscovery();
        });
        root.addView(update, fullWidth(dp(54)));

        Button off = secondaryButton("TURN WORK MODE OFF");
        off.setOnClickListener(v -> {
            prefs.edit().putBoolean("workMode", false).apply();
            Toast.makeText(this, "Work Mode OFF", Toast.LENGTH_SHORT).show();
            showWelcome();
        });
        root.addView(off, fullWidth(dp(54)));

        addSmall(root, "Native Android beta 0.5.0 · accepted context stays local on this device in this build.");
        setPage(root);
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
        String key = (source + "|" + cleanTitle + "|" + detail).toLowerCase(Locale.UK);
        if (cleanTitle.isEmpty() || dedupe.contains(key)) return;
        dedupe.add(key);
        signals.add(new Signal(source, cleanTitle, detail == null ? "" : detail.trim(),
                Math.min(99, Math.max(1, confidence))));
    }

    private int selectedCount() {
        int count = 0;
        for (Signal signal : signals) if (signal.selected) count++;
        return count;
    }

    private int workScore(String raw) {
        if (raw == null) return 0;
        String text = raw.toLowerCase(Locale.UK);
        String[] strong = new String[]{
                "construction", "site", "joiner", "carpenter", "electric", "plumb", "manager",
                "project", "supervisor", "foreman", "contractor", "engineer", "architect", "fire door",
                "doorflow", "bim", "fabstation", "work wallet", "snag", "inspection", "induction",
                "tesco", "halifax", "lloyds", "dormy", "optimal", "nosmo", "nexus"
        };
        String[] medium = new String[]{
                "build", "floor", "room", "drawing", "plan", "schedule", "handover", "qa", "commission",
                "hvac", "mechanical", "drylin", "ceiling", "steel", "concrete", "permit", "delivery"
        };
        int score = 0;
        for (String keyword : strong) if (text.contains(keyword)) score += 28;
        for (String keyword : medium) if (text.contains(keyword)) score += 15;
        return Math.min(99, score);
    }

    private boolean likelyWorkFile(String name) {
        String lower = name.toLowerCase(Locale.UK);
        String[] extensions = new String[]{
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx",
                ".dwg", ".dxf", ".ifc", ".rvt", ".nwd", ".nwc", ".zip", ".txt",
                ".jpg", ".jpeg", ".png", ".heic"
        };
        for (String ext : extensions) if (lower.endsWith(ext)) return true;
        return workScore(lower) >= 45;
    }

    private String value(Cursor cursor, int index) {
        if (index < 0 || cursor.isNull(index)) return "";
        String value = cursor.getString(index);
        return value == null ? "" : value.trim();
    }

    private String joinNonEmpty(String... values) {
        StringBuilder out = new StringBuilder();
        for (String value : values) {
            if (value == null || value.trim().isEmpty()) continue;
            if (out.length() > 0) out.append(" · ");
            out.append(value.trim());
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
        return clean.substring(0, max - 1) + "…";
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "No browser available", Toast.LENGTH_SHORT).show();
        }
    }

    private LinearLayout page() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(22), dp(34), dp(22), dp(42));
        root.setBackgroundColor(BG);
        return root;
    }

    private void setPage(LinearLayout content) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        scroll.addView(content, new ScrollView.LayoutParams(
                ScrollView.LayoutParams.MATCH_PARENT,
                ScrollView.LayoutParams.WRAP_CONTENT));
        setContentView(scroll);
    }

    private void addBrand(LinearLayout root) {
        TextView view = new TextView(this);
        view.setText("NEXUS");
        view.setTextColor(GOLD);
        view.setTextSize(18);
        view.setGravity(Gravity.CENTER);
        view.setLetterSpacing(0.18f);
        view.setTypeface(null, 1);
        root.addView(view, fullWidth(dp(46)));
    }

    private void addTitle(LinearLayout root, String text) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(TEXT);
        view.setTextSize(30);
        view.setGravity(Gravity.CENTER);
        view.setTypeface(null, 1);
        root.addView(view, wrapHeightWithMargins(dp(8), dp(12)));
    }

    private void addBody(LinearLayout root, String text) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(MUTED);
        view.setTextSize(16);
        view.setGravity(Gravity.CENTER);
        view.setLineSpacing(0f, 1.2f);
        root.addView(view, wrapHeightWithMargins(dp(8), dp(18)));
    }

    private void addSection(LinearLayout root, String text) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(GOLD);
        view.setTextSize(13);
        view.setTypeface(null, 1);
        view.setLetterSpacing(0.08f);
        root.addView(view, wrapHeightWithMargins(dp(18), dp(8)));
    }

    private void addStatus(LinearLayout root, String text, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(color);
        view.setTextSize(15);
        view.setGravity(Gravity.CENTER);
        view.setTypeface(null, 1);
        root.addView(view, fullWidth(dp(54)));
    }

    private void addSmall(LinearLayout root, String text) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(Color.rgb(112, 126, 142));
        view.setTextSize(12);
        view.setGravity(Gravity.CENTER);
        view.setLineSpacing(0f, 1.15f);
        root.addView(view, wrapHeightWithMargins(dp(18), dp(8)));
    }

    private Button primaryButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(BG);
        button.setTextSize(14);
        button.setTypeface(null, 1);
        button.setBackgroundColor(GOLD);
        button.setAllCaps(false);
        return button;
    }

    private Button secondaryButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(TEXT);
        button.setTextSize(14);
        button.setTypeface(null, 1);
        button.setBackgroundColor(PANEL);
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams fullWidth(int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, height);
        params.setMargins(0, dp(7), 0, dp(7));
        return params;
    }

    private LinearLayout.LayoutParams wrapHeight() {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams wrapHeightWithMargins(int top, int bottom) {
        LinearLayout.LayoutParams params = wrapHeight();
        params.setMargins(0, top, 0, bottom);
        return params;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
