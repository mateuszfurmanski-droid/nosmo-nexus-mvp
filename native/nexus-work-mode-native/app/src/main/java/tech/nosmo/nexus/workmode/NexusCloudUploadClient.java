package tech.nosmo.nexus.workmode;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

final class NexusCloudUploadClient {
    interface UploadCallback {
        void onComplete(Result result);
    }

    enum Outcome {
        TRANSFER_CONFIRMED,
        FAILED_RETRYABLE,
        AUTH_REQUIRED,
        DENIED,
        INVALID_LOCAL_EVIDENCE
    }

    static final class Result {
        final Outcome outcome;
        final String message;
        final String driveFileId;
        final String fileId;

        Result(Outcome outcome, String message, String driveFileId, String fileId) {
            this.outcome = outcome;
            this.message = message;
            this.driveFileId = driveFileId;
            this.fileId = fileId;
        }
    }

    private static final long MAX_FILE_SIZE = 25L * 1024L * 1024L;
    private static final int MAX_RESPONSE_BYTES = 128 * 1024;
    private static final int MAX_FILE_NAME_CHARS = 255;
    private static final int MAX_MIME_TYPE_CHARS = 127;
    private static final String SAFE_MIME_TYPE_PATTERN = "[A-Za-z0-9!#$&^_.+\\-]+/[A-Za-z0-9!#$&^_.+\\-]+";

    private NexusCloudUploadClient() {}

    static void upload(
            Context context,
            String origin,
            String sessionToken,
            Uri uri,
            String fallbackFileName,
            String fallbackMimeType,
            String projectId,
            String worldId,
            String idempotencyKey,
            UploadCallback callback
    ) {
        new Thread(() -> callback.onComplete(uploadBlocking(
                context,
                origin,
                sessionToken,
                uri,
                fallbackFileName,
                fallbackMimeType,
                projectId,
                worldId,
                idempotencyKey
        )), "nexus-cloud-evidence-upload").start();
    }

    private static Result uploadBlocking(
            Context context,
            String origin,
            String sessionToken,
            Uri uri,
            String fallbackFileName,
            String fallbackMimeType,
            String projectId,
            String worldId,
            String idempotencyKey
    ) {
        if (
                origin == null ||
                !origin.matches("https://[^/?#]+(?:\\:[0-9]{1,5})?") ||
                sessionToken == null ||
                !sessionToken.matches("[a-f0-9]{64}") ||
                uri == null ||
                !"content".equals(uri.getScheme()) ||
                projectId == null || projectId.trim().isEmpty() ||
                worldId == null || worldId.trim().isEmpty() ||
                idempotencyKey == null ||
                !idempotencyKey.matches("[A-Za-z0-9._:-]{16,200}")
        ) {
            return new Result(Outcome.INVALID_LOCAL_EVIDENCE, "Evidence upload request is incomplete", "", "");
        }

        ContentResolver resolver = context.getContentResolver();
        FileMeta meta = fileMeta(resolver, uri, fallbackFileName, fallbackMimeType);
        if (meta.sizeBytes > MAX_FILE_SIZE) {
            return new Result(Outcome.INVALID_LOCAL_EVIDENCE, "Evidence exceeds the 25 MiB Nexus Cloud limit", "", "");
        }

        HttpURLConnection connection = null;
        String boundary = "----NexusAndroid" + UUID.randomUUID().toString().replace("-", "");
        try {
            connection = (HttpURLConnection) new URL(origin + "/api/nexus/cloud/files").openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(20_000);
            connection.setReadTimeout(60_000);
            connection.setInstanceFollowRedirects(false);
            connection.setDoOutput(true);
            connection.setChunkedStreamingMode(64 * 1024);
            connection.setRequestProperty("Authorization", "Bearer " + sessionToken);
            connection.setRequestProperty("Idempotency-Key", idempotencyKey);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

            try (OutputStream output = connection.getOutputStream()) {
                writeField(output, boundary, "projectId", projectId);
                writeField(output, boundary, "worldId", worldId);
                writeField(output, boundary, "classification", "inbox");
                writeFileHeader(output, boundary, meta.fileName, meta.mimeType);

                long total = 0L;
                try (InputStream input = resolver.openInputStream(uri)) {
                    if (input == null) throw new IllegalStateException("Content provider did not return evidence bytes");
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        total += read;
                        if (total > MAX_FILE_SIZE) {
                            throw new EvidenceTooLargeException();
                        }
                        output.write(buffer, 0, read);
                    }
                }
                output.write("\r\n".getBytes(StandardCharsets.UTF_8));
                output.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
            }

            int status = connection.getResponseCode();
            String body = readBounded(
                    status >= 200 && status < 400
                            ? connection.getInputStream()
                            : connection.getErrorStream()
            );
            JSONObject json = body.isEmpty() ? new JSONObject() : new JSONObject(body);

            if (status == 401) {
                return new Result(Outcome.AUTH_REQUIRED, "Nexus mobile session expired", "", "");
            }
            if (status == 403) {
                return new Result(
                        Outcome.DENIED,
                        "Nexus Cloud denied cloud.file.write: " + json.optString("reason", json.optString("error", "DENIED")),
                        "",
                        ""
                );
            }

            boolean providerConfirmed = json.optBoolean("providerWriteConfirmed", false);
            boolean memoryCommitted = json.optBoolean("projectMemoryCommitted", false);
            String driveFileId = json.optString("driveFileId", "");
            String fileId = json.optString("fileId", "");

            if (
                    (status == 200 || status == 201) &&
                    providerConfirmed &&
                    memoryCommitted &&
                    !driveFileId.isEmpty() &&
                    !fileId.isEmpty()
            ) {
                return new Result(
                        Outcome.TRANSFER_CONFIRMED,
                        "Evidence committed to Nexus Cloud",
                        driveFileId,
                        fileId
                );
            }

            String serverStatus = json.optString("status", "");
            if (
                    "PROVIDER_WRITTEN_PERSISTENCE_FAILED".equals(serverStatus) ||
                    "PROVIDER_WRITE_FAILED".equals(serverStatus) ||
                    status >= 500
            ) {
                return new Result(
                        Outcome.FAILED_RETRYABLE,
                        "Nexus Cloud upload is retryable; reuse the same idempotency key",
                        driveFileId,
                        fileId
                );
            }

            return new Result(
                    Outcome.FAILED_RETRYABLE,
                    "Nexus Cloud did not return a canonical commit receipt (HTTP " + status + ")",
                    driveFileId,
                    fileId
            );
        } catch (EvidenceTooLargeException ignored) {
            return new Result(Outcome.INVALID_LOCAL_EVIDENCE, "Evidence exceeds the 25 MiB Nexus Cloud limit", "", "");
        } catch (Exception ignored) {
            return new Result(Outcome.FAILED_RETRYABLE, "Nexus Cloud upload could not complete", "", "");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static void writeField(OutputStream output, String boundary, String name, String value) throws Exception {
        String part = "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n"
                + value + "\r\n";
        output.write(part.getBytes(StandardCharsets.UTF_8));
    }

    private static void writeFileHeader(OutputStream output, String boundary, String fileName, String mimeType) throws Exception {
        String part = "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"" + fileName + "\"\r\n"
                + "Content-Type: " + mimeType + "\r\n\r\n";
        output.write(part.getBytes(StandardCharsets.UTF_8));
    }

    private static FileMeta fileMeta(ContentResolver resolver, Uri uri, String fallbackName, String fallbackMimeType) {
        String fileName = fallbackName == null || fallbackName.trim().isEmpty() ? "android-evidence" : fallbackName.trim();
        long size = -1L;
        try (Cursor cursor = resolver.query(
                uri,
                new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE},
                null,
                null,
                null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIx = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameIx >= 0 && !cursor.isNull(nameIx)) fileName = cursor.getString(nameIx);
                if (sizeIx >= 0 && !cursor.isNull(sizeIx)) size = cursor.getLong(sizeIx);
            }
        } catch (Exception ignored) {
        }

        String mime = resolver.getType(uri);
        if (mime == null || mime.trim().isEmpty()) {
            mime = fallbackMimeType == null || fallbackMimeType.trim().isEmpty()
                    ? "application/octet-stream"
                    : fallbackMimeType.trim();
        }
        return new FileMeta(safeFileName(fileName), safeMimeType(mime), size);
    }

    private static String safeFileName(String fileName) {
        String value = fileName == null ? "" : fileName.trim();
        value = value
                .replace("\\", "_")
                .replace("\"", "_")
                .replace("\r", "_")
                .replace("\n", "_");
        if (value.isEmpty()) value = "android-evidence";
        if (value.length() > MAX_FILE_NAME_CHARS) {
            value = value.substring(0, MAX_FILE_NAME_CHARS);
        }
        return value;
    }

    private static String safeMimeType(String mimeType) {
        String value = mimeType == null ? "" : mimeType.trim();
        if (
                value.isEmpty() ||
                value.length() > MAX_MIME_TYPE_CHARS ||
                !value.matches(SAFE_MIME_TYPE_PATTERN)
        ) {
            return "application/octet-stream";
        }
        return value;
    }

    private static String readBounded(InputStream input) throws Exception {
        if (input == null) return "";
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (InputStream stream = input) {
            byte[] buffer = new byte[4096];
            int total = 0;
            int read;
            while ((read = stream.read(buffer)) != -1) {
                total += read;
                if (total > MAX_RESPONSE_BYTES) throw new IllegalStateException("Response too large");
                bytes.write(buffer, 0, read);
            }
        }
        return bytes.toString(StandardCharsets.UTF_8.name());
    }

    private static final class FileMeta {
        final String fileName;
        final String mimeType;
        final long sizeBytes;

        FileMeta(String fileName, String mimeType, long sizeBytes) {
            this.fileName = fileName;
            this.mimeType = mimeType;
            this.sizeBytes = sizeBytes;
        }
    }

    private static final class EvidenceTooLargeException extends Exception {}
}
