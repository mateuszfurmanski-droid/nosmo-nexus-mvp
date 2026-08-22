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
 * remains entirely inside Nexus. A success callback requires a server-generated receipt
 * and can only update candidates that are already PENDING_SERVER_CONFIRMATION.
 */
public final class HandoffResultActivity extends Activity {
    private static final String PREFS = "nexus_work_mode_v060";
    private static final String PREF_QUEUE = "approvalQueue";
    private static final String PREF_PROJECT_ID = "projectId";
    private static final String PREF_WORLD_ID = "worldId";
    private static final String PREF_LAST_RECEIPT_ID = "lastHandoffReceiptId";
    private static final String PREF_LAST_RECEIPT_AT = "lastHandoffReceiptAt";

    private static final String CALLBACK_SCHEME = "nosmo-nexus-workmode";
    private static final String CALLBACK_HOST = "handoff-result";
    private static final String STATUS_HANDED_OFF = "HANDED_OFF";
    private static final String STATUS_FAILED_RETRYABLE = "FAILED_RETRYABLE";
    private static final String PENDING = "PENDING_SERVER_CONFIRMATION";

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
        String receiptId = safe(data.getQueryParameter("receiptId"));
        String projectId = safe(data.getQueryParameter("projectId"));
        String worldId = safe(data.getQueryParameter("worldId"));
        Set<String> selectedItemIds = parseItemIds(data.getQueryParameter("selectedItemIds"));

        if (!STATUS_HANDED_OFF.equals(status) && !STATUS_FAILED_RETRYABLE.equals(status)) {
            returnToWorkMode("Ignored invalid handoff status", true);
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

            Set<String> matched = new LinkedHashSet<>();
            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.getJSONObject(i);
                String id = safe(item.optString("id", ""));
                if (!selectedItemIds.contains(id)) continue;

                String currentState = safe(item.optString("handoffState", "LOCAL_ONLY"));
                boolean compatible = PENDING.equals(currentState) || targetState.equals(currentState);
                if (!compatible) {
                    returnToWorkMode("Receipt does not match the pending local queue", true);
                    return;
                }
                matched.add(id);
            }

            if (!matched.equals(selectedItemIds)) {
                returnToWorkMode("Receipt item set does not match the pending local queue", true);
                return;
            }

            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.getJSONObject(i);
                String id = safe(item.optString("id", ""));
                if (!selectedItemIds.contains(id)) continue;
                if (PENDING.equals(item.optString("handoffState", "LOCAL_ONLY"))) {
                    item.put("handoffState", targetState);
                }
            }

            SharedPreferences.Editor editor = prefs.edit().putString(PREF_QUEUE, queue.toString());
            if (!receiptId.isEmpty()) {
                editor.putString(PREF_LAST_RECEIPT_ID, receiptId)
                        .putLong(PREF_LAST_RECEIPT_AT, System.currentTimeMillis());
            }
            editor.apply();

            returnToWorkMode(
                    STATUS_HANDED_OFF.equals(status)
                            ? "Nexus confirmed handoff"
                            : "Handoff needs retry or authority review",
                    false
            );
        } catch (Exception ignored) {
            returnToWorkMode("Could not apply Nexus handoff receipt", true);
        }
    }

    private Set<String> parseItemIds(String csv) {
        Set<String> ids = new LinkedHashSet<>();
        if (csv == null || csv.trim().isEmpty()) return ids;

        String[] values = csv.split(",");
        if (values.length > 20) return new LinkedHashSet<>();
        for (String raw : values) {
            String value = safe(raw);
            if (!value.matches("[0-9a-fA-F-]{36}")) return new LinkedHashSet<>();
            ids.add(value);
        }
        return ids.size() == values.length ? ids : new LinkedHashSet<>();
    }

    private boolean isReceiptId(String value) {
        return value.matches("[0-9a-f]{32}");
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
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
