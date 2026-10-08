package __PACKAGE__;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** پل بین اپ وب و ویجت: اطلاعات پیشرفت را ذخیره و ویجت را به‌روز می‌کند. */
@CapacitorPlugin(name = "RahaWidget")
public class RahaWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }
        Context ctx = getContext();
        SharedPreferences sp = ctx.getSharedPreferences(RahaWidget.PREFS, Context.MODE_PRIVATE);
        sp.edit().putString(RahaWidget.KEY, data).apply();
        RahaWidget.updateAll(ctx);
        call.resolve();
    }
}
