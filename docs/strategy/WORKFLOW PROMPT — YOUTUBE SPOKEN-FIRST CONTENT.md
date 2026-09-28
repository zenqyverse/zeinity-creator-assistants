# WORKFLOW PROMPT — YOUTUBE SPOKEN-FIRST CONTENT

## CARA MENGGUNAKAN WORKFLOW INI

Workflow ini terdiri dari beberapa tahap yang dijalankan **secara manual dan berurutan**.  
Setiap tahap adalah pekerjaan yang berdiri sendiri.  
AI **tidak boleh menganggap bahwa mengetahui keseluruhan workflow berarti AI mendapatkan izin untuk mengerjakan seluruh workflow sekaligus.**  
AI \*\*tidak boleh menganggap bahwa mengetahui keseluruhan workflow berarti AI mendapatkan izin untuk mengerjakan seluruh workflow sekaligus.\*\*  
Mengetahui langkah berikutnya **tidak berarti mendapat izin untuk mengerjakannya.**  
Setiap tahap memiliki:

* **Scope** → apa yang boleh dikerjakan.  
* **Boundary** → apa yang tidak boleh dikerjakan.  
* **Output** → hasil yang harus diberikan.  
* **Checkpoint** → kondisi yang menandakan tahap selesai.  
* **Stop condition** → kapan AI wajib berhenti.

**Approval gate** → kapan AI boleh melanjutkan ke tahap berikutnya.

## ATURAN GLOBAL

* Kerjakan **hanya tahap yang sedang diminta**.  
* Jangan mengantisipasi prompt saya berikutnya.  
* Jangan mengerjakan tahap berikutnya hanya karena tahap tersebut merupakan langkah logis setelah tahap sekarang.  
* Jangan menambahkan pekerjaan yang tidak diminta dengan alasan ingin "membantu".  
* Jika informasi belum tersedia, **jangan mengarang atau mengasumsikan informasi tersebut hanya agar workflow bisa dilanjutkan.**  
* Jika sesuatu belum dapat ditentukan dari informasi yang tersedia, tandai sebagai **"belum ditentukan"**.  
* Jika saya memberikan koreksi, revisi **hanya bagian yang relevan dengan koreksi tersebut**, kecuali saya meminta revisi menyeluruh.  
* Jika sebuah tahap sudah selesai, **berhenti**.  
* Jangan melanjutkan ke tahap berikutnya sampai saya memberikan instruksi baru atau menyatakan bahwa hasil tahap tersebut **approved**.  
* Jika saya belum memberikan persetujuan, jangan menganggap hasil tahap tersebut otomatis disetujui.  
* Jika saya mengatakan "revisi", tetap berada di tahap yang sama. Jangan berpindah ke tahap berikutnya.  
* Jika saya mengatakan "approved", itu berarti hasil tahap tersebut dapat digunakan sebagai dasar untuk tahap berikutnya, tetapi **tetap tunggu prompt tahap berikutnya dari saya**.

## ATURAN PENTING TENTANG ASUMSI

* AI boleh menggunakan **inferensi yang wajar** untuk memahami konteks, tetapi jangan mengubah inferensi menjadi fakta.  
* Jika terdapat beberapa kemungkinan interpretasi yang material terhadap hasil akhir, jangan memilih salah satunya secara diam-diam.  
* Tandai ketidakpastian tersebut atau minta klarifikasi jika memang diperlukan.  
* **Jangan mengisi kekosongan informasi hanya karena AI bisa menebaknya.**

---

# TAHAP 1 — BRIEF

INPUT

**TOPIK:**  
\[Masukkan topik\]

**DRAFT JUDUL:**  
\[Masukkan judul sementara jika ada\]

**ANGLE:**  
\[Masukkan sudut pandang jika sudah ada\]

**TARGET DURASI:**  
\[Masukkan target durasi\]

**TARGET JUMLAH KATA:**  
\[Masukkan estimasi jumlah kata jika ada\]

**REFERENSI / HASIL RISET:**  
\[Unggahan file docx/md\]

TUGAS  
Gunakan informasi yang diberikan untuk merumuskan **content brief** yang menjadi fondasi untuk tahap berikutnya.  
Tentukan:  
\- pertanyaan utama yang akan dijawab video  
\- target penonton  
\- tujuan video  
\- konteks penting  
\- batasan klaim  
\- hal yang belum dapat ditentukan  
\- arah argumentasi utama jika memang sudah dapat ditentukan dari informasi yang tersedia  
Jangan mengembangkan materi menjadi script.  
\- jika dalam file riset ada bagian data yang rumpang atau diberi tanda \[PERLU VERIFIKASI\], maka jangan dimasukkan atau kalaupun memang perlu maka beri tanda sebuah kalimat tertentu. 

BOUNDARY  
Pada tahap ini:

* Jangan membuat outline.  
* Jangan membuat struktur bab.  
* Jangan membuat hook.  
* Jangan membuat opening script.  
* Jangan menulis script.  
* Jangan membuat judul alternatif kecuali diminta.  
* Jangan melakukan riset tambahan kecuali diminta.  
* Jangan memberikan rekomendasi tahap berikutnya.

Jangan mengantisipasi pekerjaan pada tahap berikutnya.

---

OUTPUT  
Berikan hanya **content brief** yang sudah dirumuskan.  
Jangan menyertakan pekerjaan dari tahap lain.

CHECKPOINT  
Tahap ini selesai ketika content brief sudah cukup jelas untuk menjadi dasar penyusunan outline.

STOP CONDITION  
Setelah content brief selesai, **BERHENTI.**  
Jangan melanjutkan ke outline, hook, script, atau tahap lainnya.  
Tunggu instruksi saya berikutnya.

---

# TAHAP 2 — OUTLINE

INPUT  
Gunakan:  
1\. Content brief yang sudah saya berikan atau setujui.  
2\. Referensi / hasil riset yang saya berikan.  
3\. Koreksi atau arahan tambahan dari saya.  
Jangan menganggap informasi di luar input tersebut sebagai fakta yang sudah disetujui.  
4\. Premis :   
5\. Tesis: 

TUGAS  
Buat outline video berdasarkan brief yang sudah disetujui. Outline harus memperlihatkan bagaimana argumen berkembang dari awal sampai akhir. Pastikan setiap bagian memiliki fungsi yang berbeda.

Perhatikan:  
\- urutan logis  
\- perkembangan argumentasi  
\- hubungan sebab-akibat  
\- konflik atau pertanyaan utama  
\- informasi yang perlu diperkenalkan  
\- bukti atau contoh yang mendukung argumen  
\- transisi antarbagian  
\- arah menuju kesimpulan

Outline harus cukup detail untuk menjadi fondasi penulisan script, tetapi **belum menjadi script**.

BOUNDARY  
Pada tahap ini:  
\- Jangan menulis script lengkap.  
\- Jangan menulis paragraf final.  
\- Jangan membuat kalimat spoken final.  
\- Jangan melakukan spoken/TTS polishing.  
\- Jangan membuat tambahan argumentasi yang tidak memiliki dasar dari brief atau referensi.  
\- Jangan melanjutkan ke tahap script.

OUTPUT  
Berikan outline yang terstruktur.  
Untuk setiap bagian, jelaskan:

**Fungsi bagian:**  
Apa yang harus dicapai bagian ini.

**Isi utama:**  
Apa yang akan dibahas.

**Argumen:**  
Apa yang ingin disampaikan.

**Bukti/contoh:**  
Data, fakta, contoh, atau referensi yang relevan jika tersedia.

**Arah transisi:**  
Bagaimana bagian ini mengantarkan penonton ke bagian berikutnya.

CHECKPOINT  
Outline selesai ketika seluruh alur argumentasi sudah jelas dan tidak ada bagian besar yang masih membutuhkan tebakan untuk dapat ditulis menjadi script.

STOP CONDITION  
\- Setelah outline selesai, **BERHENTI.**  
\- Jangan menulis script.  
\- Jangan membuat hook final.  
\- Jangan melakukan polishing.  
\- Tunggu instruksi saya.

---

# TAHAP 3 — PENULISAN SCRIPT

INPUT  
Gunakan hanya:  
1\. Brief yang sudah disetujui.  
2\. Outline yang sudah disetujui.  
3\. Referensi / hasil riset yang tersedia.  
4\. Arahan gaya bahasa yang saya berikan.

TUJUAN UTAMA  
Tulis script YouTube yang terdengar seperti seorang content creator sedang berbicara langsung kepada penonton, bukan seperti artikel yang dibacakan.

Target akhirnya adalah:  
spoken-first \+ TTS-aware \+ dynamic sentence length

Script harus terdengar natural ketika:  
\- dibaca keras oleh manusia  
\- dibacakan voice actor  
\- dimasukkan ke AI Text-to-Speech

Bayangkan seorang creator sedang berbicara kepada penonton di depan kamera tanpa teleprompter. Dia tahu apa yang ingin disampaikan, lalu menjelaskan pemikirannya secara natural. Tulis seperti manusia berbicara, bukan seperti artikel yang diberi voice-over.

1\. PANJANG KALIMAT HARUS DINAMIS  
\- Jangan membuat aturan bahwa semua kalimat harus pendek.  
\- Jangan membuat semua kalimat memiliki jumlah kata yang sama.  
\- Jangan menggunakan batas jumlah kata sebagai aturan utama.  
\- Kalimat manusia bersifat dinamis.  
\- Kadang pendek.  
\- Kadang sedang.  
\- Kadang cukup panjang karena seseorang sedang menyelesaikan satu pemikiran yang kompleks.

Panjang kalimat harus mengikuti aliran pemikiran, bukan target jumlah kata. Jika beberapa klausa masih merupakan satu pemikiran ketika diucapkan, biarkan tetap menjadi satu kalimat.

Contoh yang buruk:

“Ada orang yang punya kamera.  
Ada yang punya followers.  
Ada yang punya jaringan.  
Ada yang punya kemampuan bicara.”

Contoh yang lebih natural:

“Ada orang yang punya kamera, ada yang punya followers, ada yang punya jaringan, dan ada juga yang memang punya kemampuan untuk membuat ceritanya menarik perhatian.”

Jangan memecah kalimat hanya agar teks terlihat lebih punchy.

2\. PUNCTUATION ADALAH BAGIAN DARI PERFORMA SUARA  
\- Perlakukan tanda baca sebagai petunjuk prosodi.  
\- Koma berarti pemikiran masih berlanjut dan membutuhkan jeda ringan.  
\- Titik berarti pemikiran selesai dan secara natural dapat menyebabkan intonasi turun.  
\- Tanda tanya dapat mempertahankan atau menaikkan intonasi.  
\- Karena script akan digunakan untuk AI TTS, jangan menggunakan terlalu banyak titik hanya untuk menciptakan efek visual.  
\- Jangan memecah satu pemikiran menjadi beberapa kalimat pendek jika secara natural manusia akan mengucapkannya sebagai satu kalimat dengan koma.  
\- Jangan menggunakan line break sebagai pengganti koma.

3\. TULIS BERDASARKAN UNIT PEMIKIRAN  
Jangan menentukan struktur kalimat berdasarkan jumlah kata.  
Tentukan berdasarkan:  
"Apakah orang yang sedang berbicara sudah selesai dengan pemikirannya?"

Jika belum, jangan otomatis memberikan titik. Jika sudah, titik dapat digunakan.  
Tujuan utamanya adalah membuat aliran pemikiran yang natural ketika didengar.

4\. VARIASIKAN RITME  
Gunakan kombinasi:  
\- kalimat pendek  
\- kalimat sedang  
\- kalimat panjang  
\- pertanyaan  
\- penjelasan  
\- observasi  
\- penekanan

Tetapi variasikan berdasarkan kebutuhan komunikasi, bukan sebagai pola mekanis.

Jangan membuat pola:  
pendek → pendek → panjang → pendek → pendek  
berulang sepanjang script.

Ritme harus terasa seperti percakapan manusia.

**5\. PENGGUNAAN KALIMAT PENDEK HARUS MEMILIKI ALASAN JELAS**

Kalimat pendek hendaknya dimanfaatkan untuk:

\- punchline  
\- penekanan poin  
\- pergeseran pemikiran  
\- pertanyaan retoris  
\- kesimpulan  
\- emotional beat

Jangan memakai kalimat pendek semata-mata agar script terkesan lebih dramatis.

**6\. BATASI FRAGMEN BERLEBIHAN**

Hindari menjadikan potongan seperti:

\- Masalahnya?  
\- Serius?  
\- Kenapa?  
\- Bukan.

sebagai gaya penulisan utama.

Penggunaannya sesekali tetap diperbolehkan.

Pemakaian terlalu intensif akan membuat narasi terdengar layaknya copywriting, trailer, atau gaya AI yang dipaksakan dramatis.

**7\. HINDARI REPETISI POLA AI**

Jangan terlalu sering mengulang struktur:

\- Bukan X, melainkan Y.

\- Tidak cuma X, tetapi juga Y.

\- Ini bukan soal X, melainkan tentang Y.

\- X bukan sekadar X, tetapi X adalah Y.

Gunakan bentuk ini bila sungguh dibutuhkan.

Jangan menggantungkan penekanan gagasan pada templat struktur tersebut.

**8\. BAHASA HARUS TERDENGAR NATURAL DAN KOMUNIKATIF**

Jauhi konstruksi baku ala artikel seperti:

"Hal tersebut menunjukkan bahwa..."

"Dapat disimpulkan bahwa..."

"Dalam konteks ini..."

"Lebih lanjut..."

"Pada akhirnya, dapat dikatakan..."

Pilihlah tuturan yang wajar diucapkan oleh seorang creator.

Misalnya:

"Nah, di titik ini masalahnya mulai kelihatan."

"Kalau dipikir-pikir, situasi ini agak aneh."

"Tapi persoalannya tidak berhenti sampai di situ."

"Dan justru bagian inilah yang paling sering terlewatkan."

Selalu selaraskan dengan karakter creator.

**9\. TRANSISI HARUS MENGALIR SEBAGAI KELANJUTAN PEMIKIRAN**

Jangan membagi antarseksi seperti subjudul artikel baku.

Hindari ungkapan kaku:

"Selanjutnya, mari kita membahas..."

"Di sisi lain, terdapat aspek lain..."

"Selain itu..."

Gunakan jembatan tutur yang mengalir seolah pembicaraan sedang berlanjut secara alami.

**10\. TULIS UNTUK DIDENGAR, BUKAN UNTUK DIBACA**

Jangan memecah baris cuma demi memberi kesan dramatis visual.

Jangan menjadikan tiap baris tunggal sebagai satu kalimat utuh.

Jangan memanfaatkan pemisah baris untuk menggantikan fungsi koma.

Pemisah paragraf hanya dipakai jika ada pergantian gagasan, bukan setiap kali menginginkan jeda bicara.

**11\. JANGAN MEMAKSAKAN ESTIMASI JUMLAH KATA**

Target kata hanyalah ancangan durasi.

Jangan memangkas kalimat hanya lantaran kata terasa berlebih.

Jangan pula memperpanjang tuturan cuma untuk mengejar kuota.

Urutan prioritas:

\- Natural saat diucapkan.  
\- Alur pemikiran jernih.  
\- Argumen kokoh.  
\- Gampang dipahami telinga penonton.  
\- Ritme lumrah.  
\- Baru memperhitungkan target durasi serta jumlah kata.  
**12\. UJI KELAYAKAN LISAN**

Sebelum menyerahkan hasil akhir, lakukan evaluasi mandiri:

"Seandainya creator memahami inti argumen tanpa membaca naskah, apakah tuturan ini tetap terasa wajar keluar dari mulutnya?"

Bila tidak, lakukan penyesuaian.

Jangan menyusun teks yang bunyinya seperti seseorang sedang membacakan ragam tulis kaku.

**13\. PEMERIKSAAN KESESUAIAN TTS**

Cermati aspek spesifik berikut:

\- Apakah terdapat terlalu banyak titik beruntun?  
\- Apakah ada perincian yang mestinya dijadikan satu kalimat utuh?  
\- Apakah koma sudah ditaruh pada saat pemikiran masih berlanjut?  
\- Apakah titik diletakkan persis ketika gagasan benar-benar usai?  
\- Apakah rentetan kalimat pendek justru membuat intonasi terus merosot?  
\- Apakah panjang kalimat terlampau monoton?  
\- Apakah ada repetisi struktur kalimat?  
\- Apakah ada bagian yang terkesan seperti membaca poin-poin perincian?  
\- Apakah peralihan tutur terasa mengalir saat didengar?  
\- Apakah sebuah kalimat terdengar alami sewaktu diujarkan lantang?  
**14\. PERTAHANKAN SUBSTANSI MATERI**

Dalam memoles materi menjadi naskah lisan:

Jangan mengubah data atau fakta.

Jangan melencengkan temuan atau kesimpulan.

Jangan menyisipkan klaim tanpa dasar yang sahih.

Jangan melebih-lebihkan poin cuma agar terkesan hebat.

Bila sumber rujukan cuma menopang klaim terbatas, jaga batasan tersebut.

Keluwesan bahasa tutur tidak boleh mengorbankan ketepatan informasi.

OUTPUT

Sajikan **script final** saja.

Jangan menyertakan bedah atau analisis naskah.

Jangan memaparkan alasan di balik gaya penulisan.

Jangan membuat daftar perbaikan yang telah dikerjakan.

Jangan menampilkan outline ulang.

STOP CONDITION

Begitu script selesai, **BERHENTI.**

Jangan melakukan evaluasi TTS terpisah kecuali ada arahan eksplisit.

Tunggu instruksi saya selanjutnya.

---

# TAHAP 4 — AUDIT SPOKEN & TTS

INPUT

Gunakan naskah yang telah Anda tulis sebelumnya.

TUGAS

Lakukan evaluasi naskah **khusus pada kelayakan tutur lisan dan pembacaan AI TTS**.

Jangan mengutak-atik substansi atau pokok gagasan.

Fokuskan peninjauan pada kealamian tuturan agar terdengar seperti manusia yang sedang berbicara.

---

PERIKSA

A. Struktur kalimat

Identifikasi kalimat yang:

* terlalu terpecah-pecah  
* terlalu singkat tanpa alasan kuat  
* terlalu panjang hingga membingungkan  
* mempunyai panjang yang seragam dan monoton  
* seharusnya disatukan

seharusnya dipisah

B. Punctuation

Evaluasi:

* penempatan koma  
* penempatan titik  
* penempatan tanda tanya  
* jeda antargagasan

potensi penurunan intonasi yang terlalu kerap

C. Naturalitas

Temukan bagian yang:

* terdengar kaku seperti tulisan artikel  
* terdengar bagai pembacaan berita  
* terlalu formal dan resmi  
* belum terlihat kasual sama sekali secara keseluruhan (BAGIAN INI SANGAT PENTING, DETEKSI SEGERA)  
* terasa buatan mesin AI  
* mengulang-ulang pola tata bahasa

janggal saat dilafalkan

D. TTS

Antisipasi cara sistem AI TTS melafalkan naskah.

Beri perhatian ekstra pada bagian dengan:

* deretan titik yang berlebihan  
* daftar pendek beruntun  
* klausa terputus

tanda baca yang bisa memicu jeda atau perubahan intonasi yang tidak alami

---

OUTPUT

Jangan langsung mengedit keseluruhan isi naskah.

Cukup cantumkan poin yang bermasalah dengan format berikut:

**BAGIAN ASLI:**  
\[Kalimat asal\]

**MASALAH:**  
\[Paparkan kendala lisan/TTS\]

**REVISI:**  
\[Bentuk tuturan yang luwes\]

**ALASAN:**  
\[Uraikan ringkas kenapa revisi ini lebih pas untuk bahasa tutur\]

Jika tidak menjumpai kejanggalan berarti, sampaikan:

**"Tidak ditemukan kendala spoken/TTS yang berarti."**

---

BOUNDARY

Jangan:

* mengubah gubahan tesis  
* menggeser garis alur argumen  
* menyelipkan fakta baru  
* membuang fakta penting  
* mengubah pembawaan nada creator  
* menulis ulang bagian yang sudah lumrah diucapkan

memoles kata sekadar supaya kelihatan berbeda

Pemeriksaan ini khusus ditujukan untuk **penyampaian lisan serta AI TTS**.

STOP CONDITION

Begitu pemeriksaan tuntas, **BERHENTI.**

---

# TAHAP 5 — REVISI AKHIR

INPUT

Gunakan:

1\. Naskah tahap yang Anda tulis sebelumnya.  
2\. Hasil evaluasi spoken/TTS yang Anda audit sebelumnya.  
3\. Petunjuk revisi dari saya dibawa ini.

TUGAS

Perbaiki bagian yang memang memerlukan pembenahan berdasar catatan evaluasi dan arahan saya.

Pertahankan:

* tesis utama  
* alur argumentasi  
* fakta yang ada  
* kerangka utama  
* tone pembawaan  
* persona creator

gaya tutur

kecuali terdapat permintaan eksplisit untuk mengubahnya.

Sempurnakan:

* keluwesan bahasa lisan  
* variasi panjang kalimat  
* tanda baca prosodi  
* ritme bicara  
* peralihan gagasan

pembacaan TTS

jika diwajibkan.

---

ATURAN PENTING

Jangan berasumsi setiap kalimat mesti dirombak.

Jika suatu seksi sudah terasa luwes, **pertahankan bentuknya.**

Jangan melakukan penulisan ulang semata-mata supaya susunan kata tampak baru.

Tujuan revisi ialah **meningkatkan mutu**, bukan sekadar melahirkan versi yang berbeda dari sebelumnya.

---

OUTPUT

Serahkan script final lengkap yang telah direvisi.

Jangan menyisipkan analisis tambahan kecuali jika diminta.

---

STOP CONDITION

Sesudah script final rampung, **BERHENTI.**

Jangan mengadakan pemeriksaan ulang, membuat opsi alternatif, atau berpindah ke fase lain tanpa instruksi spesifik.

---

