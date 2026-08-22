package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Browser -> native acknowledgement receiver for Android Work Mode.
 *
 * This callback changes device-local queue state only. It is not an authentication,
 * Person-binding, Project Participation or WorkSuite authority source. Server authority
 * remains entirely inside Nexus. A callback must match the locally generated one-flight
 * handoffRequestId plus the exact pending candidate set and Project World.
 *
 * Metadata handoff and raw evidence transfer are deliberately separate lifecycles.
 * This callback can acknowledge metadata only. It never marks a PHOTO/DOCUMENT binary
 * as uploaded, synced or TRANSFER_CONFIRMED.
 */
public final class HandoffResultActivity extends Activity {
    private static final String PREFS = "nexus_work_mode_v060";
    private static final String PREF_QUEUE = "approvalQueue";
    private static final String PREF_PROJECT_ID = "projectId";
    private static final String PREF_WORLD_ID = "worldId";
    private static final String PREF_PENDING_HANDOFF_REQUEST_ID = "pendingHandoffRequestId";
    private static final String PREF_LAST_RECEIPT_ID = "lastHandoffReceiptId";
    private static final String PREF_LAST_RECEIPT_AT = "lastHandoffReceiptAt";

    private static final String CALLBACK_SCHEME = "nosmo-nexus-workmode";
    private static final String CALLBACK_HOST = "handoff-result";
    private static final String STATUS_HANDED_OFF = "HANDED_OFF";
    private static final String STATUS_FAILED_RETRYABLE = "FAILED_RETRYABLE";
    private static final String PENDING = "PENDING_SERVER_CONFIRMATION";

    private static final String EVIDENCE_STATE_KEY = "evidenceTransferState";
    private static final String EVIDENCE_PENDING_CLOUD = "PENDING_CANONICAL_CLOUD_ENDPOINT";
    private static final String EVIDENCE_NOT_APPLICABLE = "NOT_APPLICABLE";
    private static final String HANDOFF_PROJECT_KEY = "handoffProjectId";
    private static final String HANDOFF_WORLD_KEY = "handoffWorldId";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        processCallback(getIntent());
        finish();
    }

    private void processCallback(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || data == null) {
            returnToWorkMode("Invalid Nexus handoff callback", true);
            return;
        }

        if (!CALLBACK_SCHEME.equals(data.getScheme()) || !CALLBACK_HOST.equals(data.getHost())) {
            returnToWorkMode("Ignored unrecognised handoff callback", true);
            return;
        }

        String status = safe(data.getQueryParameter("status"));
        String handoffRequestId = safe(data.getQueryParameter("handoffRequestId"));
        String receiptId = safe(data.getQueryParameter("receiptId"));
        String projectId = safe(data.getQueryParameter("projectId"));
        String worldId = safe(data.getQueryParameter("worldId"));
        Set<String> selectedItemIds = parseItemIds(data.getQueryParameter("selectedItemIds"));

        if (!STATUS_HANDED_OFF.equals(status) && !STATUS_FAILED_RETRYABLE.equals(status)) {
            returnToWorkMode("Ignored invalid handoff status", true);
            return;
        }
        if (!isRequestId(handoffRequestId)) {
            returnToWorkMode("Ignored callback without a valid handoff request", true);
            return;
        }
        if (STATUS_HANDED_OFF.equals(status) && !isReceiptId(receiptId)) {
            returnToWorkMode("Ignored handoff without a valid server receipt", true);
            return;
        }
        if (!receiptId.isEmpty() && !isReceiptId(receiptId)) {
            returnToWorkMode("Ignored invalid handoff receipt", true);
            return;
        }
        if (projectId.isEmpty() || worldId.isEmpty() || selectedItemIds.isEmpty()) {
            returnToWorkMode("Ignored incomplete handoff receipt", true);
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String expectedRequestId = prefs.getString(PREF_PENDING_HANDOFF_REQUEST_ID, "");
        if (!handoffRequestId.equals(expectedRequestId)) {
            returnToWorkMode("Ignored stale or unsolicited handoff callback", true);
            return;
        }

        String currentProjectId = prefs.getString(PREF_PROJECT_ID, "");
        String currentWorldId = prefs.getString(PREF_WORLD_ID, "");
        if (!projectId.equals(currentProjectId) || !worldId.equals(currentWorldId)) {
            returnToWorkMode("Project World changed — receipt was not applied", true);
            return;
        }

        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            String targetState = STATUS_HANDED_OFF.equals(status)
                    ? STATUS_HANDED_OFF
                    : STATUS_FAILED_RETRYABLE;

            Set<String> pendingIds = new LinkedHashSet<>();
            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.getJSONObject(i);
                if (PENDING.equals(item.optString("handoffState", "LOCAL_ONLY"))) {
                    pendingIds.add(safe(item.optString("id", "")));
                }
            }

            if (!pendingIds.equals(selectedItemIds)) {
                returnToWorkMode("Receipt item set does not match the exact pending batch", true);
                return;
            }

            int rawEvidenceItems = 0;
            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.getJSONObject(i);
                String id = safe(item.optString("id", ""));
                if (selectedItemIds.contains(id) && PENDING.equals(item.optString("handoffState", "LOCAL_ONLY"))) {
                    item.put("handoffState", targetState);

                    String source = safe(item.optString("source", ""));
                    if (isRawEvidenceSource(source)) {
                        rawEvidenceItems++;
                        if (STATUS_HANDED_OFF.equals(status)) {
                            // Bind evidence to the exact Project World confirmed by the server receipt.
                            // Later global Project World changes must not retarget these bytes.
                            item.put(HANDOFF_PROJECT_KEY, projectId);
                            item.put(HANDOFF_WORLD_KEY, worldId);
                        }
                        if (safe(item.optString(EVIDENCE_STATE_KEY, "")).isEmpty()) {
                            item.put(EVIDENCE_STATE_KEY, EVIDENCE_PENDING_CLOUD);
                        }
                    } else if (safe(item.optString(EVIDENCE_STATE_KEY, "")).isEmpty()) {
                        item.put(EVIDENCE_STATE_KEY, EVIDENCE_NOT_APPLICABLE);
                    }
                }
            }

            SharedPreferences.Editor editor = prefs.edit()
                    .putString(PREF_QUEUE, queue.toString())
                    .remove(PREF_PENDING_HANDOFF_REQUEST_ID);
            if (!receiptId.isEmpty()) {
                editor.putString(PREF_LAST_RECEIPT_ID, receiptId)
                        .putLong(PREF_LAST_RECEIPT_AT, System.currentTimeMillis());
            }
            editor.apply();

            if (STATUS_HANDED_OFF.equals(status) && rawEvidenceItems > 0) {
                openCloudEvidence("Nexus confirmed metadata; raw evidence still requires Cloud commit");
                return;
            }

            returnToWorkMode(
                    STATUS_HANDED_OFF.equals(status)
                            ? "Nexus confirmed metadata handoff"
                            : "Handoff needs retry or authority review",
                    false
            );
        } catch (Exception ignored) {
            returnToWorkMode("Could not apply Nexus handoff receipt", true);
        }
    }

    private boolean isRawEvidenceSource(String source) {
        return "PHOTO".equals(source) || "DOCUMENT".equals(source);
    }

    private Set<String> parseItemIds(String csv) {
        Set<String> ids = new LinkedHashSet<>();
        if (csv == null || csv.trim().isEmpty()) return ids;

        String[] values = csv.split(",");
        if (values.length > 20) return new LinkedHashSet<>();
        for (String raw : values) {
            String value = safe(raw);
            if (!isRequestId(value)) return new LinkedHashSet<>();
            ids.add(value);
        }
        return ids.size() == values.length ? ids : new LinkedHashSet<>();
    }

    private boolean isRequestId(String value) {
        return value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    }

    private boolean isReceiptId(String value) {
        return value.matches("[0-9a-f]{32}");
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private void openCloudEvidence(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        Intent cloud = new Intent(this, CloudEvidenceActivity.class);
        cloud.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(cloud);
    }

    private void returnToWorkMode(String message, boolean longToast) {
        Toast.makeText(
                this,
                message,
                longToast ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT
        ).show();
        Intent main = new Intent(this, MainActivity.class);
        main.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(main);
    }
}
