# منصة ملاعب حائل | Malaeb Hail

منصة ويب لحجز وإدارة المرافق الرياضية البلدية في مدينة حائل، ضمن مبادرات المدينة الذكية – أمانة منطقة حائل.

## التشغيل

```bash
pip install -r requirements.txt
python app.py
```

ثم افتح: http://127.0.0.1:5000

## الصفحات

| المسار | الوصف |
|--------|--------|
| `/` | الصفحة الرئيسية |
| `/booking` | حجز الملاعب |
| `/login` | الدخول عبر خدماتي في توكلنا (محاكاة) |
| `/employee/login` | دخول الموظف |
| `/dashboard` | لوحة تحكم الموظف |

### دخول الموظف (تجريبي)
- المستخدم: `employee`
- كلمة المرور: `1234`

## التقنيات

- **Web Development:** Python, Flask, HTML, Jinja2, JavaScript
- **Database:** SQLite (`malaeb.db`)
- **UI Design:** CSS3, RTL, Google Maps
- **Version Control:** Git
- **Local Server:** Flask Development Server

## موقع الأمانة

https://amanathail.gov.sa/new_portal/
