# MAGISTRATURA MONITORING PLATFORMASI — VERCEL VA NETLIFY'GA DEPLOY QILISH QO‘LLANMASI

Ushbu loyiha **offline-first & standalone** arxitekturasida yaratilgan bo‘lib, tashqi server yoki backend ma’lumotlar bazasisiz bevosita brauzerning o‘zida (LocalStorage, Web Crypto API, jsPDF, XLSX) 100% mustaqil ishlaydi.

---

## 1-USUL: VERCEL ORQALI BIR ZUMDA DEPLOY QILISH (TAVSIYA ETILADI)

### 1-qadam: Loyihani GitHub'ga yuklash (agar yuklanmagan bo‘lsa)
Terminal yoki PowerShell'da loyiha papkasida (`d:\Magistratura`):
```bash
git init
git add .
git commit -m "feat: Magistratura monitoring platformasi MVP demo"
git branch -M main
git remote add origin https://github.com/SIZNING_USERNAME/magistratura-monitoring.git
git push -u origin main
```

### 2-qadam: Vercel'ga ulash (Vercel Dashboard)
1. [https://vercel.com](https://vercel.com) saytiga kiring va GitHub akkauntingiz orqali **Log in** qiling.
2. **"Add New..."** -> **"Project"** tugmasini bosing.
3. GitHub reestridan `magistratura-monitoring` omborini tanlab, **"Import"** tugmasini bosing.

### 3-qadam: Sozlamalarni tekshirish va Deploy
* **Framework Preset:** Vite
* **Root Directory:** `frontend` (Agar butun loyihani yuklagan bo‘lsangiz, `Edit` ni bosib `frontend` ni tanlang).
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **Deploy** tugmasini bosing!

1 daqiqa ichida saytingiz jonli havola orqali ochiladi:  
?? **`https://magistratura-monitoring.vercel.app`**

---

## 2-USUL: NETLIFY ORQALI DEPLOY QILISH

### 1-qadam: Netlify saytida loyihani ulash
1. [https://www.netlify.com](https://www.netlify.com) saytiga kiring va kiring.
2. **"Add new site"** -> **"Import an existing project"** -> **GitHub** ni tanlang.
3. Repozitoriyani tanlang.

### 2-qadam: Sozlamalarni kiritish
* **Base directory:** `frontend`
* **Build command:** `npm run build`
* **Publish directory:** `frontend/dist`
* **Deploy site** tugmasini bosing!

> Loyihaga `frontend/public/_redirects` fayli oldindan qo‘shilgan. Shuning uchun saytda sahifa yangilanganda (F5) ham "404 Not Found" xatosi umuman chiqmaydi.

---

## 3-USUL: GITHUBSIZ BEVOSITA "DRAG & DROP" ORQALI NETLIFY'GA YUKLASH (ENG TEZKOR YO‘L)

Agar GitHub'ga push qilmasdan darhol jonli sayt olmoqchi bo‘lsangiz:
1. Loyiha frontendini yig‘ing (allaqachon yig‘ilgan):
   ```bash
   cd frontend
   npm run build
   ```
2. `d:\Magistratura\frontend\dist` papkasi hosil bo‘ladi.
3. [https://app.netlify.com/drop](https://app.netlify.com/drop) havolasini brauzerda oching.
4. `dist` papkasini sichqoncha bilan ushlab, Netlify Drop maydoniga tashlang.
5. 10 soniyada bepul HTTPS jonli saytingiz tayyor bo‘ladi!
