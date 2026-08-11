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
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class NexusShellActivity extends Activity {
    private static final String VERSION_LABEL = "0.7.0";
    private static final String NEXUS_URL = "https://nosmotechnology.co.uk/nexus.html";
    private static final String TREE_URL = "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree/?world=esafe-demo&project=e-SAFE%20Project%20World&source=android-v070&personalCloud=google-drive&runtime=restored";
    private static final String NEXUS_CLOUD_URL = "https://drive.google.com/drive/folders/1n2E0dlb0W-5Qt2V7q5hjIGdX9T9c8Cs0";
    private static final String PROJECT_WORLDS_URL = "https://drive.google.com/drive/folders/1gCa35DoMCOioIdZbpYETvseEhA_D3n_Q";
    private static final String ESAFE_CATANIA_URL = "https://drive.google.com/drive/folders/1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE";
    private static final String RIVERSIDE_URL = "https://drive.google.com/drive/folders/1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g";
    private static final String ASSET_INDEX_URL = "https://docs.google.com/spreadsheets/d/1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI/edit?usp=drivesdk";
    private static final String ROUTING_RULES_URL = "https://docs.google.com/document/d/1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c/edit?usp=drivesdk";
    private static final String MIGRATION_LOG_URL = "https://docs.google.com/document/d/1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU/edit?usp=drivesdk";

    private static final int BG = Color.rgb(3, 4, 7);
    private static final int PANEL = Color.rgb(10, 15, 24);
    private static final int PANEL_SOFT = Color.rgb(13, 22, 35);
    private static final int GOLD = Color.rgb(245, 196, 0);
    private static final int CYAN = Color.rgb(67, 217, 255);
    private static final int GREEN = Color.rgb(72, 232, 185);
    private static final int TEXT = Color.rgb(245, 248, 251);
    private static final int MUTED = Color.rgb(174, 184, 202);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(BG);
        setContentView(buildShell());
    }

    private View buildShell() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(24), dp(20), dp(28));
        root.setBackgroundColor(BG);
        scroll.addView(root, new ScrollView.LayoutParams(ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));

        addLogoOrWordmark(root);
        addKicker(root, "CONSTRUCTION OPERATING SYSTEM");
        addHero(root);
        addPrimaryActions(root);
        addNexusCloudActions(root);
        addModuleCards(root);
        addBoundaryNote(root);

        return scroll;
    }

    private void addLogoOrWordmark(LinearLayout root) {
        int logoId = getResources().getIdentifier("nexus_logo", "drawable", getPackageName());
        if (logoId != 0) {
            ImageView logo = new ImageView(this);
            logo.setImageResource(logoId);
            logo.setAdjustViewBounds(true);
            logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(118));
            params.setMargins(0, 0, 0, dp(12));
            root.addView(logo, params);
            return;
        }
        TextView brand = text("N E X U S", 31, GOLD, true);
        brand.setGravity(Gravity.CENTER);
        brand.setLetterSpacing(0.12f);
        root.addView(brand, fullWidth(dp(82)));
    }

    private void addHero(LinearLayout root) {
        TextView title = text("One memory for the construction ecosystem.", 31, TEXT, true);
        title.setGravity(Gravity.CENTER);
        title.setLineSpacing(0f, 0.92f);
        root.addView(title, fullWidthWrap());

        TextView intro = text(
                "NEXUS connects phone discovery, Nexus Cloud, Google Drive Project Worlds, e-SAFE Catania, Asset Index and site evidence into one Work Mode shell.",
                15, MUTED, false);
        intro.setGravity(Gravity.CENTER);
        intro.setLineSpacing(0f, 1.16f);
        LinearLayout.LayoutParams introParams = fullWidthWrap();
        introParams.setMargins(0, dp(14), 0, dp(18));
        root.addView(intro, introParams);
    }

    private void addPrimaryActions(LinearLayout root) {
        TextView scan = primaryTile("SCAN PHONE + CONNECTED CLOUD", "Open the native Work Mode scanner and route approved files into Nexus Cloud / Google Drive Personal Cloud.");
        scan.setOnClickListener(v -> startActivity(new Intent(this, AutoDiscoveryActivity.class)));
        root.addView(scan, fullWidth(dp(86)));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.addView(smallAction("PROJECT WORLD", () -> openUrl(TREE_URL)), equalCell());
        row.addView(smallAction("NEXUS CLOUD", () -> openUrl(NEXUS_CLOUD_URL)), equalCell());
        root.addView(row, fullWidth(dp(62)));
    }

    private void addNexusCloudActions(LinearLayout root) {
        addKicker(root, "NEXUS CLOUD / GOOGLE DRIVE");

        TextView summary = text(
                "Canonical cloud map: Project Worlds, e-SAFE Catania, Riverside, Asset Index, Routing Rules and Migration Log.",
                13, MUTED, false);
        summary.setGravity(Gravity.CENTER);
        summary.setLineSpacing(0f, 1.14f);
        root.addView(summary, fullWidthWrap());

        root.addView(actionRow(
                smallAction("PROJECT WORLDS", () -> openUrl(PROJECT_WORLDS_URL)),
                smallAction("e-SAFE CATANIA", () -> openUrl(ESAFE_CATANIA_URL))),
                fullWidth(dp(62)));
        root.addView(actionRow(
                smallAction("RIVERSIDE", () -> openUrl(RIVERSIDE_URL)),
                smallAction("ASSET INDEX", () -> openUrl(ASSET_INDEX_URL))),
                fullWidth(dp(62)));
        root.addView(actionRow(
                smallAction("ROUTING RULES", () -> openUrl(ROUTING_RULES_URL)),
                smallAction("MIGRATION LOG", () -> openUrl(MIGRATION_LOG_URL))),
                fullWidth(dp(62)));
    }

    private void addModuleCards(LinearLayout root) {
        addKicker(root, "NATIVE WORK MODE SHELL");
        root.addView(card(
                "01",
                "e-SAFE Project World",
                "Default active project world. No Tesco default. Other projects stay in review until accepted.",
                GOLD), fullWidthWrap());
        root.addView(card(
                "02",
                "NEXUS CLOUD / GOOGLE DRIVE",
                "Storage Access Framework route into NOSMO / 03_NEXUS / 00_NEXUS_PERSONAL_CLOUD. Full Drive crawling remains OAuth/API work.",
                CYAN), fullWidthWrap());
        root.addView(card(
                "03",
                "e-SAFE-first discovery",
                "Photos, PDF/Office docs and BIM/IFC/drawings are separated into review routes before Project Graph linking.",
                GREEN), fullWidthWrap());
        root.addView(card(
                "04",
                "Asset Index + Routing Rules",
                "Cloud documents become the current map of what exists, where it routes and what must be reviewed before Project Graph linking.",
                CYAN), fullWidthWrap());

        TextView openNexus = secondaryButton("OPEN WEB NEXUS SHELL");
        openNexus.setOnClickListener(v -> openUrl(NEXUS_URL));
        root.addView(openNexus, fullWidth(dp(58)));
    }

    private void addBoundaryNote(LinearLayout root) {
        TextView note = text(
                "Native Android beta " + VERSION_LABEL + " · visual shell restored from the older NEXUS web prototype · Nexus Cloud map connected · originals are not deleted · no WhatsApp/Gmail private database scraping.",
                11, Color.rgb(112, 126, 142), false);
        note.setGravity(Gravity.CENTER);
        note.setLineSpacing(0f, 1.18f);
        note.setPadding(dp(6), dp(20), dp(6), dp(8));
        root.addView(note, fullWidthWrap());
    }

    private LinearLayout actionRow(TextView left, TextView right) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.addView(left, equalCell());
        row.addView(right, equalCell());
        return row;
    }

    private TextView primaryTile(String title, String body) {
        TextView view = text(title + "\n" + body, 14, Color.rgb(5, 7, 11), true);
        view.setGravity(Gravity.CENTER);
        view.setLineSpacing(dp(3), 1.08f);
        view.setPadding(dp(14), dp(10), dp(14), dp(10));
        view.setBackground(tileBackground(GOLD, GOLD, 0));
        return view;
    }

    private TextView smallAction(String label, Runnable action) {
        TextView view = text(label, 12, TEXT, true);
        view.setGravity(Gravity.CENTER);
        view.setPadding(dp(8), 0, dp(8), 0);
        view.setBackground(tileBackground(PANEL_SOFT, CYAN, 1));
        view.setOnClickListener(v -> action.run());
        return view;
    }

    private TextView secondaryButton(String label) {
        TextView view = text(label, 13, TEXT, true);
        view.setGravity(Gravity.CENTER);
        view.setPadding(dp(12), 0, dp(12), 0);
        view.setBackground(tileBackground(PANEL_SOFT, GOLD, 1));
        return view;
    }

    private TextView card(String index, String title, String body, int accent) {
        TextView view = text(index + "  " + title + "\n" + body, 14, TEXT, true);
        view.setLineSpacing(dp(4), 1.06f);
        view.setPadding(dp(16), dp(15), dp(16), dp(15));
        view.setBackground(tileBackground(PANEL, accent, 1));
        return view;
    }

    private void addKicker(LinearLayout root, String value) {
        TextView kicker = text(value, 11, GOLD, true);
        kicker.setGravity(Gravity.CENTER);
        kicker.setLetterSpacing(0.12f);
        LinearLayout.LayoutParams params = fullWidthWrap();
        params.setMargins(0, dp(10), 0, dp(8));
        root.addView(kicker, params);
    }

    private GradientDrawable tileBackground(int fill, int stroke, int strokeWidthDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(2));
        if (strokeWidthDp > 0) drawable.setStroke(dp(strokeWidthDp), stroke);
        return drawable;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(color);
        view.setTextSize(size);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private LinearLayout.LayoutParams fullWidth(int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, height);
        params.setMargins(0, dp(7), 0, dp(7));
        return params;
    }

    private LinearLayout.LayoutParams fullWidthWrap() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(7), 0, dp(7));
        return params;
    }

    private LinearLayout.LayoutParams equalCell() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        params.setMargins(dp(4), 0, dp(4), 0);
        return params;
    }

    private void openUrl(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (Exception e) { Toast.makeText(this, "No browser available", Toast.LENGTH_SHORT).show(); }
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
