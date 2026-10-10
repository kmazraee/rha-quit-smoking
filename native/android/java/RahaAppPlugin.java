package __PACKAGE__;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.DialogInterface;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.CancellationSignal;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

/**
 * کارهای بومی کوچک اپ:
 *  - rate: باز کردن صفحه‌ی امتیاز در کافه‌بازار یا مایکت
 *  - biometricAvailable / biometricAuth: قفل اپ با اثر انگشت یا چهره (اندروید ۹ به بعد)
 *  - setSecure: پنهان کردن محتوای اپ در فهرست برنامه‌های اخیر و جلوگیری از عکس صفحه
 */
@CapacitorPlugin(name = "RahaApp")
public class RahaAppPlugin extends Plugin {

    @PluginMethod
    public void rate(PluginCall call) {
        String store = call.getString("store");
        Context ctx = getContext();
        String pkg = ctx.getPackageName();
        Intent intent;
        String web;
        if ("myket".equals(store)) {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse("myket://comment?id=" + pkg));
            web = "https://myket.ir/app/" + pkg;
        } else {
            intent = new Intent(Intent.ACTION_EDIT, Uri.parse("bazaar://details?id=" + pkg));
            intent.setPackage("com.farsitel.bazaar");
            web = "https://cafebazaar.ir/app/" + pkg;
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(intent);
        } catch (Exception e) {
            try {
                Intent w = new Intent(Intent.ACTION_VIEW, Uri.parse(web));
                w.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(w);
            } catch (Exception ignored) {
                call.reject("no store");
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void biometricAvailable(PluginCall call) {
        boolean ok = false;
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 29) {
            BiometricManager bm = ctx.getSystemService(BiometricManager.class);
            ok = bm != null && bm.canAuthenticate() == BiometricManager.BIOMETRIC_SUCCESS;
        } else if (Build.VERSION.SDK_INT >= 28) {
            ok = ctx.getPackageManager().hasSystemFeature(PackageManager.FEATURE_FINGERPRINT);
        }
        JSObject ret = new JSObject();
        ret.put("available", ok);
        call.resolve(ret);
    }

    @PluginMethod
    public void biometricAuth(final PluginCall call) {
        if (Build.VERSION.SDK_INT < 28) {
            call.reject("unsupported");
            return;
        }
        final Activity activity = getActivity();
        final String title = call.getString("title", "باز کردن رها");
        final String cancel = call.getString("cancel", "استفاده از رمز");
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    final Executor exec = activity.getMainExecutor();
                    BiometricPrompt prompt = new BiometricPrompt.Builder(activity)
                            .setTitle(title)
                            .setNegativeButton(cancel, exec, new DialogInterface.OnClickListener() {
                                @Override
                                public void onClick(DialogInterface d, int which) {
                                    call.reject("cancelled");
                                }
                            })
                            .build();
                    prompt.authenticate(new CancellationSignal(), exec, new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                            JSObject ret = new JSObject();
                            ret.put("ok", true);
                            call.resolve(ret);
                        }

                        @Override
                        public void onAuthenticationError(int code, CharSequence msg) {
                            call.reject(String.valueOf(msg));
                        }
                    });
                } catch (Exception e) {
                    call.reject("failed");
                }
            }
        });
    }

    @PluginMethod
    public void setSecure(final PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        final Activity activity = getActivity();
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (on) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                call.resolve();
            }
        });
    }
}
