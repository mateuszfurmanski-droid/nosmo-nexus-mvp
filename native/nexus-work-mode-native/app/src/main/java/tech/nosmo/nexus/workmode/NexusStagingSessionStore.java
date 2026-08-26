package tech.nosmo.nexus.workmode;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/** Writes only the opaque 64-hex Nexus session into the existing encrypted session slot. */
final class NexusStagingSessionStore {
    private static final String PREFS = "nexus_work_mode_v060";
    private static final String PREF_SESSION_CIPHERTEXT = "mobileSessionCiphertext";
    private static final String PREF_SESSION_IV = "mobileSessionIv";
    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "nosmo_nexus_mobile_session_v1";

    private NexusStagingSessionStore() {}

    static boolean save(Context context, String token) {
        if (token == null || !token.matches("[a-f0-9]{64}")) return false;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.US_ASCII));
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString(PREF_SESSION_CIPHERTEXT, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                    .putString(PREF_SESSION_IV, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                    .apply();
            return true;
        } catch (Exception ignored) {
            return false;
        }
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
}
