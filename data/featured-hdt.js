/**
 * Nội dung dùng thử: "Hằng đẳng thức đáng nhớ" (Toán 8, Chương II).
 *
 * File được sinh bởi gen_hdt.py — mọi đáp án và ví dụ đã được kiểm bằng
 * sympy. Nạp ngay sau data/questions.js: thay toàn bộ câu hỏi và lý thuyết
 * của chủ đề 8-C2-B1 bằng bộ biên soạn lại (lý thuyết đủ 7 hằng đẳng thức,
 * 24 câu trắc nghiệm tăng dần từ nhận biết đến vận dụng cao).
 */
(function () {
  'use strict';
  var BANK = window.AM_QUESTION_BANK;
  if (!BANK || !Array.isArray(BANK.questions)) return;
  var TOPIC = "8-C2-B1";
  var QUESTIONS = [
 {
  "id": "8-C2-B1::hdt01",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "N",
  "status": "ok",
  "prompt": "Khai triển $(x+3)^2$ ta được",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -1.875,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Áp dụng $(A+B)^2=A^2+2AB+B^2$ với $A=x,\\ B=3$:\\\\ $(x+3)^2=x^2+2\\cdot x\\cdot 3+3^2=x^2+6x+9$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$x^2+9$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$x^2+6x+9$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$x^2+3x+9$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$x^2-6x+9$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt02",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "N",
  "status": "ok",
  "prompt": "Khai triển $(2x-1)^2$ ta được",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -1.725,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Áp dụng $(A-B)^2=A^2-2AB+B^2$ với $A=2x,\\ B=1$:\\\\ $(2x-1)^2=(2x)^2-2\\cdot 2x\\cdot 1+1^2=4x^2-4x+1$.\\\\ Chú ý: $(2x)^2=4x^2$ chứ không phải $2x^2$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$4x^2-4x+1$",
    "isCorrect": true
   },
   {
    "label": "B",
    "content": "$4x^2-2x+1$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$2x^2-4x+1$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$4x^2-1$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt03",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "N",
  "status": "ok",
  "prompt": "Biểu thức $x^2-16$ viết thành tích là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -1.575,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Hiệu hai bình phương: $A^2-B^2=(A-B)(A+B)$.\\\\ $x^2-16=x^2-4^2=(x-4)(x+4)$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$(x-4)^2$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$(x-16)(x+16)$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$(x-4)(x+4)$",
    "isCorrect": true
   },
   {
    "label": "D",
    "content": "$(x+4)^2$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt04",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "N",
  "status": "ok",
  "prompt": "Khai triển $(a+b)^3$ ta được",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -1.425,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Lập phương của một tổng: $(A+B)^3=A^3+3A^2B+3AB^2+B^3$.\\\\ Hệ số lần lượt là $1,\\ 3,\\ 3,\\ 1$ và đều mang dấu cộng.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$a^3+b^3$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$a^3+3ab+b^3$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$a^3+3a^2b-3ab^2+b^3$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$a^3+3a^2b+3ab^2+b^3$",
    "isCorrect": true
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt05",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "N",
  "status": "ok",
  "prompt": "Biểu thức $x^3-8$ viết thành tích là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -1.275,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Hiệu hai lập phương: $A^3-B^3=(A-B)(A^2+AB+B^2)$.\\\\ $x^3-8=x^3-2^3=(x-2)(x^2+2x+4)$.\\\\ Mẹo: ngoặc thứ hai là \"bình phương thiếu của tổng\", dấu giữa ngược với dấu ở ngoặc đầu.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$(x-2)(x^2+2x+4)$",
    "isCorrect": true
   },
   {
    "label": "B",
    "content": "$(x-2)(x^2-2x+4)$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$(x-2)^3$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$(x+2)(x^2-2x+4)$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt06",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "N",
  "status": "ok",
  "prompt": "Đẳng thức nào dưới đây đúng với mọi $a,\\ b$?",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -1.125,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Chỉ có $(a-b)^2=a^2-2ab+b^2$ là hằng đẳng thức.\\\\ Các đẳng thức còn lại sai, ví dụ với $a=2,\\ b=1$: $(2-1)^2=1$ nhưng $2^2-1^2=3$; $(2+1)^2=9$ nhưng $2^2+1^2=5$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$(a-b)^2=a^2-b^2$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$(a-b)^2=a^2-2ab+b^2$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$(a+b)^2=a^2+b^2$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$a^2-b^2=(a-b)^2$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt07",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "H",
  "status": "ok",
  "prompt": "Tính nhanh $101^2$.",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -0.875,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$101^2=(100+1)^2=100^2+2\\cdot 100\\cdot 1+1^2=10000+200+1=10201$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$10101$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$10201$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$10001$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$10200$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt08",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "H",
  "status": "ok",
  "prompt": "Tính nhanh $49\\cdot 51$.",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -0.725,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$49\\cdot 51=(50-1)(50+1)=50^2-1^2=2500-1=2499$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$2501$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$2449$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$2499$",
    "isCorrect": true
   },
   {
    "label": "D",
    "content": "$2500$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt09",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "H",
  "status": "ok",
  "prompt": "Biểu thức thích hợp điền vào chỗ trống: $x^2+\\ldots+25=(x+5)^2$ là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -0.575,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$(x+5)^2=x^2+2\\cdot x\\cdot 5+5^2=x^2+10x+25$.\\\\ Vậy chỗ trống là hạng tử $2AB=10x$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$5x$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$10x$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$25x$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$x$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt10",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "H",
  "status": "ok",
  "prompt": "Rút gọn biểu thức $(x+2)^2-(x-2)^2$ ta được",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -0.425,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Cách 1: $(x^2+4x+4)-(x^2-4x+4)=8x$.\\\\ Cách 2 (hiệu hai bình phương): $\\big[(x+2)-(x-2)\\big]\\big[(x+2)+(x-2)\\big]=4\\cdot 2x=8x$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$0$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$4x$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$2x^2+8$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$8x$",
    "isCorrect": true
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt11",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "H",
  "status": "ok",
  "prompt": "Khai triển $(x-1)^3$ ta được",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -0.275,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Lập phương của một hiệu: $(A-B)^3=A^3-3A^2B+3AB^2-B^3$ (dấu đan xen $+,-,+,-$).\\\\ $(x-1)^3=x^3-3x^2+3x-1$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$x^3-1$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$x^3-3x^2+3x-1$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$x^3-3x^2-3x-1$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$x^3+3x^2-3x-1$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt12",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "H",
  "status": "ok",
  "prompt": "Viết biểu thức $9x^2-12xy+4y^2$ dưới dạng bình phương của một hiệu.",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": -0.125,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$9x^2=(3x)^2$, $4y^2=(2y)^2$ và $12xy=2\\cdot 3x\\cdot 2y$.\\\\ Vậy $9x^2-12xy+4y^2=(3x-2y)^2$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$(3x+2y)^2$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$(9x-4y)^2$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$(3x-2y)^2$",
    "isCorrect": true
   },
   {
    "label": "D",
    "content": "$(3x-4y)^2$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt13",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "V",
  "status": "ok",
  "prompt": "Giá trị của biểu thức $x^2-6x+9$ tại $x=103$ là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 0.125,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$x^2-6x+9=(x-3)^2$.\\\\ Tại $x=103$: $(103-3)^2=100^2=10000$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$9409$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$10609$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$100$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$10000$",
    "isCorrect": true
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt14",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "V",
  "status": "ok",
  "prompt": "Tìm $x$, biết $(x+1)^2-(x-1)(x+1)=6$.",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 0.275,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$(x+1)^2-(x-1)(x+1)=(x^2+2x+1)-(x^2-1)=2x+2$.\\\\ $2x+2=6\\Rightarrow x=2$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$x=3$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$x=-2$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$x=2$",
    "isCorrect": true
   },
   {
    "label": "D",
    "content": "$x=1$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt15",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "V",
  "status": "ok",
  "prompt": "Giá trị nhỏ nhất của biểu thức $A=x^2-4x+7$ là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 0.425,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$A=x^2-4x+4+3=(x-2)^2+3\\ge 3$ vì $(x-2)^2\\ge 0$.\\\\ Dấu \"=\" xảy ra khi $x=2$. Vậy giá trị nhỏ nhất của $A$ là $3$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$7$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$3$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$-4$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$2$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt16",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "V",
  "status": "ok",
  "prompt": "Rút gọn biểu thức $(x+3)(x^2-3x+9)-x^3$ ta được",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 0.575,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "Tổng hai lập phương: $(x+3)(x^2-3x+9)=x^3+27$.\\\\ Do đó biểu thức bằng $x^3+27-x^3=27$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$27$",
    "isCorrect": true
   },
   {
    "label": "B",
    "content": "$-27$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$54$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$2x^3+27$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt17",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "V",
  "status": "ok",
  "prompt": "Cho $a+b=5$ và $ab=6$. Giá trị của $a^2+b^2$ là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 0.725,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$a^2+b^2=(a+b)^2-2ab=5^2-2\\cdot 6=25-12=13$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$25$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$37$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$19$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$13$",
    "isCorrect": true
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt18",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "V",
  "status": "ok",
  "prompt": "Tính nhanh $\\dfrac{63^2-37^2}{26}$.",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 0.875,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$63^2-37^2=(63-37)(63+37)=26\\cdot 100$.\\\\ Vậy $\\dfrac{26\\cdot 100}{26}=100$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$100$",
    "isCorrect": true
   },
   {
    "label": "B",
    "content": "$26$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$50$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$2600$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt19",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "T",
  "status": "ok",
  "prompt": "Cho $a+b=3$ và $ab=2$. Giá trị của $a^3+b^3$ là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 1.125,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$a^3+b^3=(a+b)^3-3ab(a+b)=3^3-3\\cdot 2\\cdot 3=27-18=9$.\\\\ (Kiểm tra: $a=1,\\ b=2$ thì $1+8=9$.)",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$27$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$9$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$35$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$15$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt20",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "T",
  "status": "ok",
  "prompt": "Cho $x-y=2$ và $xy=15$. Giá trị của $x^3-y^3$ là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 1.275,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$x^3-y^3=(x-y)^3+3xy(x-y)=2^3+3\\cdot 15\\cdot 2=8+90=98$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$8$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$38$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$98$",
    "isCorrect": true
   },
   {
    "label": "D",
    "content": "$62$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt21",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "T",
  "status": "ok",
  "prompt": "Giá trị lớn nhất của biểu thức $B=-x^2+6x-1$ là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 1.425,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$B=-(x^2-6x+9)+8=8-(x-3)^2\\le 8$.\\\\ Dấu \"=\" xảy ra khi $x=3$. Vậy giá trị lớn nhất của $B$ là $8$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$-1$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$3$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$10$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$8$",
    "isCorrect": true
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt22",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "T",
  "status": "ok",
  "prompt": "Cho $x+\\dfrac{1}{x}=3$. Giá trị của $x^2+\\dfrac{1}{x^2}$ là",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 1.575,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$\\left(x+\\dfrac1x\\right)^2=x^2+2+\\dfrac{1}{x^2}$.\\\\ Suy ra $x^2+\\dfrac{1}{x^2}=3^2-2=7$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$9$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$7$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$11$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$5$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt23",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "T",
  "status": "ok",
  "prompt": "Tìm $x,\\ y$ thỏa mãn $x^2+y^2-2x+4y+5=0$.",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 1.725,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$x^2-2x+1+y^2+4y+4=0\\Leftrightarrow (x-1)^2+(y+2)^2=0$.\\\\ Tổng hai bình phương bằng $0$ khi cả hai bằng $0$: $x=1,\\ y=-2$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$x=1,\\ y=-2$",
    "isCorrect": true
   },
   {
    "label": "B",
    "content": "$x=-1,\\ y=2$",
    "isCorrect": false
   },
   {
    "label": "C",
    "content": "$x=1,\\ y=2$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$x=2,\\ y=-1$",
    "isCorrect": false
   }
  ]
 },
 {
  "id": "8-C2-B1::hdt24",
  "topicId": "8-C2-B1",
  "grade": 8,
  "level": "T",
  "status": "ok",
  "prompt": "Với mọi số nguyên $n$, biểu thức $(n+2)^2-(n-2)^2$ luôn chia hết cho số nào dưới đây?",
  "source": "Biên soạn theo SGK Toán 8 Kết nối tri thức với cuộc sống (Chương II, Bài 6–8).",
  "irt": {
   "a": 1.2,
   "b": 1.875,
   "c": 0.25
  },
  "tikzSources": [],
  "tikzHashes": [],
  "hasTable": false,
  "hasImmini": false,
  "solution": "$(n+2)^2-(n-2)^2=\\big[(n+2)-(n-2)\\big]\\big[(n+2)+(n-2)\\big]=4\\cdot 2n=8n$, luôn chia hết cho $8$.\\\\ Các số $16,\\ 6,\\ 5$ không đúng với mọi $n$, chẳng hạn $n=1$ cho giá trị $8$.",
  "type": "mcq",
  "options": [
   {
    "label": "A",
    "content": "$16$",
    "isCorrect": false
   },
   {
    "label": "B",
    "content": "$8$",
    "isCorrect": true
   },
   {
    "label": "C",
    "content": "$6$",
    "isCorrect": false
   },
   {
    "label": "D",
    "content": "$5$",
    "isCorrect": false
   }
  ]
 }
];
  var THEORY = {
 "topicId": "8-C2-B1",
 "knowledgeBlocks": [
  {
   "type": "section",
   "content": "1. Bình phương của một tổng, một hiệu",
   "title": null,
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "dn",
   "content": "Với $A,\\ B$ là hai số hoặc hai biểu thức bất kì:$$\\begin{aligned}(A+B)^2&=A^2+2AB+B^2 &&(1)\\\\(A-B)^2&=A^2-2AB+B^2 &&(2)\\end{aligned}$$",
   "title": "Bình phương của một tổng và của một hiệu",
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "dn",
   "content": "$$A^2-B^2=(A-B)(A+B) \\qquad (3)$$",
   "title": "Hiệu hai bình phương",
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "section",
   "content": "2. Lập phương của một tổng, một hiệu",
   "title": null,
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "dn",
   "content": "$$\\begin{aligned}(A+B)^3&=A^3+3A^2B+3AB^2+B^3 &&(4)\\\\(A-B)^3&=A^3-3A^2B+3AB^2-B^3 &&(5)\\end{aligned}$$",
   "title": "Lập phương của một tổng và của một hiệu",
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "section",
   "content": "3. Tổng và hiệu hai lập phương",
   "title": null,
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "dn",
   "content": "$$\\begin{aligned}A^3+B^3&=(A+B)(A^2-AB+B^2) &&(6)\\\\A^3-B^3&=(A-B)(A^2+AB+B^2) &&(7)\\end{aligned}$$",
   "title": "Tổng hai lập phương và hiệu hai lập phương",
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "nx",
   "content": "<strong>Mẹo nhớ.</strong> Bình phương có 3 hạng tử, hệ số $1,\\ 2,\\ 1$. Lập phương có 4 hạng tử, hệ số $1,\\ 3,\\ 3,\\ 1$; với $(A-B)^3$ dấu đan xen $+,-,+,-$.\\\\ Ở (6) và (7), ngoặc thứ hai là \"bình phương thiếu\": giống bình phương nhưng hạng tử giữa là $AB$ chứ không phải $2AB$, và dấu của nó ngược với dấu ở ngoặc thứ nhất.",
   "title": "Cách nhớ nhanh",
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "chuy",
   "content": "<strong>Ba lỗi hay gặp:</strong>\\\\ • Viết $(a+b)^2=a^2+b^2$ — thiếu hạng tử $2ab$.\\\\ • Viết $(2x)^2=2x^2$ — phải là $4x^2$.\\\\ • Nhầm $A^3-B^3$ với $(A-B)^3$: $x^3-8=(x-2)(x^2+2x+4)$, còn $(x-2)^3=x^3-6x^2+12x-8$.",
   "title": "Sai lầm cần tránh",
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "section",
   "content": "4. Ví dụ mẫu",
   "title": null,
   "solution": null,
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "vd",
   "content": "Khai triển $(2x+3y)^2$.",
   "title": "Ví dụ 1",
   "solution": "Áp dụng (1) với $A=2x,\\ B=3y$:\\\\ $(2x+3y)^2=(2x)^2+2\\cdot 2x\\cdot 3y+(3y)^2=4x^2+12xy+9y^2$.",
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "vd",
   "content": "Tính nhanh: a) $99^2$; b) $98\\cdot 102$.",
   "title": "Ví dụ 2",
   "solution": "a) $99^2=(100-1)^2=10000-200+1=9801$.\\\\ b) $98\\cdot 102=(100-2)(100+2)=100^2-2^2=9996$.",
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "vd",
   "content": "Viết $8x^3-27$ thành tích.",
   "title": "Ví dụ 3",
   "solution": "$8x^3=(2x)^3$, $27=3^3$. Áp dụng (7):\\\\ $8x^3-27=(2x-3)\\big[(2x)^2+2x\\cdot 3+3^2\\big]=(2x-3)(4x^2+6x+9)$.",
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "vd",
   "content": "Rút gọn rồi tính giá trị của $P=(x-1)^3-x(x-3)^2$ tại $x=-2$.",
   "title": "Ví dụ 4",
   "solution": "$P=(x^3-3x^2+3x-1)-x(x^2-6x+9)=x^3-3x^2+3x-1-x^3+6x^2-9x=3x^2-6x-1$.\\\\ Tại $x=-2$: $P=3\\cdot 4+12-1=23$.",
   "tikzSources": [],
   "tikzHashes": []
  }
 ],
 "methodBlocks": [
  {
   "type": "dang",
   "content": "Nhận dạng $A$, $B$ rồi áp dụng đúng công thức. Viết rõ bước trung gian như $(2x)^2$, $2\\cdot 2x\\cdot 3y$ để không sót hệ số.",
   "title": "Dạng 1. Khai triển biểu thức",
   "solution": "Ví dụ: $(3x-2)^2=(3x)^2-2\\cdot 3x\\cdot 2+2^2=9x^2-12x+4$.",
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "dang",
   "content": "Đếm số hạng tử: 3 hạng tử thì thử dạng bình phương $A^2\\pm 2AB+B^2$; 2 hạng tử bậc hai thì thử hiệu hai bình phương; 2 hạng tử bậc ba thì thử tổng/hiệu hai lập phương; 4 hạng tử với hệ số $1,3,3,1$ thì thử lập phương.",
   "title": "Dạng 2. Viết thành bình phương, lập phương hoặc tích",
   "solution": "Ví dụ: $x^2+8x+16=(x+4)^2$; $\\ 27-x^3=(3-x)(9+3x+x^2)$.",
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "dang",
   "content": "Tách số thành tổng/hiệu với một số tròn chục, tròn trăm rồi áp dụng hằng đẳng thức.",
   "title": "Dạng 3. Tính nhanh",
   "solution": "Ví dụ: $201^2=(200+1)^2=40401$; $\\ 47\\cdot 53=50^2-3^2=2491$.",
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "dang",
   "content": "Khai triển các hằng đẳng thức, thu gọn hạng tử đồng dạng rồi mới thay số. Biểu thức sau khi rút gọn không còn $x$ thì nó không phụ thuộc vào biến.",
   "title": "Dạng 4. Rút gọn và tính giá trị biểu thức",
   "solution": "Ví dụ: $(x+1)^2-(x-1)^2-4x=4x-4x=0$ với mọi $x$.",
   "tikzSources": [],
   "tikzHashes": []
  },
  {
   "type": "dang",
   "content": "Đưa về dạng $(\\ldots)^2+m$ (giá trị nhỏ nhất là $m$) hoặc $m-(\\ldots)^2$ (giá trị lớn nhất là $m$), rồi chỉ ra giá trị của biến để dấu \"=\" xảy ra. Biết $a+b$ và $ab$ thì dùng $a^2+b^2=(a+b)^2-2ab$, $a^3+b^3=(a+b)^3-3ab(a+b)$.",
   "title": "Dạng 5 (nâng cao). Giá trị nhỏ nhất, lớn nhất; biểu thức đối xứng",
   "solution": "Ví dụ: $x^2+2x+5=(x+1)^2+4\\ge 4$, nhỏ nhất bằng $4$ khi $x=-1$.",
   "tikzSources": [],
   "tikzHashes": []
  }
 ]
};

  BANK.questions = BANK.questions.filter(function (q) { return q.topicId !== TOPIC; }).concat(QUESTIONS);
  BANK.theory = (BANK.theory || []).filter(function (t) { return t.topicId !== TOPIC; }).concat([THEORY]);
  BANK.totalCount = BANK.questions.length;
  window.AM_FEATURED = { topicId: TOPIC, questionCount: QUESTIONS.length };
})();
