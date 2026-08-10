package org.hopkinsgroup.lifeos.background;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Always-on background poller -- lets LifeOS act on this device even when
 * the app UI isn't open (e.g. the founder is in Photos, Chrome, anything
 * else). Runs as a real, visible Android foreground service (required
 * notification, no hiding) that polls the same command queue
 * routes/android-command-routes.js already serves, using native HTTP so it
 * has no dependency on the app's WebView being alive.
 */
public class LifeosBackgroundService extends Service {

    private static final String TAG = "LifeosBackgroundAgent";
    private static final String PREFS = "lifeos_background_agent";
    private static final String CHANNEL_ID = "lifeos_background_agent";
    private static final int NOTIFICATION_ID = 4271;
    private static final long POLL_INTERVAL_MS = 15000;
    private static final String BASE_URL = "https://lumin-web-production-e3a9.up.railway.app";

    public static volatile boolean running = false;

    private HandlerThread workerThread;
    private Handler workerHandler;
    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            pollOnce();
            if (workerHandler != null) workerHandler.postDelayed(this, POLL_INTERVAL_MS);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildNotification());
        workerThread = new HandlerThread("LifeosBackgroundAgentWorker");
        workerThread.start();
        workerHandler = new Handler(workerThread.getLooper());
        workerHandler.post(pollRunnable);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        running = false;
        if (workerHandler != null) workerHandler.removeCallbacks(pollRunnable);
        if (workerThread != null) workerThread.quitSafely();
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "LifeOS background agent", NotificationManager.IMPORTANCE_MIN);
            channel.setDescription("Lets LifeOS act on this device for tasks you ask it to do, even when the app isn't open.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("LifeOS is active")
                .setContentText("Ready to help with tasks you've asked for.")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .build();
    }

    private String getToken() {
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return prefs.getString("token", null);
    }

    private void pollOnce() {
        String token = getToken();
        if (token == null || token.isEmpty()) return;

        try {
            JSONObject pending = httpJson("GET", "/api/v1/android/pending-for-user", token, null);
            if (pending == null || pending.isNull("command_id")) return;

            String commandId = pending.optString("command_id", null);
            if (commandId == null) return;
            String command = pending.optString("command", "");

            JSONObject result;
            try {
                if ("upload_recent_photos".equals(command)) {
                    result = uploadRecentPhotos(token);
                } else {
                    result = new JSONObject();
                    result.put("ok", false);
                    result.put("error", "unknown_command:" + command);
                }
            } catch (Exception e) {
                result = new JSONObject();
                result.put("ok", false);
                result.put("error", String.valueOf(e.getMessage()));
            }

            JSONObject resultBody = new JSONObject();
            resultBody.put("command_id", commandId);
            resultBody.put("ok", result.optBoolean("ok", false));
            resultBody.put("result", result);
            httpJson("POST", "/api/v1/android/command-result", token, resultBody);
        } catch (Exception e) {
            Log.w(TAG, "poll failed: " + e.getMessage());
        }
    }

    private JSONObject uploadRecentPhotos(String token) throws Exception {
        String[] projection = { MediaStore.Images.Media._ID, MediaStore.Images.Media.DISPLAY_NAME };
        String sortOrder = MediaStore.Images.Media.DATE_ADDED + " DESC";
        JSONArray files = new JSONArray();
        int limit = 20;

        try (Cursor cursor = getContentResolver().query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, null, null, sortOrder)) {
            if (cursor != null) {
                int idCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
                int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME);
                int count = 0;
                while (cursor.moveToNext() && count < limit) {
                    long id = cursor.getLong(idCol);
                    String name = cursor.getString(nameCol);
                    Uri uri = Uri.withAppendedPath(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, String.valueOf(id));
                    try (InputStream in = getContentResolver().openInputStream(uri)) {
                        if (in == null) continue;
                        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                        byte[] chunk = new byte[8192];
                        int read;
                        while ((read = in.read(chunk)) != -1) buffer.write(chunk, 0, read);
                        String base64 = Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP);
                        String safeName = (name == null ? ("photo_" + id + ".jpg") : name.replaceAll("[^A-Za-z0-9._-]", "_"));
                        JSONObject file = new JSONObject();
                        file.put("filename", safeName);
                        file.put("base64", base64);
                        files.put(file);
                    } catch (Exception ignored) { /* skip unreadable photo, keep going */ }
                    count++;
                }
            }
        }

        JSONObject ret = new JSONObject();
        if (files.length() == 0) {
            ret.put("ok", false);
            ret.put("error", "no_photos_found");
            return ret;
        }

        JSONObject body = new JSONObject();
        body.put("files", files);
        JSONObject uploadRes = httpJson("POST", "/api/v1/gallery/upload", token, body);
        boolean ok = uploadRes != null && uploadRes.optBoolean("ok", false);
        ret.put("ok", ok);
        ret.put("count", ok ? uploadRes.optInt("count", files.length()) : 0);
        if (!ok && uploadRes != null) ret.put("error", uploadRes.optString("error", "upload_failed"));
        return ret;
    }

    private JSONObject httpJson(String method, String path, String token, JSONObject body) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(BASE_URL + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod(method);
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(20000);
            if (body != null) {
                conn.setDoOutput(true);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }
            }
            int status = conn.getResponseCode();
            InputStream is = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();
            if (is == null) return null;
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            int read;
            while ((read = is.read(chunk)) != -1) buffer.write(chunk, 0, read);
            String text = buffer.toString(StandardCharsets.UTF_8.name());
            return new JSONObject(text);
        } catch (Exception e) {
            Log.w(TAG, "http " + method + " " + path + " failed: " + e.getMessage());
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
