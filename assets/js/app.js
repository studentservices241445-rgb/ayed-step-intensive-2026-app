import { initThemeToggle } from './theme.js';
import { initDiscountTimer, initSeatsCounter } from './counters.js';
import { initShareButtons, getFoundingDayShareCopy } from './share.js';
import { initAssistant } from './assistant.js';
import { initToastsAuto } from './toasts.js';
import { initPWA } from './pwa.js';
import { copyText, showToast } from './utils.js';

function initReveal() {
  // Auto-tag common blocks for a smooth premium feel
  document.querySelectorAll('.hero, .card-soft, .form-section').forEach((el) => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });

  const els = Array.from(document.querySelectorAll('.reveal'));
  if (!els.length) return;

  // If IntersectionObserver not available, show all
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -10% 0px' });

  els.forEach((el) => io.observe(el));
}

function bindConfigToDOM() {
  const cfg = window.AYED_CONFIG;
  if (!cfg) return;
  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };

  setText('academyName', cfg.academy.name);
  setText('courseName', cfg.course.name);
  setText('courseYear', cfg.course.year);
  setText('telegramUser', '@' + cfg.academy.telegramUsername);

  // Copyright year
  const y = document.getElementById('copyrightYear');
  if (y) y.textContent = String(new Date().getFullYear());

  // Group link
  const groupLink = document.getElementById('groupLink');
  if (groupLink) {
    groupLink.href = cfg.academy.telegramGroupUrl;
    groupLink.textContent = cfg.academy.telegramGroupUrl;
  }

  // Founding day share copy
  const copies = getFoundingDayShareCopy();
  const map = {
    shareX: copies.x,
    shareWhatsApp: copies.whatsapp,
    shareTelegram: copies.telegram,
  };
  Object.entries(map).forEach(([id, text]) => {
    const ta = document.getElementById(id);
    if (!ta) return;
    ta.value = text;
    const btn = document.querySelector(`[data-copy-for="${id}"]`);
    if (btn) {
      btn.addEventListener('click', async () => {
        const ok = await copyText(text);
        showToast(ok ? 'تم النسخ ✅' : 'ما قدرنا ننسخ…', ok ? 'success' : 'warning');
      });
    }
  });
}

function bindCopyButtons() {
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-copy');
      const el = document.getElementById(targetId);
      if (!el) return;
      const text = (el.value !== undefined) ? el.value : el.textContent;
      const ok = await copyText(text.trim());
      showToast(ok ? 'تم النسخ ✅' : 'ما قدرنا ننسخ…', ok ? 'success' : 'warning');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindConfigToDOM();
  bindCopyButtons();

  initThemeToggle();
  initPWA();

  initDiscountTimer();
  initSeatsCounter();
  initShareButtons();
  initAssistant();
  initToastsAuto();
  initReveal();

  // Smooth anchor for internal links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth' });
    });
  });
});
