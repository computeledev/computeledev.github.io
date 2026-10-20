# Cài backend đăng ký / đăng nhập bằng Google Sheet

Mất khoảng 10 phút, không cần thẻ tín dụng, không cần máy chủ.

## Cách hoạt động

```
Khách  ->  website (GitHub Pages)  ->  Google Apps Script  ->  Google Sheet
                                              |
                                              +-> gửi email mã đặt lại mật khẩu (Gmail của bạn)
```

Google Sheet của bạn sẽ có 3 tab:

| Tab | Nội dung |
|---|---|
| `Users` | Họ tên, email, số điện thoại, ngày đăng ký, mật khẩu **đã băm** + salt |
| `Sessions` | Phiên đăng nhập (token đã băm) |
| `Resets` | Mã đặt lại mật khẩu (đã băm), hết hạn sau 15 phút |

> Mật khẩu **không bao giờ** được lưu dạng chữ thường. Ngay cả bạn cũng không xem được mật khẩu của khách,
> vì vậy tính năng "Quên mật khẩu" hoạt động bằng cách gửi mã để khách tự đặt mật khẩu mới.

## Bước 1: Tạo Google Sheet

1. Vào https://sheets.google.com, bấm **Trống** (Blank) để tạo bảng tính mới.
2. Đặt tên là `Computeledev Users`.

## Bước 2: Dán mã backend

1. Trong bảng tính, vào menu **Tiện ích mở rộng** (Extensions) → **Apps Script**.
2. Xóa toàn bộ đoạn mã mẫu có sẵn.
3. Mở file `apps-script/Code.gs` trong thư mục website, sao chép toàn bộ nội dung và dán vào.
4. Bấm biểu tượng đĩa mềm (**Lưu dự án**), đặt tên dự án tùy ý.

## Bước 3: Chạy cài đặt một lần và cấp quyền

1. Ở thanh công cụ phía trên, ô chọn hàm, chọn **`setup`**.
2. Bấm **Chạy** (Run).
3. Google hỏi quyền: bấm **Xem lại quyền**, chọn tài khoản Gmail của bạn.
4. Nếu hiện cảnh báo "Google chưa xác minh ứng dụng này": bấm **Nâng cao** → **Đi tới ... (không an toàn)** → **Cho phép**.
   Đây là script do chính bạn viết trong tài khoản của bạn nên bình thường.
5. Quay lại bảng tính, bạn sẽ thấy 3 tab mới: `Users`, `Sessions`, `Resets`.

## Bước 4: Triển khai thành Web app

1. Trong Apps Script, bấm **Triển khai** (Deploy) → **Tùy chọn triển khai mới** (New deployment).
2. Bấm biểu tượng bánh răng, chọn loại **Ứng dụng web** (Web app).
3. Điền:
   - **Thực thi dưới tên**: *Tôi* (Me)
   - **Người có quyền truy cập**: *Bất kỳ ai* (Anyone)
4. Bấm **Triển khai**, rồi **sao chép URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).

> Chọn "Bất kỳ ai" là bắt buộc để website của bạn gọi được. Người lạ chỉ gọi được các hành động
> đăng ký / đăng nhập / quên mật khẩu, không đọc được dữ liệu trong Sheet.

## Bước 5: Gắn URL vào website

1. Mở file `products.js` trên GitHub, bấm biểu tượng bút chì.
2. Tìm dòng `apiUrl: "",` và dán URL vào giữa hai dấu ngoặc kép:
   ```js
   apiUrl: "https://script.google.com/macros/s/AKfycb.../exec",
   ```
3. Bấm **Commit changes**, đợi 1–2 phút rồi tải lại website.

## Bước 6: Thử nghiệm

1. Bấm **Đăng nhập** → **Đăng ký miễn phí**, tạo một tài khoản thử.
2. Mở Google Sheet, tab `Users` phải có thêm một dòng mới.
3. Đăng xuất, bấm **Quên mật khẩu**, nhập email vừa đăng ký, kiểm tra hộp thư (cả mục Spam) lấy mã 6 số.

## Khi sửa Code.gs sau này

Triển khai lại bằng **Triển khai** → **Quản lý bản triển khai** → biểu tượng bút chì → **Phiên bản: Phiên bản mới** → **Triển khai**.
URL giữ nguyên, không cần sửa lại `products.js`.

## Lưu ý quan trọng

- **Không chia sẻ Google Sheet** cho người lạ. Sheet chứa thông tin cá nhân của khách.
- **Hạn mức email**: tài khoản Gmail thường gửi tối đa khoảng 100 email mỗi ngày qua Apps Script.
- **Chống đoán mật khẩu**: sai 5 lần sẽ bị khóa tạm 15 phút; mã đặt lại chỉ được nhập sai tối đa 5 lần.
- **Mức bảo mật**: Apps Script không có bcrypt nên mật khẩu được băm SHA-256 có salt, lặp 200 vòng.
  Đủ cho cửa hàng nhỏ. Khi lượng khách lớn, nên chuyển sang Firebase Authentication hoặc Supabase.
- **Dữ liệu cá nhân**: bạn đang thu thập họ tên, email, số điện thoại của khách. Hãy có trang chính sách
  quyền riêng tư và chỉ dùng dữ liệu đúng mục đích đã nêu ở ô đồng ý khi đăng ký.
- **Giới hạn**: chưa xác minh email khi đăng ký; ai cũng có thể đăng ký bằng email của người khác
  (nhưng không thể lấy mật khẩu hay đăng nhập thay họ).
