package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
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

/** NON_PRODUCTION Nexus-native onboarding for protected Core staging. */
public final class IdentityClaimActivity extends Activity {
    private static final int BG = Color.rgb(8, 15, 12);
    private static final int SURFACE = Color.rgb(17, 30, 24);
    private static final int SURFACE_ALT = Color.rgb(23, 40, 32);
    private static final int TEXT = Color.rgb(238, 244, 239);
    private static final int MUTED = Color.rgb(153, 169, 158);
    private static final int ECO = Color.rgb(111, 196, 137);
    private static final int ECO_DARK = Color.rgb(20, 48, 31);
    private static final int WARN = Color.rgb(255, 218, 120);

    private EditText accessKey;
    private EditText claimCode;
    private TextView sessionPill;
    private TextView status;
    private Button loginButton;
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
        if (status != null) refreshState();
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
        header.addView(pill("STAGING DEVICE", ECO, ECO_DARK), wrap());
        root.addView(header, fullWidthWrap());

        TextView context = text("e-SAFE CATANIA  /  WORKER IDENTITY", 11, ECO, true);
        context.setPadding(0, dp(20), 0, dp(6));
        root.addView(context, fullWidthWrap());

        root.addView(text("Connect this device", 30, TEXT, true), fullWidthWrap());
        TextView intro = text(
                "Enter the temporary staging access key and the one-time Person claim. No Vercel login is required.",
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
        status = text("Checking staging transport and encrypted Nexus session…", 12, MUTED, false);
        status.setPadding(0, dp(10), 0, 0);
        sessionCard.addView(status, fullWidthWrap());
        root.addView(sessionCard, fullWidthWrap());

        LinearLayout accessCard = panel(SURFACE, 18);
        accessCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout.LayoutParams accessParams = fullWidthWrap();
        accessParams.setMargins(0, dp(14), 0, 0);
        root.addView(accessCard, accessParams);

        accessCard.addView(text("STAGING ACCESS", 10, MUTED, true), fullWidthWrap());
        TextView accessHelp = text(
                "Temporary Vercel automation bypass key. It stays only in process memory and is never written to Android storage or Nexus.",
                12,
                MUTED,
                false
        );
        accessHelp.setPadding(0, dp(6), 0, dp(10));
        accessCard.addView(accessHelp, fullWidthWrap());

        accessKey = secureField("Temporary staging access key");
        accessCard.addView(accessKey, fullWidthWrap());

        LinearLayout claimCard = panel(SURFACE, 18);
        claimCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout.LayoutParams claimParams = fullWidthWrap();
        claimParams.setMargins(0, dp(14), 0, 0);
        root.addView(claimCard, claimParams);

        claimCard.addView(text("ONE-TIME PERSON CLAIM", 10, MUTED, true), fullWidthWrap());
        TextView claimHelp = text(
                "The claim is consumed server-side after one successful login and is never persisted on the phone.",
                12,
                MUTED,
                false
        );
        claimHelp.setPadding(0, dp(6), 0, dp(10));
        claimCard.addView(claimHelp, fullWidthWrap());

        claimCode = secureField("One-time Person claim");
        claimCard.addView(claimCode, fullWidthWrap());

        loginButton = actionButton("Connect to Nexus Worker Home", true);
        loginButton.setMinimumHeight(dp(52));
        loginButton.setOnClickListener(v -> submitDeviceLogin());
        LinearLayout.LayoutParams loginParams = fullWidthWrap();
        loginParams.setMargins(0, dp(10), 0, 0);
        claimCard.addView(loginButton, loginParams);

        continueButton = actionButton("Open Worker Home", false);
        continueButton.setMinimumHeight(dp(52));
        continueButton.setOnClickListener(v -> openWorkerHome());
        LinearLayout.LayoutParams continueParams = fullWidthWrap();
        continueParams.setMargins(0, dp(10), 0, 0);
        root.addView(continueButton, continueParams);

        Button clear = actionButton("Clear local staging session", false);
        clear.setMinimumHeight(dp(48));
        clear.setOnClickListener(v -> clearLocal());
        LinearLayout.LayoutParams clearParams = fullWidthWrap();
        clearParams.setMargins(0, dp(8), 0, 0);
        root.addView(clear, clearParams);

        TextView boundary = text(
                "Person, Participation, PermissionGrant, AccessDecision and Work Package authority remain on Nexus Core. Android stores only the opaque Nexus session under Android Keystore.",
                10,
                MUTED,
                false
        );
        boundary.setGravity(Gravity.CENTER);
        boundary.setPadding(dp(8), dp(18), dp(8), 0);
        root.addView(boundary, fullWidthWrap());

        setContentView(scroll);
        refreshState();
    }

    private EditText secureField(String hint) {
        EditText field = new EditText(this);
        field.setHint(hint);
        field.setSingleLine(true);
        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        field.setTextColor(TEXT);
        field.setHintTextColor(MUTED);
        field.setBackground(rounded(SURFACE_ALT, 12, Color.rgb(44, 62, 52)));
        field.setPadding(dp(12), dp(12), dp(12), dp(12));
        field.setMinHeight(dp(52));
        return field;
    }

    private void submitDeviceLogin() {
        String key = accessKey.getText() == null ? "" : accessKey.getText().toString().trim();
        String code = claimCode.getText() == null ? "" : claimCode.getText().toString().trim();
        String origin = configuredNexusOrigin();

        if (origin.isEmpty()) {
            Toast.makeText(this, "Validated staging origin is not configured in this build", Toast.LENGTH_LONG).show();
            return;
        }
        if (key.length() < 16 || key.length() > 512) {
            Toast.makeText(this, "Enter the temporary staging access key", Toast.LENGTH_LONG).show();
            return;
        }
        if (code.length() < 32 || code.length() > 200) {
            Toast.makeText(this, "Enter the one-time Person claim", Toast.LENGTH_LONG).show();
            return;
        }
        if (!NexusStagingVercelGate.set(origin, key)) {
            Toast.makeText(this, "Staging access key/origin rejected locally", Toast.LENGTH_LONG).show();
            return;
        }

        accessKey.setText("");
        claimCode.setText("");
        loginButton.setEnabled(false);
        status.setText("Creating canonical Nexus staging session…");
        status.setTextColor(WARN);

        NexusStagingDeviceLoginClient.login(
                getApplicationContext(),
                code,
                (success, httpStatus, message) -> runOnUiThread(() -> {
                    status.setText(message);
                    Toast.makeText(this, message, success ? Toast.LENGTH_SHORT : Toast.LENGTH_LONG).show();
                    if (!success) {
                        NexusStagingVercelGate.clear();
                    }
                    refreshState();
                    if (success) openWorkerHome();
                })
        );
    }

    private void refreshState() {
        if (status == null || loginButton == null || continueButton == null || sessionPill == null) return;
        boolean gate = NexusStagingVercelGate.isReady();
        boolean session = NexusMobileSession.hasSession(this);

        sessionPill.setText(session ? "SESSION ACTIVE" : gate ? "ACCESS READY" : "ACCESS REQUIRED");
        sessionPill.setTextColor(session || gate ? ECO : WARN);
        sessionPill.setBackground(rounded(session || gate ? ECO_DARK : SURFACE_ALT, 99, session || gate ? ECO_DARK : SURFACE_ALT));

        loginButton.setEnabled(!session);
        continueButton.setEnabled(gate && session);

        if (session && gate) {
            status.setText("Canonical Nexus session ACTIVE · protected staging access READY");
            status.setTextColor(ECO);
        } else if (session) {
            status.setText("Encrypted Nexus session exists · re-enter temporary staging access after process restart");
            status.setTextColor(WARN);
        } else {
            status.setText("Enter staging access key + one-time Person claim");
            status.setTextColor(MUTED);
        }
    }

    private void clearLocal() {
        NexusMobileSession.clearSession(this);
        NexusStagingVercelGate.clear();
        refreshState();
    }

    private void openWorkerHome() {
        if (!NexusMobileSession.hasSession(this) || !NexusStagingVercelGate.isReady()) {
            Toast.makeText(this, "Nexus session and staging access are both required", Toast.LENGTH_LONG).show();
            refreshState();
            return;
        }
        android.content.Intent intent = new android.content.Intent(this, WorkModeHomeActivity.class);
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }

    private String configuredNexusOrigin() {
        String origin = BuildConfig.NEXUS_WEB_ORIGIN == null ? "" : BuildConfig.NEXUS_WEB_ORIGIN.trim();
        while (origin.endsWith("/")) origin = origin.substring(0, origin.length() - 1);
        return NexusStagingVercelGate.isAllowedOrigin(origin) ? origin : "";
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
