Berdasarkan analisis terhadap **README.md Zeinity Creator Assistant** serta daftar provider yang tersedia pada antarmuka **9Router**, berikut adalah evaluasi arsitektur kebutuhan aplikasi Anda dan rekomendasi provider dengan API key gratis yang paling optimal.

### **1\. Karakteristik & Beban Kerja Zeinity Creator Assistant**

Berdasarkan *pipeline* 5 tahap yang dirancang pada aplikasi Anda, beban kerja LLM memiliki spesifikasi teknis berikut:

| Tahap Pipeline | Kebutuhan Utama | Tantangan Teknis |
| :---- | :---- | :---- |
| **Ekstraksi Riset & 10 Narrative Assets** | *Context window* input besar (baca dokumen .docx, .pdf, .md) | Butuh model yang mampu menampung puluhan ribu token input tanpa *context truncation*. |
| **Drafting Naskah Panjang (8–12 Menit)** | *Max output tokens* tinggi (\~1.500–2.500 kata / 3.000–4.000 token per *run*) | Banyak provider membatasi *max output* gratis di 2.048 atau 4.096 token. |
| **Audit VO (14 Spoken Rules) & Visual Cues** | Penalaran instruksi ketat (*structured JSON/markdown* & kepatuhan *rule*) | Membutuhkan *instruction-following* yang disiplin agar format laporan konsisten. |
| **Bahasa & Tone Naskah** | Pemahaman konteks bahasa Indonesia kasual/lisan (*spoken-first*) | Menghindari terjemahan kaku atau frasa klise AI (*"Mari kita selami..."*). |

### **2\. Rekomendasi Provider AI Gratis Terbaik di 9Router**

Di bawah ini adalah perbandingan provider AI gratis yang didukung 9Router, diurutkan berdasarkan kesesuaian dengan kebutuhan Zeinity Creator Assistant:

#### **🥇 1\. Google Gemini (via Google AI Studio) — *Paling Direkomendasikan untuk Riset & Naskah Panjang***

*Status di 9Router: Sudah terhubung (Gemini: 1 Connected)*

* **Model Unggulan**: gemini-2.0-flash / gemini-1.5-flash / gemini-1.5-pro  
* **Kapasitas Kuota Gratis**:  
  * **1.000.000 – 2.000.000 token *context window*** (terbesar di kelas gratis).  
  * Hingga **8.192 *max output tokens*** per *request* (cukup untuk menulis naskah penuh sekaligus).  
  * Kuota gratis AI Studio: umumnya **15 RPM** (Requests Per Minute) dan **1.500 RPD** (Requests Per Day) untuk seri Flash.  
* **Kesesuaian dengan Zeinity**:  
  * **Sangat Superior untuk Dropzone Riset**: Mampu menelan beberapa file referensi riset sekaligus tanpa pemotongan teks.  
  * **Kemampuan Bahasa Indonesia**: Pemahaman nuansa percakapan bahasa Indonesia sangat natural dibanding model open-source berukuran kecil.  
  * **Peran di 9Router**: Ideal dijadikan model utama pada preset Creator-Combo untuk tahap *Research Ingestion* dan *Full Script Drafting*.

#### **🥈 2\. Groq Cloud — *Paling Direkomendasikan untuk Audit Naskah, Hook, & Iterasi Cepat***

*Status di 9Router: Sudah terhubung (Groq: 1 Connected)*

* **Model Unggulan**: llama-3.3-70b-versatile, mixtral-8x7b-32768  
* **Kapasitas Kuota Gratis**:  
  * Kecepatan inferensi LPU (\~250–350 token/detik).  
  * *Context window*: 128k token (llama-3.3-70b).  
  * Kuota gratis: \~30 RPM, tetapi dibatasi TPM (*Tokens Per Minute*, sekitar 6.000–30.000 TPM tergantung model).  
* **Kesesuaian dengan Zeinity**:  
  * **Audit VO & TTS Cepat**: Tahap audit (menghapus tanda baca perusak TTS, frasa klise) membutuhkan respon instan agar *Human-in-the-Loop* tidak terasa lambat.  
  * **Thumbnail Hook & A/B Titles**: Menghasilkan 3 variasi konsep judul dan *visual hooks* dalam hitungan 1–2 detik.  
  * **Catatan**: Hindari mengirim dokumen riset raksasa ke Groq karena batas TPM gratis dapat terlampaui dengan cepat.

#### **🥉 3\. Cerebras Inference — *Alternatif Kecepatan Tinggi untuk Task Ringan***

*Status di 9Router: Tersedia di daftar API Key Providers (Cerebras: No connections)*

* **Model Unggulan**: llama-3.3-70b, llama-3.1-8b  
* **Kapasitas Kuota Gratis**:  
  * Memerlukan pendaftaran API key gratis di [cloud.cerebras.ai](https://cloud.cerebras.ai/).  
  * Kecepatan inferensi wafer-scale sangat ekstrem (\~400–1.000 token/detik).  
  * Kuota gratis: 30 RPM, 60.000 TPM.  
* **Kesesuaian dengan Zeinity**:  
  * Cocok sebagai *fallback* atau tandem Groq untuk *task* pemrosesan cepat seperti *Visual Cue Annotator* (\[BUKTI\], \[KONTEKS\]) dan ekstraksi ide singkat.

#### **4\. OpenRouter (Varian Model :free) — *Hub Akses Model Frontier Alternatif***

*Status di 9Router: Sudah terhubung (OpenRouter: 1 Connected)*

* **Model Unggulan**:  
  * google/gemini-2.0-flash-exp:free  
  * meta-llama/llama-3.3-70b-instruct:free  
  * deepseek/deepseek-chat:free / deepseek/deepseek-r1:free  
  * qwen/qwen-2.5-72b-instruct:free  
* **Kapasitas Kuota Gratis**:  
  * Dibatasi sekitar 20 request/menit dan total 200 request/hari pada akun gratis.  
* **Kesesuaian dengan Zeinity**:  
  * Sangat tepat diposisikan pada **Tier 3 Fallback Chain** seperti yang sudah tertulis di README.md Anda (9Router ➔ Google Gemini Native ➔ OpenRouter ➔ Ollama Local).  
  * Memberi akses ke model DeepSeek V3/R1 untuk penalaran narasi alternatif tanpa biaya.

#### **5\. Ollama Local — *Zero-Cost & 100% Private Fallback***

*Status di 9Router: Sudah terhubung (Ollama Local: 1 Connected)*

* **Model Rekomendasi**: qwen2.5:7b atau llama3.3:8b  
* **Kesesuaian dengan Zeinity**:  
  * Berfungsi sebagai jaring pengaman terakhir jika semua API *cloud* mengalami *rate limit* atau koneksi internet terputus, menjaga fitur *Safe Offline Mode* tetap berjalan.

### **3\. Rekomendasi Konfigurasi Multi-Model Combo di 9Router**

Agar alur kerja di Zeinity Studio berjalan seimbang antara kuota gratis, kecepatan, dan kualitas tulisan, Anda dapat memetakan provider di 9Router sebagai berikut:

Code snippet  
graph TD  
    A\[Input Dokumen & Riset\] \--\>|Context Besar| B(Gemini 2.0 / 1.5 Flash via AI Studio)  
    B \--\> C\[Drafting Naskah Panjang\]  
    C \--\>|Drafting Utama| B  
    C \--\>|Audit VO 14 Rules & Cues| D(Groq / Cerebras Llama 3.3 70B)  
    C \--\>|A/B Title & Hook CTR| D  
    B \-.-\>|Jika Rate Limit| E(OpenRouter Free Tier / DeepSeek)  
    D \-.-\>|Jika Offline / Limit| F(Ollama Local Qwen 2.5)

> 1. **Preset Naskah & Riset (Creator-Combo)**: Arahkan ke **Google Gemini (AI Studio)** untuk memanfaatkan *context window* 1M+ token dan batas output hingga 8k token.  
> 2. **Preset Fast Audit & Hooks**: Arahkan ke **Groq (llama-3.3-70b-versatile)** untuk mendapatkan respon instan di bawah 3 detik.  
> 3. **Emergency Fallback**: Pertahankan rantai *failover* bawaan aplikasi Anda: **9Router Gateway ➔ Google Gemini Native ➔ OpenRouter (:free) ➔ Ollama Local**.