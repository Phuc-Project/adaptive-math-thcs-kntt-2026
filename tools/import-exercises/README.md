# Bộ tách bài tập tự luyện từ PDF (2026-10-17)

Sinh `data/exercises.js` + ảnh đề `data/exercises/img/<file>/<số>.webp` từ 8 tài liệu
PDF trong `data/pdf/` (lớp 6, 7, 8, 9 — mỗi khối hai tập/học kì).

| Mã  | Tài liệu                                   | Khối |
|-----|--------------------------------------------|------|
| g6a | Cơ bản toán 6 kì 1.pdf                     | 6    |
| g6b | Cơ bản toán lớp 6 tập 2.pdf                | 6    |
| g7a | Cơ bản toán 7 kì 1.pdf                     | 7    |
| g7b | TOÁN 7 CƠ BẢN TAP 2 - CT MOI.pdf           | 7    |
| g8a | toán 8 kì 1.pdf                            | 8    |
| g8b | Toán cơ bản lớp 8 tập 2 cần dùng.pdf (có đáp án + hướng dẫn giải) | 8 |
| g9a | TOÁN 9 KÌ 1.pdf                            | 9    |
| g9b | CƠ BẢN TOÁN 9 KÌ 2.pdf                     | 9    |

## Vì sao cắt ảnh thay vì chép chữ

Công thức trong các file Word→PDF này (phân số, căn, mũ, kí hiệu ∈ ≠) bị vỡ khi trích
chữ (`pdftotext` tách tử/mẫu ra hai dòng, mất kí hiệu). Mỗi bài tập vì vậy được cắt
thành ảnh đúng vùng đề trong trang gốc — giữ nguyên công thức, bảng và hình vẽ. Chữ trích
được vẫn được giữ (trường `q`) để làm văn bản thay thế và để phân loại.

## Quy trình (Linux, cần poppler-utils, Python 3 + Pillow + numpy)

```bash
WORK=~/work                                   # các script đọc/ghi trong ~/work
cp "data/pdf/<tên>.pdf" $WORK/g6a.pdf ...         # đặt tên theo bảng trên
pdftotext -bbox-layout $WORK/g6a.pdf $WORK/bbox/g6a.html
python3 rows.py $WORK/bbox/g6a.html $WORK/rows/g6a.json   # gom từ → dòng hiển thị
pdftoppm -r 144 -png $WORK/g6a.pdf $WORK/pages/g6a/p      # dựng trang 144 dpi
python3 template.py g6a ...    # "trang nền" trung vị theo trang chẵn/lẻ → xoá watermark, viền, header/footer
python3 extract.py             # nhận diện Chương / Bài / mục / "Bài N:" "Câu N:" → extract.json
python3 crop.py <thư mục img> 0 g6a,g6b,...   # cắt ảnh .webp + manifest
python3 build_js.py            # ghi data/exercises.js
```

## Những gì `extract.py` làm

- Nhận diện tiêu đề chương, bài (kể cả kiểu "BÀI 1" + tên bài ở dòng dưới), các mục
  `A. LÝ THUYẾT` / `B. BÀI TẬP MẪU` / `I. Trắc nghiệm` / `II. Tự luận` / `Dạng N`,
  `ÔN TẬP CHƯƠNG`, `ĐỀ KIỂM TRA`.
- Mỗi bài tập kéo dài từ dòng "Bài N:" / "Câu N:" tới mốc kế tiếp, có thể sang trang.
  Tử số của phân số nằm cao hơn dòng "Bài N:" được tính vào bài (hàm `line_top`).
- Hai bài đặt cạnh nhau trên một dòng ("Bài 7 … Bài 8 …") gộp thành "Bài 7–8".
- Tài liệu g8b: phần "Hướng dẫn giải" ở cuối được ghép lại vào đúng bài (theo bài học +
  số bài), và bảng "Đáp án D B C …" thành đáp án câu trắc nghiệm → web chấm ngay.
- Gán chủ đề: tên bài học → topicId theo luật trong `mapping.py` (mỗi khối một bảng).
- Mức gợi ý N/H/V/T: trắc nghiệm nửa đầu N, nửa sau H; bài mẫu H; tự luận theo vị trí trong
  bài học (đầu H → giữa V → cuối T), nâng lên T nếu có "chứng minh", "lớn nhất/nhỏ nhất",
  "tham số"…; đây là mức ước lượng, nên kiểm định lại bằng dữ liệu học sinh thật.

## Hạn chế

- Hình vẽ đặt lệch sang cạnh bài trước/sau trong tài liệu gốc đôi khi bị cắt sang bài bên cạnh.
- Bài tập có câu "Xem Hình 2" mà hình nằm ở phần lý thuyết sẽ không kèm hình.
- Chỉ g8b có đáp án/hướng dẫn giải; các khối khác học sinh tự đánh giá "Làm được / Chưa làm được".

## Đề kiểm tra: tách từng câu (`split_exams.py`, 2026-10-18)

`build_js.py` để mỗi đề kiểm tra là một ảnh nguyên đề. `split_exams.py` chạy **sau** nó
(Windows hoặc Linux, chỉ cần PyMuPDF + Pillow + numpy, đọc thẳng PDF trong `data/pdf/`):

```bash
python tools/import-exercises/split_exams.py
```

- Tách 11 đề trong g6a: 6 đề giữa HK I (tr. 75–83) và 5 đề cuối HK I (tr. 109–119), danh sách
  trang ở `EXAMS`. Mỗi câu trắc nghiệm / đúng-sai / tự luận thành một bài riêng, ảnh ở
  `data/exercises/img/g6a/de/`, kèm `ex` (mã đề), `p` (phần), `pt` (điểm) và chủ đề `t`
  (luật từ khóa `TOPIC_RULES` + `TOPIC_OVERRIDES` đã soát tay). Ngân hàng có thêm mảng `exams`.
- Nền trang (watermark tên GV + SĐT) được thay bằng nền trắng trước khi render.
- Bảng Đúng/Sai có sẵn dấu X ở ô đáp án → đọc thành `key` ("a) Sai · b) Đúng …") rồi xóa X
  khỏi ảnh đề. Các đề còn lại không có đáp án trong tài liệu.
- Xử lý lỗi dàn trang của tài liệu gốc: nhãn "Câu N" bị dòng khác in đè, mẫu số thòng xuống
  dòng câu sau, hình vẽ bên phải vắt qua ranh giới hai câu (câu nhắc "như hình vẽ" nhận hình).
- Chạy lại nhiều lần cho cùng kết quả; các bài khác trong `exercises.js` giữ nguyên.
