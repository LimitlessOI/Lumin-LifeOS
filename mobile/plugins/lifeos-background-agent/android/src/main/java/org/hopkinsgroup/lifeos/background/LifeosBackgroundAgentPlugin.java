package org.hopkinsgroup.lifeos.background;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "LifeosBackgroundAgent",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class LifeosBackgroundAgentPlugin extends Plugin {

    private static final String PREFS = "lifeos_background_agent";

    @PluginMethod
    public void saveToken(PluginCall call) {
        String token = call.getString("token");
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString("token", token).apply();
        call.resolve();
    }

    @PluginMethod
    public void hasNotificationAccess(PluginCall call) {
        JSObject ret = new JSObject();
        boolean needsPermission = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU;
        ret.put("granted", !needsPermission || getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "startAfterPermission");
            return;
        }
        startServiceNow(call);
    }

    @PermissionCallback
    private void startAfterPermission(PluginCall call) {
        // Proceed even if denied -- a foreground service can still run without a
        // visible notification on many OS versions; we never hide it on purpose.
        startServiceNow(call);
    }

    private void startServiceNow(PluginCall call) {
        Intent intent = new Intent(getContext(), LifeosBackgroundService.class);
        ContextCompat.startForegroundService(getContext(), intent);
        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), LifeosBackgroundService.class));
        call.resolve();
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", LifeosBackgroundService.running);
        call.resolve(ret);
    }
}
