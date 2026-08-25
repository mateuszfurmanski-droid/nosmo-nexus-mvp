package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Role/device-adaptive Work Mode launcher surface.
 *
 * This activity is UI-only. It does not introduce a second Android authority,
 * project store, session model or evidence pipeline. Existing MainActivity and
 * cloud/auth activities remain the operational implementation underneath it.
 */
public final class WorkModeHomeActivity extends Activity {
    private static final int BG = Color.rgb(4, 16, 31);
    private static final int PANEL = Color.rgb(10, 34, 63);
    private static final int PANEL_DISABLED = Color.rgb(29, 42, 56);
    private static final int TEXT = Color.rgb(238, 247, 255);
    private static final int MUTED = Color.rgb(153, 181, 207);
    private static final int CYAN = Color.rgb(72, 205, 255);
    private static final int GREEN = Color.rgb(71, 222, 161);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        renderHome();
    }

    private void renderHome() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(16), dp(18), dp(16), dp(28));
        root.setBackgroundColor(BG);

        TextView title = new TextView(this);
        title.setText("NEXUS Work Mode");
        title.setTextColor(TEXT);
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        root.addView(title, fullWidthWrap());

        TextView subtitle = new TextView(this);
        subtitle.setText("e-SAFE Catania · operational mobile surface");
        subtitle.setTextColor(MUTED);
        subtitle.setTextSize(13);
        subtitle.setPadding(0, dp(4), 0, dp(18));
        root.addView(subtitle, fullWidthWrap());

        GridLayout grid = new GridLayout(this);
        int screenWidthDp = getResources().getConfiguration().screenWidthDp;
        int columnCount = screenWidthDp > 0 && screenWidthDp < 420 ? 1 : 2;
        grid.setColumnCount(columnCount);
        grid.setUseDefaultMargins(false);
        root.addView(grid, fullWidthWrap());

        addTile(grid, "NEXUS\nPROJECT WORLD", true, this::openNexusProjectWorld);
        addTile(grid, "WORK INBOX\nCURRENT WORK MODE", false, this::openExistingWorkMode);
        addTile(grid, "WORK CAMERA\nEVIDENCE", false, this::openEvidenceCapture);
        addTile(grid, "TASKS\nNEXUS", false, () -> openNexusPath("/tasks"));
        addTile(grid, "DOCUMENTS\nPENDING PROJECTION", false, () -> showPending("Documents"));
        addTile(grid, "CHECKLISTS\nPENDING PROJECTION", false, () -> showPending("Checklists"));

        TextView boundary = new TextView(this);
        boundary.setText("NEXUS is an explicit user-visible entry. Pending tiles do not invent recipient data before the canonical assignment projection is wired.");
        boundary.setTextColor(MUTED);
        boundary.setTextSize(11);
        boundary.setPadding(0, dp(16), 0, 0);
        root.addView(boundary, fullWidthWrap());

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.setFillViewport(true);
        scroll.addView(root, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(scroll);
    }

    private void addTile(GridLayout grid, String label, boolean primary, Runnable action) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setGravity(Gravity.CENTER);
        button.setTextSize(14);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(primary ? Color.rgb(0, 21, 34) : TEXT);
        button.setBackgroundColor(primary ? GREEN : PANEL);
        button.setPadding(dp(8), dp(14), dp(8), dp(14));
        button.setOnClickListener(v -> action.run());

        GridLayout.LayoutParams params = new GridLayout.LayoutParams();
        params.width = 0;
        params.height = dp(126);
        params.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f);
        params.setMargins(dp(5), dp(5), dp(5), dp(5));
        grid.addView(button, params);
    }

    private void openNexusProjectWorld() {
        openNexusPath("/project-worlds/esafe");
    }

    private void openNexusPath(String path) {
        String origin = configuredNexusOrigin();
        if (origin.isEmpty()) {
            Toast.makeText(
                    this,
                    "Nexus web origin is not configured. Build remains fail-closed.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        String safePath = path.startsWith("/") ? path : "/" + path;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(origin + safePath)));
        } catch (Exception ex) {
            Toast.makeText(this, "No compatible browser available", Toast.LENGTH_SHORT).show();
        }
    }

    private String configuredNexusOrigin() {
        String origin = BuildConfig.NEXUS_WEB_ORIGIN == null ? "" : BuildConfig.NEXUS_WEB_ORIGIN.trim();
        while (origin.endsWith("/")) origin = origin.substring(0, origin.length() - 1);
        if (!origin.startsWith("https://")) return "";
        return origin;
    }

    private void openExistingWorkMode() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }

    private void openEvidenceCapture() {
        Intent intent = new Intent(this, CloudEvidenceShortcutActivity.class);
        startActivity(intent);
    }

    private void showPending(String surface) {
        Toast.makeText(
                this,
                surface + " recipient projection is not wired yet. No synthetic assignment was created.",
                Toast.LENGTH_LONG
        ).show();
    }

    private LinearLayout.LayoutParams fullWidthWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
