import { QUIZ_BANK } from './quiz-bank.js';
import { copyText, getTelegramLink, showToast, lsGet, lsSet } from './utils.js';

function $(id){ return document.getElementById(id); }

function show(el, yes=true){
  if (!el) return;
  el.classList.toggle('d-none', !yes);
}

function val(id){ const el=$(id); return el ? el.value.trim() : '' }

function checked(id){ const el=$(id); return !!(el && el.checked); }

function getCheckedValues(name){
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(x=>x.value);
}

const DRAFT_KEY = 'registerDraft_v2';

function normalizeWeakLabel(weak, quizResult) {
  const map = {
    grammar:'القواعد (Structure)',
    vocab:'المفردات',
    reading:'القراءة (Reading)',
    listening:'الاستماع (Listening)',
    writing:'تحليل كتابي (CA)',
    auto:'خلّ الموقع يحدد'
  };
  if (weak === 'auto') return quizResult?.weakest || '—';
  return map[weak] || weak || (quizResult?.weakest || '—');
}

function timelineToDays(timeline) {
  switch (timeline) {
    case '<24h': return 1;
    case '3days': return 3;
    case '1week': return 7;
    case '2weeks': return 14;
    case '1month': return 28;
    default: return 10;
  }
}

function buildSchedule({ days, weakLabel, difficulties }) {
  const tasks = {
    grammar: ['قواعد: أهم القواعد + تمارين مركزة', 'Punctuation/Capitalization + تطبيق سريع'],
    vocab: ['مفردات: كلمات ربط + Academic words', 'Synonyms/Context + مراجعة'],
    reading: ['قراءة: Skimming/Scanning + 2 passages', 'قراءة: Main idea/Inference + تحليل'],
    listening: ['استماع: تقنيات الحل + تدريب', 'استماع: أسئلة متكررة + مراجعة'],
    writing: ['CA: فهم المطلوب + كلمات ربط', 'CA: تدريب سريع + تصحيح'],
    mixed: ['نموذج مصغّر + مراجعة أخطاء', 'مراجعة أخطاء + تثبيت نقاط الضعف']
  };

  // determine primary bucket
  let bucket = 'mixed';
  if (weakLabel.includes('القواعد')) bucket = 'grammar';
  else if (weakLabel.includes('المفردات')) bucket = 'vocab';
  else if (weakLabel.includes('القراءة')) bucket = 'reading';
  else if (weakLabel.includes('الاستماع')) bucket = 'listening';
  else if (weakLabel.includes('CA') || weakLabel.includes('تحليل')) bucket = 'writing';

  const extraBuckets = [];
  (difficulties || []).forEach((d) => {
    if (d.includes('القواعد')) extraBuckets.push('grammar');
    if (d.includes('المفردات')) extraBuckets.push('vocab');
    if (d.includes('القراءة')) extraBuckets.push('reading');
    if (d.includes('الاستماع')) extraBuckets.push('listening');
  });

  const schedule = [];
  for (let day = 1; day <= days; day++) {
    const dayTasks = [];

    // Always a weak-focus task
    dayTasks.push(tasks[bucket][day % 2]);

    // Add one mixed task every day (keeps balance)
    dayTasks.push(tasks.mixed[(day + 1) % 2]);

    // Add a rotating support task
    const rotate = ['vocab','reading','listening','grammar','writing'];
    const rot = rotate[day % rotate.length];
    dayTasks.push(tasks[rot][day % 2]);

    // If close to end, add model emphasis
    if (day === days || (days >= 7 && (day % 7 === 0))) {
      dayTasks.push('🔥 نموذج كامل/شبه كامل + تحليل أخطاء');
    }

    // If there are extra difficulty buckets, inject one on odd days
    if (extraBuckets.length && day % 2 === 1) {
      const b = extraBuckets[day % extraBuckets.length];
      if (b !== bucket) dayTasks.unshift(tasks[b][0]);
    }

    schedule.push({ day, tasks: dayTasks.slice(0, 4) });
  }
  return schedule;
}

function formatSchedule(schedule) {
  return schedule.map(({ day, tasks }) => {
    const lines = tasks.map((t, i) => `  - ${t}`).join('\n');
    return `اليوم ${day}:\n${lines}`;
  }).join('\n\n');
}

function buildStudyPlan({ name, timeline, weak, difficulties, quizResult }) {
  const pieces = [];
  const weakLabel = normalizeWeakLabel(weak, quizResult);
  const days = timelineToDays(timeline);
  const schedule = buildSchedule({ days, weakLabel, difficulties });

  if (name) pieces.push(`👋 يا ${name} — هذي خطة مختصرة تناسب وضعك:`);
  pieces.push(`🎯 تركيزك الأساسي: ${weakLabel}`);

  if (difficulties?.length) {
    pieces.push(`⚠️ الصعوبات: ${difficulties.join('، ')}`);
  }

  const add = (...lines)=>pieces.push(...lines);

  const shown = schedule.length > 14 ? schedule.slice(0, 14) : schedule;
  add(`🗓️ جدولك المقترح (${days} يوم):`);
  add(formatSchedule(shown));
  if (schedule.length > 14) {
    add('');
    add('… وباقي الأيام كمّل على نفس النمط (نموذج أسبوعي + مراجعة أخطاء) ✅');
  }

  if (quizResult) {
    add('');
    add(`📊 نتيجتك في اختبار الـ20 سؤال: ${quizResult.score}/20 (تقريبي)`);
    const breakdown = Object.entries(quizResult.bySection)
      .map(([k,v]) => `${k}:${v.correct}/${v.total}`)
      .join(' | ');
    add(`تفصيل سريع: ${breakdown}`);
  }

  return pieces.join('\n');
}

function pickRandomQuestions(bank, count=20) {
  const copy = bank.slice();
  // shuffle
  for (let i=copy.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]] = [copy[j],copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function computeQuizResult(questions, answers) {
  let score = 0;
  const bySection = {};
  questions.forEach((q, idx) => {
    const sec = q.section;
    if (!bySection[sec]) bySection[sec] = { correct:0, total:0 };
    bySection[sec].total += 1;
    const a = answers[idx];
    if (a === q.answer) {
      score += 1;
      bySection[sec].correct += 1;
    }
  });

  // weakest section by ratio
  let weakest = null;
  let worstRatio = 999;
  Object.entries(bySection).forEach(([sec, stat]) => {
    const r = stat.total ? stat.correct/stat.total : 1;
    if (r < worstRatio) {
      worstRatio = r;
      weakest = sec;
    }
  });

  const names = {
    grammar: 'القواعد (Structure)',
    vocab: 'المفردات',
    reading: 'القراءة (Reading)',
    listening: 'الاستماع (Listening)',
    writing: 'تحليل كتابي (CA)'
  };

  return {
    score,
    weakest: names[weakest] || weakest,
    bySection: {
      'Grammar': bySection.grammar || {correct:0,total:0},
      'Vocab': bySection.vocab || {correct:0,total:0},
      'Reading': bySection.reading || {correct:0,total:0},
      'Listening': bySection.listening || {correct:0,total:0},
      'CA': bySection.writing || {correct:0,total:0}
    }
  };
}

export function initRegisterForm() {
  const form = $('registerForm');
  if (!form || !window.AYED_CONFIG) return;

  const testedYes = $('testedYes');
  const testedNo = $('testedNo');
  const testedBox = $('testedBox');

  const bookedYes = $('bookedYes');
  const bookedNo = $('bookedNo');
  const bookedBox = $('bookedBox');

  const weakSelect = $('weakSection');
  const quizCta = $('quizCta');
  const quizSummary = $('quizSummary');
  const planBox = $('planBox');
  const planText = $('planText');

  // عناصر الإيصال (نحتاجها بدري عشان الاسترجاع والحفظ)
  const receipt = $('receipt');
  const receiptInfo = $('receiptInfo');

  let quizQuestions = [];
  let quizAnswers = [];
  let quizResult = null;

  // ---------- Auto-save draft (Local) ----------
  function readDraft() { return lsGet(DRAFT_KEY, null); }
  function saveDraft(partial = {}) {
    const current = readDraft() || {};

    const draft = {
      ...current,
      ...partial,
      fullName: val('fullName'),
      phone: val('phone'),
      email: val('email'),
      university: val('university'),

      tested: (testedYes && testedYes.checked) ? 'yes' : 'no',
      prevScore: val('prevScore'),
      targetScore: val('targetScore'),
      difficulties: getCheckedValues('difficulties'),

      booked: (bookedYes && bookedYes.checked) ? 'yes' : 'no',
      timeline: val('timeline'),

      weakSection: val('weakSection'),
      quizResult: quizResult || current.quizResult || null,
      planText: val('planText'),

      receiptName: (() => {
        const f = receipt?.files && receipt.files[0];
        return f ? f.name : (current.receiptName || '');
      })(),

      agreeTerms: checked('agreeTerms'),
      agreeRefund: checked('agreeRefund'),
      agreeUndertaking: checked('agreeUndertaking')
    };

    lsSet(DRAFT_KEY, draft);
  }

  function restoreDraft() {
    const d = readDraft();
    if (!d) return;

    if (d.fullName) $('fullName').value = d.fullName;
    if (d.phone) $('phone').value = d.phone;
    if (d.email) $('email').value = d.email;
    if (d.university) $('university').value = d.university;

    // tested
    if (d.tested === 'yes') {
      $('testedYes').checked = true;
      $('testedNo').checked = false;
      if (d.prevScore) $('prevScore').value = d.prevScore;
      if (d.targetScore) $('targetScore').value = d.targetScore;
    } else {
      $('testedNo').checked = true;
    }

    // difficulties
    if (Array.isArray(d.difficulties)) {
      document.querySelectorAll('input[name="difficulties"]').forEach((cb) => {
        cb.checked = d.difficulties.includes(cb.value);
      });
    }

    // booked
    if (d.booked === 'yes') {
      $('bookedYes').checked = true;
      $('bookedNo').checked = false;
      if (d.timeline) $('timeline').value = d.timeline;
    } else {
      $('bookedNo').checked = true;
    }

    // weak
    if (d.weakSection) $('weakSection').value = d.weakSection;

    // quiz
    if (d.quizResult) {
      quizResult = d.quizResult;
      if (quizSummary) {
        quizSummary.innerHTML = `
          <div class="alert alert-success mb-0">
            <div class="fw-bold mb-1">آخر نتيجة محفوظة ✅</div>
            <div>نتيجتك التقريبية: <b>${quizResult.score}/20</b></div>
            <div>أضعف محور (تقريبي): <b>${quizResult.weakest}</b></div>
            <button type="button" class="btn btn-sm btn-outline-success mt-2" id="continueAfterQuiz">كمّل التسجيل</button>
          </div>
        `;
        quizSummary.querySelector('#continueAfterQuiz')?.addEventListener('click', () => {
          document.getElementById('paymentArea')?.scrollIntoView({ behavior:'smooth' });
        });
      }
    }

    // plan
    if (d.planText) {
      show(planBox, true);
      planText.value = d.planText;
    }

    // agreements
    $('agreeTerms').checked = !!d.agreeTerms;
    $('agreeRefund').checked = !!d.agreeRefund;
    $('agreeUndertaking').checked = !!d.agreeUndertaking;

    // receipt hint (cannot restore actual file)
    if (d.receiptName && receiptInfo) {
      receiptInfo.textContent = `آخر ملف إيصال اخترته: ${d.receiptName} (لازم تختاره مرة ثانية قبل التأكيد)`;
    }
  }

  function updateConditional() {
    show(testedBox, testedYes && testedYes.checked);
    show(bookedBox, bookedYes && bookedYes.checked);

    const weak = weakSelect?.value;
    const needsQuiz = weak === 'auto';
    show(quizCta, needsQuiz);
    if (!needsQuiz) {
      quizResult = null;
      if (quizSummary) quizSummary.innerHTML = '';
    }
  }

  testedYes?.addEventListener('change', updateConditional);
  testedNo?.addEventListener('change', updateConditional);
  bookedYes?.addEventListener('change', updateConditional);
  bookedNo?.addEventListener('change', updateConditional);
  weakSelect?.addEventListener('change', updateConditional);
  updateConditional();

  // Restore saved draft (if any)
  restoreDraft();
  updateConditional();

  // Quiz modal
  const quizModalEl = $('quizModal');
  const quizTitle = $('quizTitle');
  const quizBody = $('quizBody');
  const quizNext = $('quizNext');
  const quizPrev = $('quizPrev');
  const quizFinish = $('quizFinish');
  let qi = 0;

  function renderQuestion() {
    const q = quizQuestions[qi];
    if (!q) return;
    quizTitle.textContent = `اختبار سريع (سؤال ${qi+1} من ${quizQuestions.length})`;

    const chosen = quizAnswers[qi];
    quizBody.innerHTML = `
      <div class="mb-2 small text-secondary">${q.prompt}</div>
      <div class="fs-5 fw-semibold mb-3">${q.stem}</div>
      <div class="list-group">
        ${q.options.map((op, idx) => `
          <label class="list-group-item d-flex gap-2 align-items-start">
            <input class="form-check-input mt-1" type="radio" name="q${qi}" value="${idx}" ${chosen===idx?'checked':''}>
            <span>${op}</span>
          </label>
        `).join('')}
      </div>
    `;

    quizPrev.disabled = qi === 0;
    quizNext.classList.toggle('d-none', qi === quizQuestions.length-1);
    quizFinish.classList.toggle('d-none', qi !== quizQuestions.length-1);

    quizBody.querySelectorAll(`input[name="q${qi}"]`).forEach((r) => {
      r.addEventListener('change', () => {
        quizAnswers[qi] = Number(r.value);
      });
    });
  }

  function openQuiz() {
    quizQuestions = pickRandomQuestions(QUIZ_BANK, 20);
    quizAnswers = Array(quizQuestions.length).fill(null);
    qi = 0;
    renderQuestion();

    const modal = bootstrap.Modal.getOrCreateInstance(quizModalEl, { backdrop:'static' });
    modal.show();
  }

  quizCta?.addEventListener('click', openQuiz);

  quizNext?.addEventListener('click', () => {
    if (quizAnswers[qi] === null) {
      showToast('اختَر إجابة قبل تكمل 🙏', 'warning');
      return;
    }
    qi += 1;
    renderQuestion();
  });

  quizPrev?.addEventListener('click', () => {
    qi = Math.max(0, qi-1);
    renderQuestion();
  });

  quizFinish?.addEventListener('click', () => {
    if (quizAnswers[qi] === null) {
      showToast('اختَر إجابة قبل ما تنهي 🙏', 'warning');
      return;
    }

    quizResult = computeQuizResult(quizQuestions, quizAnswers);

    // show summary
    if (quizSummary) {
      quizSummary.innerHTML = `
        <div class="alert alert-success mb-0">
          <div class="fw-bold mb-1">تم ✅</div>
          <div>نتيجتك التقريبية: <b>${quizResult.score}/20</b></div>
          <div>أضعف محور (تقريبي): <b>${quizResult.weakest}</b></div>
          <button type="button" class="btn btn-sm btn-outline-success mt-2" id="continueAfterQuiz">كمّل التسجيل</button>
        </div>
      `;
      quizSummary.querySelector('#continueAfterQuiz')?.addEventListener('click', () => {
        document.getElementById('paymentArea')?.scrollIntoView({ behavior:'smooth' });
      });
    }

    // close modal
    bootstrap.Modal.getInstance(quizModalEl)?.hide();

    // auto generate plan preview
    const timeline = val('timeline');
    const difficulties = getCheckedValues('difficulties');
    const plan = buildStudyPlan({ name: val('fullName'), timeline, weak: 'auto', difficulties, quizResult });

    show(planBox, true);
    planText.value = plan;
    saveDraft({ quizResult, planText: plan });
    showToast('طلعنا لك خطة مذاكرة سريعة ✨ تقدر تنسخها أو نخليها تنرسل مع رسالة الاشتراك', 'success');
  });

  // Generate plan button
  $('buildPlanBtn')?.addEventListener('click', () => {
    const weak = val('weakSection');
    const timeline = val('timeline');
    const difficulties = getCheckedValues('difficulties');

    const plan = buildStudyPlan({ name: val('fullName'), timeline, weak, difficulties, quizResult });
    show(planBox, true);
    planText.value = plan;
    saveDraft({ planText: plan });
    showToast('تم تجهيز الخطة ✅', 'success');
  });

  // Receipt preview
  receipt?.addEventListener('change', () => {
    const f = receipt.files && receipt.files[0];
    if (!f) {
      receiptInfo.textContent = 'ما تم اختيار ملف.';
      return;
    }
    receiptInfo.textContent = `تم اختيار: ${f.name}`;
    saveDraft({ receiptName: f.name });
  });

  // Auto-save on any input/change
  const watchSelectors = [
    '#fullName','#phone','#email','#university',
    '#prevScore','#targetScore','#timeline','#weakSection','#planText',
    'input[name="tested"]','input[name="booked"]','input[name="difficulties"]',
    '#agreeTerms','#agreeRefund','#agreeUndertaking'
  ];
  watchSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('input', () => saveDraft());
      el.addEventListener('change', () => saveDraft());
    });
  });

  // Build Telegram message
  function buildMessage() {
    const cfg = window.AYED_CONFIG;

    const name = val('fullName');
    const phone = val('phone');
    const email = val('email');
    const university = val('university');

    const tested = (testedYes && testedYes.checked) ? 'نعم' : 'لا';
    const prevScore = val('prevScore');
    const targetScore = val('targetScore');

    const booked = (bookedYes && bookedYes.checked) ? 'نعم' : 'لا';
    const timeline = val('timeline');
    const timelineLabel = {
      '<24h':'أقل من 24 ساعة',
      '3days':'خلال 3 أيام',
      '1week':'خلال أسبوع',
      '2weeks':'خلال أسبوعين',
      '1month':'خلال شهر',
      'more':'أكثر من شهر / غير محدد'
    }[timeline] || 'غير محدد';

    const weak = val('weakSection');
    const weakLabel = normalizeWeakLabel(weak, quizResult);

    const diffs = getCheckedValues('difficulties');
    const diffsLine = diffs.length ? diffs.join('، ') : '—';

    const plan = val('planText');

    const f = receipt?.files && receipt.files[0];
    const receiptName = f ? f.name : '—';

    const price = cfg.pricing.discounted;

    const lines = [
      `**تأكيد اشتراك — ${cfg.course.shortName}**`,
      '',
      `السلام عليكم ورحمة الله`,
      `أبغى تأكيد اشتراكي في: ${cfg.course.name}`,
      '',
      `**بيانات الطالب**`,
      `الاسم: ${name}`,
      `الجوال: ${phone}`,
      `الإيميل: ${email}`,
      university ? `الجامعة/الجهة: ${university}` : null,
      '',
      `**معلومات STEP**`,
      `هل اختبرت STEP سابقًا؟ ${tested}`,
      tested === 'نعم' ? `درجتي السابقة: ${prevScore || '—'}` : null,
      `الدرجة المستهدفة: ${targetScore || '—'}`,
      `الصعوبات السابقة: ${diffsLine}`,
      '',
      `**موعد الاختبار**`,
      `هل حجزت موعد اختبارك؟ ${booked}`,
      booked === 'نعم' ? `باقي على الاختبار: ${timelineLabel}` : null,
      '',
      `**تقييم المستوى**`,
      `أضعف قسم عندي: ${weakLabel}${quizResult ? ` (اختبار 20 سؤال: ${quizResult.score}/20 — أضعف محور: ${quizResult.weakest})` : ''}`,
      '',
      `**الخطة المختصرة**`,
      plan ? plan : '—',
      '',
      `**التحويل البنكي**`,
      `تم التحويل: نعم`,
      `القيمة: ${price} ر.س (خصم يوم التأسيس)`,
      `اسم ملف الإيصال: ${receiptName}`,
      '',
      `**ملاحظة مهمة**`,
      `راح أرفق إيصال التحويل داخل نفس المحادثة ✅`,
      `الرد يكون حسب الدور — فضلاً لا تكرر الإرسال لأن التكرار يسبب تأخير 🙏`,
    ].filter(Boolean);

    return lines.join('\n');
  }

  const copyMsgBtn = $('copyMsgBtn');
  const openTgBtn = $('openTgBtn');

  async function validate() {
    // Basic validation
    const required = ['fullName','phone','email'];
    for (const id of required) {
      if (!val(id)) {
        showToast('فضلاً عبّي البيانات الأساسية كاملة 🙏', 'warning');
        $(id)?.focus();
        return false;
      }
    }

    // agreements
    if (!checked('agreeTerms') || !checked('agreeRefund') || !checked('agreeUndertaking')) {
      showToast('لازم توافق على التعهدات وسياسة الاسترجاع قبل التأكيد ✅', 'warning');
      return false;
    }

    // if tested yes then prevScore recommended
    if (testedYes && testedYes.checked && !val('prevScore')) {
      showToast('اختر درجتك السابقة (لو متذكر) عشان نبني خطة أدق 🙏', 'info');
    }

    // if booked yes then timeline required
    if (bookedYes && bookedYes.checked && !val('timeline')) {
      showToast('حدد كم باقي على اختبارك 🙏', 'warning');
      $('timeline')?.focus();
      return false;
    }

    // if weak auto but quiz not done
    if (val('weakSection') === 'auto' && !quizResult) {
      showToast('اخترت "خل الموقع يحدد" — سو اختبار الـ20 سؤال أول 👍', 'warning');
      return false;
    }

    // receipt is mandatory
    const f = receipt?.files && receipt.files[0];
    if (!f) {
      showToast('لازم ترفق الإيصال قبل تأكيد الاشتراك 🙏', 'warning');
      receipt?.focus();
      return false;
    }

    // plan is optional, but recommended
    return true;
  }

  copyMsgBtn?.addEventListener('click', async () => {
    if (!(await validate())) return;
    const msg = buildMessage();
    const ok = await copyText(msg);
    showToast(ok ? 'تم نسخ رسالة الاشتراك ✅' : 'ما قدرنا ننسخ الرسالة…', ok ? 'success' : 'warning');
  });

  openTgBtn?.addEventListener('click', async () => {
    if (!(await validate())) return;
    saveDraft();
    const msg = buildMessage();
    const link = getTelegramLink(window.AYED_CONFIG.academy.telegramUsername, msg);

    // Best-effort: open Telegram
    window.open(link, '_blank');

    // also auto-copy
    copyText(msg).then(()=>{});

    // go to success page
    setTimeout(() => {
      window.location.href = 'success.html';
    }, 600);
  });

  // scroll helper
  $('goBankBtn')?.addEventListener('click', () => {
    window.location.href = window.AYED_CONFIG.links.bankTransfer;
  });
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  try { initRegisterForm(); } catch(e) { console.error(e); }
});
