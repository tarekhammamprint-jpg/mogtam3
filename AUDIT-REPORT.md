# تقرير الإصلاح الأمني — مجتمعنا

## ما تم تنفيذه

- نقل المصادقة من مقارنة كلمة المرور في المتصفح إلى Firebase Authentication.
- إضافة `authUid` و`userByUid` لربط جلسة Firebase بحساب المنصة.
- إضافة `database.rules.json` لمنع تعديل الرصيد والنقاط والصلاحيات من العميل.
- إضافة `api/cpx-offerwall.js` و`api/cpx-postback.js` مع تحقق ID Token ومنع تكرار المعاملة.
- إضافة `api/metered-room.js` لإنشاء غرف الفيديو من الخادم بعد التحقق من عضوية المجتمع.
- إزالة الاعتماد الأمني على `localStorage`؛ يستخدم فقط كذاكرة واجهة، والمصدر الحقيقي هو Firebase Auth.
- إيقاف إكمال الإعلان المدفوع حتى ربط بوابة دفع حقيقية.
- إضافة رؤوس أمان وملف `.env.example` و`DEPLOYMENT.md`.
- إضافة حد حجم لرفع وسائط الإعلانات وإرسال ID Token إلى خدمة الرفع.

## القيود التي تتطلب إعداداً خارج الحزمة

- يجب تفعيل Email/Password في Firebase Console.
- يجب نشر قواعد `database.rules.json` واختبارها مع مخطط البيانات الفعلي.
- يجب إعداد Firebase Service Account في Vercel Secrets فقط.
- يجب التحقق من صيغة هاش CPX بحسب إعداد حساب CPX الفعلي قبل تشغيل السحب.
- يجب تعديل Cloudflare/Media Worker ليتحقق من Firebase ID Token، لا من `user_id` القادم من المتصفح فقط.
- يجب ربط بوابة دفع حقيقية قبل قبول أي إعلان مدفوع.
- الحسابات القديمة ذات حقل `password` تحتاج ترحيلاً خارجياً آمناً أو إعادة تسجيل؛ لا يتم تحويل كلمات المرور القديمة تلقائياً.

## الاختبارات المنفذة

```text
node --check *.js api/*.js
python3 -m json.tool database.rules.json
python3 -m json.tool vercel.json
```

كل الملفات اجتازت فحص الصياغة وملفات JSON صالحة.
