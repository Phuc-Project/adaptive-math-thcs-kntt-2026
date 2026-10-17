# Hướng dẫn chụp ảnh minh họa cho chương 4 (Ví dụ 4.1 → 4.9)

Chạy trang web (`python -m http.server 8080` → mở `http://localhost:8080`),
**đăng nhập bằng tài khoản học sinh**, rồi bấm mục **"Nhiệm vụ số"** ở thanh
bên trái (hoặc vào thẳng `#/digital-tasks`).

> Mẹo chung: chụp bằng cửa sổ trình duyệt rộng ~1280px, phóng to 100%.
> Bài làm được lưu trên máy — muốn chụp lại "trạng thái chưa làm" thì bấm
> F12 → Console → gõ `localStorage.removeItem('am_digital_tasks_v1')` rồi tải lại.

## Ảnh nên chụp cho MỖI ví dụ (4–6 ảnh/ví dụ)

| # | Nội dung ảnh | Thao tác |
|---|---|---|
| 1 | Nhiệm vụ hiển thị trên hệ thống (đề bài + lời giải số cần kiểm chứng) | Mở ví dụ, chụp thẻ "Nhiệm vụ trên hệ thống" |
| 2 | Ba mức hỗ trợ thích ứng | Bấm lần lượt "Mức hỗ trợ 1/2/3", chụp mỗi mức (hoặc 1 ảnh mức đang chọn) |
| 3 | Học sinh đang trả lời | Chọn vài đáp án Đúng/Sai nhưng CHƯA bấm nộp, chụp |
| 4 | Hệ thống chấm và phản hồi | Bấm "Nộp câu trả lời", chụp banner điểm + mở "Xem lời giải" |
| 5 | Phiếu học tập học sinh điền | Gõ câu trả lời vào 2–3 ô textarea, chụp |
| 6 | Đối chiếu sản phẩm minh họa | Bấm "Đối chiếu với sản phẩm minh họa", chụp phiếu có phần minh họa |

## Ảnh riêng của từng ví dụ

- **VD 4.1** (`#/digital-tasks?id=vd41`) — chụp thêm bảng **"Khai thác dữ liệu,
  phản hồi và điều chỉnh của giáo viên"** ở cuối trang (ứng với Bước 4 của biện pháp 1).
- **VD 4.2** (`vd42`) — chụp câu trắc nghiệm chọn lời giải A/B sau khi nộp
  (minh họa hoạt động đối chiếu hai lời giải), và prompt gợi ý AI trong đề bài.
- **VD 4.3** (`vd43`) — chụp **bảng giá trị của dãy số** (Bảng 4.11) hiển thị trong đề bài.
- **VD 4.4** (`vd44`) — chụp phiếu tự theo dõi đã điền + sản phẩm minh họa (Bảng 4.15);
  nếu trả lời SAI câu hỏi (cố tình chọn "y′=0 chỉ khi x=1" là Đúng) sẽ có ảnh
  "hệ thống ghi nhận lỗi" rất hợp với nội dung tự điều chỉnh.
- **VD 4.5** (`vd45`) — tương tự 4.4 với Bảng 4.16 (lỗi tích phân âm −4/3).
- **VD 4.6** (`vd46`) — chụp thêm bảng **"Sản phẩm/minh chứng nhóm phải nộp"**
  (Bảng 4.20) và bảng tiếp nhận phản hồi chéo (Bảng 4.22).
- **VD 4.7** (`vd47`) — chụp **bảng dữ liệu 200 hồ sơ** (Bảng 4.23) trong đề bài
  + câu hỏi P(B|A), P(A|B) sau khi nộp.
- **VD 4.8** (`vd48`) — chụp phiếu "Cấu trúc sản phẩm số" (Bảng 4.28) có phần minh họa.
- **VD 4.9** (`vd49`) — chụp bảng **"Yêu cầu tối thiểu và lỗi cần tránh"** (Bảng 4.29).

## Ảnh bổ trợ cho các biện pháp (ngoài trang Nhiệm vụ số)

- Trang **danh sách 9 nhiệm vụ** nhóm theo 5 biện pháp (`#/digital-tasks`) — 1 ảnh tổng quan.
- Sau khi làm xong một ví dụ, bấm **"Luyện tập củng cố chủ đề này"** và chụp phiên
  luyện tập — minh họa việc "bổ sung nhiệm vụ củng cố" trong bước phản hồi.
- **Hồ sơ năng lực** (`#/profile`) và **Lộ trình học** (`#/learning-path`) — minh họa
  môi trường học tập thích ứng dùng dữ liệu để điều chỉnh (biện pháp 1, 3).
- **Sổ tay lỗi sai** (`#/errors`) — minh họa "nhật ký lỗi" phục vụ tự theo dõi.
