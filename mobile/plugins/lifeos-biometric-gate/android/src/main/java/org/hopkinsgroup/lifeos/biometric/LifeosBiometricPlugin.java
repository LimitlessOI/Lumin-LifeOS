package org.hopkinsgroup.lifeos.biometric;

import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

/**
 * Real Android BiometricPrompt gate -- confirms it's really the founder
 * before the AI acts on the device. Android's own API already unifies
 * fingerprint, face, and PIN/pattern/password fallback into one system
 * dialog; this plugin does not build three separate auth systems, it
 * exposes the one real one. Requires the device to have a screen-lock
 * credential set (an Android platform requirement for enrolling any
 * biometric) -- separate from, and does not require, the accessibility
 * driver's screen-wake behavior.
 */
@CapacitorPlugin(name = "LifeosBiometricGate")
public class LifeosBiometricPlugin extends Plugin {

    private static int allowedAuthenticators() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        }
        return BiometricManager.Authenticators.BIOMETRIC_WEAK;
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        int result = manager.canAuthenticate(allowedAuthenticators());
        JSObject ret = new JSObject();
        ret.put("available", result == BiometricManager.BIOMETRIC_SUCCESS);
        ret.put("status", describeStatus(result));
        call.resolve(ret);
    }

    private String describeStatus(int result) {
        if (result == BiometricManager.BIOMETRIC_SUCCESS) return "ready";
        if (result == BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE) return "no_hardware";
        if (result == BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE) return "hw_unavailable";
        if (result == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) return "none_enrolled";
        if (result == BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED) return "security_update_required";
        if (result == BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED) return "unsupported";
        return "unknown";
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        String reason = call.getString("reason", "Confirm it's you before LifeOS continues");
        final FragmentActivity activity = (FragmentActivity) getActivity();
        if (activity == null) {
            call.reject("no_activity");
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                JSObject ret = new JSObject();
                ret.put("ok", true);
                String authType = "unknown";
                if (result.getAuthenticationType() == BiometricPrompt.AUTHENTICATION_RESULT_TYPE_BIOMETRIC) {
                    authType = "biometric";
                } else if (result.getAuthenticationType() == BiometricPrompt.AUTHENTICATION_RESULT_TYPE_DEVICE_CREDENTIAL) {
                    authType = "device_credential";
                }
                ret.put("authType", authType);
                call.resolve(ret);
            }

            @Override
            public void onAuthenticationError(int errorCode, CharSequence errString) {
                JSObject ret = new JSObject();
                ret.put("ok", false);
                ret.put("error", String.valueOf(errString));
                ret.put("errorCode", errorCode);
                call.resolve(ret);
            }

            @Override
            public void onAuthenticationFailed() {
                // A single failed attempt (e.g. wrong finger) -- BiometricPrompt keeps its
                // own dialog open for retry, so this callback intentionally does not resolve.
            }
        };

        new Handler(Looper.getMainLooper()).post(() -> {
            BiometricPrompt prompt = new BiometricPrompt(activity, executor, callback);
            BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("LifeOS")
                    .setSubtitle(reason);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                builder.setAllowedAuthenticators(allowedAuthenticators());
            } else {
                builder.setDeviceCredentialAllowed(true);
            }

            prompt.authenticate(builder.build());
        });
    }
}
