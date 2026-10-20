/* ===== Cấu hình cửa hàng: sửa ở đây ===== */
const CONFIG = {
  shop: "Computeledev",
  // Dán địa chỉ Web app của Google Apps Script vào đây (xem apps-script/HUONG-DAN.md).
  // Ví dụ: "https://script.google.com/macros/s/AKfycb.../exec"
  apiUrl: "",
  phone: "0900 000 000",        // đổi thành số thật
  zalo: "0900000000",           // số Zalo (không dấu cách)
  email: "hello@example.com",   // email nhận đơn
  address: "Hà Nội, Việt Nam",
  freeShip: 5000000,            // miễn phí ship từ mức này
  shipFee: 30000,
  coupons: {
    COMPUTELE10: { type: "pct", value: 10 },
    WELCOME50K: { type: "flat", value: 50000 }
  }
};

/* ===== Danh mục ===== */
const CATS = [
  { id: "laptop", name: "Laptop", icon: "💻" },
  { id: "pc", name: "PC", icon: "🖥️" },
  { id: "monitor", name: "Màn hình", icon: "🖵" },
  { id: "audio", name: "Tai nghe", icon: "🎧" },
  { id: "charger", name: "Sạc & Pin", icon: "🔋" },
  { id: "accessory", name: "Phụ kiện", icon: "🖱️" },
  { id: "storage", name: "Ổ cứng", icon: "💾" }
];

/* ===== Sản phẩm (dữ liệu mẫu) =====
   Thêm ảnh thật: thêm thuộc tính  img: "images/ten-anh.jpg"  vào sản phẩm.
   use: nhu cầu phù hợp (gaming | office | student | creator) dùng cho công cụ gợi ý. */
const PRODUCTS = [
  { id: "lap1", cat: "laptop", brand: "Vortex", name: "Laptop Gaming Vortex 15", emoji: "💻", price: 24990000, old: 27990000, rating: 4.6, sold: 320, use: ["gaming", "creator"],
    specs: { "CPU": "Ryzen 7 7840HS", "RAM": "16GB DDR5", "Ổ cứng": "512GB NVMe", "Card đồ họa": "RTX 4060 8GB", "Màn hình": "15.6\" FHD 144Hz", "Trọng lượng": "2.1 kg" } },
  { id: "lap2", cat: "laptop", brand: "AeroBook", name: "Laptop Văn phòng AeroBook 14", emoji: "💻", price: 13990000, old: 15490000, rating: 4.5, sold: 540, use: ["office", "student"],
    specs: { "CPU": "Core i5-1335U", "RAM": "16GB", "Ổ cứng": "512GB NVMe", "Card đồ họa": "Iris Xe", "Màn hình": "14\" FHD IPS", "Trọng lượng": "1.3 kg" } },
  { id: "lap3", cat: "laptop", brand: "Lumen", name: "Ultrabook Lumen 13 OLED", emoji: "💻", price: 19990000, old: 22990000, rating: 4.7, sold: 210, use: ["office", "student", "creator"],
    specs: { "CPU": "Core Ultra 7", "RAM": "16GB LPDDR5", "Ổ cứng": "1TB NVMe", "Card đồ họa": "Arc tích hợp", "Màn hình": "13.3\" OLED 2.8K", "Trọng lượng": "1.0 kg" } },
  { id: "lap4", cat: "laptop", brand: "StudyPro", name: "Laptop Sinh viên Study S1", emoji: "💻", price: 9490000, old: 10990000, rating: 4.2, sold: 780, use: ["student", "office"],
    specs: { "CPU": "Core i3-1215U", "RAM": "8GB", "Ổ cứng": "256GB SSD", "Card đồ họa": "UHD", "Màn hình": "15.6\" FHD", "Trọng lượng": "1.7 kg" } },
  { id: "lap5", cat: "laptop", brand: "ProStudio", name: "Laptop Creator ProStudio 16", emoji: "💻", price: 38990000, old: 42990000, rating: 4.8, sold: 95, use: ["creator", "gaming"],
    specs: { "CPU": "Core i9-13900H", "RAM": "32GB DDR5", "Ổ cứng": "1TB NVMe", "Card đồ họa": "RTX 4070 8GB", "Màn hình": "16\" 2.5K 120Hz", "Trọng lượng": "2.2 kg" } },

  { id: "pc1", cat: "pc", brand: "Titan", name: "PC Gaming Titan R5", emoji: "🖥️", price: 18990000, old: 20990000, rating: 4.6, sold: 150, use: ["gaming"],
    specs: { "CPU": "Ryzen 5 7600", "RAM": "16GB DDR5", "Ổ cứng": "1TB NVMe", "Card đồ họa": "RTX 4060 8GB", "Nguồn": "650W 80+ Bronze" } },
  { id: "pc2", cat: "pc", brand: "Mini", name: "PC Văn phòng Mini M1", emoji: "🖥️", price: 8490000, old: 9490000, rating: 4.4, sold: 260, use: ["office", "student"],
    specs: { "CPU": "Core i3-12100", "RAM": "8GB DDR4", "Ổ cứng": "256GB NVMe", "Card đồ họa": "UHD 730", "Nguồn": "350W" } },
  { id: "pc3", cat: "pc", brand: "Atlas", name: "PC Đồ họa Atlas R9", emoji: "🖥️", price: 36990000, old: 39990000, rating: 4.8, sold: 60, use: ["creator", "gaming"],
    specs: { "CPU": "Ryzen 9 7900", "RAM": "64GB DDR5", "Ổ cứng": "2TB NVMe", "Card đồ họa": "RTX 4070 Super 12GB", "Nguồn": "850W 80+ Gold" } },

  { id: "mo1", cat: "monitor", brand: "ViewMax", name: "Màn hình 27\" 2K 165Hz", emoji: "🖵", price: 5990000, old: 6990000, rating: 4.6, sold: 190, use: [],
    specs: { "Kích thước": "27 inch", "Độ phân giải": "2560x1440", "Tần số quét": "165Hz", "Tấm nền": "IPS", "Cổng": "HDMI 2.1, DP 1.4" } },
  { id: "mo2", cat: "monitor", brand: "ViewMax", name: "Màn hình 24\" FHD IPS", emoji: "🖵", price: 2690000, old: 3190000, rating: 4.4, sold: 430, use: [],
    specs: { "Kích thước": "24 inch", "Độ phân giải": "1920x1080", "Tần số quét": "75Hz", "Tấm nền": "IPS", "Cổng": "HDMI, VGA" } },

  { id: "hp1", cat: "audio", brand: "Nova", name: "Tai nghe chống ồn NovaANC", emoji: "🎧", price: 1890000, old: 2490000, rating: 4.7, sold: 610, use: [],
    specs: { "Kiểu": "Over-ear Bluetooth 5.3", "Chống ồn": "ANC chủ động", "Pin": "40 giờ", "Sạc": "USB-C nhanh" } },
  { id: "hp2", cat: "audio", brand: "BudsAir", name: "Tai nghe True Wireless BudsAir", emoji: "🎧", price: 990000, old: 1290000, rating: 4.4, sold: 920, use: [],
    specs: { "Kiểu": "In-ear True Wireless", "Chống ồn": "ENC khi gọi", "Pin": "24 giờ (kèm hộp)", "Kháng nước": "IPX4" } },
  { id: "hp3", cat: "audio", brand: "Raven", name: "Tai nghe Gaming 7.1 Raven", emoji: "🎧", price: 1290000, old: 1590000, rating: 4.3, sold: 340, use: [],
    specs: { "Kiểu": "Over-ear có dây", "Âm thanh": "Giả lập 7.1", "Mic": "Tháo rời, khử ồn", "Kết nối": "USB-A / 3.5mm" } },

  { id: "ch1", cat: "charger", brand: "MagPad", name: "Sạc không dây 15W MagPad", emoji: "🔋", price: 390000, old: 490000, rating: 4.5, sold: 1200, use: [],
    specs: { "Công suất": "15W", "Chuẩn": "Qi / MagSafe", "Đầu vào": "USB-C", "An toàn": "Chống quá nhiệt" } },
  { id: "ch2", cat: "charger", brand: "GaNX", name: "Sạc nhanh GaN 65W 3 cổng", emoji: "🔌", price: 690000, old: 850000, rating: 4.7, sold: 860, use: [],
    specs: { "Công suất": "65W", "Cổng": "2x USB-C + 1x USB-A", "Công nghệ": "GaN", "Phù hợp": "Laptop, điện thoại, máy tính bảng" } },
  { id: "ch3", cat: "charger", brand: "PowerGo", name: "Pin dự phòng 20.000mAh 65W", emoji: "🔋", price: 1190000, old: 1490000, rating: 4.6, sold: 480, use: [],
    specs: { "Dung lượng": "20.000mAh", "Công suất": "65W PD", "Cổng": "2x USB-C + 1x USB-A", "Phù hợp": "Sạc được laptop" } },

  { id: "ac1", cat: "accessory", brand: "Ergo", name: "Chuột không dây ErgoMouse", emoji: "🖱️", price: 450000, old: 590000, rating: 4.5, sold: 700, use: [],
    specs: { "Kết nối": "Bluetooth + 2.4GHz", "DPI": "Tới 4000", "Pin": "6 tháng" } },
  { id: "ac2", cat: "accessory", brand: "KeyHot", name: "Bàn phím cơ HotSwap 75%", emoji: "⌨️", price: 1490000, old: 1790000, rating: 4.6, sold: 390, use: [],
    specs: { "Layout": "75%", "Switch": "Hot-swap", "Kết nối": "Bluetooth / 2.4G / USB-C", "Đèn": "RGB" } },
  { id: "ac3", cat: "accessory", brand: "ClearCam", name: "Webcam 2K AutoFocus", emoji: "📷", price: 790000, old: 990000, rating: 4.3, sold: 250, use: [],
    specs: { "Độ phân giải": "2K 30fps", "Lấy nét": "Tự động", "Mic": "Kép khử ồn", "Cổng": "USB-A" } },

  { id: "st1", cat: "storage", brand: "FastDisk", name: "SSD NVMe 1TB Gen4", emoji: "💾", price: 1890000, old: 2290000, rating: 4.7, sold: 530, use: [],
    specs: { "Dung lượng": "1TB", "Chuẩn": "M.2 NVMe PCIe 4.0", "Đọc": "7000 MB/s", "Ghi": "5000 MB/s" } },
  { id: "st2", cat: "storage", brand: "FastDisk", name: "SSD di động 1TB USB-C", emoji: "💾", price: 2190000, old: 2590000, rating: 4.5, sold: 310, use: [],
    specs: { "Dung lượng": "1TB", "Cổng": "USB-C 3.2 Gen2", "Tốc độ": "1000 MB/s", "Thiết kế": "Chống sốc" } }
];

/* ===== Linh kiện cho công cụ Build PC =====
   socket / ramType / tdp (W) / watts dùng để kiểm tra tương thích. */
const PARTS = {
  cpu: [
    { id: "cpu1", name: "AMD Ryzen 5 7600", socket: "AM5", tdp: 65, price: 5290000 },
    { id: "cpu2", name: "AMD Ryzen 7 7700", socket: "AM5", tdp: 65, price: 7490000 },
    { id: "cpu3", name: "Intel Core i5-13400F", socket: "LGA1700", tdp: 65, price: 4890000 },
    { id: "cpu4", name: "Intel Core i7-13700K", socket: "LGA1700", tdp: 150, price: 9990000 }
  ],
  mb: [
    { id: "mb1", name: "Mainboard B650M (AM5, DDR5)", socket: "AM5", ramType: "DDR5", price: 3290000 },
    { id: "mb2", name: "Mainboard X670E (AM5, DDR5)", socket: "AM5", ramType: "DDR5", price: 6490000 },
    { id: "mb3", name: "Mainboard B760M (LGA1700, DDR4)", socket: "LGA1700", ramType: "DDR4", price: 2490000 },
    { id: "mb4", name: "Mainboard Z790 (LGA1700, DDR5)", socket: "LGA1700", ramType: "DDR5", price: 5290000 }
  ],
  ram: [
    { id: "ram1", name: "RAM 16GB DDR4 3200", ramType: "DDR4", price: 990000 },
    { id: "ram2", name: "RAM 32GB DDR4 3200", ramType: "DDR4", price: 1690000 },
    { id: "ram3", name: "RAM 16GB DDR5 5600", ramType: "DDR5", price: 1390000 },
    { id: "ram4", name: "RAM 32GB DDR5 6000", ramType: "DDR5", price: 2690000 }
  ],
  gpu: [
    { id: "gpu1", name: "Radeon RX 7600 8GB", tdp: 165, price: 6290000 },
    { id: "gpu2", name: "GeForce RTX 4060 8GB", tdp: 115, price: 8490000 },
    { id: "gpu3", name: "GeForce RTX 4070 Super 12GB", tdp: 220, price: 16990000 }
  ],
  ssd: [
    { id: "ssd1", name: "SSD NVMe 512GB", price: 990000 },
    { id: "ssd2", name: "SSD NVMe 1TB", price: 1890000 },
    { id: "ssd3", name: "SSD NVMe 2TB", price: 3590000 }
  ],
  psu: [
    { id: "psu1", name: "Nguồn 550W 80+ Bronze", watts: 550, price: 1090000 },
    { id: "psu2", name: "Nguồn 650W 80+ Bronze", watts: 650, price: 1390000 },
    { id: "psu3", name: "Nguồn 750W 80+ Gold", watts: 750, price: 1790000 },
    { id: "psu4", name: "Nguồn 850W 80+ Gold", watts: 850, price: 2290000 }
  ]
};
