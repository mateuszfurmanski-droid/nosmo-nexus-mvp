package tech.nosmo.nexus.workmode;

import java.net.HttpURLConnection;

/**
 * Process-memory-only transport gate for protected Vercel staging previews.
 * No share URL, Vercel cookie or bypass credential is persisted in Android storage.
 */
final class NexusStagingVercelGate {
    private static volatile String origin = "";
    private static volatile String cookie = "";

    private NexusStagingVercelGate() {}

    static synchronized void set(String httpsOrigin, String cookieHeader) {
        if (!isAllowedOrigin(httpsOrigin) || cookieHeader == null || cookieHeader.trim().isEmpty()) {
            clear();
            return;
        }
        origin = trimSlash(httpsOrigin);
        cookie = cookieHeader.trim();
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
