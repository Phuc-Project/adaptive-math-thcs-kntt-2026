# Nạp bộ đề giữa kì / cuối kì lớp 6–9 và đề thi thử vào 10 (2026-11-14)

Sinh các đề `d<khối>-<loại>-<n>` trong `data/exercises.js` + ảnh câu đề ở
`data/exercises/img/de/<mã đề>/`. Nguồn: các file Word/PDF trong `data/exercises/`
(`Cuối kì 1 từ 6-9/`, `Cuối kì 2 từ 6-9/`, `TUYỂN TẬP ĐỀ THI ÔN VÀO 10 (25-26).docx`).

| Loại | Ý nghĩa | Số đề |
|------|---------|-------|
| GK1 | giữa học kì I | lớp 7: 8 · lớp 9: 1 |
| CK1 | cuối học kì I | lớp 6: 9 · lớp 7: 8 · lớp 8: 3 · lớp 9: 2 |
| GK2 | giữa học kì II | lớp 8: 2 |
| CK2 | cuối học kì II | lớp 6: 2 · lớp 7: 1 · lớp 8: 4 · lớp 9: 6 |
| V10 | đề thi thử tuyển sinh vào 10 (120 phút) | lớp 9: 19 |

Tổng 65 đề, 854 câu; 403 câu trắc nghiệm có đáp án (web chấm ngay), 39 đề có ảnh
"Đáp án – hướng dẫn chấm" mở ở cuối đề.

## Quy trình (Linux; cần LibreOffice **kèm libreoffice-math**, Python 3 + PyMuPDF + Pillow + numpy)

```bash
# 1. Đổi tên file nguồn thành f00…f39 theo manifest.json rồi chuyển sang PDF
soffice --headless --convert-to pdf --outdir pdf in/*.doc in/*.docx
# 2. Cắt câu theo specs.py → out/new.json + out/img/de/...
python3 build.py
# 3. Vá vào ngân hàng (chạy lại nhiều lần cho cùng kết quả) và chép ảnh
python3 merge.py <repo> out/new.json
cp -r out/img/de <repo>/data/exercises/img/
```

Thiếu gói `libreoffice-math` thì mọi công thức dạng Equation của Word (OMML) bị **mất trắng**
khi chuyển PDF — kiểm tra `ls /usr/lib/libreoffice/program | grep libsm`.

## Cách làm

- `specs.py`: vùng đề và vùng đáp án của từng file (trang, toạ độ y) — soát tay vì mỗi file một
  kiểu (ma trận + đặc tả ở đầu, nhiều đề trong một file, đáp án xen giữa…).
- `build.py`: trong vùng đề, mốc "Câu N"/"Bài N" sát lề trái chia câu; tiêu đề "Phần I. Trắc
  nghiệm / II. Tự luận" cho biết phần. Mỗi câu cắt thành ảnh (144 dpi, có thể nhiều ảnh nếu sang
  trang); đỉnh câu được nâng lên theo công thức cao trong dòng. Chữ **đỏ** (đáp án tô màu sẵn,
  nhãn mức độ) được chuyển thành đen để không lộ đáp án, và dùng làm đáp án nếu không có bảng.
- Đáp án trắc nghiệm: đọc bảng "Câu 1 2 3 … / Đáp án A B C …" trong vùng hướng dẫn chấm.
- Mức N/H/V/T: theo nhãn trong đề ([NB], (Thông hiểu), VD, VDC) nếu có; không thì theo vị trí câu.
- Chủ đề: từ khóa theo khối trong `topicrules.py` (kì I chỉ dùng chủ đề tập 1) — là ước lượng.
- Bỏ đề trùng giữa các file (giống ≥ 97%).

## Đã bỏ / hạn chế

- `TOÁN 7/4 ĐỀ CUỐI KÌ 1.docx`: công thức trong file gốc bị vỡ (chép từ web) — sửa file rồi
  thêm lại vào `specs.py`.
- `TOÁN 9/ĐỀ TOAN 9.doc` trùng `ĐỀ CUỐI HỌC KÌ I TOÁN 9 - Tuyên LÀM 24.25.docx`; `TOAN 6.doc`,
  `TOAN 7.doc` (kì II) trùng bản kia; đề 11 cuối tuyển tập vào 10 trùng đề 4.
- Hình vẽ đặt trôi bên phải đôi khi bị cắt sang câu bên cạnh; câu có nhãn "Câu N" bị xuống dòng
  có thể gộp vào câu trước.

## Không hiện tên trường (2026-11-17)

- `school.py`: trên mỗi trang PDF tìm dòng tiêu đề đơn vị (PHÒNG GD&ĐT…, UBND…, SỞ GD…, TRƯỜNG…),
  dòng đầu trang lặp "Trường THCS X … Đề …", và tên riêng sau "THCS" trong nội dung câu hỏi;
  `build.py` che trắng các vùng đó trước khi cắt ảnh câu đề và ảnh đáp án.
- `merge.py`: trường `from` của đề chỉ giữ năm học ("Năm học 2025–2026"); chữ trích `q` bỏ tên trường.
- `specs.py`: f13 Đề số 1 kết thúc ở (3, 612) để câu cuối không dính tiêu đề đề sau.
