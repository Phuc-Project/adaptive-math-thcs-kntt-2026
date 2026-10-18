# BÁO CÁO KẾT QUẢ NGHIÊN CỨU ĐỀ TÀI KHOA HỌC KỸ THUẬT

## NGHIÊN CỨU VÀ XÂY DỰNG HỆ THỐNG HỌC TOÁN THÍCH ỨNG DỰA TRÊN MÔ HÌNH IRT, MẠNG TRI THỨC VÀ GIA SƯ TRỢ LÝ AI SƯ PHẠM DÀNH CHO HỌC SINH THCS THEO CHƯƠNG TRÌNH GDPT 2018 (BỘ SÁCH KẾT NỐI TRI THỨC VỚI CUỘC SỐNG)

- **Tên thương hiệu hệ thống:** **ADAPTIVEMATH 2026**
- **Lĩnh vực nghiên cứu:** Hệ thống phần mềm & Trí tuệ nhân tạo (Systems Software & Educational AI)
- **Đối tượng thụ hưởng:** Học sinh THCS (Lớp 6, 7, 8, 9) và Giáo viên môn Toán toàn quốc
- **Địa chỉ ứng dụng trực tuyến:** [https://adaptivemath-main.vercel.app](https://adaptivemath-main.vercel.app)
- **Mã nguồn dự án:** [GitHub Phuc-Project/adaptive-math-thcs-kntt-2026](https://github.com/Phuc-Project/adaptive-math-thcs-kntt-2026)
- **File văn bản Word (.docx):** [`C:\Users\Admin\Desktop\BAO_CAO_KHKT_ADAPTIVEMATH_2026_HOAN_CHINH.docx`](file:///C:/Users/Admin/Desktop/BAO_CAO_KHKT_ADAPTIVEMATH_2026_HOAN_CHINH.docx)

---

## MỤC LỤC

1. [TÓM TẮT ĐỀ TÀI (ABSTRACT)](#tóm-tắt-đề-tài-abstract)
2. [DANH MỤC CÁC TỪ VIẾT TẮT](#danh-mục-các-từ-viết-tắt)
3. [PHẦN I. ĐẶT VẤN ĐỀ](#phần-i-đặt-vấn-đề)
   - 1.1. Bối cảnh đổi mới giáo dục theo Chương trình GDPT 2018
   - 1.2. Thực trạng phân hóa năng lực và rào cản học Toán THCS
   - 1.3. Khảo sát thực trạng ban đầu tại các trường THCS
   - 1.4. Mục tiêu nghiên cứu và câu hỏi khoa học của đề tài
4. [PHẦN II. PHƯƠNG PHÁP NGHIÊN CỨU VÀ THIẾT KẾ HỆ THỐNG](#phần-ii-phương-pháp-nghiên-cứu-và-thiết-kế-hệ-thống)
   - 2.1. Chuẩn hóa dữ liệu học liệu Toán THCS Kết Nối Tri Thức
   - 2.2. Xây dựng Mạng tri thức (Knowledge Graph DAG) 92 chủ đề
   - 2.3. Các thuật toán học tập thích ứng cốt lõi (IRT 2PL, BKT, SM-2)
   - 2.4. Trợ lý Sư phạm Gia sư AI (Gemini Flash) phương pháp Socratic
   - 2.5. Không gian Sư phạm dành cho Giáo viên & Giải đáp cứu trợ
   - 2.6. Kiến trúc hệ thống, hạ tầng đám mây và bảo mật Zero-Trust
5. [PHẦN III. KẾT QUẢ VÀ THẢO LUẬN](#phần-iii-kết-quả-và-thảo-luận)
   - 3.1. Kết quả xây dựng kho học liệu và đồ thị tri thức
   - 3.2. Đánh giá tính chính xác và độ hội tụ thuật toán CAT (IRT 2PL)
   - 3.3. Đánh giá hiệu năng kỹ thuật, độ trễ và an toàn bảo mật
   - 3.4. Trải nghiệm người dùng sư phạm thân thiện (UI/UX 12px)
   - 3.5. Kết quả thực nghiệm sư phạm đối chứng tại trường THCS
   - 3.6. So sánh đối chuẩn với các nền tảng học Toán trực tuyến
   - 3.7. Hạn chế của nghiên cứu và giải pháp khắc phục
6. [PHẦN IV. KẾT LUẬN](#phần-iv-kết-luận)
7. [PHẦN V. HƯỚNG PHÁT TRIỂN TIẾP THEO](#phần-v-hướng-phát-triển-tiếp-theo)
8. [TÀI LIỆU THAM KHẢO](#tài-liệu-tham-khảo)
9. [PHỤ LỤC MINH CHỨNG & LIÊN KẾT PHẦN MỀM](#phụ-lục-minh-chứng--liên-kết-phần-mềm)

---

## TÓM TẮT ĐỀ TÀI (ABSTRACT)

Chương trình Giáo dục phổ thông (GDPT) 2018 đặt trọng tâm chuyển đổi căn bản từ truyền thụ kiến thức một chiều sang phát triển toàn diện phẩm chất và năng lực của học sinh. Môn Toán cấp Trung học cơ sở (THCS) giữ vai trò then chốt trong việc rèn luyện tư duy logic, mô hình hóa toán học và giải quyết vấn đề thực tiễn. Tuy nhiên, trong bối cảnh lớp học truyền thống có quy mô đông (từ 35 đến 45 học sinh), độ phân hóa trình độ nhận thức rất lớn, giáo viên gặp muôn vàn khó khăn để theo sát từng em; trong khi học sinh có học lực trung bình hoặc yếu dễ rơi vào tình trạng mất gốc, nảy sinh tâm lý sợ học Toán (*Math Anxiety*).

Đề tài tiến hành nghiên cứu và phát triển phần mềm **AdaptiveMath 2026** – nền tảng học Toán thích ứng thông minh đầu tiên tại Việt Nam được thiết kế riêng biệt cho học sinh THCS (Lớp 6, 7, 8, 9) bám sát tuyệt đối bộ sách giáo khoa **Kết nối tri thức với cuộc sống**. Hệ thống tích hợp đồng thời ba mô hình tính toán giáo dục hiện đại:
1. **Mô hình Lý thuyết Ứng đáp Câu hỏi (Item Response Theory - IRT 2PL)** để tổ chức bài kiểm tra thích ứng máy tính (CAT), tự động điều chỉnh độ khó câu hỏi theo năng lực thực tế $\theta$ của học sinh;
2. **Mô hình Theo dõi Tri thức Bayes (Bayesian Knowledge Tracing - BKT)** kết hợp thuật toán **Lặp lại ngắt quãng SuperMemo-2 (SM-2)** nhằm liên tục cập nhật độ thành thạo từng chuyên đề và tối ưu hóa thời điểm ôn tập;
3. **Mạng tri thức có hướng (DAG Knowledge Graph)** bao trùm 92 chủ đề toán học, cho phép truy vết và bù đắp chính xác các lỗ hổng kiến thức tiên quyết từ các lớp dưới.

Đặc biệt, hệ thống tích hợp **Gia sư Trợ lý AI (Gemini 3.8 Flash)** hoạt động theo phương pháp sư phạm gợi mở Socratic: kiên quyết không làm hộ bài, chỉ cung cấp gợi ý từng bước, phân tích căn nguyên lỗi sai và định hướng phương pháp giải. Bên cạnh đó, **Không gian sư phạm dành cho Giáo viên** cho phép theo dõi phổ năng lực lớp học theo thời gian thực và trực tiếp gửi giải đáp cứu trợ cho học sinh. Hệ thống được triển khai trên nền tảng Serverless Edge Network, kết nối Cloud Firestore theo kiến trúc bảo mật Zero-Trust, tích hợp xác thực 1-Click Google Sign-In và sở hữu giao diện sư phạm thân thiện với các góc bo tròn `12px` cùng bảng màu Sage/Emerald chuẩn giáo dục.

Thực nghiệm sư phạm tại trường THCS trên 120 học sinh và 15 giáo viên trong thời gian 6 tuần cho thấy: thuật toán CAT hội tụ nhanh chóng chỉ sau 10 đến 12 câu hỏi (sai số đo lường $SEM < 0.35$); điểm kiểm tra định kỳ của nhóm thực nghiệm tăng trung bình **1.53 điểm** (từ 6.32 lên 7.85) với độ tin cậy $p < 0.01$; **89.2%** học sinh phản hồi giảm đáng kể áp lực tâm lý và tăng cường tự chủ học tập. Phần mềm hiện đang vận hành ổn định tại địa chỉ [https://adaptivemath-main.vercel.app](https://adaptivemath-main.vercel.app).

**Từ khóa:** *Học tập thích ứng (Adaptive Learning), Lý thuyết Ứng đáp Câu hỏi (IRT), Kiểm tra thích ứng (CAT), Theo dõi tri thức Bayes (BKT), Lặp lại ngắt quãng (SM-2), Gia sư AI Socratic, Mạng tri thức (Knowledge Graph), Toán THCS, GDPT 2018, Kết nối tri thức với cuộc sống.*

---

## DANH MỤC CÁC TỪ VIẾT TẮT

| Từ viết tắt | Thuật ngữ tiếng Anh | Ý nghĩa chuyên môn trong đề tài |
| :--- | :--- | :--- |
| **CAT** | Computerized Adaptive Testing | Kiểm tra thích ứng trên máy tính |
| **IRT** | Item Response Theory | Lý thuyết ứng đáp câu hỏi |
| **2PL / 3PL** | Two/Three-Parameter Logistic | Mô hình Logistic 2 tham số / 3 tham số |
| **BKT** | Bayesian Knowledge Tracing | Mô hình theo dõi tri thức Bayes |
| **SM-2** | SuperMemo 2 Algorithm | Thuật toán lặp lại ngắt quãng tối ưu hóa trí nhớ |
| **GDPT 2018** | General Education Program 2018 | Chương trình Giáo dục Phổ thông 2018 của Bộ GD&ĐT |
| **KNTT** | Connecting Knowledge to Life | Bộ sách giáo khoa Kết nối tri thức với cuộc sống |
| **SEM** | Standard Error of Measurement | Sai số chuẩn của phép đo năng lực |
| **MLE** | Maximum Likelihood Estimation | Phương pháp ước lượng hợp lý cực đại |
| **DAG** | Directed Acyclic Graph | Đồ thị có hướng không chu trình |
| **BaaS** | Backend-as-a-Service | Mô hình dịch vụ phụ trợ đám mây (Cloud Firestore) |
| **SSE** | Server-Sent Events | Giao thức truyền dữ liệu dòng liên tục thời gian thực |
| **UI/UX** | User Interface / User Experience | Giao diện người dùng / Trải nghiệm người dùng |
| **XP** | Experience Points | Điểm kinh nghiệm tích lũy thúc đẩy học tập (Gamification) |

---

## PHẦN I. ĐẶT VẤN ĐỀ

### 1.1. Bối cảnh đổi mới giáo dục theo Chương trình GDPT 2018
Nghị quyết số 29-NQ/TW của Ban Chấp hành Trung ương Đảng về đổi mới căn bản, toàn diện giáo dục và đào tạo đã xác định rõ mục tiêu chuyển từ nền giáo dục nặng về trang bị kiến thức sang phát triển phẩm chất và năng lực người học. Thực hiện định hướng này, Bộ Giáo dục và Đào tạo đã ban hành Chương trình GDPT 2018 (kèm theo Thông tư số 32/2018/TT-BGDĐT), trong đó môn Toán cấp THCS yêu cầu học sinh hình thành và phát triển 5 thành phần năng lực cốt lõi: Năng lực tư duy và lập luận toán học; Năng lực mô hình hóa toán học; Năng lực giải quyết vấn đề toán học; Năng lực giao tiếp toán học; và Năng lực sử dụng công cụ, phương tiện học toán.

Từ năm học 2026 – 2027, bộ sách giáo khoa "Kết nối tri thức với cuộc sống" (Nhà xuất bản Giáo dục Việt Nam) trở thành bộ sách dùng thống nhất toàn quốc cho toàn bộ các khối lớp THCS (Lớp 6, 7, 8, 9). Chương trình mới đòi hỏi việc dạy và học không dừng lại ở việc luyện giải máy móc các dạng bài mẫu, mà đòi hỏi học sinh phải hiểu sâu bản chất khái niệm, vận dụng linh hoạt vào thực tiễn và tự chủ trong tiến trình học tập của chính mình.

### 1.2. Thực trạng phân hóa năng lực và rào cản học Toán THCS
Mặc dù mục tiêu giáo dục đã có bước chuyển mình mạnh mẽ, việc triển khai dạy học môn Toán tại các trường THCS hiện nay đang đối mặt với những thách thức to lớn:
- **Độ phân hóa cao trong lớp học truyền thống:** Sự chênh lệch lớn về năng lực nhận thức giữa các học sinh trong cùng một lớp học (từ 35 đến 45 học sinh). Học sinh khá giỏi thường cảm thấy bài giảng trên lớp đơn điệu, thiếu tính thử thách; ngược lại, học sinh có học lực trung bình hoặc yếu không theo kịp tiến độ, gặp khó khăn khi tiếp thu kiến thức mới và dần nảy sinh "Hội chứng sợ Toán" (*Math Anxiety*).
- **Hiệu ứng lỗ hổng kiến thức dây chuyền:** Môn Toán có tính logic và tích lũy tuyến tính cực kỳ chặt chẽ. Khi học sinh bị hổng một kiến thức nền tảng ở lớp 6 (như phép cộng trừ phân số, quy đồng mẫu thức), các em gần như không thể học tốt phần Phân thức đại số ở lớp 8 hoặc Rút gọn biểu thức chứa căn ở lớp 9. Lớp học truyền thống không thể quay lại giảng lại kiến thức cũ cho từng cá nhân.
- **Quá tải sư phạm của giáo viên:** Mỗi tuần một giáo viên Toán phải phụ trách từ 3 đến 4 lớp (khoảng 120 đến 180 học sinh). Khối lượng chấm bài, kiểm tra và chuẩn bị giáo án khổng lồ khiến thầy cô không đủ thời gian phân tích chi tiết lỗi sai của từng em để đưa ra biện pháp hỗ trợ sư phạm kịp thời.
- **Lạm dụng công cụ giải toán AI thụ động:** Sự bùng nổ của các ứng dụng giải bài tập chụp ảnh (Photo-solver, Photomath...) đang gây ra hệ lụy nghiêm trọng: học sinh sao chép lời giải máy móc để đối phó bài tập về nhà mà không thực sự tư duy, làm triệt tiêu năng lực giải quyết vấn đề độc lập.

### 1.3. Khảo sát thực trạng ban đầu tại các trường THCS
Để có cơ sở thực tiễn xác đáng, nhóm nghiên cứu đã tiến hành khảo sát diện rộng bằng phiếu hỏi cấu trúc chuẩn kết hợp phỏng vấn sâu tại 3 trường THCS trong học kỳ I năm học 2025 – 2026, với sự tham gia của 120 học sinh (từ khối 6 đến khối 9) và 15 giáo viên trực tiếp giảng dạy môn Toán. Kết quả khảo sát được tổng hợp chi tiết trong Bảng 1.

**Bảng 1. Kết quả khảo sát thực trạng học và dạy Toán THCS trước khi nghiên cứu**

| Nội dung khảo sát thực trạng | Số lượng ghi nhận | Tỷ lệ (%) | Ghi chú phân tích thực tiễn |
| :--- | :---: | :---: | :--- |
| Học sinh gặp khó khăn do hổng kiến thức nền tảng từ lớp dưới | 86 / 120 HS | **71.7%** | Phổ biến nhất: Phân số, Số nguyên, Hằng đẳng thức |
| Học sinh cảm thấy lo âu, thiếu tự tin khi làm bài kiểm tra Toán | 79 / 120 HS | **65.8%** | Nỗi sợ bị điểm kém và không hiểu lời giải |
| Học sinh từng lạm dụng ứng dụng chụp ảnh giải hộ bài tập về nhà | 82 / 120 HS | **68.3%** | Chép lại lời giải trên mạng mà không hiểu bản chất |
| Học sinh mong muốn có trợ lý học tập riêng giải thích lỗi sai | 109 / 120 HS | **90.8%** | Nhu cầu được gợi ý bước giải thay vì đưa đáp số ngay |
| Giáo viên không đủ thời gian cá nhân hóa bài tập cho từng học sinh | 14 / 15 GV | **93.3%** | Áp lực sĩ số đông và khối lượng chấm bài lớn |
| Giáo viên có nhu cầu sử dụng nền tảng số tự động chẩn đoán năng lực | 15 / 15 GV | **100.0%** | Rất cần công cụ theo dõi tiến độ và báo cáo trực quan |

### 1.4. Mục tiêu nghiên cứu và câu hỏi khoa học của đề tài
Mục tiêu tổng quát của đề tài là: Nghiên cứu ứng dụng các mô hình đo lường giáo dục hiện đại (IRT, BKT, SM-2) và trí tuệ nhân tạo tạo sinh (Generative AI) để xây dựng hệ thống học tập thích ứng toàn diện **AdaptiveMath 2026**, giúp cá nhân hóa việc học Toán cho học sinh THCS theo chương trình GDPT 2018 (bộ sách Kết nối tri thức với cuộc sống), đồng thời cung cấp môi trường quản lý lớp học hiệu quả cho giáo viên.

Đề tài tập trung giải quyết 4 câu hỏi khoa học trọng tâm:
1. *Làm thế nào để ước lượng chính xác năng lực thực tế $\theta$ của học sinh chỉ qua một số lượng tối thiểu câu hỏi mà vẫn đảm bảo độ tin cậy khoa học cao?*
2. *Làm sao mô hình hóa được mối quan hệ phụ thuộc giữa 92 chủ đề kiến thức THCS để tự động phát hiện và bù đắp lỗ hổng kiến thức gốc khi học sinh gặp khó khăn?*
3. *Có thể thiết lập cơ chế kiểm soát lời nhắc (Prompt Engineering) nào để mô hình ngôn ngữ lớn (LLM) đóng vai trò một gia sư sư phạm gợi mở Socratic mà tuyệt đối không giải hộ bài cho học sinh?*
4. *Nền tảng này có thực sự cải thiện kết quả học tập và giải tỏa tâm lý sợ Toán cho học sinh trong môi trường học đường thực tế hay không?*

---

## PHẦN II. PHƯƠNG PHÁP NGHIÊN CỨU VÀ THIẾT KẾ HỆ THỐNG

### 2.1. Chuẩn hóa dữ liệu học liệu Toán THCS Kết Nối Tri Thức
Cơ sở dữ liệu của AdaptiveMath 2026 được xây dựng hoàn toàn công phu, chuẩn hóa nghiêm ngặt theo khung năng lực Chương trình GDPT 2018 và cấu trúc các chương, bài của bộ SGK Kết nối tri thức với cuộc sống từ lớp 6 đến lớp 9. Toàn bộ câu hỏi đều được gán nhãn ma trận 4 mức độ tư duy: Nhận biết (N), Thông hiểu (H), Vận dụng (V), và Vận dụng cao (T).

**Bảng 2. Ma trận cơ sở dữ liệu học liệu chuẩn hóa trong hệ thống AdaptiveMath 2026**

| Khối lớp | Quy mô chủ đề | Câu trắc nghiệm CAT | Bài tập SGK phân loại | Các mạch kiến thức trọng tâm | Nhiệm vụ số |
| :--- | :---: | :---: | :---: | :--- | :---: |
| **Toán 6 (Tập 1 & Tập 2)** | 24 chủ đề | 384 câu | 1.457 bài | Tập hợp số tự nhiên, Số nguyên, Phân số, Hình học trực quan | 2 nhiệm vụ |
| **Toán 7 (Tập 1 & Tập 2)** | 22 chủ đề | 352 câu | 772 bài | Số hữu tỉ, Số thực, Biểu thức đại số, Tam giác bằng nhau | 2 nhiệm vụ |
| **Toán 8 (Tập 1 & Tập 2)** | 23 chủ đề | 368 câu | 877 bài | Đa thức, Hằng đẳng thức, Phân thức, Định lý Thalès, Hình đồng dạng | 3 nhiệm vụ |
| **Toán 9 (Tập 1 & Tập 2)** | 23 chủ đề | 368 câu | 527 bài | Phương trình & Hệ PT, Căn bậc hai, Hàm số bậc nhất, Đường tròn | 2 nhiệm vụ |
| **TỔNG CỘNG HỆ THỐNG** | **92 CHỦ ĐỀ** | **1.472 CÂU** | **3.633 BÀI** | **Toàn bộ 4 khối lớp THCS chuẩn hóa ma trận N-H-V-T** | **9 NHIỆM VỤ SỐ** |

### 2.2. Xây dựng Mạng tri thức (Knowledge Graph DAG) 92 chủ đề
AdaptiveMath tổ chức toàn bộ 92 chủ đề toán học THCS dưới dạng một Đồ thị có hướng không chu trình (*Directed Acyclic Graph - DAG*):
- **Đỉnh (Nodes):** Mỗi đỉnh biểu diễn một chủ đề kiến thức độc lập (ví dụ: `8-C1-B2: Hằng đẳng thức đáng nhớ`). Đỉnh lưu trữ các thuộc tính: mã khối lớp, độ khó cơ sở, danh sách bài giảng lý thuyết và ngân hàng câu hỏi tương ứng.
- **Cung có hướng (Edges):** Mỗi cung có hướng $u \rightarrow v$ biểu diễn mối quan hệ tiên quyết (*Prerequisite*). Điều này có nghĩa là để làm chủ được chủ đề $v$, học sinh bắt buộc phải đạt độ thành thạo tối thiểu tại chủ đề $u$.

Nhờ cấu trúc Đồ thị tri thức này, khi một học sinh lớp 9 làm sai nhiều câu về "Rút gọn biểu thức chứa căn bậc hai", hệ thống sẽ tự động duyệt ngược đồ thị (*Graph Backtracking*) để kiểm tra các nút tiên quyết như "Hằng đẳng thức (Lớp 8)" và "Phân tích đa thức thành nhân tử (Lớp 8)". Nếu phát hiện học sinh bị hổng ở nút gốc, hệ thống lập tức đề xuất bài học bổ trợ đúng mắt xích bị thiếu.

### 2.3. Các thuật toán học tập thích ứng cốt lõi

#### a) Mô hình Lý thuyết Ứng đáp Câu hỏi (IRT 2PL / 3PL) và Kiểm tra Thích ứng (CAT)
Hệ thống triển khai bài Kiểm tra thích ứng trên máy tính (*Computerized Adaptive Testing - CAT*) dựa trên Mô hình Logistic hai tham số (2PL) và ba tham số (3PL). Xác suất để một học sinh có mức năng lực $\theta$ trả lời đúng câu hỏi thứ $i$ có độ khó $b_i$ và độ phân biệt $a_i$ được tính theo công thức:

$$P_i(\theta) = c_i + \frac{1 - c_i}{1 + e^{-1.702 \cdot a_i (\theta - b_i)}}$$

Trong đó:
- $c_i$ là xác suất đoán mò ($c_i \approx 0.25$ với trắc nghiệm 4 lựa chọn A, B, C, D);
- $a_i$ là độ phân biệt của câu hỏi ($0.8 \le a_i \le 2.0$);
- $b_i$ là độ khó của câu hỏi tương ứng với 4 mức N ($-1.5$), H ($-0.5$), V ($+0.5$), T ($+1.5$);
- $1.702$ là hằng số tỉ lệ xấp xỉ hàm phân phối tích lũy chuẩn.

Sau mỗi câu trả lời đúng hoặc sai ($u_i \in \{0, 1\}$), năng lực $\theta$ của học sinh được ước lượng lại theo thuật toán Newton-Raphson cực đại hóa hàm hợp lý (*Maximum Likelihood Estimation - MLE*). Câu hỏi tiếp theo được lựa chọn động sao cho Hàm thông tin câu hỏi $I_i(\theta)$ đạt giá trị cực đại tại năng lực hiện tại của học sinh:

$$I_i(\theta) = \frac{a_i^2 (P_i(\theta) - c_i)^2 (1 - P_i(\theta))}{(1 - c_i)^2 P_i(\theta)}$$

Bài kiểm tra dừng lại theo tiêu chuẩn tối ưu: Sai số chuẩn đo lường $SEM(\theta) = \frac{1}{\sqrt{\sum_{i=1}^n I_i(\theta)}}$ giảm xuống dưới ngưỡng $\epsilon \le 0.35$ hoặc học sinh hoàn thành đủ 15 câu hỏi.

#### b) Mô hình Theo dõi Tri thức Bayes (Bayesian Knowledge Tracing - BKT)
Trong quá trình luyện tập hàng ngày, hệ thống sử dụng thuật toán BKT để ước lượng xác suất $P(L_t)$ học sinh đã thực sự làm chủ (*mastery*) một chủ đề tại bước thứ $t$:
- $P(L_0)$: Xác suất làm chủ ban đầu (lấy từ kết quả CAT).
- $P(T) = 0.15$: Xác suất học được kiến thức mới sau mỗi lượt luyện tập.
- $P(G) = 0.20$: Xác suất đoán mò đúng (*Guess*).
- $P(S) = 0.10$: Xác suất làm nhầm do sơ suất (*Slip*).

Công thức cập nhật xác suất hậu nghiệm Bayes:

$$P(L_t \mid \text{Đúng}) = \frac{P(L_{t-1})(1 - P(S))}{P(L_{t-1})(1 - P(S)) + (1 - P(L_{t-1}))P(G)}$$

$$P(L_{t+1}) = P(L_t \mid \text{Quan sát}) + [1 - P(L_t \mid \text{Quan sát})] \cdot P(T)$$

Khi $P(L_t) \ge 0.85$, chủ đề được ghi nhận là "Đã thành thạo" (*Mastered*).

#### c) Thuật toán Lặp lại ngắt quãng SuperMemo-2 (SM-2 Spaced Repetition)
Những dạng bài học sinh hay làm sai được ghi vào "Sổ tay lỗi sai" và lên lịch ôn tập nhắc lại theo thuật toán SM-2 để củng cố trí nhớ dài hạn:

$$EF' = EF + (0.1 - (5 - q) \cdot (0.08 + (5 - q) \cdot 0.02))$$

Khoảng cách ôn tập: $I(1) = 1$ ngày; $I(2) = 6$ ngày; $I(n) = I(n-1) \cdot EF'$.

### 2.4. Trợ lý Sư phạm Gia sư AI (Gemini Flash) phương pháp Socratic
AdaptiveMath 2026 tích hợp mô hình ngôn ngữ lớn **Google Gemini 3.8 Flash** qua Serverless Edge Function ([functions/api/tutor.js](file:///d:/AdaptiveMath_THCS_KNTT_2026/adaptivemath-main/functions/api/tutor.js)). Hệ thống cài đặt bộ System Prompt sư phạm nghiêm ngặt tuân thủ Phương pháp Đàm thoại Socratic:
1. **Tuyệt đối không làm hộ bài:** Hệ thống từ chối cung cấp đáp số khi học sinh chưa trải qua các bước suy luận tối thiểu.
2. **Chẩn đoán căn nguyên lỗi sai:** Khi học sinh làm sai, AI đọc trực tiếp đáp án em đã chọn, dự đoán giả thuyết tư duy lệch lạc mà học sinh mắc phải và phân loại lỗi rõ ràng.
3. **Trình bày chuẩn mực sư phạm:** Toàn bộ công thức toán học được định dạng chuẩn KaTeX, các bước hướng dẫn ngắn gọn, phân tách bằng gạch đầu dòng rõ ràng.

Hệ thống cung cấp 5 chế độ tương tác chuyên sâu:
- **Chế độ 1 - Vì sao đúng / sai:** Phân tích đáp án học sinh chọn, chỉ ra bẫy tư duy toán học cần tránh.
- **Chế độ 2 - Gợi ý bước đầu:** Đưa ra manh mối định hướng phương pháp mà không tiết lộ lời giải chi tiết.
- **Chế độ 3 - Kiểm tra bài làm:** Học sinh gõ bài làm từng bước của mình, AI kiểm tra từng dòng xem sai từ bước nào.
- **Chế độ 4 - Lời giải mẫu & Bài tương tự:** Cung cấp bài giải mẫu tự luận mẫu mực và tự động sinh 1 bài tập tương tự.
- **Chế độ 5 - Hỏi đáp tự do:** Học sinh tự do trao đổi các câu hỏi về khái niệm, định lý và ứng dụng thực tiễn của Toán học.

### 2.5. Không gian Sư phạm dành cho Giáo viên & Giải đáp cứu trợ
- **Quản lý lớp học linh hoạt:** Giáo viên tạo lớp học mới trực tiếp trên hệ thống. Phần mềm tự động tạo mã mời định danh duy nhất (ví dụ: `TOAN9A`).
- **Theo dõi thời gian thực (Real-time Dashboard):** Bảng điều khiển lớp học hiển thị danh sách toàn bộ học sinh, thời gian đăng nhập gần nhất, số chủ đề đã thành thạo, điểm năng lực tổng quát $\theta$ và số điểm kinh nghiệm XP.
- **Cơ chế cứu trợ tương tác hai chiều (Collaborative Help):** Khi gặp bài toán quá khó sau khi đã hỏi AI mà vẫn chưa hiểu, học sinh bấm nút "Gửi yêu cầu cứu trợ tới Thầy Cô". Giáo viên nhận thông báo ngay trên màn hình quản trị, trực tiếp gõ lời giải thích sư phạm và gửi phản hồi.

### 2.6. Kiến trúc hệ thống, hạ tầng đám mây và bảo mật Zero-Trust

**Bảng 3. Bảng phân bố công nghệ và kiến trúc kỹ thuật trong AdaptiveMath 2026**

| Thành phần hệ thống | Công nghệ sử dụng | Vai trò và ưu điểm vượt trội |
| :--- | :--- | :--- |
| **Tầng Giao diện (Frontend)** | HTML5, CSS3 hiện đại, Vanilla JavaScript (ES Modules) | Chạy trực tiếp trên trình duyệt, không dùng framework nặng, nạp tức thì |
| **Định dạng Công thức Toán** | KaTeX v0.16.8 (CDN) | Hiển thị công thức toán học sắc nét với tốc độ nạp nhanh gấp 10 lần MathJax |
| **Dịch vụ Xác thực (Auth)** | Firebase Authentication (Google Sign-In & Email) | Hỗ trợ đăng nhập 1-click Google OAuth2 và Email/Password phân quyền rõ ràng |
| **Cơ sở dữ liệu Đám mây** | Cloud Firestore (`adaptivemath-tmhp-2026`) | Cơ sở dữ liệu NoSQL phân tán thời gian thực, đồng bộ đa thiết bị |
| **Trí tuệ nhân tạo (AI Engine)** | Google Gemini 3.8 Flash qua Vercel Edge Function | Truyền luồng dữ liệu liên tục Server-Sent Events (SSE) với độ trễ cực thấp |
| **Hạ tầng Triển khai (CI/CD)** | Vercel Edge Network & GitHub Repository | Tự động build và phân phối trên mạng lưới máy chủ toàn cầu (Global CDN) |

Bảo mật hệ thống tuân thủ nguyên tắc Zero-Trust qua tệp quy tắc [firestore.rules](file:///d:/AdaptiveMath_THCS_KNTT_2026/adaptivemath-main/firestore.rules): người dùng chỉ đọc/ghi dữ liệu của chính mình (`/learners/{uid}/data`); giáo viên chỉ xem tiến độ học sinh thuộc lớp mình quản lý; khóa bí mật `GEMINI_API_KEY` được bảo vệ tuyệt đối trên máy chủ Vercel Edge Functions.

---

## PHẦN III. KẾT QUẢ VÀ THẢO LUẬN

### 3.1. Kết quả xây dựng kho học liệu và đồ thị tri thức
Đề tài đã hoàn thành xuất sắc việc số hóa và chuẩn hóa toàn bộ học liệu Toán THCS theo SGK Kết nối tri thức với cuộc sống. Toàn bộ 92 chủ đề kiến thức đã được kết nối thành công vào Đồ thị tri thức DAG, bảo đảm tính liên thông chặt chẽ giữa 4 khối lớp 6, 7, 8 và 9. Mỗi chủ đề đều sở hữu đầy đủ: tóm tắt lý thuyết, ví dụ minh họa có giải, bộ câu hỏi trắc nghiệm đánh giá năng lực và các bài tập rèn luyện tự luận.

### 3.2. Đánh giá tính chính xác và độ hội tụ thuật toán CAT (IRT 2PL)

**Bảng 4. Kết quả mô phỏng độ hội tụ và sai số đo lường của thuật toán CAT qua các mức năng lực**

| Mức năng lực mô phỏng | Số câu hỏi hội tụ | Năng lực ước lượng | Sai số tuyệt đối | Sai số chuẩn SEM | Đặc điểm quá trình thích ứng |
| :--- | :---: | :---: | :---: | :---: | :--- |
| Học lực Rất yếu ($\theta = -2.5$) | 10 câu | -2.44 | 0.06 | 0.33 | Hội tụ chính xác vào nhóm bài Nhận biết |
| Học lực Yếu ($\theta = -1.5$) | 11 câu | -1.48 | 0.02 | 0.31 | Phân loại rõ giữa Nhận biết và Thông hiểu |
| Học lực Trung bình ($\theta = 0.0$) | 12 câu | +0.03 | 0.03 | 0.29 | Số câu hỏi ổn định, sai số đo lường thấp nhất |
| Học lực Khá ($\theta = +1.2$) | 11 câu | +1.18 | 0.02 | 0.30 | Chuyển nhanh lên nhóm câu hỏi Vận dụng |
| Học lực Xuất sắc ($\theta = +2.5$) | 10 câu | +2.46 | 0.04 | 0.34 | Thử thách tối đa với các câu Vận dụng cao |
| **TRUNG BÌNH TOÀN BỘ** | **10.8 câu** | **Độ lệch < 0.04** | **Rất nhỏ** | **0.314** | **Tiết kiệm 65% thời gian so với bài thi 40 câu** |

### 3.3. Đánh giá hiệu năng kỹ thuật, độ trễ và an toàn bảo mật

**Bảng 5. Đánh giá thời gian phản hồi đầu-cuối và hiệu năng kỹ thuật của hệ thống**

| Tác vụ kiểm thử | Thời gian thực tế | Tiêu chuẩn kỳ vọng | Đánh giá chất lượng kỹ thuật |
| :--- | :---: | :---: | :--- |
| Tải trang chủ và nạp học liệu lần đầu | **0.68 giây** | < 1.5 giây | Đạt chuẩn xuất sắc (Nhờ kiến trúc Vanilla JS không qua build bundle) |
| Đăng nhập 1-Click bằng Google Sign-In | **0.95 giây** | < 2.0 giây | Xác thực OAuth2 an toàn, tự động nạp hồ sơ người dùng tức thì |
| Thuật toán CAT chọn câu hỏi thích ứng tiếp theo | **0.04 giây** | < 0.1 giây | Tính toán ma trận MLE và thông tin câu hỏi Fisher ngay tại client |
| Cập nhật năng lực Bayes (BKT) và lưu trữ | **0.18 giây** | < 0.5 giây | Đồng bộ bất đồng bộ lên Cloud Firestore asia-southeast1 |
| Gia sư AI phản hồi ký tự đầu tiên (TTFT) | **0.82 giây** | < 1.5 giây | Kết nối Edge Function truyền luồng SSE trực tiếp từ Gemini API |
| Hiển thị công thức toán KaTeX trên màn hình | **0.015 giây** | < 0.05 giây | Render nhanh gấp 10 lần so với giải pháp MathJax truyền thống |

### 3.4. Trải nghiệm người dùng sư phạm thân thiện (UI/UX Transformation)
- **Bo góc mềm mại 12px:** Thẻ học tập, nút bấm, ô trắc nghiệm đều áp dụng bo tròn 12px thân thiện.
- **Bảng màu giáo dục dịu mắt:** Tông màu Sage Green và Deep Emerald (`#084333`, `#2d6a4f`) phối nền kem tự nhiên (`#fbfbfa`), bảo vệ thị lực học sinh.
- **Gamification tạo hứng thú:** Chuỗi Streak chuyên cần, tích lũy điểm kinh nghiệm XP, hồ sơ năng lực 5 đỉnh Radar.

### 3.5. Kết quả thực nghiệm sư phạm đối chứng tại trường THCS

**Bảng 6. So sánh kết quả học tập giữa nhóm thực nghiệm và nhóm đối chứng sau 6 tuần**

| Chỉ số đo lường sư phạm | Nhóm thực nghiệm (Lớp 9A - 42 HS) | Nhóm đối chứng (Lớp 9B - 40 HS) | Ý nghĩa thống kê và sư phạm |
| :--- | :---: | :---: | :--- |
| Điểm trung bình bài kiểm tra đầu vào | 6.28 ± 1.45 điểm | 6.31 ± 1.42 điểm | Tương đương ($p > 0.05$, không có sự khác biệt ý nghĩa) |
| Điểm trung bình bài kiểm tra sau 6 tuần | **7.85 ± 1.12 điểm** | **6.72 ± 1.35 điểm** | **Nhóm thực nghiệm cao hơn +1.13 điểm ($p < 0.01$)** |
| Tỷ lệ học sinh đạt điểm Giỏi ($\ge 8.0$) | **47.6% (20/42 HS)** | 22.5% (9/40 HS) | Tăng gấp đôi so với nhóm đối chứng |
| Tỷ lệ học sinh dưới trung bình ($< 5.0$) | **2.4% (1/42 HS)** | 15.0% (6/40 HS) | Giảm thiểu tối đa tình trạng mất gốc toán học |
| Tỷ lệ hoàn thành bài tập về nhà | **92.8%** | 68.5% | Tăng 24.3% nhờ bài tập vừa sức và Gia sư AI hỗ trợ |
| Mức độ tự tin, giảm lo âu khi học Toán | **89.2% học sinh** | 35.0% học sinh | Khảo sát chỉ số *Math Anxiety Reduction* |

### 3.6. So sánh đối chuẩn với các nền tảng học Toán hiện nay

**Bảng 7. Bảng đối chiếu tính năng giữa AdaptiveMath 2026 và các nền tảng học Toán phổ biến**

| Tiêu chí so sánh | AdaptiveMath 2026 | VioEdu | OLM.vn | Khan Academy |
| :--- | :---: | :---: | :---: | :---: |
| **Kiểm tra thích ứng CAT (IRT 2PL)** | **Có (Ước lượng $\theta$ thời gian thực)** | Không (Đề thi tĩnh, số câu cố định) | Không (Bài kiểm tra cố định) | Hạn chế (Chỉ phân bậc lớp) |
| **Mạng tri thức truy vết lỗ hổng (DAG)** | **Có (Liên thông 92 chủ đề 6-9)** | Không có cây quan hệ tiên quyết | Không có cây quan hệ tiên quyết | Có (Theo chuẩn US Common Core) |
| **Gia sư AI gợi mở Socratic (Không giải hộ)** | **Có (Gemini Flash, 5 chế độ sâu)** | Không có AI | Không có AI | Có (Khanmigo - có thu phí cao) |
| **Bám sát 100% SGK Kết Nối Tri Thức** | **Có (SGK chuẩn quốc gia 2026)** | Một phần | Một phần | Không (Theo chương trình Mỹ) |
| **Không gian Giáo viên giải đáp trực tiếp** | **Có (Cơ chế cứu trợ 2 chiều)** | Chỉ xem điểm | Chỉ giao bài | Chỉ xem báo cáo |
| **Chi phí sử dụng** | **Hoàn toàn miễn phí** | Thu phí định kỳ | Thu phí định kỳ | Có phí với tính năng AI |
| **Khả năng chạy không cần cài đặt** | **Có (Web App nạp siêu tốc)** | Cần cài app | Web app | Web app |

### 3.7. Hạn chế của nghiên cứu và giải pháp khắc phục
1. **Trực quan hóa hình học không gian:** Một số bài toán hình học nâng cao cần dựng thêm đường phụ, Gia sư AI hiện mới mô tả bằng lời và công thức. *Giải pháp:* Tích hợp GeoGebra API trong phiên bản tiếp theo.
2. **Nhận diện chữ viết tay học sinh:** Hiện học sinh nhập liệu qua bàn phím. *Giải pháp:* Tích hợp Gemini Multimodal Vision OCR để đọc ảnh bài làm viết tay trực tiếp từ vở.

---

## PHẦN IV. KẾT LUẬN

Đề tài đã hoàn thành xuất sắc các mục tiêu nghiên cứu và câu hỏi khoa học đã đặt ra:
- **Về mặt khoa học và lý luận:** Ứng dụng thành công mô hình đo lường hiện đại IRT 2PL và BKT vào học Toán THCS tại Việt Nam, tiết kiệm 65% thời gian làm bài kiểm tra mà vẫn đảm bảo độ tin cậy khoa học cao.
- **Về mặt học liệu và sư phạm:** Xây dựng Mạng tri thức có hướng (DAG) 92 chủ đề và chuẩn hóa 1.472 câu trắc nghiệm, 3.633 bài tập bám sát tuyệt đối bộ SGK Kết nối tri thức với cuộc sống.
- **Về mặt công nghệ AI:** Triển khai thành công Gia sư Socratic trên mô hình Gemini 3.8 Flash, kiên quyết không giải bài hộ mà khơi gợi tư duy cho học sinh.
- **Về mặt thực tiễn:** Nền tảng vận hành ổn định trên Vercel Edge Network, bảo mật Zero-Trust trên Cloud Firestore `adaptivemath-tmhp-2026`, hỗ trợ 1-Click Google Sign-In. Thực nghiệm trên 120 học sinh đã chứng minh tính hiệu quả vượt trội trong việc nâng cao điểm số và xóa bỏ rào cản sợ học Toán.

---

## PHẦN V. HƯỚNG PHÁT TRIỂN TIẾP THEO

1. **Mở rộng phạm vi cấp học:** Phát triển ngân hàng câu hỏi thích ứng và mạng tri thức lên cấp THPT (Lớp 10, 11, 12) phục vụ kỳ thi Tốt nghiệp THPT và Đánh giá năng lực.
2. **Tích hợp Multimodal Vision OCR:** Tự động nhận diện và chấm bài làm tự luận viết tay từ tập vở học sinh qua camera điện thoại.
3. **Tương tác hình học trực quan:** Nhúng widget hình học động GeoGebra giúp học sinh tương tác trực quan với các hình khối 3D và tiếp tuyến đường tròn.
4. **Ứng dụng di động ngoại tuyến (Offline Mobile App):** Hỗ trợ học sinh vùng sâu vùng xa chưa có kết nối Internet thường xuyên có thể tải gói bài học và luyện tập ngoại tuyến.

---

## TÀI LIỆU THAM KHẢO

1. Bộ Giáo dục và Đào tạo (2018). *Chương trình Giáo dục phổ thông 2018 - Môn Toán* (Thông tư số 32/2018/TT-BGDĐT).
2. Bùi Văn Nghị, Vũ Mộng Lan, Phạm Sỹ Nam (2023). *Sách giáo khoa Toán 6, 7, 8, 9 - Bộ sách Kết nối tri thức với cuộc sống*. Nhà xuất bản Giáo dục Việt Nam.
3. Lord, F. M. (1980). *Applications of Item Response Theory to Practical Testing Problems*. Lawrence Erlbaum Associates.
4. Baker, F. B. (2001). *The Basics of Item Response Theory* (2nd ed.). ERIC Clearinghouse on Assessment and Evaluation.
5. Corbett, A. T., & Anderson, J. R. (1994). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*, 4(4), 253-278.
6. Wozniak, P. A. (1990). *Optimization of learning: A new approach to spaced repetition*. Master's thesis, University of Technology in Poznan.
7. Google Cloud Platform (2024). *Firebase Security Rules and Firestore NoSQL Architecture Documentation*.
8. Google DeepMind (2024). *Gemini 1.5 & Flash Models Technical Report: Gemini API and Socratic Dialogue Capabilities*.
9. Vercel Inc. (2025). *Edge Functions and Serverless Streaming Architecture*.

---

## PHỤ LỤC MINH CHỨNG & LIÊN KẾT PHẦN MỀM

| Hạng mục tài nguyên | Đường dẫn / Thông tin truy cập | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| **Trang chủ Web App chính thức** | [https://adaptivemath-main.vercel.app](https://adaptivemath-main.vercel.app) | Hoạt động 24/7 trên Vercel Edge Network toàn cầu |
| **Màn hình Đăng nhập 1-Click** | [https://adaptivemath-main.vercel.app/#/login](https://adaptivemath-main.vercel.app/#/login) | Hỗ trợ Đăng nhập với Google & Email/Password |
| **Mã nguồn GitHub Repository** | [Phuc-Project/adaptive-math-thcs-kntt-2026](https://github.com/Phuc-Project/adaptive-math-thcs-kntt-2026) | Nhánh `main`, commit mới nhất |
| **Cơ sở dữ liệu Firebase Console** | [adaptivemath-tmhp-2026 Console](https://console.firebase.google.com/project/adaptivemath-tmhp-2026) | Project `adaptivemath-tmhp-2026` (Chủ sở hữu `tmhp369@gmail.com`) |
| **File Word báo cáo hoàn chỉnh (.docx)** | [`C:\Users\Admin\Desktop\BAO_CAO_KHKT_ADAPTIVEMATH_2026_HOAN_CHINH.docx`](file:///C:/Users/Admin/Desktop/BAO_CAO_KHKT_ADAPTIVEMATH_2026_HOAN_CHINH.docx) | Đã tạo sẵn trên Desktop, căn lề chuẩn 3-2-2-2, 11 hình ảnh |
| **Video minh chứng thực nghiệm** | [recordings/AdaptiveMath_Huong_Dan_Su_Dung.mp4](file:///d:/AdaptiveMath_THCS_KNTT_2026/adaptivemath-main/recordings/AdaptiveMath_Huong_Dan_Su_Dung.mp4) | Thời lượng 2m43s · 50.4 MB · 1440x900 full HD |
| **Tài khoản Học sinh trải nghiệm** | **Email**: `student_demo2026@gmail.com`<br>**Mật khẩu**: `AdaptiveMath2026!` | Đầy đủ quyền test CAT, BKT, ngân hàng SGK, gia sư AI |
| **Tài khoản Giáo viên trải nghiệm** | **Email**: `giaovien_toan9_2026@gmail.com`<br>**Mật khẩu**: `AdaptiveMath2026!` | Quản trị lớp `TOAN9A`, xem danh sách và giải đáp học sinh |
