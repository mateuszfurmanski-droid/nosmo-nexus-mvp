package tech.nosmo.nexus.workmode;

import java.net.HttpURLConnection;

/**
 * Process-memory-only transport gate for protected Vercel staging previews.
 *
 * Uses Vercel's official automation bypass request headers. The bypass secret is
 * supplied by the tester at runtime and is never persisted in Android storage,
 * BuildConfig, logs, GitHub or Nexus data.
 */
final class NexusStagingVercelGate {
    private static volatile String origin = "";
    private static volatile String bypassSecret = "";

    private NexusStagingVercelGate() {}

    static synchronized boolean set(String httpsOrigin, String transientBypassSecret) {
        String normalizedOrigin = trimSlash(httpsOrigin);
        String secret = transientBypassSecret == null ? "" : transientBypassSecret.trim();
        if (!isAllowedOrigin(normalizedOrigin) || secret.length() < 16 || secret.length() > 512) {
            clear();
            return false;
        }
        origin = normalizedOrigin;
        bypassSecret = secret;
        return true;
    }

    static synchronized void clear() {
        origin = "";
        bypassSecret = "";
    }

    static boolean isReady() {
        return isAllowedOrigin(origin) && bypassSecret != null && !bypassSecret.isEmpty();
    }

    static String getOrigin() {
        return isReady() ? origin : "";
    }

    static void apply(HttpURLConnection connection, String requestOrigin) {
        if (connection == null || !isReady()) return;
        if (!origin.equals(trimSlash(requestOrigin))) return;
        connection.setRequestProperty("x-vercel-protection-bypass", bypassSecret);
        connection.setRequestProperty("x-vercel-set-bypass-cookie", "true");
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
