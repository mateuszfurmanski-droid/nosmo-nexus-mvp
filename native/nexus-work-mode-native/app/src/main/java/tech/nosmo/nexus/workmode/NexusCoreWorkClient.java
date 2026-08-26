package tech.nosmo.nexus.workmode;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Thin native client for the canonical Nexus Core Work Package API.
 * Authority remains server-side and actor identity comes only from the existing Nexus session.
 */
final class NexusCoreWorkClient {
    static final String PROJECT_ID = "project-esafe-catania";
    static final String WORLD_ID = "world-esafe-catania";

    interface Callback {
        void onComplete(boolean success, int status, String message, JSONObject payload);
    }

    private NexusCoreWorkClient() {}

    static void loadInbox(Context context, String origin, Callback callback) {
        String query = "?projectId=" + encode(PROJECT_ID) + "&worldId=" + encode(WORLD_ID);
        request(context, origin, "GET", "/api/nexus/core/work-inbox" + query, null, callback);
    }

    static void startTask(Context context, String origin, String taskId, Callback callback) {
        request(context, origin, "POST", "/api/nexus/core/tasks/" + encodePath(taskId) + "/start", baseMutationBody(), callback);
    }

    static void addEvidence(Context context, String origin, String taskId, Callback callback) {
        JSONObject body = baseMutationBody();
        try {
            body.put("evidenceType", "inspection-answer");
            body.put("title", "Android Work Mode execution evidence");
            body.put("answerText", "Worker confirmed the current Work Package evidence step from Android Work Mode.");
        } catch (Exception ignored) {
            callback.onComplete(false, 0, "Could not build Evidence request", null);
            return;
        }
        request(context, origin, "POST", "/api/nexus/core/tasks/" + encodePath(taskId) + "/evidence", body, callback);
    }

    static void finishTask(Context context, String origin, String taskId, JSONArray completedChecklistItemIds, Callback callback) {
        JSONObject body = baseMutationBody();
        try {
            body.put("completedChecklistItemIds", completedChecklistItemIds == null ? new JSONArray() : completedChecklistItemIds);
        } catch (Exception ignored) {
            callback.onComplete(false, 0, "Could not build Finish request", null);
            return;
        }
        request(context, origin, "POST", "/api/nexus/core/tasks/" + encodePath(taskId) + "/finish", body, callback);
    }

    private static JSONObject baseMutationBody() {
        JSONObject body = new JSONObject();
        try {
            body.put("requestId", UUID.randomUUID().toString());
            body.put("requestedAt", java.time.Instant.now().toString());
            body.put("projectId", PROJECT_ID);
            body.put("worldId", WORLD_ID);
        } catch (Exception ignored) {}
        return body;
    }

    private static void request(Context context, String origin, String method, String path, JSONObject body, Callback callback) {
        String token = NexusMobileSession.getSessionToken(context);
        if (token == null) {
            callback.onComplete(false, 401, "No Nexus mobile session. Sign in first.", null);
            return;
        }
        if (!isHttpsOrigin(origin)) {
            callback.onComplete(false, 0, "Nexus HTTPS origin is not configured.", null);
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(origin + path).openConnection();
                connection.setRequestMethod(method);
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(25_000);
                connection.setInstanceFollowRedirects(false);
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Accept", "application/json");
                NexusStagingVercelGate.apply(connection, origin);
                if (body != null) {
                    byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    connection.setFixedLengthStreamingMode(bytes.length);
                    try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
                }
                int status = connection.getResponseCode();
                String response = readBounded(status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream(), 256 * 1024);
                JSONObject payload = response.isEmpty() ? null : new JSONObject(response);
                boolean success = status >= 200 && status < 300;
                String message = success ? "Canonical Nexus operation confirmed" : payload != null ? payload.optString("message", payload.optString("error", "Nexus rejected the operation")) : "Nexus rejected the operation (HTTP " + status + ")";
                callback.onComplete(success, status, message, payload);
            } catch (Exception ignored) {
                callback.onComplete(false, 0, "Canonical Nexus Core API is unavailable", null);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "nexus-core-work-client").start();
    }

    private static boolean isHttpsOrigin(String origin) {
        return origin != null && origin.matches("https://[^/?#]+(?:\\:[0-9]{1,5})?");
    }

    private static String encode(String value) {
        try { return URLEncoder.encode(value, StandardCharsets.UTF_8.name()); } catch (Exception ignored) { return ""; }
    }

    private static String encodePath(String value) {
        return value != null && value.matches("[A-Za-z0-9._:-]{1,180}") ? value : "invalid";
    }

    private static String readBounded(InputStream input, int maxBytes) throws Exception {
        if (input == null) return "";
        StringBuilder value = new StringBuilder();
        int total = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            char[] buffer = new char[2048];
            int read;
            while ((read = reader.read(buffer)) != -1) {
                total += read;
                if (total > maxBytes) throw new IllegalStateException("Response too large");
                value.append(buffer, 0, read);
            }
        }
        return value.toString();
    }
}
