# AdaptiveMath — Nền tảng học Toán THCS thích ứng

Ứng dụng web giúp học sinh THCS Việt Nam lớp 6, 7, 8, 9 học Toán theo **Chương trình GDPT 2018**. Nội dung được tổ chức theo bộ SGK Kết nối tri thức với cuộc sống, bộ sách dùng thống nhất toàn quốc từ năm học 2026 đến 2027. Hệ thống có bài kiểm tra đầu vào thích ứng (CAT), hồ sơ năng lực từng chủ đề, cây tri thức, lộ trình học theo ngày và luyện tập có lặp lại ngắt quãng.

Viết bằng **HTML + CSS + JavaScript thuần**. Không framework, không bundler, **không có bước build** — Firebase được nạp qua bản `compat` chạy thẳng bằng thẻ `<script>`.

- 1 472 câu hỏi trắc nghiệm biên soạn mới, phủ 92 chủ đề Toán lớp 6, 7, 8, 9, kèm 92 mục lý thuyết. Mỗi chủ đề có câu hỏi ở bốn mức Nhận biết, Thông hiểu, Vận dụng và Vận dụng cao.
- **Bài tập cá nhân hóa** (`#/exercises`): 3 633 bài tập lớp 6–9 tách từ 8 tài liệu PDF trong `data/`, phân loại khối → chương → chủ đề (lớp 6: 1 457 · lớp 7: 772 · lớp 8: 877 · lớp 9: 527). Gợi ý mỗi ngày theo hồ sơ năng lực + BKT; câu trắc nghiệm có đáp án được chấm ngay, bài tự luận tự đánh giá; lớp 8 tập 2 có kèm hướng dẫn giải
- **Kiểm tra đầu vào theo từng chương**: chọn chương → CAT chỉ chạy trên các chủ đề của chương đó; kết quả các chương cộng dồn vào một hồ sơ năng lực
- **Gia sư AI (Gemini)** (`#/tutor` và nút "Hỏi gia sư AI" ở mỗi bài tập / câu luyện tập): 5 chế độ — **Vì sao đúng / sai** (phân tích đúng đáp án em đã chọn, đoán em nghĩ sai ở đâu, ghi "Loại lỗi"; có ở bài tập trắc nghiệm, luyện tập và sổ tay lỗi sai), Gợi ý bước đầu (không lộ đáp số), Kiểm tra bài làm (gõ hoặc chụp ảnh), Lời giải chi tiết (kèm bài tương tự), Hỏi tự do; trả lời dạng luồng, hiển thị LaTeX
- **Lộ trình do Gia sư AI xây dựng** (trang Lộ trình học): AI đọc hồ sơ năng lực, bài tập đã làm, lỗi chưa sửa rồi lập kế hoạch 1–4 tuần theo ngày, có nhận xét điểm mạnh/yếu và lý giải; mỗi nhiệm vụ dẫn thẳng tới trang lý thuyết / bài tập / luyện tập / kiểm tra chương
- Thuật toán: IRT 3PL, CAT theo thang N→H→V→T, Bayesian Knowledge Tracing, SM-2
- **Đăng nhập bằng Firebase Auth**, hai vai trò: học sinh và quản trị
- Tiến trình học đồng bộ lên Firestore theo tài khoản — đăng nhập máy nào cũng thấy

---

## 1. Chạy trên máy

⚠️ **Phải chạy qua web server, không mở bằng `file://`.** Firebase Auth từ chối origin `null`, nên nháy đúp `index.html` sẽ không đăng nhập được.

```bash
python -m http.server 8080     # hoặc: npx serve .
```

Rồi mở `http://localhost:8080`. `localhost` đã nằm sẵn trong danh sách domain được Firebase cho phép.

**Cần kết nối mạng** để tải Firebase SDK, KaTeX và font từ CDN.

---

## 2. Thiết lập Firebase (làm một lần)

Project mặc định: **`adaptivemath-tmhp-2026`** (khai báo trong `.firebaserc`, cấu hình nằm trong `js/core/firebaseClient.js`).

### 2.1. Bật đăng nhập Email/Password

Firebase Console → **Authentication** → *Get started* → tab **Sign-in method** → bật **Email/Password**.

### 2.2. Bật Firestore

Firebase Console → **Firestore Database** → *Create database* → chọn vùng `asia-southeast1` (Singapore) → chế độ **production**.

### 2.3. Nạp security rules — **bắt buộc**

Mở **Firestore Database → Rules**, dán toàn bộ nội dung file `firestore.rules` trong dự án vào, bấm **Publish**.

Nếu quen dùng CLI thì có thể chạy `firebase deploy --only firestore:rules` (file `firebase.json` đã cấu hình sẵn).

Không có bước này thì hoặc là mọi thao tác bị từ chối, hoặc (nếu bạn để chế độ test) ai cũng đọc được dữ liệu của người khác.

### 2.4. Cho phép tên miền

Firebase Console → **Authentication → Settings → Authorized domains** → **Add domain** → thêm tên miền Cloudflare của bạn, ví dụ `adaptivemath.pages.dev`.

`localhost` đã có sẵn, không cần thêm.

### 2.5. Tạo tài khoản quản trị

Học sinh và giáo viên tự chọn vai trò ngay ở màn hình đăng ký. Riêng **admin** thì không: không có "mật khẩu admin" nào nằm trong mã nguồn — **bất cứ gì gửi xuống trình duyệt đều đọc được bằng F12**, nên một mật khẩu cứng trong JavaScript chỉ là trang trí. Thay vào đó admin là một tài khoản thật:

1. Mở web, bấm **Đăng ký**, tạo tài khoản bằng email quản trị của bạn (mật khẩu riêng, do bạn đặt).
2. Vào Firebase Console → **Firestore Database** → collection `users` → mở document có `email` trùng email vừa đăng ký.
3. Sửa trường `role` từ `student` thành `admin` → **Update**.
4. Đăng xuất rồi đăng nhập lại. Thanh bên sẽ xuất hiện mục **Quản trị**.

Rules chặn mọi tài khoản tự đổi `role` của mình sau khi đã tạo, nên đây là cách duy nhất để cấp quyền admin.

### 2.6. Xoá sạch tài khoản cũ (chỉ làm khi chuyển sang bản có vai trò)

Tài khoản tạo từ bản cũ không có trường `role` mà rules mới hiểu, và cũng không có cách nào chọn lại vai trò. Trước khi mở đăng ký, hãy xoá sạch:

```bash
cd tools
npm install firebase-admin
# Tải service-account.json: Firebase Console → Project settings
#   → Service accounts → Generate new private key → lưu vào tools/

node reset-accounts.js                            # chạy thử, chỉ liệt kê
node reset-accounts.js --yes-delete-everything    # xoá thật
```

Script xoá **toàn bộ** user trong Authentication cùng ba collection `users`, `learners`, `classes`. Không có bước hoàn tác. Khoá `service-account.json` bỏ qua mọi security rules — đã nằm trong `.gitignore`, và nên xoá khỏi máy khi dùng xong.

---

## 3. Đăng nhập và phân quyền hoạt động thế nào

Ba vai trò. Học sinh và giáo viên chọn khi đăng ký; admin cấp thủ công (mục 2.5).

| | Học sinh | Giáo viên | Quản trị |
|---|---|---|---|
| Học, làm bài, xem hồ sơ năng lực | ✅ | ❌ | ✅ |
| Đọc dữ liệu học của chính mình | ✅ | — | ✅ |
| Tạo lớp, sinh mã lớp | ❌ | ✅ | ❌ |
| Vào lớp bằng mã | ✅ | ❌ | ❌ |
| Xem tiến độ học sinh **trong lớp mình** | ❌ | ✅ | ✅ |
| Xem toàn bộ tài khoản trong hệ thống | ❌ | ❌ | ✅ |
| Đọc bài làm chi tiết của người khác | ❌ | ❌ | ❌ |
| Tự đổi vai trò của mình | ❌ | ❌ | ❌ |

**Giáo viên chỉ thấy học sinh đã tự nhập mã lớp của mình** — không có cách nào liệt kê học sinh ngoài lớp. Đây là lý do mã lớp được dùng làm *document id* của lớp: học sinh vào lớp bằng một lệnh đọc trực tiếp `classes/{MÃ}`, nên không cần cấp quyền liệt kê collection `classes` cho ai cả (nếu cấp, mọi mã lớp trong hệ thống sẽ lộ).

**Đánh đổi cần nói thẳng:** vai trò giáo viên là tự khai. Không có gì ngăn một người đăng ký làm giáo viên. Thứ được đảm bảo là *phạm vi*: một "giáo viên" như vậy vẫn không chạm được tới bất kỳ học sinh nào chưa nhập mã lớp của họ. Nếu trường cần chặt hơn, hãy đổi rule `create` của `users/{uid}` thành chỉ cho `'student'`, rồi nâng vai trò giáo viên bằng tay như admin.

**Điểm quan trọng:** phần kiểm tra vai trò trong JavaScript chỉ để quyết định vẽ menu nào. Thứ thật sự chặn là `firestore.rules` chạy trên máy chủ Google — một học sinh sửa mã trong DevTools vẫn không đọc được danh sách lớp, vì chính câu truy vấn bị từ chối.

**Đăng xuất sẽ xoá dữ liệu học trên máy này** (đã đẩy lên mây trước đó). Điều này là cố ý: máy tính dùng chung ở trường không được để người sau thấy kết quả của người trước.

---

## 4. Mô hình dữ liệu Firestore

```
users/{uid}
  ├─ email, displayName, role: 'student' | 'teacher' | 'admin'
  ├─ classCode, className          ← lớp học sinh đang tham gia (null nếu chưa)
  ├─ grade, goal, dailyMinutes, hasDiagnostic
  ├─ xp, level, currentStreak, masteredTopics, totalQuestions…   ← tóm tắt tiến độ
  └─ createdAt, lastLoginAt, lastActiveAt

learners/{uid}/data/{profile | diagnostic | learner | path}
  └─ { json: "<chuỗi JSON>", updatedAt: <ms> }

classes/{MÃ}                        ← document id CHÍNH LÀ mã tham gia, vd K7M2QX
  └─ name, teacherId, teacherName, createdAt

classes/{MÃ}/members/{uid}
  ├─ uid, displayName, email, joinedAt
  ├─ xp, level, masteredTopics, totalQuestions…   ← bản sao tóm tắt tiến độ
  └─ help: { message, status, askedAt, reply }    ← yêu cầu hỗ trợ (nếu có)
```

Ba quyết định thiết kế đáng nói:

- **Mã lớp làm document id.** Học sinh vào lớp bằng `get(classes/K7M2QX)` — một lệnh đọc đúng đường dẫn đã biết — thay vì truy vấn `where('code','==',…)`. Truy vấn kiểu đó buộc phải mở quyền liệt kê `classes`, đồng nghĩa phát tán mọi mã lớp. Bảng chữ cái sinh mã bỏ `0/O` và `1/I/L` vì mã được đọc từ bảng và gõ lại bởi cả lớp.
- **Tiến độ được nhân bản sang `classes/{MÃ}/members/{uid}`.** Firestore không có phép JOIN. Cách còn lại là cho giáo viên quyền đọc mọi document `users`, tức là nhiều quyền hơn hẳn nhu cầu "theo dõi lớp của tôi". Học sinh tự ghi bản sao này mỗi lần đồng bộ (`core/sync.js` → `auth.updateSummary`).
- **Tóm tắt tiến độ được lưu lặp trên `users/{uid}`.** Nhờ vậy trang quản trị chỉ cần **một** truy vấn cho cả lớp, thay vì mở dữ liệu của từng học sinh — vừa nhanh vừa không cần quyền đọc bài làm của ai.
- **Bốn khối dữ liệu lưu dạng chuỗi JSON**, mỗi khối một document. Firestore không nhận `undefined` và cấm mảng lồng mảng; chuỗi JSON tránh cả hai, đồng thời giới hạn 1 MB áp cho từng khối chứ không phải cả cụm.

Xung đột được xử lý theo **last-write-wins theo từng khối**, so bằng mốc thời gian mili-giây. Đây không phải hợp nhất: hai thiết bị sửa cùng một khối thì bên lưu sau thắng. Với một học sinh chuyển giữa điện thoại và máy tính của chính mình, đó là hành vi trung thực và dễ đoán.

---

## 5. Deploy lên Cloudflare Pages

Dự án là site tĩnh nên **không cần build command**. Có hai cách.

### Cách A — Kéo thả (nhanh nhất, không cần GitHub)

1. Vào <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → tab **Pages** → **Upload assets**.
2. Đặt tên project, ví dụ `adaptivemath`.
3. Kéo **toàn bộ thư mục dự án** vào (hoặc nén thành `.zip` rồi thả vào).
4. Bấm **Deploy site**.

Vài chục giây sau bạn có link dạng `https://adaptivemath.pages.dev`.

### Cách B — Kết nối GitHub (tự động deploy mỗi lần push)

```bash
git init
git add .
git commit -m "AdaptiveMath - bản HTML/CSS/JS thuần"
git branch -M main
git remote add origin https://github.com/<tài-khoản>/<tên-repo>.git
git push -u origin main
```

Rồi trong Cloudflare: **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo, và điền:

| Trường | Giá trị |
|---|---|
| Framework preset | **None** |
| Build command | *(để trống)* |
| Build output directory | `/` |
| Root directory | *(để trống)* |

Bấm **Save and Deploy**.

### ⚠️ Mỗi lần sửa file .js hoặc .css: nhớ tăng `?v=`

Trong `index.html`, mọi file cục bộ được nạp kèm chuỗi phiên bản:

```html
<script src="js/core/store.js?v=4"></script>
```

**Sửa code xong thì tăng số đó lên** (Ctrl+H, thay tất cả `?v=4` → `?v=5`) rồi mới deploy.

Vì sao bắt buộc: tên file không kèm mã băm nội dung (dự án không có bước build để tạo mã băm), nên trình duyệt đã lưu bản cũ sẽ tiếp tục dùng bản cũ. Nguy hiểm ở chỗ nó **trộn lẫn phiên bản** — một lần `sync.js` mới đứng cạnh `store.js` cũ đã làm cả app chết với lỗi `AM.store.onChange is not a function`. `index.html` luôn được tải mới (`Cache-Control: no-cache`), nên chỉ cần đổi chuỗi này là mọi file phụ thuộc bị tải lại.

### Ghi chú

- File `_headers` đã cấu hình sẵn cache và vài header bảo mật cơ bản.
- **Không có `_redirects`, và đó là cố ý:** app dùng hash routing (`#/profile`), nên mọi request HTTP đều trỏ tới `/` hoặc một file có thật. Một quy tắc catch-all chỉ che mất lỗi 404 thật — `data/questions.js` mà thiếu sẽ trả về HTML giả dạng JavaScript, rất khó dò.
- Dự án nặng ~3,2 MB / 38 file, thừa sức nằm trong hạn mức miễn phí của Cloudflare Pages (25 MB mỗi file, 20.000 file).
- **Sau khi deploy, nhớ thêm tên miền `.pages.dev` vào Authorized domains** (mục 2.4) — nếu không, đăng nhập sẽ báo lỗi `auth/unauthorized-domain`.

---

## 6. Cấu trúc

```
.
├── index.html               # Trang duy nhất — nạp toàn bộ script theo thứ tự
├── _headers                 # Cấu hình HTTP & bảo mật cho Cloudflare Pages
├── vercel.json              # Cấu hình Vercel Edge & cache headers
├── firestore.rules          # Phân quyền Firestore — DÁN VÀO FIREBASE CONSOLE
├── firebase.json            # Cấu hình Firestore rules & Auth cho Firebase CLI
├── css/app.css              # Toàn bộ giao diện "Bảng xanh & Vở ô li"
│
├── js/
│   ├── app.js               # Điểm khởi chạy & đăng ký các route
│   ├── boot-guard.js        # Bắt lỗi khởi động và hiện màn hình chẩn đoán
│   ├── components.js        # Khung trang, modal, render câu hỏi dùng chung
│   ├── router.js            # Router theo hash + chặn route theo vai trò
│   ├── core/                # 23 module logic thuần (thuật toán, auth, store, sync)
│   │   ├── util.js          # Helper DOM, ngày tháng, RNG có seed
│   │   ├── constants.js     # CAT_CONFIG, mastery band, XP, độ dài buổi học...
│   │   ├── topics.js        # 92 chủ đề Toán THCS lớp 6, 7, 8, 9
│   │   ├── store.js         # localStorage + mốc thời gian cho đồng bộ
│   │   ├── firebaseClient.js# Khởi tạo Firebase, dịch mã lỗi sang tiếng Việt
│   │   ├── auth.js          # Đăng ký / đăng nhập / đăng xuất / vai trò
│   │   ├── sync.js          # Kéo–đẩy 4 khối dữ liệu lên Firestore
│   │   ├── classroom.js     # Lớp học: tạo lớp, mã tham gia, roster, hỗ trợ
│   │   ├── questionBank.js  # Truy cập ngân hàng 1.472 câu hỏi trắc nghiệm
│   │   ├── exerciseBank.js  # Ngân hàng 3.633 bài tập tự luyện + gợi ý cá nhân hóa
│   │   ├── tutorKnowledge.js# Tri thức phương pháp giải Toán THCS cho Gia sư AI
│   │   ├── tutorPrompt.js   # Prompt sư phạm Gia sư AI (dùng chung cho server & client)
│   │   ├── tutor.js         # Client Gia sư AI: gọi /api/tutor, đọc luồng SSE
│   │   ├── latex.js         # Render LaTeX + bảng, qua KaTeX
│   │   ├── irt.js           # IRT 3PL, ước lượng θ bằng MAP
│   │   ├── cat.js           # Bộ chọn câu hỏi thích ứng thang N→H→V→T
│   │   ├── bkt.js           # Bayesian Knowledge Tracing
│   │   ├── srs.js           # Lặp lại ngắt quãng SM-2
│   │   ├── adaptiveEngine.js# Phát hiện trạng thái học tập (Flow / Boredom / Frustration)
│   │   ├── profiling.js     # Dựng và phân tích hồ sơ năng lực
│   │   ├── treeStability.js # Cây tri thức + độ vững
│   │   ├── practiceSelector.js # Bộ chọn câu luyện tập theo hồ sơ năng lực
│   │   ├── pathGenerator.js # Sinh lộ trình học theo ngày/tuần
│   │   └── todayActivities.js # Sinh nhiệm vụ "Hôm nay cần làm"
│   └── views/               # Các màn hình giao diện người dùng
│       ├── home.js          # Trang chủ học sinh
│       ├── landing.js       # Trang giới thiệu / chào mừng
│       ├── login.js         # Đăng nhập / đăng ký
│       ├── trial.js         # Bài học dùng thử Hằng đẳng thức (#/thu)
│       ├── onboarding.js    # Khảo sát ban đầu
│       ├── diagnostic.js    # Bài kiểm tra đầu vào thích ứng (CAT)
│       ├── profile.js       # Hồ sơ năng lực & cây tri thức
│       ├── learningPath.js  # Lộ trình học cá nhân hóa
│       ├── practice.js      # Phiên luyện tập thích ứng
│       ├── theory.js        # Lý thuyết 92 chủ đề
│       ├── exercises.js     # Kho bài tập cá nhân hóa
│       ├── tutor.js         # Gia sư AI tương tác (bàn làm việc mới)
│       ├── aiRoadmap.js     # Kế hoạch học tập do AI lập
│       ├── errors.js        # Sổ tay lỗi sai & phân tích nguyên nhân
│       ├── classroom.js     # Lớp học phía học sinh
│       ├── teacher.js       # Bảng điều khiển giáo viên
│       └── admin.js         # Quản trị hệ thống
│
├── data/                    # Dữ liệu phục vụ trực tiếp cho Web App
│   ├── questions.js         # 1.472 câu hỏi trắc nghiệm CAT + lý thuyết 92 chủ đề
│   ├── exercises.js         # 3.633 bài tập tự luyện THCS 6–9
│   ├── featured-hdt.js      # Dữ liệu bài học trọng điểm Hằng đẳng thức đáng nhớ
│   └── exercises/img/       # Ảnh minh họa bài tập & lời giải (.webp)
│
├── api/                     # Backend Serverless Edge (Vercel)
│   └── tutor.js             # POST /api/tutor (Vercel Edge function)
│
├── functions/api/           # Backend Serverless (Cloudflare Pages Functions)
│   └── tutor.js             # Logic Gia sư AI (Gemini SDK, xác thực token RS256, SSE stream)
│
├── docs/                    # Hồ sơ, tài liệu & báo cáo nghiên cứu KHKT
│   ├── bao-cao-khkt/        # Báo cáo KHKT V3 & Slide thuyết trình v2 (Mới nhất)
│   │   ├── BAO_CAO_KHKT_ADAPTIVEMATH_2026_BAN_SUA_V3.docx
│   │   ├── BAO_CAO_KHKT_ADAPTIVEMATH_2026_BAN_SUA_V3.md
│   │   ├── AdaptiveMath_KHKT_2026_trinh_bay_v2.pptx
│   │   └── img_v3/          # Hình ảnh minh họa cho báo cáo V3
│   ├── ho-so-du-thi-2026-2027/ # Bộ hồ sơ dự thi chính thức theo mẫu Sở (Phụ lục II → IX)
│   ├── minh-chung/          # Nhật ký nghiên cứu & ảnh minh chứng thực tế
│   ├── design/              # Tài liệu thiết kế giao diện
│   └── video/               # Video clip hướng dẫn sử dụng sản phẩm
│
└── tools/                   # Bộ công cụ kiểm thử & dữ liệu
    ├── kiem-thu/            # Kiểm thử tự động E2E, Server, Luồng (Playwright)
    ├── mo-phong/            # Công cụ mô phỏng CAT và kết quả 4 khối lớp
    ├── import-2026/         # Script dựng ngân hàng câu hỏi
    └── import-exercises/    # Script bóc tách bài tập từ PDF gốc
```

---

## 7. Luồng hoạt động

```
Khách vãng lai          Học sinh                          Giáo viên
───────────────         ──────────────────────────────    ────────────────────
#/  landing page  ──→   #/onboarding → #/diagnostic       #/teacher
     ↓ CTA                 8 bước       CAT 30-50 câu       danh sách lớp
#/login                         ↓                             ↓
 chọn vai trò           #/profile → #/learning-path       #/teacher?class=MÃ
 → học sinh                θ+mastery   sprint theo ngày     roster + tiến độ
 → giáo viên                    ↓                           + trả lời hỗ trợ
                        #/practice → #/theory → #/errors
                            BKT + SRS
                        #/classroom  ← vào lớp bằng mã, xin hỗ trợ
```

*Mọi đường dẫn khác khi chưa đăng nhập đều đưa về landing page — đây là hành vi cố ý, xem `resolveView()` trong `js/router.js`.*

0. **Landing page** — khách chưa đăng nhập luôn thấy trang giới thiệu trước, không phải một ô mật khẩu trống trơn. Trang cố tình ngắn: một lời hứa, một ảnh minh hoạ kết quả, ba ý mỗi ý một dòng, ba bước. Nút "Bắt đầu miễn phí" mở thẳng chế độ đăng ký.
1. **Đăng nhập / đăng ký** — bắt buộc để vào phần học. Khi đăng ký phải chọn vai trò **học sinh** hay **giáo viên**; vai trò không đổi được sau đó. Sau khi đăng nhập, hệ thống kéo dữ liệu của tài khoản về máy rồi mới dựng giao diện.
1. **Onboarding** — thu thập lớp, mục tiêu, thời gian/ngày, hạn thi, tự đánh giá, chủ đề yếu.
2. **Kiểm tra đầu vào (CAT) theo từng chương** — học sinh chọn chương (gợi ý: chương đã học trên lớp). Trong chương, mỗi chủ đề leo thang Nhận biết → Thông hiểu → Vận dụng; đúng thì lên mức, sai thì có một câu xác minh rồi mới kết luận. Tối đa 6 câu/chủ đề, 25 phút/chương. θ ước lượng bằng IRT 3PL trên toàn bộ câu đã làm ở mọi chương. Kết quả cộng dồn vào một phiên duy nhất; kiểm tra lại một chương thì thay kết quả cũ của chương đó. Xong chương nào, hồ sơ năng lực, lộ trình và gợi ý bài tập cập nhật ngay (`revision` của phiên tăng → lộ trình tự dựng lại). Mở thẳng một chương: `#/diagnostic?chapter=3`.
3. **Hồ sơ năng lực** — mastery mỗi chủ đề = `độ tin cậy × quan sát + (1 − độ tin cậy) × kỳ vọng(θ)`, kèm radar theo chương, danh sách điểm yếu, tín hiệu lỗi và cây tri thức 4 giai đoạn.
4. **Lộ trình học** — ưu tiên theo `0.30·gap + 0.20·độ gấp + 0.20·độ mong manh + 0.15·mật độ đề thi + 0.15·tự đánh dấu yếu`, đóng gói vào từng ngày vừa quỹ thời gian, chèn ngày ôn tập.
5. **Luyện tập** — 3 pha (khởi động → luyện → kiểm tra nhanh). Kết thúc: cập nhật BKT, lên lịch SRS, ghi sổ tay lỗi, cộng XP/streak/huy hiệu.
5b. **Bài tập cá nhân hóa** — mỗi ngày chọn 3 chủ đề có `(mục tiêu − mastery) + 0.15·[tự đánh dấu yếu] + 0.1·[còn bài chưa làm được]` lớn nhất; trong chủ đề chọn bài đúng mức theo mastery (< 0,3 → N/H · < 0,55 → H/V · < 0,8 → V/T · còn lại T), ưu tiên làm lại bài "chưa làm được". Mỗi kết quả ghi vào `LearnerState.exercises`, cập nhật BKT của chủ đề và cộng XP. Duyệt toàn bộ kho theo chương, lọc theo mức / loại / trạng thái.
6. **Sổ tay lỗi sai** — tự đánh dấu đã sửa khi bạn làm đúng lại chính câu đó.
7. **Lớp học** — học sinh nhập mã lớp, hệ thống hỏi xác nhận ("Lớp 8A1 — cô Hoa. Vào lớp?") rồi mới cho vào; mã gõ nhầm mà tình cờ tồn tại sẽ không lặng lẽ đẩy học sinh vào lớp lạ. Sau khi vào lớp, học sinh gửi được yêu cầu hỗ trợ và thấy câu trả lời của giáo viên ngay tại đây. Mỗi học sinh chỉ ở một lớp: vào lớp mới thì tự rời lớp cũ.
8. **Giáo viên** — tạo lớp (hệ thống sinh mã 6 ký tự), xem roster kèm tiến độ, sắp xếp theo "cần hỗ trợ trước" để tìm nhanh em đang vướng, trả lời yêu cầu hỗ trợ, xoá học sinh khỏi lớp hoặc xoá cả lớp. Tài khoản giáo viên không có phần học riêng — mọi route học tập đều đưa về danh sách lớp.

---

## 8. Dữ liệu trên máy

localStorage vẫn là nguồn đọc/ghi chính khi đang học (nhanh, chạy được cả lúc mạng chập chờn); Firestore là bản sao đồng bộ.

| Key | Nội dung |
|---|---|
| `kntt.profile.v1` | Hồ sơ onboarding |
| `kntt.diagnostic.v1` | Phiên kiểm tra đầu vào |
| `kntt.learner.v1` | BKT, SRS, lỗi sai, XP, huy hiệu, lịch sử |
| `kntt.learningPath.v1` | Lộ trình đã sinh |
| `kntt.sync.v1` | Mốc thời gian sửa đổi từng khối |
| `kntt.sync.owner` | Tài khoản đang sở hữu dữ liệu trên máy này |

Mỗi lần lưu, khối tương ứng được đẩy lên Firestore sau ~1,5 giây (gộp nhiều thay đổi liên tiếp thành một lần ghi).

Nút 🔄 ở góc trên trang chính xoá sạch mọi thứ — **cả trên máy lẫn trên tài khoản**. Nút đăng xuất chỉ xoá bản sao trên máy.

---

## 9. Hạn chế đã biết

Ghi lại trung thực để tiện đưa vào báo cáo đề án:

- **Chưa có test tự động.** Toàn bộ logic là hàm thuần nên rất dễ viết unit test — đây là việc đáng làm tiếp theo.
- **Ngân hàng câu hỏi THCS hiện được cân theo chủ đề.** Mỗi chủ đề có 16 câu ở bốn mức độ; cần tiếp tục kiểm định thực nghiệm để hiệu chỉnh độ khó IRT theo dữ liệu học sinh thật.
- **Chưa có câu mức T (Vận dụng cao).** Phân bố hiện tại: N=239, H=440, V=188. Do đó thang N→H→V→T không bao giờ chạm bậc T, và θ của học sinh giỏi bị chặn trần vì `b` tối đa chỉ 0,5.
- **Hình vẽ TikZ** hiển thị dạng nhãn "📐 Hình vẽ (xem trong SGK)" — bản gốc cần một bước dựng SVG offline bằng LaTeX, không có trong bản này.
- **Độ tin cậy của mastery.** `confidence = min(1, số lượt / 5)`, mà một phiên chẩn đoán tối đa 50 câu chia cho 15–20 chủ đề, nên phần lớn điểm mastery vẫn dựa vào kỳ vọng từ θ nhiều hơn là quan sát trực tiếp.
- **Không mở được bằng `file://` nữa.** Firebase Auth từ chối origin `null`, nên phải chạy qua `localhost` hoặc bản đã deploy.
- **Đồng bộ là last-write-wins, không hợp nhất.** Mở app trên hai thiết bị cùng lúc thì bên lưu sau ghi đè bên kia trong cùng một khối dữ liệu.
- **Admin và giáo viên chưa xem được chi tiết bài làm** của từng học sinh, chỉ xem tóm tắt tiến độ. Muốn mở thêm thì sửa quy tắc `learners/{uid}/data/{key}` trong `firestore.rules` thành `isSelf(uid) || isAdmin()` rồi viết trang chi tiết.
- **Vai trò giáo viên là tự khai.** Ai cũng đăng ký làm giáo viên được. Phạm vi vẫn bị giới hạn chặt (chỉ thấy học sinh đã nhập mã lớp của mình), nhưng nếu trường cần siết, xem cách xử lý ở cuối mục 3.
- **Mã lớp không hết hạn và không giới hạn số lần dùng.** Mã bị chia sẻ ra ngoài thì người lạ vào lớp được; giáo viên phải tự xoá em đó khỏi roster. Muốn chặt hơn thì thêm cờ `open: false` vào document lớp và kiểm trong rule `create` của `members`.
- **Ngân hàng câu hỏi từng bị hỏng mã ký tự** (UTF-8 bị đọc nhầm thành cp1252 khi dựng corpus, làm "mệnh đề" hiện thành "má»‡nh Ä‘á»"). Đã sửa toàn bộ 4 830 chuỗi bằng `tools/` và kiểm lại 0 lỗi trên cả 891 câu. Bản gốc còn ở `data/questions.js.mojibake-backup` (đã bị `.gitignore` bỏ qua) — xoá được khi đã yên tâm.
- **Chưa có xác minh email**, nên ai cũng đăng ký được bằng địa chỉ bất kỳ. Bật *Email verification* trong Firebase Console nếu muốn siết lại.

---

## 10. Kiểm thử tự động

Hệ thống được kiểm thử tự động toàn diện qua Playwright (trong thư mục `tools/kiem-thu/`) với **Firebase giả lập** (port đầy đủ `firestore.rules`) và **Gemini giả lập** — không cần mạng, không tốn lượt gọi API thật:

```bash
cd tools/kiem-thu
npm install
npx playwright install chromium
npm test
```

| Lệnh | Nội dung kiểm tra |
|---|---|
| `npm run may-chu` | Máy chủ Gia sư AI (bundle như Vercel Edge / Cloudflare Pages): chuyển model khi lỗi, xác thực token Firebase RS256, kiểm tra cấu hình |
| `npm run e2e` | Đăng ký GV/HS, tạo lớp, tham gia lớp, hỏi bài, trả lời, đồng bộ tiến độ, Gia sư AI, sổ tay lỗi sai, đăng xuất |
| `npm run luong` | Luồng học sinh thực tế: khảo sát ban đầu → CAT đầu vào → lộ trình học → luyện tập thích ứng; giáo viên giám sát thời gian thực |

Nếu gặp lỗi khi chạy trên trình duyệt thật, ứng dụng sẽ tự hiện màn hình chẩn đoán liệt kê lỗi và tình trạng từng thành phần (`js/boot-guard.js`). Chi tiết hơn có thể mở **DevTools → Console** (F12); mã là JavaScript thuần không qua biên dịch nên thông báo lỗi trỏ thẳng vào file và dòng thật.

Vài lỗi hay gặp lúc mới thiết lập:

| Thông báo | Nguyên nhân |
|---|---|
| `auth/operation-not-allowed` | Chưa bật Email/Password (mục 2.1) |
| `auth/unauthorized-domain` | Chưa thêm tên miền vào Authorized domains (mục 2.4) |
| `permission-denied` | Chưa nạp `firestore.rules` (mục 2.3) |
| `failed-precondition` | Chưa tạo Firestore database (mục 2.2) |


---

## 11. Gia sư AI (Gemini) — cài đặt

```
functions/api/tutor.js   # Cloudflare Pages Function: giữ khóa Gemini, xác thực Firebase, dựng prompt, stream câu trả lời
js/core/tutorPrompt.js   # Prompt sư phạm DÙNG CHUNG (máy chủ import, trình duyệt dùng ở chế độ thử)
js/core/tutor.js         # Client: gọi /api/tutor, đọc luồng SSE
js/views/tutor.js        # Khung hội thoại + trang #/tutor
```

**Vì sao có máy chủ:** khóa API đặt trong JavaScript thì ai mở F12 cũng lấy được. Function
chạy cùng tên miền với web (không cần CORS), kiểm tra Firebase ID token (chữ ký RS256, `aud`,
`iss`, hạn dùng) nên chỉ học sinh đã đăng nhập mới gọi được, giới hạn 20 câu hỏi / 5 phút / tài
khoản, ảnh đề bài được lấy từ chính kho ảnh của site (client chỉ gửi tên file).

**Cài đặt trên Cloudflare Pages:**

1. Lấy khóa tại <https://aistudio.google.com/apikey>.
2. Pages → project → **Settings → Variables and Secrets** → thêm **Secret** `GEMINI_API_KEY`.
   Tuỳ chọn: `GEMINI_MODEL` (mặc định thử lần lượt `gemini-3.8-flash` → `gemini-3.6-flash` →
   `gemini-3.5-flash-lite` → `gemini-2.5-flash`), `FIREBASE_PROJECT_ID` (mặc định `adaptivemath-tmhp-2026`).
3. Deploy bằng **Git** (cách B ở mục 5) hoặc `npx wrangler pages deploy .` — thư mục `functions/`
   phải được Cloudflare biên dịch; cách kéo-thả thư mục trên dashboard có thể không chạy Functions.
4. Kiểm tra: đăng nhập → Bài tập cá nhân hóa → "Hỏi gia sư AI" → "Gợi ý bước đầu".

**Chạy thử trên máy** (`python -m http.server` không có `/api/tutor`): khung gia sư sẽ hiện ô
"Chế độ thử" — dán khóa Gemini, khóa chỉ lưu trong `localStorage` của máy đó và trình duyệt gọi
thẳng Gemini với cùng prompt. Chỉ dùng để thử, không dùng khi deploy.

**Lộ trình AI:** `POST /api/tutor` với `{task:"roadmap", summary}` → Gemini `generateContent` có
`responseSchema` (JSON), rồi `sanitizeRoadmap()` loại topicId lạ, kẹp số phút theo quỹ thời gian mỗi ngày.
Chỉ gửi số liệu học tập (mastery, bài đã làm, số lỗi), không gửi tên/email. Lưu ở `LearnerState.aiRoadmap`.

**Đã kiểm thử** (Gemini giả lập, vì môi trường kiểm thử không ra được Internet): 21 phép kiểm cho
Function (token sai/hết hạn/giả chữ ký → 401, luồng bị cắt giữa chừng vẫn ghép đúng, chuyển model
khi 404, 429, bộ lọc an toàn, ảnh không hợp lệ bị loại, giới hạn tần suất) và 11 phép trong
`server-test.mjs` (escape HTML câu trả lời, LaTeX, prompt chế độ gợi ý không lộ đáp số, đọc luồng).
Chưa gọi Gemini thật — cần thử lại sau khi đặt khóa.

### Tiết kiệm API của Gia sư AI

Toàn bộ "skill" của gia sư nằm ở `js/core/tutorPrompt.js` (máy chủ import, học sinh không sửa được).
Ước lượng token đầu vào mỗi lượt hỏi (đếm bằng bộ tách token o200k làm thước đo tương đối, ảnh theo bảng
token của Gemini 3: mặc định 1120, MEDIUM 560, LOW 280):

| Lượt hỏi | Trước | Sau | Giảm |
|---|---|---|---|
| Gợi ý bước đầu (lượt đầu) | ~2 830 | ~850 | ~70% |
| Vì sao đúng / sai | ~2 950 | ~1 515 | ~49% |
| Lời giải chi tiết | ~2 835 | ~1 440 | ~49% |
| Hỏi tiếp (lượt 3) | ~2 990 | ~770 | ~74% |
| Lập lộ trình (23 chủ đề) | ~2 040 | ~1 110 | ~45% |

Cách làm:
1. **Chỉ dẫn viết bằng tiếng Anh dạng skill gạch đầu dòng**, chỉ yêu cầu *trả lời* tiếng Việt — chữ Việt có dấu tốn token gấp nhiều lần.
2. **Mức suy nghĩ theo chế độ** (`thinkingLevel`): gợi ý / hỏi đáp / vì sao sai / lộ trình = `low`, kiểm tra bài / lời giải = `medium`. Gemini 3 mặc định `high`, mà token suy nghĩ tính như token đầu ra. Gemini 2.5: `thinkingBudget` 0 / 1024. Ép mức cho mọi yêu cầu bằng biến `TUTOR_THINKING`.
3. **Ảnh**: `mediaResolution` MEDIUM ở lượt đầu, LOW ở lượt hỏi tiếp. Ảnh hướng dẫn giải chỉ gửi ở chế độ cần đối chiếu (vì sao sai / kiểm tra / lời giải).
4. **Thứ tự**: ảnh + chỉ dẫn hệ thống (giống nhau giữa học sinh) đặt trước, phần riêng đặt sau → hưởng *implicit cache* của Gemini.
5. **Lịch sử**: 6 lượt gần nhất, câu trả lời cũ cắt còn 400 ký tự.
6. **Giới hạn độ dài** theo chế độ (80–300 từ) + `maxOutputTokens` tương ứng.
7. **Cache câu hỏi "một chạm"** (bấm chế độ, không gõ thêm, không gửi ảnh riêng): cùng bài + cùng chế độ + cùng đáp án đã chọn + cùng dải trình độ → trả lại kết quả cũ, **không gọi Gemini**. Hai tầng: trên máy học sinh (localStorage, 40 câu) và trên máy chủ dùng chung cho cả lớp (KV binding `TUTOR_CACHE` nếu có — tạo KV namespace rồi gắn vào Pages → Settings → Bindings; không có KV thì dùng Cache API của Cloudflare). Câu trả lời bị cắt dở (MAX_TOKENS) hoặc bị bộ lọc chặn không được lưu. Đổi prompt thì tăng `PROMPT_VERSION` để bỏ cache cũ.
8. **Lộ trình**: bảng chủ đề dạng cột rút gọn; nếu hồ sơ chưa đổi và lộ trình còn mới (< 7 ngày) thì hỏi lại trước khi lập lại.
9. Mỗi câu trả lời hiện số token đã dùng (hoặc "trả lời từ bộ nhớ đệm") để theo dõi chi phí.
10. Model từ chối tham số tuỳ chọn (400) → tự gửi lại bản tối giản một lần thay vì báo lỗi.

**Lưu ý `_headers`:** rule cũ `/data/*` gán `Content-Type: text/javascript` cho mọi file trong
`data/`, kể cả ảnh bài tập. Đã tách thành rule riêng cho từng file `.js` và `image/webp` cho ảnh.
