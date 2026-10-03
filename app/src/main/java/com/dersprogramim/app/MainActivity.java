package com.dersprogramim.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONObject;

import java.io.IOException;

public class MainActivity extends Activity {
    private static final int PICK_IMAGE = 1001;
    private WebView webView;
    private TextRecognizer recognizer;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidOCR");
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private class AndroidBridge {
        @JavascriptInterface
        public void pickImage() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                startActivityForResult(intent, PICK_IMAGE);
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_IMAGE || resultCode != RESULT_OK || data == null) return;

        Uri uri = data.getData();
        if (uri == null) return;

        try {
            InputImage image = InputImage.fromFilePath(this, uri);
            recognizer.process(image)
                    .addOnSuccessListener(result -> sendOcrResult(result.getText()))
                    .addOnFailureListener(error -> sendOcrError(error.getMessage()));
        } catch (IOException error) {
            sendOcrError(error.getMessage());
        }
    }

    private void sendOcrResult(String text) {
        String script = "window.onOcrResult && window.onOcrResult(" + JSONObject.quote(text == null ? "" : text) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    private void sendOcrError(String message) {
        String safeMessage = message == null ? "Fotoğraf okunamadı." : message;
        String script = "window.onOcrError && window.onOcrError(" + JSONObject.quote(safeMessage) + ");";
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    @Override
    protected void onDestroy() {
        if (recognizer != null) recognizer.close();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
