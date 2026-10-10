package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ویجت صفحه‌ی اصلی رها: روزهای بدون سیگار، پول پس‌انداز‌شده، نخ‌های نکشیده
 * و پیشرفت مرحله‌ی بعدی سلامتی را نشان می‌دهد.
 * اطلاعات پایه را اپ (از طریق RahaWidgetPlugin) در SharedPreferences می‌نویسد
 * و ویجت هر بار به‌روزرسانی، اعداد را از روی ساعت گوشی حساب می‌کند.
 */
public class RahaWidget extends AppWidgetProvider {

    static final String PREFS = "raha_widget";
    static final String KEY = "data";
    private static final String FA = "۰۱۲۳۴۵۶۷۸۹";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    /** همه‌ی ویجت‌های رها را فوراً به‌روز می‌کند (وقتی اپ اطلاعات تازه می‌فرستد). */
    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, RahaWidget.class));
        if (ids == null || ids.length == 0) return;
        RemoteViews views = build(context);
        for (int id : ids) {
            manager.updateAppWidget(id, views);
        }
    }

    static RemoteViews build(Context context) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.raha_widget);

        // باز کردن اپ با لمس ویجت
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null) {
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pi = PendingIntent.getActivity(context, 0, open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(R.id.rw_root, pi);
        }

        SharedPreferences sp = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String json = sp.getString(KEY, null);
        try {
            if (json == null) throw new Exception("no data");
            JSONObject d = new JSONObject(json);
            if (!d.optBoolean("ready", false)) throw new Exception("not ready");

            long quitAt = d.getLong("quitAt");
            double cpd = d.optDouble("cpd", 0);
            double cost = d.optDouble("costPerCig", 0);
            boolean rial = d.optBoolean("rial", false);

            long elapsed = Math.max(0, System.currentTimeMillis() - quitAt);
            double days = elapsed / 86400000.0;
            long fullDays = (long) Math.floor(days);
            long hours = (elapsed / 3600000L) % 24;
            long notSmoked = Math.max(0L, (long) Math.floor(days * cpd) - d.optLong("slipCigs", 0L));
            double money = notSmoked * cost * (rial ? 10 : 1);

            v.setTextViewText(R.id.rw_days, fa(fullDays));
            v.setTextViewText(R.id.rw_days_label, "روز" + (hours > 0 ? " و " + fa(hours) + " ساعت" : ""));
            v.setTextViewText(R.id.rw_money, shortMoney(money) + " " + (rial ? "ریال" : "تومان"));
            v.setTextViewText(R.id.rw_cigs, fa(group(notSmoked)) + " نخ نکشیده");

            // مرحله‌ی بعدی سلامتی
            JSONArray ms = d.optJSONArray("milestones");
            double minutes = elapsed / 60000.0;
            String nextTitle = "همه‌ی مراحل سلامتی کامل شد";
            int pct = 100;
            if (ms != null) {
                for (int i = 0; i < ms.length(); i++) {
                    JSONObject m = ms.getJSONObject(i);
                    double t = m.getDouble("t");
                    if (minutes < t) {
                        nextTitle = m.optString("title", "");
                        pct = (int) Math.floor(minutes / t * 100);
                        break;
                    }
                }
            }
            v.setTextViewText(R.id.rw_next, nextTitle);
            v.setTextViewText(R.id.rw_pct, fa(pct) + "٪");
            v.setProgressBar(R.id.rw_bar, 100, pct, false);
        } catch (Exception e) {
            v.setTextViewText(R.id.rw_days, "—");
            v.setTextViewText(R.id.rw_days_label, "اپ رها را باز کنید");
            v.setTextViewText(R.id.rw_money, "");
            v.setTextViewText(R.id.rw_cigs, "");
            v.setTextViewText(R.id.rw_next, "برنامه‌ی ترک را بسازید");
            v.setTextViewText(R.id.rw_pct, "");
            v.setProgressBar(R.id.rw_bar, 100, 0, false);
        }
        return v;
    }

    static String fa(long n) {
        return fa(String.valueOf(n));
    }

    static String fa(String s) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c >= '0' && c <= '9') b.append(FA.charAt(c - '0'));
            else if (c == '.') b.append('٫');
            else if (c == ',') b.append('٬');
            else b.append(c);
        }
        return b.toString();
    }

    static String group(long n) {
        return String.format(java.util.Locale.US, "%,d", n);
    }

    static String shortMoney(double n) {
        if (n >= 1e9) return fa(String.format(java.util.Locale.US, "%.1f", n / 1e9)) + " میلیارد";
        if (n >= 1e6) return fa(String.format(java.util.Locale.US, "%.1f", n / 1e6)) + " میلیون";
        if (n >= 1e3) return fa(group(Math.round(n / 1e3))) + " هزار";
        return fa(group(Math.round(n)));
    }
}
