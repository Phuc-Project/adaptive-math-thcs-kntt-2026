/**
 * Bộ kiến thức chuẩn cho Gia sư AI — 92 chủ đề Toán 6–9 (SGK Kết nối tri thức).
 *
 * Gemini không "học lại" được, nên cách làm nó giải đúng và nói đúng thuật ngữ
 * SGK là đưa kiến thức của ĐÚNG chủ đề vào mỗi câu hỏi (grounding):
 *   kt  — định nghĩa, định lí, công thức (đúng tên gọi trong SGK)
 *   pp  — cách làm theo dạng bài
 *   sai — lỗi học sinh hay mắc / bẫy cần kiểm tra
 *
 * Dùng chung máy chủ + trình duyệt như tutorPrompt.js. Máy chủ tự tra theo
 * topicId (không lấy nội dung từ client). Mỗi chủ đề ≈ 120–220 token.
 * Sửa nội dung → tăng VERSION (và PROMPT_VERSION để bỏ cache câu trả lời cũ).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AM_TUTOR_KNOWLEDGE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = 1;
  const R = String.raw;
  const T = {};
  function K(id, kt, pp, sai) {
    T[id] = { kt: kt, pp: pp, sai: sai };
  }

  // ======================================================================
  // LỚP 6
  // ======================================================================
  K('6-C1-B1',
    R`Tập hợp viết bằng chữ in hoa; liệt kê phần tử trong $\{\ \}$, ngăn cách bằng ";" ($A=\{1;2;3\}$); hoặc chỉ ra tính chất đặc trưng $A=\{x\in\mathbb N \mid x<4\}$. $a\in A$: $a$ thuộc $A$; $a\notin A$. $\mathbb N=\{0;1;2;\dots\}$, $\mathbb N^*=\{1;2;3;\dots\}$.`,
    R`Chuyển giữa hai cách viết; đếm phần tử: liệt kê rồi đếm, dãy cách đều có (số cuối − số đầu) : khoảng cách + 1 phần tử.`,
    R`Quên số 0 thuộc $\mathbb N$ nhưng không thuộc $\mathbb N^*$; liệt kê một phần tử hai lần; nhầm dấu "<" với "≤" trong điều kiện.`);
  K('6-C1-B2',
    R`Hệ thập phân: giá trị chữ số phụ thuộc vị trí, $\overline{abc}=100a+10b+c$ ($a\ne0$). Số La Mã: I=1, V=5, X=10, L=50, C=100; chữ nhỏ đứng trước chữ lớn thì trừ (IV=4, IX=9, XL=40, XC=90), không viết một chữ quá 3 lần liền. Thứ tự: $a<b$, $b<c$ thì $a<c$; mỗi số tự nhiên có đúng một số liền sau.`,
    R`Phân biệt "chữ số" và "số"; so sánh số tự nhiên: so số chữ số trước, rồi so từng hàng từ trái sang.`,
    R`Nhầm giá trị của chữ số với chính chữ số (chữ số 2 trong 2010 có giá trị 2000); đọc sai IV/VI, XL/LX.`);
  K('6-C1-B3',
    R`Tính chất giao hoán, kết hợp của phép cộng và phép nhân; phân phối $a(b+c)=ab+ac$; $a-b$ chỉ thực hiện trong $\mathbb N$ khi $a\ge b$; $a=bq+r$ ($0\le r<b$), chia hết khi $r=0$. Thứ tự thực hiện: lũy thừa → nhân, chia → cộng, trừ (từ trái sang phải); có ngoặc thì $(\ )\to[\ ]\to\{\ \}$.`,
    R`Tính nhanh: nhóm các số tròn chục/tròn trăm, đặt thừa số chung. Tìm $x$: xác định $x$ là thành phần nào (số hạng, số bị trừ, thừa số…) rồi dùng phép toán ngược. Bài lời văn: tóm tắt, chọn phép tính, ghi đơn vị.`,
    R`Tính từ trái sang phải bỏ qua thứ tự ưu tiên ($2+3\cdot4\ne20$); làm phép trừ trong $\mathbb N$ khi số bị trừ nhỏ hơn số trừ; nhầm "số bị chia" và "số chia" khi tìm $x$.`);
  K('6-C1-B4',
    R`$a^n=a\cdot a\cdots a$ ($n$ thừa số), $a$ cơ số, $n$ số mũ; $a^1=a$, $a^0=1$ ($a\ne0$). $a^m\cdot a^n=a^{m+n}$; $a^m:a^n=a^{m-n}$ ($a\ne0$, $m\ge n$). Bình phương, lập phương: $a^2$, $a^3$.`,
    R`Viết gọn tích các thừa số bằng nhau; đưa về cùng cơ số rồi cộng/trừ số mũ; so sánh lũy thừa: cùng cơ số so số mũ, cùng số mũ so cơ số.`,
    R`$2^3=6$ (nhân cơ số với số mũ); $a^m\cdot a^n=a^{m\cdot n}$; cộng hai lũy thừa bằng cách cộng số mũ ($2^2+2^3\ne2^5$).`);
  K('6-C1-B5',
    R`$a\chiahet b$ nếu $a=b\cdot k$ ($k\in\mathbb N$, $b\ne0$). Ước, bội: $a\chiahet b$ thì $a\in B(b)$, $b\in Ư(a)$. Tính chất: $a\chiahet m$, $b\chiahet m$ thì $(a\pm b)\chiahet m$; có đúng một số hạng không chia hết cho $m$ thì tổng không chia hết cho $m$. Dấu hiệu: chia hết cho 2 (tận cùng 0;2;4;6;8), cho 5 (tận cùng 0;5), cho 3 (tổng các chữ số chia hết cho 3), cho 9 (tổng các chữ số chia hết cho 9).`,
    R`Xét tổng/hiệu chia hết theo từng số hạng; tìm chữ số thỏa mãn: lập điều kiện tận cùng trước (2, 5), rồi điều kiện tổng chữ số (3, 9); chia hết cho cả 2 và 5 ⇔ tận cùng 0.`,
    R`Chia hết cho 3 thì chia hết cho 9 (sai); quên chữ số đầu khác 0; hai số hạng đều không chia hết cho $m$ vẫn có thể có tổng chia hết.`);
  K('6-C1-B6',
    R`Số nguyên tố: số tự nhiên lớn hơn 1, chỉ có hai ước là 1 và chính nó; hợp số: lớn hơn 1, có nhiều hơn hai ước. 0 và 1 không là số nguyên tố, cũng không là hợp số; 2 là số nguyên tố chẵn duy nhất. Phân tích ra thừa số nguyên tố (sơ đồ cây hoặc cột), viết gọn bằng lũy thừa theo thứ tự cơ số tăng: $60=2^2\cdot3\cdot5$.`,
    R`Kiểm tra số nguyên tố: thử chia cho các số nguyên tố $p$ với $p^2\le n$. Từ phân tích $a=p^x q^y$ suy ra số ước $(x+1)(y+1)$ và liệt kê ước.`,
    R`Coi 1 là số nguyên tố; dừng phân tích khi còn thừa số là hợp số ($60=4\cdot15$); quên 2 là số nguyên tố.`);
  K('6-C1-B7',
    R`$ƯC(a,b)$, $BC(a,b)$; $\text{ƯCLN}$: phân tích ra thừa số nguyên tố, lấy thừa số CHUNG với số mũ NHỎ NHẤT; $\text{BCNN}$: lấy thừa số chung VÀ riêng với số mũ LỚN NHẤT. $ƯC(a,b)=Ư(\text{ƯCLN}(a,b))$, $BC(a,b)=B(\text{BCNN}(a,b))$. Hai số nguyên tố cùng nhau: ƯCLN bằng 1. $\text{ƯCLN}(a,b)\cdot\text{BCNN}(a,b)=a\cdot b$. Quy đồng mẫu: mẫu chung là BCNN các mẫu.`,
    R`Bài lời văn "chia đều nhiều nhất / lớn nhất" → ƯCLN; "xếp hàng 3, 4, 5 đều vừa đủ / ít nhất / nhỏ nhất" → BCNN; "thừa 1" → $x-1\in BC$; khoảng giới hạn (từ 300 đến 400) → chọn bội trong khoảng.`,
    R`Lẫn quy tắc số mũ nhỏ nhất/lớn nhất; nhầm bài ƯCLN với BCNN; quên đối chiếu khoảng điều kiện của đề.`);
  K('6-C2-B1',
    R`Số nguyên âm, dương; $\mathbb Z=\{\dots;-2;-1;0;1;2;\dots\}$; 0 không âm không dương. Trục số: điểm bên trái biểu diễn số nhỏ hơn. Số đối của $a$ là $-a$; $-(-a)=a$. Số nguyên âm nhỏ hơn 0 và nhỏ hơn mọi số dương; trong hai số âm, số có phần số tự nhiên lớn hơn thì nhỏ hơn.`,
    R`So sánh/sắp xếp: dựa vào vị trí trên trục số. Bài thực tế: nhiệt độ dưới 0, độ cao dưới mực nước biển, nợ → số âm.`,
    R`$-5>-3$ (sai); coi 0 là số dương; quên số đối của 0 là 0.`);
  K('6-C2-B2',
    R`Cộng hai số cùng dấu: cộng hai phần số tự nhiên, giữ dấu chung. Khác dấu: lấy số lớn trừ số nhỏ (phần số tự nhiên), dấu của số có phần số tự nhiên lớn hơn. $a-b=a+(-b)$. Quy tắc dấu ngoặc: bỏ ngoặc có dấu "+" giữ nguyên dấu; có dấu "−" đổi dấu mọi số hạng trong ngoặc.`,
    R`Tính nhanh: nhóm các số đối nhau, các số cùng dấu; dùng quy tắc dấu ngoặc để đưa về tổng dễ tính. Tìm $x$ như với số tự nhiên nhưng cho phép kết quả âm.`,
    R`Bỏ ngoặc có dấu trừ nhưng chỉ đổi dấu số hạng đầu; $-3-5=-2$; nhầm $a-(-b)=a-b$.`);
  K('6-C2-B3',
    R`Nhân hai số cùng dấu được số dương, khác dấu được số âm; $a\cdot0=0$. Tích có số chẵn thừa số âm thì dương, số lẻ thừa số âm thì âm. Phép chia hết trong $\mathbb Z$: $a=bq$; ước và bội của số nguyên: nếu $a$ là bội của $b$ thì $-a$ cũng vậy; $Ư(6)=\{\pm1;\pm2;\pm3;\pm6\}$.`,
    R`Xác định dấu trước rồi nhân phần số tự nhiên; đặt thừa số chung $a\cdot b+a\cdot c=a(b+c)$; liệt kê ước số nguyên gồm cả số âm.`,
    R`$(-2)^2=-4$ (sai, phải là 4) và lẫn $-2^2=-4$; liệt kê ước nhưng quên ước âm.`);
  K('6-C4-B1',
    R`Tam giác đều: 3 cạnh bằng nhau, 3 góc bằng nhau (bằng $60^\circ$). Hình vuông: 4 cạnh bằng nhau, 4 góc vuông, 2 đường chéo bằng nhau. Lục giác đều: 6 cạnh bằng nhau, 6 góc bằng nhau (bằng $120^\circ$), 3 đường chéo chính bằng nhau, ghép từ 6 tam giác đều.`,
    R`Nhận dạng hình qua đặc điểm cạnh, góc, đường chéo; vẽ bằng thước và compa (tam giác đều), ê ke (hình vuông).`,
    R`Nhận nhầm hình thoi là hình vuông; nhầm lục giác đều với lục giác bất kì.`);
  K('6-C4-B2',
    R`Hình chữ nhật: 4 góc vuông, cạnh đối bằng nhau, 2 đường chéo bằng nhau. Hình thoi: 4 cạnh bằng nhau, cạnh đối song song, 2 đường chéo vuông góc. Hình bình hành: cạnh đối song song và bằng nhau, góc đối bằng nhau, 2 đường chéo cắt nhau tại trung điểm mỗi đường. Hình thang cân: 2 đáy song song, 2 cạnh bên bằng nhau, 2 góc kề một đáy bằng nhau, 2 đường chéo bằng nhau.`,
    R`Đọc kĩ câu "đặc điểm nào KHÔNG có"; đối chiếu từng đặc điểm (cạnh, góc, đường chéo).`,
    R`Cho rằng hình thoi có đường chéo bằng nhau; hình bình hành có góc vuông.`);
  K('6-C4-B3',
    R`Hình vuông cạnh $a$: $C=4a$, $S=a^2$. Hình chữ nhật: $C=2(a+b)$, $S=ab$. Hình thoi: $S=\dfrac{1}{2}d_1d_2$, $C=4a$. Hình bình hành: $S=a\cdot h$ ($h$ chiều cao ứng với cạnh $a$). Hình thang: $S=\dfrac{(a+b)h}{2}$.`,
    R`Hình phức hợp: chia thành hình cơ bản rồi cộng, hoặc lấy hình lớn trừ phần khuyết. Bài thực tế: tính diện tích → số viên gạch (chia diện tích) → tiền; hàng rào là chu vi trừ cổng.`,
    R`Không đổi cùng đơn vị (m và cm); quên $\tfrac12$ trong diện tích hình thoi/hình thang; nhầm chu vi với diện tích; diện tích dùng đơn vị $\text{m}^2$.`);
  K('6-C4-B4',
    R`Trục đối xứng: gấp hình theo đường thẳng đó, hai nửa trùng khít. Tâm đối xứng: quay hình nửa vòng ($180^\circ$) quanh điểm đó, hình trùng với chính nó. Số trục: tam giác đều 3, hình vuông 4, hình chữ nhật 2, hình thoi 2, lục giác đều 6, hình tròn vô số; hình thang cân 1 trục, không có tâm. Hình bình hành có tâm (giao hai đường chéo) nhưng không có trục.`,
    R`Thử gấp/quay trong tưởng tượng; với chữ cái, biển báo: xét từng hình.`,
    R`Cho rằng hình bình hành có trục đối xứng; hình chữ nhật có 4 trục.`);
  K('6-C3-B1',
    R`Phân số $\dfrac{a}{b}$ ($a,b\in\mathbb Z$, $b\ne0$). $\dfrac ab=\dfrac cd\Leftrightarrow ad=bc$. Tính chất cơ bản: nhân hoặc chia cả tử và mẫu với cùng số khác 0 (ước chung). Rút gọn: chia cho ƯCLN của tử và mẫu → phân số tối giản. So sánh: quy đồng cùng mẫu dương, so tử. Hỗn số dương $a\dfrac bc=a+\dfrac bc$.`,
    R`Quy đồng: mẫu chung là BCNN các mẫu; đưa mẫu âm về dương trước; so sánh với 1 hoặc phân số trung gian khi thuận tiện.`,
    R`Rút gọn bằng cách "gạch" chữ số giống nhau; cộng tử với tử, mẫu với mẫu; để mẫu âm khi quy đồng.`);
  K('6-C3-B2',
    R`Cộng/trừ: quy đồng cùng mẫu rồi cộng/trừ tử. Nhân: $\dfrac ab\cdot\dfrac cd=\dfrac{ac}{bd}$. Chia: nhân với số nghịch đảo $\dfrac ab:\dfrac cd=\dfrac ab\cdot\dfrac dc$ ($c\ne0$). Hai bài toán: giá trị phân số $\dfrac mn$ của $b$ là $b\cdot\dfrac mn$; một số biết $\dfrac mn$ của nó bằng $a$ là $a:\dfrac mn$.`,
    R`Rút gọn trước khi nhân; dùng tính chất phân phối để tính nhanh; bài lời văn: xác định "phân số của cái gì" (của tổng ban đầu hay của phần còn lại).`,
    R`Chia mà không đảo phân số thứ hai; lấy phân số của phần còn lại nhưng lại tính trên tổng; quên đổi hỗn số ra phân số trước khi nhân.`);
  K('6-C3-B3',
    R`Số thập phân (dấu phẩy thập phân, VD $2{,}5$); so sánh như số tự nhiên sau khi so phần nguyên và lần lượt từng hàng phần mười, phần trăm… Cộng, trừ, nhân, chia số thập phân (kể cả số âm). Làm tròn đến hàng nào: chữ số bỏ đi đầu tiên $\ge5$ thì cộng 1 vào chữ số giữ lại, $<5$ thì giữ nguyên. Ước lượng để kiểm tra kết quả.`,
    R`Đặt tính thẳng hàng dấu phẩy; nhân: đếm tổng số chữ số phần thập phân; ước lượng nhanh rồi so với kết quả.`,
    R`Viết dấu chấm thay dấu phẩy; làm tròn theo chữ số cuối thay vì chữ số ngay sau hàng cần giữ; đặt sai vị trí dấu phẩy khi nhân.`);
  K('6-C3-B4',
    R`Tỉ số của $a$ và $b$: $\dfrac ab$ ($b\ne0$, cùng đơn vị). Tỉ số phần trăm: $\dfrac ab\cdot100\%$. Giá trị $m\%$ của $b$ là $b\cdot\dfrac{m}{100}$; số biết $m\%$ của nó bằng $a$ là $a:\dfrac{m}{100}$.`,
    R`Giảm giá $m\%$ → giá mới $=$ giá cũ $\cdot(100\%-m\%)$; lãi suất: tiền lãi $=$ gốc $\cdot$ lãi suất; luôn đổi về cùng đơn vị trước khi lập tỉ số.`,
    R`Lập tỉ số khác đơn vị; giảm $20\%$ rồi tăng $20\%$ cho rằng về giá cũ; lấy phần trăm trên sai đại lượng gốc.`);
  K('6-C5-B1',
    R`Điểm, đường thẳng; ba điểm thẳng hàng; điểm nằm giữa hai điểm. Tia gốc $O$; hai tia đối nhau (chung gốc, tạo thành một đường thẳng); hai tia trùng nhau. Đoạn thẳng $AB$, độ dài $AB$. $M$ nằm giữa $A$, $B$ thì $AM+MB=AB$. Trung điểm $M$ của $AB$: $M$ nằm giữa $A$, $B$ và $MA=MB=\dfrac{AB}{2}$.`,
    R`Tính độ dài: xác định điểm nằm giữa rồi cộng/trừ đoạn; chứng tỏ trung điểm: chỉ ra cả hai điều kiện (nằm giữa và cách đều). Đếm đường thẳng qua $n$ điểm (không có 3 điểm thẳng hàng): $\dfrac{n(n-1)}{2}$.`,
    R`Chỉ có $MA=MB$ đã kết luận trung điểm (thiếu "nằm giữa"); nhầm tia $Ox$ với tia $xO$.`);
  K('6-C5-B2',
    R`Góc: hai tia chung gốc; kí hiệu $\widehat{xOy}$ hoặc $\widehat{AOB}$ (đỉnh ở giữa). Góc nhọn ($0^\circ<\alpha<90^\circ$), góc vuông ($90^\circ$), góc tù ($90^\circ<\alpha<180^\circ$), góc bẹt ($180^\circ$). Đo góc bằng thước đo góc.`,
    R`Đếm số góc tạo bởi $n$ tia chung gốc: $\dfrac{n(n-1)}{2}$; xác định góc từ kim đồng hồ: mỗi khoảng giờ ứng $30^\circ$.`,
    R`Viết sai thứ tự đỉnh trong kí hiệu góc; đọc nhầm vạch trong/ngoài của thước đo góc.`);
  K('6-C6-B1',
    R`Dữ liệu: số (số liệu) và không phải số; thu thập bằng quan sát, phỏng vấn, phiếu hỏi; kiểm tra tính hợp lí. Bảng thống kê, biểu đồ tranh (mỗi biểu tượng ứng một số đơn vị), biểu đồ cột, biểu đồ cột kép (so sánh hai bộ dữ liệu).`,
    R`Đọc biểu đồ: xem chú giải/đơn vị trên trục; tính tổng, chênh lệch, tỉ số từ số liệu.`,
    R`Quên nhân với giá trị một biểu tượng; đọc nhầm cột của hai bộ dữ liệu trong biểu đồ cột kép.`);
  K('6-C6-B2',
    R`Phép thử nghiệm, kết quả có thể, sự kiện (xảy ra / không xảy ra). Xác suất thực nghiệm của sự kiện $A$ $=\dfrac{\text{số lần } A \text{ xảy ra}}{\text{tổng số lần thực hiện}}$.`,
    R`Liệt kê kết quả có thể; đếm số lần sự kiện xảy ra từ bảng; dùng xác suất thực nghiệm để dự đoán.`,
    R`Lấy số lần xảy ra chia cho số kết quả có thể (đó là xác suất lí thuyết, lớp 6 không dùng); quên đếm hết các lần thỏa mãn.`);

  // ======================================================================
  // LỚP 7
  // ======================================================================
  K('7-C1-B1',
    R`Số hữu tỉ: viết được dạng $\dfrac ab$ ($a,b\in\mathbb Z$, $b\ne0$); tập $\mathbb Q$; $\mathbb N\subset\mathbb Z\subset\mathbb Q$. Biểu diễn trên trục số; số đối; so sánh: đưa về cùng mẫu dương hoặc cùng dạng thập phân.`,
    R`So sánh: đổi về phân số cùng mẫu dương hoặc so với 0, với 1; biểu diễn $\dfrac ab$ trên trục số: chia đoạn đơn vị thành $b$ phần.`,
    R`Cho rằng phân số mẫu âm không là số hữu tỉ; so sánh hai số âm như số dương.`);
  K('7-C1-B2',
    R`Cộng, trừ, nhân, chia số hữu tỉ như phân số; có tính chất giao hoán, kết hợp, phân phối. Quy tắc chuyển vế: chuyển một số hạng sang vế kia thì đổi dấu. Quy tắc dấu ngoặc như số nguyên.`,
    R`Đổi số thập phân/hỗn số về phân số; nhóm hợp lí; tìm $x$: chuyển vế rồi chia cho hệ số.`,
    R`Chuyển vế không đổi dấu; chia cho phân số không đảo ngược.`);
  K('7-C1-B3',
    R`$x^n$ với $x\in\mathbb Q$; $x^0=1$ ($x\ne0$); $x^m\cdot x^n=x^{m+n}$; $x^m:x^n=x^{m-n}$ ($x\ne0$, $m\ge n$); $(x^m)^n=x^{mn}$; $(xy)^n=x^ny^n$; $\left(\dfrac xy\right)^n=\dfrac{x^n}{y^n}$. Thứ tự thực hiện phép tính như với số nguyên.`,
    R`Đưa về cùng cơ số; lũy thừa của số âm: số mũ chẵn dương, lẻ âm; tìm $x$ trong lũy thừa: đưa hai vế về cùng cơ số hoặc cùng số mũ (chú ý số mũ chẵn cho hai giá trị).`,
    R`$(x^m)^n=x^{m+n}$; $\left(\dfrac23\right)^2=\dfrac43$; $x^2=4$ chỉ lấy $x=2$, quên $x=-2$.`);
  K('7-C1-B4',
    R`Số thập phân vô hạn tuần hoàn (chu kì, VD $0{,}(3)$) là số hữu tỉ; số vô tỉ: số thập phân vô hạn không tuần hoàn (VD $\sqrt2$, $\pi$). Căn bậc hai số học của $a\ge0$: số $x\ge0$ mà $x^2=a$, kí hiệu $\sqrt a$. Số thực $\mathbb R$ gồm số hữu tỉ và vô tỉ; giá trị tuyệt đối $|x|=x$ nếu $x\ge0$, $|x|=-x$ nếu $x<0$.`,
    R`Tính $\sqrt a$ với $a$ là số chính phương; so sánh số thực: so sánh bình phương (với số không âm) hoặc dạng thập phân; giải $|x|=a$ ($a>0$): $x=a$ hoặc $x=-a$.`,
    R`$\sqrt{16}=\pm4$ (căn bậc hai SỐ HỌC chỉ là 4); $\sqrt{a+b}=\sqrt a+\sqrt b$; $|x|=-3$ có nghiệm.`);
  K('7-C1-B5',
    R`Làm tròn số theo độ chính xác $d$ (VD $d=0{,}05$ → làm tròn đến hàng phần mười): chữ số đầu tiên bị bỏ $\ge5$ thì cộng 1 vào chữ số cuối cùng giữ lại. Ước lượng kết quả bằng cách làm tròn các số trước khi tính.`,
    R`Xác định hàng làm tròn từ độ chính xác; với số thập phân vô hạn, viết thêm vài chữ số rồi làm tròn.`,
    R`Làm tròn liên tiếp nhiều lần (làm tròn 2,449 thành 2,45 rồi 2,5); nhầm hàng làm tròn.`);
  K('7-C4-B1',
    R`Hai góc kề bù có tổng $180^\circ$; hai góc đối đỉnh thì bằng nhau. Tia phân giác $Oz$ của $\widehat{xOy}$: nằm giữa hai cạnh và $\widehat{xOz}=\widehat{zOy}=\dfrac12\widehat{xOy}$. Hai góc phụ nhau tổng $90^\circ$, bù nhau tổng $180^\circ$.`,
    R`Tính góc: lập tổng/hiệu từ quan hệ kề bù, đối đỉnh; chứng minh tia phân giác: chỉ ra tia nằm giữa và hai góc bằng nhau.`,
    R`Nhầm kề bù với đối đỉnh; tia phân giác của góc lớn hơn $180^\circ$ (không có ở THCS); quên điều kiện "nằm giữa".`);
  K('7-C4-B2',
    R`Đường thẳng $c$ cắt $a$, $b$ tạo cặp góc so le trong, đồng vị, trong cùng phía. Dấu hiệu: một cặp so le trong bằng nhau (hoặc đồng vị bằng nhau) thì $a\parallel b$. Tiên đề Euclid: qua một điểm ngoài đường thẳng chỉ có một đường thẳng song song với nó. Tính chất: $a\parallel b$ thì so le trong bằng nhau, đồng vị bằng nhau, trong cùng phía bù nhau. $a\perp c$, $b\perp c$ thì $a\parallel b$; $a\parallel b$, $c\perp a$ thì $c\perp b$. Định lí: giả thiết (GT) – kết luận (KL).`,
    R`Chứng minh song song: tìm cặp góc so le trong/đồng vị bằng nhau hoặc cùng vuông góc với đường thứ ba. Tính góc: dựng thêm đường song song qua đỉnh góc (bài "chữ Z/chữ M").`,
    R`Dùng tính chất song song khi chưa biết hai đường song song (lập luận vòng); nhầm so le trong với đồng vị.`);
  K('7-C5-B1',
    R`Tổng ba góc của tam giác bằng $180^\circ$. Tam giác vuông: hai góc nhọn phụ nhau. Góc ngoài của tam giác bằng tổng hai góc trong không kề với nó (và lớn hơn mỗi góc đó).`,
    R`Tính góc còn lại $=180^\circ-$ tổng hai góc; tam giác cân: hai góc đáy bằng nhau $=\dfrac{180^\circ-\text{góc đỉnh}}{2}$; dùng góc ngoài để tính nhanh.`,
    R`Góc ngoài bằng góc trong kề bù với nó (sai: góc ngoài bù với góc trong kề); quên đổi đơn vị độ.`);
  K('7-C5-B2',
    R`Hai tam giác bằng nhau: các cạnh tương ứng bằng nhau và các góc tương ứng bằng nhau; viết đúng thứ tự đỉnh tương ứng ($\triangle ABC=\triangle DEF$). Các trường hợp: cạnh–cạnh–cạnh (c.c.c), cạnh–góc–cạnh (c.g.c, góc xen giữa), góc–cạnh–góc (g.c.g, cạnh xen giữa). Tam giác vuông: hai cạnh góc vuông; cạnh góc vuông – góc nhọn kề; cạnh huyền – góc nhọn; cạnh huyền – cạnh góc vuông.`,
    R`Chứng minh hai đoạn/hai góc bằng nhau: đưa vào hai tam giác chứa chúng, chứng minh hai tam giác bằng nhau rồi suy ra cạnh/góc tương ứng. Trình bày: "Xét $\triangle\ldots$ và $\triangle\ldots$ có: … (giả thiết / cạnh chung / đối đỉnh) ⇒ … (c.g.c)".`,
    R`Viết sai thứ tự đỉnh tương ứng; dùng góc không xen giữa cho c.g.c; dùng "g.g.g" (không phải trường hợp bằng nhau).`);
  K('7-C5-B3',
    R`Tam giác cân tại $A$: $AB=AC$, hai góc ở đáy bằng nhau; ngược lại tam giác có hai góc bằng nhau là tam giác cân. Tam giác đều: ba cạnh bằng nhau, mỗi góc $60^\circ$; tam giác cân có một góc $60^\circ$ là tam giác đều. Đường trung trực của đoạn $AB$: vuông góc với $AB$ tại trung điểm; điểm nằm trên trung trực thì cách đều $A$, $B$ và ngược lại.`,
    R`Chứng minh tam giác cân: hai cạnh bằng nhau hoặc hai góc bằng nhau; chứng minh điểm thuộc trung trực: chỉ ra $MA=MB$.`,
    R`Nhầm đỉnh của tam giác cân khi tính góc; cho rằng đường trung trực luôn đi qua đỉnh tam giác.`);
  K('7-C6-B1',
    R`Phân loại dữ liệu: định tính / định lượng; tính đại diện của dữ liệu (mẫu khảo sát phải đại diện cho tổng thể); dữ liệu không hợp lí (vượt phạm vi, sai đơn vị). Biểu diễn bằng bảng, biểu đồ.`,
    R`Nhận ra dữ liệu không hợp lí và mẫu không đại diện; chọn cách biểu diễn phù hợp với mục đích.`,
    R`Kết luận cho toàn trường từ mẫu chỉ một lớp; coi dữ liệu số là định tính.`);
  K('7-C6-B2',
    R`Biểu đồ hình quạt tròn: cả hình tròn là $100\%$, góc ở tâm của mỗi hình quạt $=$ tỉ lệ phần trăm $\cdot360^\circ$; dùng để so sánh các phần với tổng thể. Biểu đồ đoạn thẳng: biểu diễn sự thay đổi theo thời gian, xu hướng tăng/giảm.`,
    R`Từ phần trăm tính số lượng: $\text{số lượng}=\%\cdot\text{tổng}$; đọc xu hướng, tìm khoảng tăng/giảm nhiều nhất.`,
    R`Tổng các phần trăm khác $100\%$ mà không phát hiện; đọc biểu đồ đoạn thẳng như biểu đồ cột (cộng dồn).`);
  K('7-C2-B1',
    R`Tỉ lệ thức $\dfrac ab=\dfrac cd$ ⇔ $ad=bc$ ($a,d$ ngoại tỉ; $b,c$ trung tỉ). Từ $ad=bc$ (các số khác 0) lập được 4 tỉ lệ thức. Dãy tỉ số bằng nhau: $\dfrac ab=\dfrac cd=\dfrac ef=\dfrac{a+c+e}{b+d+f}=\dfrac{a-c}{b-d}$ (mẫu khác 0).`,
    R`Tìm $x$ trong tỉ lệ thức: nhân chéo. Chia một số thành phần tỉ lệ với $a$, $b$, $c$: đặt $\dfrac xa=\dfrac yb=\dfrac zc$, áp dụng dãy tỉ số bằng nhau với tổng/hiệu đã biết.`,
    R`Nhân chéo sai cặp; cộng các tử mà quên cộng tương ứng các mẫu; chia cho tổng mẫu bằng 0.`);
  K('7-C2-B2',
    R`$y$ tỉ lệ thuận với $x$ theo hệ số tỉ lệ $k\ne0$: $y=kx$ (khi đó $x$ tỉ lệ thuận với $y$ theo hệ số $\dfrac1k$). Tính chất: $\dfrac{y_1}{x_1}=\dfrac{y_2}{x_2}=k$; $\dfrac{x_1}{x_2}=\dfrac{y_1}{y_2}$.`,
    R`Bài toán: xác định hai đại lượng tỉ lệ thuận (cùng tăng/cùng giảm theo cùng tỉ số), lập dãy tỉ số bằng nhau, dùng tổng/hiệu đã cho.`,
    R`Nhận nhầm tỉ lệ nghịch thành tỉ lệ thuận (càng nhiều người, càng ít ngày là tỉ lệ NGHỊCH); đảo hệ số tỉ lệ.`);
  K('7-C2-B3',
    R`$y$ tỉ lệ nghịch với $x$ theo hệ số $a\ne0$: $y=\dfrac ax$ hay $xy=a$. Tính chất: $x_1y_1=x_2y_2=a$; $\dfrac{x_1}{x_2}=\dfrac{y_2}{y_1}$. Chia thành phần tỉ lệ nghịch với $a$, $b$, $c$ ⇔ tỉ lệ thuận với $\dfrac1a$, $\dfrac1b$, $\dfrac1c$.`,
    R`Bài "số người – số ngày", "vận tốc – thời gian" (cùng quãng đường), "số máy – thời gian": tích không đổi; lập $x_1y_1=x_2y_2$.`,
    R`Dùng $\dfrac{x_1}{x_2}=\dfrac{y_1}{y_2}$ cho tỉ lệ nghịch; quên đổi về cùng đơn vị.`);
  K('7-C3-B1',
    R`Biểu thức số, biểu thức đại số (chứa chữ – biến). Giá trị của biểu thức: thay giá trị của biến rồi tính theo thứ tự phép tính. Quy ước viết gọn: $2\cdot x=2x$, $1x=x$, $-1x=-x$.`,
    R`Viết biểu thức biểu thị đại lượng (chu vi, diện tích, quãng đường…); thay số chú ý đặt số âm trong ngoặc.`,
    R`Thay $x=-2$ vào $x^2$ được $-4$; viết $2x$ mà hiểu là "2 nối x".`);
  K('7-C3-B2',
    R`Đa thức một biến: tổng các đơn thức cùng một biến; thu gọn, sắp xếp (giảm/tăng dần lũy thừa). Bậc (số mũ cao nhất sau khi thu gọn), hệ số cao nhất, hệ số tự do. Nghiệm: $a$ là nghiệm của $P(x)$ nếu $P(a)=0$; đa thức bậc $n$ có không quá $n$ nghiệm. Cộng/trừ (theo cột hoặc hàng ngang, cộng hệ số các hạng tử cùng lũy thừa); nhân đơn thức với đa thức, đa thức với đa thức; chia (đặt tính), chia hết hoặc có dư: $A=B\cdot Q+R$, bậc $R<$ bậc $B$.`,
    R`Thu gọn rồi mới xác định bậc; kiểm tra nghiệm bằng cách thay vào; tìm nghiệm $ax+b=0$ được $x=-\dfrac ba$; trừ đa thức: đổi dấu toàn bộ đa thức bị trừ.`,
    R`Xác định bậc khi chưa thu gọn; trừ đa thức chỉ đổi dấu hạng tử đầu; nhân $x^2\cdot x^3=x^6$.`);
  K('7-C6-B3',
    R`Biến cố chắc chắn (luôn xảy ra, xác suất 1), không thể (không bao giờ xảy ra, xác suất 0), ngẫu nhiên. Xác suất là số từ 0 đến 1 đo khả năng xảy ra. Khi các kết quả đồng khả năng: có $n$ kết quả, mỗi kết quả có xác suất $\dfrac1n$; xác suất biến cố $=\dfrac{\text{số kết quả thuận lợi}}{n}$ (với ví dụ đơn giản).`,
    R`Liệt kê tất cả kết quả có thể (gieo xúc xắc: 6; tung đồng xu: 2; rút thẻ…); đếm kết quả làm biến cố xảy ra.`,
    R`Cho xác suất lớn hơn 1; quên kiểm tra các kết quả có đồng khả năng không.`);
  K('7-C5-B4',
    R`Trong một tam giác: góc đối diện cạnh lớn hơn thì lớn hơn và ngược lại; cạnh đối diện góc tù (vuông) là cạnh lớn nhất. Bất đẳng thức tam giác: mỗi cạnh nhỏ hơn tổng và lớn hơn hiệu hai cạnh còn lại: $|b-c|<a<b+c$.`,
    R`So sánh góc ↔ so sánh cạnh đối diện; kiểm tra bộ ba độ dài là ba cạnh tam giác: cạnh lớn nhất nhỏ hơn tổng hai cạnh kia; tìm cạnh nguyên thỏa bất đẳng thức tam giác.`,
    R`So sánh góc với cạnh KỀ thay vì cạnh đối diện; dùng dấu $\le$ trong bất đẳng thức tam giác.`);
  K('7-C5-B5',
    R`Từ điểm $A$ ngoài đường thẳng $d$: $AH\perp d$ ($H$ chân đường vuông góc), $AB$ là đường xiên; đường vuông góc ngắn hơn mọi đường xiên ($AH<AB$). Khoảng cách từ $A$ đến $d$ là $AH$. SGK dùng chủ yếu: đường vuông góc ngắn hơn đường xiên, và khoảng cách từ điểm đến đường thẳng.`,
    R`Xác định đúng chân đường vuông góc; so sánh độ dài bằng quan hệ góc – cạnh trong tam giác vuông (cạnh huyền lớn nhất).`,
    R`Lấy đoạn xiên làm khoảng cách; quên trường hợp $A\in d$ (khoảng cách 0).`);
  K('7-C5-B6',
    R`Ba đường trung tuyến đồng quy tại trọng tâm $G$: $AG=\dfrac23AM$, $GM=\dfrac13AM$. Ba đường phân giác đồng quy tại điểm cách đều ba cạnh (tâm đường tròn nội tiếp). Ba đường trung trực đồng quy tại điểm cách đều ba đỉnh (tâm đường tròn ngoại tiếp). Ba đường cao đồng quy tại trực tâm $H$. Trong tam giác cân, đường trung tuyến ứng với đáy đồng thời là đường cao, phân giác, trung trực.`,
    R`Nhận diện đúng loại đường (trung tuyến nối đỉnh với TRUNG ĐIỂM cạnh đối diện); dùng tỉ lệ $\dfrac23$ của trọng tâm để tính độ dài.`,
    R`Nhầm trọng tâm với trực tâm; dùng $AG=\dfrac12AM$; cho rằng giao ba phân giác cách đều ba đỉnh.`);
  K('7-C10-B1',
    R`Hình hộp chữ nhật kích thước $a$, $b$, $c$: 6 mặt hình chữ nhật, 12 cạnh, 8 đỉnh; $S_{xq}=2(a+b)c$; $V=abc$. Hình lập phương cạnh $a$: 6 mặt hình vuông; $S_{xq}=4a^2$; $S_{tp}=6a^2$; $V=a^3$.`,
    R`Bài thực tế: thể tích bể nước (đổi $1\text{ dm}^3=1$ lít), diện tích cần sơn (thường là xung quanh + đáy, trừ cửa).`,
    R`Không đổi cùng đơn vị; nhầm $S_{xq}$ với diện tích toàn phần; $1\text{ m}^3=100$ lít (đúng là 1000 lít).`);
  K('7-C10-B2',
    R`Hình lăng trụ đứng tam giác/tứ giác: hai đáy song song và bằng nhau, các mặt bên là hình chữ nhật, cạnh bên là chiều cao. $S_{xq}=C_{đáy}\cdot h$; $V=S_{đáy}\cdot h$.`,
    R`Tính diện tích đáy trước (tam giác, hình thang…), rồi nhân chiều cao lăng trụ; phân biệt chiều cao của đáy và chiều cao lăng trụ.`,
    R`Dùng chiều cao tam giác đáy làm chiều cao lăng trụ; quên $\tfrac12$ khi tính diện tích đáy tam giác.`);

  // ======================================================================
  // LỚP 8
  // ======================================================================
  K('8-C1-B1',
    R`Đơn thức: một số, một biến hoặc tích giữa các số và biến. Đơn thức thu gọn: hệ số và phần biến (mỗi biến xuất hiện một lần, số mũ nguyên dương). Bậc: tổng số mũ các biến. Đơn thức đồng dạng: hệ số khác 0, cùng phần biến; cộng/trừ đơn thức đồng dạng: cộng/trừ hệ số, giữ phần biến.`,
    R`Thu gọn trước rồi xác định hệ số, phần biến, bậc; tính giá trị: thay số sau khi thu gọn.`,
    R`Bậc của $5x^2y^3$ là 3 (sai: là 5); cộng hai đơn thức không đồng dạng; số 0 có bậc 0 (sai: không có bậc).`);
  K('8-C1-B2',
    R`Đa thức: tổng các đơn thức (hạng tử). Thu gọn: cộng các hạng tử đồng dạng. Bậc của đa thức: bậc của hạng tử có bậc cao nhất trong dạng thu gọn.`,
    R`Thu gọn rồi xác định bậc; tính giá trị tại $x$, $y$ cho trước.`,
    R`Xác định bậc khi chưa thu gọn; nhầm bậc đa thức với số hạng tử.`);
  K('8-C1-B3',
    R`Cộng/trừ đa thức: bỏ ngoặc (trước ngoặc có dấu "−" thì đổi dấu MỌI hạng tử), nhóm hạng tử đồng dạng, thu gọn.`,
    R`Viết thẳng hàng các hạng tử đồng dạng; tìm đa thức $A$ biết $A+B=C$ thì $A=C-B$.`,
    R`Chỉ đổi dấu hạng tử đầu tiên; cộng $x^2$ với $x$.`);
  K('8-C1-B4',
    R`Nhân đơn thức với đa thức: $A(B+C)=AB+AC$; nhân đa thức với đa thức: nhân mỗi hạng tử của đa thức này với từng hạng tử của đa thức kia rồi cộng. Chia đơn thức cho đơn thức: $A\chiahet B$ khi mỗi biến của $B$ có trong $A$ với số mũ không lớn hơn; chia đa thức cho đơn thức: chia từng hạng tử.`,
    R`Nhân rồi thu gọn; chứng minh biểu thức không phụ thuộc biến: rút gọn còn hằng số; tìm $x$: rút gọn hai vế.`,
    R`Quên nhân hết các hạng tử; sai dấu khi nhân số âm; $x^3:x^3=0$ (đúng là 1).`);
  K('8-C2-B1',
    R`Bảy hằng đẳng thức đáng nhớ: $(A+B)^2=A^2+2AB+B^2$; $(A-B)^2=A^2-2AB+B^2$; $A^2-B^2=(A-B)(A+B)$; $(A+B)^3=A^3+3A^2B+3AB^2+B^3$; $(A-B)^3=A^3-3A^2B+3AB^2-B^3$; $A^3+B^3=(A+B)(A^2-AB+B^2)$; $A^3-B^3=(A-B)(A^2+AB+B^2)$.`,
    R`Nhận dạng $A$, $B$ trước khi khai triển; chiều ngược: viết đa thức thành bình phương/lập phương; tính nhanh: $99^2=(100-1)^2$, $101\cdot99=100^2-1$.`,
    R`$(A+B)^2=A^2+B^2$ (thiếu $2AB$); $(2x)^2=2x^2$; nhầm $A^2-AB+B^2$ với $(A-B)^2$ trong tổng/hiệu hai lập phương.`);
  K('8-C2-B2',
    R`Phân tích đa thức thành nhân tử: biến thành tích. Phương pháp: đặt nhân tử chung; dùng hằng đẳng thức; nhóm hạng tử (nhóm sao cho mỗi nhóm có nhân tử chung, rồi có nhân tử chung giữa các nhóm); phối hợp nhiều phương pháp.`,
    R`Luôn thử đặt nhân tử chung trước; nhóm thử nhiều cách; kiểm tra bằng cách nhân lại. Ứng dụng: giải $A\cdot B=0\Leftrightarrow A=0$ hoặc $B=0$; tính nhanh.`,
    R`Phân tích chưa triệt để (còn nhân tử phân tích được); đặt nhân tử chung bỏ sót hạng tử "1": $x^2+x=x(x+1)$, không phải $x\cdot x$.`);
  K('8-C5-B1',
    R`Tứ giác $ABCD$ (tứ giác lồi); tổng các góc của tứ giác bằng $360^\circ$.`,
    R`Tính góc còn lại $=360^\circ-$ tổng ba góc; dùng góc ngoài (kề bù với góc trong).`,
    R`Dùng $180^\circ$ như tam giác; đặt tên tứ giác không theo thứ tự đỉnh liên tiếp.`);
  K('8-C5-B2',
    R`Hình thang: tứ giác có hai cạnh đối song song; hình thang vuông có một góc vuông. Hình thang cân: hình thang có hai góc kề một đáy bằng nhau; tính chất: hai cạnh bên bằng nhau, hai đường chéo bằng nhau. Dấu hiệu: hình thang có hai đường chéo bằng nhau là hình thang cân.`,
    R`Chứng minh hình thang cân: chứng minh là hình thang rồi chỉ ra hai góc kề một đáy bằng nhau hoặc hai đường chéo bằng nhau.`,
    R`Hình thang có hai cạnh bên bằng nhau chưa chắc là hình thang cân (có thể là hình bình hành).`);
  K('8-C5-B3',
    R`Hình bình hành: tứ giác có các cạnh đối song song. Tính chất: các cạnh đối bằng nhau, các góc đối bằng nhau, hai đường chéo cắt nhau tại trung điểm mỗi đường. Dấu hiệu: các cạnh đối bằng nhau; hai cạnh đối song song và bằng nhau; các góc đối bằng nhau; hai đường chéo cắt nhau tại trung điểm mỗi đường.`,
    R`Chọn dấu hiệu phù hợp dữ kiện; thường đi qua chứng minh hai tam giác bằng nhau hoặc trung điểm.`,
    R`Chỉ một cặp cạnh đối bằng nhau đã kết luận; hai cạnh đối song song và hai cạnh kia bằng nhau (có thể là hình thang cân).`);
  K('8-C5-B4',
    R`Hình chữ nhật: tứ giác có 4 góc vuông; là hình bình hành có hai đường chéo bằng nhau / có một góc vuông. Trong tam giác vuông, trung tuyến ứng với cạnh huyền bằng nửa cạnh huyền. Hình thoi: 4 cạnh bằng nhau; hai đường chéo vuông góc, là phân giác các góc; dấu hiệu: hình bình hành có hai cạnh kề bằng nhau / hai đường chéo vuông góc / một đường chéo là phân giác. Hình vuông: vừa là hình chữ nhật vừa là hình thoi; dấu hiệu: hình chữ nhật có hai cạnh kề bằng nhau / đường chéo vuông góc / đường chéo là phân giác; hình thoi có một góc vuông / hai đường chéo bằng nhau.`,
    R`Thường chứng minh hình bình hành trước rồi thêm một dấu hiệu; dùng tính chất trung tuyến tam giác vuông.`,
    R`Tứ giác có hai đường chéo vuông góc đã là hình thoi (phải là hình bình hành); tứ giác có hai đường chéo bằng nhau đã là hình chữ nhật.`);
  K('8-C6-B1',
    R`Định lí Thalès: đường thẳng song song với một cạnh của tam giác, cắt hai cạnh còn lại thì định ra những đoạn thẳng tương ứng tỉ lệ: $DE\parallel BC$ ⇒ $\dfrac{AD}{AB}=\dfrac{AE}{AC}$, $\dfrac{AD}{DB}=\dfrac{AE}{EC}$. Định lí đảo: đoạn tương ứng tỉ lệ thì song song. Hệ quả: $\dfrac{AD}{AB}=\dfrac{AE}{AC}=\dfrac{DE}{BC}$. Tính chất đường phân giác: $AD$ là phân giác của $\widehat{BAC}$ thì $\dfrac{DB}{DC}=\dfrac{AB}{AC}$.`,
    R`Lập đúng tỉ số tương ứng rồi nhân chéo tìm độ dài; chứng minh song song bằng định lí đảo; độ dài cạnh đáy song song chỉ dùng HỆ QUẢ (tỉ số với cả cạnh $AB$, không phải $DB$).`,
    R`Viết $\dfrac{AD}{DB}=\dfrac{DE}{BC}$ (sai); đặt sai cặp đoạn tương ứng ở tính chất phân giác.`);
  K('8-C6-B2',
    R`Đường trung bình của tam giác: đoạn nối trung điểm hai cạnh; song song với cạnh thứ ba và bằng nửa cạnh đó. Đường thẳng qua trung điểm một cạnh, song song với cạnh thứ hai thì đi qua trung điểm cạnh thứ ba.`,
    R`Tìm hai trung điểm để có đường trung bình → suy ra song song và độ dài; kết hợp với hình bình hành, hình thang.`,
    R`Lấy đường trung bình bằng cạnh thứ ba; dùng cho đoạn nối trung điểm với điểm bất kì.`);
  K('8-C8-B1',
    R`Thu thập, phân loại dữ liệu: định tính / định lượng (rời rạc, liên tục). Biểu diễn bằng bảng thống kê, biểu đồ tranh, cột, cột kép, quạt tròn, đoạn thẳng; chuyển đổi giữa các dạng. Phân tích số liệu: nhận xét xu hướng, so sánh, phát hiện số liệu sai/không hợp lí và biểu đồ gây hiểu lầm (trục không bắt đầu từ 0…).`,
    R`Chọn biểu đồ: so sánh các phần với tổng → quạt tròn; thay đổi theo thời gian → đoạn thẳng; so sánh hai bộ → cột kép.`,
    R`Tổng phần trăm biểu đồ quạt khác $100\%$; kết luận vượt quá dữ liệu.`);
  K('8-C3-B1',
    R`Phân thức đại số $\dfrac AB$ ($A$, $B$ là đa thức, $B\ne0$); điều kiện xác định: mẫu khác 0. $\dfrac AB=\dfrac CD\Leftrightarrow AD=BC$. Tính chất cơ bản: nhân/chia cả tử và mẫu với cùng đa thức khác 0 (nhân tử chung); quy tắc đổi dấu $\dfrac AB=\dfrac{-A}{-B}$. Rút gọn: phân tích tử và mẫu thành nhân tử rồi chia cho nhân tử chung.`,
    R`Tìm ĐKXĐ trước; rút gọn: phân tích thành nhân tử; giá trị phân thức tại $x$ chỉ tính khi $x$ thỏa ĐKXĐ.`,
    R`Rút gọn các HẠNG TỬ thay vì NHÂN TỬ ($\dfrac{x+2}{x}=2$); quên ĐKXĐ hoặc tính giá trị tại $x$ làm mẫu bằng 0.`);
  K('8-C3-B2',
    R`Cộng/trừ: quy đồng mẫu (mẫu chung từ phân tích thành nhân tử), cộng/trừ tử; $\dfrac AB-\dfrac CD=\dfrac AB+\dfrac{-C}{D}$. Nhân: $\dfrac AB\cdot\dfrac CD=\dfrac{AC}{BD}$. Chia: $\dfrac AB:\dfrac CD=\dfrac AB\cdot\dfrac DC$ ($\dfrac CD\ne0$).`,
    R`Phân tích các mẫu thành nhân tử → mẫu chung → nhân tử phụ; luôn rút gọn kết quả; biểu thức nhiều phép tính: theo thứ tự phép tính.`,
    R`Trừ phân thức nhưng chỉ đổi dấu hạng tử đầu của tử; quên điều kiện của phân thức chia ($C\ne0$).`);
  K('8-C4-B1',
    R`Phương trình một ẩn; nghiệm; phương trình bậc nhất một ẩn $ax+b=0$ ($a\ne0$) có nghiệm duy nhất $x=-\dfrac ba$. Quy tắc chuyển vế (đổi dấu) và quy tắc nhân/chia hai vế với cùng số khác 0. Phương trình đưa được về dạng $ax+b=0$.`,
    R`Bỏ ngoặc, quy đồng khử mẫu, chuyển hạng tử chứa ẩn sang một vế, thu gọn, tìm $x$; thử lại bằng cách thay nghiệm vào phương trình ban đầu.`,
    R`Chuyển vế không đổi dấu; khử mẫu quên nhân hạng tử không có mẫu; $0x=5$ vẫn "chia cho 0".`);
  K('8-C4-B2',
    R`Giải bài toán bằng cách lập phương trình: (1) chọn ẩn, đơn vị, điều kiện của ẩn; (2) biểu diễn các đại lượng chưa biết theo ẩn; (3) lập phương trình; (4) giải; (5) đối chiếu điều kiện và trả lời. Chuyển động: $s=v\cdot t$; năng suất: khối lượng công việc $=$ năng suất $\cdot$ thời gian.`,
    R`Lập bảng (vận tốc – thời gian – quãng đường) để biểu diễn; chú ý xuôi dòng $v+v_n$, ngược dòng $v-v_n$; đổi phút ra giờ.`,
    R`Quên điều kiện ẩn (số người phải nguyên dương); không đổi đơn vị thời gian; trả lời thiếu đơn vị.`);
  K('8-C4-B3',
    R`Hàm số: mỗi giá trị của $x$ cho đúng một giá trị của $y$; kí hiệu $y=f(x)$, giá trị $f(a)$. Mặt phẳng tọa độ $Oxy$, tọa độ điểm $M(x_0;y_0)$ (dấu ";" ngăn cách). Đồ thị hàm số: tập hợp các điểm $(x;f(x))$.`,
    R`Tính $f(a)$ bằng cách thay; kiểm tra điểm thuộc đồ thị: thay tọa độ vào công thức; xác định tọa độ điểm trên hình.`,
    R`Đảo hoành độ với tung độ; một $x$ ứng hai $y$ vẫn coi là hàm số.`);
  K('8-C4-B4',
    R`Hàm số bậc nhất $y=ax+b$ ($a\ne0$); đồ thị là đường thẳng cắt trục tung tại $(0;b)$, song song với $y=ax$ nếu $b\ne0$. Hệ số góc $a$ ($a>0$: góc tạo với $Ox$ nhọn; $a<0$: tù). Hai đường thẳng $y=ax+b$ và $y=a'x+b'$: song song ⇔ $a=a'$, $b\ne b'$; trùng ⇔ $a=a'$, $b=b'$; cắt nhau ⇔ $a\ne a'$.`,
    R`Vẽ đồ thị: lấy hai điểm (thường là giao với hai trục); tìm $a$, $b$ từ điều kiện song song/đi qua điểm; tìm giao điểm: giải phương trình hoành độ $ax+b=a'x+b'$.`,
    R`Quên $a\ne0$ khi tìm tham số; song song nhưng không kiểm tra $b\ne b'$; nhầm hệ số góc với tung độ gốc.`);
  K('8-C8-B2',
    R`Kết quả có thể, kết quả thuận lợi cho biến cố $E$. Khi các kết quả đồng khả năng: $P(E)=\dfrac{\text{số kết quả thuận lợi cho } E}{\text{số kết quả có thể}}$. Liên hệ: khi số lần thử rất lớn, xác suất thực nghiệm xấp xỉ xác suất lí thuyết, dùng để ước lượng xác suất.`,
    R`Liệt kê không gian kết quả cẩn thận (bảng hai chiều khi gieo 2 xúc xắc: 36 kết quả); đếm thuận lợi; ước lượng số lượng $\approx P\cdot$ tổng.`,
    R`Không kiểm tra đồng khả năng; đếm thiếu/trùng kết quả; nhầm "ít nhất" với "đúng".`);
  K('8-C6-B3',
    R`$\triangle A'B'C'\backsim\triangle ABC$: góc tương ứng bằng nhau, cạnh tương ứng tỉ lệ, tỉ số đồng dạng $k=\dfrac{A'B'}{AB}$; viết đúng thứ tự đỉnh. Định lí: đường thẳng song song một cạnh cắt hai cạnh kia tạo tam giác đồng dạng với tam giác đã cho. Trường hợp đồng dạng: c.c.c; c.g.c (hai cạnh tỉ lệ, góc xen giữa bằng nhau); g.g (hai góc bằng nhau). Tam giác vuông: một góc nhọn bằng nhau; hai cạnh góc vuông tỉ lệ; cạnh huyền và cạnh góc vuông tỉ lệ. Tỉ số chu vi bằng $k$, tỉ số diện tích bằng $k^2$. Hình đồng dạng (phối cảnh).`,
    R`Chứng minh đồng dạng (thường g.g) → suy ra tỉ lệ cạnh → nhân chéo được hệ thức dạng $AB^2=BH\cdot BC$ hay tính độ dài.`,
    R`Viết sai thứ tự đỉnh nên lập sai tỉ số; tỉ số diện tích bằng $k$ (đúng là $k^2$); dùng c.g.c với góc không xen giữa.`);
  K('8-C6-B4',
    R`Định lí Pythagore: $\triangle ABC$ vuông tại $A$ ⇒ $BC^2=AB^2+AC^2$. Định lí đảo: $BC^2=AB^2+AC^2$ ⇒ tam giác vuông tại $A$ (đỉnh đối diện cạnh lớn nhất).`,
    R`Tính cạnh huyền $=\sqrt{\text{tổng bình phương}}$, cạnh góc vuông $=\sqrt{\text{huyền}^2-\text{cạnh kia}^2}$; kiểm tra tam giác vuông: so bình phương cạnh lớn nhất với tổng bình phương hai cạnh kia. Ứng dụng: khoảng cách, thang dựa tường, đường chéo hình chữ nhật.`,
    R`Cộng bình phương nhưng quên khai căn; dùng cạnh huyền như cạnh góc vuông; kiểm tra đảo nhưng không lấy cạnh lớn nhất.`);
  K('8-C7-B1',
    R`Hình chóp tam giác đều: đáy là tam giác đều, các mặt bên là tam giác cân bằng nhau. Hình chóp tứ giác đều: đáy là hình vuông. Trung đoạn $d$: đường cao của mặt bên kẻ từ đỉnh. $S_{xq}=p\cdot d$ ($p$ là nửa chu vi đáy); $V=\dfrac13S_{đáy}\cdot h$.`,
    R`Phân biệt chiều cao hình chóp $h$ và trung đoạn $d$; tính trung đoạn bằng định lí Pythagore khi cần.`,
    R`Dùng cả chu vi thay vì nửa chu vi; quên $\tfrac13$ trong thể tích; nhầm $h$ với $d$.`);

  // ======================================================================
  // LỚP 9
  // ======================================================================
  K('9-C1-B2',
    R`Phương trình bậc nhất hai ẩn $ax+by=c$ ($a$, $b$ không đồng thời bằng 0); mỗi nghiệm là cặp $(x_0;y_0)$; có vô số nghiệm, biểu diễn bởi một đường thẳng. Hệ hai phương trình bậc nhất hai ẩn; nghiệm của hệ là nghiệm chung.`,
    R`Kiểm tra cặp số là nghiệm: thay vào cả hai phương trình; viết nghiệm tổng quát: rút $y$ theo $x$.`,
    R`Chỉ kiểm tra một phương trình của hệ; viết nghiệm $(y;x)$ đảo thứ tự.`);
  K('9-C1-B3',
    R`Giải hệ bằng phương pháp thế (rút một ẩn từ một phương trình thế vào phương trình kia) hoặc phương pháp cộng đại số (nhân hai vế để hệ số một ẩn bằng nhau hoặc đối nhau rồi cộng/trừ). Hệ có thể có một nghiệm, vô nghiệm hoặc vô số nghiệm. Dùng máy tính cầm tay để kiểm tra.`,
    R`Chọn ẩn có hệ số $\pm1$ để thế; sau khi tìm một ẩn, thay ngược lấy ẩn còn lại; kết luận "Vậy hệ có nghiệm $(x;y)=(\dots;\dots)$" và thử lại.`,
    R`Trừ hai phương trình nhưng chỉ trừ vế trái; nhân một vế mà quên vế kia; kết luận vô nghiệm sai khi được $0x=0$ (vô số nghiệm).`);
  K('9-C1-B4',
    R`Giải bài toán bằng cách lập hệ phương trình: chọn hai ẩn (đơn vị, điều kiện), biểu diễn đại lượng, lập hai phương trình từ hai điều kiện, giải hệ, đối chiếu điều kiện, trả lời. Dạng: chuyển động, làm chung – làm riêng (năng suất $\dfrac1x$ công việc/ngày), số có hai chữ số $\overline{ab}=10a+b$, phần trăm.`,
    R`Làm chung: nếu một mình làm xong trong $x$ ngày thì một ngày làm được $\dfrac1x$ công việc; lập bảng dữ kiện.`,
    R`Quên điều kiện ẩn ($x>$ thời gian làm chung); $\overline{ab}=a+b$.`);
  K('9-C1-B1',
    R`Phương trình tích $A\cdot B=0\Leftrightarrow A=0$ hoặc $B=0$. Phương trình chứa ẩn ở mẫu: (1) tìm điều kiện xác định; (2) quy đồng, khử mẫu; (3) giải; (4) đối chiếu điều kiện, loại giá trị không thỏa.`,
    R`Đưa về phương trình tích bằng phân tích nhân tử (chuyển hết sang một vế, không chia hai vế cho biểu thức chứa ẩn).`,
    R`Chia hai vế cho $x$ làm mất nghiệm $x=0$; quên đối chiếu ĐKXĐ.`);
  K('9-C2-B1',
    R`Bất đẳng thức $a<b$, $a\le b$; tính chất bắc cầu; cộng cùng một số vào hai vế giữ chiều; nhân hai vế với số dương giữ chiều, với số âm ĐỔI chiều. Cộng hai bất đẳng thức cùng chiều.`,
    R`Chứng minh $a\ge b$: xét hiệu $a-b\ge0$ (thường đưa về bình phương $\ge0$); so sánh hai số bằng biến đổi tương đương.`,
    R`Nhân với số âm mà không đổi chiều; trừ hai bất đẳng thức cùng chiều.`);
  K('9-C2-B2',
    R`Bất phương trình bậc nhất một ẩn $ax+b<0$ (hoặc $>$, $\le$, $\ge$), $a\ne0$. Giải: chuyển vế (đổi dấu), chia hai vế cho $a$ (đổi chiều nếu $a<0$). Kết luận nghiệm dạng $x<\dots$ hoặc $x>\dots$.`,
    R`Bỏ ngoặc, khử mẫu (nhân với mẫu chung dương), thu gọn rồi giải; bài thực tế: lập bất phương trình từ "không quá", "ít nhất".`,
    R`Không đổi chiều khi chia cho số âm; nhầm "không quá" ($\le$) với "nhỏ hơn" ($<$).`);
  K('9-C3-B1',
    R`Căn bậc hai của $a\ge0$: số $x$ với $x^2=a$; $a>0$ có hai căn bậc hai $\pm\sqrt a$; căn bậc hai số học $\sqrt a\ge0$. Căn thức bậc hai $\sqrt A$ xác định khi $A\ge0$. $\sqrt{A^2}=|A|$. Căn bậc ba: $\sqrt[3]{a}=x\Leftrightarrow x^3=a$ (mọi số thực đều có đúng một căn bậc ba).`,
    R`Tìm điều kiện xác định: biểu thức dưới căn $\ge0$, mẫu $\ne0$; khai căn bình phương dùng giá trị tuyệt đối rồi xét dấu.`,
    R`$\sqrt{A^2}=A$ (thiếu trị tuyệt đối); $\sqrt{9}=\pm3$; cho rằng số âm không có căn bậc ba.`);
  K('9-C3-B2',
    R`$\sqrt{AB}=\sqrt A\cdot\sqrt B$ ($A,B\ge0$); $\sqrt{\dfrac AB}=\dfrac{\sqrt A}{\sqrt B}$ ($A\ge0$, $B>0$). Đưa thừa số ra ngoài dấu căn $\sqrt{A^2B}=|A|\sqrt B$; đưa vào trong. Khử mẫu của biểu thức lấy căn; trục căn thức ở mẫu: $\dfrac{1}{\sqrt a}=\dfrac{\sqrt a}{a}$, $\dfrac{1}{\sqrt a+\sqrt b}=\dfrac{\sqrt a-\sqrt b}{a-b}$. Rút gọn biểu thức chứa căn.`,
    R`Rút gọn: tìm ĐKXĐ, phân tích tử/mẫu (đặt $\sqrt x=t$ khi thuận tiện), quy đồng, rút gọn; bài phụ: tính giá trị, tìm $x$ để biểu thức thỏa điều kiện (đối chiếu ĐKXĐ).`,
    R`$\sqrt{a+b}=\sqrt a+\sqrt b$; quên điều kiện $x\ge0$, $x\ne$ giá trị làm mẫu bằng 0; nhân liên hợp sai dấu.`);
  K('9-C4-B1',
    R`Tam giác vuông, góc nhọn $\alpha$: $\sin\alpha=\dfrac{\text{đối}}{\text{huyền}}$, $\cos\alpha=\dfrac{\text{kề}}{\text{huyền}}$, $\tan\alpha=\dfrac{\text{đối}}{\text{kề}}$, $\cot\alpha=\dfrac{\text{kề}}{\text{đối}}$. Hai góc phụ nhau: $\sin\alpha=\cos(90^\circ-\alpha)$, $\tan\alpha=\cot(90^\circ-\alpha)$. Giá trị đặc biệt $30^\circ$, $45^\circ$, $60^\circ$ ($\sin30^\circ=\tfrac12$, $\sin45^\circ=\tfrac{\sqrt2}{2}$, $\sin60^\circ=\tfrac{\sqrt3}{2}$). $0<\sin\alpha,\cos\alpha<1$.`,
    R`Xác định đúng cạnh đối/kề so với góc đang xét; dùng máy tính (chế độ độ – Deg), làm tròn theo yêu cầu.`,
    R`Lấy cạnh đối/kề theo góc khác; $\sin\alpha>1$; máy tính để chế độ Rad.`);
  K('9-C4-B2',
    R`Tam giác $ABC$ vuông tại $A$, cạnh huyền $a=BC$, các cạnh góc vuông $b=AC$, $c=AB$: $b=a\sin B=a\cos C$; $c=a\sin C=a\cos B$; $b=c\tan B=c\cot C$; $c=b\tan C=b\cot B$. Giải tam giác vuông: tìm các cạnh, góc còn lại. Ứng dụng: chiều cao, khoảng cách (góc nâng, góc hạ). Lưu ý: SGK KNTT không dạy hệ thức về đường cao ($h^2=b'c'$…); cần thì chứng minh qua tam giác đồng dạng.`,
    R`Vẽ hình, đánh dấu góc biết; chọn tỉ số chứa cạnh biết và cạnh cần tìm; góc còn lại $=90^\circ-$ góc đã biết.`,
    R`Dùng hệ thức với cạnh không phải cạnh huyền; làm tròn quá sớm ở bước trung gian.`);
  K('9-C5-B1',
    R`Đường tròn $(O;R)$: tập hợp các điểm cách $O$ một khoảng $R$; vị trí điểm: $OM<R$ (trong), $=R$ (trên), $>R$ (ngoài). Tâm đối xứng là $O$, trục đối xứng là mọi đường kính. Dây cung; đường kính là dây lớn nhất; đường kính vuông góc với dây thì đi qua trung điểm dây. Vị trí hai đường tròn $(O;R)$, $(O';r)$, $d=OO'$: cắt nhau $R-r<d<R+r$; tiếp xúc ngoài $d=R+r$; tiếp xúc trong $d=R-r$; ngoài nhau $d>R+r$; đựng nhau $d<R-r$.`,
    R`So sánh khoảng cách với bán kính; dây – khoảng cách từ tâm: dùng Pythagore với nửa dây.`,
    R`Nhầm tiếp xúc trong với tiếp xúc ngoài; quên điều kiện $R>r$ khi dùng $R-r$.`);
  K('9-C5-B2',
    R`Vị trí đường thẳng $a$ và $(O;R)$, $d$ là khoảng cách từ $O$ đến $a$: cắt nhau $d<R$, tiếp xúc $d=R$, không giao nhau $d>R$. Tiếp tuyến vuông góc với bán kính tại tiếp điểm; dấu hiệu: đường thẳng đi qua một điểm của đường tròn và vuông góc với bán kính tại điểm đó. Hai tiếp tuyến cắt nhau tại $M$: $MA=MB$, $MO$ là phân giác của $\widehat{AMB}$ và của $\widehat{AOB}$.`,
    R`Chứng minh tiếp tuyến: chỉ ra $OA\perp a$ tại $A\in(O)$; tính độ dài tiếp tuyến bằng Pythagore trong $\triangle OAM$ vuông tại $A$.`,
    R`Chỉ chứng minh vuông góc mà quên điểm thuộc đường tròn; lấy $MA$ bằng $MO$.`);
  K('9-C5-B3',
    R`Góc ở tâm: đỉnh trùng tâm; số đo cung nhỏ bằng số đo góc ở tâm chắn cung đó, cung lớn $=360^\circ-$ cung nhỏ, nửa đường tròn $180^\circ$; kí hiệu cung $\overarc{AB}$. Góc nội tiếp: đỉnh nằm trên đường tròn, hai cạnh chứa hai dây; số đo bằng nửa số đo cung bị chắn; các góc nội tiếp cùng chắn một cung thì bằng nhau; góc nội tiếp chắn nửa đường tròn là góc vuông; góc nội tiếp (không quá $90^\circ$) bằng nửa góc ở tâm cùng chắn một cung.`,
    R`Quy về cung bị chắn: góc nội tiếp $=\dfrac12$ cung; chứng minh góc vuông bằng "chắn nửa đường tròn".`,
    R`Lấy góc nội tiếp bằng góc ở tâm; xác định nhầm cung bị chắn (cung nằm trong góc).`);
  K('9-C5-B4',
    R`Chu vi đường tròn $C=2\pi R$; độ dài cung $n^\circ$: $l=\dfrac{\pi Rn}{180}$. Diện tích hình tròn $S=\pi R^2$; hình quạt tròn $n^\circ$: $S=\dfrac{\pi R^2n}{360}=\dfrac{lR}{2}$; hình vành khuyên: $S=\pi(R^2-r^2)$.`,
    R`Xác định số đo cung $n$ (từ góc ở tâm); giữ $\pi$ đến cuối rồi mới làm tròn nếu đề yêu cầu.`,
    R`Dùng đường kính thay bán kính; nhầm 180 và 360 giữa độ dài cung và diện tích quạt.`);
  K('9-C6-B1',
    R`Hàm số $y=ax^2$ ($a\ne0$): đồ thị là parabol đỉnh $O$, đối xứng qua trục $Oy$; $a>0$ thì đồ thị nằm phía trên trục hoành, $O$ là điểm thấp nhất; $a<0$ nằm phía dưới, $O$ là điểm cao nhất.`,
    R`Lập bảng giá trị đối xứng ($x=-2;-1;0;1;2$), vẽ parabol; tìm $a$ khi biết điểm thuộc đồ thị; điểm có hoành độ cho trước: thay vào tính tung độ.`,
    R`Thay $x=-2$ được $y=a\cdot(-4)$; nối các điểm thành đường gấp khúc.`);
  K('9-C6-B2',
    R`Phương trình bậc hai $ax^2+bx+c=0$ ($a\ne0$). $\Delta=b^2-4ac$: $\Delta>0$ hai nghiệm phân biệt $x_{1,2}=\dfrac{-b\pm\sqrt\Delta}{2a}$; $\Delta=0$ nghiệm kép $x=-\dfrac{b}{2a}$; $\Delta<0$ vô nghiệm. Với $b=2b'$: $\Delta'=b'^2-ac$, $x_{1,2}=\dfrac{-b'\pm\sqrt{\Delta'}}{a}$. Dạng khuyết $b$ hoặc $c$: đưa về tích hoặc $x^2=k$. Giải bài toán bằng cách lập phương trình bậc hai (đối chiếu điều kiện, loại nghiệm không phù hợp).`,
    R`Xác định đúng $a$, $b$, $c$ (kể cả dấu) sau khi đưa về dạng chuẩn; $ac<0$ thì luôn có hai nghiệm trái dấu; thử lại nghiệm.`,
    R`Lấy sai dấu $b$, $c$; quên $2a$ ở mẫu (chỉ chia 2); giữ nghiệm âm cho đại lượng phải dương.`);
  K('9-C6-B3',
    R`Định lí Viète: phương trình $ax^2+bx+c=0$ có hai nghiệm $x_1$, $x_2$ thì $x_1+x_2=-\dfrac ba$, $x_1x_2=\dfrac ca$. Nhẩm nghiệm: $a+b+c=0$ thì $x_1=1$, $x_2=\dfrac ca$; $a-b+c=0$ thì $x_1=-1$, $x_2=-\dfrac ca$. Hai số có tổng $S$, tích $P$ (với $S^2\ge4P$) là nghiệm của $x^2-Sx+P=0$.`,
    R`Trước khi dùng Viète phải chắc phương trình có nghiệm ($\Delta\ge0$); biến đổi biểu thức đối xứng: $x_1^2+x_2^2=(x_1+x_2)^2-2x_1x_2$.`,
    R`Quên dấu trừ ở $x_1+x_2=-\dfrac ba$; dùng Viète khi $\Delta<0$; tìm tham số không đối chiếu điều kiện có nghiệm.`);
  K('9-C7-B1',
    R`Tần số $n_i$: số lần xuất hiện giá trị $x_i$; bảng tần số, biểu đồ tần số (cột/đoạn thẳng). Tần số tương đối $f_i=\dfrac{n_i}{N}\cdot100\%$ ($N$ là cỡ mẫu), tổng các $f_i$ bằng $100\%$; biểu đồ tần số tương đối (cột, quạt tròn). Mẫu số liệu ghép nhóm: nhóm $[a;b)$, tần số nhóm, tần số tương đối nhóm; biểu đồ tần số tương đối ghép nhóm (dạng cột/đoạn thẳng).`,
    R`Đếm cẩn thận theo bảng gạch; kiểm tra tổng tần số bằng $N$ và tổng tần số tương đối bằng $100\%$; giá trị ở biên thuộc nhóm có đầu mút trái bằng nó.`,
    R`Chia cho số giá trị khác nhau thay vì cỡ mẫu $N$; đếm giá trị biên vào hai nhóm.`);
  K('9-C8-B1',
    R`Phép thử ngẫu nhiên, không gian mẫu $\Omega$ (tập hợp tất cả kết quả có thể); biến cố là tập con. Khi các kết quả đồng khả năng: $P(A)=\dfrac{n(A)}{n(\Omega)}$. Liệt kê bằng bảng (hai lần gieo/rút) hoặc sơ đồ cây.`,
    R`Viết rõ $\Omega$ và số phần tử; phân biệt rút có hoàn lại / không hoàn lại; đếm kết quả thuận lợi.`,
    R`Coi $(1;2)$ và $(2;1)$ là một khi thứ tự có ý nghĩa; quên điều kiện đồng khả năng.`);
  K('9-C9-B1',
    R`Đường tròn ngoại tiếp tam giác: đi qua 3 đỉnh, tâm là giao ba đường trung trực; tam giác vuông: tâm là trung điểm cạnh huyền; tam giác đều cạnh $a$: $R=\dfrac{a\sqrt3}{3}$, $r=\dfrac{a\sqrt3}{6}$. Đường tròn nội tiếp: tiếp xúc ba cạnh, tâm là giao ba đường phân giác. Tứ giác nội tiếp: bốn đỉnh thuộc một đường tròn; tổng hai góc đối bằng $180^\circ$; ngược lại tứ giác có tổng hai góc đối bằng $180^\circ$ thì nội tiếp. Hình chữ nhật, hình vuông, hình thang cân nội tiếp được.`,
    R`Chứng minh tứ giác nội tiếp: tổng hai góc đối $180^\circ$, hoặc bốn đỉnh cách đều một điểm, hoặc hai đỉnh kề cùng nhìn cạnh nối hai đỉnh còn lại dưới hai góc vuông (cùng thuộc đường tròn đường kính).`,
    R`Lấy hai góc đối BẰNG nhau (thay vì BÙ nhau) làm dấu hiệu; nhầm tâm ngoại tiếp (trung trực) với tâm nội tiếp (phân giác).`);
  K('9-C9-B2',
    R`Đa giác đều: tất cả cạnh bằng nhau, tất cả góc bằng nhau; mỗi góc của $n$-giác đều bằng $\dfrac{(n-2)\cdot180^\circ}{n}$. Phép quay tâm $O$ góc $\alpha$; phép quay giữ nguyên đa giác đều tâm $O$: các góc $\dfrac{360^\circ}{n}\cdot k$.`,
    R`Tính góc, đếm phép quay; nhận biết hình có tính đối xứng quay trong thực tế.`,
    R`Dùng $\dfrac{360^\circ}{n}$ làm số đo góc trong của đa giác (đó là góc ở tâm).`);
  K('9-C10-B1',
    R`Hình trụ bán kính đáy $r$, chiều cao $h$: $S_{xq}=2\pi rh$; $S_{tp}=2\pi rh+2\pi r^2$; $V=\pi r^2h$.`,
    R`Đọc kĩ đề cho bán kính hay đường kính; đổi cùng đơn vị; bài thực tế (cốc, bể, ống nước).`,
    R`Dùng đường kính làm bán kính; thể tích $V=2\pi rh$.`);
  K('9-C10-B2',
    R`Hình nón bán kính đáy $r$, đường sinh $l$, chiều cao $h$: $l^2=r^2+h^2$; $S_{xq}=\pi rl$; $S_{tp}=\pi rl+\pi r^2$; $V=\dfrac13\pi r^2h$.`,
    R`Tính đường sinh hoặc chiều cao bằng định lí Pythagore trước khi dùng công thức.`,
    R`Nhầm $l$ với $h$; quên $\dfrac13$ trong thể tích.`);
  K('9-C10-B3',
    R`Hình cầu bán kính $R$: $S=4\pi R^2$; $V=\dfrac43\pi R^3$. Mặt cắt qua tâm là hình tròn bán kính $R$.`,
    R`Đổi đường kính ra bán kính; so sánh thể tích khi bán kính gấp $k$ lần (thể tích gấp $k^3$).`,
    R`$S=\pi R^2$; $V=\dfrac43\pi R^2$.`);

  /** Khối kiến thức dạng chữ để chèn vào prompt; '' nếu không có chủ đề. */
  function forTopic(topicId) {
    const t = T[String(topicId || '')];
    if (!t) return '';
    return 'Kiến thức: ' + t.kt + '\nCách làm: ' + t.pp + '\nDễ sai: ' + t.sai;
  }

  return { VERSION: VERSION, TOPICS: T, forTopic: forTopic };
});
