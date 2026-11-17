"""Đoán chủ đề (topicId trong js/core/topics.js) cho một câu đề theo từ khóa.

Luật đầu tiên khớp được chọn; mỗi khối có bảng riêng, chia theo học kì vì đề giữa/cuối kì I
chỉ hỏi nội dung tập 1, đề kì II hỏi chủ yếu tập 2 (nhưng có thể ôn lại tập 1).
"""
import re

R = lambda *rules: [(re.compile(p, re.I), t) for p, t in rules]

G6 = R(
    (r'xác suất|tung đồng xu|gieo|xúc xắc|khả năng xảy ra|kết quả có thể|thực nghiệm', '6-C6-B2'),
    (r'biểu đồ|bảng thống kê|dữ liệu|kiểm đếm|biểu đồ tranh|thống kê', '6-C6-B1'),
    (r'trung điểm|tia\b|đoạn thẳng|thẳng hàng|nằm giữa|đường thẳng|giao điểm|điểm .{0,20} thuộc', '6-C5-B1'),
    (r'\bgóc\b|số đo góc|góc nhọn|góc tù|góc bẹt|góc vuông', '6-C5-B2'),
    (r'tỉ số|phần trăm|%', '6-C3-B4'),
    (r'số thập phân|làm tròn|thập phân', '6-C3-B3'),
    (r'đối xứng', '6-C4-B4'),
    (r'chu vi|diện tích|hàng rào|mét vuông|\blát\b|\bsơn\b|trồng|dây thép|mảnh vườn|khu vườn|tấm vải', '6-C4-B3'),
    (r'lục giác|tam giác đều', '6-C4-B1'),
    (r'hình chữ nhật|hình thoi|bình hành|thang cân|hình vuông', '6-C4-B2'),
    (r'phân số|hỗn số|nghịch đảo|tối giản', '6-C3-B*'),
    (r'ƯCLN|BCNN|ước chung|bội chung|nhiều nhất|ít nhất|xếp .{0,15}hàng|thành hàng|chia đều|phần thưởng|\bnhóm\b|\bbó\b', '6-C1-B7'),
    (r'nguyên tố|hợp số|thừa số', '6-C1-B6'),
    (r'số đối|trục số|nguyên âm|nhiệt độ|thứ tự (tăng|giảm)|lớn hơn\s*-|nhỏ hơn\s*-', '6-C2-B1'),
    (r'số nguyên', '6-C2-B2'),
    (r'chia hết|\bbội\b|\bước\b|\bdư\b|Ư\(|B\(', '6-C1-B5'),
    (r'lũy thừa|luỹ thừa', '6-C1-B4'),
    (r'la mã|chữ số|giá trị của chữ', '6-C1-B2'),
    (r'tập hợp|phần tử|thuộc|∈|∉', '6-C1-B1'),
)

G7 = R(
    (r'lăng trụ', '7-C10-B2'),
    (r'hình hộp|lập phương|thể tích|diện tích xung quanh', '7-C10-B1'),
    (r'trọng tâm|trực tâm|đồng quy|trung tuyến|đường cao|giao điểm .{0,30}phân giác', '7-C5-B6'),
    (r'đường xiên|hình chiếu|đường vuông góc', '7-C5-B5'),
    (r'bất đẳng thức tam giác|độ dài .{0,25}(ba|3) cạnh|cạnh lớn nhất|góc lớn nhất|so sánh (các |ba )?(góc|cạnh)|cạnh đối diện', '7-C5-B4'),
    (r'biến cố|xác suất|ngẫu nhiên|chắc chắn|không thể|gieo|rút .{0,20}(thẻ|quả|viên)', '7-C6-B3'),
    (r'tam giác cân|trung trực|tam giác đều', '7-C5-B3'),
    (r'bằng nhau|c\.?g\.?c|g\.?c\.?g|c\.?c\.?c|cạnh huyền|chứng minh|tam giác', '7-C5-B2'),
    (r'tổng (số đo )?(ba |các )?góc', '7-C5-B1'),
    (r'//|song song|so le|đồng vị|tiên đề|Ơ-?clít|Euclid|định lí|giả thiết', '7-C4-B2'),
    (r'đối đỉnh|kề bù|phân giác|\bgóc\b', '7-C4-B1'),
    (r'biểu đồ', '7-C6-B2'),
    (r'dữ liệu|thu thập|phân loại|điều tra|khảo sát|thống kê', '7-C6-B1'),
    (r'tỉ lệ nghịch', '7-C2-B3'),
    (r'tỉ lệ thuận|tỉ lệ với|chia .{0,30}tỉ lệ|số cây|số học sinh .{0,40}tỉ lệ', '7-C2-B2'),
    (r'tỉ lệ thức|dãy tỉ số|\bx\s*/\s*\d|tỉ số bằng nhau', '7-C2-B1'),
    (r'đa thức|bậc của|hệ số|nghiệm|thu gọn|sắp xếp|[PQAMNBH]\s*\(\s*x\s*\)', '7-C3-B2'),
    (r'biểu thức đại số|giá trị của biểu thức|đơn thức|\bbiến\b', '7-C3-B1'),
    (r'làm tròn|ước lượng|độ chính xác', '7-C1-B5'),
    (r'vô tỉ|căn bậc hai|√|số thực|giá trị tuyệt đối|\|\s*x\s*\|', '7-C1-B4'),
    (r'lũy thừa|luỹ thừa|thứ tự thực hiện', '7-C1-B3'),
    (r'trục số|biểu diễn|số đối|∈|\bQ\b|thuộc|so sánh|số hữu tỉ (âm|dương)|là số hữu tỉ', '7-C1-B1'),
)

G8 = R(
    (r'hình chóp', '8-C7-B1'),
    (r'máng trượt|cạnh huyền|độ dài cạnh .{0,30}tam giác vuông|thang dựa', '8-C6-B4'),
    (r'pythagore|pitago|py-?ta-?go|đ[ịi]nh lí Pytha', '8-C6-B4'),
    (r'đồng dạng', '8-C6-B3'),
    (r'xác suất|biến cố|ngẫu nhiên|gieo|rút .{0,20}(thẻ|quả|viên)', '8-C8-B2'),
    (r'hệ số góc|đồ thị (của )?hàm số|hàm số bậc nhất|cắt trục|song song với đường thẳng|y\s*=\s*-?\s*\d*\s*x', '8-C4-B4'),
    (r'hàm số|mặt phẳng tọa độ|tọa độ|toạ độ', '8-C4-B3'),
    (r'lập phương trình|vận tốc|quãng đường|km/h|năng suất|bài toán|hai số|tuổi|giá tiền|chu vi .{0,40}chiều', '8-C4-B2'),
    (r'phương trình|giải pt', '8-C4-B1'),
    (r'phân thức|mẫu thức|điều kiện xác định|ĐKXĐ', '8-C3-B*'),
    (r'biểu đồ|dữ liệu|thống kê|khảo sát|bảng số liệu|điều tra', '8-C8-B1'),
    (r'đường trung bình', '8-C6-B2'),
    (r'thales|ta-?lét|talet|phân giác', '8-C6-B1'),
    (r'hình chữ nhật|hình thoi|hình vuông', '8-C5-B4'),
    (r'bình hành', '8-C5-B3'),
    (r'hình thang', '8-C5-B2'),
    (r'tứ giác', '8-C5-B1'),
    (r'nhân tử', '8-C2-B2'),
    (r'hằng đẳng thức|khai triển|bình phương của|lập phương của', '8-C2-B1'),
    (r'(chia|nhân) .{0,30}đa thức|đa thức .{0,30}(chia|nhân)|tích|thương', '8-C1-B4'),
    (r'(cộng|trừ|tổng|hiệu) .{0,30}đa thức', '8-C1-B3'),
    (r'đa thức|bậc của|thu gọn', '8-C1-B2'),
    (r'đơn thức', '8-C1-B1'),
    (r'tam giác|hình chiếu|trung điểm', '8-C5-B4'),
)

G9 = R(
    (r'hình trụ', '9-C10-B1'),
    (r'hình nón|nón', '9-C10-B2'),
    (r'hình cầu|mặt cầu|quả bóng|bán kính .{0,20}cầu', '9-C10-B3'),
    (r'tứ giác nội tiếp|nội tiếp đường tròn|cùng thuộc một đường tròn|cùng nằm trên một đường tròn|nội tiếp', '9-C9-B1'),
    (r'đa giác đều|phép quay|lục giác đều', '9-C9-B2'),
    (r'xác suất|biến cố|ngẫu nhiên|gieo|rút .{0,20}(thẻ|quả|viên)|không gian mẫu', '9-C8-B1'),
    (r'tần số|ghép nhóm|bảng tần|biểu đồ|tần suất', '9-C7-B1'),
    (r'vi-?ét|vi[eè]te|viet|x\s*_?1\s*.{0,6}x\s*_?2|hai nghiệm', '9-C6-B3'),
    (r'parabol|y\s*=\s*-?\s*\d*\s*x\s*(\^|²|2\b)|ax\s*(\^|²)?\s*2|hàm số y\s*=\s*ax', '9-C6-B1'),
    (r'phương trình bậc hai|Δ|delta|biệt thức|bậc hai', '9-C6-B2'),
    (r'độ dài cung|độ dài đường tròn|hình quạt|vành khuyên|diện tích hình tròn|chu vi .{0,20}đường tròn', '9-C5-B4'),
    (r'góc nội tiếp|góc ở tâm|số đo cung|\bcung\b|góc tạo bởi', '9-C5-B3'),
    (r'tiếp tuyến|tiếp điểm', '9-C5-B2'),
    (r'đường tròn|bán kính|dây cung|\bdây\b', '9-C5-B1'),
    (r'\bsin\b|\bcos\b|\btan\b|\bcot\b|lượng giác', '9-C4-B1'),
    (r'tam giác vuông|góc nghiêng|bóng|cột cờ|cái thang|chiếc thang|độ cao|máy bay|tòa nhà|ngọn hải đăng|góc tạo bởi tia nắng', '9-C4-B2'),
    (r'căn bậc ba', '9-C3-B1'),
    (r'căn|√|rút gọn|trục căn|có nghĩa|xác định khi', '9-C3-B2'),
    (r'lập hệ|giải bài toán bằng cách|bài toán|người|xe|giá|sản phẩm|công nhân|đội|vận tốc|số tiền|vé', '9-C1-B4'),
    (r'hệ phương trình|giải hệ', '9-C1-B3'),
    (r'phương trình bậc nhất hai ẩn|nghiệm của phương trình .{0,20}x.{0,10}y|cặp số', '9-C1-B2'),
    (r'bất phương trình', '9-C2-B2'),
    (r'bất đẳng thức|a\s*>\s*b|a\s*<\s*b|nhỏ nhất|lớn nhất', '9-C2-B1'),
    (r'phương trình tích|chứa ẩn ở mẫu|quy về|phương trình', '9-C1-B1'),
)

GRADE_RULES = {6: G6, 7: G7, 8: G8, 9: G9}

# Chủ đề mặc định khi không khớp từ khóa (đề tính toán / đề chỉ có công thức).
DEFAULT = {
    (6, 'GK1'): '6-C1-B3', (6, 'CK1'): '6-C2-B2', (6, 'GK2'): '6-C3-B2', (6, 'CK2'): '6-C3-B2',
    (7, 'GK1'): '7-C1-B2', (7, 'CK1'): '7-C1-B2', (7, 'GK2'): '7-C3-B2', (7, 'CK2'): '7-C3-B2',
    (8, 'GK1'): '8-C1-B4', (8, 'CK1'): '8-C1-B4', (8, 'GK2'): '8-C3-B2', (8, 'CK2'): '8-C4-B1',
    (9, 'GK1'): '9-C3-B2', (9, 'CK1'): '9-C3-B2', (9, 'GK2'): '9-C6-B2', (9, 'CK2'): '9-C6-B2',
    (9, 'V10'): '9-C3-B2',
}

# Kì I chỉ dùng chủ đề tập 1; kì II ưu tiên tập 2 nhưng vẫn cho tập 1.
HK1_TOPICS = {
    6: {'6-C1-B1', '6-C1-B2', '6-C1-B3', '6-C1-B4', '6-C1-B5', '6-C1-B6', '6-C1-B7', '6-C2-B1', '6-C2-B2', '6-C2-B3',
        '6-C4-B1', '6-C4-B2', '6-C4-B3', '6-C4-B4'},
    7: {'7-C1-B1', '7-C1-B2', '7-C1-B3', '7-C1-B4', '7-C1-B5', '7-C4-B1', '7-C4-B2', '7-C5-B1', '7-C5-B2', '7-C5-B3',
        '7-C6-B1', '7-C6-B2'},
    8: {'8-C1-B1', '8-C1-B2', '8-C1-B3', '8-C1-B4', '8-C2-B1', '8-C2-B2', '8-C5-B1', '8-C5-B2', '8-C5-B3', '8-C5-B4',
        '8-C6-B1', '8-C6-B2', '8-C8-B1'},
    9: {'9-C1-B1', '9-C1-B2', '9-C1-B3', '9-C1-B4', '9-C2-B1', '9-C2-B2', '9-C3-B1', '9-C3-B2', '9-C4-B1', '9-C4-B2',
        '9-C5-B1', '9-C5-B2', '9-C5-B3', '9-C5-B4'},
}


def guess(text, grade, etype):
    t = text or ''
    sem1 = etype in ('GK1', 'CK1')
    for rx, tid in GRADE_RULES[grade]:
        if not rx.search(t):
            continue
        if tid.endswith('*'):
            base = tid[:-1]
            if grade == 6:
                tid = base + ('2' if re.search(r'tính|tìm|cộng|trừ|nhân|chia|giá trị|hợp lí|hợp lý|\+|:', t, re.I) else '1')
            else:  # 8-C3-B*
                tid = base + ('2' if re.search(r'tính|cộng|trừ|nhân|chia|rút gọn|thực hiện|biểu thức', t, re.I) else '1')
        if sem1 and tid not in HK1_TOPICS[grade]:
            continue
        return tid
    return DEFAULT[(grade, etype)]
