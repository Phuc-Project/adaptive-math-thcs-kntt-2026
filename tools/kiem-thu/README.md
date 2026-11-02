# Kiểm thử tự động AdaptiveMath

Chạy toàn bộ app trong trình duyệt ẩn (Playwright) với **Firebase giả lập** (có port đủ `firestore.rules`)
và **Gemini giả lập** — không cần mạng, không tốn lượt gọi API, không đụng dữ liệu thật.

```bash
cd tools/kiem-thu
npm install
npx playwright install chromium
npm test
```

| Lệnh | Kiểm tra |
|---|---|
| `npm run may-chu` | Máy chủ Gia sư AI (bundle như Vercel Edge): chuyển model khi lỗi, khóa sai, bị cắt, phản hồi chậm, lộ trình AI, xác thực token Firebase RS256, GET kiểm tra cấu hình |
| `npm run e2e` | Giáo viên đăng ký → tạo lớp; học sinh đăng ký → vào lớp → hỏi bài; GV trả lời; đồng bộ tiến độ; đăng nhập máy khác; mở mọi trang; Gia sư AI (trang riêng, thẻ bài tập, hỏi tiếp, lộ trình); xoá HS khỏi lớp; đăng xuất |
| `npm run luong` | Học sinh làm onboarding + kiểm tra đầu vào qua giao diện thật; GV thấy câu hỏi/tiến độ **realtime**; GV dùng Gia sư AI |
| `npm run buoi-hoc` | Số câu mỗi buổi (5 / 10 / 15 / tự động theo thời gian): onboarding, lộ trình, đổi số câu ngay trong buổi luyện |
| `npm run hoc-thu` | Bài học dùng thử **Hằng đẳng thức đáng nhớ** (`#/thu`): khách đăng ký từ trang giới thiệu → vào thẳng bài; lý thuyết, 10 câu dễ → khó, bài tập trong sách, Gia sư AI có câu gợi ý; học sinh lớp khác; giáo viên; giao diện điện thoại. Ảnh chụp lưu ở `anh-chup/dung-thu/` |

`db.js` chứa bản port của `firestore.rules` — sửa rules thì sửa cả ở đây.

## Nội dung bài học dùng thử

`data/featured-hdt.js` được sinh bởi `gen_hdt.py` (cần `pip install sympy`): mọi đáp án trắc nghiệm,
ví dụ và lời giải đều được sympy kiểm lại trước khi ghi file. Sửa nội dung thì sửa trong `gen_hdt.py` rồi chạy:

```bash
python3 tools/kiem-thu/gen_hdt.py data/featured-hdt.js
```
