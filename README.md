# باهم ببینیم

اپ دو نفره برای تماشای همزمان و چت.

## معماری
- هر روم حداکثر ۲ نفر دارد.
- ویدئو روی هر دستگاه محلی است و به سرور ارسال نمی‌شود.
- Socket.IO فقط وضعیت پخش (play/pause/seek) و پیام‌های چت را منتقل می‌کند.
- رابط کاربری برای Portrait و Landscape جداگانه طراحی شده.
- آماده تبدیل به Android با Capacitor است.

## اجرا
```bash
npm run install:all
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

برای دو دستگاه در شبکه محلی، آدرس IP کامپیوتر را به جای localhost استفاده کنید؛
مثلاً:
http://192.168.1.20:5173

در production می‌توانید frontend را build کنید و خروجی client/dist را با هر سرویس static یا Railway سرو کنید.

## Android
بعد از نصب Capacitor:
```bash
cd client
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "باهم ببینیم" "ir.bahambebinim.app"
npx cap add android
npx cap copy android
npx cap open android
```

سپس از Android Studio می‌توان APK ساخت.

## نکته مهم
چون ویدئوها محلی هستند، دو نفر باید فایل ویدئویی یکسانی داشته باشند تا تصویر واقعاً یکسان پخش شود. سرور فقط زمان/وضعیت پخش را هماهنگ می‌کند.
