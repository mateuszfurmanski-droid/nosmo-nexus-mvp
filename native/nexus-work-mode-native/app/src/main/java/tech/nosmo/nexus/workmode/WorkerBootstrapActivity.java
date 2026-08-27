package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Launcher gate for the protected real-device staging build.
 *
 * The opaque Nexus session may survive a process restart, but the protected
 * Vercel preview cookie deliberately does not. Worker Home therefore requires
 * both the encrypted Nexus session and the in-process transport gate.
 */
public final class WorkerBootstrapActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean sessionReady = NexusMobileSession.hasSession(this);
        boolean transportReady = NexusStagingVercelGate.isReady();
        Class<?> destination = sessionReady && transportReady
                ? WorkModeHomeActivity.class
                : IdentityClaimActivity.class;
        Intent intent = new Intent(this, destination);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }
}
