package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/** Nexus-native one-time setup for binding an authenticated device to a canonical Person. */
public final class IdentityClaimActivity extends Activity {
    private static final int BG = Color.rgb(8, 15, 12);
    private static final int SURFACE = Color.rgb(17, 30, 24);
    private static final int SURFACE_ALT = Color.rgb(23, 40, 32);
    private static final int TEXT = Color.rgb(238, 244, 239);
    private static final int MUTED = Color.rgb(153, 169, 158);
    private static final int ECO = Color.rgb(111, 196, 137);
    private static final int ECO_DARK = Color.rgb(20, 48, 31);
    private static final int ERROR = Color.rgb(240, 137, 137);

    private EditText claimCode;
    private TextView sessionPill;
    private TextView status;
    private Button claimButton;
    private Button continueButton;

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
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(20), dp(18), dp(28));
        root.setBackgroundColor(BG);
        scroll.addView(root, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout brand = new LinearLayout(this);
        brand.setOrientation(LinearLayout.VERTICAL);
        brand.addView(text("NOSMO", 11, MUTED, true), wrap());
        brand.addView(text("NEXUS", 20, TEXT, true), wrap());
        header.addView(brand, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        header.addView(pill("DEVICE SETUP", ECO, ECO_DARK), wrap());
        root.addView(header, fullWidthWrap());

        TextView context = text("e-SAFE CATANIA  /  WORKER IDENTITY", 11, ECO, true);
        context.setPadding(0, dp(20), 0, dp(6));
        root.addView(context, fullWidthWrap());

        root.addView(text("Connect this device", 30, TEXT, true), fullWidthWrap());
        TextView intro = text(
                "Sign in once, connect this phone to the pre-authorised Nexus Person, then Worker Home can load the real assigned Work Package.",
                13,
                MUTED,
                false
        );
        intro.setPadding(0, dp(5), 0, dp(18));
        root.addView(intro, fullWidthWrap());

        LinearLayout sessionCard = panel(SURFACE, 18);
        sessionCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        sessionCard.addView(text("NEXUS SESSION", 10, MUTED, true), fullWidthWrap());
        sessionPill = pill("CHECKING", MUTED, SURFACE_ALT);
        LinearLayout.LayoutParams pillParams = wrap();
        pillParams.setMargins(0, dp(8), 0, 0);
        sessionCard.addView(sessionPill, pillParams);
        status = text("Checking encrypted mobile session…", 12, MUTED, false);
        status.setPadding(0, dp(10), 0, 0);
        sessionCard.addView(status, fullWidthWrap());
        root.addView(sessionCard, fullWidthWrap());

        Button signIn = actionButton("Sign in to Nexus", true);
        signIn.setMinimumHeight(dp(52));
        signIn.setOnClickListener(v -> beginMobileSignIn());
        LinearLayout.LayoutParams signInParams = fullWidthWrap();
        signInParams.setMargins(0, dp(12), 0, 0);
        root.addView(signIn, signInParams);

        LinearLayout claimCard = panel(SURFACE, 18);
        claimCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout.LayoutParams claimCardParams = fullWidthWrap();
        claimCardParams.setMargins(0, dp(16), 0, 0);
        root.addView(claimCard, claimCardParams);

        claimCard.addView(text("ONE-TIME PERSON CLAIM", 10, MUTED, true), fullWidthWrap());
        TextView claimHelp = text(
                "The claim is issued for the staging Person and e-SAFE Project World. It is sent once and is never stored in Android preferences, BuildConfig or logs.",
                12,
                MUTED,
                false
        );
        claimHelp.setPadding(0, dp(6), 0, dp(10));
        claimCard.addView(claimHelp, fullWidthWrap());

        claimCode = new EditText(this);
        claimCode.setHint("One-time claim code");
        claimCode.setSingleLine(true);
        claimCode.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        claimCode.setTextColor(TEXT);
        claimCode.setHintTextColor(MUTED);
        claimCode.setBackground(rounded(SURFACE_ALT, 12, Color.rgb(44, 62, 52)));
        claimCode.setPadding(dp(12), dp(12), dp(12), dp(12));
        claimCode.setMinHeight(dp(52));
        claimCard.addView(claimCode, fullWidthWrap());

        claimButton = actionButton("Connect to canonical Person", true);
        claimButton.setMinimumHeight(dp(52));
        claimButton.setOnClickListener(v -> submitClaim());
        LinearLayout.LayoutParams claimButtonParams = fullWidthWrap();
        claimButtonParams.setMargins(0, dp(10), 0, 0);
        claimCard.addView(claimButton, claimButtonParams);

        continueButton = actionButton("Open Worker Home", false);
        continueButton.setMinimumHeight(dp(52));
        continueButton.setOnClickListener(v -> openWorkerHome());
        LinearLayout.LayoutParams continueParams = fullWidthWrap();
        continueParams.setMargins(0, dp(10), 0, 0);
        root.addView(continueButton, continueParams);

        TextView boundary = text(
                "Nexus Core remains the authority for Person binding, Project Participation and recipient assignment. This screen cannot create a Person or Work Package locally.",
                10,
                MUTED,
                false
        );
        boundary.setGravity(Gravity.CENTER);
        boundary.setPadding(dp(8), dp(18), dp(8), 0);
        root.addView(boundary, fullWidthWrap());

        setContentView(scroll);
        refreshSessionState();
    }

    private void refreshSessionState() {
        boolean signedIn = NexusMobileSession.hasSession(this);
        sessionPill.setText(signedIn ? "SIGNED IN" : "SIGN IN REQUIRED");
        sessionPill.setTextColor(signedIn ? ECO : ERROR);
        sessionPill.setBackground(rounded(signedIn ? ECO_DARK : SURFACE_ALT, 99, signedIn ? ECO_DARK : SURFACE_ALT));
        status.setText(signedIn
                ? "Encrypted Nexus mobile session is active. Connect the one-time Person claim or continue if this identity is already bound."
                : "No Nexus mobile session on this preview package yet.");
        claimButton.setEnabled(signedIn);
        continueButton.setEnabled(signedIn);
    }

    private void beginMobileSignIn() {
        String origin = configuredNexusOrigin();
        if (origin.isEmpty()) {
            Toast.makeText(this, "Nexus staging origin is not configured in this APK", Toast.LENGTH_LONG).show();
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
            Toast.makeText(this, "Enter the one-time claim code", Toast.LENGTH_LONG).show();
            return;
        }

        claimCode.setText("");
        claimButton.setEnabled(false);
        status.setText("Connecting authenticated session to canonical Person…");

        NexusIdentityClaimClient.claim(
                getApplicationContext(),
                configuredNexusOrigin(),
                code,
                (success, httpStatus, message) -> runOnUiThread(() -> {
                    status.setText(message);
                    Toast.makeText(this, message, success ? Toast.LENGTH_SHORT : Toast.LENGTH_LONG).show();
                    if (success) {
                        openWorkerHome();
                    } else {
                        claimButton.setEnabled(NexusMobileSession.hasSession(this));
                    }
                })
        );
    }

    private void openWorkerHome() {
        Intent intent = new Intent(this, WorkModeHomeActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        finish();
    }

    private String configuredNexusOrigin() {
        String origin = BuildConfig.NEXUS_WEB_ORIGIN == null ? "" : BuildConfig.NEXUS_WEB_ORIGIN.trim();
        while (origin.endsWith("/")) origin = origin.substring(0, origin.length() - 1);
        return origin.startsWith("https://") ? origin : "";
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
