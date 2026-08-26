package tech.nosmo.nexus.workmode;

import android.content.Context;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** NON_PRODUCTION physical-device login client for one-time staging claims. */
final class NexusStagingDeviceLoginClient {
    interface Callback {
        void onComplete(boolean success, int status, String message);
    }

    private NexusStagingDeviceLoginClient() {}

    static void login(Context context, String claimCode, Callback callback) {
        String origin = NexusStagingVercelGate.getOrigin();
        if (origin.isEmpty()) {
            callback.onComplete(false, 0, "Open the Vercel staging gate first");
            return;
        }
        if (claimCode == null || claimCode.length() < 32 || claimCode.length() > 200) {
            callback.onComplete(false, 0, "Enter a valid one-time staging claim code");
            return;
        }

        final String transientCode = claimCode;
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(origin + "/api/nexus/core/staging-device-login").openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(25_000);
                connection.setInstanceFollowRedirects(false);
                connection.setDoOutput(true);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                NexusStagingVercelGate.apply(connection, origin);

                JSONObject body = new JSONObject();
                body.put("claimCode", transientCode);
                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(payload.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }

                int status = connection.getResponseCode();
                String response = readBounded(
                        status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream(),
                        64 * 1024
                );

                if (status == 302 || status == 401 || status == 403 && response.isEmpty()) {
                    callback.onComplete(false, status, "Vercel staging gate is not active");
                    return;
                }

                JSONObject json = response.isEmpty() ? null : new JSONObject(response);
                if (status != 201 || json == null) {
                    String message = json != null
                            ? json.optString("message", json.optString("error", "Staging device login rejected"))
                            : "Staging device login rejected (HTTP " + status + ")";
                    callback.onComplete(false, status, message);
                    return;
                }

                if (!"STAGING_DEVICE_CLAIM".equals(json.optString("authentication", ""))) {
                    callback.onComplete(false, status, "Unexpected staging authentication response");
                    return;
                }
                String token = json.optString("token", "");
                if (!NexusStagingSessionStore.save(context, token)) {
                    callback.onComplete(false, status, "Could not store encrypted Nexus session");
                    return;
                }
                callback.onComplete(true, status, "Staging device session ACTIVE · " + json.optString("displayName", "canonical Person"));
            } catch (Exception ignored) {
                callback.onComplete(false, 0, "Staging device login API is unavailable");
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "nexus-staging-device-login").start();
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
