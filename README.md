# VetCare Frontend

`veterenarya.backend` uchun **professional darajadagi** mehmonlar (public)
veb-saytining frontend qismi.

- Vanilla **HTML + CSS + JavaScript** (build qadami yo'q)
- **Tailwind CSS** CDN orqali
- 3 tilli (UZ / RU / EN) UI
- Backend'dan kontentni **`/api/v1/contents?lang=...`** orqali oladi
- Bo'limlar `[Rasm + Matn] → [Matn + Rasm] → ...` ko'rinishida almashinib chiqadi
- Tavsif qatori istalgan formatda bo'lishi mumkin: **oddiy matn, HTML, JSON** — frontend har birini to'g'ri render qiladi

---

## Tuzilma

```
veterenarya.frontend/
├── index.html              ← Bosh sahifa (Hero, Bo'limlar, Bog'lanish, Footer)
├── css/
│   └── style.css           ← Custom uslublar (animatsiyalar, prose, skeleton)
├── js/
│   ├── config.js           ← API_BASE_URL, default til
│   ├── i18n.js             ← UI matnlari 3 tilda (nav, hero, footer)
│   ├── api.js              ← Backend HTTP klient
│   └── app.js              ← Asosiy logika (til, animatsiya, render)
└── README.md
```

---

## Ishga tushirish (3 qadam)

### 1. Backend ishlayotganiga ishonch hosil qiling

`veterenarya.backend` papkasida:
```bash
dotnet run --project src/VeterinaryBackend.API
```
Backend `http://localhost:5099` da ishlayotgan bo'lsin.

### 2. `js/config.js` da API URL tekshiring

Default:
```js
window.AppConfig = {
  API_BASE_URL: 'http://localhost:5099',
  ...
};
```
Agar backend boshqa portda bo'lsa, shu yerni o'zgartiring.

### 3. Frontendni HTTP serverda oching

> ⚠️ `index.html` ni to'g'ridan-to'g'ri `file://` orqali ochmang —
> brauzer `fetch()` so'rovlariga ruxsat bermaydi. **HTTP server** kerak.

**Eng oson variant** (Python kerak bo'ladi):
```bash
cd veterenarya.frontend
python -m http.server 8080
```

Brauzerda: <http://localhost:8080>

**Boshqa variantlar:**
- VS Code: **Live Server** kengaytmasi
- Node.js: `npx serve .`
- PHP: `php -S localhost:8080`

---

## Xususiyatlar

### 🌐 Til almashtirish
- O'ng yuqori burchakdagi til menyusi (🇺🇿 🇷🇺 🇬🇧)
- Tanlov **localStorage** da saqlanadi
- Almashtirilganda kontent darhol qayta yuklanadi
- UI matnlari `js/i18n.js` da, kontent backend'dan kelgan til bo'yicha qaytadi

### 📰 Kontent bo'limlari
- Backend'dan `?lang=uz|ru|en` bilan olinadi
- `SortOrder` bo'yicha ketma-ket chiqadi
- **Birinchi bo'lim:** rasm chapda, matn o'ngda
- **Ikkinchi bo'lim:** matn chapda, rasm o'ngda
- ...va hokazo (almashinib turadi)

### 🎨 Tavsifning ko'rinishi
Tavsif (`description`) backend'dan istalgan formatda kelishi mumkin:

| Format | Frontend nima qiladi |
|---|---|
| **Oddiy matn** | Paragraflar bilan ko'rsatadi, satr o'rashlarini hurmat qiladi |
| **HTML** (`<p>`, `<h2>`, `<strong>`, `<ul>` va h.k.) | To'g'ridan-to'g'ri render qiladi (prose styling bilan) |
| **JSON** (`{...}` yoki `[...]`) | Avtomatik formatlab `<pre>` ichida ko'rsatadi |

### 🖼 Rasmlarni resolution
Backend `imageUrl` ni 2 xil formatda qaytarishi mumkin:
- **Relativ** (`/uploads/2026/05/abc.jpg`) — frontend `API_BASE_URL` ni oldiga qo'shadi
- **Absolyut** (`https://example.com/img.jpg`) — to'g'ridan-to'g'ri ishlatadi

Rasm yuklanmasa, "No image" placeholder ko'rsatiladi.

### ⚡ Performance va UX
- Lazy loading rasmlarda (`loading="lazy"`)
- Skeleton loaderlar yuklanish paytida
- IntersectionObserver bilan smooth scroll animatsiya
- Sticky navbar — pastga scroll qilinganda blur fonga aylanadi
- Mobile menu (telefonda hamburger)
- "Yuqoriga qaytish" tugmasi
- Responsive — barcha o'lchamlarda (mobile / tablet / desktop) ishlaydi

### 🛡 Xato holatlari
- Backend ishlamasa — qizil error karta + "Qayta urinish" tugmasi
- Hech qanday kontent yo'q bo'lsa — empty state karta

---

## Backend bilan integratsiya

Frontend faqat **bitta public endpoint** ga so'rov qiladi:

```http
GET /api/v1/contents?page=1&pageSize=50&onlyActive=true&lang=uz
Accept-Language: uz
```

Login talab qilinmaydi (mehmonlar uchun ochiq).

---

## Production deployment

### Variant 1 — bitta domen (tavsiya qilinadi)
Frontend va backend'ni bitta domenda joylashtiring (nginx/Apache reverse proxy bilan):

- `https://yoursite.com/` → frontend (`index.html`)
- `https://yoursite.com/api/...` → backend
- `https://yoursite.com/uploads/...` → backend
- `https://yoursite.com/admin/` → admin panel

`config.js` da:
```js
API_BASE_URL: '' // bo'sh string — relative URL ishlatadi
```

### Variant 2 — alohida domen
- `https://www.yoursite.com` → frontend (Netlify, Vercel, GitHub Pages, S3, ...)
- `https://api.yoursite.com` → backend

`config.js` da:
```js
API_BASE_URL: 'https://api.yoursite.com'
```

Backend `Program.cs` da CORS'ni o'z domeningiz bilan cheklang (hozir `AllowAnyOrigin`).

---

## Brending sozlash

Sayt nomi va atamalarini almashtirish uchun:

1. **`index.html`**: `<title>`, `<meta description>`, `data-i18n="brand.name"` bo'lgan barcha joylar
2. **`js/i18n.js`**: 3 tildagi UI matnlari (`brand.name`, `hero.*`, `contact.*`, `footer.*`)
3. **`css/style.css`**: `tailwind.config` (HTML ichida) `colors.brand` palitrasi
4. **Logo**: `index.html` ichidagi 4 ta inline SVG `<svg>` bloklari

---

## Texnik qoidalar

- **No build step** — fayllarni saqlash bilan o'zgarishlar darhol ko'rinadi
- **No npm dependencies** — Tailwind va Google Fonts CDN orqali
- **Modern browser support** — ES6 modullar, `fetch`, IntersectionObserver, CSS Grid
- **SEO friendly** — semantic HTML, meta tags, lang attribute
- **A11y** — ARIA labels, keyboard navigation, color contrast
