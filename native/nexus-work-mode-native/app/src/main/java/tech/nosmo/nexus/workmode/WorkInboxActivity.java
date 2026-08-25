package tech.nosmo.nexus.workmode;

import android.app.Activity;
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
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/** Recipient projection for canonical Nexus Work Packages. No local assignment authority. */
public final class WorkInboxActivity extends Activity {
    private static final int BG = Color.rgb(8, 15, 12);
    private static final int SURFACE = Color.rgb(17, 30, 24);
    private static final int SURFACE_ALT = Color.rgb(23, 40, 32);
    private static final int TEXT = Color.rgb(238, 244, 239);
    private static final int MUTED = Color.rgb(153, 169, 158);
    private static final int ECO = Color.rgb(111, 196, 137);
    private static final int ECO_DARK = Color.rgb(20, 48, 31);
    private static final int WARNING = Color.rgb(236, 191, 102);
    private static final int ERROR = Color.rgb(240, 137, 137);

    private LinearLayout list;
    private TextView status;
    private Button refresh;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        renderShell();
        refreshInbox();
    }

    private void renderShell() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(18), dp(18), dp(28));
        root.setBackgroundColor(BG);

        LinearLayout brandRow = new LinearLayout(this);
        brandRow.setOrientation(LinearLayout.HORIZONTAL);
        brandRow.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout brand = new LinearLayout(this);
        brand.setOrientation(LinearLayout.VERTICAL);
        brand.addView(text("NOSMO", 10, MUTED, true), wrap());
        brand.addView(text("NEXUS", 18, TEXT, true), wrap());
        brandRow.addView(brand, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        brandRow.addView(pill("MY WORK", ECO, ECO_DARK), wrap());
        root.addView(brandRow, fullWidthWrap());

        TextView scope = text("e-SAFE CATANIA  /  RECIPIENT PROJECTION", 11, ECO, true);
        scope.setPadding(0, dp(18), 0, dp(6));
        root.addView(scope, fullWidthWrap());

        root.addView(text("Work Inbox", 30, TEXT, true), fullWidthWrap());

        TextView intro = text("Work Packages assigned to the bound Person, read directly from Nexus Core.", 13, MUTED, false);
        intro.setPadding(0, dp(4), 0, dp(12));
        root.addView(intro, fullWidthWrap());

        status = text("Loading canonical assignment…", 11, ECO, true);
        status.setPadding(0, 0, 0, dp(10));
        root.addView(status, fullWidthWrap());

        refresh = actionButton("Refresh from Project Memory", false);
        refresh.setOnClickListener(v -> refreshInbox());
        root.addView(refresh, fullWidthWrap());

        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(0, dp(10), 0, 0);
        root.addView(list, fullWidthWrap());

        TextView boundary = text(
                "No local Work Package store. Person binding, participation, permissions and semantic authority are resolved by Nexus Core on every operation.",
                10,
                MUTED,
                false
        );
        boundary.setGravity(Gravity.CENTER);
        boundary.setPadding(dp(8), dp(16), dp(8), 0);
        root.addView(boundary, fullWidthWrap());

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.setFillViewport(true);
        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        setContentView(scroll);
    }

    private void refreshInbox() {
        setBusy(true, "Resolving bound Person and Work Inbox…");
        NexusCoreWorkClient.loadInbox(this, configuredNexusOrigin(), (success, httpStatus, message, payload) ->
                runOnUiThread(() -> {
                    setBusy(false, message);
                    if (!success || payload == null) {
                        list.removeAllViews();
                        TextView error = text(message, 12, ERROR, true);
                        error.setPadding(0, dp(10), 0, dp(10));
                        list.addView(error, fullWidthWrap());
                        return;
                    }
                    renderInbox(payload);
                })
        );
    }

    private void renderInbox(JSONObject payload) {
        list.removeAllViews();
        String version = payload.optString("version", "unversioned");
        JSONArray tasks = payload.optJSONArray("tasks");
        int count = tasks == null ? 0 : tasks.length();
        status.setText("Project Memory " + version + "  ·  " + count + " assignment(s)");

        if (count == 0) {
            LinearLayout empty = panel(SURFACE, 16);
            empty.setPadding(dp(16), dp(18), dp(16), dp(18));
            empty.addView(pill("NO ASSIGNMENT", WARNING, Color.rgb(55, 43, 20)), wrap());
            TextView title = text("Nothing assigned right now", 19, TEXT, true);
            title.setPadding(0, dp(12), 0, dp(5));
            empty.addView(title, fullWidthWrap());
            empty.addView(text("When a manager assigns a canonical Work Package, it appears here automatically.", 12, MUTED, false), fullWidthWrap());
            list.addView(empty, fullWidthWrap());
            return;
        }

        for (int i = 0; i < count; i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task != null) {
                LinearLayout.LayoutParams params = fullWidthWrap();
                params.setMargins(0, dp(5), 0, dp(7));
                list.addView(renderTask(task), params);
            }
        }
    }

    private LinearLayout renderTask(JSONObject task) {
        LinearLayout card = panel(SURFACE, 18);
        card.setPadding(dp(16), dp(16), dp(16), dp(16));

        String taskId = task.optString("id", "");
        String taskStatus = task.optString("taskStatus", "unknown");

        LinearLayout stateRow = new LinearLayout(this);
        stateRow.setOrientation(LinearLayout.HORIZONTAL);
        stateRow.setGravity(Gravity.CENTER_VERTICAL);
        stateRow.addView(pill(taskStatus.replace('-', ' ').toUpperCase(), ECO, ECO_DARK), wrap());
        card.addView(stateRow, fullWidthWrap());

        TextView title = text(task.optString("title", "Work Package"), 21, TEXT, true);
        title.setPadding(0, dp(12), 0, dp(4));
        card.addView(title, fullWidthWrap());

        JSONObject workPackage = task.optJSONObject("workPackage");
        JSONArray packageItems = workPackage == null ? null : workPackage.optJSONArray("packageItems");
        JSONArray checklistIds = new JSONArray();
        int itemCount = packageItems == null ? 0 : packageItems.length();

        TextView packageMeta = text(itemCount + " Work Package item(s)", 11, MUTED, true);
        packageMeta.setPadding(0, 0, 0, dp(8));
        card.addView(packageMeta, fullWidthWrap());

        if (packageItems != null) {
            for (int index = 0; index < packageItems.length(); index++) {
                JSONObject item = packageItems.optJSONObject(index);
                if (item == null) continue;
                String kind = item.optString("kind", "item");
                String label = item.optString("label", "Work item");
                card.addView(packageItem(kind, label), fullWidthWrap());
                if ("checklist".equals(kind)) checklistIds.put(item.optString("id", "item-" + index));
            }
        }

        LinearLayout actionBlock = new LinearLayout(this);
        actionBlock.setOrientation(LinearLayout.VERTICAL);
        actionBlock.setPadding(0, dp(12), 0, 0);

        Button start = actionButton("Start work", true);
        start.setEnabled("todo".equals(taskStatus));
        start.setAlpha(start.isEnabled() ? 1f : 0.45f);
        start.setOnClickListener(v -> runTaskAction(
                "Starting Work Package…",
                callback -> NexusCoreWorkClient.startTask(this, configuredNexusOrigin(), taskId, callback)
        ));
        actionBlock.addView(start, fullWidthWrap());

        Button evidence = actionButton("Add evidence confirmation", false);
        evidence.setEnabled("in-progress".equals(taskStatus) || "blocked".equals(taskStatus));
        evidence.setAlpha(evidence.isEnabled() ? 1f : 0.45f);
        evidence.setOnClickListener(v -> runTaskAction(
                "Persisting Evidence…",
                callback -> NexusCoreWorkClient.addEvidence(this, configuredNexusOrigin(), taskId, callback)
        ));
        LinearLayout.LayoutParams evidenceParams = fullWidthWrap();
        evidenceParams.setMargins(0, dp(7), 0, 0);
        actionBlock.addView(evidence, evidenceParams);

        Button finish = actionButton("Finish work  →  human approval", false);
        finish.setEnabled("in-progress".equals(taskStatus));
        finish.setAlpha(finish.isEnabled() ? 1f : 0.45f);
        finish.setOnClickListener(v -> runTaskAction(
                "Finishing Work Package and requesting Approval…",
                callback -> NexusCoreWorkClient.finishTask(this, configuredNexusOrigin(), taskId, checklistIds, callback)
        ));
        LinearLayout.LayoutParams finishParams = fullWidthWrap();
        finishParams.setMargins(0, dp(7), 0, 0);
        actionBlock.addView(finish, finishParams);

        card.addView(actionBlock, fullWidthWrap());

        if ("ready-for-review".equals(taskStatus)) {
            TextView pending = text("Human approval pending. Worker cannot self-approve.", 11, WARNING, true);
            pending.setPadding(0, dp(10), 0, 0);
            card.addView(pending, fullWidthWrap());
        }

        return card;
    }

    private LinearLayout packageItem(String kind, String label) {
        LinearLayout row = panel(SURFACE_ALT, 12);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setPadding(dp(11), dp(9), dp(11), dp(9));

        TextView kindView = text(kind.toUpperCase(), 9, ECO, true);
        row.addView(kindView, fullWidthWrap());
        TextView labelView = text(label, 12, TEXT, false);
        labelView.setPadding(0, dp(2), 0, 0);
        row.addView(labelView, fullWidthWrap());

        LinearLayout.LayoutParams params = fullWidthWrap();
        params.setMargins(0, dp(4), 0, dp(4));
        row.setLayoutParams(params);
        return row;
    }

    private interface ActionStarter {
        void start(NexusCoreWorkClient.Callback callback);
    }

    private void runTaskAction(String pendingMessage, ActionStarter starter) {
        setBusy(true, pendingMessage);
        starter.start((success, httpStatus, message, payload) -> runOnUiThread(() -> {
            setBusy(false, message);
            Toast.makeText(this, message, success ? Toast.LENGTH_SHORT : Toast.LENGTH_LONG).show();
            if (success) refreshInbox();
        }));
    }

    private void setBusy(boolean busy, String message) {
        refresh.setEnabled(!busy);
        refresh.setAlpha(busy ? 0.55f : 1f);
        status.setText(message);
        status.setTextColor(busy ? ECO : MUTED);
    }

    private Button actionButton(String label, boolean primary) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(12);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setTextColor(primary ? Color.rgb(9, 24, 14) : TEXT);
        button.setPadding(dp(10), dp(10), dp(10), dp(10));
        button.setBackground(rounded(
                primary ? ECO : SURFACE_ALT,
                12,
                primary ? ECO : Color.rgb(45, 66, 55)
        ));
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

    private String configuredNexusOrigin() {
        String origin = BuildConfig.NEXUS_WEB_ORIGIN == null ? "" : BuildConfig.NEXUS_WEB_ORIGIN.trim();
        while (origin.endsWith("/")) origin = origin.substring(0, origin.length() - 1);
        if (!origin.startsWith("https://")) return "";
        return origin;
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
