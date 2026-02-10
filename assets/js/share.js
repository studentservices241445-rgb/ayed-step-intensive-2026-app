import { copyText, showToast } from './utils.js';

function getBaseUrl() {
  // Build absolute share URL safely
  const base = location.origin + location.pathname.replace(/\/[^\/]*$/, '/');
  return base;
}

function getPageContext() {
  const fromAttr = document.body?.getAttribute('data-share-context');
  if (fromAttr) return fromAttr;

  const p = (location.pathname || '').toLowerCase();
  if (p.endsWith('course.html')) return 'course';
  if (p.endsWith('seu-step.html')) return 'seu';
  if (p.endsWith('bank-transfer.html')) return 'bank';
  if (p.endsWith('register.html')) return 'register';
  if (p.endsWith('success.html')) return 'success';
  return 'home';
}

function pick(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildShareText(ctx) {
  const cfg = window.AYED_CONFIG;
  const course = cfg?.course?.name || 'الدورة المكثفة';
  const price = cfg?.pricing?.discounted ?? 299;
  const original = cfg?.pricing?.original ?? 449;
  const url = location.href;

  const verse = 'قال تعالى: {وَقُل رَّبِّ زِدْنِي عِلْمًا}';
  const hadith = 'من سلك طريقًا يلتمس فيه علمًا، سهّل الله له به طريقًا إلى الجنة.';

  const copies = {
    home: [
      `🎉 خصم يوم التأسيس على ${course}\nالسعر الآن: ${price} ر.س (بدل ${original})\nسجّل من هنا: ${url}`,
      `${verse} 📚\nإذا تبغى ترفع درجتك في STEP… هذا طريقك.\nسجّل من هنا: ${url}`,
      `${hadith} ✨\nابدأ صح وخلك على خطة واضحة لـ STEP 2026.\nالرابط: ${url}`,
    ],
    course: [
      `📌 محتوى ${course} مرتب… بدون تشتيت\nشوف الفهرس هنا: ${url}`,
      `${verse} 📚\nخلك على ترتيب صحيح للمذاكرة… الفهرس هنا: ${url}`,
      `🔥 نماذج + تدريب مكثف + خطة\nشوف محتوى الدورة: ${url}`,
    ],
    seu: [
      `🎓 طلاب السعودية الإلكترونية: لا تخاطر… جهز STEP صح\nتفاصيل مهمة هنا: ${url}`,
      `${verse} 📚\nإذا هدفك إعفاء/متطلب… خلك على خطة واضحة.\nالرابط: ${url}`,
      `✅ شرح مبسط لمتطلبات STEP للجامعة + كيف تتجهز\nالرابط: ${url}`,
    ],
    bank: [
      `💳 بيانات التحويل جاهزة للنسخ + تعليمات واضحة\nالرابط: ${url}`,
      `⚡ خلّ التحويل أسهل: نسخ آيبان/حساب بضغطة\nالرابط: ${url}`,
    ],
    register: [
      `📝 نموذج تسجيل سريع لـ ${course}\n+ اختبار 20 سؤال (إذا ما تعرف أضعف قسم)\nالرابط: ${url}`,
      `${hadith} ✨\nسجّل وخلك على خطة مذاكرة حسب وضعك.\nالرابط: ${url}`,
    ],
    success: [
      `✅ تم! هذا رابط ${course} لو تبي ترسله لصاحبك\n${url}`,
      `🎉 شارك الخير: ${course} (خصم يوم التأسيس)\n${url}`,
    ]
  };

  return pick(copies[ctx]) || pick(copies.home) || `سجّل هنا: ${url}`;
}

function getSharePayload() {
  const ctx = getPageContext();
  return {
    title: document.title,
    url: location.href,
    text: buildShareText(ctx)
  };
}

function openShareLink(kind) {
  const { text, url } = getSharePayload();
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  const links = {
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
  };

  const target = links[kind];
  if (target) window.open(target, '_blank', 'noopener');
}

function bindShareBar() {
  const bars = document.querySelectorAll('[data-share-bar]');
  if (!bars.length) return;

  bars.forEach((bar) => {
    bar.innerHTML = `
      <div class="sharebar-inner">
        <button class="share-chip" type="button" data-share-kind="x" aria-label="مشاركة على X">
          <span class="share-ic">𝕏</span><span>تغريدة</span>
        </button>
        <button class="share-chip" type="button" data-share-kind="whatsapp" aria-label="مشاركة على واتساب">
          <span class="share-ic">🟢</span><span>واتساب</span>
        </button>
        <button class="share-chip" type="button" data-share-kind="telegram" aria-label="مشاركة على تلجرام">
          <span class="share-ic">✈️</span><span>تلجرام</span>
        </button>
        <button class="share-chip" type="button" data-share-kind="copy" aria-label="نسخ الرابط">
          <span class="share-ic">📎</span><span>نسخ</span>
        </button>
      </div>
    `;

    bar.querySelectorAll('[data-share-kind]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const kind = btn.getAttribute('data-share-kind');
        if (kind === 'copy') {
          const ok = await copyText(location.href);
          showToast(ok ? 'تم نسخ الرابط ✅' : 'ما قدرنا ننسخ الرابط…', ok ? 'success' : 'warning');
          return;
        }
        openShareLink(kind);
      });
    });
  });
}

export function initShareButtons() {
  // Top share button (native share first)
  const btn = document.getElementById('shareBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      const payload = getSharePayload();
      if (navigator.share) {
        try {
          await navigator.share(payload);
          return;
        } catch {
          // ignore
        }
      }

      // fallback: copy link
      const ok = await copyText(payload.url);
      showToast(ok ? 'تم نسخ رابط الصفحة ✅' : 'ما قدرنا ننسخ الرابط…', ok ? 'success' : 'warning');
    });
  }

  // Inline share bars
  bindShareBar();
}

export function getFoundingDayShareCopy() {
  const cfg = window.AYED_CONFIG;
  const base = getBaseUrl();
  const url = base + 'index.html';
  const course = cfg?.course?.name || 'الدورة المكثفة';
  const price = cfg?.pricing?.discounted ?? 299;
  const original = cfg?.pricing?.original ?? 449;

  // Keep these as predictable copies (used in the "صيغ مشاركة" page section)
  return {
    x: `🎉 خصم يوم التأسيس على ${course}\nالسعر الآن: ${price} ر.س (بدل ${original})\nسجّل من هنا: ${url}\n#يوم_التأسيس #STEP2026 #أكاديمية_عايد`,
    whatsapp: `🎉 خصم يوم التأسيس على ${course}\nالسعر الآن: ${price} ر.س (بدل ${original})\nسجّل من هنا: ${url}`,
    telegram: `🎉 خصم يوم التأسيس على ${course}\nالسعر الآن: ${price} ر.س (بدل ${original})\nسجّل من هنا: ${url}`
  };
}
