package tech.nosmo.nexus.workmode;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class NexusMobileSession {
    interface ExchangeCallback {
        void onComplete(boolean success, String message);
    }

    private static final String PREFS = "nexus_work_mode_v060";
    private static final String PREF_AUTH_VERIFIER = "mobileAuthPkceVerifier";
    private static final String PREF_AUTH_STATE = "mobileAuthState";
    private static final String PREF_AUTH_NONCE = "mobileAuthNonce";
    private static final String PREF_AUTH_STARTED_AT = "mobileAuthStartedAt";
    private static final String PREF_SESSION_CIPHERTEXT = "mobileSessionCiphertext";
    private static final String PREF_SESSION_IV = "mobileSessionIv";

    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "nosmo_nexus_mobile_session_v1";
    private static final long AUTH_TTL_MS = 10L * 60L * 1000L;
    private static final SecureRandom RANDOM = new SecureRandom();

    private NexusMobileSession() {}

    static String beginAuthorization(Context context, String origin) throws Exception {
        requireHttpsOrigin(origin);
        String verifier = randomBase64Url(32);
        String challenge = base64Url(sha256(verifier.getBytes(StandardCharsets.US_ASCII)));
        String state = randomBase64Url(32);
        String nonce = randomBase64Url(32);

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(PREF_AUTH_VERIFIER, verifier)
                .putString(PREF_AUTH_STATE, state)
                .putString(PREF_AUTH_NONCE, nonce)
                .putLong(PREF_AUTH_STARTED_AT, System.currentTimeMillis())
                .apply();

        return Uri.parse(origin + "/api/mobile-auth/start").buildUpon()
                .appendQueryParameter("code_challenge", challenge)
                .appendQueryParameter("state", state)
                .appendQueryParameter("nonce", nonce)
                .build()
                .toString();
    }

    static boolean hasSession(Context context) {
        return getSessionToken(context) != null;
    }

    static String getSessionToken(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String ciphertext = prefs.getString(PREF_SESSION_CIPHERTEXT, "");
        String iv = prefs.getString(PREF_SESSION_IV, "");
        if (ciphertext.isEmpty() || iv.isEmpty()) return null;

        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    getOrCreateKey(),
                    new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP))
            );
            byte[] clear = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP));
            String token = new String(clear, StandardCharsets.US_ASCII);
            return isSessionToken(token) ? token : null;
        } catch (Exception ignored) {
            clearSession(context);
            return null;
        }
    }

    static void clearSession(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .remove(PREF_SESSION_CIPHERTEXT)
                .remove(PREF_SESSION_IV)
                .apply();
    }

    static void clearPendingAuthorization(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .remove(PREF_AUTH_VERIFIER)
                .remove(PREF_AUTH_STATE)
                .remove(PREF_AUTH_NONCE)
                .remove(PREF_AUTH_STARTED_AT)
                .apply();
    }

    static boolean callbackMatchesPendingState(Context context, String state) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String expected = prefs.getString(PREF_AUTH_STATE, "");
        long startedAt = prefs.getLong(PREF_AUTH_STARTED_AT, 0L);
        return !expected.isEmpty()
                && expected.equals(state)
                && startedAt > 0L
                && System.currentTimeMillis() - startedAt <= AUTH_TTL_MS;
    }

    static void exchangeAuthorizationCode(
            Context context,
            String origin,
            String code,
            String state,
            ExchangeCallback callback
    ) {
        new Thread(() -> {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String verifier = prefs.getString(PREF_AUTH_VERIFIER, "");
            String nonce = prefs.getString(PREF_AUTH_NONCE, "");
            long startedAt = prefs.getLong(PREF_AUTH_STARTED_AT, 0L);

            if (
                    verifier.isEmpty() ||
                    nonce.isEmpty() ||
                    !callbackMatchesPendingState(context, state) ||
                    startedAt <= 0L
            ) {
                clearPendingAuthorization(context);
                callback.onComplete(false, "Mobile auth state expired or did not match");
                return;
            }

            HttpURLConnection connection = null;
            try {
                requireHttpsOrigin(origin);
                URL url = new URL(origin + "/api/mobile-auth/token-exchange");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(25_000);
                connection.setInstanceFollowRedirects(false);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Accept", "application/json");

                JSONObject body = new JSONObject();
                body.put("code", code);
                body.put("code_verifier", verifier);
                body.put("redirect_uri", origin + "/api/callback");
                body.put("state", state);
                body.put("nonce", nonce);

                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(payload.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }

                int status = connection.getResponseCode();
                String response = readBounded(
                        status >= 200 && status < 400
                                ? connection.getInputStream()
                                : connection.getErrorStream(),
                        64 * 1024
                );

                if (status != 200) {
                    clearPendingAuthorization(context);
                    callback.onComplete(false, "Nexus mobile token exchange failed (HTTP " + status + ")");
                    return;
                }

                String token = new JSONObject(response).optString("token", "");
                if (!isSessionToken(token)) {
                    clearPendingAuthorization(context);
                    callback.onComplete(false, "Nexus returned an invalid mobile session");
                    return;
                }

                storeSessionToken(context, token);
                clearPendingAuthorization(context);
                callback.onComplete(true, "Nexus mobile session established");
            } catch (Exception ignored) {
                clearPendingAuthorization(context);
                callback.onComplete(false, "Could not establish Nexus mobile session");
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "nexus-mobile-token-exchange").start();
    }

    private static void storeSessionToken(Context context, String token) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.US_ASCII));
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(PREF_SESSION_CIPHERTEXT, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .putString(PREF_SESSION_IV, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                .apply();
    }

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
        keyStore.load(null);
        KeyStore.Entry existing = keyStore.getEntry(KEY_ALIAS, null);
        if (existing instanceof KeyStore.SecretKeyEntry) {
            return ((KeyStore.SecretKeyEntry) existing).getSecretKey();
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }

    private static boolean isSessionToken(String token) {
        return token != null && token.matches("[a-f0-9]{64}");
    }

    private static String randomBase64Url(int bytes) {
        byte[] value = new byte[bytes];
        RANDOM.nextBytes(value);
        return base64Url(value);
    }

    private static byte[] sha256(byte[] value) throws Exception {
        return MessageDigest.getInstance("SHA-256").digest(value);
    }

    private static String base64Url(byte[] value) {
        return Base64.encodeToString(value, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private static void requireHttpsOrigin(String origin) {
        if (origin == null || !origin.matches("https://[^/?#]+(?:\\:[0-9]{1,5})?")) {
            throw new IllegalArgumentException("HTTPS Nexus origin required");
        }
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
