package com.emd.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private MarkdownBridge mdBridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView wv = getBridge().getWebView();
        mdBridge = new MarkdownBridge(this, wv);
        wv.addJavascriptInterface(mdBridge, "MarkdownBridge");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (mdBridge != null) mdBridge.onActivityResult(requestCode, resultCode, data);
    }
}
