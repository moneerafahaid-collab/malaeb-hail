"""طبقة قاعدة البيانات البسيطة باستخدام SQLite."""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "malaeb.db"

DEFAULT_FIELDS = ["ملعب كرة قدم", "ملعب كرة سلة", "ملعب متعدد الاستخدام"]

SEED_PARKS = [
    {
        "id": "salam",
        "name": "حديقة السلام",
        "image": "img/parks/salam.svg",
        "description": "حديقة واسعة تضم ملاعب متعددة ومساحات خضراء مناسبة للعائلات والرياضيين.",
        "location": "حي السلام – حائل",
        "lat": 27.5218,
        "lng": 41.6905,
        "map_query": "حديقة السلام حائل",
        "fields": DEFAULT_FIELDS,
    },
    {
        "id": "prince",
        "name": "حديقة الأمير",
        "image": "img/parks/prince.svg",
        "description": "مرافق رياضية حديثة بإضاءة مسائية ومسارات للمشي حول الملاعب.",
        "location": "حي الأمير – حائل",
        "lat": 27.5386,
        "lng": 41.7072,
        "map_query": "حديقة الأمير عبدالعزيز بن مساعد حائل",
        "fields": DEFAULT_FIELDS,
    },
    {
        "id": "municipality",
        "name": "حديقة البلدية",
        "image": "img/parks/municipality.svg",
        "description": "حديقة مركزية قريبة من الخدمات، مثالية للحجوزات السريعة والمباريات الودية.",
        "location": "وسط حائل",
        "lat": 27.5114,
        "lng": 41.7208,
        "map_query": "حديقة البلدية حائل",
        "fields": DEFAULT_FIELDS,
    },
]

# حساب موظف تجريبي
EMPLOYEE = {
    "username": "employee",
    "password": "1234",
    "name": "موظف الأمانة",
}


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS parks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            image TEXT NOT NULL,
            description TEXT NOT NULL,
            location TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            map_query TEXT NOT NULL,
            fields_json TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            park_id TEXT NOT NULL,
            park_name TEXT NOT NULL,
            field_type TEXT NOT NULL,
            booking_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            hours INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'مؤكد',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (park_id) REFERENCES parks(id)
        )
        """
    )

    for park in SEED_PARKS:
        cur.execute(
            """
            INSERT OR IGNORE INTO parks
            (id, name, image, description, location, lat, lng, map_query, fields_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                park["id"],
                park["name"],
                park["image"],
                park["description"],
                park["location"],
                park["lat"],
                park["lng"],
                park["map_query"],
                json.dumps(park["fields"], ensure_ascii=False),
            ),
        )

    bookings_count = cur.execute("SELECT COUNT(*) AS c FROM bookings").fetchone()["c"]
    if bookings_count == 0:
        sample_bookings = [
            ("أحمد العتيبي", "salam", "حديقة السلام", "ملعب كرة قدم", "2026-07-15", "18:00", 1),
            ("سارة الشمري", "salam", "حديقة السلام", "ملعب كرة قدم", "2026-07-15", "19:00", 1),
            ("خالد الحربي", "prince", "حديقة الأمير", "ملعب كرة قدم", "2026-07-16", "20:00", 2),
            ("نورة المطيري", "municipality", "حديقة البلدية", "ملعب كرة سلة", "2026-07-15", "19:00", 1),
        ]
        for row in sample_bookings:
            cur.execute(
                """
                INSERT INTO bookings
                (username, park_id, park_name, field_type, booking_date, start_time, hours, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'مؤكد')
                """,
                row,
            )

    conn.commit()
    conn.close()


def row_to_park(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "image": row["image"],
        "description": row["description"],
        "location": row["location"],
        "lat": row["lat"],
        "lng": row["lng"],
        "map_query": row["map_query"],
        "fields": json.loads(row["fields_json"]),
    }


def get_parks():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM parks ORDER BY name").fetchall()
    conn.close()
    return [row_to_park(row) for row in rows]


def get_park_by_id(park_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM parks WHERE id = ?", (park_id,)).fetchone()
    conn.close()
    return row_to_park(row) if row else None


def add_park(park):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO parks
        (id, name, image, description, location, lat, lng, map_query, fields_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            park["id"],
            park["name"],
            park["image"],
            park["description"],
            park["location"],
            park["lat"],
            park["lng"],
            park["map_query"],
            json.dumps(park["fields"], ensure_ascii=False),
        ),
    )
    conn.commit()
    conn.close()


def get_bookings():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT * FROM bookings
        ORDER BY booking_date DESC, start_time ASC, id DESC
        """
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_booked_slots(booking_date=None):
    """مفاتيح: park_id|field|time أو park_id|field|time|date"""
    conn = get_connection()
    if booking_date:
        rows = conn.execute(
            """
            SELECT park_id, field_type, start_time, hours, booking_date
            FROM bookings
            WHERE status != 'ملغي' AND booking_date = ?
            """,
            (booking_date,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT park_id, field_type, start_time, hours, booking_date
            FROM bookings
            WHERE status != 'ملغي'
            """
        ).fetchall()
    conn.close()

    slots = set()
    for row in rows:
        start_hour = int(row["start_time"].split(":")[0])
        for offset in range(row["hours"]):
            time_label = f"{start_hour + offset:02d}:00"
            slots.add(f"{row['park_id']}|{row['field_type']}|{time_label}|{row['booking_date']}")
    return sorted(slots)


def create_booking(data):
    conn = get_connection()
    cur = conn.cursor()

    # منع التعارض
    conflict = cur.execute(
        """
        SELECT id FROM bookings
        WHERE park_id = ? AND field_type = ? AND booking_date = ?
          AND start_time = ? AND status != 'ملغي'
        """,
        (
            data["park_id"],
            data["field_type"],
            data["booking_date"],
            data["start_time"],
        ),
    ).fetchone()

    if conflict:
        conn.close()
        return None, "هذا الوقت محجوز مسبقاً"

    cur.execute(
        """
        INSERT INTO bookings
        (username, park_id, park_name, field_type, booking_date, start_time, hours, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'مؤكد')
        """,
        (
            data["username"],
            data["park_id"],
            data["park_name"],
            data["field_type"],
            data["booking_date"],
            data["start_time"],
            data["hours"],
        ),
    )
    booking_id = cur.lastrowid
    conn.commit()
    conn.close()
    return booking_id, None


def update_booking_status(booking_id, status):
    conn = get_connection()
    conn.execute(
        "UPDATE bookings SET status = ? WHERE id = ?",
        (status, booking_id),
    )
    conn.commit()
    conn.close()


def get_stats():
    conn = get_connection()
    parks_count = conn.execute("SELECT COUNT(*) AS c FROM parks").fetchone()["c"]
    bookings_count = conn.execute(
        "SELECT COUNT(*) AS c FROM bookings WHERE status != 'ملغي'"
    ).fetchone()["c"]
    confirmed_count = conn.execute(
        "SELECT COUNT(*) AS c FROM bookings WHERE status = 'مؤكد'"
    ).fetchone()["c"]
    conn.close()
    return {
        "parks_count": parks_count,
        "bookings_count": bookings_count,
        "confirmed_count": confirmed_count,
    }
