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

`db.js` chứa bản port của `firestore.rules` — sửa rules thì sửa cả ở đây.
