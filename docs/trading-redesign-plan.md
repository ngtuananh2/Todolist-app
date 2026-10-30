# Kế hoạch thiết kế Trading Dashboard cho TaskFlow

## 1. Tinh thần thiết kế lấy cảm hứng từ website mục tiêu

Mục tiêu không phải copy 100%, mà là áp dụng nguyên lý của một dashboard trading chuyên nghiệp:

- Dữ liệu trước, giao diện sau
- Mật độ thông tin cao nhưng vẫn dễ đọc
- Chia theo module rõ ràng
- Tập trung vào KPI và xu hướng thay vì chỉ là bảng dữ liệu
- Có trạng thái rỗng, cảnh báo và workflow rõ ràng

## 2. UI/UX đề xuất cho phiên bản TaskFlow

### 2.1 Layout tổng thể

Giao diện nên gồm 4 lớp chính:

1. Top bar
   - Logo / tên app
   - Chọn tài khoản
   - Bộ lọc thời gian
   - Nút thêm giao dịch
   - Nút xuất dữ liệu

2. Sidebar trái
   - Tổng quan
   - Lệnh giao dịch
   - Phân tích
   - Lợi nhuận - Rủi ro
   - Nhật ký
   - Cài đặt

3. Main content
   - KPI cards
   - Biểu đồ
   - Bảng giao dịch
   - Cảnh báo rủi ro
   - Danh sách hoạt động gần đây

4. Modal / drawer
   - Thêm/sửa giao dịch
   - Đóng lệnh
   - Ghi chú và đánh giá cảm xúc
   - Cài đặt quy tắc quản lý rủi ro

### 2.2 Giao diện từng section

#### A. Tổng quan
- KPI cards: tổng lệnh, win rate, PnL, profit factor, max drawdown, expectancy
- Hai biểu đồ chính:
  - Equity curve / PnL theo ngày
  - Win/Loss ratio
- Một section “Cảnh báo” ở trên đầu

#### B. Lệnh giao dịch
- Bảng danh sách giao dịch có filter
- Có thể hiển thị:
  - symbol
  - entry/exit
  - SL/TP
  - PnL
  - status
  - setup
  - rating

#### C. Phân tích
- Theo setup
- Theo cặp tiền / market
- Theo thời gian
- Theo chiến lược
- Theo emotion

#### D. Lợi nhuận - Rủi ro
- Risk reward ratio
- Max drawdown
- Average win/loss
- Streak
- Risk violations

#### E. Nhật ký
- Ghi chú giao dịch theo từng lệnh
- Hình ảnh screenshot
- Cảm xúc sau giao dịch
- Đánh giá chiến lược

## 3. Thiết kế trực quan đề xuất

### Màu sắc
- Nền: tối nhẹ, hiện đại
- Accent: nâu/đá, cam nâu, xanh lá cho lợi nhuận, đỏ cho thua lỗ
- Dùng màu để phân biệt trạng thái:
  - xanh: thắng
  - đỏ: thua
  - vàng: cảnh báo
  - xám: chưa đóng

### Typography
- Sử dụng font hiện đại, rõ, không quá dày
- Tiêu đề lớn, text phụ nhỏ hơn

### Thành phần UI
- Cards có border radius vừa phải
- Shadow nhẹ, không quá nặng
- Các KPI theo grid 4-6 cột
- Bảng dùng spacing rõ ràng

### UX pattern đáng dùng
- Empty state khi chưa có dữ liệu
- Tooltip giải thích KPI
- Filter nhanh ở đầu bảng
- Nút “thêm giao dịch” nổi bật
- Cảnh báo khi mở lệnh quá lâu hoặc chưa đặt SL/TP

## 4. Cấu trúc dữ liệu đề xuất

### 4.1 Trade
```json
{
  "id": "trade_001",
  "accountId": "acc_001",
  "symbol": "BTC/USDT",
  "market": "crypto",
  "type": "long",
  "status": "closed",
  "entryPrice": 62000,
  "exitPrice": 63500,
  "quantity": 0.1,
  "leverage": 5,
  "stopLoss": 61000,
  "takeProfit": 65000,
  "fees": 12,
  "pnl": 150,
  "pnlPercent": 2.42,
  "rr": 2.5,
  "riskAmount": 100,
  "strategy": "Breakout",
  "setup": "Retest after impulse",
  "timeframe": "1h",
  "entryDate": "2026-08-10T09:30:00Z",
  "exitDate": "2026-08-10T11:00:00Z",
  "emotion": "confident",
  "rating": 4,
  "notes": "Lệnh đúng theo plan",
  "tags": ["trend", "high-volume"],
  "screenshot": "",
  "createdAt": "2026-08-10T09:30:00Z",
  "updatedAt": "2026-08-10T11:00:00Z"
}
```

### 4.2 TradingAccount
```json
{
  "id": "acc_001",
  "name": "Tài khoản mặc định",
  "exchange": "Binance",
  "balance": 10000,
  "initialBalance": 10000,
  "currency": "USDT",
  "isDefault": true,
  "notes": "",
  "createdAt": "2026-08-01T00:00:00Z"
}
```

### 4.3 RiskRule
```json
{
  "id": "risk_001",
  "accountId": "acc_001",
  "maxRiskPerTrade": 2,
  "maxDailyLoss": 5,
  "maxDrawdown": 8,
  "minRR": 1.5,
  "maxOpenTrades": 3,
  "enabled": true
}
```

### 4.4 JournalEntry
```json
{
  "id": "journal_001",
  "tradeId": "trade_001",
  "type": "review",
  "content": "Lệnh này đúng vì breakout xác nhận volume",
  "mood": "calm",
  "createdAt": "2026-08-10T12:00:00Z"
}
```

### 4.5 PerformanceSnapshot
```json
{
  "id": "snapshot_001",
  "accountId": "acc_001",
  "period": "30d",
  "totalTrades": 42,
  "winRate": 61.9,
  "profitFactor": 1.82,
  "netPnl": 1280,
  "maxDrawdown": 420,
  "avgRR": 2.1,
  "createdAt": "2026-08-10T00:00:00Z"
}
```

## 5. Feature đề xuất cho phiên bản TaskFlow

### Ưu tiên cao
1. Thêm/sửa/xóa lệnh giao dịch
2. Đóng lệnh nhanh bằng modal
3. Tính toán PnL tự động
4. Hiển thị KPI tổng quan
5. Filter và tìm kiếm lệnh
6. Cảnh báo SL/TP / thời gian giữ lệnh
7. Nhật ký sau mỗi lệnh

### Ưu tiên trung bình
8. Phân tích theo setup / chiến lược / cặp tiền
9. Equity curve và biểu đồ PnL hàng ngày
10. Risk management rule
11. Import từ cTrader / CSV
12. Xuất dữ liệu sang Excel/CSV

### Ưu tiên thấp
13. AI phân tích hành vi giao dịch
14. Gợi ý cải thiện kỷ luật
15. So sánh hiệu suất theo tháng / quý

## 6. Mapping với code hiện tại

Dự án hiện tại đã có nền tảng tốt ở các file sau:

- [public/trading.html](public/trading.html)
- [public/trading.js](public/trading.js)
- [public/trading.css](public/trading.css)
- [src/services/trading.service.js](src/services/trading.service.js)
- [src/config/database.js](src/config/database.js)

### Những điểm nên mở rộng ngay
- Thêm trường rr, riskAmount, accountId vào schema
- Thêm model RiskRule, JournalEntry, PerformanceSnapshot
- Tách UI thành các tab rõ ràng hơn như Overview / Trades / Analytics / Risk / Journal
- Bổ sung empty state và alert cards

## 7. Kế hoạch triển khai từng bước

### Giai đoạn 1
- Cải thiện layout tab Overview
- Thêm KPI cards và biểu đồ cơ bản
- Cải thiện form thêm lệnh

### Giai đoạn 2
- Thêm metrics về RR, drawdown, streak
- Bổ sung filter và bảng giao dịch nâng cao

### Giai đoạn 3
- Thêm risk rules và cảnh báo
- Thêm journal và snapshot

## 8. Kết luận

Phiên bản TaskFlow nên có phong cách dashboard trading “data-first”, nhẹ, rõ ràng và chuyên nghiệp. Không cần làm quá phức tạp, nhưng phải đủ để người dùng thấy được:

- hiệu suất giao dịch hiện tại
- rủi ro đang tồn tại
- cảm xúc và kỷ luật khi vào lệnh
- xu hướng phát triển trong thời gian dài
