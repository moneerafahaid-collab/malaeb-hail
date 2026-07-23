/**
 * منصة ملاعب حائل – نسخة GitHub Pages (تخزين محلي)
 */

const TIME_SLOTS = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

const DEFAULT_PARKS = [
  {
    id: "salam",
    name: "حديقة السلام",
    image: "img/parks/salam.svg",
    description: "حديقة واسعة تضم ملاعب متعددة ومساحات خضراء مناسبة للعائلات والرياضيين.",
    location: "حي السلام – حائل",
    lat: 27.5218,
    lng: 41.6905,
    map_query: "حديقة السلام حائل",
    fields: ["ملعب كرة قدم", "ملعب كرة سلة", "ملعب متعدد الاستخدام"],
  },
  {
    id: "prince",
    name: "حديقة الأمير",
    image: "img/parks/prince.svg",
    description: "مرافق رياضية حديثة بإضاءة مسائية ومسارات للمشي حول الملاعب.",
    location: "حي الأمير – حائل",
    lat: 27.5386,
    lng: 41.7072,
    map_query: "حديقة الأمير عبدالعزيز بن مساعد حائل",
    fields: ["ملعب كرة قدم", "ملعب كرة سلة", "ملعب متعدد الاستخدام"],
  },
  {
    id: "municipality",
    name: "حديقة البلدية",
    image: "img/parks/municipality.svg",
    description: "حديقة مركزية قريبة من الخدمات، مثالية للحجوزات السريعة والمباريات الودية.",
    location: "وسط حائل",
    lat: 27.5114,
    lng: 41.7208,
    map_query: "حديقة البلدية حائل",
    fields: ["ملعب كرة قدم", "ملعب كرة سلة", "ملعب متعدد الاستخدام"],
  },
];

function getParks() {
  const raw = localStorage.getItem("malaeb_parks");
  if (!raw) {
    localStorage.setItem("malaeb_parks", JSON.stringify(DEFAULT_PARKS));
    return [...DEFAULT_PARKS];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [...DEFAULT_PARKS];
  }
}

function saveParks(parks) {
  localStorage.setItem("malaeb_parks", JSON.stringify(parks));
}

function getBookings() {
  const raw = localStorage.getItem("malaeb_bookings");
  if (!raw) {
    const seed = [
      { id: 1, username: "أحمد العتيبي", park_id: "salam", park_name: "حديقة السلام", field_type: "ملعب كرة قدم", booking_date: "2026-07-15", start_time: "18:00", hours: 1, status: "مؤكد" },
      { id: 2, username: "سارة الشمري", park_id: "salam", park_name: "حديقة السلام", field_type: "ملعب كرة قدم", booking_date: "2026-07-15", start_time: "19:00", hours: 1, status: "مؤكد" },
      { id: 3, username: "خالد الحربي", park_id: "prince", park_name: "حديقة الأمير", field_type: "ملعب كرة قدم", booking_date: "2026-07-16", start_time: "20:00", hours: 2, status: "مؤكد" },
    ];
    localStorage.setItem("malaeb_bookings", JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem("malaeb_bookings", JSON.stringify(bookings));
}

function getBookedSlots(date) {
  const slots = new Set();
  getBookings()
    .filter((b) => b.status !== "ملغي" && (!date || b.booking_date === date))
    .forEach((b) => {
      const start = Number(b.start_time.split(":")[0]);
      for (let i = 0; i < b.hours; i++) {
        const t = `${String(start + i).padStart(2, "0")}:00`;
        slots.add(`${b.park_id}|${b.field_type}|${t}|${b.booking_date}`);
      }
    });
  return slots;
}

document.addEventListener("DOMContentLoaded", () => {
  initBookingPage();
  initLoginForm();
  initEmployeeLogin();
  initDashboard();
});

function initBookingPage() {
  const form = document.getElementById("booking-form");
  const gallery = document.getElementById("parks-gallery");
  if (!form || !gallery) return;

  const parks = getParks();
  const parkSelect = document.getElementById("park");
  const fieldSelect = document.getElementById("field-type");
  const dateInput = document.getElementById("booking-date");
  const timeInput = document.getElementById("selected-time");
  const hoursInput = document.getElementById("hours");
  const summary = document.getElementById("booking-summary");
  const scheduleSubtitle = document.getElementById("schedule-subtitle");
  const scheduleBody = document.getElementById("schedule-body");
  const message = document.getElementById("booking-message");
  const parkMap = document.getElementById("park-map");
  const mapTitle = document.getElementById("map-title");
  const mapFrame = document.getElementById("map-frame");
  const mapPin = document.getElementById("map-pin");
  const mapPinLabel = document.getElementById("map-pin-label");

  let bookedSet = getBookedSlots();

  // render parks
  gallery.innerHTML = parks
    .map(
      (p) => `
    <article class="park-card" data-park-id="${p.id}" data-park-name="${p.name}"
      data-lat="${p.lat}" data-lng="${p.lng}" data-map-query="${p.map_query}"
      tabindex="0" role="button" aria-pressed="false">
      <img src="${p.image}" alt="${p.name}" class="park-card-image">
      <div class="park-card-body">
        <h2>${p.name}</h2>
        <p class="park-location">${p.location}</p>
        <p>${p.description}</p>
        <ul class="park-fields">${p.fields.map((f) => `<li>${f}</li>`).join("")}</ul>
      </div>
    </article>`
    )
    .join("");

  parks.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.dataset.parkId = p.id;
    opt.dataset.lat = p.lat;
    opt.dataset.lng = p.lng;
    opt.dataset.mapQuery = p.map_query;
    opt.textContent = p.name;
    parkSelect.appendChild(opt);
  });

  scheduleBody.innerHTML = TIME_SLOTS.map(
    (slot) => `
    <tr data-time="${slot}">
      <td class="slot-time">${slot}</td>
      <td class="slot-status">—</td>
      <td><button type="button" class="slot-btn" data-time="${slot}" disabled>اختر</button></td>
    </tr>`
  ).join("");

  const today = new Date();
  dateInput.min = formatDateInput(today);
  if (!dateInput.value) dateInput.value = formatDateInput(today);

  const parkCards = document.querySelectorAll(".park-card");

  parkCards.forEach((card) => {
    card.addEventListener("click", () => selectParkCard(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectParkCard(card);
      }
    });
  });

  parkSelect.addEventListener("change", () => {
    syncParkCardsFromSelect();
    ensureDefaultFieldType();
    const opt = parkSelect.selectedOptions[0];
    if (opt) focusMapOnPark({ name: opt.value, lat: opt.dataset.lat, lng: opt.dataset.lng, query: opt.dataset.mapQuery });
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

  dateInput.addEventListener("change", () => {
    bookedSet = getBookedSlots(dateInput.value);
    clearSelectedTime();
    refreshSchedule();
    updateSummary();
  });

  scheduleBody.addEventListener("click", (event) => {
    const btn = event.target.closest(".slot-btn");
    if (!btn || btn.disabled) {
      if (btn?.disabled) showMessage(message, "هذا الوقت غير متاح. اختر وقتاً بلون أخضر.", "error");
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = form.username.value.trim();
    const park = parkSelect.value;
    const fieldType = fieldSelect.value;
    const bookingDate = dateInput.value;
    const selectedTime = timeInput.value;
    const hours = Number(hoursInput.value);
    const parkId = getSelectedParkId();

    if (!username || !park || !fieldType || !bookingDate || !selectedTime || hours < 1) {
      showMessage(message, "يرجى تعبئة جميع الحقول واختيار وقت من الجدول.", "error");
      return;
    }
    if (isSlotBooked(parkId, fieldType, selectedTime, bookingDate)) {
      showMessage(message, "هذا الوقت محجوز، يرجى اختيار وقت آخر.", "error");
      return;
    }

    const bookings = getBookings();
    const id = bookings.length ? Math.max(...bookings.map((b) => b.id)) + 1 : 1;
    bookings.push({
      id,
      username,
      park_id: parkId,
      park_name: park,
      field_type: fieldType,
      booking_date: bookingDate,
      start_time: selectedTime,
      hours,
      status: "مؤكد",
    });
    saveBookings(bookings);
    bookedSet = getBookedSlots(bookingDate);
    showMessage(message, "تم تأكيد حجزك، شكراً لاستخدامك منصة ملاعب حائل🤍", "success");
    clearSelectedTime();
    refreshSchedule();
    updateSummary();
  });

  function ensureDefaultFieldType() {
    if (!fieldSelect.value) {
      const first = fieldSelect.querySelector('option[value]:not([value=""])');
      if (first) fieldSelect.value = first.value;
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
    document.getElementById("schedule-table")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function focusMapOnPark({ name, lat, lng, query }) {
    if (!parkMap || !lat || !lng) return;
    const label = encodeURIComponent(query || name || "الحديقة");
    parkMap.src = `https://maps.google.com/maps?q=${lat},${lng}+(${label})&ll=${lat},${lng}&z=17&hl=ar&output=embed`;
    parkMap.title = `خريطة ${name}`;
    if (mapTitle) mapTitle.textContent = `موقع ${name} على الخريطة`;
    if (mapPin && mapPinLabel) {
      mapPin.hidden = false;
      mapPinLabel.textContent = name;
    }
    mapFrame?.scrollIntoView({ behavior: "smooth", block: "center" });
    mapFrame?.classList.add("map-highlight");
    window.setTimeout(() => mapFrame?.classList.remove("map-highlight"), 1200);
  }

  function syncParkCardsFromSelect() {
    const parkId = parkSelect.selectedOptions[0]?.dataset.parkId || "";
    parkCards.forEach((card) => {
      const active = card.dataset.parkId === parkId;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function getSelectedParkId() {
    return parkSelect.selectedOptions[0]?.dataset.parkId || "";
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
        btn.textContent = "اختر";
      });
      return;
    }

    scheduleSubtitle.textContent = `جدول ${parkSelect.value} – ${fieldType} – ${formatArabicDate(bookingDate)}`;
    rows.forEach((row) => {
      const time = row.dataset.time;
      const booked = isSlotBooked(parkId, fieldType, time);
      row.classList.toggle("is-booked", booked);
      row.classList.toggle("is-available", !booked);
      row.classList.remove("is-selected");
      row.querySelector(".slot-status").textContent = booked ? "محجوز" : "متاح";
      const btn = row.querySelector(".slot-btn");
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
      <span>الوقت: من ${selectedTime} إلى ${endTime}</span>`;
  }

  bookedSet = getBookedSlots(dateInput.value);
  refreshSchedule();
}

function initLoginForm() {
  const gate = document.getElementById("tawakkalna-gate");
  const verify = document.getElementById("tawakkalna-verify");
  const success = document.getElementById("tawakkalna-success");
  const loginBtn = document.getElementById("tawakkalna-login-btn");
  const resetBtn = document.getElementById("tawakkalna-reset-btn");
  const statusText = document.getElementById("tawakkalna-status");
  if (!gate || !loginBtn) return;

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
      if (statusText) statusText.textContent = "ربط الخدمة بـ خدماتي – أمانة منطقة حائل…";
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

function initEmployeeLogin() {
  const form = document.getElementById("employee-login-form");
  if (!form) return;
  const msg = document.getElementById("emp-login-message");

  if (sessionStorage.getItem("malaeb_employee") === "1") {
    window.location.href = "dashboard.html";
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = form.username.value.trim();
    const p = form.password.value.trim();
    if (u === "employee" && p === "1234") {
      sessionStorage.setItem("malaeb_employee", "1");
      window.location.href = "dashboard.html";
    } else {
      showMessage(msg, "اسم المستخدم أو كلمة المرور غير صحيحة.", "error");
    }
  });
}

function initDashboard() {
  if (!document.getElementById("bookings-body")) return;

  if (sessionStorage.getItem("malaeb_employee") !== "1") {
    window.location.href = "employee-login.html";
    return;
  }

  document.getElementById("emp-logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem("malaeb_employee");
    window.location.href = "employee-login.html";
  });

  renderDashboard();

  document.getElementById("add-park-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const parks = getParks();
    const name = form.name.value.trim();
    const id = `park-${Date.now()}`;
    parks.push({
      id,
      name,
      image: "img/parks/municipality.svg",
      description: form.description.value.trim(),
      location: form.location.value.trim(),
      lat: Number(form.lat.value),
      lng: Number(form.lng.value),
      map_query: `${name} حائل`,
      fields: ["ملعب كرة قدم", "ملعب كرة سلة", "ملعب متعدد الاستخدام"],
    });
    saveParks(parks);
    const msg = document.getElementById("add-park-message");
    showMessage(msg, `تمت إضافة الحديقة «${name}» بنجاح.`, "success");
    form.reset();
    form.lat.value = "27.5200";
    form.lng.value = "41.7000";
    renderDashboard();
  });
}

function renderDashboard() {
  const parks = getParks();
  const bookings = getBookings();
  document.getElementById("stat-parks").textContent = parks.length;
  document.getElementById("stat-bookings").textContent = bookings.filter((b) => b.status !== "ملغي").length;
  document.getElementById("stat-confirmed").textContent = bookings.filter((b) => b.status === "مؤكد").length;

  const body = document.getElementById("bookings-body");
  body.innerHTML = bookings.length
    ? bookings
        .map((b) => {
          const cls =
            b.status === "مؤكد" ? "is-confirmed" : b.status === "مكتمل" ? "is-done" : "is-cancelled";
          return `<tr>
            <td>${b.id}</td><td>${b.username}</td><td>${b.park_name}</td><td>${b.field_type}</td>
            <td>${b.booking_date}</td><td>${b.start_time}</td><td>${b.hours}</td>
            <td><span class="status-badge ${cls}">${b.status}</span></td>
            <td>
              <form class="inline-form status-form" data-id="${b.id}">
                <select name="status">
                  <option value="مؤكد" ${b.status === "مؤكد" ? "selected" : ""}>مؤكد</option>
                  <option value="مكتمل" ${b.status === "مكتمل" ? "selected" : ""}>مكتمل</option>
                  <option value="ملغي" ${b.status === "ملغي" ? "selected" : ""}>ملغي</option>
                </select>
                <button type="submit" class="btn btn-small">حفظ</button>
              </form>
            </td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="9">لا توجد حجوزات حالياً.</td></tr>`;

  body.querySelectorAll(".status-form").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = Number(f.dataset.id);
      const status = f.status.value;
      const list = getBookings();
      const item = list.find((x) => x.id === id);
      if (item) {
        item.status = status;
        saveBookings(list);
        renderDashboard();
      }
    });
  });

  const list = document.getElementById("admin-parks-list");
  list.innerHTML = parks
    .map(
      (p) => `
    <article class="admin-park-item">
      <img src="${p.image}" alt="${p.name}">
      <div>
        <h3>${p.name}</h3>
        <p>${p.location}</p>
        <small>${p.description}</small>
      </div>
    </article>`
    )
    .join("");
}

function showMessage(element, text, type) {
  if (!element) return;
  element.hidden = false;
  element.textContent = text;
  element.classList.remove("success", "error");
  element.classList.add(type);
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatArabicDate(isoDate) {
  if (!isoDate) return "—";
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
