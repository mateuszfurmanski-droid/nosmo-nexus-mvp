package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/** NON_PRODUCTION Nexus-native onboarding for the protected Vercel Core staging preview. */
public final class IdentityClaimActivity extends Activity {
    private static final int BG = Color.rgb(8, 15, 12);
    private static final int SURFACE = Color.rgb(17, 30, 24);
    private static final int SURFACE_ALT = Color.rgb(23, 40, 32);
    private static final int TEXT = Color.rgb(238, 244, 239);
    private static final int MUTED = Color.rgb(153, 169, 158);
    private static final int ECO = Color.rgb(111, 196, 137);
    private static final int ECO_DARK = Color.rgb(20, 48, 31);
    private static final int WARN = Color.rgb(255, 218, 120);

    private EditText shareUrl;
    private EditText claimCode;
    private TextView sessionPill;
    private TextView status;
    private Button loginButton;
    private Button continueButton;
    private WebView webView;
    private String targetOrigin = "";
    private String targetHost = "";

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

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
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
                "Open the protected Core preview once, then connect the one-time Person claim. Nexus keeps Person, Participation, permissions and assignment authority on the server.",
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
        status = text("Checking staging transport and encrypted session…", 12, MUTED, false);
        status.setPadding(0, dp(10), 0, 0);
        sessionCard.addView(status, fullWidthWrap());
        root.addView(sessionCard, fullWidthWrap());

        LinearLayout gateCard = panel(SURFACE, 18);
        gateCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout.LayoutParams gateCardParams = fullWidthWrap();
        gateCardParams.setMargins(0, dp(14), 0, 0);
        root.addView(gateCard, gateCardParams);
        gateCard.addView(text("PROTECTED STAGING GATE", 10, MUTED, true), fullWidthWrap());

        TextView gateHelp = text(
                "Paste the temporary Vercel share URL for the validated #177 deployment. The URL and Vercel cookie stay only in process memory and are removed from WebView storage.",
                12,
                MUTED,
                false
        );
        gateHelp.setPadding(0, dp(6), 0, dp(10));
        gateCard.addView(gateHelp, fullWidthWrap());

        shareUrl = new EditText(this);
        shareUrl.setHint("Temporary Vercel share URL");
        shareUrl.setSingleLine(true);
        shareUrl.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        shareUrl.setTextColor(TEXT);
        shareUrl.setHintTextColor(MUTED);
        shareUrl.setBackground(rounded(SURFACE_ALT, 12, Color.rgb(44, 62, 52)));
        shareUrl.setPadding(dp(12), dp(12), dp(12), dp(12));
        shareUrl.setMinHeight(dp(52));
        gateCard.addView(shareUrl, fullWidthWrap());

        Button openGate = actionButton("Open temporary Vercel staging gate", false);
        openGate.setMinimumHeight(dp(52));
        openGate.setOnClickListener(v -> openStagingGate());
        LinearLayout.LayoutParams openGateParams = fullWidthWrap();
        openGateParams.setMargins(0, dp(10), 0, 0);
        gateCard.addView(openGate, openGateParams);

        webView = new WebView(this);
        webView.setVisibility(View.GONE);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
                boolean allowed = "https".equalsIgnoreCase(uri.getScheme())
                        && (host.equals(targetHost) || host.equals("vercel.com") || host.endsWith(".vercel.com"));
                if (!allowed) {
                    Toast.makeText(IdentityClaimActivity.this, "Blocked navigation outside Vercel staging gate", Toast.LENGTH_LONG).show();
                }
                return !allowed;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                captureGateIfReady(url);
            }
        });
        LinearLayout.LayoutParams webParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(320));
        webParams.setMargins(0, dp(8), 0, dp(8));
        gateCard.addView(webView, webParams);

        LinearLayout claimCard = panel(SURFACE, 18);
        claimCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout.LayoutParams claimCardParams = fullWidthWrap();
        claimCardParams.setMargins(0, dp(14), 0, 0);
        root.addView(claimCard, claimCardParams);
        claimCard.addView(text("ONE-TIME PERSON CLAIM", 10, MUTED, true), fullWidthWrap());

        TextView claimHelp = text(
                "The claim is high-entropy, one-time and consumed server-side. Android never writes it to preferences, BuildConfig or logs.",
                12,
                MUTED,
                false
        );
        claimHelp.setPadding(0, dp(6), 0, dp(10));
        claimCard.addView(claimHelp, fullWidthWrap());

        claimCode = new EditText(this);
        claimCode.setHint("One-time staging Person claim");
        claimCode.setSingleLine(true);
        claimCode.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        claimCode.setTextColor(TEXT);
        claimCode.setHintTextColor(MUTED);
        claimCode.setBackground(rounded(SURFACE_ALT, 12, Color.rgb(44, 62, 52)));
        claimCode.setPadding(dp(12), dp(12), dp(12), dp(12));
        claimCode.setMinHeight(dp(52));
        claimCard.addView(claimCode, fullWidthWrap());

        loginButton = actionButton("Create 2-hour Nexus staging session", true);
        loginButton.setMinimumHeight(dp(52));
        loginButton.setEnabled(false);
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

        Button clear = actionButton("Clear staging session + gate", false);
        clear.setMinimumHeight(dp(48));
        clear.setOnClickListener(v -> clearLocal());
        LinearLayout.LayoutParams clearParams = fullWidthWrap();
        clearParams.setMargins(0, dp(8), 0, 0);
        root.addView(clear, clearParams);

        TextView boundary = text(
                "No local Person, Participation, PermissionGrant, AccessDecision or Work Package is created here. Android stores only the opaque Nexus session under the existing Android Keystore key.",
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

    private void openStagingGate() {
        String raw = shareUrl.getText() == null ? "" : shareUrl.getText().toString().trim();
        Uri uri;
        try {
            uri = Uri.parse(raw);
        } catch (Exception ignored) {
            Toast.makeText(this, "Invalid Vercel share URL", Toast.LENGTH_LONG).show();
            return;
        }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        String share = uri.getQueryParameter("_vercel_share");
        String origin = "https://" + host;
        if (!"https".equalsIgnoreCase(uri.getScheme())
                || !NexusStagingVercelGate.isAllowedOrigin(origin)
                || share == null
                || share.length() < 16) {
            Toast.makeText(this, "Use the temporary share URL for NOSMO Nexus Cloud staging", Toast.LENGTH_LONG).show();
            return;
        }

        NexusStagingVercelGate.clear();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        targetHost = host;
        targetOrigin = origin;
        shareUrl.setText("");
        status.setText("Opening protected Vercel staging gate…");
        status.setTextColor(WARN);
        webView.setVisibility(View.VISIBLE);
        webView.loadUrl(raw);
    }

    private void captureGateIfReady(String pageUrl) {
        if (targetOrigin.isEmpty()) return;
        Uri uri = Uri.parse(pageUrl);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (!host.equals(targetHost)) return;

        String cookie = CookieManager.getInstance().getCookie(targetOrigin);
        if (cookie == null || cookie.trim().isEmpty()) return;

        NexusStagingVercelGate.set(targetOrigin, cookie);
        if (!NexusStagingVercelGate.isReady()) return;

        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        webView.setVisibility(View.GONE);
        refreshState();
    }

    private void submitDeviceLogin() {
        if (!NexusStagingVercelGate.isReady()) {
            Toast.makeText(this, "Open the Vercel staging gate first", Toast.LENGTH_LONG).show();
            return;
        }
        String code = claimCode.getText() == null ? "" : claimCode.getText().toString().trim();
        if (code.length() < 32 || code.length() > 200) {
            Toast.makeText(this, "Enter the one-time staging claim", Toast.LENGTH_LONG).show();
            return;
        }

        claimCode.setText("");
        loginButton.setEnabled(false);
        status.setText("Creating canonical staging device session…");
        status.setTextColor(WARN);

        NexusStagingDeviceLoginClient.login(
                getApplicationContext(),
                code,
                (success, httpStatus, message) -> runOnUiThread(() -> {
                    status.setText(message);
                    Toast.makeText(this, message, success ? Toast.LENGTH_SHORT : Toast.LENGTH_LONG).show();
                    refreshState();
                    if (success) openWorkerHome();
                })
        );
    }

    private void refreshState() {
        if (status == null || loginButton == null || continueButton == null || sessionPill == null) return;
        boolean gate = NexusStagingVercelGate.isReady();
        boolean session = NexusMobileSession.hasSession(this);

        sessionPill.setText(session ? "SESSION ACTIVE" : gate ? "GATE READY" : "GATE REQUIRED");
        sessionPill.setTextColor(session || gate ? ECO : WARN);
        sessionPill.setBackground(rounded(session || gate ? ECO_DARK : SURFACE_ALT, 99, session || gate ? ECO_DARK : SURFACE_ALT));

        loginButton.setEnabled(gate && !session);
        continueButton.setEnabled(gate && session);

        if (session && gate) {
            status.setText("Canonical Nexus session ACTIVE · protected staging transport READY");
            status.setTextColor(ECO);
        } else if (session) {
            status.setText("Encrypted Nexus session exists · reopen the temporary Vercel gate after process restart");
            status.setTextColor(WARN);
        } else if (gate) {
            status.setText("Protected staging transport READY · enter the one-time Person claim");
            status.setTextColor(ECO);
        } else {
            status.setText("Open the temporary Vercel staging gate first");
            status.setTextColor(MUTED);
        }
    }

    private void clearLocal() {
        NexusMobileSession.clearSession(this);
        NexusStagingVercelGate.clear();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        targetOrigin = "";
        targetHost = "";
        refreshState();
    }

    private void openWorkerHome() {
        if (!NexusMobileSession.hasSession(this) || !NexusStagingVercelGate.isReady()) {
            Toast.makeText(this, "Nexus session and staging gate are both required", Toast.LENGTH_LONG).show();
            refreshState();
            return;
        }
        android.content.Intent intent = new android.content.Intent(this, WorkModeHomeActivity.class);
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
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
