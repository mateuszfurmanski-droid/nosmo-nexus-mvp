package tech.nosmo.nexus.workmode;

import android.net.Uri;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Contract for the Google Drive-backed NEXUS Personal Cloud pilot.
 *
 * This class intentionally contains no Google Drive SDK dependency. Android Work Mode writes through
 * Storage Access Framework for the current pilot, while future Google Drive OAuth/API and OneDrive
 * providers can emit the same index records into the shared Nexus Cloud Data Layer.
 */
final class PersonalCloudIndexContract {
    static final String VERSION = "work-mode-personal-cloud-index-v1";
    static final String PHYSICAL_PROVIDER_GOOGLE_DRIVE = "google-drive";
    static final String PRIMARY_PROJECT = "e-SAFE Project World";
    static final String PRIMARY_WORLD_ID = "esafe-demo";
    static final String PROJECT_GRAPH_LINK_PENDING = "PENDING_USER_APPROVAL";

    static final String ROOT_FOLDER = "00_NEXUS_PERSONAL_CLOUD";
    static final String INBOX_FOLDER = "00_INBOX_FROM_ANDROID_WORK_MODE";
    static final String ESAFE_FOLDER = "01_ESAFE_PROJECT_WORLD";
    static final String UNCLEAR_PHOTOS_FOLDER = "02_REVIEW_UNCLEAR_PHOTOS";
    static final String OTHER_PROJECTS_FOLDER = "03_OTHER_PROJECT_CANDIDATES";
    static final String CONTACTS_CALENDAR_FOLDER = "04_CONTACTS_CALENDAR_REVIEW";
    static final String PRIVATE_FOLDER = "05_PRIVATE_DO_NOT_UPLOAD";
    static final String AUDIT_FOLDER = "90_AUDIT_PROVENANCE";

    static final String ESAFE_ACCEPTED_FOLDER = "00_ACCEPTED_TO_PERSONAL_CLOUD";
    static final String ESAFE_PENDING_GRAPH_FOLDER = "01_PENDING_PROJECT_GRAPH_LINK";
    static final String ESAFE_PHOTOS_FOLDER = "02_PHOTOS_SITE_EVIDENCE";
    static final String ESAFE_DOCUMENTS_FOLDER = "03_DOCUMENTS_PDF_OFFICE";
    static final String ESAFE_BIM_FOLDER = "04_DRAWINGS_BIM_IFC";
    static final String ESAFE_REJECTED_FOLDER = "05_REJECTED_OR_NOT_ESAFE";

    static final String INDEX_FILENAME = "nexus-personal-cloud-index.jsonl";

    private PersonalCloudIndexContract() { }

    static String destinationPathForRoute(String route) {
        if (route == null) return INBOX_FOLDER;
        if (route.equals("ESAFE_PHOTOS_SITE_EVIDENCE")) return ESAFE_FOLDER + "/" + ESAFE_PHOTOS_FOLDER;
        if (route.equals("ESAFE_DOCUMENTS_PDF_OFFICE")) return ESAFE_FOLDER + "/" + ESAFE_DOCUMENTS_FOLDER;
        if (route.equals("ESAFE_DRAWINGS_BIM_IFC")) return ESAFE_FOLDER + "/" + ESAFE_BIM_FOLDER;
        if (route.equals("REVIEW_UNCLEAR_PHOTOS")) return UNCLEAR_PHOTOS_FOLDER;
        if (route.equals("OTHER_PROJECT_CANDIDATE")) return OTHER_PROJECTS_FOLDER;
        if (route.equals("CONTACTS_CALENDAR_REVIEW")) return CONTACTS_CALENDAR_FOLDER;
        if (route.equals("PRIVATE_DO_NOT_UPLOAD")) return PRIVATE_FOLDER;
        return INBOX_FOLDER;
    }

    static String indexRecordJsonl(
            String copiedAt,
            String category,
            String title,
            String mime,
            int confidence,
            String route,
            String inferredProject,
            String sourceUri,
            String targetUri,
            String destinationPath) {
        return "{"
                + jsonPair("schema", VERSION) + ","
                + jsonPair("source", "android-work-mode") + ","
                + jsonPair("physicalCloudProvider", PHYSICAL_PROVIDER_GOOGLE_DRIVE) + ","
                + jsonPair("primaryWorldId", PRIMARY_WORLD_ID) + ","
                + jsonPair("primaryProject", PRIMARY_PROJECT) + ","
                + jsonPair("copiedAt", copiedAt) + ","
                + jsonPair("category", category) + ","
                + jsonPair("title", title) + ","
                + jsonPair("mime", mime) + ","
                + "\"confidence\":" + confidence + ","
                + jsonPair("route", route) + ","
                + jsonPair("inferredProject", inferredProject) + ","
                + jsonPair("sourceUri", sourceUri) + ","
                + jsonPair("targetUri", targetUri) + ","
                + jsonPair("destinationPath", destinationPath) + ","
                + jsonPair("projectGraphLinkStatus", PROJECT_GRAPH_LINK_PENDING) + ","
                + "\"originalDeleted\":false"
                + "}\n";
    }

    static byte[] asUtf8Bytes(String value) {
        return value == null ? new byte[0] : value.getBytes(StandardCharsets.UTF_8);
    }

    static String safeJsonValue(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", " ")
                .replace("\n", " ")
                .trim();
    }

    static String safeIndexFileName(String value) {
        String raw = value == null || value.trim().isEmpty() ? "nexus-item" : value.trim();
        String cleaned = raw.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9._-]+", "-");
        if (cleaned.length() > 96) return cleaned.substring(0, 96);
        return cleaned.isEmpty() ? "nexus-item" : cleaned;
    }

    static String sourceKey(String sourceUri) {
        String normalized = sourceUri == null ? "" : sourceUri.trim();
        if (normalized.isEmpty()) return "no-source-uri";
        return Uri.encode(normalized);
    }

    private static String jsonPair(String key, String value) {
        return "\"" + safeJsonValue(key) + "\":\"" + safeJsonValue(value) + "\"";
    }
}
