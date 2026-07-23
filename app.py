import re
import uuid
from functools import wraps

from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

import database as db

app = Flask(__name__)
app.secret_key = "malaeb-hail-dev-secret-change-me"

TIME_SLOTS = [
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
]


def employee_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("employee_logged_in"):
            flash("يرجى تسجيل الدخول كموظف أولاً.", "error")
            return redirect(url_for("employee_login"))
        return view(*args, **kwargs)

    return wrapped


_db_ready = False


@app.before_request
def ensure_db():
    global _db_ready
    if not _db_ready:
        db.init_db()
        _db_ready = True


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/booking")
def booking():
    parks = db.get_parks()
    selected_date = request.args.get("date")
    booked_slots = db.get_booked_slots(selected_date) if selected_date else db.get_booked_slots()
    return render_template(
        "booking.html",
        parks=parks,
        time_slots=TIME_SLOTS,
        booked_slots=booked_slots,
    )


@app.route("/api/booked-slots")
def api_booked_slots():
    booking_date = request.args.get("date")
    return jsonify({"slots": db.get_booked_slots(booking_date)})


@app.route("/api/bookings", methods=["POST"])
def api_create_booking():
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    park_id = (data.get("park_id") or "").strip()
    field_type = (data.get("field_type") or "").strip()
    booking_date = (data.get("booking_date") or "").strip()
    start_time = (data.get("selected_time") or data.get("start_time") or "").strip()
    hours = int(data.get("hours") or 0)

    park = db.get_park_by_id(park_id)
    if not park:
        return jsonify({"ok": False, "message": "الحديقة غير موجودة."}), 400

    if not username or not field_type or not booking_date or not start_time or hours < 1:
        return jsonify({"ok": False, "message": "يرجى تعبئة جميع الحقول بشكل صحيح."}), 400

    booking_id, error = db.create_booking(
        {
            "username": username,
            "park_id": park_id,
            "park_name": park["name"],
            "field_type": field_type,
            "booking_date": booking_date,
            "start_time": start_time,
            "hours": hours,
        }
    )

    if error:
        return jsonify({"ok": False, "message": error}), 409

    return jsonify(
        {
            "ok": True,
            "id": booking_id,
            "message": "تم تأكيد حجزك، شكراً لاستخدامك منصة ملاعب حائل🤍",
        }
    )


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/employee/login", methods=["GET", "POST"])
def employee_login():
    if session.get("employee_logged_in"):
        return redirect(url_for("dashboard"))

    error = None
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = (request.form.get("password") or "").strip()

        if (
            username == db.EMPLOYEE["username"]
            and password == db.EMPLOYEE["password"]
        ):
            session["employee_logged_in"] = True
            session["employee_name"] = db.EMPLOYEE["name"]
            flash("تم تسجيل الدخول بنجاح إلى لوحة التحكم.", "success")
            return redirect(url_for("dashboard"))

        error = "اسم المستخدم أو كلمة المرور غير صحيحة."

    return render_template("employee_login.html", error=error)


@app.route("/employee/logout")
def employee_logout():
    session.clear()
    flash("تم تسجيل الخروج.", "success")
    return redirect(url_for("employee_login"))


@app.route("/dashboard", methods=["GET", "POST"])
@employee_required
def dashboard():
    if request.method == "POST":
        action = request.form.get("action")

        if action == "add_park":
            name = (request.form.get("name") or "").strip()
            location = (request.form.get("location") or "").strip()
            description = (request.form.get("description") or "").strip()
            map_query = (request.form.get("map_query") or "").strip() or f"{name} حائل"

            try:
                lat = float(request.form.get("lat") or 27.51)
                lng = float(request.form.get("lng") or 41.72)
            except ValueError:
                flash("إحداثيات غير صحيحة.", "error")
                return redirect(url_for("dashboard") + "#parks")

            if not name or not location or not description:
                flash("يرجى تعبئة اسم الحديقة والموقع والوصف.", "error")
                return redirect(url_for("dashboard") + "#parks")

            park_id = re.sub(r"[^a-z0-9]+", "-", name.lower())
            park_id = park_id.strip("-") or f"park-{uuid.uuid4().hex[:8]}"
            if db.get_park_by_id(park_id):
                park_id = f"{park_id}-{uuid.uuid4().hex[:4]}"

            # للعربية قد يكون park_id فارغاً بعد التصفية
            if not re.search(r"[a-z0-9]", park_id):
                park_id = f"park-{uuid.uuid4().hex[:8]}"

            try:
                db.add_park(
                    {
                        "id": park_id,
                        "name": name,
                        "image": "img/parks/municipality.svg",
                        "description": description,
                        "location": location,
                        "lat": lat,
                        "lng": lng,
                        "map_query": map_query,
                        "fields": db.DEFAULT_FIELDS,
                    }
                )
                flash(f"تمت إضافة الحديقة «{name}» بنجاح.", "success")
            except Exception:
                flash("تعذر إضافة الحديقة. ربما الاسم مستخدم مسبقاً.", "error")

            return redirect(url_for("dashboard") + "#parks")

        if action == "update_status":
            booking_id = request.form.get("booking_id")
            status = request.form.get("status")
            if booking_id and status in {"مؤكد", "مكتمل", "ملغي"}:
                db.update_booking_status(int(booking_id), status)
                flash("تم تحديث حالة الحجز.", "success")
            return redirect(url_for("dashboard") + "#bookings")

    return render_template(
        "dashboard.html",
        parks=db.get_parks(),
        bookings=db.get_bookings(),
        stats=db.get_stats(),
        employee_name=session.get("employee_name", "موظف"),
    )


if __name__ == "__main__":
    db.init_db()
    app.run(debug=True)
