package tech.nosmo.nexus.workmode;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
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

/** NON_PRODUCTION real-device onboarding for the protected Vercel Core staging preview. */
public final class IdentityClaimActivity extends Activity {
    private static final int BG = Color.rgb(4, 16, 31);
    private static final int TEXT = Color.rgb(238, 247, 255);
    private static final int MUTED = Color.rgb(153, 181, 207);
    private static final int GREEN = Color.rgb(71, 222, 161);
    private static final int WARN = Color.rgb(255, 218, 120);

    private EditText shareUrl;
    private EditText claimCode;
    private TextView status;
    private Button loginButton;
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
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18), dp(22), dp(18), dp(28));
        root.setBackgroundColor(BG);

        root.addView(text("NEXUS staging device login", 25, TEXT, true), fullWidthWrap());

        TextView body = text(
                "NON_PRODUCTION real-device gate. Paste the temporary Vercel share URL for the validated Core deployment, establish the protected staging cookie, then enter the one-time Person claim. Neither the share URL nor claim is stored by this screen.",
                12,
                MUTED,
                false
        );
        body.setPadding(0, dp(6), 0, dp(14));
        root.addView(body, fullWidthWrap());

        status = text("Staging transport gate: NOT READY", 12, WARN, true);
        root.addView(status, fullWidthWrap());

        shareUrl = new EditText(this);
        shareUrl.setHint("Temporary Vercel share URL");
        shareUrl.setSingleLine(true);
        shareUrl.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        shareUrl.setTextColor(TEXT);
        shareUrl.setHintTextColor(MUTED);
        root.addView(shareUrl, fullWidthWrap());

        Button openGate = new Button(this);
        openGate.setText("Open temporary Vercel staging gate");
        openGate.setAllCaps(false);
        openGate.setOnClickListener(v -> openStagingGate());
        root.addView(openGate, fullWidthWrap());

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
        root.addView(webView, webParams);

        claimCode = new EditText(this);
        claimCode.setHint("One-time staging Person claim code");
        claimCode.setSingleLine(true);
        claimCode.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        claimCode.setTextColor(TEXT);
        claimCode.setHintTextColor(MUTED);
        root.addView(claimCode, fullWidthWrap());

        loginButton = new Button(this);
        loginButton.setText("Create 2-hour staging device session");
        loginButton.setAllCaps(false);
        loginButton.setEnabled(false);
        loginButton.setOnClickListener(v -> submitDeviceLogin());
        root.addView(loginButton, fullWidthWrap());

        Button clear = new Button(this);
        clear.setText("Clear local staging session + gate");
        clear.setAllCaps(false);
        clear.setOnClickListener(v -> {
            NexusMobileSession.clearSession(this);
            NexusStagingVercelGate.clear();
            CookieManager.getInstance().removeAllCookies(null);
            CookieManager.getInstance().flush();
            refreshState();
        });
        root.addView(clear, fullWidthWrap());

        Button back = new Button(this);
        back.setText("Back to Work Mode");
        back.setAllCaps(false);
        back.setOnClickListener(v -> finish());
        root.addView(back, fullWidthWrap());

        TextView boundary = text(
                "Boundary: Vercel share URL/cookie stay outside persistent Nexus storage. The claim is one-time and consumed server-side. Android stores only the returned opaque Nexus session under the existing Android Keystore AES/GCM key. Person, Participation, PermissionGrant and AccessDecision remain server authority.",
                10,
                MUTED,
                false
        );
        boundary.setPadding(0, dp(14), 0, 0);
        root.addView(boundary, fullWidthWrap());

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.setFillViewport(true);
        scroll.addView(root, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
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

        // Keep only the in-process copy used by HttpURLConnection; remove WebView persistence.
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        webView.setVisibility(View.GONE);
        status.setText("Staging transport gate: READY · " + targetHost);
        status.setTextColor(GREEN);
        refreshState();
    }

    private void submitDeviceLogin() {
        if (!NexusStagingVercelGate.isReady()) {
            Toast.makeText(this, "Open the Vercel staging gate first", Toast.LENGTH_LONG).show();
            return;
        }
        String code = claimCode.getText() == null ? "" : claimCode.getText().toString().trim();
        if (code.length() < 32 || code.length() > 200) {
            Toast.makeText(this, "Enter a valid one-time staging claim", Toast.LENGTH_LONG).show();
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
                    status.setTextColor(success ? GREEN : WARN);
                    Toast.makeText(this, message, success ? Toast.LENGTH_SHORT : Toast.LENGTH_LONG).show();
                    refreshState();
                    if (success) {
                        startActivity(new android.content.Intent(this, WorkInboxActivity.class));
                        finish();
                    }
                })
        );
    }

    private void refreshState() {
        if (status == null || loginButton == null) return;
        boolean gate = NexusStagingVercelGate.isReady();
        boolean session = NexusMobileSession.hasSession(this);
        loginButton.setEnabled(gate && !session);
        if (session && gate) {
            status.setText("Nexus staging session: ACTIVE · transport gate READY");
            status.setTextColor(GREEN);
        } else if (session) {
            status.setText("Nexus staging session exists · reopen temporary Vercel gate after process restart");
            status.setTextColor(WARN);
        }
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
