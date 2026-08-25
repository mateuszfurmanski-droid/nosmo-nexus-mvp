package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Parameter-free launcher shortcut trampoline.
 *
 * It grants no session, Project World, candidate or Cloud authority. The shortcut opens
 * the Nexus-native Evidence Home, which can then enter the existing canonical Cloud
 * Evidence pipeline without creating a second evidence implementation.
 */
public final class CloudEvidenceShortcutActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent evidenceHome = new Intent(this, EvidenceHomeActivity.class);
        evidenceHome.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(evidenceHome);
        finish();
    }
}
