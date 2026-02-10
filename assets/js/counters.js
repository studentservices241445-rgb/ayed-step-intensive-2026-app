import { lsGet, lsSet, msToParts, nowMs, randomInt, formatCurrency, showToast } from './utils.js';

function daysToMs(days){ return days * 24 * 60 * 60 * 1000; }

export function initDiscountTimer() {
  const el = document.getElementById('discountTimer');
  const priceNowEl = document.getElementById('priceNow');
  const priceOldEl = document.getElementById('priceOld');
  const priceBadgeEl = document.getElementById('discountBadge');
  if (!el || !window.AYED_CONFIG) return;

  const cfg = window.AYED_CONFIG;
  const currency = cfg.pricing.currency || 'ر.س';

  // prices
  if (priceOldEl) priceOldEl.textContent = formatCurrency(cfg.pricing.original, currency);

  function ensureEnd() {
    let end = lsGet('discountEnd', null);
    let cycleIdx = lsGet('discountCycleIdx', 0);

    if (!end) {
      end = nowMs() + daysToMs(cfg.pricing.initialDiscountDays);
      lsSet('discountEnd', end);
      lsSet('discountCycleIdx', 0);
      return { end, cycleIdx: 0 };
    }

    // expired? extend automatically
    if (nowMs() > end) {
      const cycle = cfg.pricing.discountExtensionsCycleDays || [3,7];
      const addDays = cycle[cycleIdx % cycle.length];
      end = nowMs() + daysToMs(addDays);
      cycleIdx = (cycleIdx + 1) % cycle.length;
      lsSet('discountEnd', end);
      lsSet('discountCycleIdx', cycleIdx);

      showToast(`انتهى العرض وفتحنا لك تمديد جديد ${addDays} أيام 🎉`, 'success');
    }

    return { end, cycleIdx };
  }

  function tick() {
    const { end } = ensureEnd();
    const left = end - nowMs();
    const { days, hours, mins, secs } = msToParts(left);

    el.textContent = `${days}ي ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    if (priceNowEl) priceNowEl.textContent = formatCurrency(cfg.pricing.discounted, currency);
    if (priceBadgeEl) priceBadgeEl.textContent = `خصم يوم التأسيس: ${formatCurrency(cfg.pricing.discounted, currency)}`;

    requestAnimationFrame(()=>{});
  }

  tick();
  setInterval(tick, 1000);
}

export function initSeatsCounter() {
  const el = document.getElementById('seatsCount');
  const bar = document.getElementById('seatsBar');
  if (!el || !window.AYED_CONFIG) return;

  const cfg = window.AYED_CONFIG.seats || {};

  // If the rules change, reset the marketing counter (keeps UX consistent)
  const STORAGE_VERSION = 2;
  const storedV = lsGet('seatsVersion', 0);
  if (storedV !== STORAGE_VERSION) {
    lsSet('seatsVersion', STORAGE_VERSION);
    lsSet('seatsAvailable', cfg.initialAvailable ?? 57);
    lsSet('seatsMaxSeen', cfg.initialAvailable ?? 57);
    lsSet('seatsPauseUntil', 0);
    lsSet('seatsRefillAt', 0);
    lsSet('seatsRefillAmount', 0);
    lsSet('seatsNextDecayAt', 0);
  }
  const decayOptions = Array.isArray(cfg.decaySecondsOptions) && cfg.decaySecondsOptions.length
    ? cfg.decaySecondsOptions
    : [30,45,60,70];

  let seats = lsGet('seatsAvailable', null);
  let nextDecayAt = lsGet('seatsNextDecayAt', null);
  let pauseUntil = lsGet('seatsPauseUntil', 0);
  let refillAt = lsGet('seatsRefillAt', 0);
  let refillAmount = lsGet('seatsRefillAmount', 0);
  let maxSeen = lsGet('seatsMaxSeen', cfg.initialAvailable || 57);

  if (typeof seats !== 'number') {
    seats = cfg.initialAvailable || 57;
    lsSet('seatsAvailable', seats);
  }

  function discountLeftLabel() {
    const end = lsGet('discountEnd', null);
    if (typeof end !== 'number') return '';
    const left = end - nowMs();
    const { days, hours, mins, secs } = msToParts(left);
    return `${days}ي ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }

  function updateUI() {
    el.textContent = `${seats}`;
    if (seats > maxSeen) {
      maxSeen = seats;
      lsSet('seatsMaxSeen', maxSeen);
    }
    if (bar) {
      const denom = Math.max(1, maxSeen);
      const pct = Math.max(0, Math.min(100, (seats / denom) * 100));
      bar.style.width = `${pct}%`;
    }
  }

  function scheduleNext() {
    const sec = decayOptions[randomInt(0, decayOptions.length - 1)];
    nextDecayAt = nowMs() + (sec * 1000);
    lsSet('seatsNextDecayAt', nextDecayAt);
  }

  function armPauseAndRefill() {
    const threshold = Number(cfg.pauseWhenBelow ?? 3);
    if (seats >= threshold) return;

    pauseUntil = nowMs() + (Number(cfg.pauseSeconds ?? 180) * 1000);
    refillAt = pauseUntil;
    refillAmount = randomInt(Number(cfg.refillOnDemandMin ?? 12), Number(cfg.refillOnDemandMax ?? 25));

    lsSet('seatsPauseUntil', pauseUntil);
    lsSet('seatsRefillAt', refillAt);
    lsSet('seatsRefillAmount', refillAmount);

    showToast('⏸️ المقاعد قربت تخلص… بنفتح مقاعد إضافية بعد قليل بسبب كثرة الطلب 🔥', 'warning');
  }

  function applyPendingRefill() {
    if (refillAt && typeof refillAt === 'number' && nowMs() >= refillAt && refillAmount && typeof refillAmount === 'number') {
      seats = seats + refillAmount;
      lsSet('seatsAvailable', seats);
      lsSet('seatsMaxSeen', Math.max(maxSeen, seats));

      // clear
      pauseUntil = 0;
      refillAt = 0;
      refillAmount = 0;
      lsSet('seatsPauseUntil', pauseUntil);
      lsSet('seatsRefillAt', refillAt);
      lsSet('seatsRefillAmount', refillAmount);

      showToast(`✅ تم فتح مقاعد إضافية لكثرة الطلب… المقاعد الآن: ${seats} مقعد`, 'success');
      scheduleNext();
    }
  }

  // Ensure we always have a next tick
  if (typeof nextDecayAt !== 'number' || nextDecayAt < nowMs()) scheduleNext();

  function tick() {
    applyPendingRefill();

    // paused?
    if (pauseUntil && nowMs() < pauseUntil) {
      updateUI();
      return;
    }

    if (nowMs() >= nextDecayAt) {
      const dec = randomInt(Number(cfg.decrementMin ?? 1), Number(cfg.decrementMax ?? 2));
      seats = Math.max(Number(cfg.minAvailable ?? 0), seats - dec);
      lsSet('seatsAvailable', seats);

      const left = discountLeftLabel();
      if (left) showToast(`🎟️ المقاعد: ${seats} | ⏳ باقي على الخصم: ${left}`, 'info');
      else showToast(`🎟️ المقاعد المتبقية: ${seats}`, 'info');

      // If seats reached 0 (احتياط)
      if (seats <= 0) {
        const refill = randomInt(Number(cfg.refillOnDemandMin ?? 12), Number(cfg.refillOnDemandMax ?? 25));
        seats = refill;
        lsSet('seatsAvailable', seats);
        showToast('🎯 خلصت المقاعد… فتحنا دفعة جديدة!', 'success');
      }

      // Pause/refill logic when low
      armPauseAndRefill();
      if (!pauseUntil) scheduleNext();
      else lsSet('seatsNextDecayAt', pauseUntil);
    }

    updateUI();
  }

  tick();
  setInterval(tick, 1000);
}
