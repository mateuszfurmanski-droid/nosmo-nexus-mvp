package tech.nosmo.nexus.workmode;

import android.Manifest;
import android.app.Activity;
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
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int REQ_CONTEXT = 41;
    private static final int REQ_FOLDER = 42;
    private static final String PREFS = "nexus_work_mode";
    private static final String NEXUS_TREE = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/";

    private final ArrayList<String> signals = new ArrayList<>();
    private TextView statusView;
    private TextView summaryView;
    private Button workModeButton;
    private boolean workMode;
    private String activeProject = "Unassigned work";
    private SharedPreferences prefs;

    private final String[] keywords = new String[]{
            "construction", "project", "site", "joiner", "carpenter", "manager", "engineer",
            "electric", "door", "fire", "bim", "drawing", "dwg", "rvt", "ifc", "snag",
            "inspection", "induction", "permit", "tesco", "halifax", "riverside", "nosmo",
            "procore", "hilti", "work wallet", "fabstation", "contractor", "subcontract"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(3, 4, 7));
        getWindow().setNavigationBarColor(Color.rgb(3, 4, 7));

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        workMode = prefs.getBoolean("workMode", false);
        activeProject = prefs.getString("activeProject", "Unassigned work");
        String savedSignals = prefs.getString("signals", "");
        if (!savedSignals.isEmpty()) {
            for (String line : savedSignals.split("\\n")) {
                if (!line.trim().isEmpty()) signals.add(line.trim());
            }
        }

        setContentView(buildUi());
        renderState();

        if (!prefs.getBoolean("onboardingSeen", false)) {
            prefs.edit().putBoolean("onboardingSeen", true).apply();
            Toast.makeText(this,
                    "NEXUS is ready. Start with Phone context, then add a work folder.",
                    Toast.LENGTH_LONG).show();
        }
    }

    private View buildUi() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(3, 4, 7));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(22), dp(36), dp(22), dp(30));
        root.setBackgroundColor(Color.rgb(3, 4, 7));
        scroll.addView(root, new ScrollView.LayoutParams(
                ScrollView.LayoutParams.MATCH_PARENT,
                ScrollView.LayoutParams.WRAP_CONTENT));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.nexus_logo);
        logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        root.addView(logo, fullWidth(dp(76)));

        TextView title = text("Work Mode", 28, Color.WHITE, true);
        title.setGravity(Gravity.CENTER);
        root.addView(title, fullWidth(dp(58)));

        TextView intro = text(
                "Discover work context on this phone, review what NEXUS found, then switch into a project-focused workspace.",
                15, Color.rgb(190, 201, 214), false);
        intro.setGravity(Gravity.CENTER);
        intro.setLineSpacing(0f, 1.18f);
        root.addView(intro, fullWidth(dp(96)));

        statusView = text("", 14, Color.rgb(72, 232, 185), true);
        statusView.setGravity(Gravity.CENTER);
        root.addView(statusView, fullWidth(dp(54)));

        root.addView(section("1 · DISCOVER"));

        Button scanPhone = button("SCAN PHONE CONTEXT");
        scanPhone.setOnClickListener(v -> requestAndScanContext());
        root.addView(scanPhone, fullWidth(dp(58)));

        Button scanFolder = button("CHOOSE + SCAN WORK FOLDER");
        scanFolder.setOnClickListener(v -> chooseWorkFolder());
        root.addView(scanFolder, fullWidth(dp(58)));

        root.addView(section("2 · REVIEW"));

        summaryView = text("No work signals reviewed yet.", 14, Color.rgb(216, 224, 232), false);
        summaryView.setPadding(dp(14), dp(14), dp(14), dp(14));
        summaryView.setBackgroundColor(Color.rgb(17, 21, 28));
        root.addView(summaryView, fullWidthWrap());

        Button clear = secondaryButton("CLEAR DISCOVERY");
        clear.setOnClickListener(v -> {
            signals.clear();
            activeProject = "Unassigned work";
            workMode = false;
            persist();
            renderState();
        });
        root.addView(clear, fullWidth(dp(52)));

        root.addView(section("3 · WORK MODE"));

        workModeButton = button("START WORK MODE");
        workModeButton.setOnClickListener(v -> {
            workMode = !workMode;
            if (workMode && "Unassigned work".equals(activeProject)) activeProject = inferProject();
            persist();
            renderState();
            Toast.makeText(this, workMode ? "NEXUS Work Mode ON" : "Work Mode OFF", Toast.LENGTH_SHORT).show();
        });
        root.addView(workModeButton, fullWidth(dp(62)));

        Button nexus = secondaryButton("OPEN PROJECT WORLD");
        nexus.setOnClickListener(v -> openUrl(NEXUS_TREE));
        root.addView(nexus, fullWidth(dp(56)));

        TextView footer = text(
                "Native Android · local-first discovery · explicit permissions · no Accessibility scraping",
                11, Color.rgb(112, 126, 142), false);
        footer.setGravity(Gravity.CENTER);
        root.addView(footer, fullWidth(dp(72)));

        return scroll;
    }

    private void requestAndScanContext() {
        ArrayList<String> missing = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.READ_CONTACTS);
        }
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.READ_CALENDAR);
        }
        if (!missing.isEmpty()) {
            requestPermissions(missing.toArray(new String[0]), REQ_CONTEXT);
        } else {
            scanPhoneContext();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CONTEXT) scanPhoneContext();
    }

    private void scanPhoneContext() {
        int before = signals.size();
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
            scanContacts();
        }
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            scanCalendar();
        }
        dedupeSignals();
        activeProject = inferProject();
        persist();
        renderState();
        int added = Math.max(0, signals.size() - before);
        Toast.makeText(this, "Phone context scan: " + added + " new work signals", Toast.LENGTH_LONG).show();
    }

    private void scanContacts() {
        ContentResolver resolver = getContentResolver();
        Map<Long, StringBuilder> detail = new HashMap<>();

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
                    StringBuilder sb = detail.computeIfAbsent(id, key -> new StringBuilder());
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
            while (c.moveToNext() && inspected < 1500 && signals.size() < 160) {
                inspected++;
                long id = c.getLong(0);
                String name = c.getString(1);
                String joined = (name == null ? "" : name) + " " + (detail.containsKey(id) ? detail.get(id) : "");
                int score = score(joined);
                if (score > 0) {
                    signals.add("CONTACT · " + safe(name, "Work contact") + " · " + confidence(score));
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
        try (Cursor c = getContentResolver().query(CalendarContract.Events.CONTENT_URI, projection, selection, args, CalendarContract.Events.DTSTART + " DESC")) {
            if (c == null) return;
            int inspected = 0;
            while (c.moveToNext() && inspected < 800 && signals.size() < 220) {
                inspected++;
                String title = c.getString(0);
                String location = c.getString(1);
                String description = c.getString(2);
                String joined = safe(title, "") + " " + safe(location, "") + " " + safe(description, "");
                int score = score(joined);
                if (score > 0) {
                    String extra = location == null || location.isEmpty() ? "" : " · " + location;
                    signals.add("CALENDAR · " + safe(title, "Work event") + extra + " · " + confidence(score));
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
        startActivityForResult(intent, REQ_FOLDER);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FOLDER || resultCode != RESULT_OK || data == null || data.getData() == null) return;
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
        activeProject = inferProject();
        persist();
        renderState();
        Toast.makeText(this, "Folder scan: " + Math.max(0, signals.size() - before) + " new work files", Toast.LENGTH_LONG).show();
    }

    private void scanDirectory(Uri tree, String documentId, int depth, int[] visited) {
        if (depth > 5 || visited[0] >= 300 || signals.size() >= 260) return;
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, documentId);
        String[] projection = new String[]{
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE
        };
        try (Cursor c = getContentResolver().query(children, projection, null, null, null)) {
            if (c == null) return;
            while (c.moveToNext() && visited[0] < 300 && signals.size() < 260) {
                visited[0]++;
                String childId = c.getString(0);
                String name = c.getString(1);
                String mime = c.getString(2);
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    scanDirectory(tree, childId, depth + 1, visited);
                } else if (isLikelyWorkFile(name, mime)) {
                    int score = Math.max(1, score(name));
                    signals.add("FILE · " + safe(name, "Project file") + " · " + confidence(score));
                }
            }
        } catch (Exception ignored) {
        }
    }

    private boolean isLikelyWorkFile(String name, String mime) {
        String value = (safe(name, "") + " " + safe(mime, "")).toLowerCase(Locale.ROOT);
        if (score(value) > 0) return true;
        String[] extensions = new String[]{".pdf", ".doc", ".docx", ".xls", ".xlsx", ".dwg", ".dxf", ".ifc", ".rvt", ".nwd", ".nwc", ".ppt", ".pptx"};
        for (String ext : extensions) if (value.endsWith(ext)) return true;
        return false;
    }

    private int score(String text) {
        if (text == null) return 0;
        String lower = text.toLowerCase(Locale.ROOT);
        int points = 0;
        for (String keyword : keywords) {
            if (lower.contains(keyword)) points++;
        }
        return points;
    }

    private String confidence(int score) {
        int pct = Math.min(98, 55 + score * 9);
        return pct + "%";
    }

    private String inferProject() {
        String joined = String.join(" ", signals).toLowerCase(Locale.ROOT);
        if (joined.contains("halifax")) return "Halifax Project";
        if (joined.contains("tesco")) return "Tesco Work";
        if (joined.contains("riverside")) return "Riverside Project";
        if (joined.contains("nosmo")) return "NOSMO / Nexus";
        return signals.isEmpty() ? "Unassigned work" : "Detected work context";
    }

    private void dedupeSignals() {
        ArrayList<String> unique = new ArrayList<>();
        for (String signal : signals) {
            if (!unique.contains(signal)) unique.add(signal);
        }
        signals.clear();
        signals.addAll(unique);
    }

    private void persist() {
        StringBuilder sb = new StringBuilder();
        for (String signal : signals) {
            if (sb.length() > 0) sb.append('\n');
            sb.append(signal.replace("\n", " "));
        }
        prefs.edit()
                .putBoolean("workMode", workMode)
                .putString("activeProject", activeProject)
                .putString("signals", sb.toString())
                .apply();
    }

    private void renderState() {
        if (statusView == null) return;
        statusView.setText(workMode
                ? "WORK MODE ON · " + activeProject
                : "READY · " + signals.size() + " work signals");
        statusView.setTextColor(workMode ? Color.rgb(72, 232, 185) : Color.rgb(245, 196, 0));
        if (workModeButton != null) workModeButton.setText(workMode ? "TURN WORK MODE OFF" : "START WORK MODE");

        if (summaryView != null) {
            if (signals.isEmpty()) {
                summaryView.setText("Nothing accepted yet. Scan phone context or choose a project folder.");
            } else {
                StringBuilder text = new StringBuilder();
                text.append("ACTIVE CONTEXT: ").append(activeProject).append("\n\n");
                int count = Math.min(14, signals.size());
                for (int i = 0; i < count; i++) text.append("✓ ").append(signals.get(i)).append('\n');
                if (signals.size() > count) text.append("\n+").append(signals.size() - count).append(" more signals");
                summaryView.setText(text.toString());
            }
        }
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "No browser available", Toast.LENGTH_SHORT).show();
        }
    }

    private TextView section(String text) {
        TextView view = text(text, 12, Color.rgb(112, 126, 142), true);
        view.setPadding(0, dp(16), 0, dp(4));
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

    private Button button(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(Color.rgb(3, 4, 7));
        button.setTextSize(13);
        button.setTypeface(null, 1);
        button.setBackgroundColor(Color.rgb(245, 196, 0));
        button.setAllCaps(false);
        return button;
    }

    private Button secondaryButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(Color.WHITE);
        button.setTextSize(13);
        button.setTypeface(null, 1);
        button.setBackgroundColor(Color.rgb(27, 34, 44));
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams fullWidth(int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                height
        );
        params.setMargins(0, dp(7), 0, dp(7));
        return params;
    }

    private LinearLayout.LayoutParams fullWidthWrap() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(7), 0, dp(7));
        return params;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }
}
