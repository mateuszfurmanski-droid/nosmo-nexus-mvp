package tech.nosmo.nexus.workmode;

import android.Manifest;
import android.app.Activity;
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
    private static final String HANDOFF_PATH = "/api/nexus/android-work-mode/handoff";

    private static final String HANDOFF_LOCAL_ONLY = "LOCAL_ONLY";
    private static final String HANDOFF_PENDING = "PENDING_SERVER_CONFIRMATION";
    private static final String HANDOFF_DONE = "HANDED_OFF";
    private static final String HANDOFF_RETRY = "FAILED_RETRYABLE";

    private static final String ESAFE_PROJECT_ID = "project-esafe-catania";
    private static final String ESAFE_WORLD_ID = "world-esafe-catania";

    private static final int BG = Color.rgb(4, 16, 31);
    private static final int PANEL = Color.rgb(10, 34, 63);
    private static final int TEXT = Color.rgb(238, 247, 255);
    private static final int MUTED = Color.rgb(153, 181, 207);
    private static final int CYAN = Color.rgb(72, 205, 255);
    private static final int GREEN = Color.rgb(71, 222, 161);

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

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        restoreQueue();
        showHome();
    }

    private void showHome() {
        LinearLayout root = page();
        addTitle(root, "NEXUS Work Mode");
        addBody(root, "Controlled Knowledge Vacuum: permitted source → local candidate → review → explicit Project World → authenticated Nexus bootstrap. No background scraper and no private app database access.");

        addSection(root, "PROJECT WORLD");
        addBody(root, projectStatus());
        addAction(root, "Use e-SAFE Catania", this::selectEsafe, true);
        addAction(root, "Riverside — confirm in Nexus", this::selectRiversideNeedsConfirmation, false);
        addSmall(root, "Riverside is not mapped to historical aliases. Until a current canonical Riverside projectId + worldId exists in Project Memory, handoff is blocked as NEEDS_USER_CONFIRMATION.");

        addSection(root, "KNOWLEDGE VACUUM");
        addAction(root, "Add Photo", this::pickPhoto, false);
        addAction(root, "Add Document", this::pickDocument, false);
        addAction(root, "Add Folder", this::pickFolder, false);
        addAction(root, "Scan permitted Contacts + Calendar", this::startDiscovery, false);
        addAction(root, "Review approved context (" + selectedCount() + ")", this::showReview, false);

        addSection(root, "LAUNCHERS / DEEP LINKS — NOT API INTEGRATIONS");
        addAction(root, "WhatsApp launcher", () -> openPackageOrUrl("com.whatsapp", "https://wa.me/"), false);
        addAction(root, "Gmail launcher", () -> openPackageOrUrl("com.google.android.gm", "mailto:"), false);
        addAction(root, "Teams launcher", () -> openPackageOrUrl("com.microsoft.teams", "https://teams.microsoft.com/"), false);
        addAction(root, "Drive launcher", () -> openPackageOrUrl("com.google.android.apps.docs", "https://drive.google.com/"), false);

        String configuredOrigin = configuredNexusOrigin();
        addSmall(root, configuredOrigin.isEmpty()
                ? "Nexus web origin: NOT CONFIGURED. This APK will fail closed rather than guess a production host. Build with NEXUS_ANDROID_WEB_ORIGIN=https://<authorised-nexus-origin>."
                : "Nexus web origin: configured at build time. The APK sends approved metadata to the same-origin OIDC bootstrap only; no session token is placed in the URL.");
        setPage(root);
    }

    private void selectEsafe() {
        prefs.edit()
                .putString(PREF_PROJECT_ID, ESAFE_PROJECT_ID)
                .putString(PREF_WORLD_ID, ESAFE_WORLD_ID)
                .putString(PREF_PROJECT_LABEL, "e-SAFE Catania")
                .putString(PREF_PROJECT_RESOLUTION, "EXACT")
                .apply();
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
        return prefs.getString(PREF_PROJECT_LABEL, "No Project World selected")
                + "\nstatus: " + prefs.getString(PREF_PROJECT_RESOLUTION, "NEEDS_USER_CONFIRMATION")
                + "\nprojectId: " + prefs.getString(PREF_PROJECT_ID, "—")
                + "\nworldId: " + prefs.getString(PREF_WORLD_ID, "—");
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
            addUriCandidate("PHOTO", "image/*", uri, displayName(uri, "Selected photo"), 85);
        } else if (requestCode == REQ_DOCUMENT) {
            addUriCandidate("DOCUMENT", "application/octet-stream", uri, displayName(uri, "Selected document"), 80);
        } else if (requestCode == REQ_FOLDER) {
            addUriCandidate("FOLDER", "vnd.android.document/directory", uri, "User-authorised folder", 70);
        }
        persistQueue();
        showReview();
    }

    private void persistReadPermission(Uri uri, int returnedFlags) {
        if ((returnedFlags & Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION) == 0) return;
        try {
            getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {
            // Provider grant is not persistable. Keep item local; a later retry may require reselection.
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
        if (missing.isEmpty()) scanPermittedSources();
        else requestPermissions(missing.toArray(new String[0]), REQ_DISCOVERY_PERMISSIONS);
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
        String[] projection = {ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY};
        try (Cursor cursor = getContentResolver().query(
                ContactsContract.Contacts.CONTENT_URI,
                projection,
                null,
                null,
                ContactsContract.Contacts.DISPLAY_NAME_PRIMARY + " ASC")) {
            if (cursor == null) return;
            int idIx = cursor.getColumnIndex(ContactsContract.Contacts._ID);
            int nameIx = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY);
            int added = 0;
            while (cursor.moveToNext() && added < 40) {
                String name = safe(cursor, nameIx);
                if (!looksWorkRelated(name)) continue;
                addCandidate("CONTACT", "vnd.android.cursor.item/contact", "contact:" + safe(cursor, idIx), name, System.currentTimeMillis(), 60);
                added++;
            }
        } catch (Exception ignored) {
        }
    }

    private void scanCalendar() {
        long now = System.currentTimeMillis();
        long from = now - 60L * 24L * 60L * 60L * 1000L;
        long to = now + 120L * 24L * 60L * 60L * 1000L;
        String[] projection = {CalendarContract.Events._ID, CalendarContract.Events.TITLE, CalendarContract.Events.DTSTART};
        String selection = CalendarContract.Events.DTSTART + ">=? AND " + CalendarContract.Events.DTSTART + "<=?";
        try (Cursor cursor = getContentResolver().query(
                CalendarContract.Events.CONTENT_URI,
                projection,
                selection,
                new String[]{String.valueOf(from), String.valueOf(to)},
                CalendarContract.Events.DTSTART + " DESC")) {
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
        String[] tokens = {"nexus", "nosmo", "site", "project", "construction", "door", "fire", "inspection", "snag", "bim", "ifc", "riverside", "esafe", "e-safe", "tesco", "halifax", "lloyds"};
        for (String token : tokens) if (s.contains(token)) return true;
        return false;
    }

    private void showReview() {
        LinearLayout root = page();
        addTitle(root, "Knowledge Vacuum Review");
        addBody(root, "Candidates stay local until approval. Untick anything that should not be handed to Nexus. URL handoff contains opaque item IDs and source types only — never the local URI or raw photo/document content.");
        addBody(root, projectStatus());

        if (candidates.isEmpty()) addSmall(root, "No candidates yet. Return and use the system pickers or permitted discovery scan.");

        for (Candidate candidate : candidates) {
            CheckBox box = new CheckBox(this);
            box.setChecked(candidate.selected);
            box.setText(candidate.source + " · " + candidate.displayName + "\n" + candidate.contentType + " · confidence " + candidate.confidence + "% · " + candidate.handoffState);
            box.setTextColor(TEXT);
            box.setTextSize(13);
            box.setPadding(dp(4), dp(7), dp(4), dp(7));

            boolean locked = isHandoffLocked(candidate);
            box.setEnabled(!locked);
            if (!locked) {
                box.setOnCheckedChangeListener((buttonView, checked) -> {
                    candidate.selected = checked;
                    candidate.approvalState = checked ? "DISCOVERED" : "REJECTED";
                    persistQueue();
                });
            }
            root.addView(box, fullWidthWrap());
            if (HANDOFF_PENDING.equals(candidate.handoffState)) {
                addSmall(root, "Waiting for Nexus confirmation — duplicate resend is locked.");
            } else if (HANDOFF_DONE.equals(candidate.handoffState)) {
                addSmall(root, "Already handed off — this item is locked against duplicate resend.");
            } else if (HANDOFF_RETRY.equals(candidate.handoffState)) {
                addSmall(root, "Previous handoff did not complete. This item may be retried.");
            }
        }

        addSection(root, "ASK NEXUS");
        intentInput = new EditText(this);
        intentInput.setText("Co to jest / gdzie powinno trafić?");
        intentInput.setTextColor(TEXT);
        intentInput.setHintTextColor(MUTED);
        intentInput.setMinLines(2);
        intentInput.setBackgroundColor(PANEL);
        intentInput.setPadding(dp(12), dp(10), dp(12), dp(10));
        root.addView(intentInput, fullWidth(dp(82)));

        addAction(root, "Approve / Retry + Send to Nexus", this::approveAndHandoff, true);
        addAction(root, "Back to Work Mode", this::showHome, false);
        addSmall(root, "Only LOCAL_ONLY and FAILED_RETRYABLE items can be sent. PENDING_SERVER_CONFIRMATION and HANDED_OFF items are locked. Browser launch never marks raw evidence uploaded/synced.");
        setPage(root);
    }

    private boolean isHandoffLocked(Candidate candidate) {
        return HANDOFF_PENDING.equals(candidate.handoffState) || HANDOFF_DONE.equals(candidate.handoffState);
    }

    private boolean isHandoffEligible(Candidate candidate) {
        if (!candidate.selected) return false;
        return HANDOFF_LOCAL_ONLY.equals(candidate.handoffState) || HANDOFF_RETRY.equals(candidate.handoffState);
    }

    private void approveAndHandoff() {
        String projectId = prefs.getString(PREF_PROJECT_ID, "");
        String worldId = prefs.getString(PREF_WORLD_ID, "");
        String resolution = prefs.getString(PREF_PROJECT_RESOLUTION, "NEEDS_USER_CONFIRMATION");
        if (!"EXACT".equals(resolution) || projectId.isEmpty() || worldId.isEmpty()) {
            Toast.makeText(this, "Project World needs explicit confirmation before handoff", Toast.LENGTH_LONG).show();
            return;
        }

        ArrayList<Candidate> approved = handoffEligibleCandidates();
        if (approved.isEmpty()) {
            if (selectedStateCount(HANDOFF_PENDING) > 0) {
                Toast.makeText(this, "Selected item is already waiting for Nexus confirmation", Toast.LENGTH_LONG).show();
            } else if (selectedStateCount(HANDOFF_DONE) > 0) {
                Toast.makeText(this, "Selected item is already handed off. Select a new or retryable item.", Toast.LENGTH_LONG).show();
            } else {
                Toast.makeText(this, "Select at least one new or retryable candidate", Toast.LENGTH_SHORT).show();
            }
            return;
        }

        String origin = configuredNexusOrigin();
        if (origin.isEmpty()) {
            Toast.makeText(this, "Nexus web origin is not configured in this APK", Toast.LENGTH_LONG).show();
            return;
        }

        for (Candidate candidate : approved) {
            candidate.approvalState = "APPROVED";
            candidate.handoffState = HANDOFF_PENDING;
        }
        persistQueue();

        String userIntent = intentInput == null ? "classify approved context and propose a WorkSuite draft" : intentInput.getText().toString().trim();
        if (userIntent.isEmpty()) userIntent = "classify approved context and propose a WorkSuite draft";
        openHandoffUrl(buildHandoffUrl(origin, projectId, worldId, approved, userIntent), approved);
    }

    private void openHandoffUrl(String url, ArrayList<Candidate> approved) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ex) {
            for (Candidate candidate : approved) {
                if (HANDOFF_PENDING.equals(candidate.handoffState)) {
                    candidate.handoffState = HANDOFF_RETRY;
                }
            }
            persistQueue();
            Toast.makeText(this, "Could not open Nexus. Items are marked retryable.", Toast.LENGTH_LONG).show();
            showReview();
        }
    }

    private String configuredNexusOrigin() {
        String origin = BuildConfig.NEXUS_WEB_ORIGIN == null ? "" : BuildConfig.NEXUS_WEB_ORIGIN.trim();
        while (origin.endsWith("/")) origin = origin.substring(0, origin.length() - 1);
        if (!origin.startsWith("https://")) return "";
        return origin;
    }

    private String buildHandoffUrl(String origin, String projectId, String worldId, ArrayList<Candidate> approved, String userIntent) {
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

        return Uri.parse(origin + HANDOFF_PATH).buildUpon()
                .appendQueryParameter("handoffSchema", HANDOFF_SCHEMA)
                .appendQueryParameter("nexusIntent", NEXUS_INTENT)
                .appendQueryParameter("nexusAiContext", AI_CONTEXT_VERSION)
                .appendQueryParameter("projectId", projectId)
                .appendQueryParameter("worldId", worldId)
                .appendQueryParameter("projectResolution", "EXACT")
                .appendQueryParameter("selectedItemIds", ids.toString())
                .appendQueryParameter("sourceTypes", sourceTypes.toString())
                .appendQueryParameter("userIntent", userIntent)
                .appendQueryParameter("handoffState", HANDOFF_PENDING)
                .build()
                .toString();
    }

    private ArrayList<Candidate> handoffEligibleCandidates() {
        ArrayList<Candidate> out = new ArrayList<>();
        for (Candidate candidate : candidates) {
            if (isHandoffEligible(candidate)) out.add(candidate);
        }
        return out;
    }

    private int selectedStateCount(String state) {
        int count = 0;
        for (Candidate candidate : candidates) {
            if (candidate.selected && state.equals(candidate.handoffState)) count++;
        }
        return count;
    }

    private void addUriCandidate(String source, String fallbackType, Uri uri, String name, int confidence) {
        String type = getContentResolver().getType(uri);
        addCandidate(source, type == null ? fallbackType : type, uri.toString(), name, System.currentTimeMillis(), confidence);
    }

    private void addCandidate(String source, String contentType, String localReference, String name, long timestamp, int confidence) {
        String id = UUID.nameUUIDFromBytes((source + "|" + localReference).getBytes(StandardCharsets.UTF_8)).toString();
        for (Candidate existing : candidates) if (existing.id.equals(id)) return;
        candidates.add(new Candidate(id, source, contentType, localReference, name, timestamp, Math.max(0, Math.min(100, confidence)), true, "DISCOVERED", HANDOFF_LOCAL_ONLY));
    }

    private int selectedCount() {
        int count = 0;
        for (Candidate candidate : candidates) if (candidate.selected) count++;
        return count;
    }

    private String displayName(Uri uri, String fallback) {
        try (Cursor cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                String value = safe(cursor, cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME));
                if (!value.isEmpty()) return value;
            }
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
        try {
            JSONArray array = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
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
                        item.optString("handoffState", HANDOFF_LOCAL_ONLY)
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
        section.setPadding(0, dp(12), 0, dp(8));
        root.addView(section, fullWidthWrap());
    }

    private void addAction(LinearLayout root, String label, Runnable action, boolean primary) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(13);
        button.setTypeface(primary ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        button.setTextColor(primary ? Color.rgb(0, 21, 34) : TEXT);
        button.setBackgroundColor(primary ? GREEN : PANEL);
        button.setOnClickListener(v -> action.run());
        root.addView(button, fullWidth(dp(primary ? 56 : 50)));
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
