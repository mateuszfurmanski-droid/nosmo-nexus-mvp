package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Device-local evidence transfer surface.
 *
 * It consumes the canonical Cloud endpoint only. Provider credentials, Drive folder IDs,
 * canonical Person IDs and permission grants never exist in the APK. A local item becomes
 * TRANSFER_CONFIRMED only after the server reports both provider write confirmation and a
 * committed Project Memory file record.
 */
public final class CloudEvidenceActivity extends Activity {
    private static final String PREFS = "nexus_work_mode_v060";
    private static final String PREF_QUEUE = "approvalQueue";
    private static final String PREF_PENDING_RESELECTION = "pendingEvidenceReselectionCandidateId";
    private static final int REQ_RESELECT_EVIDENCE = 401;

    private static final String HANDOFF_DONE = "HANDED_OFF";
    private static final String EVIDENCE_PENDING = "PENDING_CANONICAL_CLOUD_ENDPOINT";
    private static final String EVIDENCE_READY = "READY_FOR_AUTHORISED_TRANSFER";
    private static final String EVIDENCE_CONFIRMED = "TRANSFER_CONFIRMED";
    private static final String EVIDENCE_RETRY = "FAILED_RETRYABLE";
    private static final String EVIDENCE_RESELECTION_REQUIRED = "RESELECTION_REQUIRED";

    private static final int BG = Color.rgb(4, 16, 31);
    private static final int PANEL = Color.rgb(10, 34, 63);
    private static final int TEXT = Color.rgb(238, 247, 255);
    private static final int MUTED = Color.rgb(153, 181, 207);
    private static final int CYAN = Color.rgb(72, 205, 255);

    private final Set<String> inFlightUploads = new LinkedHashSet<>();
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (prefs != null) render();
    }

    @Override
    public void onBackPressed() {
        backToWorkMode();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_RESELECT_EVIDENCE) return;

        String candidateId = prefs.getString(PREF_PENDING_RESELECTION, "");
        prefs.edit().remove(PREF_PENDING_RESELECTION).apply();
        if (candidateId.isEmpty()) {
            Toast.makeText(this, "Ignored stale evidence reselection result", Toast.LENGTH_LONG).show();
            render();
            return;
        }
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            Toast.makeText(this, "Evidence reselection cancelled; Cloud upload remains blocked", Toast.LENGTH_LONG).show();
            render();
            return;
        }

        Uri newUri = data.getData();
        if (!"content".equals(newUri.getScheme())) {
            markEvidenceReselectionRequired(candidateId);
            Toast.makeText(this, "Only a system-selected content URI can replace local evidence", Toast.LENGTH_LONG).show();
            render();
            return;
        }

        boolean newGrantRetained = false;
        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            JSONObject item = findItem(queue, candidateId);
            EvidenceBindingStore.Binding binding = EvidenceBindingStore.get(this, candidateId);
            if (
                    item == null ||
                    binding == null ||
                    !HANDOFF_DONE.equals(item.optString("handoffState", "")) ||
                    EVIDENCE_CONFIRMED.equals(item.optString("evidenceTransferState", ""))
            ) {
                Toast.makeText(this, "Evidence is no longer eligible for local reselection", Toast.LENGTH_LONG).show();
                render();
                return;
            }

            String source = safe(item.optString("source", ""));
            if (!isRawEvidenceSource(source)) {
                Toast.makeText(this, "Only PHOTO/DOCUMENT evidence can be reselected here", Toast.LENGTH_LONG).show();
                render();
                return;
            }

            String mimeType = safe(getContentResolver().getType(newUri));
            if ("PHOTO".equals(source) && !mimeType.startsWith("image/")) {
                markEvidenceReselectionRequired(candidateId);
                Toast.makeText(this, "Re-select the original photo evidence", Toast.LENGTH_LONG).show();
                render();
                return;
            }

            // The picker result carries temporary read access. Validate the exact URI first;
            // only then retain a persistable grant so rejected selections do not leak access.
            if (!canReadLocalEvidence(newUri)) {
                markEvidenceReselectionRequired(candidateId);
                Toast.makeText(this, "The selected evidence cannot be read; choose the original evidence again", Toast.LENGTH_LONG).show();
                render();
                return;
            }

            newGrantRetained = takePersistableReadPermission(newUri, data.getFlags());

            String oldReference = safe(item.optString("localReference", ""));
            item.put("localReference", newUri.toString());
            if (!mimeType.isEmpty()) item.put("contentType", mimeType);
            item.put("evidenceTransferState", EVIDENCE_RETRY);
            item.put("evidenceReselectedAt", System.currentTimeMillis());
            item.put("evidenceReselectionCount", item.optInt("evidenceReselectionCount", 0) + 1);
            prefs.edit().putString(PREF_QUEUE, queue.toString()).apply();

            if (!oldReference.equals(newUri.toString())) {
                releasePersistedReadPermissionIfUnused(queue, candidateId, oldReference);
            }

            Toast.makeText(
                    this,
                    "Local evidence access restored. Project World and metadata receipt were not changed.",
                    Toast.LENGTH_LONG
            ).show();
        } catch (Exception ignored) {
            if (newGrantRetained) releaseRejectedReselectionGrantIfNew(candidateId, newUri);
            markEvidenceReselectionRequired(candidateId);
            Toast.makeText(this, "Could not persist the reselected local evidence", Toast.LENGTH_LONG).show();
        }
        render();
    }

    private void render() {
        LinearLayout root = page();
        addTitle(root, "NEXUS Cloud Evidence");
        addBody(root, "Metadata handoff and binary evidence transfer are separate. This screen can send only user-selected PHOTO/DOCUMENT bytes to the canonical authenticated Nexus Cloud endpoint.");

        addSection(root, "MOBILE SESSION");
        if (NexusMobileSession.hasSession(this)) {
            addBody(root, "Nexus mobile session: ACTIVE · stored encrypted with Android Keystore");
            addAction(root, "Sign out Nexus mobile session", this::logoutMobileSession, false);
        } else {
            addBody(root, "Nexus mobile session: NOT AUTHENTICATED");
            addAction(root, "Sign in for Cloud evidence upload", this::beginMobileSignIn, true);
        }

        addSection(root, "CONFIRMED METADATA / EVIDENCE");
        int evidenceCount = 0;
        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            Set<String> candidateIds = new LinkedHashSet<>();
            for (int i = 0; i < queue.length(); i++) {
                String id = safe(queue.getJSONObject(i).optString("id", ""));
                if (!id.isEmpty()) candidateIds.add(id);
            }
            EvidenceBindingStore.pruneToCandidates(this, candidateIds);

            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.getJSONObject(i);
                String source = safe(item.optString("source", ""));
                if (!isRawEvidenceSource(source)) continue;
                if (!HANDOFF_DONE.equals(item.optString("handoffState", ""))) continue;
                migrateLegacyQueueBinding(item);
                evidenceCount++;
                addEvidenceItem(root, item);
            }
        } catch (Exception ignored) {
            addBody(root, "Local evidence queue could not be read.");
        }

        if (evidenceCount == 0) {
            addBody(root, "No PHOTO/DOCUMENT has both user approval and a confirmed Nexus metadata receipt yet.");
        }

        if (!inFlightUploads.isEmpty()) {
            addSmall(root, "Cloud upload is in progress. Sign-out and leaving this screen are locked until the current stream returns a result.");
        }
        addAction(root, "Back to Work Mode", this::backToWorkMode, false);
        addSmall(root, "Cloud success requires providerWriteConfirmed=true AND projectMemoryCommitted=true. Provider-only success or DB failure remains retryable and never becomes TRANSFER_CONFIRMED.");
        setPage(root);
    }

    private void migrateLegacyQueueBinding(JSONObject item) {
        String id = safe(item.optString("id", ""));
        if (EvidenceBindingStore.get(this, id) != null) return;
        String projectId = safe(item.optString("handoffProjectId", ""));
        String worldId = safe(item.optString("handoffWorldId", ""));
        if (!projectId.isEmpty() && !worldId.isEmpty()) {
            EvidenceBindingStore.bindConfirmedMetadata(this, id, projectId, worldId);
        }
    }

    private void addEvidenceItem(LinearLayout root, JSONObject item) {
        String id = safe(item.optString("id", ""));
        String source = safe(item.optString("source", ""));
        String name = safe(item.optString("displayName", "Local evidence"));
        EvidenceBindingStore.Binding binding = EvidenceBindingStore.get(this, id);
        String projectId = binding == null ? "" : binding.projectId;
        String worldId = binding == null ? "" : binding.worldId;
        String evidenceState = safe(item.optString("evidenceTransferState", EVIDENCE_PENDING));

        addBody(root,
                source + " · " + name
                        + "\nprojectId: " + emptyDash(projectId)
                        + "\nworldId: " + emptyDash(worldId)
                        + "\nevidence: " + evidenceState);

        if (binding == null) {
            addSmall(root, "Receipt-bound Project World binding is missing. This evidence is blocked from Cloud upload rather than falling back to the current global project.");
            return;
        }

        if (EVIDENCE_CONFIRMED.equals(evidenceState)) {
            String cloudFileId = binding.cloudFileId;
            String driveFileId = binding.driveFileId;
            addSmall(root,
                    "Canonical Cloud commit confirmed"
                            + (cloudFileId.isEmpty() ? "" : " · fileId " + cloudFileId)
                            + (driveFileId.isEmpty() ? "" : " · provider receipt retained locally"));
            return;
        }

        if (inFlightUploads.contains(id)) {
            addSmall(root, "Upload in progress — duplicate send is locked for this evidence item.");
            return;
        }

        if (EVIDENCE_RESELECTION_REQUIRED.equals(evidenceState)) {
            addSmall(root, "The original content URI is no longer readable. Re-select the same original evidence; Nexus metadata and Project World binding remain unchanged.");
            addAction(root, "Re-select original evidence", () -> beginEvidenceReselection(id), false);
            return;
        }

        if (
                EVIDENCE_PENDING.equals(evidenceState) ||
                EVIDENCE_READY.equals(evidenceState) ||
                EVIDENCE_RETRY.equals(evidenceState)
        ) {
            addAction(
                    root,
                    EVIDENCE_RETRY.equals(evidenceState) || EVIDENCE_READY.equals(evidenceState)
                            ? "Retry Cloud upload"
                            : "Upload evidence to Nexus Cloud",
                    () -> uploadEvidence(id),
                    false
            );
        }
    }

    private void beginMobileSignIn() {
        String origin = configuredNexusOrigin();
        if (origin.isEmpty()) {
            Toast.makeText(this, "Nexus HTTPS origin is not configured in this APK", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            String url = NexusMobileSession.beginAuthorization(this, origin);
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
            NexusMobileSession.clearPendingAuthorization(this);
            Toast.makeText(this, "Could not start Nexus mobile sign-in", Toast.LENGTH_LONG).show();
        }
    }

    private void logoutMobileSession() {
        if (!inFlightUploads.isEmpty()) {
            Toast.makeText(this, "Wait for the active Cloud upload before signing out", Toast.LENGTH_LONG).show();
            return;
        }

        String origin = configuredNexusOrigin();
        if (origin.isEmpty()) {
            Toast.makeText(this, "Nexus HTTPS origin is not configured; server sign-out was not attempted", Toast.LENGTH_LONG).show();
            return;
        }

        Toast.makeText(this, "Signing out Nexus mobile session…", Toast.LENGTH_SHORT).show();
        NexusMobileSession.logout(
                getApplicationContext(),
                origin,
                (success, message) -> runOnUiThread(() -> {
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show();
                    render();
                })
        );
    }

    private void uploadEvidence(String candidateId) {
        if (inFlightUploads.contains(candidateId)) {
            Toast.makeText(this, "This evidence upload is already in progress", Toast.LENGTH_LONG).show();
            return;
        }

        String origin = configuredNexusOrigin();
        String token = NexusMobileSession.getSessionToken(this);
        if (origin.isEmpty()) {
            Toast.makeText(this, "Nexus HTTPS origin is not configured", Toast.LENGTH_LONG).show();
            return;
        }
        if (token == null) {
            Toast.makeText(this, "Sign in to Nexus before Cloud upload", Toast.LENGTH_LONG).show();
            beginMobileSignIn();
            return;
        }

        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            JSONObject item = findItem(queue, candidateId);
            if (item == null) {
                Toast.makeText(this, "Local evidence item no longer exists", Toast.LENGTH_LONG).show();
                return;
            }

            String source = safe(item.optString("source", ""));
            EvidenceBindingStore.Binding binding = EvidenceBindingStore.get(this, candidateId);
            String localReference = safe(item.optString("localReference", ""));
            if (
                    !isRawEvidenceSource(source) ||
                    !HANDOFF_DONE.equals(item.optString("handoffState", "")) ||
                    binding == null ||
                    !localReference.startsWith("content://")
            ) {
                Toast.makeText(this, "Evidence is not bound to a confirmed Project World", Toast.LENGTH_LONG).show();
                return;
            }

            Uri localUri = Uri.parse(localReference);
            if (!canReadLocalEvidence(localUri)) {
                markEvidenceReselectionRequired(candidateId);
                Toast.makeText(
                        this,
                        "Local evidence access expired or was revoked. Re-select the original evidence before retrying.",
                        Toast.LENGTH_LONG
                ).show();
                render();
                return;
            }

            inFlightUploads.add(candidateId);
            item.put("evidenceTransferState", EVIDENCE_READY);
            prefs.edit().putString(PREF_QUEUE, queue.toString()).apply();
            render();

            String idempotencyKey = "android-evidence-" + candidateId;
            NexusCloudUploadClient.upload(
                    getApplicationContext(),
                    origin,
                    token,
                    localUri,
                    item.optString("displayName", "android-evidence"),
                    item.optString("contentType", "application/octet-stream"),
                    binding.projectId,
                    binding.worldId,
                    idempotencyKey,
                    result -> runOnUiThread(() -> applyUploadResult(candidateId, result))
            );
        } catch (Exception ignored) {
            inFlightUploads.remove(candidateId);
            markEvidenceRetryable(candidateId);
            Toast.makeText(this, "Could not prepare local evidence upload", Toast.LENGTH_LONG).show();
            render();
        }
    }

    private void applyUploadResult(String candidateId, NexusCloudUploadClient.Result result) {
        inFlightUploads.remove(candidateId);
        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            JSONObject item = findItem(queue, candidateId);
            if (item == null) {
                Toast.makeText(this, "Upload finished but the local queue item was removed", Toast.LENGTH_LONG).show();
                EvidenceBindingStore.remove(this, candidateId);
                render();
                return;
            }

            if (result.outcome == NexusCloudUploadClient.Outcome.TRANSFER_CONFIRMED) {
                item.put("evidenceTransferState", EVIDENCE_CONFIRMED);
                EvidenceBindingStore.recordCloudCommit(this, candidateId, result.fileId, result.driveFileId);
            } else {
                item.put("evidenceTransferState", EVIDENCE_RETRY);
                if (result.outcome == NexusCloudUploadClient.Outcome.AUTH_REQUIRED) {
                    NexusMobileSession.clearSession(this);
                }
            }
            prefs.edit().putString(PREF_QUEUE, queue.toString()).apply();
            Toast.makeText(this, result.message, Toast.LENGTH_LONG).show();
        } catch (Exception ignored) {
            markEvidenceRetryable(candidateId);
            Toast.makeText(this, "Could not persist local Cloud receipt state", Toast.LENGTH_LONG).show();
        }
        render();
    }

    private void beginEvidenceReselection(String candidateId) {
        if (!inFlightUploads.isEmpty()) {
            Toast.makeText(this, "Wait for the active Cloud upload before re-selecting evidence", Toast.LENGTH_LONG).show();
            return;
        }
        if (!prefs.getString(PREF_PENDING_RESELECTION, "").isEmpty()) {
            Toast.makeText(this, "Another evidence reselection is already pending", Toast.LENGTH_LONG).show();
            return;
        }

        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            JSONObject item = findItem(queue, candidateId);
            if (
                    item == null ||
                    EvidenceBindingStore.get(this, candidateId) == null ||
                    !HANDOFF_DONE.equals(item.optString("handoffState", "")) ||
                    EVIDENCE_CONFIRMED.equals(item.optString("evidenceTransferState", ""))
            ) {
                Toast.makeText(this, "Evidence is not eligible for local reselection", Toast.LENGTH_LONG).show();
                return;
            }

            String source = safe(item.optString("source", ""));
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            if ("PHOTO".equals(source)) {
                intent.setType("image/*");
            } else if ("DOCUMENT".equals(source)) {
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                        "application/pdf",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.ms-excel",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "text/plain"
                });
            } else {
                Toast.makeText(this, "Only PHOTO/DOCUMENT evidence can be reselected", Toast.LENGTH_LONG).show();
                return;
            }
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            prefs.edit().putString(PREF_PENDING_RESELECTION, candidateId).apply();
            startActivityForResult(intent, REQ_RESELECT_EVIDENCE);
        } catch (Exception ignored) {
            prefs.edit().remove(PREF_PENDING_RESELECTION).apply();
            Toast.makeText(this, "Could not open the system evidence picker", Toast.LENGTH_LONG).show();
        }
    }

    private boolean canReadLocalEvidence(Uri uri) {
        if (uri == null || !"content".equals(uri.getScheme())) return false;
        try (InputStream input = getContentResolver().openInputStream(uri)) {
            return input != null;
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean takePersistableReadPermission(Uri uri, int returnedFlags) {
        if ((returnedFlags & Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION) == 0) return false;
        try {
            getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            return true;
        } catch (Exception ignored) {
            // Some providers grant only temporary read access. The next preflight will fail
            // closed into RESELECTION_REQUIRED if that access later disappears.
            return false;
        }
    }

    private void releaseExactPersistedReadPermission(Uri uri) {
        if (uri == null || !"content".equals(uri.getScheme())) return;
        try {
            for (android.content.UriPermission permission : getContentResolver().getPersistedUriPermissions()) {
                if (permission.isReadPermission() && uri.equals(permission.getUri())) {
                    getContentResolver().releasePersistableUriPermission(
                            uri,
                            Intent.FLAG_GRANT_READ_URI_PERMISSION
                    );
                    return;
                }
            }
        } catch (Exception ignored) {
            // Best-effort cleanup for a rejected/uncommitted reselection only.
        }
    }

    private void releaseRejectedReselectionGrantIfNew(String candidateId, Uri newUri) {
        if (newUri == null) return;
        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            JSONObject item = findItem(queue, candidateId);
            if (item != null && newUri.toString().equals(safe(item.optString("localReference", "")))) {
                // The candidate still legitimately references this exact URI. Do not revoke its grant.
                return;
            }
        } catch (Exception ignored) {
            // If local state cannot be read, fail closed by leaving the narrowly scoped grant alone.
            return;
        }
        releaseExactPersistedReadPermission(newUri);
    }

    private void releasePersistedReadPermissionIfUnused(
            JSONArray queue,
            String currentCandidateId,
            String oldReference
    ) {
        if (oldReference == null || !oldReference.startsWith("content://")) return;
        try {
            for (int i = 0; i < queue.length(); i++) {
                JSONObject other = queue.getJSONObject(i);
                String otherId = safe(other.optString("id", ""));
                if (currentCandidateId.equals(otherId)) continue;
                if (oldReference.equals(safe(other.optString("localReference", "")))) return;
            }

            releaseExactPersistedReadPermission(Uri.parse(oldReference));
        } catch (Exception ignored) {
            // Best-effort cleanup only. Never revoke unrelated grants or mutate Nexus/Cloud.
        }
    }

    private String displayName(Uri uri, String fallback) {
        try (Cursor cursor = getContentResolver().query(
                uri,
                new String[]{OpenableColumns.DISPLAY_NAME},
                null,
                null,
                null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0 && !cursor.isNull(index)) {
                    String value = safe(cursor.getString(index));
                    if (!value.isEmpty()) return value;
                }
            }
        } catch (Exception ignored) {
        }
        return fallback;
    }

    private void markEvidenceReselectionRequired(String candidateId) {
        setEvidenceState(candidateId, EVIDENCE_RESELECTION_REQUIRED);
    }

    private void markEvidenceRetryable(String candidateId) {
        setEvidenceState(candidateId, EVIDENCE_RETRY);
    }

    private void setEvidenceState(String candidateId, String state) {
        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            JSONObject item = findItem(queue, candidateId);
            if (item != null && !EVIDENCE_CONFIRMED.equals(item.optString("evidenceTransferState", ""))) {
                item.put("evidenceTransferState", state);
                prefs.edit().putString(PREF_QUEUE, queue.toString()).apply();
            }
        } catch (Exception ignored) {
        }
    }

    private JSONObject findItem(JSONArray queue, String candidateId) throws Exception {
        for (int i = 0; i < queue.length(); i++) {
            JSONObject item = queue.getJSONObject(i);
            if (candidateId.equals(safe(item.optString("id", "")))) return item;
        }
        return null;
    }

    private boolean isRawEvidenceSource(String source) {
        return "PHOTO".equals(source) || "DOCUMENT".equals(source);
    }

    private String configuredNexusOrigin() {
        String origin = BuildConfig.NEXUS_WEB_ORIGIN == null ? "" : BuildConfig.NEXUS_WEB_ORIGIN.trim();
        while (origin.endsWith("/")) origin = origin.substring(0, origin.length() - 1);
        if (!origin.matches("https://[^/?#]+(?:\\:[0-9]{1,5})?")) return "";
        return origin;
    }

    private void backToWorkMode() {
        if (!inFlightUploads.isEmpty()) {
            Toast.makeText(this, "Wait for the active Cloud upload before leaving this screen", Toast.LENGTH_LONG).show();
            return;
        }
        Intent main = new Intent(this, MainActivity.class);
        main.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(main);
        finish();
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String emptyDash(String value) {
        return value == null || value.isEmpty() ? "—" : value;
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
        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        setContentView(scroll);
    }

    private void addTitle(LinearLayout root, String value) {
        TextView title = new TextView(this);
        title.setText(value);
        title.setTextColor(TEXT);
        title.setTextSize(27);
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
        text.setPadding(0, dp(4), 0, dp(10));
        root.addView(text, fullWidthWrap());
    }

    private void addSection(LinearLayout root, String value) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextColor(CYAN);
        text.setTextSize(12);
        text.setTypeface(Typeface.DEFAULT_BOLD);
        text.setPadding(0, dp(12), 0, dp(8));
        root.addView(text, fullWidthWrap());
    }

    private void addAction(LinearLayout root, String value, Runnable action, boolean primary) {
        Button button = new Button(this);
        button.setText(value);
        button.setAllCaps(false);
        button.setTextColor(TEXT);
        button.setTextSize(14);
        button.setBackgroundColor(primary ? Color.rgb(20, 94, 150) : PANEL);
        button.setOnClickListener(v -> action.run());
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(54)
        );
        params.setMargins(0, dp(5), 0, dp(6));
        root.addView(button, params);
    }

    private LinearLayout.LayoutParams fullWidthWrap() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
