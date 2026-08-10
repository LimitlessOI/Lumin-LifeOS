package org.hopkinsgroup.lifeos.background;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.core.content.ContextCompat;

/**
 * Restarts the background agent after a reboot -- only if the founder has
 * already logged in at least once (a real token is present). Never starts
 * on a fresh, never-logged-in device.
 */
public class LifeosBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        SharedPreferences prefs = context.getSharedPreferences("lifeos_background_agent", Context.MODE_PRIVATE);
        String token = prefs.getString("token", null);
        if (token == null || token.isEmpty()) return;
        Intent serviceIntent = new Intent(context, LifeosBackgroundService.class);
        ContextCompat.startForegroundService(context, serviceIntent);
    }
}
