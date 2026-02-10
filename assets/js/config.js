/* إعدادات الموقع */

window.AYED_CONFIG = {
  academy: {
    name: 'أكاديمية عايد الرسمية',
    brandName: 'A Y E D',
    telegramUsername: 'Ayed_Academy_2026',
    telegramGroupUrl: 'https://t.me/Academy_Ayed_2026',
  },

  course: {
    name: 'الدورة المكثفة لاختبار STEP 2026',
    shortName: 'STEP مكثف 2026',
    year: '2026',
    category: 'STEP',
  },

  pricing: {
    currency: 'ر.س',
    original: 449,
    discounted: 299,
    // يبدأ الخصم 7 أيام
    initialDiscountDays: 7,
    // عند انتهاء الخصم: أضف 3 أيام، ثم 7 أيام، ثم 3، ثم 7…
    discountExtensionsCycleDays: [3, 7],
  },

  seats: {
    // مقاعد “تفاعلية” (مؤشر تسويقي)
    // تبدأ بـ 57 مقعد وتتحرك بشكل طبيعي كل (30/45/60/70) ثانية.
    initialAvailable: 57,
    minAvailable: 0,

    // خيارات نزول المقاعد بالثواني (يتم اختيار واحد بشكل عشوائي كل مرة)
    decaySecondsOptions: [30, 45, 60, 70],

    // كل مرة ينقص: 1 أو 2 مقعد
    decrementMin: 1,
    decrementMax: 2,

    // إذا صارت المقاعد أقل من 3: وقف 3 دقائق ثم افتح مقاعد إضافية
    pauseWhenBelow: 3,
    pauseSeconds: 180,
    refillOnDemandMin: 12,
    refillOnDemandMax: 25,
  },

  bankTransfer: {
    // ⚠️ عبّي البيانات الرسمية هنا
    bankName: 'بنك الانماء',
    accountName: 'مؤسسة كريتيفا جلوبال لتقنية المعلومات',
    iban: 'SA4905000068206067557000',
    accountNumber: '68206067557000',
    purpose: 'اشتراك الدورة المكثفة STEP 2026',
    notes: [
      'بعد التحويل صوّر/احفظ الإيصال وارفقه لنا في تلجرام مع رسالة الاشتراك.',
      'إذا حولت من بنك مختلف، أحياناً يظهر الإيصال بعد دقائق — لا تشيل هم.',
    ],
  },

  links: {
    register: 'register.html',
    bankTransfer: 'bank-transfer.html',
    seuStep: 'seu-step.html',
    courseContent: 'course.html',
  },

  ui: {
    // light | dark | system
    defaultTheme: 'system',
    enableToasts: true,
  }
};
