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

/** One-time canonical Person claim. Claim codes are never persisted on the device. */
final class NexusIdentityClaimClient {
    interface Callback {
        void onComplete(boolean success, int httpStatus, String message);
    }

    private NexusIdentityClaimClient() {}

    static void claim(Context context, String origin, String claimCode, Callback callback) {
        String token = NexusMobileSession.getSessionToken(context);
        if (token == null) {
            callback.onComplete(false, 401, "Sign in to Nexus before claiming this device identity");
            return;
        }
        if (claimCode == null || claimCode.trim().length() < 32 || claimCode.trim().length() > 200) {
            callback.onComplete(false, 400, "Enter the one-time Nexus identity claim code");
            return;
        }

        final String transientClaim = claimCode.trim();
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                requireHttpsOrigin(origin);
                connection = (HttpURLConnection) new URL(origin + "/api/nexus/core/identity/claim").openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(25_000);
                connection.setInstanceFollowRedirects(false);
                connection.setDoOutput(true);
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Accept", "application/json");

                byte[] payload = new JSONObject().put("claimCode", transientClaim)
                        .toString()
                        .getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(payload.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }

                int status = connection.getResponseCode();
                String response = readBounded(
                        status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream(),
                        64 * 1024
                );
                JSONObject body = response.isEmpty() ? new JSONObject() : new JSONObject(response);
                if (status == 201 && body.optBoolean("bound", false)) {
                    callback.onComplete(true, status, "Canonical Nexus Person connected");
                } else {
                    String message = body.optString("message", "Identity claim was not accepted");
                    callback.onComplete(false, status, message + " (HTTP " + status + ")");
                }
            } catch (Exception ignored) {
                callback.onComplete(false, 0, "Could not reach Nexus identity service");
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "nexus-identity-claim").start();
    }

    private static void requireHttpsOrigin(String origin) {
        if (origin == null || !origin.matches("https://[^/?#]+(?:\\:[0-9]{1,5})?")) {
            throw new IllegalArgumentException("HTTPS Nexus origin required");
        }
    }

    private static String readBounded(InputStream input, int maxChars) throws Exception {
        if (input == null) return "";
        StringBuilder value = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            char[] buffer = new char[2048];
            int read;
            while ((read = reader.read(buffer)) != -1) {
                if (value.length() + read > maxChars) throw new IllegalStateException("Response too large");
                value.append(buffer, 0, read);
            }
        }
        return value.toString();
    }
}
