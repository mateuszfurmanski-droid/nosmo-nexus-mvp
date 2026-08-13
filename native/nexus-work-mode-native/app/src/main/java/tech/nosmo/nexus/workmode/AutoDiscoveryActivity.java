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
    private static final String VERSION_LABEL = "0.7.0";
    private static final String TREE_URL = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/";
    private static final String NEXUS_URL = "https://nosmotechnology.co.uk/nexus.html";

    private static final String ROUTE_ESAFE_PHOTO = "ESAFE_PHOTOS_SITE_EVIDENCE";
    private static final String ROUTE_ESAFE_DOCUMENT = "ESAFE_DOCUMENTS_PDF_OFFICE";
    private static final String ROUTE_ESAFE_BIM = "ESAFE_DRAWINGS_BIM_IFC";
    private static final String ROUTE_UNCLEAR_PHOTO = "REVIEW_UNCLEAR_PHOTOS";
    private static final String ROUTE_OTHER_PROJECT = "OTHER_PROJECT_CANDIDATE";
    private static final String ROUTE_RIVERSIDE = "PROJECT_RIVERSIDE_REVIEW";
    private static final String ROUTE_CONTACT_REVIEW = "CONTACTS_CALENDAR_REVIEW";
    private static final String ROUTE_GENERAL_REVIEW = "INBOX_REVIEW";
    private static final String ROUTE_PRIVATE = "PRIVATE_DO_NOT_UPLOAD";

    private static final String GLOBAL_ANDROID_INBOX = "00_INBOX_FROM_ANDROID_WORK_MODE";
    private static final String GLOBAL_UNCLEAR_PHOTOS = GLOBAL_ANDROID_INBOX + "/REVIEW_UNCLEAR_PHOTOS";
    private static final String GLOBAL_OTHER_PROJECTS = GLOBAL_ANDROID_INBOX + "/OTHER_PROJECT_CANDIDATES";
    private static final String GLOBAL_CONTACTS_CALENDAR = GLOBAL_ANDROID_INBOX + "/CONTACTS_CALENDAR_REVIEW";
    private static final String GLOBAL_GENERAL_REVIEW = GLOBAL_ANDROID_INBOX + "/GENERAL_REVIEW";
    private static final String GLOBAL_AUDIT = "90_AUDIT_PROVENANCE";

    private final ArrayList<Signal> signals = new ArrayList<>();
    private final Set<String> workDays = new HashSet<>();
    private final Set<String> copiedUris = new HashSet<>();
    private SharedPreferences prefs;
    private boolean workMode;
    private boolean editingContext;
    private int acceptedSignals;
    private String personalCloudTree = "";
    private String cloudSourceTree = "";

    private final String[] esafeProjectTerms = new String[]{
            "e-safe", "esafe", "catania", "seismic", "retrofit", "zenodo", "etna", "survey",
            "pilot dataset", "project world", "bim", "ifc", "nexus project world"
    };
    private final String[] riversideTerms = new String[]{"riverside", "riverside demo", "riverside heights"};
    private final String[] otherProjectTerms = new String[]{
            "tesco", "halifax", "lloyds", "trinity road", "lbg", "sainsbury", "asda",
            "morrisons", "aldi", "lidl", "project", "site"
    };
    private final String[] tradeTerms = new String[]{
            "construction", "joiner", "joinery", "carpenter", "carpentry", "manager", "engineer",
            "electric", "electrical", "door", "fire door", "drawing", "dwg", "rvt", "ifc",
            "snag", "inspection", "induction", "permit", "procore", "hilti", "work wallet", "fabstation",
            "contractor", "subcontract", "ceiling", "commission", "fitout", "fit out", "installation",
            "doorset", "ironmongery", "drylining", "plumbing", "hvac", "qa", "qc", "certificate",
            "plan", "method statement", "risk assessment", "rams", "handover", "as built"
    };
    private final String[] privateTerms = new String[]{
            "selfie", "family", "holiday", "vacation", "food", "restaurant", "party", "birthday", "private"
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
        String staleProject = prefs.getString("activeProject", PersonalCloudIndexContract.PRIMARY_PROJECT);
        acceptedSignals = prefs.getInt("acceptedSignals", 0);
        if (staleProject.toLowerCase(Locale.ROOT).contains("tesco")) {
            acceptedSignals = 0;
            workMode = false;
        }
        personalCloudTree = prefs.getString("personalCloudTree", "");
        cloudSourceTree = prefs.getString("cloudSourceTree", "");
        Set<String> copied = prefs.getStringSet("personalCloudCopiedUris", Collections.emptySet());
        if (copied != null) copiedUris.addAll(copied);
        String encoded = prefs.getString("signalsV5", prefs.getString("signalsV4", prefs.getString("signalsV3", "")));
        if (!encoded.isEmpty()) {
            for (String line : encoded.split("\\n")) {
                Signal signal = Signal.decode(line);
                if (signal != null && !ROUTE_PRIVATE.equals(signal.route)) signals.add(signal);
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
                .putString("activeProject", PersonalCloudIndexContract.PRIMARY_PROJECT)
                .putInt("acceptedSignals", acceptedSignals)
                .putString("signalsV5", encoded.toString())
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

        addSection(root, "ACTIVE PROJECT WORLD");
        TextView project = text(PersonalCloudIndexContract.PRIMARY_PROJECT, 20, Color.rgb(190, 201, 214), false);
        project.setGravity(Gravity.CENTER);
        root.addView(project, fullWidth(dp(44)));
        TextView count = text(acceptedSignals + " approved discovery artefacts", 16, Color.rgb(190, 201, 214), false);
        count.setGravity(Gravity.CENTER);
        root.addView(count, fullWidth(dp(38)));

        TextView cloud = panelText(personalCloudTree.isEmpty()
                ? "GOOGLE DRIVE PERSONAL CLOUD · choose 00_NEXUS_PERSONAL_CLOUD"
                : "GOOGLE DRIVE PERSONAL CLOUD · connected · canonical Project Worlds routing · " + copiedUris.size() + " source items copied");
        root.addView(cloud, fullWidthWrap());

        Button world = primaryButton("OPEN e-SAFE PROJECT WORLD");
        world.setOnClickListener(v -> openProjectWorld());
        root.addView(world, fullWidth(dp(68)));

        Button drive = secondaryButton("OPEN NEXUS CLOUD / GOOGLE DRIVE");
        drive.setOnClickListener(v -> openUrl(PersonalCloudIndexContract.CLOUD_ROOT_URL));
        root.addView(drive, fullWidth(dp(58)));

        Button nexus = secondaryButton("OPEN NEXUS");
        nexus.setOnClickListener(v -> openUrl(NEXUS_URL));
        root.addView(nexus, fullWidth(dp(58)));

        Button update = secondaryButton("UPDATE / RESCAN DISCOVERY");
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
                "Native Android beta " + VERSION_LABEL + " · e-SAFE-first discovery · Google Drive Personal Cloud routing · no Tesco default · canonical 10_PROJECT_WORLDS runtime.",
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
                "NEXUS routes approved phone discoveries into Google Drive Personal Cloud. e-SAFE is the only active Project World; recognized project files go under 10_PROJECT_WORLDS/<projectId>, while unclear photos, contacts/calendar and other-project candidates stay in review. Originals stay where they are.",
                14, Color.rgb(190, 201, 214), false);
        intro.setGravity(Gravity.CENTER);
        intro.setLineSpacing(0f, 1.16f);
        root.addView(intro, fullWidthWrap());

        addSection(root, "1 · GOOGLE DRIVE PERSONAL CLOUD");
        root.addView(panelText("Target root: NOSMO / 03_NEXUS / 00_NEXUS_PERSONAL_CLOUD\nCanonical runtime route: 10_PROJECT_WORLDS/" + PersonalCloudIndexContract.PRIMARY_PROJECT_ID + "/...\nPhysical provider: Google Drive through Android Storage Access Framework until Drive OAuth/API is added."), fullWidthWrap());

        Button openDrive = secondaryButton("OPEN NEXUS CLOUD / GOOGLE DRIVE");
        openDrive.setOnClickListener(v -> openUrl(PersonalCloudIndexContract.CLOUD_ROOT_URL));
        root.addView(openDrive, fullWidth(dp(56)));

        Button personalCloud = secondaryButton(personalCloudTree.isEmpty() ? "+ CONNECT GOOGLE DRIVE PERSONAL CLOUD" : "GOOGLE DRIVE PERSONAL CLOUD · CONNECTED");
        personalCloud.setOnClickListener(v -> chooseTree(REQ_PERSONAL_CLOUD));
        root.addView(personalCloud, fullWidth(dp(56)));

        addSection(root, "2 · AUTOMATIC DISCOVERY");

        Button scan = primaryButton("SCAN PHONE + CONNECTED CLOUD");
        scan.setOnClickListener(v -> requestAndScan());
        root.addView(scan, fullWidth(dp(64)));

        Button files = secondaryButton(hasAllFilesAccess() ? "FULL FILE SCAN · ENABLED" : "ENABLE FULL FILE SCAN");
        files.setOnClickListener(v -> requestAllFilesAccess());
        root.addView(files, fullWidth(dp(56)));

        Button cloudSource = secondaryButton(hasAllFilesAccess()
                ? "PHONE SOURCE · WHOLE Z FOLD5 ENABLED"
                : (cloudSourceTree.isEmpty() ? "+ CONNECT CLOUD SOURCE" : "CLOUD SOURCE · CONNECTED"));
        cloudSource.setOnClickListener(v -> {
            if (hasAllFilesAccess()) {
                Toast.makeText(this, "Whole phone source is already enabled by Full File Scan", Toast.LENGTH_LONG).show();
                scanEverything();
            } else {
                chooseTree(REQ_CLOUD_SOURCE);
            }
        });
        root.addView(cloudSource, fullWidth(dp(56)));

        addSection(root, "3 · DISCOVERY REVIEW");
        if (signals.isEmpty()) {
            root.addView(panelText("No current discovery. Run the scan. Android may ask once for Contacts, Calendar, Photos and—if you enable it—special all-files access."), fullWidthWrap());
        } else {
            int esafe = 0;
            int unclear = 0;
            int other = 0;
            int review = 0;
            for (Signal s : signals) {
                if (s.route.startsWith("ESAFE_")) esafe++;
                else if (ROUTE_UNCLEAR_PHOTO.equals(s.route)) unclear++;
                else if (ROUTE_OTHER_PROJECT.equals(s.route) || ROUTE_RIVERSIDE.equals(s.route)) other++;
                else review++;
            }
            root.addView(panelText(signals.size() + " discovery signals · " + esafe + " e-SAFE · " + unclear + " unclear photos · " + other + " other projects · " + review + " review"), fullWidthWrap());

            int shown = Math.min(70, signals.size());
            for (int i = 0; i < shown; i++) {
                Signal signal = signals.get(i);
                CheckBox check = new CheckBox(this);
                check.setChecked(signal.accepted);
                check.setTextColor(Color.rgb(225, 232, 238));
                check.setTextSize(13);
                check.setPadding(dp(6), dp(7), dp(6), dp(7));
                check.setButtonTintList(android.content.res.ColorStateList.valueOf(Color.rgb(245, 196, 0)));
                String detail = signal.detail.isEmpty() ? "" : "\n" + signal.detail;
                check.setText(signal.category + " · " + signal.title + detail + "\nroute: " + signal.route + " · " + signal.confidence + "% · " + signal.inferredProject + "\ncopy path: " + destinationPathFor(signal));
                check.setOnCheckedChangeListener((buttonView, isChecked) -> signal.accepted = isChecked);
                root.addView(check, fullWidthWrap());
            }
            if (signals.size() > shown) {
                TextView more = text("+ " + (signals.size() - shown) + " lower-ranked items retained in the index", 11, Color.rgb(112, 126, 142), false);
                root.addView(more, fullWidthWrap());
            }
        }

        addSection(root, "4 · ACCEPT + COPY");
        Button accept = primaryButton("ACCEPT + COPY TO GOOGLE DRIVE + START WORK MODE");
        accept.setOnClickListener(v -> acceptCopyAndStart());
        root.addView(accept, fullWidth(dp(68)));

        Button clear = secondaryButton("CLEAR DISCOVERY INDEX");
        clear.setOnClickListener(v -> { signals.clear(); persist(); render(); });
        root.addView(clear, fullWidth(dp(52)));

        TextView privacy = text(
                "NEXUS does not delete originals. It does not scrape WhatsApp/Gmail private databases. Google Drive folder access here is SAF write access to the selected folder; full account crawling still requires Google Drive OAuth/API.",
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
        Toast.makeText(this, "NEXUS indexed " + signals.size() + " discovery signals", Toast.LENGTH_LONG).show();
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
                addSignal("CONTACT", name, extra, confidence, false, "", "");
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
                addSignal("CALENDAR", title, location, confidence, false, "", "");
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
                String text = name + " " + path;
                int points = weightedScore(text);
                if (when > 0 && workDays.contains(dayKey(when))) points += 4;
                if (containsAny(text.toLowerCase(Locale.ROOT), esafeProjectTerms)) points += 5;
                if (containsAny(text.toLowerCase(Locale.ROOT), tradeTerms)) points += 3;
                if (points < 4) continue;
                int confidence = confidence(points, 52);
                Uri uri = ContentUris.withAppendedId(collection, id);
                String reason = workDays.contains(dayKey(when)) ? "Matches work-day timeline" : "Matched construction/project metadata";
                addSignal("PHOTO", name, reason, confidence, confidence >= 82, uri.toString(), mime);
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
                addSignal("FILE", name, clean(path), confidence, confidence >= 82, uri.toString(), mime);
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
            Toast.makeText(this, requestCode == REQ_PERSONAL_CLOUD ? "Google Drive Personal Cloud connected" : "Cloud source connected", Toast.LENGTH_LONG).show();
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
                addSignal(source + " FILE", name, "Connected cloud/document provider", confidence, confidence >= 82, item.toString(), mime);
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
            Toast.makeText(this, "No discovery artefacts selected", Toast.LENGTH_SHORT).show();
            return;
        }
        if (selected > 0) acceptedSignals = selected;
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
            Toast.makeText(this, "Work Mode ON · connect Google Drive Personal Cloud to copy files", Toast.LENGTH_LONG).show();
        } else {
            Toast.makeText(this, "Work Mode ON · copied " + copied + " items" + (failed > 0 ? " · " + failed + " failed" : ""), Toast.LENGTH_LONG).show();
        }
        render();
    }

    private boolean copyToPersonalCloud(Signal signal) {
        if (ROUTE_PRIVATE.equals(signal.route)) return false;
        try {
            Uri tree = Uri.parse(personalCloudTree);
            String destinationPath = destinationPathFor(signal);
            Uri parent = ensureFolder(tree, splitPath(destinationPath));
            if (parent == null) return false;
            String mime = signal.mime.isEmpty() ? "application/octet-stream" : signal.mime;
            String name = makeDestinationFileName(signal);
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
            writeProvenanceManifest(tree, signal, target.toString(), destinationPath);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private Uri ensureFolder(Uri tree, String[] folders) {
        try {
            String parentId = DocumentsContract.getTreeDocumentId(tree);
            if (folders.length == 0) return DocumentsContract.buildDocumentUriUsingTree(tree, parentId);
            for (String folder : folders) {
                if (folder == null || folder.trim().isEmpty()) continue;
                String existing = findChildFolderId(tree, parentId, folder);
                if (existing == null) {
                    Uri parent = DocumentsContract.buildDocumentUriUsingTree(tree, parentId);
                    Uri created = DocumentsContract.createDocument(getContentResolver(), parent, DocumentsContract.Document.MIME_TYPE_DIR, folder);
                    if (created == null) return null;
                    parentId = DocumentsContract.getDocumentId(created);
                } else {
                    parentId = existing;
                }
            }
            return DocumentsContract.buildDocumentUriUsingTree(tree, parentId);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String findChildFolderId(Uri tree, String parentId, String folderName) {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId);
        String[] projection = new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE};
        try (Cursor c = getContentResolver().query(children, projection, null, null, null)) {
            if (c == null) return null;
            while (c.moveToNext()) {
                String id = c.getString(0);
                String name = safe(c.getString(1), "");
                String mime = safe(c.getString(2), "");
                if (folderName.equals(name) && DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) return id;
            }
        } catch (Exception ignored) { }
        return null;
    }

    private void writeProvenanceManifest(Uri tree, Signal signal, String targetUri, String destinationPath) {
        String copiedAt = String.valueOf(System.currentTimeMillis());
        String projectId = projectIdForSignal(signal);
        writeTextFile(tree, auditPathForProject(projectId), "nexus-provenance-" + Math.abs(signal.sourceUri.hashCode()) + ".txt", provenanceText(signal, targetUri, destinationPath, copiedAt));
        String jsonl = PersonalCloudIndexContract.indexRecordJsonl(copiedAt, signal.category, signal.title, signal.mime, signal.confidence, signal.route, signal.inferredProject, signal.sourceUri, targetUri, destinationPath);
        writeTextFile(tree, auditPathForProject(projectId), "nexus-index-record-" + Math.abs(signal.sourceUri.hashCode()) + ".jsonl", jsonl);
        writeTextFile(tree, new String[]{PersonalCloudIndexContract.SHARED_REGISTRIES_FOLDER}, "nexus-index-record-" + Math.abs(signal.sourceUri.hashCode()) + ".jsonl", jsonl);
    }

    private void writeTextFile(Uri tree, String[] folderPath, String name, String body) {
        try {
            Uri folder = ensureFolder(tree, folderPath);
            if (folder == null) return;
            Uri file = DocumentsContract.createDocument(getContentResolver(), folder, "text/plain", name);
            if (file == null) return;
            try (OutputStream out = getContentResolver().openOutputStream(file, "w")) {
                if (out == null) return;
                out.write(PersonalCloudIndexContract.asUtf8Bytes(body));
                out.flush();
            }
        } catch (Exception ignored) { }
    }

    private String provenanceText(Signal signal, String targetUri, String destinationPath, String copiedAt) {
        String projectId = projectIdForSignal(signal);
        return "nexusProvenanceVersion=work-mode-v0.7-canonical-project-worlds\n"
                + "source=android-work-mode\n"
                + "physicalCloudProvider=" + PersonalCloudIndexContract.PHYSICAL_PROVIDER_GOOGLE_DRIVE + "\n"
                + "cloudRootId=" + PersonalCloudIndexContract.CLOUD_ROOT_ID + "\n"
                + "projectWorldsRootId=" + PersonalCloudIndexContract.PROJECT_WORLDS_ROOT_ID + "\n"
                + "projectId=" + projectId + "\n"
                + "worldId=" + PersonalCloudIndexContract.worldIdForProjectId(projectId) + "\n"
                + "sourceUri=" + signal.sourceUri + "\n"
                + "targetUri=" + targetUri + "\n"
                + "destinationPath=" + destinationPath + "\n"
                + "discoveredAt=" + signal.discoveredAt + "\n"
                + "copiedAt=" + copiedAt + "\n"
                + "category=" + signal.category + "\n"
                + "title=" + signal.title + "\n"
                + "mime=" + signal.mime + "\n"
                + "confidence=" + signal.confidence + "\n"
                + "userAccepted=" + signal.accepted + "\n"
                + "inferredProject=" + signal.inferredProject + "\n"
                + "route=" + signal.route + "\n"
                + "projectGraphLinkStatus=" + PersonalCloudIndexContract.PROJECT_GRAPH_LINK_PENDING + "\n"
                + "originalDeleted=false\n";
    }

    private String destinationPathFor(Signal signal) {
        if (ROUTE_RIVERSIDE.equals(signal.route)) {
            return PersonalCloudIndexContract.destinationPathForRoute(PersonalCloudIndexContract.RIVERSIDE_PROJECT_ID, ROUTE_RIVERSIDE);
        }
        if (signal.route.startsWith("ESAFE_")) {
            return PersonalCloudIndexContract.destinationPathForRoute(PersonalCloudIndexContract.PRIMARY_PROJECT_ID, signal.route);
        }
        if (ROUTE_UNCLEAR_PHOTO.equals(signal.route)) return GLOBAL_UNCLEAR_PHOTOS;
        if (ROUTE_OTHER_PROJECT.equals(signal.route)) return GLOBAL_OTHER_PROJECTS + "/" + safeFolderName(signal.inferredProject);
        if (ROUTE_CONTACT_REVIEW.equals(signal.route)) return GLOBAL_CONTACTS_CALENDAR;
        if (ROUTE_PRIVATE.equals(signal.route)) return PersonalCloudIndexContract.PROJECT_WORLDS_FOLDER + "/" + PersonalCloudIndexContract.PRIMARY_PROJECT_ID + "/" + PersonalCloudIndexContract.PRIVATE_DO_NOT_UPLOAD_FOLDER;
        return GLOBAL_GENERAL_REVIEW;
    }

    private String[] auditPathForProject(String projectId) {
        if (PersonalCloudIndexContract.RIVERSIDE_PROJECT_ID.equals(projectId)) {
            return splitPath(PersonalCloudIndexContract.PROJECT_WORLDS_FOLDER + "/" + PersonalCloudIndexContract.RIVERSIDE_PROJECT_ID + "/" + PersonalCloudIndexContract.PROJECT_AUDIT_FOLDER);
        }
        if (PersonalCloudIndexContract.PRIMARY_PROJECT_ID.equals(projectId)) {
            return splitPath(PersonalCloudIndexContract.PROJECT_WORLDS_FOLDER + "/" + PersonalCloudIndexContract.PRIMARY_PROJECT_ID + "/" + PersonalCloudIndexContract.PROJECT_AUDIT_FOLDER);
        }
        return new String[]{GLOBAL_AUDIT};
    }

    private String projectIdForSignal(Signal signal) {
        if (ROUTE_RIVERSIDE.equals(signal.route)) return PersonalCloudIndexContract.RIVERSIDE_PROJECT_ID;
        if (signal.route.startsWith("ESAFE_")) return PersonalCloudIndexContract.PRIMARY_PROJECT_ID;
        return "UNRESOLVED_REVIEW";
    }

    private String[] splitPath(String path) {
        if (path == null || path.trim().isEmpty()) return new String[0];
        return path.split("/");
    }

    private void addSignal(String category, String title, String detail, int confidence, boolean suggestedAccepted, String sourceUri, String mime) {
        String route = classifyRoute(category, title, detail, mime);
        if (ROUTE_PRIVATE.equals(route)) return;
        String project = inferProjectForSignal(title + " " + detail + " " + mime, route);
        boolean accepted = suggestedAccepted && !ROUTE_CONTACT_REVIEW.equals(route) && !ROUTE_GENERAL_REVIEW.equals(route) && !ROUTE_OTHER_PROJECT.equals(route);
        signals.add(new Signal(category, title, detail, confidence, accepted, sourceUri, mime, route, project, System.currentTimeMillis()));
    }

    private String classifyRoute(String category, String title, String detail, String mime) {
        String text = (safe(title, "") + " " + safe(detail, "") + " " + safe(mime, "")).toLowerCase(Locale.ROOT);
        if (containsAny(text, privateTerms)) return ROUTE_PRIVATE;
        if ("CONTACT".equals(category) || "CALENDAR".equals(category)) return ROUTE_CONTACT_REVIEW;
        if (containsAny(text, riversideTerms)) return ROUTE_RIVERSIDE;
        if (containsAny(text, esafeProjectTerms)) {
            if ("PHOTO".equals(category)) return ROUTE_ESAFE_PHOTO;
            if (isBimOrDrawing(title, mime)) return ROUTE_ESAFE_BIM;
            return ROUTE_ESAFE_DOCUMENT;
        }
        if (containsAny(text, otherProjectTerms)) return ROUTE_OTHER_PROJECT;
        if ("PHOTO".equals(category)) return ROUTE_UNCLEAR_PHOTO;
        return ROUTE_GENERAL_REVIEW;
    }

    private String inferProjectForSignal(String text, String route) {
        String lower = safe(text, "").toLowerCase(Locale.ROOT);
        if (route.startsWith("ESAFE_")) return PersonalCloudIndexContract.PRIMARY_PROJECT_ID;
        if (ROUTE_RIVERSIDE.equals(route)) return PersonalCloudIndexContract.RIVERSIDE_PROJECT_ID;
        if (lower.contains("tesco")) return "PROJECT_TESCO_REVIEW";
        if (lower.contains("halifax") || lower.contains("lloyds") || lower.contains("trinity road") || lower.contains("lbg")) return "PROJECT_HALIFAX_LLOYDS_REVIEW";
        if (ROUTE_OTHER_PROJECT.equals(route)) return "PROJECT_CANDIDATE_REVIEW";
        return "UNASSIGNED_REVIEW";
    }

    private int weightedScore(String text) {
        String lower = safe(text, "").toLowerCase(Locale.ROOT);
        int score = 0;
        for (String term : esafeProjectTerms) if (lower.contains(term)) score += 5;
        for (String term : riversideTerms) if (lower.contains(term)) score += 5;
        for (String term : otherProjectTerms) if (lower.contains(term)) score += 3;
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

    private boolean isBimOrDrawing(String name, String mime) {
        String lower = (safe(name, "") + " " + safe(mime, "")).toLowerCase(Locale.ROOT);
        return lower.endsWith(".dwg") || lower.endsWith(".dxf") || lower.endsWith(".ifc") || lower.endsWith(".rvt")
                || lower.endsWith(".nwd") || lower.endsWith(".nwc") || lower.contains("drawing") || lower.contains("bim") || lower.contains("ifc");
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
                .appendQueryParameter("world", PersonalCloudIndexContract.PRIMARY_WORLD_ID)
                .appendQueryParameter("project", PersonalCloudIndexContract.PRIMARY_PROJECT)
                .appendQueryParameter("projectId", PersonalCloudIndexContract.PRIMARY_PROJECT_ID)
                .appendQueryParameter("signals", String.valueOf(acceptedSignals))
                .appendQueryParameter("source", "android-v070")
                .appendQueryParameter("personalCloud", PersonalCloudIndexContract.PHYSICAL_PROVIDER_GOOGLE_DRIVE)
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

    private String safeFolderName(String value) {
        String cleaned = safe(value, "PROJECT_CANDIDATE_REVIEW").replaceAll("[\\\\/:*?\"<>|]", "_").replaceAll("\\s+", "_");
        return cleaned.length() > 90 ? cleaned.substring(0, 90) : cleaned;
    }

    private String makeDestinationFileName(Signal signal) {
        String stamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.UK).format(new Date());
        return stamp + "_" + signal.route + "_" + safeFileName(signal.title);
    }

    private static class Signal {
        final String category;
        final String title;
        final String detail;
        final int confidence;
        boolean accepted;
        final String sourceUri;
        final String mime;
        final String route;
        final String inferredProject;
        final long discoveredAt;

        Signal(String category, String title, String detail, int confidence, boolean accepted, String sourceUri, String mime, String route, String inferredProject, long discoveredAt) {
            this.category = category;
            this.title = title;
            this.detail = detail;
            this.confidence = confidence;
            this.accepted = accepted;
            this.sourceUri = sourceUri == null ? "" : sourceUri;
            this.mime = mime == null ? "" : mime;
            this.route = route == null ? ROUTE_GENERAL_REVIEW : route;
            this.inferredProject = inferredProject == null ? "UNASSIGNED_REVIEW" : inferredProject;
            this.discoveredAt = discoveredAt <= 0 ? System.currentTimeMillis() : discoveredAt;
        }

        String encode() {
            return Uri.encode(category) + "|" + Uri.encode(title) + "|" + Uri.encode(detail) + "|" + confidence + "|" + (accepted ? "1" : "0") + "|" + Uri.encode(sourceUri) + "|" + Uri.encode(mime) + "|" + Uri.encode(route) + "|" + Uri.encode(inferredProject) + "|" + discoveredAt;
        }

        static Signal decode(String line) {
            if (line == null || line.trim().isEmpty()) return null;
            String[] parts = line.split("\\|", -1);
            try {
                if (parts.length == 7) {
                    return new Signal(Uri.decode(parts[0]), Uri.decode(parts[1]), Uri.decode(parts[2]), Integer.parseInt(parts[3]), "1".equals(parts[4]), Uri.decode(parts[5]), Uri.decode(parts[6]), ROUTE_GENERAL_REVIEW, "UNASSIGNED_REVIEW", System.currentTimeMillis());
                }
                if (parts.length != 10) return null;
                return new Signal(Uri.decode(parts[0]), Uri.decode(parts[1]), Uri.decode(parts[2]), Integer.parseInt(parts[3]), "1".equals(parts[4]), Uri.decode(parts[5]), Uri.decode(parts[6]), Uri.decode(parts[7]), Uri.decode(parts[8]), Long.parseLong(parts[9]));
            } catch (Exception ignored) { return null; }
        }
    }
}
