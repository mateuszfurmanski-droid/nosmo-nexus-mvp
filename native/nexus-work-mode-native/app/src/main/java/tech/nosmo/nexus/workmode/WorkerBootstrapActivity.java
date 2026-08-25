package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * One-shot launcher gate for the real-device staging build.
 *
 * It does not own identity or assignment state. It only routes into the existing
 * encrypted mobile session or the canonical one-time identity claim flow.
 */
public final class WorkerBootstrapActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Class<?> destination = NexusMobileSession.hasSession(this)
                ? WorkModeHomeActivity.class
                : IdentityClaimActivity.class;
        Intent intent = new Intent(this, destination);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }
}
