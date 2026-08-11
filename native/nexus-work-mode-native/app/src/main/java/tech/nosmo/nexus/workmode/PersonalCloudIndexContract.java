package tech.nosmo.nexus.workmode;

import android.net.Uri;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Contract for the Google Drive-backed NEXUS Cloud / Personal Cloud pilot.
 *
 * The Drive structure is project-boundary first: files must resolve projectId/worldId before
 * routing by trade or type. Relationship Tree is a projection and must not be the file source
 * of truth. Android Work Mode currently writes through Storage Access Framework; future Drive
 * OAuth/API and OneDrive providers must emit the same index shape.
 */
final class PersonalCloudIndexContract {
    static final String VERSION = "work-mode-personal-cloud-index-v2";
    static final String PHYSICAL_PROVIDER_GOOGLE_DRIVE = "google-drive";
    static final String PROJECT_GRAPH_LINK_PENDING = "PENDING_USER_APPROVAL";

    static final String CLOUD_ROOT_ID = "1n2E0dlb0W-5Qt2V7q5hjIGdX9T9c8Cs0";
    static final String PROJECT_WORLDS_ROOT_ID = "1gCa35DoMCOioIdZbpYETvseEhA_D3n_Q";
    static final String SHARED_REGISTRIES_ROOT_ID = "1h-sNqC3983nfG1IaUe6SXWeWnJLVrcOx";
    static final String CONNECTOR_EXPORTS_ROOT_ID = "1gmhM6WCj-m4Ms_JK7pdvmYP32Id9JkKo";
    static final String ASSET_INDEX_FILE_ID = "1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI";
    static final String ROUTING_RULES_DOC_ID = "1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c";
    static final String MIGRATION_LOG_DOC_ID = "1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU";

    static final String CLOUD_ROOT_URL = "https://drive.google.com/drive/folders/" + CLOUD_ROOT_ID;
    static final String PROJECT_WORLDS_ROOT_URL = "https://drive.google.com/drive/folders/" + PROJECT_WORLDS_ROOT_ID;
    static final String ASSET_INDEX_URL = "https://docs.google.com/spreadsheets/d/" + ASSET_INDEX_FILE_ID + "/edit";
    static final String ROUTING_RULES_URL = "https://docs.google.com/document/d/" + ROUTING_RULES_DOC_ID + "/edit";
    static final String MIGRATION_LOG_URL = "https://docs.google.com/document/d/" + MIGRATION_LOG_DOC_ID + "/edit";

    static final String PRIMARY_PROJECT_ID = "NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA";
    static final String PRIMARY_PROJECT = "e-SAFE Catania Project World";
    static final String PRIMARY_WORLD_ID = "esafe-demo";
    static final String PRIMARY_PROJECT_FOLDER_ID = "1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE";
    static final String PRIMARY_PROJECT_FOLDER_URL = "https://drive.google.com/drive/folders/" + PRIMARY_PROJECT_FOLDER_ID;
    static final String PRIMARY_INBOX_FOLDER_ID = "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9";
    static final String PRIMARY_PENDING_GRAPH_FOLDER_ID = "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ";
    static final String PRIMARY_TRADE_FOLDER_ID = "1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P";
    static final String PRIMARY_TYPE_FOLDER_ID = "1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9";
    static final String PRIMARY_AUDIT_FOLDER_ID = "1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz";

    static final String RIVERSIDE_PROJECT_ID = "RIVERSIDE_DEMO_PROJECT";
    static final String RIVERSIDE_WORLD_ID = "dev";
    static final String RIVERSIDE_PROJECT = "Riverside Demo Project World";
    static final String RIVERSIDE_PROJECT_FOLDER_ID = "1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g";
    static final String RIVERSIDE_PROJECT_FOLDER_URL = "https://drive.google.com/drive/folders/" + RIVERSIDE_PROJECT_FOLDER_ID;
    static final String RIVERSIDE_INBOX_FOLDER_ID = "1n8xdmpeLMTkKp-Pe__XS4eLChaFo2H46";
    static final String RIVERSIDE_TRADE_FOLDER_ID = "1VZ3TPt5d6N6VYvBb2tAUJYCCcnLJEl68";
    static final String RIVERSIDE_TYPE_FOLDER_ID = "14aYunionA4U7DqPdjqelcU7kAGgDse5w";
    static final String RIVERSIDE_AUDIT_FOLDER_ID = "1k5yqEoL-SD2fr8UwBFvXhxYLxF6Y7K-a";

    static final String ROOT_FOLDER = "00_NEXUS_PERSONAL_CLOUD";
    static final String PROJECT_WORLDS_FOLDER = "10_PROJECT_WORLDS";
    static final String SHARED_REGISTRIES_FOLDER = "20_SHARED_REGISTRIES";
    static final String CONNECTOR_EXPORTS_FOLDER = "30_CONNECTOR_EXPORTS";

    static final String PROJECT_INBOX_FOLDER = "00_INBOX";
    static final String PROJECT_PENDING_GRAPH_FOLDER = "01_PENDING_GRAPH_LINK";
    static final String PROJECT_BY_TRADE_FOLDER = "02_BY_TRADE";
    static final String PROJECT_BY_TYPE_FOLDER = "03_BY_TYPE";
    static final String PROJECT_AUDIT_FOLDER = "90_AUDIT_PROVENANCE";

    static final String REVIEW_UNCLEAR_PHOTOS_FOLDER = "00_INBOX/REVIEW_UNCLEAR_PHOTOS";
    static final String CONTACTS_CALENDAR_REVIEW_FOLDER = "00_INBOX/CONTACTS_CALENDAR_REVIEW";
    static final String OTHER_PROJECT_CANDIDATES_FOLDER = "00_INBOX/OTHER_PROJECT_CANDIDATES";
    static final String PRIVATE_DO_NOT_UPLOAD_FOLDER = "00_INBOX/PRIVATE_DO_NOT_UPLOAD";

    static final String TYPE_PHOTOS_SITE_EVIDENCE = "03_BY_TYPE/PHOTOS_SITE_EVIDENCE";
    static final String TYPE_DOCUMENTS_PDF_OFFICE = "03_BY_TYPE/DOCUMENTS_PDF_OFFICE";
    static final String TYPE_DRAWINGS_BIM_IFC = "03_BY_TYPE/DRAWINGS_BIM_IFC";

    static final String INDEX_FILENAME = "nexus-personal-cloud-index.jsonl";

    private PersonalCloudIndexContract() { }

    static String projectIdForRoute(String route) {
        if (route == null) return PRIMARY_PROJECT_ID;
        if (route.equals("PROJECT_RIVERSIDE_REVIEW")) return RIVERSIDE_PROJECT_ID;
        return PRIMARY_PROJECT_ID;
    }

    static String worldIdForProjectId(String projectId) {
        if (RIVERSIDE_PROJECT_ID.equals(projectId)) return RIVERSIDE_WORLD_ID;
        return PRIMARY_WORLD_ID;
    }

    static String displayNameForProjectId(String projectId) {
        if (RIVERSIDE_PROJECT_ID.equals(projectId)) return RIVERSIDE_PROJECT;
        return PRIMARY_PROJECT;
    }

    static String destinationPathForRoute(String route) {
        return destinationPathForRoute(PRIMARY_PROJECT_ID, route);
    }

    static String destinationPathForRoute(String projectId, String route) {
        String project = safeProjectId(projectId);
        String projectRoot = PROJECT_WORLDS_FOLDER + "/" + project + "/";
        if (route == null) return projectRoot + PROJECT_INBOX_FOLDER;
        if (route.equals("ESAFE_PHOTOS_SITE_EVIDENCE")) return projectRoot + TYPE_PHOTOS_SITE_EVIDENCE;
        if (route.equals("ESAFE_DOCUMENTS_PDF_OFFICE")) return projectRoot + TYPE_DOCUMENTS_PDF_OFFICE;
        if (route.equals("ESAFE_DRAWINGS_BIM_IFC")) return projectRoot + TYPE_DRAWINGS_BIM_IFC;
        if (route.equals("REVIEW_UNCLEAR_PHOTOS")) return projectRoot + REVIEW_UNCLEAR_PHOTOS_FOLDER;
        if (route.equals("CONTACTS_CALENDAR_REVIEW")) return projectRoot + CONTACTS_CALENDAR_REVIEW_FOLDER;
        if (route.equals("PRIVATE_DO_NOT_UPLOAD")) return projectRoot + PRIVATE_DO_NOT_UPLOAD_FOLDER;
        if (route.equals("PROJECT_RIVERSIDE_REVIEW")) return PROJECT_WORLDS_FOLDER + "/" + RIVERSIDE_PROJECT_ID + "/" + PROJECT_INBOX_FOLDER;
        if (route.equals("OTHER_PROJECT_CANDIDATE")) return projectRoot + OTHER_PROJECT_CANDIDATES_FOLDER;
        return projectRoot + PROJECT_INBOX_FOLDER;
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
        String projectId = inferProjectIdFromDestination(destinationPath, inferredProject, route);
        String worldId = worldIdForProjectId(projectId);
        return "{"
                + jsonPair("schema", VERSION) + ","
                + jsonPair("source", "android-work-mode") + ","
                + jsonPair("physicalCloudProvider", PHYSICAL_PROVIDER_GOOGLE_DRIVE) + ","
                + jsonPair("cloudRootId", CLOUD_ROOT_ID) + ","
                + jsonPair("projectWorldsRootId", PROJECT_WORLDS_ROOT_ID) + ","
                + jsonPair("assetIndexFileId", ASSET_INDEX_FILE_ID) + ","
                + jsonPair("projectId", projectId) + ","
                + jsonPair("worldId", worldId) + ","
                + jsonPair("projectDisplayName", displayNameForProjectId(projectId)) + ","
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

    private static String inferProjectIdFromDestination(String destinationPath, String inferredProject, String route) {
        String text = (safe(destinationPath) + " " + safe(inferredProject) + " " + safe(route)).toLowerCase(Locale.ROOT);
        if (text.contains("riverside")) return RIVERSIDE_PROJECT_ID;
        return PRIMARY_PROJECT_ID;
    }

    private static String safeProjectId(String projectId) {
        if (RIVERSIDE_PROJECT_ID.equals(projectId)) return RIVERSIDE_PROJECT_ID;
        return PRIMARY_PROJECT_ID;
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static String jsonPair(String key, String value) {
        return "\"" + safeJsonValue(key) + "\":\"" + safeJsonValue(value) + "\"";
    }
}
