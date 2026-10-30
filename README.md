# Todolist-app

## Environment setup

Copy `.env.example` to `.env` and set the values you need:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/TaskFlowDB
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```

If `GROQ_API_KEY` is missing, the app still starts normally but AI endpoints return `503 AI chưa được cấu hình`.

## Email nhắc lịch

Email nhắc được gửi tới `EMAIL_TO` cho deadline của Todo và mục loại `task` trong lịch một ngày, nhiều ngày hoặc thời khóa biểu tuần. Worker kiểm tra mỗi 15 giây và chỉ nhắc một lần cho mỗi deadline/lần xuất hiện lịch; server cần đang chạy khi đến giờ (có tối đa 15 phút trễ để khôi phục sau gián đoạn). Với Gmail, bật xác minh 2 bước và tạo App Password; không dùng mật khẩu đăng nhập Gmail thông thường. Điền cấu hình `SMTP_*` trong file `.env` dựa trên `.env.example`, sau đó khởi động lại ứng dụng. Email chỉ được gửi sau khi SMTP được cấu hình hợp lệ.

## Sao lưu và khôi phục

Backup đầy đủ bao gồm công việc, nhãn, thói quen và lịch sử, ghi chú và phiên bản ghi chú, dữ liệu học tiếng Anh, giao dịch và lịch trình. Khi nhập file, TaskFlow kiểm tra định dạng và hiển thị số lượng bản ghi trước khi thực hiện:

- **Gộp dữ liệu** giữ nguyên dữ liệu hiện có và chỉ thêm bản ghi có mã chưa tồn tại. Xung đột ở trường duy nhất sẽ báo lỗi thay vì ghi đè.
- **Thay thế dữ liệu** yêu cầu nhập `THAY THE` để xác nhận và tải một bản sao lưu dữ liệu hiện tại xuống trước khi thay thế. Các phần không có trong backup cũ được giữ nguyên.

Các màn hình Công việc, Habit, Second Brain, English, Trading và Thời khóa biểu có mục nhập file tương ứng với dữ liệu xuất của màn hình đó. Nhập module sẽ gộp dữ liệu và bỏ qua mã đã có; thời khóa biểu nhập từ file sẽ thay thế lịch và danh sách công việc của màn hình sau khi xác nhận. File thời khóa biểu được xuất dưới dạng JSON để có thể nhập lại.

Trong Second Brain, kéo biểu tượng tay nắm trên thẻ để lưu thứ tự mục. Hãy tắt bộ lọc và tìm kiếm trước khi sắp xếp; mục đã ghim giữ ở nhóm riêng. Nút thư mục mở quản lý danh mục để đổi tên hoặc gỡ danh mục khỏi ghi chú (không xóa ghi chú). Nhấn `/` khi không nhập liệu để tìm nhanh; nút × xóa từ khóa, còn “Xóa bộ lọc” giúp hiện lại mục khi không có kết quả.

Tuỳ chọn giao diện lưu trong trình duyệt và cài đặt khởi động cùng Windows không nằm trong file backup dữ liệu máy chủ. Chạy kiểm thử bằng `npm test`.

## Kích thước cửa sổ desktop

Trong Cài đặt, chọn một kích thước cửa sổ TaskFlow có sẵn. Tuỳ chọn được lưu trong cài đặt ứng dụng và áp dụng ngay trong bản Electron; kích thước và giới hạn thu nhỏ được điều chỉnh theo vùng làm việc của màn hình hiện tại. Cài đặt này chỉ đổi kích thước cửa sổ TaskFlow, không thay đổi độ phân giải hiển thị của Windows. Tùy chọn khởi động cùng Windows chỉ khả dụng trong bản desktop đã đóng gói trên Windows.

## Khởi động ứng dụng desktop

Electron mở cửa sổ giao diện ngay khi web server sẵn sàng, đồng thời kết nối MongoDB ở nền. Dữ liệu sẽ hiện khi kết nối hoàn tất; nếu kết nối thất bại, TaskFlow báo lỗi thay vì để cửa sổ khởi động bị treo. Nhấn biểu tượng TaskFlow trong khay hệ thống một lần hoặc chọn “Mở TaskFlow” để hiện lại cửa sổ; đóng cửa sổ sẽ thu nhỏ ứng dụng xuống khay.

## Cập nhật ứng dụng desktop

Bản desktop cài bằng NSIS tự kiểm tra GitHub Releases khi khởi động, tải bản mới ở nền và cho phép cài đặt trong **Cài đặt → Cập nhật ứng dụng**. Đóng/mở lại app hoặc chọn khởi động lại để cài bản đã tải. Bản portable và bản chạy trên trình duyệt không hỗ trợ cập nhật tự động.

Release Windows được build và phát hành từ GitHub Actions khi push tag có cùng phiên bản với `package.json` (ví dụ `v1.0.2`). Lần đầu chuyển từ bản portable/cũ cần cài một lần bản NSIS; hiện phiên bản ứng dụng là `1.0.2`. Updater chỉ hoạt động sau khi workflow phát hành đã được đưa lên GitHub và có ít nhất một GitHub Release; nếu chưa có release, Cài đặt sẽ báo trạng thái này.
