Side Question: sebenarnya saya sadar kalau aplikasi ini seolah-olah prompt generator, agar tidak terkesan seperti itu sebaiknya tambahkan fitur apa atau rombak fitur apa?

Pertanyaan yang sangat bagus dan sangat relevan. Saya akan jujur.

## Diagnosis: Mengapa Terasa Seperti "Prompt Generator"

Saat ini alur dasarnya adalah:
```
User → App → (copy prompt) → AI Eksternal → (paste hasil) → App → (copy prompt lagi) → AI Eksternal → ...
```

App hanya jadi **middleman statis** — formatkan instruksi, lalu lempar ke tempat lain. User masih harus bolak-balik manual.

---

## Solusi: Geser dari "Generator" ke "Orchestrator"

### 🔴 Rombak (High Impact)

**1. Semua "prompt yang perlu di-copy" → jadikan AI action langsung**
Ini yang sedang kita bahas sekarang (Audit Spoken & TTS). Logika yang sama berlaku untuk:
- Research Brief → user klik "Riset Sekarang" → hasil riset muncul langsung di app (bukan user yang copy-paste dari ChatGPT)
- Scriptwriter Handoff → AI langsung draft naskah di dalam app
- Visual Cue → AI langsung anotasi naskah dengan tag `[BUKTI]`, `[JELASKAN]` dst
Catatan tambahan: Tapi, yang saya khawatirkan adalah apakah daftar AI provider saat ini terutama semua models mereka itu mampu melakukan deep research? jika tidak, kemungkinan fitur Research Brief tetap dalam bentuk generator prompt saja, atau bagaimana?.

**2. Hapus "kotak copy prompt" dari UI utama**
Prompt generator *boleh tetap ada* tapi disembunyikan di balik tombol "Lihat Prompt" (collapsed by default). Yang menonjol di depan adalah **hasilnya**, bukan instruksinya.

---

### 🟡 Tambahkan (Medium Impact)

**3. Live Editor Naskah Terintegrasi**
Setelah AI draft naskah, user bisa edit langsung di app — bukan di Notepad/Docs luar. App menjadi ruang kerja tunggal.

**4. Inline Audit Highlight**
Saat Audit Spoken & TTS selesai, tampilkan **highlight langsung di teks naskah** (kalimat bermasalah ditandai merah/kuning), bukan hanya laporan teks terpisah. Ini yang membuat app terasa seperti tools profesional (mirip Grammarly).

**5. Progress Pipeline yang nyata**
Bukan sekadar status badge (Researching → Scripting), tapi tampilkan **persentase completion** berdasarkan berapa langkah AI yang sudah benar-benar selesai di dalam app.

---

### 🟢 Tambahkan (Lower Effort, High Perception Shift)

**6. AI Summary Card setelah setiap aksi**
Setelah AI selesai bekerja, tampilkan ringkasan singkat: *"Ditemukan 4 kalimat bermasalah. 2 em dash, 1 pola AI trope, 1 kalimat kehabisan napas. Draft revisi siap."* — ini membuat user merasa AI **sudah berpikir**, bukan sekedar memformat teks.

**7. Rename framing-nya**
- "Internal AI Prompts" → **"Pipeline Naskah"** atau **"Workspace"**
- "External AI Output" → **"Draft Studio"**
- Kata "Prompt" menghilang dari UI yang terlihat user

---

## Intinya

| Sekarang | Setelah Transformasi |
|---|---|
| App = pabrik instruksi | App = studio produksi konten |
| User kerja keras bolak-balik | AI kerja keras, user review & approve |
| Output = teks prompt | Output = draft, analisis, revisi langsung |
| User copy-paste manual | User klik → selesai dalam app |

**Usulan Audit Spoken & TTS yang sedang kita rencanakan ini adalah langkah pertama yang paling tepat** — dan secara filosofis mengubah identitas app dari "generator" ke "co-creator". Fitur berikutnya yang paling impactful adalah menjadikan Scriptwriter juga full in-app (user tidak perlu copy ke ChatGPT untuk drafting naskah).