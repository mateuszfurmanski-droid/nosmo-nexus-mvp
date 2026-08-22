package tech.nosmo.nexus.workmode;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.Set;

/**
 * Device-local sidecar for immutable evidence routing facts that must survive
 * MainActivity queue rewrites. This store is not Nexus authority: values originate
 * only from a matching server metadata receipt and are re-authorised by Cloud.
 */
final class EvidenceBindingStore {
    private static final String PREFS = "nexus_work_mode_v060_evidence_bindings";

    static final class Binding {
        final String candidateId;
        final String projectId;
        final String worldId;
        final String cloudFileId;
        final String driveFileId;

        Binding(String candidateId, String projectId, String worldId, String cloudFileId, String driveFileId) {
            this.candidateId = candidateId;
            this.projectId = projectId;
            this.worldId = worldId;
            this.cloudFileId = cloudFileId;
            this.driveFileId = driveFileId;
        }
    }

    private EvidenceBindingStore() {}

    static void bindConfirmedMetadata(Context context, String candidateId, String projectId, String worldId) {
        if (!isCandidateId(candidateId) || !isNexusId(projectId) || !isNexusId(worldId)) return;
        SharedPreferences.Editor editor = prefs(context).edit();
        editor.putString(key(candidateId, "project"), projectId);
        editor.putString(key(candidateId, "world"), worldId);
        // A fresh metadata receipt starts a fresh local evidence lifecycle even if the
        // same deterministic candidate ID is later re-created from the same URI.
        editor.remove(key(candidateId, "cloudFile"));
        editor.remove(key(candidateId, "driveFile"));
        editor.apply();
    }

    static Binding get(Context context, String candidateId) {
        if (!isCandidateId(candidateId)) return null;
        SharedPreferences prefs = prefs(context);
        String projectId = prefs.getString(key(candidateId, "project"), "");
        String worldId = prefs.getString(key(candidateId, "world"), "");
        if (!isNexusId(projectId) || !isNexusId(worldId)) return null;
        return new Binding(
                candidateId,
                projectId,
                worldId,
                prefs.getString(key(candidateId, "cloudFile"), ""),
                prefs.getString(key(candidateId, "driveFile"), "")
        );
    }

    static void recordCloudCommit(Context context, String candidateId, String cloudFileId, String driveFileId) {
        Binding binding = get(context, candidateId);
        if (binding == null || cloudFileId == null || cloudFileId.trim().isEmpty() || driveFileId == null || driveFileId.trim().isEmpty()) {
            return;
        }
        prefs(context).edit()
                .putString(key(candidateId, "cloudFile"), cloudFileId.trim())
                .putString(key(candidateId, "driveFile"), driveFileId.trim())
                .apply();
    }

    static void remove(Context context, String candidateId) {
        if (!isCandidateId(candidateId)) return;
        prefs(context).edit()
                .remove(key(candidateId, "project"))
                .remove(key(candidateId, "world"))
                .remove(key(candidateId, "cloudFile"))
                .remove(key(candidateId, "driveFile"))
                .apply();
    }

    static void pruneToCandidates(Context context, Set<String> candidateIds) {
        if (candidateIds == null) return;
        SharedPreferences store = prefs(context);
        SharedPreferences.Editor editor = store.edit();
        boolean changed = false;
        for (String storedKey : store.getAll().keySet()) {
            int dot = storedKey.indexOf('.');
            if (dot <= 0) continue;
            String candidateId = storedKey.substring(0, dot);
            if (isCandidateId(candidateId) && !candidateIds.contains(candidateId)) {
                editor.remove(storedKey);
                changed = true;
            }
        }
        if (changed) editor.apply();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String key(String candidateId, String suffix) {
        return candidateId + "." + suffix;
    }

    private static boolean isCandidateId(String value) {
        return value != null && value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    }

    private static boolean isNexusId(String value) {
        return value != null && !value.trim().isEmpty() && value.length() <= 128 && value.matches("[A-Za-z0-9._:-]+");
    }
}
