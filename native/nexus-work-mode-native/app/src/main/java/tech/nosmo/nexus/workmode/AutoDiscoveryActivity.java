package tech.nosmo.nexus.workmode;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.CalendarContract;
import android.provider.ContactsContract;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class AutoDiscoveryActivity extends Activity {
    private static final int REQ_DISCOVERY = 61;
    private static final int REQ_PERSONAL_CLOUD = 62;
    private static final int REQ_CLOUD_SOURCE = 63;
    private static final int REQ_ALL_FILES = 64;

    private static final String PREFS = "nexus_work_mode";
    private static final String TREE_URL = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/";
    private static final String DOORFLOW_URL = "https://nosmotechnology.co.uk/doorflow.html";
    private static final String NEXUS_URL = "https://nosmotechnology.co.uk/nexus.html";

    private final ArrayList<Signal> signals = new ArrayList<>();
    private final Set<String> workDays = new HashSet<>();
    private final Set<String> copiedUris = new HashSet<>();
    private SharedPreferences prefs;
    private boolean workMode;
    private boolean editingContext;
    private String activeProject = "Unassigned work";
    private int acceptedSignals;
    private String personalCloudTree = "";
    private String cloudSourceTree = "";

    private final String[] strongProjectTerms = new String[]{
            "tesco", "halifax", "lloyds", "riverside", "nosmo", "nexus", "project", "site"
    };
    private final String[] tradeTerms = new String[]{
            "construction", "joiner", "joinery", "carpenter", "carpentry", "manager", "engineer",
            "electric", "electrical", "door", "fire door", "bim", "drawing", "dwg", "rvt", "ifc",
            "snag", "inspection", "induction", "permit", "procore", "hilti", "work wallet", "fabstation",
            "contractor", "subcontract", "ceiling", "commission", "fitout", "fit out", "installation",
            "doorset", "ironmongery", "drylining", "plumbing", "hvac", "qa", "qc"
    };
    private final String[] workExtensions = new String[]{
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".dwg", ".dxf", ".ifc", ".rvt",
            ".nwd", ".nwc", ".ppt", ".pptx", ".csv", ".txt", ".zip"
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
        workMode = prefs.getBoolean("workMode", false);
        activeProject = prefs.getString("activeProject", "Unassigned work");
        acceptedSignals = prefs.getInt("acceptedSignals", 0);
        personalCloudTree = prefs.getString("personalCloudTree", "");
        cloudSourceTree = prefs.getString("cloudSourceTree", "");
        Set<String> copied = prefs.getStringSet("personalCloudCopiedUris", Collections.emptySet());
        if (copied != null) copiedUris.addAll(copied);
        String encoded = prefs.getString("signalsV3", "");
        if (!encoded.isEmpty()) {
            for (String line : encoded.split("\\n")) {
                Signal signal = Signal.decode(line);
                if (signal != null) signals.add(signal);
            }
        }
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
                .putString("signalsV3", encoded.toString())
                .putString("personalCloudTree", personalCloudTree)
                .putString("cloudSourceTree", cloudSourceTree)
                .putStringSet("personalCloudCopiedUris", new HashSet<>(copiedUris))
                .apply();
    }

    private void render() {
        setContentView(workMode && !editingContext ? buildWorkModeView() : buildDiscoveryView());
    }

    private View buildWorkModeView() {
        LinearLayout root = pageRoot();
        addBrand(root);
        addTitle(root, "WORK MODE");

        TextView on = text("ON", 17, Color.rgb(72, 232, 185), true);
        on.setGravity(Gravity.CENTER);
        root.addView(on, fullWidth(dp(48)));

        addSection(root, "ACTIVE CONTEXT");
        TextView project = text(activeProject, 20, Color.rgb(190, 201, 214), false);
        project.setGravity(Gravity.CENTER);
        root.addView(project, fullWidth(dp(44)));
        TextView count = text(acceptedSignals + " approved work signals", 16, Color.rgb(190, 201, 214), false);
        count.setGravity(Gravity.CENTER);
        root.addView(count, fullWidth(dp(38)));

        TextView cloud = panelText(personalCloudTree.isEmpty()
                ? "PERSONAL CLOUD · not connected"
                : "PERSONAL CLOUD · connected · " + copiedUris.size() + " source items copied");
        root.addView(cloud, fullWidthWrap());

        Button world = primaryButton("PROJECT WORLD / RELATIONSHIP TREE");
        world.setOnClickListener(v -> openProjectWorld());
        root.addView(world, fullWidth(dp(68)));

        Button doorflow = secondaryButton("DOORFLOW");
        doorflow.setOnClickListener(v -> openUrl(DOORFLOW_URL));
        root.addView(doorflow, fullWidth(dp(58)));

        Button nexus = secondaryButton("OPEN NEXUS");
        nexus.setOnClickListener(v -> openUrl(NEXUS_URL));
        root.addView(nexus, fullWidth(dp(58)));

        Button update = secondaryButton("UPDATE / RESCAN WORK CONTEXT");
        update.setOnClickListener(v -> { editingContext = true; render(); });
        root.addView(update, fullWidth(dp(58)));

        Button off = secondaryButton("TURN WORK MODE OFF");
        off.setOnClickListener(v -> {
            workMode = false;
            editingContext = false;
            persist();
            render();
        });
        root.addView(off, fullWidth(dp(58)));

        TextView footer = text(
                "Native Android beta 0.6.0 · phone-wide shared-media index + optional all-files index + persistent cloud folders.",
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
                "NEXUS indexes the work context Android lets you approve: contacts, calendar, the accessible photo library, shared files and connected cloud folders. High-confidence items are preselected; originals stay where they are.",
                14, Color.rgb(190, 201, 214), false);
        intro.setGravity(Gravity.CENTER);
        intro.setLineSpacing(0f, 1.16f);
        root.addView(intro, fullWidthWrap());

        addSection(root, "1 · AUTOMATIC DISCOVERY");

        Button scan = primaryButton("SCAN PHONE + CONNECTED CLOUD");
        scan.setOnClickListener(v -> requestAndScan());
        root.addView(scan, fullWidth(dp(64)));

        Button files = secondaryButton(hasAllFilesAccess() ? "FULL FILE SCAN · ENABLED" : "ENABLE FULL FILE SCAN");
        files.setOnClickListener(v -> requestAllFilesAccess());
        root.addView(files, fullWidth(dp(56)));

        Button cloudSource = secondaryButton(cloudSourceTree.isEmpty() ? "+ CONNECT CLOUD SOURCE" : "CLOUD SOURCE · CONNECTED");
        cloudSource.setOnClickListener(v -> chooseTree(REQ_CLOUD_SOURCE));
        root.addView(cloudSource, fullWidth(dp(56)));

        Button personalCloud = secondaryButton(personalCloudTree.isEmpty() ? "+ SET PERSONAL CLOUD DESTINATION" : "PERSONAL CLOUD · CONNECTED");
        personalCloud.setOnClickListener(v -> chooseTree(REQ_PERSONAL_CLOUD));
        root.addView(personalCloud, fullWidth(dp(56)));

        addSection(root, "2 · DISCOVERY REVIEW");
        if (signals.isEmpty()) {
            root.addView(panelText("No current discovery. Run the scan. Android may ask once for Contacts, Calendar, Photos and—if you enable it—special all-files access."), fullWidthWrap());
        } else {
            int high = 0;
            int review = 0;
            for (Signal s : signals) {
                if (s.confidence >= 82) high++; else review++;
            }
            root.addView(panelText(signals.size() + " likely work signals · " + high + " high confidence selected · " + review + " need review"), fullWidthWrap());

            int shown = Math.min(60, signals.size());
            for (int i = 0; i < shown; i++) {
                Signal signal = signals.get(i);
                CheckBox check = new CheckBox(this);
                check.setChecked(signal.accepted);
                check.setTextColor(Color.rgb(225, 232, 238));
                check.setTextSize(13);
                check.setPadding(dp(6), dp(7), dp(6), dp(7));
                check.setButtonTintList(android.content.res.ColorStateList.valueOf(Color.rgb(245, 196, 0)));
                String detail = signal.detail.isEmpty() ? "" : "\n" + signal.detail;
                check.setText(signal.category + " · " + signal.title + detail + " · " + signal.confidence + "%");
                check.setOnCheckedChangeListener((buttonView, isChecked) -> signal.accepted = isChecked);
                root.addView(check, fullWidthWrap());
            }
            if (signals.size() > shown) {
                TextView more = text("+ " + (signals.size() - shown) + " lower-ranked items retained in the index", 11, Color.rgb(112, 126, 142), false);
                root.addView(more, fullWidthWrap());
            }
        }

        addSection(root, "3 · PERSONAL CLOUD + WORK MODE");
        Button accept = primaryButton("ACCEPT + COPY WORK FILES + START WORK MODE");
        accept.setOnClickListener(v -> acceptCopyAndStart());
        root.addView(accept, fullWidth(dp(68)));

        Button clear = secondaryButton("CLEAR DISCOVERY INDEX");
        clear.setOnClickListener(v -> { signals.clear(); persist(); render(); });
        root.addView(clear, fullWidth(dp(52)));

        TextView privacy = text(
                "NEXUS copies accepted files; it does not delete originals. Private databases of WhatsApp, Gmail and other apps remain outside the scan. Full Google Drive/OneDrive account crawling still requires their OAuth APIs.",
                11, Color.rgb(112, 126, 142), false);
        privacy.setGravity(Gravity.CENTER);
        privacy.setPadding(dp(6), dp(18), dp(6), dp(14));
        root.addView(privacy, fullWidthWrap());
        return wrap(root);
    }

    private void requestAndScan() {
        ArrayList<String> missing = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) missing.add(Manifest.permission.READ_CONTACTS);
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) missing.add(Manifest.permission.READ_CALENDAR);
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) missing.add(Manifest.permission.READ_MEDIA_IMAGES);
        } else if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        }
        if (missing.isEmpty()) scanEverything();
        else requestPermissions(missing.toArray(new String[0]), REQ_DISCOVERY);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_DISCOVERY) scanEverything();
    }

    private void scanEverything() {
        signals.clear();
        workDays.clear();
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) scanCalendar();
        if (checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) scanContacts();
        if (hasPhotoAccess()) scanPhotos();
        if (hasAllFilesAccess()) scanSharedFiles();
        if (!cloudSourceTree.isEmpty()) scanTree(Uri.parse(cloudSourceTree), "CLOUD", 0, new int[]{0});
        dedupeAndSort();
        persist();
        Toast.makeText(this, "NEXUS indexed " + signals.size() + " likely work signals", Toast.LENGTH_LONG).show();
        render();
    }

    private void scanContacts() {
        ContentResolver resolver = getContentResolver();
        Map<Long, StringBuilder> details = new HashMap<>();
        String[] dataProjection = new String[]{ContactsContract.Data.CONTACT_ID, ContactsContract.Data.MIMETYPE, ContactsContract.Data.DATA1, ContactsContract.Data.DATA4};
        String selection = ContactsContract.Data.MIMETYPE + "=? OR " + ContactsContract.Data.MIMETYPE + "=?";
        String[] args = new String[]{ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE, ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE};
        try (Cursor c = resolver.query(ContactsContract.Data.CONTENT_URI, dataProjection, selection, args, null)) {
            if (c != null) while (c.moveToNext()) {
                long id = c.getLong(0);
                StringBuilder sb = details.computeIfAbsent(id, key -> new StringBuilder());
                if (c.getString(2) != null) sb.append(' ').append(c.getString(2));
                if (c.getString(3) != null) sb.append(' ').append(c.getString(3));
            }
        } catch (Exception ignored) { }

        String[] projection = new String[]{ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME_PRIMARY};
        try (Cursor c = resolver.query(ContactsContract.Contacts.CONTENT_URI, projection, null, null, null)) {
            if (c == null) return;
            int inspected = 0;
            while (c.moveToNext() && inspected++ < 2000) {
                long id = c.getLong(0);
                String name = safe(c.getString(1), "Work contact");
                String extra = details.containsKey(id) ? clean(details.get(id).toString()) : "";
                int points = weightedScore(name + " " + extra);
                if (points < 2) continue;
                int confidence = confidence(points, 55);
                signals.add(new Signal("CONTACT", name, extra, confidence, confidence >= 82, "", ""));
            }
        } catch (Exception ignored) { }
    }

    private void scanCalendar() {
        long now = System.currentTimeMillis();
        long range = 150L * 24L * 60L * 60L * 1000L;
        String[] projection = new String[]{CalendarContract.Events.TITLE, CalendarContract.Events.EVENT_LOCATION, CalendarContract.Events.DESCRIPTION, CalendarContract.Events.DTSTART};
        String selection = CalendarContract.Events.DTSTART + ">? AND " + CalendarContract.Events.DTSTART + "<?";
        String[] args = new String[]{String.valueOf(now - range), String.valueOf(now + range)};
        try (Cursor c = getContentResolver().query(CalendarContract.Events.CONTENT_URI, projection, selection, args, CalendarContract.Events.DTSTART + " DESC")) {
            if (c == null) return;
            int inspected = 0;
            while (c.moveToNext() && inspected++ < 1200) {
                String title = safe(c.getString(0), "Work event");
                String location = safe(c.getString(1), "");
                String description = safe(c.getString(2), "");
                long start = c.getLong(3);
                int points = weightedScore(title + " " + location + " " + description);
                if (points < 2) continue;
                workDays.add(dayKey(start));
                int confidence = confidence(points, 58);
                signals.add(new Signal("CALENDAR", title, location, confidence, confidence >= 82, "", ""));
            }
        } catch (Exception ignored) { }
    }

    private void scanPhotos() {
        Uri collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        ArrayList<String> cols = new ArrayList<>();
        cols.add(MediaStore.Images.Media._ID);
        cols.add(MediaStore.Images.Media.DISPLAY_NAME);
        cols.add(MediaStore.Images.Media.DATE_TAKEN);
        cols.add(MediaStore.Images.Media.DATE_MODIFIED);
        cols.add(MediaStore.Images.Media.MIME_TYPE);
        if (Build.VERSION.SDK_INT >= 29) cols.add(MediaStore.Images.Media.RELATIVE_PATH);
        try (Cursor c = getContentResolver().query(collection, cols.toArray(new String[0]), null, null, MediaStore.Images.Media.DATE_MODIFIED + " DESC")) {
            if (c == null) return;
            int inspected = 0;
            while (c.moveToNext() && inspected++ < 2200) {
                long id = c.getLong(0);
                String name = safe(c.getString(1), "Photo");
                long taken = c.getLong(2);
                long modifiedSeconds = c.getLong(3);
                String mime = safe(c.getString(4), "image/jpeg");
                String path = Build.VERSION.SDK_INT >= 29 ? safe(c.getString(5), "") : "";
                long when = taken > 0 ? taken : modifiedSeconds * 1000L;
                int points = weightedScore(name + " " + path);
                if (when > 0 && workDays.contains(dayKey(when))) points += 4;
                if (containsAny((name + " " + path).toLowerCase(Locale.ROOT), new String[]{"site", "project", "door", "snag", "drawing", "inspection", "tesco", "halifax", "lloyds"})) points += 3;
                if (points < 4) continue;
                int confidence = confidence(points, 52);
                Uri uri = ContentUris.withAppendedId(collection, id);
                String reason = workDays.contains(dayKey(when)) ? "Matches work-day timeline" : "Matched work/project metadata";
                signals.add(new Signal("PHOTO", name, reason, confidence, confidence >= 82, uri.toString(), mime));
            }
        } catch (Exception ignored) { }
    }

    private void scanSharedFiles() {
        Uri collection = MediaStore.Files.getContentUri("external");
        ArrayList<String> cols = new ArrayList<>();
        cols.add(MediaStore.Files.FileColumns._ID);
        cols.add(MediaStore.Files.FileColumns.DISPLAY_NAME);
        cols.add(MediaStore.Files.FileColumns.MIME_TYPE);
        cols.add(MediaStore.Files.FileColumns.DATE_MODIFIED);
        if (Build.VERSION.SDK_INT >= 29) cols.add(MediaStore.Files.FileColumns.RELATIVE_PATH);
        try (Cursor c = getContentResolver().query(collection, cols.toArray(new String[0]), null, null, MediaStore.Files.FileColumns.DATE_MODIFIED + " DESC")) {
            if (c == null) return;
            int inspected = 0;
            while (c.moveToNext() && inspected++ < 3500) {
                long id = c.getLong(0);
                String name = safe(c.getString(1), "File");
                String mime = safe(c.getString(2), "application/octet-stream");
                String path = Build.VERSION.SDK_INT >= 29 ? safe(c.getString(4), "") : "";
                if (mime.startsWith("image/") || mime.startsWith("video/") || !isWorkFileType(name, mime)) continue;
                int points = weightedScore(name + " " + path) + 3;
                int confidence = confidence(points, 58);
                Uri uri = ContentUris.withAppendedId(collection, id);
                signals.add(new Signal("FILE", name, clean(path), confidence, confidence >= 82, uri.toString(), mime));
            }
        } catch (Exception ignored) { }
    }

    private void chooseTree(int requestCode) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, requestCode);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_ALL_FILES) {
            Toast.makeText(this, hasAllFilesAccess() ? "Full shared-file scan enabled" : "Full shared-file scan not enabled", Toast.LENGTH_LONG).show();
            render();
            return;
        }
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
        if (requestCode == REQ_PERSONAL_CLOUD || requestCode == REQ_CLOUD_SOURCE) {
            Uri tree = data.getData();
            int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            try { getContentResolver().takePersistableUriPermission(tree, flags); } catch (Exception ignored) { }
            if (requestCode == REQ_PERSONAL_CLOUD) personalCloudTree = tree.toString();
            else cloudSourceTree = tree.toString();
            persist();
            Toast.makeText(this, requestCode == REQ_PERSONAL_CLOUD ? "Personal Cloud destination connected" : "Cloud source connected", Toast.LENGTH_LONG).show();
            render();
        }
    }

    private void scanTree(Uri tree, String source, int depth, int[] visited) {
        if (tree == null || depth > 8 || visited[0] >= 1800) return;
        String documentId;
        try { documentId = DocumentsContract.getTreeDocumentId(tree); }
        catch (Exception e) { return; }
        scanTreeDocument(tree, documentId, source, depth, visited);
    }

    private void scanTreeDocument(Uri tree, String documentId, String source, int depth, int[] visited) {
        if (depth > 8 || visited[0] >= 1800) return;
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, documentId);
        String[] projection = new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE};
        try (Cursor c = getContentResolver().query(children, projection, null, null, null)) {
            if (c == null) return;
            while (c.moveToNext() && visited[0]++ < 1800) {
                String childId = c.getString(0);
                String name = safe(c.getString(1), "Cloud item");
                String mime = safe(c.getString(2), "application/octet-stream");
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    scanTreeDocument(tree, childId, source, depth + 1, visited);
                    continue;
                }
                if (!isWorkFileType(name, mime)) continue;
                int points = weightedScore(name) + 3;
                if (points < 4) continue;
                int confidence = confidence(points, 60);
                Uri item = DocumentsContract.buildDocumentUriUsingTree(tree, childId);
                signals.add(new Signal(source + " FILE", name, "Connected cloud/document provider", confidence, confidence >= 82, item.toString(), mime));
            }
        } catch (Exception ignored) { }
    }

    private void requestAllFilesAccess() {
        if (Build.VERSION.SDK_INT < 30) {
            requestAndScan();
            return;
        }
        if (Environment.isExternalStorageManager()) {
            Toast.makeText(this, "Full shared-file scan is already enabled", Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, REQ_ALL_FILES);
        } catch (Exception e) {
            startActivityForResult(new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION), REQ_ALL_FILES);
        }
    }

    private boolean hasAllFilesAccess() {
        return Build.VERSION.SDK_INT < 30 || Environment.isExternalStorageManager();
    }

    private boolean hasPhotoAccess() {
        if (Build.VERSION.SDK_INT >= 33) return checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED;
        return checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
    }

    private void acceptCopyAndStart() {
        int selected = 0;
        for (Signal signal : signals) if (signal.accepted) selected++;
        if (selected == 0 && acceptedSignals == 0) {
            Toast.makeText(this, "No work context selected", Toast.LENGTH_SHORT).show();
            return;
        }
        if (selected > 0) {
            acceptedSignals = selected;
            activeProject = inferProject();
        }
        int copied = 0;
        int failed = 0;
        if (!personalCloudTree.isEmpty()) {
            for (Signal signal : signals) {
                if (!signal.accepted || signal.sourceUri.isEmpty() || copiedUris.contains(signal.sourceUri)) continue;
                if (copyToPersonalCloud(signal)) {
                    copied++;
                    copiedUris.add(signal.sourceUri);
                } else failed++;
            }
        }
        workMode = true;
        editingContext = false;
        persist();
        if (personalCloudTree.isEmpty()) {
            Toast.makeText(this, "Work Mode ON · connect Personal Cloud to copy files", Toast.LENGTH_LONG).show();
        } else {
            Toast.makeText(this, "Work Mode ON · copied " + copied + " items" + (failed > 0 ? " · " + failed + " failed" : ""), Toast.LENGTH_LONG).show();
        }
        render();
    }

    private boolean copyToPersonalCloud(Signal signal) {
        try {
            Uri tree = Uri.parse(personalCloudTree);
            String rootId = DocumentsContract.getTreeDocumentId(tree);
            Uri parent = DocumentsContract.buildDocumentUriUsingTree(tree, rootId);
            String mime = signal.mime.isEmpty() ? "application/octet-stream" : signal.mime;
            String name = safeFileName(signal.title);
            Uri target = DocumentsContract.createDocument(getContentResolver(), parent, mime, name);
            if (target == null) return false;
            try (InputStream in = getContentResolver().openInputStream(Uri.parse(signal.sourceUri));
                 OutputStream out = getContentResolver().openOutputStream(target, "w")) {
                if (in == null || out == null) return false;
                byte[] buffer = new byte[64 * 1024];
                int n;
                while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
                out.flush();
            }
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private String inferProject() {
        StringBuilder text = new StringBuilder();
        for (Signal s : signals) if (s.accepted) text.append(' ').append(s.title).append(' ').append(s.detail);
        String lower = text.toString().toLowerCase(Locale.ROOT);
        if (lower.contains("tesco")) return "Tesco Work";
        if (lower.contains("halifax")) return "Halifax Project";
        if (lower.contains("lloyds")) return "Lloyds Project";
        if (lower.contains("riverside")) return "Riverside Project";
        if (lower.contains("nosmo") || lower.contains("nexus")) return "NOSMO / Nexus";
        return activeProject.equals("Unassigned work") ? "Detected work context" : activeProject;
    }

    private int weightedScore(String text) {
        String lower = safe(text, "").toLowerCase(Locale.ROOT);
        int score = 0;
        for (String term : strongProjectTerms) if (lower.contains(term)) score += 4;
        for (String term : tradeTerms) if (lower.contains(term)) score += 2;
        return score;
    }

    private int confidence(int points, int base) {
        return Math.min(98, base + points * 4);
    }

    private boolean isWorkFileType(String name, String mime) {
        String lower = safe(name, "").toLowerCase(Locale.ROOT);
        if (weightedScore(lower + " " + safe(mime, "")) >= 2) return true;
        for (String ext : workExtensions) if (lower.endsWith(ext)) return true;
        return false;
    }

    private boolean containsAny(String text, String[] terms) {
        for (String term : terms) if (text.contains(term)) return true;
        return false;
    }

    private String dayKey(long millis) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.UK).format(new Date(millis));
    }

    private void dedupeAndSort() {
        LinkedHashMap<String, Signal> unique = new LinkedHashMap<>();
        for (Signal signal : signals) {
            String key = (signal.category + "|" + signal.title + "|" + signal.sourceUri).toLowerCase(Locale.ROOT);
            Signal old = unique.get(key);
            if (old == null || signal.confidence > old.confidence) unique.put(key, signal);
        }
        signals.clear();
        signals.addAll(unique.values());
        Collections.sort(signals, (a, b) -> Integer.compare(b.confidence, a.confidence));
    }

    private void openProjectWorld() {
        Uri url = Uri.parse(TREE_URL).buildUpon()
                .appendQueryParameter("world", "workmode")
                .appendQueryParameter("project", activeProject)
                .appendQueryParameter("signals", String.valueOf(acceptedSignals))
                .appendQueryParameter("source", "android-v060")
                .appendQueryParameter("runtime", "restored")
                .build();
        openUrl(url.toString());
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
        root.addView(title, fullWidth(dp(72)));
    }

    private void addSection(LinearLayout root, String value) {
        TextView section = text(value, 12, Color.rgb(245, 196, 0), true);
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
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (Exception e) { Toast.makeText(this, "No browser available", Toast.LENGTH_SHORT).show(); }
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

    private String safeFileName(String value) {
        String cleaned = safe(value, "NEXUS-item").replaceAll("[\\\\/:*?\"<>|]", "_");
        return cleaned.length() > 120 ? cleaned.substring(0, 120) : cleaned;
    }

    private static class Signal {
        final String category;
        final String title;
        final String detail;
        final int confidence;
        boolean accepted;
        final String sourceUri;
        final String mime;

        Signal(String category, String title, String detail, int confidence, boolean accepted, String sourceUri, String mime) {
            this.category = category;
            this.title = title;
            this.detail = detail;
            this.confidence = confidence;
            this.accepted = accepted;
            this.sourceUri = sourceUri == null ? "" : sourceUri;
            this.mime = mime == null ? "" : mime;
        }

        String encode() {
            return Uri.encode(category) + "|" + Uri.encode(title) + "|" + Uri.encode(detail) + "|" + confidence + "|" + (accepted ? "1" : "0") + "|" + Uri.encode(sourceUri) + "|" + Uri.encode(mime);
        }

        static Signal decode(String line) {
            if (line == null || line.trim().isEmpty()) return null;
            String[] parts = line.split("\\|", -1);
            if (parts.length != 7) return null;
            try {
                return new Signal(Uri.decode(parts[0]), Uri.decode(parts[1]), Uri.decode(parts[2]), Integer.parseInt(parts[3]), "1".equals(parts[4]), Uri.decode(parts[5]), Uri.decode(parts[6]));
            } catch (Exception ignored) { return null; }
        }
    }
}
