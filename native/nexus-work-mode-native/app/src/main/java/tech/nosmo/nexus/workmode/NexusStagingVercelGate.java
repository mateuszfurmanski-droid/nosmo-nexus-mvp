package tech.nosmo.nexus.workmode;

import java.net.HttpURLConnection;

/**
 * Process-memory-only transport gate for protected Vercel staging previews.
 *
 * A fresh Vercel share URL is consumed by an invisible WebView. The resulting
 * cookie is copied into process memory and attached to the native Core client.
 * No share URL or cookie is persisted in Android storage, BuildConfig or Nexus.
 */
final class NexusStagingVercelGate {
    private static volatile String origin = "";
    private static volatile String cookie = "";

    private NexusStagingVercelGate() {}

    static synchronized boolean set(String httpsOrigin, String cookieHeader) {
        String normalizedOrigin = trimSlash(httpsOrigin);
        String value = cookieHeader == null ? "" : cookieHeader.trim();
        if (!isAllowedOrigin(normalizedOrigin) || value.isEmpty() || value.length() > 8192) {
            clear();
            return false;
        }
        origin = normalizedOrigin;
        cookie = value;
        return true;
    }

    static synchronized void clear() {
        origin = "";
        cookie = "";
    }

    static boolean isReady() {
        return isAllowedOrigin(origin) && cookie != null && !cookie.isEmpty();
    }

    static String getOrigin() {
        return isReady() ? origin : "";
    }

    static void apply(HttpURLConnection connection, String requestOrigin) {
        if (connection == null || !isReady()) return;
        if (!origin.equals(trimSlash(requestOrigin))) return;
        connection.setRequestProperty("Cookie", cookie);
    }

    static boolean isAllowedOrigin(String value) {
        if (value == null) return false;
        String normalized = trimSlash(value);
        return normalized.matches("https://nosmo-nexus-cloud-staging-[A-Za-z0-9-]+\\.vercel\\.app");
    }

    private static String trimSlash(String value) {
        String result = value == null ? "" : value.trim();
        while (result.endsWith("/")) result = result.substring(0, result.length() - 1);
        return result;
    }
}
