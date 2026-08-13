package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class PersonalCloudPickerActivity extends Activity {
    private static final int REQ_PERSONAL_CLOUD = 72;
    private static final String PREFS = "nexus_work_mode";
    private static final String TARGET_PATH = "My Drive / NOSMO / 03_NEXUS / 00_NEXUS_PERSONAL_CLOUD";

    private static final int BG = Color.rgb(3, 4, 7);
    private static final int PANEL = Color.rgb(13, 22, 35);
    private static final int GOLD = Color.rgb(245, 196, 0);
    private static final int TEXT = Color.rgb(245, 248, 251);
    private static final int MUTED = Color.rgb(174, 184, 202);
    private static final int CYAN = Color.rgb(67, 217, 255);

    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(BG);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        setContentView(buildView());
    }

    private ScrollView buildView() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(28), dp(20), dp(28));
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        scroll.addView(root, new ScrollView.LayoutParams(ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));

        TextView brand = text("N E X U S", 20, GOLD, true);
        brand.setGravity(Gravity.CENTER);
        brand.setLetterSpacing(0.14f);
        root.addView(brand, fullWidth(dp(62)));

        TextView title = text("AUTHORISE DRIVE FOLDER", 27, TEXT, true);
        title.setGravity(Gravity.CENTER);
        root.addView(title, fullWidthWrap());

        root.addView(panelText("This screen is for permission. It must open the Android system folder picker with USE THIS FOLDER. It is not the normal Google Drive app."), fullWidthWrap());

        root.addView(panelText("Choose exactly:\n" + TARGET_PATH + "\n\nIf you see local phone storage first, open the left menu, choose Google Drive / My Drive, then browse to the NOSMO folder."), fullWidthWrap());

        String connectedTree = prefs.getString("personalCloudTree", "");
        if (!connectedTree.isEmpty()) {
            root.addView(panelText("CONNECTED SAF TREE:\n" + connectedTree), fullWidthWrap());
        }

        Button picker = primaryButton(connectedTree.isEmpty()
                ? "OPEN SYSTEM PICKER · THEN USE THIS FOLDER"
                : "RE-AUTHORISE PERSONAL CLOUD FOLDER");
        picker.setOnClickListener(v -> openTreePicker());
        root.addView(picker, fullWidth(dp(72)));

        Button scan = secondaryButton("CONTINUE TO SCAN + COPY");
        scan.setOnClickListener(v -> startActivity(new Intent(this, AutoDiscoveryActivity.class)));
        root.addView(scan, fullWidth(dp(58)));

        Button back = secondaryButton("BACK TO NEXUS SHELL");
        back.setOnClickListener(v -> finish());
        root.addView(back, fullWidth(dp(58)));

        TextView footer = text("NEXUS stores the selected SAF tree permission only. Originals stay where they are. Full Google Drive crawling still needs the future OAuth/API connector.", 11, MUTED, false);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(dp(6), dp(18), dp(6), dp(8));
        root.addView(footer, fullWidthWrap());

        return scroll;
    }

    private void openTreePicker() {
        Toast.makeText(this, "Choose Google Drive / My Drive, then NOSMO / 03_NEXUS / 00_NEXUS_PERSONAL_CLOUD", Toast.LENGTH_LONG).show();
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.putExtra("android.content.extra.SHOW_ADVANCED", true);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, REQ_PERSONAL_CLOUD);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_PERSONAL_CLOUD) return;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            Toast.makeText(this, "Drive folder not authorised", Toast.LENGTH_LONG).show();
            setContentView(buildView());
            return;
        }
        Uri tree = data.getData();
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try {
            getContentResolver().takePersistableUriPermission(tree, flags);
        } catch (Exception ignored) { }
        String documentId = "";
        try { documentId = DocumentsContract.getTreeDocumentId(tree); } catch (Exception ignored) { }
        prefs.edit()
                .putString("personalCloudTree", tree.toString())
                .putString("personalCloudTreeDocumentId", documentId)
                .apply();
        Toast.makeText(this, "Google Drive Personal Cloud authorised", Toast.LENGTH_LONG).show();
        startActivity(new Intent(this, AutoDiscoveryActivity.class));
        finish();
    }

    private TextView panelText(String value) {
        TextView view = text(value, 14, MUTED, false);
        view.setLineSpacing(0f, 1.14f);
        view.setPadding(dp(14), dp(14), dp(14), dp(14));
        view.setBackground(tileBackground(PANEL, 0));
        return view;
    }

    private Button primaryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(Color.rgb(5, 7, 11));
        button.setTextSize(13);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setAllCaps(false);
        button.setBackground(tileBackground(GOLD, 0));
        return button;
    }

    private Button secondaryButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(TEXT);
        button.setTextSize(13);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setAllCaps(false);
        button.setBackground(tileBackground(PANEL, CYAN));
        return button;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(color);
        view.setTextSize(size);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private GradientDrawable tileBackground(int fill, int stroke) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(2));
        if (stroke != 0) drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private LinearLayout.LayoutParams fullWidth(int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, height);
        params.setMargins(0, dp(8), 0, dp(8));
        return params;
    }

    private LinearLayout.LayoutParams fullWidthWrap() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(8), 0, dp(8));
        return params;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
