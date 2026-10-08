package __PACKAGE__;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * «با هم ترک کنیم» در پس‌زمینه: حدود هر ۱۵ دقیقه (کمترین فاصله‌ای که اندروید اجازه می‌دهد)
 * صندوق پیام کاربر را از سرور رها می‌خواند و برای پیام‌های تازه‌ی دوستان اعلان نشان می‌دهد.
 * فقط از ابزارهای خود اندروید استفاده می‌کند (JobScheduler)، بدون سرویس‌های گوگل.
 */
public class RahaFriendsJob extends JobService {

    static final int JOB_ID = 7301;
    static final String PREFS = "raha_friends";
    static final String CHANNEL = "raha_friends";

    public static void schedule(Context ctx) {
        JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        JobInfo info = new JobInfo.Builder(JOB_ID, new ComponentName(ctx, RahaFriendsJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build();
        js.schedule(info);
    }

    public static void cancel(Context ctx) {
        JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js != null) js.cancel(JOB_ID);
    }

    @Override
    public boolean onStartJob(final JobParameters params) {
        final Context ctx = getApplicationContext();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    check(ctx);
                } catch (Throwable t) {
                    // اینترنت نبود یا سرور جواب نداد؛ دفعه‌ی بعد دوباره امتحان می‌شود
                }
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }

    static void check(Context ctx) throws Exception {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String server = sp.getString("server", null);
        String token = sp.getString("token", null);
        if (server == null || token == null) return;
        long cursor = sp.getLong("cursor", 0L);

        URL url = new URL(server + "/api/inbox?since=" + cursor);
        HttpURLConnection c = (HttpURLConnection) url.openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(15000);
        c.setRequestProperty("Authorization", "Bearer " + token);
        c.setRequestProperty("Accept", "application/json");
        int code = c.getResponseCode();
        if (code != 200) {
            c.disconnect();
            return;
        }
        StringBuilder sb = new StringBuilder();
        BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
        String line;
        while ((line = r.readLine()) != null) sb.append(line);
        r.close();
        c.disconnect();

        JSONArray events = new JSONObject(sb.toString()).optJSONArray("events");
        if (events == null) return;
        long max = cursor;
        for (int i = 0; i < events.length(); i++) {
            JSONObject e = events.getJSONObject(i);
            long id = e.optLong("id", 0L);
            if (id <= cursor) continue;
            if (id > max) max = id;
            show(ctx, (int) (id % 100000L) + 5000, e.optString("title", "رها"), e.optString("body", ""), "sos".equals(e.optString("type")));
        }
        if (max > cursor) {
            sp.edit().putLong("cursor", max).putString("route", "together").apply();
        }
    }

    static void show(Context ctx, int id, String title, String body, boolean urgent) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "دوستان و پیام‌ها", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("پیام‌های دوستان در بخش «با هم ترک کنیم»");
            nm.createNotificationChannel(ch);
        }
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            b = new Notification.Builder(ctx, CHANNEL);
        } else {
            b = new Notification.Builder(ctx);
            b.setPriority(urgent ? Notification.PRIORITY_HIGH : Notification.PRIORITY_DEFAULT);
        }
        int icon = ctx.getResources().getIdentifier("ic_stat_raha", "drawable", ctx.getPackageName());
        if (icon == 0) icon = ctx.getApplicationInfo().icon;
        b.setSmallIcon(icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setColor(0xFF1C7A52)
                .setAutoCancel(true);
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open != null) {
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            b.setContentIntent(PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        nm.notify(id, b.build());
    }
}
