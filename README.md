# Magistratura Talabalarining Semestrlik Monitoringi va Baholash Platformasi
*(Master’s Student Semester Monitoring and Assessment Platform)*

Ushbu platforma O‘zbekiston Respublikasi Vazirlar Mahkamasining 2015-yil 2-martdagi 36-son qarori (2026-yil 30-iyundagi 353-son tahriri) bilan tasdiqlangan **"Magistratura to‘g‘risida"gi Nizom**, O‘zbekiston Respublikasining **"Shaxsga doir ma’lumotlar to‘g‘risida"gi Qonuni (O‘RQ-547)** hamda Oliy ta’lim standartlari talablari asosida to‘liq ishlab chiqilgan.

Tizim interfeysi, modallar, xabarlar, baholash rubrikalari va eksport hisobotlari 100% rasmiy akademik **O‘zbek tilida (Lotin yozuvida)** tayyorlangan.

---

## 1. Huquqiy va Me’yoriy Asoslar

1. **VMQ № 36 (02.03.2015, tahrir: 30.06.2026 № 353):**
   - **14–15-bandlar:** Talabaning tasdiqlangan individual kalendar ish rejasi, bajarilish monitoringi va hisobdorlik.
   - **31-band:** Akademik halollik: matn o‘xshashligi (plagiat) va iqtiboslar haqqoniyligini tekshirish.
   - **37 & 49-bandlar:** Ilmiy nashrlar monitoringi: 1-kurs talabalari uchun kamida 1 ta, 2-kurs talabalari uchun kamida 2 ta ilmiy maqola yoki konferensiya tezisi.
   - **44-band:** Rasmiy himoya mezonlari (7 ta asosiy ilmiy mezon).
   - **45¹–45⁵-bandlar:** Apellatsiya mexanizmi: baho e'lon qilingandan so'ng 72 soat ichida talaba ariza beradi; Apellatsiya komissiyasi 24 soat ichida qaror qabul qiladi va qaror o'sha kunning o'zida talabaga taqdim etiladi.
   - **48-band:** Rektor buyrug'i bilan tasdiqlangan yetakchi professor-o'qituvchilar va ish beruvchilardan iborat Ishchi guruh (Baholovchilar).
   - **51-band:** Jonli taqdimotdan so'ng savol-javob o'tkazish va ishchi guruh tomonidan talabaga yozma tavsiyalar berish.
   - **52-band:** Har yili Ilmiy Kengashga monitoring natijalari bo'yicha hisobot taqdim etish.

2. **Qonun № O‘RQ-547 "Shaxsga doir ma’lumotlar to‘g‘risida":**
   - Biometrik ma’lumotlar uchun talabadan alohida, erkin, yozma va chaqirib olinadigan rozilik olinadi.
   - Biometrikadan bosh tortgan talabalar uchun an’anaviy (oflayn/komissiya huzurida) topshirish yo'li (fallback) ta'minlanadi va bu ballga hech qanday salbiy ta'sir ko'rsatmaydi.
   - Barcha ma'lumotlar, fayllar va loglar O'zbekiston hududidagi serverlarda saqlanadi.

3. **Avtomatlashtirilgan tekshiruvlar qoidasi (8.3-bo'lim):**
   - Hech qanday AI detektor yoki antiplagiat natijasi bahoni avtomatik pasaytirmaydi yoki talabani imtihondan yiqitmaydi. Har qanday shubhali signal faqat inson (mas'ul komissiya) tomonidan dalillar asosida ko'rib chiqiladi.

---

## 2. 100 Ballik Baholash Modeli (7 ta Komponent)

| № | Komponent | Manba / Nizom bandi | Mezonlar soni | Og'irligi (%) | Baholash usuli |
|---|---|---|---|---|---|
| 1 | **Ilmiy natijalar hisoboti** | VMQ 44-band (7 ta) + 26-33 bandlar (3 ta) | 10 ta mezon (0–5 ball) | **30%** | Ishchi guruh (Rubrika) |
| 2 | **Jonli 5 daqiqalik taqdimot va Q&A** | VMQ 51-band, mualliflik savollari | 6 ta mezon (0–5 ball) | **20%** | Ishchi guruh (Rubrika) |
| 3 | **Pedagogik amaliyot hisoboti** | VMQ 14-band, amaliyot va darslar | 6 ta mezon (0–5 ball) | **15%** | Ishchi guruh (Rubrika) |
| 4 | **Taqdimot slaydlari** | FR-3.2 talabi | 4 ta mezon (0–5 ball) | **10%** | Ishchi guruh (Rubrika) |
| 5 | **Nashrlar va maqolalar** | VMQ 37 va 49-bandlar | 1-kurs (1 ta), 2-kurs (2 ta) | **10%** | Tizimli formula / tasdiq |
| 6 | **Kalendar reja va seminarlar** | VMQ 14-15 va 49-bandlar | O'z vaqtida bajarilgan % | **10%** | Tizimli formula / tasdiq |
| 7 | **O'zlashtirish ko'rsatkichi (GPA)** | HEMIS integratsiyasi (49-band) | 100 ballik normallashuv | **5%** | Tizimli import |
| | **JAMI** | | | **100%** | |

*Baholash shkalasi:*
- **86 – 100 ball:** 5 — A'lo
- **71 – 85 ball:** 4 — Yaxshi
- **60 – 70 ball:** 3 — Qoniqarli
- **60 balldan past:** 2 — Qoniqarsiz

---

## 3. Tizim Arxitekturasi

- **Backend:** Python 3.11, FastAPI, SQLAlchemy (PostgreSQL / SQLite WAL), Pydantic v2.
- **Kriptografik Audit:** Append-only SHA-256 zanjiri (`hash-chained audit log`).
- **Fayllar xavfsizligi:** Har bir yuklangan fayl uchun server tomonidan SHA-256 xesh hisoblanadi, versiyalanadi va muzlatiladi.
- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Jonli sessiya:** 5 daqiqalik taymer, slayd namoyishi, uzluksiz yuz va liveness tekshiruvi, aloqa uzilishlarini texnik hodisa sifatida qayd etish.

---

## 4. Acceptance Criteria (A1–A15) Sinov Natijalari

Tizim texnik topshiriqda belgilangan barcha 15 ta sinov stsenariylaridan **100% muvaffaqiyatli** o'tdi:

```
tests/test_acceptance_criteria.py::test_A1_student_enrol_and_submit_all_three PASSED
tests/test_acceptance_criteria.py::test_A2_face_non_match_raises_flag_without_terminating_session PASSED
tests/test_acceptance_criteria.py::test_A3_liveness_check_failed_logged PASSED
tests/test_acceptance_criteria.py::test_A4_connection_drop_is_technical_event_not_penalty PASSED
tests/test_acceptance_criteria.py::test_A5_biometrics_declined_fallback_route_without_disadvantage PASSED
tests/test_acceptance_criteria.py::test_A6_plagiarism_flags_for_review_without_auto_deduction PASSED
tests/test_acceptance_criteria.py::test_A7_ai_detection_does_not_deduct_grade_automatically PASSED
tests/test_acceptance_criteria.py::test_A8_assessors_divergence_flagged_to_head_of_department PASSED
tests/test_acceptance_criteria.py::test_A9_department_head_score_override_requires_justification PASSED
tests/test_acceptance_criteria.py::test_A10_appeal_filed_at_60_hours_within_72h_window PASSED
tests/test_acceptance_criteria.py::test_A11_successful_appeal_creates_new_version_and_updates_rank PASSED
tests/test_acceptance_criteria.py::test_A12_admin_cannot_alter_score_and_attempt_is_logged PASSED
tests/test_acceptance_criteria.py::test_A13_scientific_council_report_export_with_uzbek_latin PASSED
tests/test_acceptance_criteria.py::test_A14_rubric_versioning_preserves_historical_marks PASSED
tests/test_acceptance_criteria.py::test_A15_retention_job_preserves_appealed_submissions_and_logs PASSED

======================= 15 passed in 10.68s =======================
```

---

## 5. Tizimni Ishga Tushirish

### 1. Backendni ishga tushirish:
```bash
# Kerakli paketlarni o'rnatish
pip install -r backend/requirements.txt

# Namuna ma'lumotlarni bazaga yuklash
python -m backend.seed_data

# Serverni ishga tushirish (port: 8000)
run_backend.bat
# yoki
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Hujjatlari (Swagger): `http://127.0.0.1:8000/docs`

### 2. Frontendni ishga tushirish:
```bash
cd frontend
npm install
npm run dev
```
Interfeys manzili: `http://localhost:5173`

### 3. Testlarni qayta ishga tushirish:
```bash
python -m pytest tests/test_acceptance_criteria.py -v
```

---

## 6. Demo Foydalanuvchilar (Parol: `parol123`)

- **talaba1** — Dilshod Karimov (1-kurs talabasi)
- **talaba2** — Madina Rahimova (2-kurs talabasi, og'ish aniqlangan holat)
- **talaba3** — Azizbek Yusupov (Biometrikadan bosh tortib, oflayn topshirgan talaba)
- **rahbar1** — Prof. Anvar Hakimov (Ilmiy rahbar)
- **baholovchi1** — Dots. Jamshid Nurmatov (Ishchi guruh a'zosi)
- **baholovchi2** — Dots. Nilufar Qosimova (Ishchi guruh a'zosi)
- **kafedra_mudiri** — Prof. Otabek Rustamov (Magistratura bo'limi boshlig'i)
- **apellatsiya1** — Prof. Sherzod Aliyev (Apellatsiya komissiyasi raisi)
- **admin** — Tizim Administratori (Audit va xavfsizlik)

---

## 7. Platformani Boshqa Noutbukda va Internetda Ochish

- **Lokal tarmoqda (bitta Wi-Fi orqali):**
  `boshqa_noutbukda_ochish.bat` faylini ishga tushiring.
- **Internet orqali (dunyoning istalgan nuqtasidan bepul jonli havola):**
  - 👉 **`internetda_ochish_cloudflare.bat`** *(Tavsiya etiladi — Cloudflare global tarmog'i, hech qanday parolsiz va cheklovlarsiz to'g'ridan-to'g'ri `https://xxxx.trycloudflare.com` havolasini beradi)*
  - `internetda_ochish_pinggy.bat` *(SSH Pinggy havolasi)*
  - `internetda_ochish.bat` *(Localtunnel havolasi)*
- **Batafsil qo'llanma:** 👉 [internetga_joylash_boyicha_qollanma.md](file:///d:/Magistratura/internetga_joylash_boyicha_qollanma.md)

