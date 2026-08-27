package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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

/** NON_PRODUCTION one-paste bootstrap for protected Core staging. */
public final class IdentityClaimActivity extends Activity {
    private static final int BG = Color.rgb(8, 15, 12);
    private static final int SURFACE = Color.rgb(17, 30, 24);
    private static final int SURFACE_ALT = Color.rgb(23, 40, 32);
    private static final int TEXT = Color.rgb(238, 244, 239);
    private static final int MUTED = Color.rgb(153, 169, 158);
    private static final int ECO = Color.rgb(111, 196, 137);
    private static final int ECO_DARK = Color.rgb(20, 48, 31);
    private static final int WARN = Color.rgb(255, 218, 120);
    private static final String BOOTSTRAP_PREFIX = "NEXUS-STAGING-v1";
    private static final long GATE_TIMEOUT_MS = 20_000L;

    private final Handler handler = new Handler(Looper.getMainLooper());

    private EditText bootstrapField;
    private TextView sessionPill;
    private TextView status;
    private Button bootstrapButton;
    private Button continueButton;
    private WebView gateWebView;

    private String targetOrigin = "";
    private String targetHost = "";
    private String pendingClaim = "";
    private Runnable gateTimeout;

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
        if (gateTimeout != null) handler.removeCallbacks(gateTimeout);
        pendingClaim = "";
        if (gateWebView != null) {
            gateWebView.stopLoading();
            gateWebView.destroy();
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
                "Copy one temporary bootstrap block from ChatGPT and tap Paste & Connect. The app establishes the protected Vercel cookie invisibly, consumes the one-time Person claim and opens Worker Home.",
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

        LinearLayout bootstrapCard = panel(SURFACE, 18);
        bootstrapCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout.LayoutParams bootstrapParams = fullWidthWrap();
        bootstrapParams.setMargins(0, dp(14), 0, 0);
        root.addView(bootstrapCard, bootstrapParams);

        bootstrapCard.addView(text("ONE-TIME STAGING BOOTSTRAP", 10, MUTED, true), fullWidthWrap());
        TextView bootstrapHelp = text(
                "Expected format: NEXUS-STAGING-v1 + fresh Vercel share link + one-time Person claim. None of those values are written to Android storage.",
                12,
                MUTED,
                false
        );
        bootstrapHelp.setPadding(0, dp(6), 0, dp(10));
        bootstrapCard.addView(bootstrapHelp, fullWidthWrap());

        bootstrapField = new EditText(this);
        bootstrapField.setHint("Paste bootstrap block here, or leave empty and tap Paste & Connect");
        bootstrapField.setSingleLine(false);
        bootstrapField.setMinLines(3);
        bootstrapField.setMaxLines(4);
        bootstrapField.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        bootstrapField.setTextColor(TEXT);
        bootstrapField.setHintTextColor(MUTED);
        bootstrapField.setBackground(rounded(SURFACE_ALT, 12, Color.rgb(44, 62, 52)));
        bootstrapField.setPadding(dp(12), dp(12), dp(12), dp(12));
        bootstrapCard.addView(bootstrapField, fullWidthWrap());

        bootstrapButton = actionButton("Paste & Connect", true);
        bootstrapButton.setMinimumHeight(dp(52));
        bootstrapButton.setOnClickListener(v -> pasteAndConnect());
        LinearLayout.LayoutParams connectParams = fullWidthWrap();
        connectParams.setMargins(0, dp(10), 0, 0);
        bootstrapCard.addView(bootstrapButton, connectParams);

        gateWebView = new WebView(this);
        gateWebView.setVisibility(View.INVISIBLE);
        WebSettings settings = gateWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(gateWebView, true);
        gateWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
                boolean allowed = "https".equalsIgnoreCase(uri.getScheme())
                        && (host.equals(targetHost) || host.equals("vercel.com") || host.endsWith(".vercel.com"));
                if (!allowed) failGate("Protected staging redirected outside the expected Vercel flow");
                return !allowed;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                captureGateIfReady(url);
            }
        });
        LinearLayout.LayoutParams hiddenWeb = new LinearLayout.LayoutParams(dp(1), dp(1));
        bootstrapCard.addView(gateWebView, hiddenWeb);

        continueButton = actionButton("Open Worker Home", false);
        continueButton.setMinimumHeight(dp(52));
        continueButton.setOnClickListener(v -> openWorkerHome());
        LinearLayout.LayoutParams continueParams = fullWidthWrap();
        continueParams.setMargins(0, dp(12), 0, 0);
        root.addView(continueButton, continueParams);

        Button clear = actionButton("Clear local staging session", false);
        clear.setMinimumHeight(dp(48));
        clear.setOnClickListener(v -> clearLocal());
        LinearLayout.LayoutParams clearParams = fullWidthWrap();
        clearParams.setMargins(0, dp(8), 0, 0);
        root.addView(clear, clearParams);

        TextView boundary = text(
                "The Vercel share link, Vercel cookie and one-time claim stay in process memory only. Android persists only the opaque Nexus session under Android Keystore. Person, Participation, PermissionGrant, AccessDecision and Work Package authority remain on Nexus Core.",
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

    private void pasteAndConnect() {
        String raw = bootstrapField.getText() == null ? "" : bootstrapField.getText().toString().trim();
        if (raw.isEmpty()) raw = clipboardText();
        bootstrapField.setText("");

        Bootstrap bootstrap = parseBootstrap(raw);
        if (bootstrap == null) {
            Toast.makeText(this, "Copy the complete temporary NEXUS staging bootstrap block", Toast.LENGTH_LONG).show();
            return;
        }
        startGateBootstrap(bootstrap);
    }

    private String clipboardText() {
        try {
            ClipboardManager manager = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            if (manager == null || !manager.hasPrimaryClip()) return "";
            ClipData clip = manager.getPrimaryClip();
            if (clip == null || clip.getItemCount() == 0) return "";
            CharSequence value = clip.getItemAt(0).coerceToText(this);
            return value == null ? "" : value.toString().trim();
        } catch (Exception ignored) {
            return "";
        }
    }

    private Bootstrap parseBootstrap(String raw) {
        if (raw == null || raw.isEmpty()) return null;
        String normalized = raw.replace("\r\n", "\n").replace("\r", "\n").trim();
        String[] lines = normalized.split("\n");
        if (lines.length < 2 || !BOOTSTRAP_PREFIX.equals(lines[0].trim())) return null;

        String share = lines[1].trim();
        String claim = lines.length >= 3 ? lines[2].trim() : "";

        Uri uri;
        try {
            uri = Uri.parse(share);
        } catch (Exception ignored) {
            return null;
        }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        String origin = "https://" + host;
        String shareToken = uri.getQueryParameter("_vercel_share");
        String configured = configuredNexusOrigin();

        if (!"https".equalsIgnoreCase(uri.getScheme())
                || configured.isEmpty()
                || !configured.equals(origin)
                || !NexusStagingVercelGate.isAllowedOrigin(origin)
                || shareToken == null
                || shareToken.length() < 16) {
            return null;
        }

        boolean existingSession = NexusMobileSession.hasSession(this);
        if (!existingSession && (claim.length() < 32 || claim.length() > 200)) return null;
        if (existingSession && !claim.isEmpty() && !"-".equals(claim) && (claim.length() < 32 || claim.length() > 200)) return null;
        return new Bootstrap(share, origin, host, existingSession ? "" : claim);
    }

    private void startGateBootstrap(Bootstrap bootstrap) {
        if (gateTimeout != null) handler.removeCallbacks(gateTimeout);
        NexusStagingVercelGate.clear();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();

        targetOrigin = bootstrap.origin;
        targetHost = bootstrap.host;
        pendingClaim = bootstrap.claim;

        bootstrapButton.setEnabled(false);
        continueButton.setEnabled(false);
        status.setText("Establishing protected staging access…");
        status.setTextColor(WARN);

        gateTimeout = () -> {
            if (!NexusStagingVercelGate.isReady()) {
                failGate("Temporary staging share link was not accepted or has expired");
            }
        };
        handler.postDelayed(gateTimeout, GATE_TIMEOUT_MS);
        gateWebView.loadUrl(bootstrap.shareUrl);
    }

    private void captureGateIfReady(String pageUrl) {
        if (targetOrigin.isEmpty()) return;
        Uri uri;
        try {
            uri = Uri.parse(pageUrl);
        } catch (Exception ignored) {
            return;
        }
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (!host.equals(targetHost)) return;

        String cookie = CookieManager.getInstance().getCookie(targetOrigin);
        if (cookie == null || cookie.trim().isEmpty()) return;
        if (!NexusStagingVercelGate.set(targetOrigin, cookie)) return;

        if (gateTimeout != null) handler.removeCallbacks(gateTimeout);
        gateWebView.stopLoading();
        gateWebView.loadUrl("about:blank");
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();

        status.setText("Protected staging access READY");
        status.setTextColor(ECO);

        if (NexusMobileSession.hasSession(this)) {
            pendingClaim = "";
            refreshState();
            openWorkerHome();
            return;
        }

        String claim = pendingClaim;
        pendingClaim = "";
        if (claim.length() < 32 || claim.length() > 200) {
            failGate("One-time Person claim is missing from the bootstrap");
            return;
        }
        submitDeviceLogin(claim);
    }

    private void submitDeviceLogin(String code) {
        bootstrapButton.setEnabled(false);
        status.setText("Creating canonical Nexus staging session…");
        status.setTextColor(WARN);

        NexusStagingDeviceLoginClient.login(
                getApplicationContext(),
                code,
                (success, httpStatus, message) -> runOnUiThread(() -> {
                    status.setText(message);
                    Toast.makeText(this, message, success ? Toast.LENGTH_SHORT : Toast.LENGTH_LONG).show();
                    if (!success) NexusStagingVercelGate.clear();
                    refreshState();
                    if (success) openWorkerHome();
                })
        );
    }

    private void failGate(String message) {
        if (gateTimeout != null) handler.removeCallbacks(gateTimeout);
        pendingClaim = "";
        targetOrigin = "";
        targetHost = "";
        NexusStagingVercelGate.clear();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        if (gateWebView != null) {
            gateWebView.stopLoading();
            gateWebView.loadUrl("about:blank");
        }
        status.setText(message);
        status.setTextColor(WARN);
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        refreshState();
    }

    private void refreshState() {
        if (status == null || bootstrapButton == null || continueButton == null || sessionPill == null) return;
        boolean gate = NexusStagingVercelGate.isReady();
        boolean session = NexusMobileSession.hasSession(this);

        sessionPill.setText(session ? "SESSION ACTIVE" : gate ? "ACCESS READY" : "ACCESS REQUIRED");
        sessionPill.setTextColor(session || gate ? ECO : WARN);
        sessionPill.setBackground(rounded(session || gate ? ECO_DARK : SURFACE_ALT, 99, session || gate ? ECO_DARK : SURFACE_ALT));

        bootstrapButton.setEnabled(!gate || !session);
        continueButton.setEnabled(gate && session);

        if (session && gate) {
            status.setText("Canonical Nexus session ACTIVE · protected staging access READY");
            status.setTextColor(ECO);
        } else if (session) {
            status.setText("Encrypted Nexus session exists · paste a fresh bootstrap to restore protected staging access");
            status.setTextColor(WARN);
        } else if (!gate) {
            status.setText("Copy one temporary bootstrap block, then tap Paste & Connect");
            status.setTextColor(MUTED);
        }
    }

    private void clearLocal() {
        if (gateTimeout != null) handler.removeCallbacks(gateTimeout);
        pendingClaim = "";
        targetOrigin = "";
        targetHost = "";
        NexusMobileSession.clearSession(this);
        NexusStagingVercelGate.clear();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        refreshState();
    }

    private void openWorkerHome() {
        if (!NexusMobileSession.hasSession(this) || !NexusStagingVercelGate.isReady()) {
            Toast.makeText(this, "Nexus session and protected staging access are both required", Toast.LENGTH_LONG).show();
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

    private static final class Bootstrap {
        final String shareUrl;
        final String origin;
        final String host;
        final String claim;

        Bootstrap(String shareUrl, String origin, String host, String claim) {
            this.shareUrl = shareUrl;
            this.origin = origin;
            this.host = host;
            this.claim = claim;
        }
    }
}
