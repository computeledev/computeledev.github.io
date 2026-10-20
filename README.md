# Computeledev

Website bán laptop, PC và thiết bị công nghệ (HTML/CSS/JS thuần), có đăng ký / đăng nhập / quên mật khẩu lưu bằng Google Sheet.

## Cấu trúc
- `index.html`  – giao diện
- `style.css`   – kiểu dáng (có chế độ sáng/tối)
- `products.js` – cấu hình cửa hàng, danh mục, sản phẩm, linh kiện build PC  ← **sửa file này để đổi dữ liệu**
- `app.js`      – logic cửa hàng (giỏ hàng, so sánh, build PC...)
- `auth.js`     – giao diện và logic đăng ký / đăng nhập / quên mật khẩu
- `apps-script/Code.gs`      – mã backend dán vào Google Apps Script (KHÔNG cần đưa lên GitHub, nhưng để lưu trữ cũng được)
- `apps-script/HUONG-DAN.md` – hướng dẫn cài backend từng bước

## Chạy thử trên máy
Mở `index.html` bằng trình duyệt, hoặc chạy `python -m http.server 8000` rồi vào http://localhost:8000

## Bật tính năng tài khoản
Làm theo `apps-script/HUONG-DAN.md`, sau đó dán địa chỉ Web app vào `apiUrl` trong `products.js`.
