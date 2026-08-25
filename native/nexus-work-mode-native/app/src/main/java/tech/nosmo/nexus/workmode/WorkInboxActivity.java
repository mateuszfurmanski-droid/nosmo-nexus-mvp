package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Recipient projection for canonical Nexus Work Packages.
 *
 * The screen owns no assignment state. Refresh always comes from the server-owned
 * Project Memory projection for the Person bound to the existing mobile session.
 */
public final class WorkInboxActivity extends Activity {
    private static final int BG = Color.rgb(4, 16, 31);
    private static final int PANEL = Color.rgb(10, 34, 63);
    private static final int TEXT = Color.rgb(238, 247, 255);
    private static final int MUTED = Color.rgb(153, 181, 207);
    private static final int GREEN = Color.rgb(71, 222, 161);
    private static final int CYAN = Color.rgb(72, 205, 255);

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
        root.setPadding(dp(16), dp(18), dp(16), dp(28));
        root.setBackgroundColor(BG);

        TextView title = text("Work Inbox", 26, TEXT, true);
        root.addView(title, fullWidthWrap());

        TextView scope = text("e-SAFE Catania · authoritative recipient projection", 12, MUTED, false);
        scope.setPadding(0, dp(3), 0, dp(10));
        root.addView(scope, fullWidthWrap());

        status = text("Loading canonical assignment…", 11, CYAN, true);
        status.setPadding(0, 0, 0, dp(10));
        root.addView(status, fullWidthWrap());

        refresh = new Button(this);
        refresh.setText("Refresh from Project Memory");
        refresh.setAllCaps(false);
        refresh.setOnClickListener(v -> refreshInbox());
        root.addView(refresh, fullWidthWrap());

        list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(0, dp(8), 0, 0);
        root.addView(list, fullWidthWrap());

        TextView boundary = text(
                "No local Work Package store. Actor Person, participation, permissions and semantic authority are resolved by Nexus Core on every operation.",
                10,
                MUTED,
                false
        );
        boundary.setPadding(0, dp(14), 0, 0);
        root.addView(boundary, fullWidthWrap());

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.addView(root, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(scroll);
    }

    private void refreshInbox() {
        setBusy(true, "Resolving bound Person and canonical Work Inbox…");
        NexusCoreWorkClient.loadInbox(this, configuredNexusOrigin(), (success, httpStatus, message, payload) ->
                runOnUiThread(() -> {
                    setBusy(false, message);
                    if (!success || payload == null) {
                        list.removeAllViews();
                        list.addView(text(message, 12, Color.rgb(255, 151, 151), true), fullWidthWrap());
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
        status.setText("Projection " + version + " · " + (tasks == null ? 0 : tasks.length()) + " assignment(s)");

        if (tasks == null || tasks.length() == 0) {
            list.addView(text("No work is currently assigned to this bound Person.", 12, MUTED, false), fullWidthWrap());
            return;
        }

        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task != null) list.addView(renderTask(task), fullWidthWrap());
        }
    }

    private LinearLayout renderTask(JSONObject task) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(12), dp(12), dp(12), dp(12));
        card.setBackgroundColor(PANEL);
        LinearLayout.LayoutParams cardParams = fullWidthWrap();
        cardParams.setMargins(0, dp(6), 0, dp(6));
        card.setLayoutParams(cardParams);

        String taskId = task.optString("id", "");
        String taskStatus = task.optString("taskStatus", "unknown");
        card.addView(text(task.optString("title", "Work Package"), 17, TEXT, true), fullWidthWrap());
        card.addView(text("Status: " + taskStatus + " · " + taskId, 10, MUTED, false), fullWidthWrap());

        JSONObject workPackage = task.optJSONObject("workPackage");
        JSONArray packageItems = workPackage == null ? null : workPackage.optJSONArray("packageItems");
        JSONArray checklistIds = new JSONArray();
        if (packageItems != null) {
            for (int index = 0; index < packageItems.length(); index++) {
                JSONObject item = packageItems.optJSONObject(index);
                if (item == null) continue;
                String kind = item.optString("kind", "item");
                String label = item.optString("label", "Work item");
                card.addView(text("• " + kind.toUpperCase() + " — " + label, 12, TEXT, false), fullWidthWrap());
                if ("checklist".equals(kind)) checklistIds.put(item.optString("id", "item-" + index));
            }
        }

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.VERTICAL);
        actions.setPadding(0, dp(8), 0, 0);
        card.addView(actions, fullWidthWrap());

        Button start = actionButton("Start task");
        start.setEnabled("todo".equals(taskStatus));
        start.setOnClickListener(v -> runTaskAction(
                "Starting task…",
                callback -> NexusCoreWorkClient.startTask(this, configuredNexusOrigin(), taskId, callback)
        ));
        actions.addView(start, fullWidthWrap());

        Button evidence = actionButton("Add Android evidence confirmation");
        evidence.setEnabled("in-progress".equals(taskStatus) || "blocked".equals(taskStatus));
        evidence.setOnClickListener(v -> runTaskAction(
                "Persisting Evidence…",
                callback -> NexusCoreWorkClient.addEvidence(this, configuredNexusOrigin(), taskId, callback)
        ));
        actions.addView(evidence, fullWidthWrap());

        Button finish = actionButton("Finish → request human approval");
        finish.setEnabled("in-progress".equals(taskStatus));
        finish.setOnClickListener(v -> runTaskAction(
                "Finishing Work Package and requesting Approval…",
                callback -> NexusCoreWorkClient.finishTask(this, configuredNexusOrigin(), taskId, checklistIds, callback)
        ));
        actions.addView(finish, fullWidthWrap());

        if ("ready-for-review".equals(taskStatus)) {
            TextView pending = text("Human approval pending. Worker cannot self-approve.", 11, Color.rgb(255, 218, 120), true);
            pending.setPadding(0, dp(7), 0, 0);
            actions.addView(pending, fullWidthWrap());
        }

        return card;
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
        status.setText(message);
    }

    private Button actionButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(TEXT);
        button.setBackgroundColor(Color.rgb(18, 55, 91));
        return button;
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

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
