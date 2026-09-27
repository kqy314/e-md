package com.emd.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * WebView JavaScript 桥接：通过 SAF（Storage Access Framework）打开/保存 Markdown 文件。
 *
 * 与前端 src/services/fileService.ts 的契约保持一致：
 *   openFile(cb)                        系统选择器打开一个文件
 *   openById(cb, id)                    按持久化 content:// Uri 重新读取
 *   saveFile(cb, id, content)           写回已授权文件
 *   saveAs(cb, content, suggestedName)  系统"另存为"选择器
 * 统一通过 window.__onMarkdownBridgeResult(cb, json) 回调。
 */
public class MarkdownBridge {
    private static final String TAG = "MarkdownBridge";
    private static final int REQ_OPEN = 41001;
    private static final int REQ_SAVE_AS = 41002;

    private final Activity activity;
    private final WebView webView;
    private String pendingCb;
    private int pendingReq;
    private String pendingContent;

    public MarkdownBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public void openFile(final String cb) {
        run(() -> {
            pendingCb = cb;
            pendingReq = REQ_OPEN;
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                    "text/markdown", "text/plain", "application/octet-stream"
            });
            try {
                activity.startActivityForResult(intent, REQ_OPEN);
            } catch (Exception e) {
                reply(cb, fail(e));
            }
        });
    }

    @JavascriptInterface
    public void openById(final String cb, final String id) {
        run(() -> {
            try {
                Uri uri = Uri.parse(id);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("id", id);
                r.put("name", queryName(uri));
                r.put("content", read(uri));
                reply(cb, r);
            } catch (Exception e) {
                reply(cb, fail(e));
            }
        });
    }

    @JavascriptInterface
    public void saveFile(final String cb, final String id, final String content) {
        run(() -> {
            try {
                write(Uri.parse(id), content);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                reply(cb, r);
            } catch (Exception e) {
                reply(cb, fail(e));
            }
        });
    }

    @JavascriptInterface
    public void saveAs(final String cb, final String content, final String suggestedName) {
        run(() -> {
            pendingCb = cb;
            pendingReq = REQ_SAVE_AS;
            pendingContent = content;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("text/markdown");
            intent.putExtra(Intent.EXTRA_TITLE, suggestedName);
            try {
                activity.startActivityForResult(intent, REQ_SAVE_AS);
            } catch (Exception e) {
                reply(cb, fail(e));
            }
        });
    }

    /** 由 MainActivity.onActivityResult 转发；返回 true 表示已处理。 */
    public boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        String cb = pendingCb;
        if (cb == null || requestCode != pendingReq) return false;
        pendingCb = null;
        pendingReq = 0;

        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
            JSONObject r = new JSONObject();
            try {
                r.put("ok", false);
                r.put("canceled", true);
            } catch (JSONException ignored) {
            }
            reply(cb, r);
            return true;
        }

        try {
            Uri uri = data.getData();
            if (requestCode == REQ_OPEN) {
                // 同时申请读写持久权限，保证后续「保存回原文件」与重启后重读均可用
                take(uri, true, true);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("id", uri.toString());
                r.put("name", queryName(uri));
                r.put("content", read(uri));
                reply(cb, r);
            } else { // REQ_SAVE_AS
                take(uri, true, true);
                write(uri, pendingContent);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("id", uri.toString());
                r.put("name", queryName(uri));
                reply(cb, r);
            }
        } catch (Exception e) {
            reply(cb, fail(e));
        }
        return true;
    }

    private void take(Uri uri, boolean read, boolean write) {
        try {
            int flags = 0;
            if (read) flags |= Intent.FLAG_GRANT_READ_URI_PERMISSION;
            if (write) flags |= Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
            activity.getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (Exception e) {
            Log.w(TAG, "takePersistableUriPermission failed", e);
        }
    }

    private String queryName(Uri uri) {
        ContentResolver cr = activity.getContentResolver();
        try (Cursor c = cr.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0) return c.getString(i);
            }
        } catch (Exception ignored) {
        }
        String last = uri.getLastPathSegment();
        return last != null ? last : "未命名.md";
    }

    private String read(Uri uri) throws Exception {
        ContentResolver cr = activity.getContentResolver();
        StringBuilder sb = new StringBuilder();
        try (InputStream in = cr.openInputStream(uri);
             BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            char[] buf = new char[8192];
            int n;
            while ((n = br.read(buf)) != -1) sb.append(buf, 0, n);
        }
        return sb.toString();
    }

    private void write(Uri uri, String content) throws Exception {
        ContentResolver cr = activity.getContentResolver();
        try (OutputStream out = cr.openOutputStream(uri, "wt")) {
            if (out == null) throw new IllegalStateException("无法写入文件");
            out.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    private void reply(String cb, JSONObject r) {
        // 第二个参数必须是 JSON 文本字符串（带引号的 JS 字符串字面量）。
        // 若直接拼 r.toString()，JS 收到的是对象而非字符串，前端 JSON.parse 会失败，
        // 报「原生响应解析失败」。org.json 的 quote 会转义引号/反斜杠/U+2028/U+2029。
        String js = "window.__onMarkdownBridgeResult("
                + JSONObject.quote(cb) + ","
                + JSONObject.quote(r.toString()) + ")";
        webView.evaluateJavascript(js, null);
    }

    private JSONObject fail(Exception e) {
        JSONObject r = new JSONObject();
        try {
            r.put("ok", false);
            r.put("error", e.getMessage() == null ? e.toString() : e.getMessage());
        } catch (JSONException ignored) {
        }
        return r;
    }

    private void run(Runnable r) {
        activity.runOnUiThread(r);
    }
}
