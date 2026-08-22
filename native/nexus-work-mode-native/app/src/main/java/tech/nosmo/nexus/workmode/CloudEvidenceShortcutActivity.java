package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Parameter-free launcher shortcut trampoline.
 *
 * It grants no session, Project World, candidate or Cloud authority. All evidence
 * state is re-read from app-private storage and all server access is re-authorised.
 */
public final class CloudEvidenceShortcutActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent cloud = new Intent(this, CloudEvidenceActivity.class);
        cloud.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(cloud);
        finish();
    }
}
