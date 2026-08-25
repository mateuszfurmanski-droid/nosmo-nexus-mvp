package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Nexus Worker Home.
 *
 * This surface is a thin read-through UI over the canonical recipient projection.
 * It does not create a second assignment store, Person binding, session model,
 * evidence pipeline or Project World authority on the device.
 */
public final class WorkModeHomeActivity extends Activity {
    private static final int BG = Color.rgb(8, 15, 12);
    private static final int SURFACE = Color.rgb(17, 30, 24);
    private static final int SURFACE_ALT = Color.rgb(23, 40, 32);
    private static final int TEXT = Color.rgb(238, 244, 239);
    private static final int MUTED = Color.rgb(153, 169, 158);
    private static final int ECO = Color.rgb(111, 196, 137);
    private static final int ECO_DARK = Color.rgb(20, 48, 31);
    private static final int WARNING = Color.rgb(236, 191, 102);
    private static final int ERROR = Color.rgb(240, 137, 137);

    private TextView assignmentState;
    private TextView assignmentTitle;
    private TextView assignmentMeta;
    private TextView assignmentItems;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        renderHome();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (assignmentTitle != null) refreshCurrentWork();
    }

    private void renderHome() {
        LinearLayout shell = new LinearLayout(this);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(BG);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(18), dp(18), dp(24));
        scroll.addView(content, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
        );
        shell.addView(scroll, scrollParams);

        addHeader(content);
        addCurrentWork(content);
        addWorkTools(content);
        addAuthorityBoundary(content);
        addBottomNavigation(shell);

        setContentView(shell);
    }

    private void addHeader(LinearLayout root) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout brand = new LinearLayout(this);
        brand.setOrientation(LinearLayout.VERTICAL);
        brand.addView(text("NOSMO", 11, MUTED, true), wrap());
        brand.addView(text("NEXUS", 20, TEXT, true), wrap());
        row.addView(brand, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        TextView mode = pill("WORK MODE", ECO, ECO_DARK);
        row.addView(mode, wrap());
        root.addView(row, fullWidthWrap());

        TextView project = text("e-SAFE CATANIA  /  MY WORK", 11, ECO, true);
        project.setPadding(0, dp(18), 0, dp(6));
        root.addView(project, fullWidthWrap());

        TextView title = text("Current work", 30, TEXT, true);
        root.addView(title, fullWidthWrap());

        TextView subtitle = text("Only what is assigned to this worker. No app launcher, no noise.", 13, MUTED, false);
        subtitle.setPadding(0, dp(4), 0, dp(16));
        root.addView(subtitle, fullWidthWrap());
    }

    private void addCurrentWork(LinearLayout root) {
        LinearLayout card = panel(SURFACE, 18);
        card.setPadding(dp(16), dp(16), dp(16), dp(16));

        assignmentState = pill("SYNCING", ECO, ECO_DARK);
        card.addView(assignmentState, wrap());

        assignmentTitle = text("Resolving assigned Work Package…", 22, TEXT, true);
        assignmentTitle.setPadding(0, dp(14), 0, dp(5));
        card.addView(assignmentTitle, fullWidthWrap());

        assignmentMeta = text("Canonical recipient projection", 12, MUTED, false);
        card.addView(assignmentMeta, fullWidthWrap());

        assignmentItems = text("Project Memory is being read. Nothing is assigned locally on this device.", 12, MUTED, false);
        assignmentItems.setPadding(0, dp(12), 0, dp(14));
        card.addView(assignmentItems, fullWidthWrap());

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);

        Button open = actionButton("Open Work Package", true);
        open.setOnClickListener(v -> openCanonicalWorkInbox());
        actions.addView(open, weightedButton());

        Button evidence = actionButton("+ Evidence", false);
        evidence.setOnClickListener(v -> openEvidenceCapture());
        LinearLayout.LayoutParams evidenceParams = weightedButton();
        evidenceParams.setMargins(dp(8), 0, 0, 0);
        actions.addView(evidence, evidenceParams);

        card.addView(actions, fullWidthWrap());

        LinearLayout.LayoutParams cardParams = fullWidthWrap();
        cardParams.setMargins(0, 0, 0, dp(22));
        root.addView(card, cardParams);
    }

    private void addWorkTools(LinearLayout root) {
        TextView heading = text("WORK TOOLS", 11, MUTED, true);
        heading.setPadding(0, 0, 0, dp(8));
        root.addView(heading, fullWidthWrap());

        LinearLayout first = new LinearLayout(this);
        first.setOrientation(LinearLayout.HORIZONTAL);
        first.addView(toolCard("CHECKLISTS", "From assigned work", this::openCanonicalWorkInbox), weightedCard(false));
        first.addView(toolCard("DOCUMENTS", "Recipient files", () -> showPending("Documents")), weightedCard(true));
        root.addView(first, fullWidthWrap());

        LinearLayout second = new LinearLayout(this);
        second.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams rowParams = fullWidthWrap();
        rowParams.setMargins(0, dp(8), 0, 0);
        second.addView(toolCard("EVIDENCE", "Camera / upload", this::openEvidenceCapture), weightedCard(false));
        second.addView(toolCard("PROJECT", "Relationship Tree", this::openNexusProjectWorld), weightedCard(true));
        root.addView(second, rowParams);
    }

    private void addAuthorityBoundary(LinearLayout root) {
        TextView boundary = text(
                "LIVE FROM PROJECT MEMORY  ·  assignment authority stays in Nexus Core",
                10,
                MUTED,
                true
        );
        boundary.setGravity(Gravity.CENTER);
        boundary.setPadding(dp(10), dp(18), dp(10), 0);
        root.addView(boundary, fullWidthWrap());
    }

    private void addBottomNavigation(LinearLayout shell) {
        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setGravity(Gravity.CENTER);
        nav.setPadding(dp(8), dp(8), dp(8), dp(10));
        nav.setBackgroundColor(SURFACE);

        nav.addView(navButton("WORK", this::openCanonicalWorkInbox, true), navWeight());
        nav.addView(navButton("CAMERA", this::openEvidenceCapture, false), navWeight());
        nav.addView(navButton("FILES", () -> showPending("Documents"), false), navWeight());
        nav.addView(navButton("INBOX", this::openCanonicalWorkInbox, false), navWeight());
        nav.addView(navButton("NEXUS", this::openNexusProjectWorld, false), navWeight());

        shell.addView(nav, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
    }

    private void refreshCurrentWork() {
        assignmentState.setText("SYNCING");
        assignmentState.setTextColor(ECO);
        NexusCoreWorkClient.loadInbox(this, configuredNexusOrigin(), (success, httpStatus, message, payload) ->
                runOnUiThread(() -> {
                    if (!success || payload == null) {
                        assignmentState.setText("OFFLINE / UNBOUND");
                        assignmentState.setTextColor(ERROR);
                        assignmentTitle.setText("Work assignment unavailable");
                        assignmentMeta.setText(message);
                        assignmentItems.setText("No local or synthetic Work Package is shown when Nexus Core cannot resolve the bound Person.");
                        return;
                    }
                    renderCurrentWork(payload);
                })
        );
    }

    private void renderCurrentWork(JSONObject payload) {
        JSONArray tasks = payload.optJSONArray("tasks");
        int count = tasks == null ? 0 : tasks.length();
        if (count == 0) {
            assignmentState.setText("NO ASSIGNMENT");
            assignmentState.setTextColor(WARNING);
            assignmentTitle.setText("No work assigned right now");
            assignmentMeta.setText("Bound Person resolved · Project Memory " + payload.optString("version", "unversioned"));
            assignmentItems.setText("When a manager assigns a Work Package, it will appear here automatically.");
            return;
        }

        JSONObject task = tasks.optJSONObject(0);
        if (task == null) return;

        String taskStatus = task.optString("taskStatus", "assigned");
        assignmentState.setText(taskStatus.replace('-', ' ').toUpperCase());
        assignmentState.setTextColor(ECO);
        assignmentTitle.setText(task.optString("title", "Assigned Work Package"));

        JSONObject workPackage = task.optJSONObject("workPackage");
        JSONArray packageItems = workPackage == null ? null : workPackage.optJSONArray("packageItems");
        int packageCount = packageItems == null ? 0 : packageItems.length();
        int checklistCount = 0;
        if (packageItems != null) {
            for (int i = 0; i < packageItems.length(); i++) {
                JSONObject item = packageItems.optJSONObject(i);
                if (item != null && "checklist".equals(item.optString("kind"))) checklistCount++;
            }
        }

        assignmentMeta.setText("e-SAFE Catania · " + packageCount + " item(s) · " + checklistCount + " checklist(s)");
        assignmentItems.setText(count > 1
                ? "This is your next Work Package. " + (count - 1) + " more assignment(s) are waiting in Work Inbox."
                : "This is your current canonical assignment. Open it to Start, add Evidence or Finish → Approval.");
    }

    private LinearLayout toolCard(String title, String subtitle, Runnable action) {
        LinearLayout card = panel(SURFACE_ALT, 14);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(14), dp(14), dp(14), dp(14));
        card.setMinimumHeight(dp(92));
        card.setOnClickListener(v -> action.run());
        card.setClickable(true);
        card.setFocusable(true);

        card.addView(text(title, 14, TEXT, true), fullWidthWrap());
        TextView secondary = text(subtitle, 11, MUTED, false);
        secondary.setPadding(0, dp(5), 0, 0);
        card.addView(secondary, fullWidthWrap());
        return card;
    }

    private Button navButton(String label, Runnable action, boolean active) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(10);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(active ? ECO : MUTED);
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setMinHeight(dp(48));
        button.setMinimumHeight(dp(48));
        button.setPadding(dp(2), dp(5), dp(2), dp(5));
        button.setOnClickListener(v -> action.run());
        return button;
    }

    private Button actionButton(String label, boolean primary) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(12);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(primary ? Color.rgb(9, 24, 14) : TEXT);
        button.setPadding(dp(10), dp(10), dp(10), dp(10));
        button.setBackground(rounded(primary ? ECO : SURFACE_ALT, 12, primary ? ECO : Color.rgb(45, 66, 55)));
        return button;
    }

    private TextView pill(String value, int textColor, int backgroundColor) {
        TextView view = text(value, 10, textColor, true);
        view.setGravity(Gravity.CENTER);
        view.setPadding(dp(10), dp(5), dp(10), dp(5));
        view.setBackground(rounded(backgroundColor, 99, backgroundColor));
        return view;
    }

    private LinearLayout panel(int color, int radiusDp) {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackground(rounded(color, radiusDp, Color.rgb(44, 62, 52)));
        panel.setElevation(dp(2));
        return panel;
    }

    private GradientDrawable rounded(int fill, int radiusDp, int stroke) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radiusDp));
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        return view;
    }

    private void openNexusProjectWorld() {
        openNexusPath("/project-worlds/esafe");
    }

    private void openNexusPath(String path) {
        String origin = configuredNexusOrigin();
        if (origin.isEmpty()) {
            Toast.makeText(this, "Nexus web origin is not configured. Build remains fail-closed.", Toast.LENGTH_LONG).show();
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

    private void openCanonicalWorkInbox() {
        Intent intent = new Intent(this, WorkInboxActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }

    private void openEvidenceCapture() {
        startActivity(new Intent(this, CloudEvidenceShortcutActivity.class));
    }

    private void showPending(String surface) {
        Toast.makeText(this, surface + " projection is not wired yet. No synthetic data was created.", Toast.LENGTH_LONG).show();
    }

    private LinearLayout.LayoutParams weightedCard(boolean right) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        if (right) params.setMargins(dp(8), 0, 0, 0);
        return params;
    }

    private LinearLayout.LayoutParams weightedButton() {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
    }

    private LinearLayout.LayoutParams navWeight() {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
    }

    private LinearLayout.LayoutParams fullWidthWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams wrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
