package __PACKAGE__;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** پل بین اپ و بخش پس‌زمینه‌ی «با هم ترک کنیم». */
@CapacitorPlugin(name = "RahaFriends")
public class RahaFriendsPlugin extends Plugin {

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(RahaFriendsJob.PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void configure(PluginCall call) {
        String server = call.getString("server");
        String token = call.getString("token");
        if (server == null || token == null) {
            call.reject("server and token are required");
            return;
        }
        long cursor = call.getData().optLong("cursor", 0L);
        SharedPreferences sp = prefs();
        long saved = sp.getLong("cursor", 0L);
        boolean sameUser = token.equals(sp.getString("token", null));
        sp.edit()
                .putString("server", server)
                .putString("token", token)
                .putLong("cursor", sameUser ? Math.max(saved, cursor) : cursor)
                .apply();
        RahaFriendsJob.schedule(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setCursor(PluginCall call) {
        long cursor = call.getData().optLong("cursor", 0L);
        SharedPreferences sp = prefs();
        if (cursor > sp.getLong("cursor", 0L)) sp.edit().putLong("cursor", cursor).apply();
        call.resolve();
    }

    @PluginMethod
    public void getCursor(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("cursor", prefs().getLong("cursor", 0L));
        call.resolve(ret);
    }

    /** اگر کاربر با زدن روی اعلان وارد اپ شده، مسیر صفحه‌ی «با هم» را یک بار برمی‌گرداند. */
    @PluginMethod
    public void consumeRoute(PluginCall call) {
        SharedPreferences sp = prefs();
        JSObject ret = new JSObject();
        ret.put("route", sp.getString("route", ""));
        sp.edit().remove("route").apply();
        call.resolve(ret);
    }

    @PluginMethod
    public void disable(PluginCall call) {
        prefs().edit().clear().apply();
        RahaFriendsJob.cancel(getContext());
        call.resolve();
    }
}
