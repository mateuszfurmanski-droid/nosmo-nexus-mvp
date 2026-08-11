package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private TextView statusView;
    private boolean workMode = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(3, 4, 7));
        getWindow().setNavigationBarColor(Color.rgb(3, 4, 7));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(48), dp(24), dp(24));
        root.setBackgroundColor(Color.rgb(3, 4, 7));

        TextView brand = new TextView(this);
        brand.setText("NEXUS");
        brand.setTextColor(Color.rgb(245, 196, 0));
        brand.setTextSize(18);
        brand.setGravity(Gravity.CENTER);
        brand.setLetterSpacing(0.18f);
        brand.setTypeface(null, 1);
        root.addView(brand, fullWidth(dp(48)));

        TextView title = new TextView(this);
        title.setText("Native Android diagnostic");
        title.setTextColor(Color.WHITE);
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(null, 1);
        root.addView(title, fullWidth(dp(72)));

        TextView body = new TextView(this);
        body.setText("If you can see this screen, the Android launcher and pure native runtime are working. Expo / React Native is not involved in this build.");
        body.setTextColor(Color.rgb(190, 201, 214));
        body.setTextSize(16);
        body.setGravity(Gravity.CENTER);
        body.setLineSpacing(0f, 1.2f);
        root.addView(body, fullWidth(dp(120)));

        statusView = new TextView(this);
        statusView.setText("STATUS: NATIVE BOOT OK");
        statusView.setTextColor(Color.rgb(72, 232, 185));
        statusView.setTextSize(15);
        statusView.setGravity(Gravity.CENTER);
        statusView.setTypeface(null, 1);
        root.addView(statusView, fullWidth(dp(64)));

        Button workModeButton = button("TEST WORK MODE");
        workModeButton.setOnClickListener(v -> {
            workMode = !workMode;
            statusView.setText(workMode ? "STATUS: WORK MODE ON" : "STATUS: NATIVE BOOT OK");
            Toast.makeText(this, workMode ? "NEXUS Work Mode ON" : "Work Mode OFF", Toast.LENGTH_SHORT).show();
        });
        root.addView(workModeButton, fullWidth(dp(58)));

        Button nexusButton = button("OPEN NEXUS WEBSITE");
        nexusButton.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://nosmotechnology.co.uk/nexus.html"));
            startActivity(intent);
        });
        root.addView(nexusButton, fullWidth(dp(58)));

        TextView footer = new TextView(this);
        footer.setText("Build 0.4.0-native · no Expo · no React Native · no device permissions");
        footer.setTextColor(Color.rgb(112, 126, 142));
        footer.setTextSize(12);
        footer.setGravity(Gravity.CENTER);
        root.addView(footer, fullWidth(dp(72)));

        setContentView(root);
        root.postDelayed(() -> Toast.makeText(this, "NEXUS native Android is running", Toast.LENGTH_LONG).show(), 400);
    }

    private Button button(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextColor(Color.rgb(3, 4, 7));
        button.setTextSize(14);
        button.setTypeface(null, 1);
        button.setBackgroundColor(Color.rgb(245, 196, 0));
        button.setAllCaps(false);
        return button;
    }

    private LinearLayout.LayoutParams fullWidth(int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                height
        );
        params.setMargins(0, dp(8), 0, dp(8));
        return params;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
