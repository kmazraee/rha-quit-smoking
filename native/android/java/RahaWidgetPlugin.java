package __PACKAGE__;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import java.io.File;
import java.io.FileOutputStream;

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

    /** عکس انگیزشی ویجت: data = JPEG به‌صورت base64؛ خالی یعنی حذف عکس. */
    @PluginMethod
    public void setPhoto(PluginCall call) {
        Context ctx = getContext();
        File f = new File(ctx.getFilesDir(), RahaWidget.PHOTO);
        String data = call.getString("data", "");
        try {
            if (data == null || data.isEmpty()) {
                if (f.exists()) f.delete();
            } else {
                int comma = data.indexOf(',');
                byte[] bytes = Base64.decode(comma >= 0 ? data.substring(comma + 1) : data, Base64.DEFAULT);
                FileOutputStream out = new FileOutputStream(f);
                out.write(bytes);
                out.close();
            }
        } catch (Exception e) {
            call.reject("photo failed");
            return;
        }
        RahaWidget.updateAll(ctx);
        call.resolve();
    }
}
