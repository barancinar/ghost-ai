# 👻 Ghost AI

> Gerçek zamanlı, işbirlikçi sistem tasarımı çalışma alanı.

Ghost AI, bir sistemi düz İngilizce ile tarif ettiğiniz, bir AI ajanının bu sistemi paylaşımlı bir tuval (canvas) üzerine haritaladığı, ekip arkadaşlarınızın mimariyi birlikte gerçek zamanlı olarak düzenlediği ve ortaya çıkan grafikten teknik bir spesifikasyon üretebildiğiniz bir uygulamadır.

---

## ✨ Öne Çıkan Özellikler

- **🔐 Kimlik Doğrulama & Projeler** — Clerk ile oturum açma, korumalı rotalar, proje sahipliği ve ortak çalışan (collaborator) erişimi.
- **🎨 İşbirlikçi Tuval** — Liveblocks + React Flow üzerine kurulu, canlı imleç, presence göstergeleri ve gerçek zamanlı node/edge düzenleme.
- **📦 Hazır Sistem Tasarımları** — Monolitik, mikroservis, event-driven, serverless gibi yaygın desenler için hazır başlangıç şablonları; tek tıkla tuvale aktarma.
- **🤖 AI Mimari Üretimi** — Bir prompt'tan yola çıkarak node ve edge'leri paylaşımlı odaya yazan, Trigger.dev üzerinde çalışan dayanıklı (durable) arka plan görevi.
- **📄 Spesifikasyon Üretimi** — Tuval grafiğini kalıcı bir Markdown teknik spesifikasyonuna dönüştürme, görüntüleme ve indirme.

---

## 🧱 Teknoloji Yığını

| Katman            | Teknoloji                 | Rolü                                                    |
| ----------------- | ------------------------- | ------------------------------------------------------- |
| Framework         | Next.js 16 + TypeScript   | Sunucu/istemci sınırlarıyla full-stack uygulama         |
| Arayüz            | Tailwind + shadcn/ui      | Bileşen kompozisyonu ve stillendirme                    |
| Kimlik            | Clerk                     | Kullanıcı kimliği ve rota koruması                      |
| Veritabanı        | Prisma + PostgreSQL       | Proje, ortak çalışan, spec ve görev kayıtları           |
| Tuval             | Liveblocks + React Flow   | Gerçek zamanlı işbirlikçi tuval, presence ve imleçler   |
| Arka plan görevleri | Trigger.dev             | Dayanıklı AI üretim iş akışları                         |
| AI                | AI SDK (Google / OpenRouter) | Mimari ve spesifikasyon üretimi                      |
| Artifact deposu   | Vercel Blob               | Tuval anlık görüntüleri ve üretilen Markdown spec'ler   |

---

## 🚀 Başlangıç

### Gereksinimler

- Node.js 20+
- Bir PostgreSQL veritabanı
- Clerk, Liveblocks, Trigger.dev, Vercel Blob ve bir AI sağlayıcısı (Google AI / OpenRouter) için hesap ve API anahtarları

### Kurulum

```bash
# Bağımlılıkları yükle (postinstall Prisma client'ı üretir)
npm install

# Ortam değişkenlerini ayarla (aşağıya bakınız)
cp .env.example .env   # varsa; yoksa .env dosyasını elle oluşturun

# Veritabanı şemasını uygula
npx prisma migrate deploy

# Geliştirme sunucusunu başlat
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini tarayıcınızda açın.

AI arka plan görevlerini yerelde çalıştırmak için ayrı bir terminalde:

```bash
npm run trigger:dev
```

---

## 🔑 Ortam Değişkenleri

`.env` dosyanızda aşağıdaki anahtarlar tanımlı olmalıdır:

```env
# Clerk (kimlik doğrulama)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_URL=
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=

# Liveblocks (gerçek zamanlı tuval)
LIVEBLOCKS_PUBLIC_KEY=
LIVEBLOCKS_SECRET_KEY=

# Vercel Blob (artifact deposu)
BLOB_READ_WRITE_TOKEN=

# Trigger.dev (arka plan görevleri)
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_REF=

# AI sağlayıcıları
GOOGLE_AI_API_KEY=
OPEN_ROUTER_API_KEY=

# Veritabanı
DATABASE_URL=
```

---

## 📁 Proje Yapısı

```
app/
  (auth)/            # Sign-in / sign-up rotaları
  api/               # Kimlik doğrulamalı istek işleyicileri
    ai/              #   AI üretim tetikleyicileri ve token endpoint'leri
    liveblocks-auth/ #   Oda üyeliğine göre Liveblocks token'ı
    projects/        #   Proje CRUD, tuval, ortak çalışanlar, spec'ler
  editor/[roomId]/   # İşbirlikçi tuval çalışma alanı
components/          # Tuval yüzeyleri, sidebar'lar, diyaloglar, UI
trigger/             # Dayanıklı arka plan görevleri
  design-agent.ts    #   AI mimari üretimi
  generate-spec.ts   #   Markdown spec üretimi
lib/                 # Prisma client, erişim kontrolü, yardımcılar
prisma/              # Şema, modeller ve migration'lar
context/             # Ürün, mimari ve standartlar dokümantasyonu
```

---

## 🏛️ Mimari İlkeler

- **İstek işleyicileri uzun süreli AI işi yürütmez** — bu iş arka plan görevlerine (Trigger.dev) aittir.
- **Metadata ve büyük artifact'lar ayrı katmanlarda saklanır** — ilişkisel veri PostgreSQL'de, tuval anlık görüntüleri ve spec'ler Vercel Blob'da.
- **Kimlik ve sahiplik her mutasyon sınırında zorunlu kılınır** — Liveblocks oda token'ları yalnızca proje üyeliği doğrulandıktan sonra verilir.
- **Tuval şeması tutarlı kalır** — kullanıcı içeriği ile içe aktarılan şablonlar aynı node/edge şemasını paylaşır.

Ayrıntılar için [`context/`](context/) altındaki dokümanlara bakın.

---

## 🔄 Temel Kullanıcı Akışı

1. Kullanıcı oturum açar.
2. Bir proje oluşturur veya seçer.
3. Proje çalışma alanına girer.
4. İsteğe bağlı olarak hazır bir sistem tasarımı şablonunu tuvale aktarır.
5. AI'a sistem tasarımını üretmesi/genişletmesi için prompt verir.
6. AI, paylaşımlı tuvale node ve edge'ler yazar.
7. Ortak çalışanlar tasarımı düzenler ve iyileştirir.
8. Kullanıcı spesifikasyon üretimini tetikler.
9. Uygulama üretilen Markdown spec'i kalıcı olarak saklar.
10. Kullanıcı spec'i görüntüler veya indirir.

---

## 📜 Komutlar

| Komut                   | Açıklama                                       |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Geliştirme sunucusunu başlatır                 |
| `npm run build`         | Prisma client üretir ve production build alır  |
| `npm run start`         | Production sunucusunu başlatır                 |
| `npm run lint`          | ESLint çalıştırır                              |
| `npm run trigger:dev`   | Trigger.dev arka plan görevlerini yerelde çalıştırır |

---

<sub>Next.js 16 ile geliştirildi. Bu proje standart Next.js sürümünden farklı olabilir — kod yazmadan önce `node_modules/next/dist/docs/` altındaki ilgili kılavuza bakın.</sub>
