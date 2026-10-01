Koreksi Anda tepat. Daftar model pada analisis sebelumnya mencantumkan beberapa nama model yang sudah dipensiunkan (*deprecated/shut down*), seperti mixtral-8x7b-32768 di Groq serta seri gemini-1.5 dan gemini-2.0-flash yang telah digantikan oleh generasi yang lebih baru.  
Berikut adalah pembaruan status model aktif dan ketersediaan *free-tier* yang telah diverifikasi langsung dari dokumentasi resmi masing-masing provider:

### **1\. Google Gemini (Google AI Studio)**

Berdasarkan dokumentasi resmi [Google AI for Developers — Gemini Models](https://ai.google.dev/gemini-api/docs/models):

* **Status Model**:  
  * Seri gemini-1.5 dan gemini-2.0-flash kini berstatus *deprecated* / *shut down*.  
  * Lini model aktif generasi baru meliputi:  
    * **gemini-3.8-flash**: Model Flash paling cerdas untuk alur kerja terstruktur dan penalaran panjang.  
    * **gemini-3.5-flash** / **gemini-3.5-flash-lite**: Model berkecepatan tinggi dengan biaya/kuota sangat efisien.  
    * **gemini-2.5-flash**: Masih dipertahankan untuk alur kerja transisi.  
* **Kesesuaian dengan Zeinity Studio**:  
  * **Tahap Riset (Dropzone)**: Tetap memegang keunggulan *context window* terbesar untuk membaca draf .docx/.pdf panjang sekaligus.  
  * **Roadmap Audio**: Google kini juga menyediakan model khusus seperti gemini-3.8-flash-tts untuk sintesis audio terstruktur yang relevan dengan rencana fitur *TTS preview* di aplikasi Anda.

### **2\. Groq Cloud**

Berdasarkan katalog resmi [GroqDocs — Supported Models](https://console.groq.com/docs/models):

* **Status Model**:  
  * Model lama seperti mixtral-8x7b-32768 dan llama3-8b-8192 sudah resmi dihapus (*deprecated*).  
  * Model produksi aktif saat ini:  
    * **llama-3.3-70b-versatile**: Kecepatan \~280 token/detik, *context window* 131.072 token, *max completion* hingga 32.768 token.  
    * **openai/gpt-oss-120b** & **openai/gpt-oss-20b**: Model *open-weight* dengan inferensi ultra-cepat (\~500–1.000 token/detik) dan kapabilitas *reasoning*.  
    * **llama-3.1-8b-instant**: Inferensi sangat ringan (\~560 token/detik).  
* **Kesesuaian dengan Zeinity Studio**:  
  * **Audit 14 Spoken Rules & Visual Cues**: Gunakan llama-3.3-70b-versatile atau openai/gpt-oss-120b untuk mengeksekusi format audit ORIGINAL \-\> ISSUE \-\> REVISION \-\> REASON secara instan tanpa membuat *creator* menunggu lama.

### **3\. OpenRouter (Free Variants)**

Berdasarkan katalog [OpenRouter Free Models](https://openrouter.ai/collections/free-models):

* **Status Model**:  
  * Akses gratis model *frontier open-source* menggunakan akhiran :free (misalnya meta-llama/llama-3.3-70b-instruct:free, deepseek/deepseek-r1:free, atau qwen/qwen-2.5-72b-instruct:free).  
  * OpenRouter juga menyediakan router otomatis **openrouter/free** yang mengarahkan panggilan secara dinamis ke model gratis yang sedang memiliki kapasitas longgar (seperti model Nemotron dan MiniMax).  
* **Kesesuaian dengan Zeinity Studio**:  
  * Tepat dipertahankan sebagai **Tier 3 Fallback** saat kuota AI Studio atau Groq mencapai batas harian.

### **4\. Cerebras Inference**

Berdasarkan [Cerebras Inference Documentation](https://inference-docs.cerebras.ai/models/overview):

* **Status Model**:  
  * Menyediakan model *open-weights* dengan kecepatan inferensi tinggi (arsitektur WSE). Model aktif mencakup keluarga llama-3.3-70b, llama-3.1-8b, dan model *open-reasoning* (gpt-oss-120b).  
* **Kesesuaian dengan Zeinity Studio**:  
  * Alternatif LPU untuk *task* mikro (seperti pembuatan 3 konsep thumbnail dan judul A/B) jika ingin mendistribusikan beban keluar dari Groq.

### **Ringkasan Penyesuaian Konfigurasi 9Router**

| Tahap Zeinity | Rekomendasi Model Aktif | Provider di 9Router |
| :---- | :---- | :---- |
| **Ekstraksi Riset & Outline** | gemini-3.8-flash / gemini-3.5-flash | Google Gemini (AI Studio) |
| **Penulisan Naskah Penuh** | gemini-3.8-flash atau llama-3.3-70b-versatile | Gemini / Groq |
| **Audit Spoken VO & Visual Cues** | llama-3.3-70b-versatile atau openai/gpt-oss-120b | Groq |
| **A/B Title & Hook CTR** | llama-3.3-70b-versatile | Groq / Cerebras |
| **Fallback Cloud (Free Tier)** | openrouter/free / deepseek-r1:free | OpenRouter |
| **Offline Safe Mode** | qwen2.5:7b / llama3.3:8b | Ollama Local |

