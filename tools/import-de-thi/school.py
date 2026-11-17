"""Tìm vùng chữ có tên trường / phòng / sở GD trên một trang PDF để che trắng khi cắt ảnh đề."""
import re

HEAD = re.compile(r'^\s*(PHÒNG\s*(GD|GIÁO|GDĐT)|UBND|ỦY\s*BAN|UỶ\s*BAN|SỞ\s*(GD|GIÁO)|TRƯỜNG\b|Trường\s+(THCS|TH\b|TH\s*[-–&]|PT|THPT|Tiểu|Trung))')
INLINE = re.compile(r'(Trường|TRƯỜNG|trường)\s+(THCS|THPT|PTDTNT|TH\s*[-–&]\s*THCS|Tiểu học|Trung học cơ sở)\s*$')
KIND = {'THCS', 'THPT', 'PTDTNT', 'TH-THCS', 'TH–THCS', 'PTDT', 'TH&THCS'}
STOP = {'Biết', 'Hỏi', 'Tính', 'Có', 'Trong', 'Khi', 'Nếu', 'Mỗi', 'Một', 'Các', 'Số', 'Năm', 'Đề', 'Lớp', 'Hãy', 'Cho'}


def _cap(w):
    w = w.strip('.,:;()"“”')
    return bool(w) and (w[0].isupper() or w[0] == 'Đ') and w not in STOP and not re.match(r'^\d', w)


def boxes(page):
    words = page.get_text('words')
    lines = {}
    for w in words:
        lines.setdefault((w[5], w[6]), []).append(w)
    out = []
    for key, ws in lines.items():
        ws.sort(key=lambda w: w[0])
        text = ' '.join(w[4] for w in ws)
        # Dòng tiêu đề đơn vị (PHÒNG GD&ĐT…, TRƯỜNG THCS…) hoặc dòng đầu trang lặp "Trường THCS X · Đề …"
        if not HEAD.match(text) and re.search(r'Trường\s+THCS\s+\S', text) and re.search(r'Đề|Năm học|NĂM HỌC|Kỳ|kỳ|kì', text):
            # dòng đầu trang lặp lại ("Trường THCS X      Đề ôn tập … – Năm học …"): che cả dòng
            out.append((min(w[0] for w in ws), min(w[1] for w in ws), max(w[2] for w in ws), max(w[3] for w in ws), text))
            continue
        if HEAD.match(text):
            # Dòng chia hai cột (trái: đơn vị, phải: tên kì thi) — chỉ che cụm bên trái.
            cut = len(ws)
            for i in range(1, len(ws)):
                if ws[i][0] - ws[i - 1][2] > 40:
                    cut = i
                    break
            seg = ws[:cut]
            out.append((min(w[0] for w in seg), min(w[1] for w in seg), max(w[2] for w in seg), max(w[3] for w in seg), ' '.join(w[4] for w in seg)))
            continue
        # Tên trường trong nội dung: "… trường THCS Vân Hán …" → che phần tên riêng
        for i, w in enumerate(ws):
            if w[4].strip('.,:;()') in KIND and i + 1 < len(ws) and _cap(ws[i + 1][4]):
                j = i + 1
                while j < len(ws) and _cap(ws[j][4]) and j - i <= 5:
                    j += 1
                    if re.search(r'[,.:;)]$', ws[j - 1][4]) and not re.match(r'^[A-ZĐ]\.$', ws[j - 1][4]):
                        break
                seg = ws[i + 1:j]
                out.append((min(x[0] for x in seg), min(x[1] for x in seg), max(x[2] for x in seg), max(x[3] for x in seg), ' '.join(x[4] for x in seg)))
    return out
