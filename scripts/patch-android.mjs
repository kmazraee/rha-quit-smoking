// بعد از `npx cap add android` اجرا می‌شود و بخش‌های بومی اپ را اضافه می‌کند:
// ویجت صفحه‌ی اصلی، افزونه‌ی ارتباط با ویجت، آیکن اعلان و شماره‌ی نسخه.
// استفاده: node scripts/patch-android.mjs <شماره‌ی ساخت>
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const android = path.join(root, 'android', 'app');
const main = path.join(android, 'src', 'main');
const native = path.join(root, 'native', 'android');
const config = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
const pkg = config.appId;
const build = parseInt(process.argv[2] || '1', 10);

if (!fs.existsSync(main)) {
  console.error('پوشه‌ی android پیدا نشد؛ اول npx cap add android را اجرا کنید.');
  process.exit(1);
}

// ۱) فایل‌های جاوا (ویجت، افزونه، MainActivity) در پوشه‌ی بسته‌ی اپ
const javaDir = path.join(main, 'java', ...pkg.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
for (const f of fs.readdirSync(path.join(native, 'java'))) {
  const src = fs.readFileSync(path.join(native, 'java', f), 'utf8').replaceAll('__PACKAGE__', pkg);
  fs.writeFileSync(path.join(javaDir, f), src);
  console.log('java:', f);
}

// ۲) منابع (چیدمان ویجت، پس‌زمینه، تنظیمات ویجت)
const resDir = path.join(main, 'res');
for (const sub of fs.readdirSync(path.join(native, 'res'))) {
  fs.mkdirSync(path.join(resDir, sub), { recursive: true });
  for (const f of fs.readdirSync(path.join(native, 'res', sub))) {
    fs.copyFileSync(path.join(native, 'res', sub, f), path.join(resDir, sub, f));
    console.log('res:', sub + '/' + f);
  }
}
// آیکن کوچک اعلان
fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
fs.copyFileSync(path.join(root, 'resources', 'ic_stat_raha.xml'), path.join(resDir, 'drawable', 'ic_stat_raha.xml'));

// ۳) ثبت ویجت در AndroidManifest
const manifestPath = path.join(main, 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('.RahaWidget"')) {
  const receiver = `
        <receiver
            android:name=".RahaWidget"
            android:exported="true"
            android:label="رها — پیشرفت ترک">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/raha_widget_info" />
        </receiver>
    </application>`;
  manifest = manifest.replace('</application>', receiver);
  fs.writeFileSync(manifestPath, manifest);
  console.log('manifest: widget receiver added');
}

// ۴) شماره‌ی نسخه
const gradlePath = path.join(android, 'build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode \d+/, `versionCode ${build}`).replace(/versionName "[^"]*"/, `versionName "0.1.${build}"`);
// ۵) نسخه‌ی release (نه debug) با همان کلید امضای ثابت، تا روی نسخه‌های قبلی نصب شود
if (!gradle.includes('rahaRelease')) {
  gradle = gradle.replace('    buildTypes {', `    signingConfigs {
        rahaRelease {
            storeFile rootProject.file('../signing/debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {`);
  gradle = gradle.replace(/release \{\n(\s*)minifyEnabled false/, 'release {\n$1signingConfig signingConfigs.rahaRelease\n$1debuggable false\n$1minifyEnabled false');
}
fs.writeFileSync(gradlePath, gradle);
console.log(`version: 0.1.${build} (${build})`);
