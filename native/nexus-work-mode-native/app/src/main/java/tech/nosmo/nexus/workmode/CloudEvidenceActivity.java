package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

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

    private static final String HANDOFF_DONE = "HANDED_OFF";
    private static final String EVIDENCE_PENDING = "PENDING_CANONICAL_CLOUD_ENDPOINT";
    private static final String EVIDENCE_READY = "READY_FOR_AUTHORISED_TRANSFER";
    private static final String EVIDENCE_CONFIRMED = "TRANSFER_CONFIRMED";
    private static final String EVIDENCE_RETRY = "FAILED_RETRYABLE";

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

            inFlightUploads.add(candidateId);
            item.put("evidenceTransferState", EVIDENCE_READY);
            prefs.edit().putString(PREF_QUEUE, queue.toString()).apply();
            render();

            String idempotencyKey = "android-evidence-" + candidateId;
            NexusCloudUploadClient.upload(
                    getApplicationContext(),
                    origin,
                    token,
                    Uri.parse(localReference),
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

    private void markEvidenceRetryable(String candidateId) {
        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            JSONObject item = findItem(queue, candidateId);
            if (item != null && !EVIDENCE_CONFIRMED.equals(item.optString("evidenceTransferState", ""))) {
                item.put("evidenceTransferState", EVIDENCE_RETRY);
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
