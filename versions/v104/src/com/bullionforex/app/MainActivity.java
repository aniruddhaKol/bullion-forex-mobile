package com.bullionforex.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private WebView web;
    private final ExecutorService requests = Executors.newFixedThreadPool(4);
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                if (request.getUrl().getScheme().equals("https")) {
                    startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, request.getUrl()));
                    return true;
                }
                return !request.getUrl().toString().startsWith("file:///android_asset/");
            }
        });
        web.addJavascriptInterface(new RateBridge(), "AndroidRates");
        android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        root.addView(web, new android.widget.FrameLayout.LayoutParams(-1, -1));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if(android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        setContentView(root);
        web.loadUrl("file:///android_asset/index.html");
    }
    private class RateBridge {
        @JavascriptInterface public void saveWidgetRates(String data) { WidgetStore.save(getApplicationContext(),data); }
        @JavascriptInterface public String widgetRates() { return WidgetStore.read(getApplicationContext()).toString(); }
        @JavascriptInterface public boolean widgetCheck() { return getIntent().getBooleanExtra("check_widget",false); }
        @JavascriptInterface public void toast(String code) {
            final String message;
            switch(code) {
                case "cached": message = "Saved rates are current. No download needed."; break;
                case "loading_all": message = "Loading metals and forex rates…"; break;
                case "loading_metals": message = "Loading metal rates…"; break;
                case "loading_forex": message = "Loading forex rates…"; break;
                case "busy": message = "Rates are already loading…"; break;
                default: return;
            }
            runOnUiThread(() -> {
                if(!isFinishing() && !isDestroyed()) android.widget.Toast.makeText(getApplicationContext(), message, android.widget.Toast.LENGTH_SHORT).show();
            });
        }
        @JavascriptInterface public void fetch(final int id, final String endpoint) {
            if(id < 0 || !(endpoint.equals("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR,EUR,GBP") || endpoint.equals("https://api.gold-api.com/price/XPT") || endpoint.equals("https://trackliveprice.com/api/gold/999.json") || endpoint.equals("https://trackliveprice.com/api/silver.json"))) return;
            requests.submit(() -> {
                HttpsURLConnection connection = null;
                String result;
                try {
                    connection = (HttpsURLConnection)new URL(endpoint).openConnection();
                    connection.setConnectTimeout(12000);
                    connection.setReadTimeout(12000);
                    connection.setRequestProperty("Accept", "application/json");
                    connection.setRequestProperty("User-Agent", "BullionForexAndroid/1.0");
                    if(connection.getResponseCode() != 200) throw new Exception("Rates unavailable");
                    try(InputStream input=connection.getInputStream(); ByteArrayOutputStream output=new ByteArrayOutputStream()) {
                        byte[] buffer=new byte[4096]; int count;
                        while((count=input.read(buffer))!=-1) {
                            output.write(buffer,0,count);
                            if(output.size()>262144) throw new Exception("Response too large");
                        }
                        result = new JSONObject().put("body",new JSONObject(output.toString("UTF-8"))).toString();
                    }
                } catch(Exception error) { result="{\"error\":\"Rates unavailable\"}"; }
                finally { if(connection!=null) connection.disconnect(); }
                final String script="window.rateResponse("+id+","+result+")";
                runOnUiThread(() -> { if(!isFinishing() && !isDestroyed()) web.evaluateJavascript(script,null); });
            });
        }
    }
    @Override protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);setIntent(intent);
        if(intent.getBooleanExtra("check_widget",false))web.evaluateJavascript("if(window.refresh)window.refresh(true)",null);
    }
    @Override protected void onDestroy() {
        requests.shutdownNow();
        web.removeJavascriptInterface("AndroidRates");
        web.destroy();
        super.onDestroy();
    }
    @Override public void onBackPressed() {
        if(web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
