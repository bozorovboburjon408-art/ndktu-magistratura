# Boshqa Noutbukda Platformani Ochish Bo‘yicha Qo‘llanma

Ushbu platformani boshqa noutbuk, kompyuter yoki hatto planshet/telefonda ochib ko‘rish uchun **3 xil qulay usul** tayyorlandi. O‘zingizga mos keladigan usulni tanlang:

---

## 1-USUL: Bitta Wi-Fi orqali to‘g‘ridan-to‘g‘ri ochish (Eng qulay va tezkor)
*Bu usulda 2-noutbukka hech narsa o‘rnatish shart emas! Faqat brauzer (Chrome/Edge/Safari) kifoya.*

### 1-qadam (Ushbu noutbukda):
1. Ikkala noutbukni **bitta Wi-Fi tarmog‘iga** ulang (yoki telefoningizdan "Hotspot / Tochka dostupa" yoqing).
2. Loyiha papkasidagi **[`boshqa_noutbukda_ochish.bat`](file:///d:/Magistratura/boshqa_noutbukda_ochish.bat)** faylini sichqoncha bilan ikki marta bosib ishga tushiring.
3. Qora oynada sizning mahalliy IP manzilingiz ko‘rinadi, masalan:
   ```
   >>> MAHALLIY IP MANZIL: 192.168.1.15
   ```
   *(Backend va Frontend serverlari avtomatik tarzda barcha tarmoq qurilmalari uchun ochiq rejimda `0.0.0.0` da ishga tushadi).*

### 2-qadam (Ikkinchi noutbukda):
1. Ikkinchi noutbukda istalgan brauzerni (Chrome, Edge, Safari, Opera) oching.
2. Manzil qatoriga quyidagicha yozing (o‘z IP manzilingiz bilan):
   ```
   http://192.168.1.15:5173
   ```
3. Platforma barcha funksiyalari, 6 ta roli va interfeyslari bilan ikkinchi noutbukda to‘liq ochiladi!

> **Eslatma (Agar ochilmasa):**
> Windows xavfsizlik devori (Firewall) so‘rov bersa, "Allow access / Ruxsat berish" tugmasini bosing. Yoki Windows Firewall sozlamalarida 5173 va 8000 portlariga ruxsat berilganligini tekshiring.

---

## 2-USUL: Loyihani fleshka orqali ikkinchi noutbukka ko‘chirish (Mustaqil / Oflayn)
*Agar platformani ikkinchi noutbukka butunlay ko‘chirib, 1-noutbuksiz alohida mustaqil ishlatmoqchi bo‘lsangiz.*

1. `d:\Magistratura` papkasini fleshkaga nusxalang (fleshkaga nusxalashda `frontend/node_modules` papkasini tashlab o‘tsangiz, ko‘chirish juda tez bo‘ladi).
2. Fleshkani 2-noutbukka ulang va papkani qulay joyga (masalan, `C:\Magistratura` yoki `D:\Magistratura`) joylashtiring.
3. 2-noutbukda Python (3.10+) va Node.js o‘rnatilganligiga ishonch hosil qiling.
4. Papka ichidagi **[`setup_and_run.bat`](file:///d:/Magistratura/setup_and_run.bat)** faylini ishga tushiring.
   - Bu fayl avtomatik tarzda barcha Python va React kutubxonalarini o‘rnatadi;
   - Ma’lumotlar bazasini barcha mezonlar va rollar bilan to‘ldiradi;
   - Serverlarni ishga tushirib, brauzerda ochadi.

---

## 3-USUL: Turli xil tarmoqlarda bo‘lsa (Internet orqali bepul havola)
*Agar ikkala noutbuk bir xil Wi-Fi ga ulana olmasa (masalan, biri uyda, biri ishxonada yoki boshqa shaharda bo‘lsa).*

1. Ushbu noutbukda terminalda quyidagi buyruqni bering:
   ```bash
   npx localtunnel --port 5173
   ```
   yoki [Cloudflare Tunnel / Ngrok] orqali:
   ```bash
   npx ngrok http 5173
   ```
2. Terminal sizga dunyoning istalgan nuqtasidan kirish mumkin bo‘lgan bepul vaqtinchalik xavfsiz havola beradi (masalan: `https://magistratura-demo.loca.lt`).
3. Ushbu havolani ikkinchi noutbuk brauzeriga kiritasiz va platformadan foydalanasiz.
