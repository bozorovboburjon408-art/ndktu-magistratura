# Magistratura Platformasini Internetga Joylash (Production / Sayt Qilish) Qo‘llanmasi

Ushbu platformani internet tarmog‘ida doimiy ishlovchi rasmiy veb-sayt (masalan: `https://monitoring.otm.uz` yoki `https://magistr.uz`) holatiga keltirish bo‘yicha to‘liq qadamma-qadam yo‘riqnoma.

---

## 1. Huquqiy Talab (Eng Muhim Jihat!)

> [!IMPORTANT]
> **O‘zbekiston Respublikasining "Shaxsga doir ma’lumotlar to‘g‘risida"gi Qonuni (O‘RQ-547, 27-modda):**
> Ushbu platforma magistrantlarning shaxsiy ma’lumotlari, biometrik shablonlari, taqdimot videoyozuvlari va baholarini qayta ishlaydi. Qonun talabiga binoan, barcha ma’lumotlar bazasi va fayllar **jismonan O‘zbekiston Respublikasi hududida joylashgan serverlarda** saqlanishi shart.
> 
> *Xulosa:* Rasmiy talabalar baholanishi uchun xorijiy xizmatlar (masalan: AQSh yoki Yevropadagi AWS, Vercel, Heroku) qonunan to‘g‘ri kelmaydi. Server O‘zbekiston hududida bo‘lishi lozim.

---

## 2. Kerak Bo‘ladigan Resurslar

1. **Server (VPS / Dedicated):**
   - **Tavsiya:** OTMning o‘z Axborot texnologiyalari markazi (IT markaz) serveri, yoki O‘zbekistondagi milliy data-markazlar (*UZTELECOM Cloud*, *Cloud.uz*, *Eskiz VPS*, *Sarkor*).
   - **Xarakteristikasi:** Ubuntu 22.04 yoki 24.04 LTS, kamida 2–4 yadro (vCPU), 4–8 GB RAM, 80–150 GB SSD disk.
2. **Domen nomi:**
   - OTM tasarrufidagi rasmiy subdomen: masalan, `monitoring.samdu.uz`, `magistr.tatu.uz` *(OTM IT bo‘limi tomonidan bepul ajratiladi)*.
   - Yoki mustaqil `.uz` domen (*cpanel.uz*, *eskiz.uz* orqali olinadi).
3. **SSL Sertifikati (HTTPS):**
   - Bepul Let's Encrypt (Certbot) orqali o‘rnatiladi.

---

## 3. Serverga O‘rnatish: 1-Yo‘l — Docker Compose Orqali (Tavsiya etiladi)

Loyihada ishlab chiqarishga tayyor `docker-compose.yml`, `backend/Dockerfile` va `frontend/Dockerfile` fayllari yaratib qo‘yilgan.

### 1-qadam: Serverga Docker o‘rnatish (Ubuntu terminalida):
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git curl
sudo systemctl enable --now docker
```

### 2-qadam: Loyiha fayllarini serverga joylashtirish:
Loyiha papkasini serverga yuklang (masalan, `/var/www/magistratura` katalogiga):
```bash
cd /var/www/magistratura
```

### 3-qadam: Dastlabki bazani to'ldirish va tizimni ishga tushirish:
```bash
# Barcha konteynerlarni (PostgreSQL + FastAPI Backend + React Nginx Frontend) bitta buyruq bilan yig'ish va ishga tushirish:
docker-compose up -d --build

# Baza jadvallari va mezonlarni yuklash (seed data):
docker-compose exec backend python -m backend.seed_data
```

Tizim serverning 80-portida darhol ishga tushadi!

---

## 4. HTTPS (SSL / Shifrlangan Aloqa) O‘rnatish

Tizimda biometrika va kamera oqimi (WebRTC) ishlashi uchun brauzerlar qat’iy **HTTPS** (xavfsiz sertifikat) talab qiladi.

### Let's Encrypt bepul sertifikatini ulash:
1. Serverda Certbot o‘rnatish:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```
2. Domeningizga sertifikat olish (masalan, `monitoring.otm.uz`):
   ```bash
   sudo certbot certonly --standalone -d monitoring.otm.uz
   ```
3. Nginx konfiguratsiyasiga SSL kalitlarini ko‘rsatish.

---

## 5. Bepul Sinov / Demo Rejimi (Taqdimot Uchun)

Agar siz platformani qonuniy rasmiy talabalarsiz, faqatgina komissiyaga, rektoratga yoki investorlarga **namoyish (demo / portfolio)** sifatida internetda ko‘rsatmoqchi bo‘lsangiz:

1. **Render.com yoki Railway.app (Bepul bulut):**
   - Loyihani GitHub-ga yuklaysiz (`git push`).
   - Render.com da "Web Service" yaratib, GitHub omboringizni tanlaysiz.
   - Natijada sizga `https://magistratura-uz.onrender.com` kabi bepul domen beriladi.
2. **Cloudflare Tunnel (O‘z noutbukingizdan to‘g‘ridan-to‘g‘ri internetga sayt qilish):**
   - Hech qanday server sotib olmasdan, o‘z kompyuteringizdagi dasturni xavfsiz internet havolasiga aylantiradi:
   ```bash
   npx cloudflared tunnel --url http://localhost:5173
   ```
   - Cloudflare sizga bepul `https://xxxx.trycloudflare.com` havolasini beradi va dunyoning istalgan nuqtasidan kirish mumkin bo‘ladi.
