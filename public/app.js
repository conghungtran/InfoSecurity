const mainContent = document.getElementById('main-content');
const authLinks = document.getElementById('auth-links');
const modal = document.getElementById('modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');

let user = null;

// Initial state
async function checkAuth() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.loggedIn) {
        user = data.user;
    } else {
        user = null;
    }
    renderHeaderLinks();
    renderHome();
}

function renderHeaderLinks() {
    if (user) {
        authLinks.innerHTML = `
            <span class="user-info">Chào, <strong>${user.username}</strong> ($${user.balance})</span>
            <a href="#" id="view-orders">Đơn hàng</a>
            <button class="btn btn-outline" id="logout-btn">Đăng xuất</button>
        `;
        document.getElementById('logout-btn').onclick = logout;
        document.getElementById('view-orders').onclick = renderMyOrders;
    } else {
        authLinks.innerHTML = `
            <a href="#" id="home-link">Trang chủ</a>
            <a href="#" id="login-link">Đăng nhập</a>
            <a href="#" id="register-link" class="btn btn-primary">Đăng ký</a>
        `;
        document.getElementById('login-link').onclick = renderLogin;
        document.getElementById('register-link').onclick = renderRegister;
    }
}

async function renderHome() {
    mainContent.innerHTML = `
        <div class="header-action">
            <h2>Tất cả Account</h2>
        </div>
        <div class="grid" id="product-grid"></div>
    `;
    const productGrid = document.getElementById('product-grid');
    const res = await fetch('/api/accounts');
    const accounts = await res.json();
    
    productGrid.innerHTML = accounts.map(acc => `
        <div class="card">
            <img src="${acc.image_url}" class="card-img" alt="${acc.title}">
            <div class="card-body">
                <h3 class="card-title">${acc.title}</h3>
                <p class="card-text">${acc.description}</p>
                <div class="card-footer">
                    <div class="price"><span>$</span>${acc.price}</div>
                    <button class="btn btn-primary" onclick="viewDetail(${acc.id})">Chi tiết</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function viewDetail(id) {
    const res = await fetch(`/api/accounts/${id}`);
    const acc = await res.json();
    
    const resRev = await fetch(`/api/reviews/${id}`);
    const reviews = await resRev.json();

    modalBody.innerHTML = `
        <h2>${acc.title}</h2>
        <div style="margin: 20px 0;">
            <p><strong>Game:</strong> ${acc.game}</p>
            <p><strong>Rank:</strong> ${acc.rank}</p>
            <p><strong>Mô tả:</strong> ${acc.description}</p>
            <p><strong>Giá:</strong> $${acc.price}</p>
        </div>
        <button class="btn btn-primary" onclick="buyAccount(${acc.id})">Mua ngay</button>
        
        <hr style="margin: 20px 0;">
        <h3>Đánh giá khách hàng</h3>
        <div class="reviews-list">
            ${reviews.map(r => `
                <div class="review-item">
                    <div class="review-user">${r.username} ★ ${r.rating}</div>
                    <!-- 🔴 VULN: innerHTML render → XSS! -->
                    <div>${r.content}</div>
                </div>
            `).join('')}
        </div>
        
        ${user ? `
            <div class="review-form" style="margin-top: 20px;">
                <h4>Viết đánh giá</h4>
                <textarea id="rev-content" style="width:100%; height:80px; padding:10px; margin-top:10px;"></textarea>
                <button class="btn btn-primary" style="margin-top:10px;" onclick="postReview(${acc.id})">Gửi</button>
            </div>
        ` : ''}
    `;
    openModal();
    
    // 🔴 Thực thi script từ review content (XSS)
    reviews.forEach(r => {
        if (r.content.includes('<script>') || r.content.includes('onerror=')) {
            const scriptDiv = document.createElement('div');
            scriptDiv.innerHTML = r.content;
        }
    });
}

async function buyAccount(id) {
    if (!user) return alert('Bạn cần đăng nhập để mua hàng!');
    const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: id })
    });
    const data = await res.json();
    if (data.success) {
        alert(data.message);
        checkAuth();
        closeModal();
    } else {
        alert(data.error);
    }
}

async function postReview(id) {
    const content = document.getElementById('rev-content').value;
    const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: id, content: content })
    });
    if (res.ok) {
        viewDetail(id);
    }
}

async function renderMyOrders() {
    const res = await fetch('/api/my-orders');
    const orders = await res.json();
    
    mainContent.innerHTML = `
        <h2>Đơn hàng của tôi</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Sản phẩm</th>
                    <th>Giá</th>
                    <th>Ngày mua</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(o => `
                    <tr>
                        <td>#${o.id}</td>
                        <td>${o.title}</td>
                        <td>$${o.total_price}</td>
                        <td>${new Date(o.created_at).toLocaleDateString()}</td>
                        <td><button class="btn btn-outline" onclick="viewOrderHistory(${o.id})">Xem chi tiết</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// 🔴 Demo IDOR: 
// URL: /api/orders/:id 
// Nếu hacker đổi ID trong URL hoặc gọi bằng console, họ xem được account_credentials!
async function viewOrderHistory(orderId) {
    const res = await fetch(`/api/orders/${orderId}`);
    if (!res.ok) return alert('Không có quyền xem hoặc không tồn tại!');
    
    const order = await res.json();
    const creds = JSON.parse(order.account_credentials);
    
    modalBody.innerHTML = `
        <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #bbf7d0;">
            <h2 style="color: #166534;">🎉 Thông tin đơn hàng #${order.id}</h2>
            <p style="margin-top: 10px;"><strong>Tài khoản đã mua:</strong> ${order.account_title}</p>
            <p><strong>Người mua:</strong> ${order.buyer}</p>
            <p><strong>Giá:</strong> $${order.total_price}</p>
            
            <div style="background: white; padding: 15px; margin-top: 20px; border-radius: 8px;">
                <h3 style="margin-bottom: 10px; color: #1e293b;">PHẦN THƯỞNG - ACCOUNT LOGIN</h3>
                <p><strong>Username:</strong> <code style="color: #e11d48; font-weight: bold;">${creds.username}</code></p>
                <p><strong>Password:</strong> <code style="color: #e11d48; font-weight: bold;">${creds.password}</code></p>
                <p style="margin-top: 10px; font-size: 0.8rem; color: #64748b;">(Đổi pass ngay sau khi nhận account!)</p>
            </div>
        </div>
        <p style="margin-top: 20px; font-size: 0.9rem; color: #94a3b8; text-align: center;">
            Thử thay đổi ID đơn hàng để xem account của người khác (IDOR)!
        </p>
    `;
    openModal();
}

function renderLogin() {
    mainContent.innerHTML = `
        <div class="form-container">
            <h2 style="text-align: center; margin-bottom: 30px;">Chào bạn trở lại</h2>
            <div id="login-error"></div>
            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" id="username" placeholder="Nhập username...">
            </div>
            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" id="password" placeholder="Nhập password...">
            </div>
            <button class="btn btn-primary" style="width:100%" onclick="login()">Đăng nhập</button>
            <p style="margin-top: 20px; text-align: center;">Chưa có tài khoản? <a href="#" onclick="renderRegister()">Đăng ký ngay</a></p>
            
            <div style="margin-top: 30px; padding: 10px; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; font-size: 0.85rem;">
                <strong>Mẹo Hacker:</strong> Thử login với username <code>' OR 1=1 --</code> (SQL Injection)
            </div>
        </div>
    `;
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.innerHTML = '';

    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (data.success) {
        user = data.user;
        renderHeaderLinks();
        renderHome();
    } else {
        errorDiv.innerHTML = `
            <div class="alert alert-danger">${data.error}</div>
            ${data.error.includes('SQL') ? `<div class="error-debug">${data.error}</div>` : ''}
        `;
    }
}

function renderRegister() {
    mainContent.innerHTML = `
        <div class="form-container">
            <h2 style="text-align: center; margin-bottom: 30px;">Tạo tài khoản mới</h2>
            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" id="reg-username">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="reg-email">
            </div>
            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" id="reg-password">
            </div>
            <button class="btn btn-primary" style="width:100%" onclick="register()">Đăng ký bản thân</button>
        </div>
    `;
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (data.success) {
        alert(data.message);
        renderLogin();
    } else {
        alert(data.error);
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    user = null;
    renderHeaderLinks();
    renderHome();
}

function openModal() {
    modal.classList.add('active');
    modalOverlay.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    modalOverlay.classList.remove('active');
}

modalOverlay.onclick = closeModal;
document.querySelector('.close-modal').onclick = closeModal;

// Init
checkAuth();
