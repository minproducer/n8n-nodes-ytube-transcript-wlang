# 🧪 YouTube Transcript Node Test Runner

> 🇻🇳 Tiếng Việt ở trên | 🇺🇸 English version below

---

## 🇻🇳 GIỚI THIỆU

Công cụ CLI để test node tùy chỉnh `YouTubeTranscriptWithLanguage` trong n8n. Hỗ trợ chạy test đơn lẻ, hàng loạt, log chi tiết, và lưu kết quả ra file.

---

## 🚀 TÍNH NĂNG NỔI BẬT

- ✅ Test video đơn qua `--video` hoặc `--url`
- ✅ Test hàng loạt từ file `.json`, `.csv`, `.txt`
- ✅ Tuỳ chỉnh ngôn ngữ, kiểu phụ đề (manual/auto), định dạng xuất (`structured`, `plainText`, `both`)
- ✅ Hiển thị chi tiết kết quả, metadata, preview subtitle
- ✅ Lưu kết quả tự động theo tên test và timestamp
- ✅ CLI có hỗ trợ help, debug, kiểm tra videoId, báo lỗi chuẩn

---

## 📦 CÀI ĐẶT

```bash
pip install yt-dlp
```

Không cần cài đặt npm, chỉ chạy:

```bash
node tools/test-runner.js
```

---

## 💡 CÁCH DÙNG

### ▶️ Test một video:

```bash
node test-runner.js --url "https://www.youtube.com/watch?v=5rJbGqNyPn4" --lang vi --savefile
```

### 🧪 Test hàng loạt:

```bash
node test-runner.js --file ./videos.json --save
```

### 🔁 Chạy toàn bộ test mặc định:

```bash
node test-runner.js
```

---

## 📂 CẤU TRÚC FILE ĐẦU VÀO

- `videos.json`
```json
[{ "videoId": "dQw4w9WgXcQ", "lang": "en" }]
```

- `videos.csv`
```
dQw4w9WgXcQ,en
```

- `videos.txt`
```
dQw4w9WgXcQ
```

---

## 🧰 TUỲ CHỌN DÒNG LỆNH

| Tuỳ chọn | Ý nghĩa |
|----------|--------|
| `--video`, `-v` | YouTube Video ID |
| `--url`         | Link đầy đủ đến YouTube |
| `--lang`, `-l`  | Mã ngôn ngữ phụ đề (vi, en, ...) |
| `--format`, `-f`| Dạng kết quả: structured / plainText / both |
| `--prefer-manual` | Ưu tiên phụ đề thủ công |
| `--metadata`, `-m` | Có lấy metadata hay không |
| `--save`, `--savefile` | Lưu kết quả ra file |
| `--output-dir`, `-o` | Chỉ định thư mục lưu |
| `--file` | Chạy theo danh sách video từ file |
| `--debug` | Bật in lỗi chi tiết |
| `--help` | Hiện hướng dẫn sử dụng |

---

## ✍️ Viết bởi **Min** – Dev chính của node này 😎

---

## 🇺🇸 ENGLISH VERSION

A CLI tool to test the custom `YouTubeTranscriptWithLanguage` node for n8n. Supports single and batch video testing, detailed logging, and exporting results.

---

## 🚀 FEATURES

- ✅ Test a single video by `--video` or `--url`
- ✅ Run batch tests from `.json`, `.csv`, or `.txt` files
- ✅ Customize language, subtitle mode (manual/auto), output format (`structured`, `plainText`, `both`)
- ✅ Logs title, uploader, duration, transcript count, and plain text preview
- ✅ Automatically saves results with timestamped filenames
- ✅ Full CLI support: help, debug, validation, and error handling

---

## 🛠 INSTALLATION

```bash
pip install yt-dlp
```

No npm install needed, just run:

```bash
node tools/test-runner.js
```

---

## 💡 USAGE

### ▶️ Test one video

```bash
node test-runner.js --url "https://www.youtube.com/watch?v=5rJbGqNyPn4" --lang vi --savefile
```

### 🧪 Batch test

```bash
node test-runner.js --file ./videos.json --save
```

### 🔁 Run all built-in test cases

```bash
node test-runner.js
```

---

## 📂 SUPPORTED INPUT FORMATS

- `videos.json`
```json
[{ "videoId": "dQw4w9WgXcQ", "lang": "en" }]
```

- `videos.csv`
```
dQw4w9WgXcQ,en
```

- `videos.txt`
```
dQw4w9WgXcQ
```

---

## 🔧 CLI OPTIONS

| Option | Description |
|--------|-------------|
| `--video`, `-v` | YouTube Video ID |
| `--url`         | Full YouTube URL |
| `--lang`, `-l`  | Subtitle language code |
| `--format`, `-f`| Output: structured / plainText / both |
| `--prefer-manual` | Prefer manually uploaded subs |
| `--metadata`, `-m` | Include metadata or not |
| `--save`, `--savefile` | Save results to file |
| `--output-dir`, `-o` | Destination folder |
| `--file` | Load batch videos from file |
| `--debug` | Show debug logs |
| `--help` | Show help screen |

---

> ✨ Built by **Min** — a subtitle-savvy dev 🧠
