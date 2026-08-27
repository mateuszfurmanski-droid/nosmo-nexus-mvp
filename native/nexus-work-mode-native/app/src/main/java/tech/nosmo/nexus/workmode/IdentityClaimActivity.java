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

/**
 * Nexus-native NON_PRODUCTION device bootstrap.
 *
 * The protected Vercel transport gate remains process-memory only. A one-time
 * claim is consumed server-side and Android persists only the returned opaque
 * Nexus session in the existing Android Keystore-backed slot.
 */
public final class IdentityClaimActivity extends Activity {
    private static final int BG = Color.rgb(8, 15, 12);
    private static final int SURFACE = Color.rgb(17, 30, 24);
    private static final int SURFACE_ALT = Color.rgb(23, 40, 32);
    private static final int TEXT = Color.rgb(238, 244, 239);
    private static final int MUTED = Color.rgb(153, 169, 158);
    private static final int ECO = Color.rgb(111, 196, 137);
    private static final int ECO_DARK = Color.rgb(20, 48, 31);
    private static final int WARN = Color.rgb(236, 195, 104);

    private EditText shareUrl;
    private EditText claimCode;
    private TextView gatePill;
    private TextView sessionPill;
    private TextView status;
    private Button claimButton;
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
        header.addView(pill("PROTECTED STAGING", ECO, ECO_DARK), wrap());
        root.addView(header, fullWidthWrap());

        TextView context = text("e-SAFE CATANIA  /  REAL DEVICE", 11, ECO, true);
        context.setPadding(0, dp(20), 0, dp(6));
        root.addView(context, fullWidthWrap());
        root.addView(text("Connect this Fold", 30, TEXT, true), fullWidthWrap());

        TextView intro = text(
                "Open the validated Nexus staging gate, then use the one-time Person claim. After that Worker Home reads only the canonical Work Package assigned to this Person.",
                13,
                MUTED,
                false
        );
        intro.setPadding(0, dp(5), 0, dp(16));
        root.addView(intro, fullWidthWrap());

        LinearLayout stateCard = panel(SURFACE, 18);
        stateCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout stateRow = new LinearLayout(this);
        stateRow.setOrientation(LinearLayout.HORIZONTAL);
        stateRow.setGravity(Gravity.CENTER_VERTICAL);
        gatePill = pill("GATE CLOSED", WARN, SURFACE_ALT);
        sessionPill = pill("NO SESSION", MUTED, SURFACE_ALT);
        stateRow.addView(gatePill, wrap());
        LinearLayout.LayoutParams sessionParams = wrap();
        sessionParams.setMargins(dp(8), 0, 0, 0);
        stateRow.addView(sessionPill, sessionParams);
        stateCard.addView(stateRow, fullWidthWrap());
        status = text("Protected staging transport is not active yet.", 12, MUTED, false);
        status.setPadding(0, dp(10), 0, 0);
        stateCard.addView(status, fullWidthWrap());
        root.addView(stateCard, fullWidthWrap());

        LinearLayout gateCard = panel(SURFACE, 18);
        gateCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout.LayoutParams gateParams = fullWidthWrap();
        gateParams.setMargins(0, dp(14), 0, 0);
        root.addView(gateCard, gateParams);
        gateCard.addView(text("1  STAGING GATE", 10, MUTED, true), fullWidthWrap());

        shareUrl = new EditText(this);
        shareUrl.setHint("Temporary Vercel share URL");
        shareUrl.setSingleLine(true);
        shareUrl.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        shareUrl.setTextColor(TEXT);
        shareUrl.setHintTextColor(MUTED);
        shareUrl.setBackground(rounded(SURFACE_ALT, 12, Color.rgb(44, 62, 52)));
        shareUrl.setPadding(dp(12), dp(12), dp(12), dp(12));
        shareUrl.setMinHeight(dp(52));
        LinearLayout.LayoutParams inputParams = fullWidthWrap();
        inputParams.setMargins(0, dp(8), 0, 0);
        gateCard.addView(shareUrl, inputParams);

        Button openGate = actionButton("Open protected Nexus staging", true);
        openGate.setMinimumHeight(dp(52));
        openGate.setOnClickListener(v -> openStagingGate());
        LinearLayout.LayoutParams openParams = fullWidthWrap();
        openParams.setMargins(0, dp(10), 0, 0);
        gateCard.addView(openGate, openParams);

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
                    Toast.makeText(IdentityClaimActivity.this, "Navigation outside protected Nexus staging was blocked", Toast.LENGTH_LONG).show();
                }
                return !allowed;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                captureGateIfReady(url);
            }
        });
        LinearLayout.LayoutParams webParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(300));
        webParams.setMargins(0, dp(10), 0, 0);
        gateCard.addView(webView, webParams);

        LinearLayout claimCard = panel(SURFACE, 18);
        claimCard.setPadding(dp(16), dp(16), dp(16), dp(16));
        LinearLayout.LayoutParams claimParams = fullWidthWrap();
        claimParams.setMargins(0, dp(14), 0, 0);
        root.addView(claimCard, claimParams);
        claimCard.addView(text("2  CANONICAL PERSON", 10, MUTED, true), fullWidthWrap());

        TextView help = text(
                "The code is one-time and scoped to this non-production e-SAFE Person. It is never stored in Android preferences, BuildConfig or logs.",
                12,
                MUTED,
                false
        );
        help.setPadding(0, dp(6), 0, dp(10));
        claimCard.addView(help, fullWidthWrap());

        claimCode = new EditText(this);
        claimCode.setHint("One-time Person claim");
        claimCode.setSingleLine(true);
        claimCode.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        claimCode.setTextColor(TEXT);
        claimCode.setHintTextColor(MUTED);
        claimCode.setBackground(rounded(SURFACE_ALT, 12, Color.rgb(44, 62, 52)));
        claimCode.setPadding(dp(12), dp(12), dp(12), dp(12));
        claimCode.setMinHeight(dp(52));
        claimCard.addView(claimCode, fullWidthWrap());

        claimButton = actionButton("Connect this device to Person", true);
        claimButton.setMinimumHeight(dp(52));
        claimButton.setOnClickListener(v -> submitDeviceLogin());
        LinearLayout.LayoutParams claimButtonParams = fullWidthWrap();
        claimButtonParams.setMargins(0, dp(10), 0, 0);
        claimCard.addView(claimButton, claimButtonParams);

        continueButton = actionButton("Open Worker Home", false);
        continueButton.setMinimumHeight(dp(52));
        continueButton.setOnClickListener(v -> openWorkerHome());
        LinearLayout.LayoutParams continueParams = fullWidthWrap();
        continueParams.setMargins(0, dp(14), 0, 0);
        root.addView(continueButton, continueParams);

        Button clear = actionButton("Clear local test session", false);
        clear.setMinimumHeight(dp(48));
        clear.setOnClickListener(v -> {
            NexusMobileSession.clearSession(this);
            NexusStagingVercelGate.clear();
            CookieManager.getInstance().removeAllCookies(null);
            CookieManager.getInstance().flush();
            refreshState();
        });
        LinearLayout.LayoutParams clearParams = fullWidthWrap();
        clearParams.setMargins(0, dp(8), 0, 0);
        root.addView(clear, clearParams);

        TextView boundary = text(
                "Authority remains server-side: Person → Participation → PermissionGrant → AccessDecision → Work Package. This screen cannot invent work locally.",
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
        Uri uri = Uri.parse(raw);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        String share = uri.getQueryParameter("_vercel_share");
        String origin = host.isEmpty() ? "" : "https://" + host;

        if (!"https".equalsIgnoreCase(uri.getScheme())
                || !NexusStagingVercelGate.isAllowedOrigin(origin)
                || share == null
                || share.length() < 16) {
            Toast.makeText(this, "Use the temporary Vercel share URL for NOSMO Nexus staging", Toast.LENGTH_LONG).show();
            return;
        }

        NexusStagingVercelGate.clear();
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        targetHost = host;
        targetOrigin = origin;
        shareUrl.setText("");
        status.setText("Opening protected Nexus staging…");
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
            Toast.makeText(this, "Open protected Nexus staging first", Toast.LENGTH_LONG).show();
            return;
        }
        if (NexusMobileSession.hasSession(this)) {
            openWorkerHome();
            return;
        }

        String code = claimCode.getText() == null ? "" : claimCode.getText().toString().trim();
        if (code.length() < 32 || code.length() > 200) {
            Toast.makeText(this, "Enter the one-time Person claim", Toast.LENGTH_LONG).show();
            return;
        }

        claimCode.setText("");
        claimButton.setEnabled(false);
        status.setText("Creating canonical staging device session…");
        status.setTextColor(WARN);

        NexusStagingDeviceLoginClient.login(
                getApplicationContext(),
                code,
                (success, httpStatus, message) -> runOnUiThread(() -> {
                    status.setText(message);
                    status.setTextColor(success ? ECO : WARN);
                    Toast.makeText(this, message, success ? Toast.LENGTH_SHORT : Toast.LENGTH_LONG).show();
                    refreshState();
                    if (success) openWorkerHome();
                })
        );
    }

    private void refreshState() {
        if (status == null) return;
        boolean gate = NexusStagingVercelGate.isReady();
        boolean session = NexusMobileSession.hasSession(this);

        gatePill.setText(gate ? "GATE READY" : "GATE CLOSED");
        gatePill.setTextColor(gate ? ECO : WARN);
        sessionPill.setText(session ? "PERSON CONNECTED" : "NO SESSION");
        sessionPill.setTextColor(session ? ECO : MUTED);

        claimButton.setEnabled(gate && !session);
        claimCode.setEnabled(!session);
        continueButton.setEnabled(gate && session);

        if (gate && session) {
            status.setText("Canonical Nexus session ACTIVE. Worker Home can read the authoritative Work Inbox.");
            status.setTextColor(ECO);
        } else if (session) {
            status.setText("Person session is still encrypted locally. Re-open the protected staging gate after this process restart.");
            status.setTextColor(WARN);
        } else if (gate) {
            status.setText("Staging gate READY. Enter the one-time Person claim.");
            status.setTextColor(MUTED);
        } else {
            status.setText("Protected staging transport is not active yet.");
            status.setTextColor(MUTED);
        }
    }

    private void openWorkerHome() {
        if (!NexusStagingVercelGate.isReady() || !NexusMobileSession.hasSession(this)) {
            refreshState();
            return;
        }
        Intent intent = new Intent(this, WorkModeHomeActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
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
