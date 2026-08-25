package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Nexus-native Evidence landing surface.
 *
 * This activity only presents local status already owned by the existing Android Work Mode
 * and routes into the canonical #96 Cloud Evidence pipeline. No new evidence store, session
 * authority, Project World binding or upload endpoint is created here.
 */
public final class EvidenceHomeActivity extends Activity {
    private static final String PREFS = "nexus_work_mode_v060";
    private static final String PREF_QUEUE = "approvalQueue";
    private static final String HANDOFF_DONE = "HANDED_OFF";
    private static final String EVIDENCE_CONFIRMED = "TRANSFER_CONFIRMED";
    private static final String EVIDENCE_RETRY = "FAILED_RETRYABLE";
    private static final String EVIDENCE_RESELECTION_REQUIRED = "RESELECTION_REQUIRED";

    private static final int BG = Color.rgb(8, 15, 12);
    private static final int SURFACE = Color.rgb(17, 30, 24);
    private static final int SURFACE_ALT = Color.rgb(23, 40, 32);
    private static final int TEXT = Color.rgb(238, 244, 239);
    private static final int MUTED = Color.rgb(153, 169, 158);
    private static final int ECO = Color.rgb(111, 196, 137);
    private static final int ECO_DARK = Color.rgb(20, 48, 31);
    private static final int WARNING = Color.rgb(236, 191, 102);
    private static final int WARNING_DARK = Color.rgb(55, 43, 20);

    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (prefs != null) render();
    }

    private void render() {
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
        shell.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
        ));

        addHeader(content);
        addEvidenceSummary(content);
        addTransferBoundary(content);
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
        row.addView(pill("EVIDENCE", ECO, ECO_DARK), wrap());
        root.addView(row, fullWidthWrap());

        TextView project = text("e-SAFE CATANIA  /  MY WORK", 11, ECO, true);
        project.setPadding(0, dp(18), 0, dp(6));
        root.addView(project, fullWidthWrap());

        root.addView(text("Evidence", 30, TEXT, true), fullWidthWrap());
        TextView subtitle = text(
                "Capture context, confirm the Project World, then transfer only authorised evidence.",
                13,
                MUTED,
                false
        );
        subtitle.setPadding(0, dp(4), 0, dp(16));
        root.addView(subtitle, fullWidthWrap());
    }

    private void addEvidenceSummary(LinearLayout root) {
        EvidenceStats stats = readStats();
        boolean signedIn = NexusMobileSession.hasSession(this);

        LinearLayout card = panel(SURFACE, 18);
        card.setPadding(dp(16), dp(16), dp(16), dp(16));

        card.addView(pill(
                signedIn ? "NEXUS SESSION ACTIVE" : "SIGN-IN REQUIRED",
                signedIn ? ECO : WARNING,
                signedIn ? ECO_DARK : WARNING_DARK
        ), wrap());

        TextView title = text("Evidence queue", 22, TEXT, true);
        title.setPadding(0, dp(14), 0, dp(5));
        card.addView(title, fullWidthWrap());

        card.addView(text(
                stats.ready + " ready  ·  " + stats.confirmed + " confirmed  ·  " + stats.attention + " need attention",
                12,
                MUTED,
                false
        ), fullWidthWrap());

        LinearLayout lifecycle = panel(SURFACE_ALT, 12);
        lifecycle.setPadding(dp(10), dp(10), dp(10), dp(10));
        LinearLayout.LayoutParams lifecycleParams = fullWidthWrap();
        lifecycleParams.setMargins(0, dp(14), 0, dp(12));
        lifecycle.setLayoutParams(lifecycleParams);
        lifecycle.addView(text("WORK PACKAGE  →  EVIDENCE  →  HUMAN APPROVAL", 10, ECO, true), fullWidthWrap());
        TextView lifecycleBody = text(
                "This screen does not invent evidence or assignment state. It only reflects confirmed local handoff state and opens the existing canonical Cloud transfer flow.",
                11,
                MUTED,
                false
        );
        lifecycleBody.setPadding(0, dp(5), 0, 0);
        lifecycle.addView(lifecycleBody, fullWidthWrap());
        card.addView(lifecycle, fullWidthWrap());

        Button queue = actionButton("Open Evidence Queue", true);
        queue.setOnClickListener(v -> openCanonicalEvidenceQueue());
        card.addView(queue, fullWidthWrap());

        Button work = actionButton("Back to Current Work", false);
        work.setOnClickListener(v -> backToWorkerHome());
        LinearLayout.LayoutParams workParams = fullWidthWrap();
        workParams.setMargins(0, dp(8), 0, 0);
        card.addView(work, workParams);

        LinearLayout.LayoutParams cardParams = fullWidthWrap();
        cardParams.setMargins(0, 0, 0, dp(18));
        root.addView(card, cardParams);
    }

    private void addTransferBoundary(LinearLayout root) {
        LinearLayout boundary = panel(SURFACE_ALT, 14);
        boundary.setPadding(dp(14), dp(14), dp(14), dp(14));
        boundary.addView(text("CANONICAL TRANSFER BOUNDARY", 10, ECO, true), fullWidthWrap());
        TextView body = text(
                "Binary upload remains in the existing Nexus Cloud Evidence pipeline. Provider credentials, Person authority and Project World assignment are never created on this screen.",
                11,
                MUTED,
                false
        );
        body.setPadding(0, dp(5), 0, 0);
        boundary.addView(body, fullWidthWrap());
        root.addView(boundary, fullWidthWrap());
    }

    private void addBottomNavigation(LinearLayout shell) {
        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setGravity(Gravity.CENTER);
        nav.setPadding(dp(8), dp(8), dp(8), dp(10));
        nav.setBackgroundColor(SURFACE);

        nav.addView(navButton("WORK", this::backToWorkerHome, false), navWeight());
        nav.addView(navButton("EVIDENCE", this::openCanonicalEvidenceQueue, true), navWeight());
        nav.addView(navButton("INBOX", this::openWorkInbox, false), navWeight());
        nav.addView(navButton("NEXUS", this::backToWorkerHome, false), navWeight());
        shell.addView(nav, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
    }

    private EvidenceStats readStats() {
        EvidenceStats stats = new EvidenceStats();
        try {
            JSONArray queue = new JSONArray(prefs.getString(PREF_QUEUE, "[]"));
            for (int i = 0; i < queue.length(); i++) {
                JSONObject item = queue.optJSONObject(i);
                if (item == null) continue;
                String source = item.optString("source", "");
                if (!("PHOTO".equals(source) || "DOCUMENT".equals(source))) continue;
                if (!HANDOFF_DONE.equals(item.optString("handoffState", ""))) continue;

                String state = item.optString("evidenceTransferState", "");
                if (EVIDENCE_CONFIRMED.equals(state)) stats.confirmed++;
                else if (EVIDENCE_RETRY.equals(state) || EVIDENCE_RESELECTION_REQUIRED.equals(state)) stats.attention++;
                else stats.ready++;
            }
        } catch (Exception ignored) {
            // Presentation only. Canonical transfer screen owns detailed queue error handling.
        }
        return stats;
    }

    private void openCanonicalEvidenceQueue() {
        Intent intent = new Intent(this, CloudEvidenceActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }

    private void backToWorkerHome() {
        Intent intent = new Intent(this, WorkModeHomeActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }

    private void openWorkInbox() {
        Intent intent = new Intent(this, WorkInboxActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
    }

    private Button actionButton(String label, boolean primary) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(12);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(primary ? Color.rgb(9, 24, 14) : TEXT);
        button.setMinimumHeight(dp(50));
        button.setPadding(dp(10), dp(10), dp(10), dp(10));
        button.setBackground(rounded(
                primary ? ECO : SURFACE_ALT,
                12,
                primary ? ECO : Color.rgb(45, 66, 55)
        ));
        return button;
    }

    private Button navButton(String label, Runnable action, boolean active) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(10);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(active ? ECO : MUTED);
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setMinimumHeight(dp(48));
        button.setOnClickListener(v -> action.run());
        return button;
    }

    private TextView pill(String value, int textColor, int backgroundColor) {
        TextView view = text(value, 10, textColor, true);
        view.setGravity(Gravity.CENTER);
        view.setPadding(dp(10), dp(5), dp(10), dp(5));
        view.setBackground(rounded(backgroundColor, 99, backgroundColor));
        return view;
    }

    private LinearLayout panel(int fill, int radiusDp) {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackground(rounded(fill, radiusDp, Color.rgb(44, 62, 52)));
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

    private LinearLayout.LayoutParams fullWidthWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams wrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams navWeight() {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static final class EvidenceStats {
        int ready;
        int confirmed;
        int attention;
    }
}
