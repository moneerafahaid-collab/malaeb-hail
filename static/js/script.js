/**
 * منصة ملاعب حائل – JavaScript
 * حجز بمواعيد + صور حدائق + جدول أوقات
 * وتسجيل الدخول برمز تحقق ثابت
 */

document.addEventListener("DOMContentLoaded", () => {
  initBookingForm();
  initLoginForm();
});

/* ---------- صفحة الحجز ---------- */
function initBookingForm() {
  const form = document.getElementById("booking-form");
  if (!form) return;

  const message = document.getElementById("booking-message");
  const parkSelect = document.getElementById("park");
  const fieldSelect = document.getElementById("field-type");
  const dateInput = document.getElementById("booking-date");
  const timeInput = document.getElementById("selected-time");
  const hoursInput = document.getElementById("hours");
  const summary = document.getElementById("booking-summary");
  const scheduleSubtitle = document.getElementById("schedule-subtitle");
  const parkCards = document.querySelectorAll(".park-card");
  const parkMap = document.getElementById("park-map");
  const mapTitle = document.getElementById("map-title");
  const mapFrame = document.getElementById("map-frame");
  const mapPin = document.getElementById("map-pin");
  const mapPinLabel = document.getElementById("map-pin-label");

  const bookedSlots = parseJsonAttr(form.dataset.booked, []);
  const bookedSet = new Set(bookedSlots);

  // منع اختيار تواريخ سابقة
  const today = new Date();
  dateInput.min = formatDateInput(today);
  if (!dateInput.value) {
    dateInput.value = formatDateInput(today);
  }

  parkCards.forEach((card) => {
    card.addEventListener("click", () => selectParkCard(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectParkCard(card);
      }
    });
  });

  parkSelect.addEventListener("change", () => {
    syncParkCardsFromSelect();
    ensureDefaultFieldType();
    const selectedOption = parkSelect.selectedOptions[0];
    if (selectedOption) {
      focusMapOnPark({
        name: selectedOption.value,
        lat: selectedOption.dataset.lat,
        lng: selectedOption.dataset.lng,
        query: selectedOption.dataset.mapQuery,
      });
    }
    clearSelectedTime();
    refreshSchedule();
    updateSummary();
  });

  fieldSelect.addEventListener("change", () => {
    clearSelectedTime();
    refreshSchedule();
    updateSummary();
  });

  hoursInput.addEventListener("change", updateSummary);

  // تفويض النقر على أزرار الأوقات (أكثر ثباتاً)
  document.getElementById("schedule-body")?.addEventListener("click", (event) => {
    const btn = event.target.closest(".slot-btn");
    if (!btn || btn.disabled) {
      if (btn?.disabled) {
        showMessage(message, "هذا الوقت غير متاح. اختر وقتاً بلون أخضر.", "error");
      }
      return;
    }

    document.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("is-selected"));
    document.querySelectorAll("#schedule-body tr").forEach((row) => row.classList.remove("is-selected"));

    btn.classList.add("is-selected");
    btn.closest("tr")?.classList.add("is-selected");
    timeInput.value = btn.dataset.time || "";
    showMessage(message, `تم اختيار الوقت ${timeInput.value}. أكمل البيانات ثم اضغط تأكيد الحجز.`, "success");
    updateSummary();
  });

  dateInput.addEventListener("change", async () => {
    await reloadBookedSlots();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = form.username.value.trim();
    const park = parkSelect.value;
    const fieldType = fieldSelect.value;
    const bookingDate = dateInput.value;
    const selectedTime = timeInput.value;
    const hours = Number(hoursInput.value);
    const parkId = getSelectedParkId();

    if (!username || !park || !fieldType || !bookingDate || !selectedTime || !hours || hours < 1) {
      showMessage(message, "يرجى تعبئة جميع الحقول واختيار وقت من الجدول.", "error");
      return;
    }

    if (isSlotBooked(parkId, fieldType, selectedTime, bookingDate)) {
      showMessage(message, "هذا الوقت محجوز، يرجى اختيار وقت آخر.", "error");
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          park_id: parkId,
          field_type: fieldType,
          booking_date: bookingDate,
          selected_time: selectedTime,
          hours,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        showMessage(message, result.message || "تعذر تأكيد الحجز.", "error");
        return;
      }

      showMessage(message, result.message, "success");
      bookedSet.add(`${parkId}|${fieldType}|${selectedTime}|${bookingDate}`);
      clearSelectedTime();
      refreshSchedule();
      updateSummary();
    } catch (error) {
      showMessage(message, "حدث خطأ في الاتصال. حاول مرة أخرى.", "error");
    }
  });

  async function reloadBookedSlots() {
    const bookingDate = dateInput.value;
    if (!bookingDate) return;

    try {
      const response = await fetch(`/api/booked-slots?date=${encodeURIComponent(bookingDate)}`);
      const result = await response.json();
      bookedSet.clear();
      (result.slots || []).forEach((slot) => bookedSet.add(slot));
      clearSelectedTime();
      refreshSchedule();
      updateSummary();
    } catch (error) {
      // تجاهل خطأ الشبكة مؤقتاً والاعتماد على البيانات الأولية
    }
  }

  function ensureDefaultFieldType() {
    if (!fieldSelect.value) {
      const firstField = fieldSelect.querySelector('option[value]:not([value=""])');
      if (firstField) {
        fieldSelect.value = firstField.value;
      }
    }
  }

  function selectParkCard(card) {
    parkCards.forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-pressed", "false");
    });

    card.classList.add("is-active");
    card.setAttribute("aria-pressed", "true");
    parkSelect.value = card.dataset.parkName || "";
    ensureDefaultFieldType();

    focusMapOnPark({
      name: card.dataset.parkName,
      lat: card.dataset.lat,
      lng: card.dataset.lng,
      query: card.dataset.mapQuery,
    });

    clearSelectedTime();
    refreshSchedule();
    updateSummary();

    // انتقل لجدول الأوقات بعد اختيار الحديقة
    document.getElementById("schedule-table")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function focusMapOnPark({ name, lat, lng, query }) {
    if (!parkMap || !lat || !lng) return;

    // q=lat,lng يظهر دبوس Google الأحمر على الموقع بدقة
    const label = encodeURIComponent(query || name || "الحديقة");
    parkMap.src =
      `https://maps.google.com/maps?q=${lat},${lng}+(${label})` +
      `&ll=${lat},${lng}&z=17&hl=ar&output=embed`;
    parkMap.title = `خريطة ${name}`;

    if (mapTitle) {
      mapTitle.textContent = `موقع ${name} على الخريطة`;
    }

    if (mapPin && mapPinLabel) {
      mapPin.hidden = false;
      mapPinLabel.textContent = name;
    }

    // تمرير الصفحة إلى الخريطة عند الاختيار
    mapFrame?.scrollIntoView({ behavior: "smooth", block: "center" });
    mapFrame?.classList.add("map-highlight");
    window.setTimeout(() => mapFrame?.classList.remove("map-highlight"), 1200);
  }

  function syncParkCardsFromSelect() {
    const selectedOption = parkSelect.selectedOptions[0];
    const parkId = selectedOption?.dataset.parkId || "";

    parkCards.forEach((card) => {
      const active = card.dataset.parkId === parkId;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function getSelectedParkId() {
    const selectedOption = parkSelect.selectedOptions[0];
    return selectedOption?.dataset.parkId || "";
  }

  function isSlotBooked(parkId, fieldType, time, bookingDate = dateInput.value) {
    if (!bookingDate) return false;
    return bookedSet.has(`${parkId}|${fieldType}|${time}|${bookingDate}`);
  }

  function clearSelectedTime() {
    timeInput.value = "";
    document.querySelectorAll(".slot-btn").forEach((b) => b.classList.remove("is-selected"));
    document.querySelectorAll("#schedule-body tr").forEach((row) => row.classList.remove("is-selected"));
  }

  function refreshSchedule() {
    const parkId = getSelectedParkId();
    const fieldType = fieldSelect.value;
    const bookingDate = dateInput.value;

    const rows = document.querySelectorAll("#schedule-body tr");

    if (!parkId || !fieldType || !bookingDate) {
      scheduleSubtitle.textContent = "اختر حديقة وتاريخاً ونوع ملعب لعرض الأوقات المتاحة";
      rows.forEach((row) => {
        row.classList.remove("is-booked", "is-available", "is-selected");
        row.querySelector(".slot-status").textContent = "—";
        const btn = row.querySelector(".slot-btn");
        btn.disabled = true;
        btn.classList.remove("is-selected");
      });
      return;
    }

    const parkName = parkSelect.value;
    scheduleSubtitle.textContent = `جدول ${parkName} – ${fieldType} – ${formatArabicDate(bookingDate)}`;

    rows.forEach((row) => {
      const time = row.dataset.time;
      const booked = isSlotBooked(parkId, fieldType, time);
      const statusCell = row.querySelector(".slot-status");
      const btn = row.querySelector(".slot-btn");

      row.classList.toggle("is-booked", booked);
      row.classList.toggle("is-available", !booked);
      row.classList.remove("is-selected");

      statusCell.textContent = booked ? "محجوز" : "متاح";
      btn.disabled = booked;
      btn.classList.remove("is-selected");
      btn.textContent = booked ? "غير متاح" : "اختر";
    });
  }

  function updateSummary() {
    const username = form.username.value.trim();
    const park = parkSelect.value;
    const fieldType = fieldSelect.value;
    const bookingDate = dateInput.value;
    const selectedTime = timeInput.value;
    const hours = Number(hoursInput.value) || 1;

    if (!park || !fieldType || !bookingDate || !selectedTime) {
      summary.hidden = true;
      summary.innerHTML = "";
      return;
    }

    const endHour = Number(selectedTime.split(":")[0]) + hours;
    const endTime = `${String(endHour).padStart(2, "0")}:00`;

    summary.hidden = false;
    summary.innerHTML = `
      <strong>ملخص الحجز</strong>
      <span>المستخدم: ${username || "—"}</span>
      <span>الحديقة: ${park}</span>
      <span>الملعب: ${fieldType}</span>
      <span>التاريخ: ${formatArabicDate(bookingDate)}</span>
      <span>الوقت: من ${selectedTime} إلى ${endTime}</span>
    `;
  }

  // تهيئة أولية للجدول حسب تاريخ اليوم
  reloadBookedSlots().finally(() => refreshSchedule());
}

/* ---------- صفحة الدخول عبر توكلنا (محاكاة خدماتي) ---------- */
function initLoginForm() {
  const gate = document.getElementById("tawakkalna-gate");
  const verify = document.getElementById("tawakkalna-verify");
  const success = document.getElementById("tawakkalna-success");
  const loginBtn = document.getElementById("tawakkalna-login-btn");
  const resetBtn = document.getElementById("tawakkalna-reset-btn");
  const statusText = document.getElementById("tawakkalna-status");

  if (!gate || !loginBtn) return;

  // استعادة جلسة تجريبية إن وُجدت
  if (sessionStorage.getItem("malaeb_tawakkalna_login") === "1" && success) {
    gate.hidden = true;
    if (verify) verify.hidden = true;
    success.hidden = false;
  }

  loginBtn.addEventListener("click", () => {
    gate.hidden = true;
    if (success) success.hidden = true;
    if (verify) verify.hidden = false;
    if (statusText) statusText.textContent = "التحقق من الهوية عبر توكلنا…";

    window.setTimeout(() => {
      if (statusText) {
        statusText.textContent = "ربط الخدمة بـ خدماتي – أمانة منطقة حائل…";
      }
    }, 900);

    window.setTimeout(() => {
      if (verify) verify.hidden = true;
      if (success) success.hidden = false;
      sessionStorage.setItem("malaeb_tawakkalna_login", "1");
    }, 1800);
  });

  resetBtn?.addEventListener("click", () => {
    sessionStorage.removeItem("malaeb_tawakkalna_login");
    if (success) success.hidden = true;
    if (verify) verify.hidden = true;
    gate.hidden = false;
  });
}

/* ---------- مساعدات ---------- */
function showMessage(element, text, type) {
  if (!element) return;

  element.hidden = false;
  element.textContent = text;
  element.classList.remove("success", "error");
  element.classList.add(type);
}

function parseJsonAttr(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatArabicDate(isoDate) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
