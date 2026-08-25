package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/** Real-device onboarding into an explicitly provisioned canonical Nexus Person. */
public final class IdentityClaimActivity extends Activity {
    private static final int BG = Color.rgb(4, 16, 31);
    private static final int TEXT = Color.rgb(238, 247, 255);
    private static final int MUTED = Color.rgb(153, 181, 207);
    private static final int GREEN = Color.rgb(71, 222, 161);

    private EditText claimCode;
    private TextView status;
    private Button claimButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        render();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (status != null) refreshSessionState();
    }

    private void render() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(22), dp(18), dp(28));
        root.setBackgroundColor(BG);

        TextView title = text("Canonical Nexus identity", 25, TEXT, true);
        root.addView(title, fullWidthWrap());

        TextView body = text(
                "Sign in normally, then enter the one-time claim code issued for this Person. The code is sent once to Nexus Core and is not saved in Android preferences or the APK.",
                12,
                MUTED,
                false
        );
        body.setPadding(0, dp(6), 0, dp(16));
        root.addView(body, fullWidthWrap());

        status = text("Checking Nexus mobile session…", 12, GREEN, true);
        root.addView(status, fullWidthWrap());

        Button signIn = new Button(this);
        signIn.setText("Sign in to Nexus");
        signIn.setAllCaps(false);
        signIn.setOnClickListener(v -> beginMobileSignIn());
        root.addView(signIn, fullWidthWrap());

        claimCode = new EditText(this);
        claimCode.setHint("One-time identity claim code");
        claimCode.setSingleLine(true);
        claimCode.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        claimCode.setTextColor(TEXT);
        claimCode.setHintTextColor(MUTED);
        root.addView(claimCode, fullWidthWrap());

        claimButton = new Button(this);
        claimButton.setText("Bind authenticated session to canonical Person");
        claimButton.setAllCaps(false);
        claimButton.setOnClickListener(v -> submitClaim());
        root.addView(claimButton, fullWidthWrap());

        Button back = new Button(this);
        back.setText("Back to Work Mode");
        back.setAllCaps(false);
        back.setOnClickListener(v -> finish());
        root.addView(back, fullWidthWrap());

        TextView boundary = text(
                "No email/name matching. No Person ID is supplied by the phone. Nexus Core resolves the authenticated provider subject and consumes the pre-authorised claim atomically.",
                10,
                MUTED,
                false
        );
        boundary.setPadding(0, dp(14), 0, 0);
        root.addView(boundary, fullWidthWrap());

        setContentView(root);
        refreshSessionState();
    }

    private void refreshSessionState() {
        boolean signedIn = NexusMobileSession.hasSession(this);
        status.setText(signedIn ? "Nexus mobile session: ACTIVE" : "Nexus mobile session: NOT AUTHENTICATED");
        claimButton.setEnabled(signedIn);
    }

    private void beginMobileSignIn() {
        String origin = configuredNexusOrigin();
        if (origin.isEmpty()) {
            Toast.makeText(this, "Nexus HTTPS origin is not configured in this APK", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            String url = NexusMobileSession.beginAuthorization(this, origin);
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
            NexusMobileSession.clearPendingAuthorization(this);
            Toast.makeText(this, "Could not start Nexus mobile sign-in", Toast.LENGTH_LONG).show();
        }
    }

    private void submitClaim() {
        if (!NexusMobileSession.hasSession(this)) {
            Toast.makeText(this, "Sign in to Nexus first", Toast.LENGTH_LONG).show();
            return;
        }
        String code = claimCode.getText() == null ? "" : claimCode.getText().toString().trim();
        if (code.length() < 32 || code.length() > 200) {
            Toast.makeText(this, "Enter a valid one-time claim code", Toast.LENGTH_LONG).show();
            return;
        }

        // Clear the visible field before network I/O. The claim is intentionally never
        // written to SharedPreferences, logs, intents, BuildConfig or device storage.
        claimCode.setText("");
        claimButton.setEnabled(false);
        status.setText("Binding authenticated session to canonical Person…");

        NexusIdentityClaimClient.claim(
                getApplicationContext(),
                configuredNexusOrigin(),
                code,
                (success, httpStatus, message) -> runOnUiThread(() -> {
                    status.setText(message);
                    Toast.makeText(this, message, success ? Toast.LENGTH_SHORT : Toast.LENGTH_LONG).show();
                    claimButton.setEnabled(NexusMobileSession.hasSession(this) && !success);
                    if (success) {
                        startActivity(new Intent(this, WorkInboxActivity.class));
                        finish();
                    }
                })
        );
    }

    private String configuredNexusOrigin() {
        String origin = BuildConfig.NEXUS_WEB_ORIGIN == null ? "" : BuildConfig.NEXUS_WEB_ORIGIN.trim();
        while (origin.endsWith("/")) origin = origin.substring(0, origin.length() - 1);
        return origin.startsWith("https://") ? origin : "";
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

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
