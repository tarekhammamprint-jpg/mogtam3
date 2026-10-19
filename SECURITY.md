# الأمن

- كلمات المرور لا تُحفظ في قاعدة البيانات؛ تستخدم Firebase Authentication.
- لا تضع Service Account أو CPX/Metered secrets في ملفات الواجهة.
- طبّق `database.rules.json` قبل النشر.
- اجعل خادم رفع الوسائط يتحقق من Firebase ID Token ولا يثق في `user_id` القادم من المتصفح.
- اختبر CPX postback بإعادة إرسال نفس `transaction_id` وبقيم سالبة وغير صحيحة.
- راجع كل `innerHTML` عند إضافة مكونات جديدة، واستخدم `window.escapeHTML` للنصوص غير الموثوقة.
- الحسابات القديمة التي تحتوي على `password` تحتاج مسار ترحيل خارجي آمن، ولا يجوز إعادة استخدام كلمات المرور القديمة.
