package tech.nosmo.nexus.workmode;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.CalendarContract;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

public class MainActivity extends Activity {
    private static final int REQ_DISCOVERY_PERMISSIONS = 100;
    private static final int REQ_PHOTO = 101;
    private static final int REQ_DOCUMENT = 102;
    private static final int REQ_FOLDER = 103;

    private static final String PREFS = "nexus_work_mode_v060";
    private static final String PREF_QUEUE = "approvalQueue";
    private static final String PREF_PROJECT_ID = "projectId";
    private static final String PREF_WORLD_ID = "worldId";
    private static final String PREF_PROJECT_LABEL = "projectLabel";
    private static final String PREF_PROJECT_RESOLUTION = "projectResolution";

    private static final String HANDOFF_SCHEMA = "nexus-android-work-mode-context-v1";
    private static final String AI_CONTEXT_VERSION = "android-work-discovery-v1";
    private static final String NEXUS_INTENT = "ask-nexus";
    private static final String NEXUS_WORKSPACE_URL = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/";

    // Canonical IDs from PR #90 fixture. Keep this pair together.
    private static final String ESAFE_PROJECT_ID = "project-esafe-catania";
    private static final String ESAFE_WORLD_ID = "world-esafe-catania";

    private static final int BG = Color.rgb(4, 16, 31);
    private static final int PANEL = Color.rgb(10, 34, 63);
    private static final int TEXT = Color.rgb(238, 247, 255);
    private static final int MUTED = Color.rgb(153, 181, 207);
    private static final int CYAN = Color.rgb(72, 205, 255);
    private static final int GREEN = Color.rgb(71, 222, 161);
    private static final int AMBER = Color.rgb(255, 204, 92);

    private final ArrayList<Candidate> candidates = new ArrayList<>();
    private SharedPreferences prefs;
    private EditText intentInput;

    private static class Candidate {
        final String id;
        final String source;
        final String contentType;
        final String localReference;
        final String displayName;
        final long timestamp;
        final int confidence;
        boolean selected;
        String approvalState;
        String handoffState;

        Candidate(
                String id,
                String source,
                String contentType,
                String localReference,
                String displayName,
                long timestamp,
                int confidence,
                boolean selected,
                String approvalState,
                String handoffState
        ) {
            this.id = id;
            this.source = source;
            this.contentType = contentType;
            this.localReference = localReference;
            this.displayName = displayName;
            this.timestamp = timestamp;
            this.confidence = confidence;
            this.selected = selected;
            this.approvalState = approvalState;
            this.handoffState = handoffState;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        restoreQueue();
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        showHome();
    }

    private void showHome() {
        LinearLayout root = page();
        addTitle(root, "NEXUS Work Mode");
        addBody(root, "Controlled Knowledge Vacuum: user-selected or OS-permitted sources → review → explicit Project World → Nexus handoff. No background scraper and no private app database access.");

        addSection(root, "PROJECT WORLD");
        addBody(root, projectStatus());

        Button esafe = primaryButton("Use e-SAFE Catania");
        esafe.setOnClickListener(v -> selectEsafe());
        root.addView(esafe, fullWidth(dp(54)));

        Button riverside = secondaryButton("Riverside — confirm in Nexus");
        riverside.setOnClickListener(v -> selectRiversideNeedsConfirmation());
        root.addView(riverside, fullWidth(dp(50)));

        addSmall(root, "Riverside is deliberately not mapped to the #90 e-SAFE fixture. Until a current canonical Riverside projectId + worldId is resolved server-side, its status is NEEDS_USER_CONFIRMATION and handoff is blocked.");

        addSection(root, "KNOWLEDGE VACUUM");
        addAction(root, "Add Photo", this::pickPhoto);
        addAction(root, "Add Document", this::pickDocument);
        addAction(root, "Add Folder", this::pickFolder);
        addAction(root, "Scan permitted Contacts + Calendar", this::startDiscovery);
        addAction(root, "Review approved context (" + selectedCount() + ")", this::showReview);

        addSection(root, "LAUNCHERS / DEEP LINKS — NOT API INTEGRATIONS");
        addAction(root, "WhatsApp launcher", () -> openPackageOrUrl("com.whatsapp", "https://wa.me/"));
        addAction(root, "Gmail launcher", () -> openPackageOrUrl("com.google.android.gm", "mailto:"));
        addAction(root, "Teams launcher", () -> openPackageOrUrl("com.microsoft.teams", "https://teams.microsoft.com/"));
        addAction(root, "Drive launcher", () -> openPackageOrUrl("com.google.android.apps.docs", "https://drive.google.com/"));

        addSmall(root, "AI boundary: this APK prepares approved metadata only. It contains no AI key, does not grant project authority, and does not execute WorkSuite actions.");
        setPage(root);
    }

    private void selectEsafe() {
        prefs.edit()
                .putString(PREF_PROJECT_ID, ESAFE_PROJECT_ID)
                .putString(PREF_WORLD_ID, ESAFE_WORLD_ID)
                .putString(PREF_PROJECT_LABEL, "e-SAFE Catania")
                .putString(PREF_PROJECT_RESOLUTION, "EXACT")
                .apply();
        Toast.makeText(this, "e-SAFE Project World selected", Toast.LENGTH_SHORT).show();
        showHome();
    }

    private void selectRiversideNeedsConfirmation() {
        prefs.edit()
                .remove(PREF_PROJECT_ID)
                .remove(PREF_WORLD_ID)
                .putString(PREF_PROJECT_LABEL, "Riverside")
                .putString(PREF_PROJECT_RESOLUTION, "NEEDS_USER_CONFIRMATION")
                .apply();
        Toast.makeText(this, "Riverside requires canonical Project World confirmation", Toast.LENGTH_LONG).show();
        showHome();
    }

    private String projectStatus() {
        String label = prefs.getString(PREF_PROJECT_LABEL, "No Project World selected");
        String resolution = prefs.getString(PREF_PROJECT_RESOLUTION, "NEEDS_USER_CONFIRMATION");
        String projectId = prefs.getString(PREF_PROJECT_ID, "—");
        String worldId = prefs.getString(PREF_WORLD_ID, "—");
        return label + "\nstatus: " + resolution + "\nprojectId: " + projectId + "\nworldId: " + worldId;
    }

    private void pickPhoto() {
        Intent intent;
        if (Build.VERSION.SDK_INT >= 33) {
            intent = new Intent(MediaStore.ACTION_PICK_IMAGES);
            intent.setType("image/*");
        } else {
            intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("image/*");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        }
        startActivityForResult(intent, REQ_PHOTO);
    }

    private void pickDocument() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "text/plain"
        });
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(intent, REQ_DOCUMENT);
    }

    private void pickFolder() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
                Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, REQ_FOLDER);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;

        Uri uri = data.getData();
        if (requestCode == REQ_DOCUMENT || requestCode == REQ_FOLDER || (requestCode == REQ_PHOTO && Build.VERSION.SDK_INT < 33)) {
            persistReadPermission(uri, data.getFlags());
        }

        if (requestCode == REQ_PHOTO) {
            addUriCandidate("PHOTO", resolveMime(uri, "image/*"), uri, displayName(uri, "Selected photo"), 85);
        } else if (requestCode == REQ_DOCUMENT) {
            addUriCandidate("DOCUMENT", resolveMime(uri, "application/octet-stream"), uri, displayName(uri, "Selected document"), 80);
        } else if (requestCode == REQ_FOLDER) {
            addUriCandidate("FOLDER", "vnd.android.document/directory", uri, "User-authorised folder", 70);
        }
        persistQueue();
        showReview();
    }

    private void persistReadPermission(Uri uri, int returnedFlags) {
        int flags = returnedFlags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if ((returnedFlags & Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION) == 0) return;
        try {
            getContentResolver().takePersistableUriPermission(uri, flags & Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {
            // Some providers do not offer persistable grants. Item remains local and may need reselection on retry.
        }
    }

    private void startDiscovery() {
        ArrayList<String> missing = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.READ_CONTACTS);
        }
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.READ_CALENDAR);
        }
        if (missing.isEmpty()) {
            scanPermittedSources();
        } else {
            requestPermissions(missing.toArray(new String[0]), REQ_DISCOVERY_PERMISSIONS);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_DISCOVERY_PERMISSIONS) scanPermittedSources();
    }

    private void scanPermittedSources() {
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) scanContacts();
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) scanCalendar();
        persistQueue();
        showReview();
    }

    private void scanContacts() {
        String[] projection = new String[]{ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY};
        try (Cursor cursor = getContentResolver().query(ContactsContract.Contacts.CONTENT_URI, projection, null, null, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY + " ASC")) {
            if (cursor == null) return;
            int idIx = cursor.getColumnIndex(ContactsContract.Contacts._ID);
            int nameIx = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY);
            int added = 0;
            while (cursor.moveToNext() && added < 40) {
                String name = safe(cursor, nameIx);
                if (!looksWorkRelated(name)) continue;
                String localRef = "contact:" + safe(cursor, idIx);
                addCandidate("CONTACT", "vnd.android.cursor.item/contact", localRef, name, System.currentTimeMillis(), 60);
                added++;
            }
        } catch (Exception ignored) {
        }
    }

    private void scanCalendar() {
        long now = System.currentTimeMillis();
        long from = now - (60L * 24L * 60L * 60L * 1000L);
        long to = now + (120L * 24L * 60L * 60L * 1000L);
        String[] projection = new String[]{CalendarContract.Events._ID, CalendarContract.Events.TITLE, CalendarContract.Events.DTSTART};
        String selection = CalendarContract.Events.DTSTART + ">=? AND " + CalendarContract.Events.DTSTART + "<=?";
        String[] args = new String[]{String.valueOf(from), String.valueOf(to)};
        try (Cursor cursor = getContentResolver().query(CalendarContract.Events.CONTENT_URI, projection, selection, args, CalendarContract.Events.DTSTART + " DESC")) {
            if (cursor == null) return;
            int idIx = cursor.getColumnIndex(CalendarContract.Events._ID);
            int titleIx = cursor.getColumnIndex(CalendarContract.Events.TITLE);
            int timeIx = cursor.getColumnIndex(CalendarContract.Events.DTSTART);
            int added = 0;
            while (cursor.moveToNext() && added < 60) {
                String title = safe(cursor, titleIx);
                if (!looksWorkRelated(title)) continue;
                long timestamp = timeIx >= 0 ? cursor.getLong(timeIx) : now;
                addCandidate("CALENDAR", "text/calendar-event", "calendar:" + safe(cursor, idIx), title, timestamp, 65);
                added++;
            }
        } catch (Exception ignored) {
        }
    }

    private boolean looksWorkRelated(String value) {
        String s = value == null ? "" : value.toLowerCase(Locale.UK);
        String[] tokens = new String[]{"nexus", "nosmo", "site", "project", "construction", "door", "fire", "inspection", "snag", "bim", "ifc", "riverside", "esafe", "e-safe", "tesco", "halifax", "lloyds"};
        for (String token : tokens) if (s.contains(token)) return true;
        return false;
    }

    private void showReview() {
        LinearLayout root = page();
        addTitle(root, "Knowledge Vacuum Review");
        addBody(root, "Candidates are local until you approve them. Untick anything that should not leave this review. Nexus receives item IDs, source types, MIME/type, timestamp and confidence — not the local URI or raw content in the URL handoff.");
        addBody(root, projectStatus());

        if (candidates.isEmpty()) addSmall(root, "No candidates yet. Return and use Photo Picker, Document Picker, Folder Picker, or permitted Contacts/Calendar scan.");

        for (Candidate candidate : candidates) {
            CheckBox box = new CheckBox(this);
            box.setChecked(candidate.selected);
            box.setText(candidate.source + " · " + candidate.displayName + "\n" + candidate.contentType + " · confidence " + candidate.confidence + "% · " + candidate.handoffState);
            box.setTextColor(TEXT);
            box.setTextSize(13);
            box.setPadding(dp(4), dp(7), dp(4), dp(7));
            box.setOnCheckedChangeListener((buttonView, isChecked) -> {
                candidate.selected = isChecked;
                candidate.approvalState = isChecked ? "DISCOVERED" : "REJECTED";
                persistQueue();
            });
            root.addView(box, fullWidthWrap());
        }

        addSection(root, "ASK NEXUS");
        intentInput = new EditText(this);
        intentInput.setText("Co to jest / gdzie powinno trafić?");
        intentInput.setTextColor(TEXT);
        intentInput.setHintTextColor(MUTED);
        intentInput.setSingleLine(false);
        intentInput.setMinLines(2);
        intentInput.setPadding(dp(12), dp(10), dp(12), dp(10));
        intentInput.setBackgroundColor(PANEL);
        root.addView(intentInput, fullWidth(dp(82)));

        Button handoff = primaryButton("Approve + Send to Nexus");
        handoff.setOnClickListener(v -> approveAndHandoff());
        root.addView(handoff, fullWidth(dp(58)));

        Button back = secondaryButton("Back to Work Mode");
        back.setOnClickListener(v -> showHome());
        root.addView(back, fullWidth(dp(50)));

        addSmall(root, "Current slice stops at PENDING_SERVER_CONFIRMATION. It never marks content synced/uploaded merely because the browser opened. Server auth, canonical Person binding, Project Participation and WorkSuite permission resolution remain authoritative.");
        setPage(root);
    }

    private void approveAndHandoff() {
        String projectId = prefs.getString(PREF_PROJECT_ID, "");
        String worldId = prefs.getString(PREF_WORLD_ID, "");
        String resolution = prefs.getString(PREF_PROJECT_RESOLUTION, "NEEDS_USER_CONFIRMATION");
        if (!"EXACT".equals(resolution) || projectId.isEmpty() || worldId.isEmpty()) {
            Toast.makeText(this, "Project World needs explicit confirmation before handoff", Toast.LENGTH_LONG).show();
            return;
        }

        ArrayList<Candidate> approved = approvedCandidates();
        if (approved.isEmpty()) {
            Toast.makeText(this, "Select at least one candidate", Toast.LENGTH_SHORT).show();
            return;
        }

        for (Candidate candidate : candidates) {
            if (candidate.selected) {
                candidate.approvalState = "APPROVED";
                candidate.handoffState = "PENDING_SERVER_CONFIRMATION";
            }
        }
        persistQueue();

        String userIntent = intentInput == null ? "classify approved context and propose a WorkSuite draft" : intentInput.getText().toString().trim();
        if (userIntent.isEmpty()) userIntent = "classify approved context and propose a WorkSuite draft";
        openUrl(buildHandoffUrl(projectId, worldId, approved, userIntent));
    }

    private String buildHandoffUrl(String projectId, String worldId, ArrayList<Candidate> approved, String userIntent) {
        StringBuilder ids = new StringBuilder();
        Set<String> sources = new LinkedHashSet<>();
        for (Candidate candidate : approved) {
            if (ids.length() > 0) ids.append(',');
            ids.append(candidate.id);
            sources.add(candidate.source);
        }

        StringBuilder sourceTypes = new StringBuilder();
        for (String source : sources) {
            if (sourceTypes.length() > 0) sourceTypes.append(',');
            sourceTypes.append(source);
        }

        return Uri.parse(NEXUS_WORKSPACE_URL).buildUpon()
                .appendQueryParameter("nexusMode", "work")
                .appendQueryParameter("nexusClient", "android-native")
                .appendQueryParameter("nexusSurface", "ai-assistant")
                .appendQueryParameter("nexusIntent", NEXUS_INTENT)
                .appendQueryParameter("nexusAiContext", AI_CONTEXT_VERSION)
                .appendQueryParameter("handoffSchema", HANDOFF_SCHEMA)
                .appendQueryParameter("projectId", projectId)
                .appendQueryParameter("worldId", worldId)
                .appendQueryParameter("projectResolution", "EXACT")
                .appendQueryParameter("selectedItemIds", ids.toString())
                .appendQueryParameter("sourceTypes", sourceTypes.toString())
                .appendQueryParameter("approvedItems", String.valueOf(approved.size()))
                .appendQueryParameter("userIntent", userIntent)
                .appendQueryParameter("handoffState", "PENDING_SERVER_CONFIRMATION")
                .build()
                .toString();
    }

    private ArrayList<Candidate> approvedCandidates() {
        ArrayList<Candidate> out = new ArrayList<>();
        for (Candidate candidate : candidates) if (candidate.selected) out.add(candidate);
        return out;
    }

    private void addUriCandidate(String source, String fallbackType, Uri uri, String name, int confidence) {
        addCandidate(source, resolveMime(uri, fallbackType), uri.toString(), name, System.currentTimeMillis(), confidence);
    }

    private void addCandidate(String source, String contentType, String localReference, String name, long timestamp, int confidence) {
        String id = stableId(source, localReference);
        for (Candidate existing : candidates) if (existing.id.equals(id)) return;
        candidates.add(new Candidate(
                id,
                source,
                contentType,
                localReference,
                name,
                timestamp,
                Math.max(0, Math.min(100, confidence)),
                true,
                "DISCOVERED",
                "LOCAL_ONLY"
        ));
    }

    private String stableId(String source, String localReference) {
        return UUID.nameUUIDFromBytes((source + "|" + localReference).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private int selectedCount() {
        int count = 0;
        for (Candidate candidate : candidates) if (candidate.selected) count++;
        return count;
    }

    private String displayName(Uri uri, String fallback) {
        try (Cursor cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int ix = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                String value = safe(cursor, ix);
                if (!value.isEmpty()) return value;
            }
        } catch (Exception ignored) {
        }
        return fallback;
    }

    private String resolveMime(Uri uri, String fallback) {
        try {
            String value = getContentResolver().getType(uri);
            if (value != null && !value.trim().isEmpty()) return value;
        } catch (Exception ignored) {
        }
        return fallback;
    }

    private String safe(Cursor cursor, int index) {
        if (cursor == null || index < 0) return "";
        try {
            String value = cursor.getString(index);
            return value == null ? "" : value;
        } catch (Exception ignored) {
            return "";
        }
    }

    private void persistQueue() {
        JSONArray array = new JSONArray();
        for (Candidate candidate : candidates) {
            try {
                JSONObject item = new JSONObject();
                item.put("id", candidate.id);
                item.put("source", candidate.source);
                item.put("contentType", candidate.contentType);
                item.put("localReference", candidate.localReference);
                item.put("displayName", candidate.displayName);
                item.put("timestamp", candidate.timestamp);
                item.put("confidence", candidate.confidence);
                item.put("selected", candidate.selected);
                item.put("approvalState", candidate.approvalState);
                item.put("handoffState", candidate.handoffState);
                array.put(item);
            } catch (Exception ignored) {
            }
        }
        prefs.edit().putString(PREF_QUEUE, array.toString()).apply();
    }

    private void restoreQueue() {
        candidates.clear();
        String raw = prefs.getString(PREF_QUEUE, "[]");
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                candidates.add(new Candidate(
                        item.getString("id"),
                        item.getString("source"),
                        item.getString("contentType"),
                        item.getString("localReference"),
                        item.optString("displayName", "Local item"),
                        item.optLong("timestamp", 0L),
                        item.optInt("confidence", 50),
                        item.optBoolean("selected", true),
                        item.optString("approvalState", "DISCOVERED"),
                        item.optString("handoffState", "LOCAL_ONLY")
                ));
            }
        } catch (Exception ignored) {
            prefs.edit().remove(PREF_QUEUE).apply();
        }
    }

    private void openPackageOrUrl(String packageName, String fallback) {
        try {
            Intent launch = getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch != null) {
                startActivity(launch);
                return;
            }
        } catch (Exception ignored) {
        }
        openUrl(fallback);
    }

    private void openUrl(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ex) {
            Toast.makeText(this, "No compatible app/browser available", Toast.LENGTH_SHORT).show();
        }
    }

    private LinearLayout page() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(20), dp(18), dp(32));
        root.setBackgroundColor(BG);
        return root;
    }

    private void setPage(LinearLayout root) {
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.addView(root, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(scroll);
    }

    private void addTitle(LinearLayout root, String value) {
        TextView title = new TextView(this);
        title.setText(value);
        title.setTextColor(TEXT);
        title.setTextSize(29);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setPadding(0, 0, 0, dp(10));
        root.addView(title, fullWidthWrap());
    }

    private void addBody(LinearLayout root, String value) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextColor(MUTED);
        text.setTextSize(14);
        text.setLineSpacing(dp(2), 1.04f);
        text.setPadding(0, 0, 0, dp(12));
        root.addView(text, fullWidthWrap());
    }

    private void addSmall(LinearLayout root, String value) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextColor(MUTED);
        text.setTextSize(11);
        text.setPadding(0, dp(6), 0, dp(12));
        root.addView(text, fullWidthWrap());
    }

    private void addSection(LinearLayout root, String value) {
        TextView section = new TextView(this);
        section.setText(value);
        section.setTextColor(CYAN);
        section.setTextSize(12);
        section.setTypeface(Typeface.DEFAULT_BOLD);
        section.setLetterSpacing(0.08f);
        section.setPadding(0, dp(12), 0, dp(8));
        root.addView(section, fullWidthWrap());
    }

    private void addAction(LinearLayout root, String label, Runnable action) {
        Button button = secondaryButton(label);
        button.setOnClickListener(v -> action.run());
        root.addView(button, fullWidth(dp(50)));
    }

    private Button primaryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(Color.rgb(0, 21, 34));
        button.setTextSize(14);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setBackgroundColor(GREEN);
        return button;
    }

    private Button secondaryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(TEXT);
        button.setTextSize(13);
        button.setBackgroundColor(PANEL);
        return button;
    }

    private LinearLayout.LayoutParams fullWidth(int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, height);
        params.setMargins(0, 0, 0, dp(8));
        return params;
    }

    private LinearLayout.LayoutParams fullWidthWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
