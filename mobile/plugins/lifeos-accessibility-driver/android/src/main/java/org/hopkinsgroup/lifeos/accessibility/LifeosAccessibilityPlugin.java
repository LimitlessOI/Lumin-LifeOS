package org.hopkinsgroup.lifeos.accessibility;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * JS-callable bridge onto LifeosAccessibilityService. Mirrors the desktop
 * AXUIElement driver's shape (findByText -> click / setText / dumpVisibleText)
 * so the same drive-channel loop the browser extension already uses can be
 * pointed at a native Android app once wired.
 */
@CapacitorPlugin(name = "LifeosAccessibility")
public class LifeosAccessibilityPlugin extends Plugin {

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", isServiceEnabledInSettings() && LifeosAccessibilityService.isRunning());
        call.resolve(ret);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void clickByText(PluginCall call) {
        String text = call.getString("text");
        boolean exact = Boolean.TRUE.equals(call.getBoolean("exact", false));
        if (TextUtils.isEmpty(text)) {
            call.reject("text is required");
            return;
        }
        if (!LifeosAccessibilityService.isRunning()) {
            call.reject("accessibility_service_not_running");
            return;
        }
        boolean ok = LifeosAccessibilityService.getInstance().clickByText(text, exact);
        JSObject ret = new JSObject();
        ret.put("ok", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void setTextByLabel(PluginCall call) {
        String label = call.getString("label");
        String value = call.getString("value");
        if (TextUtils.isEmpty(label) || value == null) {
            call.reject("label and value are required");
            return;
        }
        if (!LifeosAccessibilityService.isRunning()) {
            call.reject("accessibility_service_not_running");
            return;
        }
        boolean ok = LifeosAccessibilityService.getInstance().setTextByLabel(label, value);
        JSObject ret = new JSObject();
        ret.put("ok", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void dumpVisibleText(PluginCall call) {
        if (!LifeosAccessibilityService.isRunning()) {
            call.reject("accessibility_service_not_running");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("text", LifeosAccessibilityService.getInstance().dumpVisibleText());
        call.resolve(ret);
    }

    private boolean isServiceEnabledInSettings() {
        AccessibilityManager am = (AccessibilityManager) getContext().getSystemService(Context.ACCESSIBILITY_SERVICE);
        if (am == null) return false;
        List<AccessibilityServiceInfo> enabledServices =
                am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
        String myId = getContext().getPackageName() + "/" + LifeosAccessibilityService.class.getName();
        for (AccessibilityServiceInfo info : enabledServices) {
            if (myId.equals(info.getId())) return true;
        }
        return false;
    }
}
