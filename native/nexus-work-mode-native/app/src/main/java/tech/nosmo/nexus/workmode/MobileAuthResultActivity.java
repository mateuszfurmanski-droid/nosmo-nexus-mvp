package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

/**
 * Receives only the short-lived OIDC authorization code forwarded by the Nexus
 * HTTPS callback. The Nexus session ID itself is never delivered by deep link.
 */
public final class MobileAuthResultActivity extends Activity {
    private static final String CALLBACK_SCHEME = "nosmo-nexus-workmode";
    private static final String CALLBACK_HOST = "auth-result";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        process(getIntent());
    }

    private void process(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (
                intent == null ||
                !Intent.ACTION_VIEW.equals(intent.getAction()) ||
                data == null ||
                !CALLBACK_SCHEME.equals(data.getScheme()) ||
                !CALLBACK_HOST.equals(data.getHost())
        ) {
            finishWithMessage("Ignored invalid Nexus mobile auth callback", true);
            return;
        }

        String status = safe(data.getQueryParameter("status"));
        String code = safe(data.getQueryParameter("code"));
        String state = safe(data.getQueryParameter("state"));

        if (!"AUTHORIZATION_CODE".equals(status)) {
            NexusMobileSession.clearPendingAuthorization(this);
            finishWithMessage("Nexus sign-in did not complete", true);
            return;
        }

        if (
                code.isEmpty() ||
                code.length() > 4096 ||
                state.isEmpty() ||
                !NexusMobileSession.callbackMatchesPendingState(this, state)
        ) {
            NexusMobileSession.clearPendingAuthorization(this);
            finishWithMessage("Rejected stale or unsolicited Nexus sign-in callback", true);
            return;
        }

        String origin = BuildConfig.NEXUS_WEB_ORIGIN == null
                ? ""
                : BuildConfig.NEXUS_WEB_ORIGIN.trim().replaceAll("/+$", "");
        if (!origin.startsWith("https://")) {
            NexusMobileSession.clearPendingAuthorization(this);
            finishWithMessage("Nexus HTTPS origin is not configured", true);
            return;
        }

        NexusMobileSession.exchangeAuthorizationCode(
                getApplicationContext(),
                origin,
                code,
                state,
                (success, message) -> runOnUiThread(() -> finishWithMessage(message, !success))
        );
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private void finishWithMessage(String message, boolean longToast) {
        Toast.makeText(
                this,
                message,
                longToast ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT
        ).show();
        Intent cloud = new Intent(this, CloudEvidenceActivity.class);
        cloud.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(cloud);
        finish();
    }
}
