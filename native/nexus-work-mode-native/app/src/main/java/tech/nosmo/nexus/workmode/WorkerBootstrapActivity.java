package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Launcher gate for the protected real-device staging build.
 *
 * A persisted opaque Nexus session is not enough after process restart because
 * the Vercel preview cookie is deliberately process-memory only. In that case
 * route back through IdentityClaimActivity only to reopen the protected gate;
 * no second Person claim is required while the Nexus session remains valid.
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
