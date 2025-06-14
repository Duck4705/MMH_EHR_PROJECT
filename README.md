﻿# ABE_EHR_System  
## Bối cảnh  
Bệnh viện A đang mong muốn một hệ thống kiểm soát truy cập và cấp quyền cho nhiều bác sĩ và nhân viên y tế thuộc nhiều phòng ban khác nhau truy cập vào nhiều tập tin hồ sơ y tế điện tử dựa trên thuộc tính và cấp bậc quyền hạng của họ trong bệnh viện phục vụ cho mục đích nghiên cứu và điều trị bệnh nhân. Hệ thống này sẽ chỉ giới hạn trong phạm vi bệnh viện và chỉ nhân viên thuộc bệnh viện mới có quyền sử dụng hệ thống này hợp pháp.  
## Phương pháp truyền thống  
Sử dụng hệ thống mã hóa công khai(còn gọi là mã hóa khóa bất đối xứng), dữ liệu mã hóa được nhắm mục tiêu để chỉ một người dùng cụ thể có thể giải mã. Người dùng muốn nhận dữ liệu mã hóa sẽ tạo một cặp khóa công khai và khóa riêng.  công bố khóa công khai, mà bất kỳ ai cũng có thể sử dụng để mã hóa dữ liệu gửi cho họ, và giữ bí mật khóa riêng để giải mã. Một ví dụ nổi bật của hệ thống mã hóa khóa công khai hiện nay là RSA (được đặt theo tên các nhà phát minh: Rivest, Shamir và Adleman). Mặc dù chức năng này hữu ích cho các ứng dụng như email mã hóa hoặc thiết lập phiên web an toàn, nó thiếu tính linh hoạt cần thiết để chia sẻ dữ liệu ở mức độ cao hơn.  
Ví dụ, giả sử một người muốn chia sẻ dữ liệu dựa trên thông tin xác thực hoặc vai trò của người dùng trong hệ thống. Xét trường hợp một người muốn mã hóa dữ liệu theo chính sách:  
**("Bác sĩ" VÀ "Khoa răng hàm mặt") HOẶC "Bộ phận tài chính".**  
Với các kỹ thuật mã hóa truyền thống, người dùng này sẽ phải tra cứu, liệt kê và mã hóa riêng cho từng người dùng phù hợp với chính sách này. (Trong thực tế, chúng ta có thể sử dụng RSA để mã hóa một khóa AES cho từng người dùng, sau đó mã hóa dữ liệu một lần bằng khóa AES này.) Đối với nhiều chính sách, đây là một nhiệm vụ khó khăn vì danh sách này có thể rất dài hoặc không sẵn có đối với chủ sở hữu dữ liệu. Ngoài ra, nhân sự thường xuyên thay đổi vai trò và trách nhiệm. Khi cố gắng chia sẻ thông tin theo một chính sách bằng mã hóa khóa công khai truyền thống, chúng ta gặp phải nhiều rào cản:  
+ **Việc cung cấp một cơ sở dữ liệu liệt kê tất cả người dùng phù hợp với một chính sách là một tác vụ phức tạp.** Cơ sở dữ liệu này phải được cập nhật liên tục, và người dùng muốn mã hóa dữ liệu phải duy trì kết nối.  
+ **Nếu nhiều người dùng phù hợp với một chính sách, chúng ta phải mã hóa dữ liệu cho từng người một.** Cả thời gian mã hóa lẫn kích thước bản mã (và chi phí lưu trữ/băng thông) sẽ tăng tuyến tính theo số lượng người dùng phù hợp, ngay cả khi chính sách rất đơn giản  
+ **Phương pháp này không hoạt động tốt khi có sự thay đổi vai trò.** Giả sử dữ liệu được mã hóa cho tất cả người dùng phù hợp với một chính sách và được lưu trữ. Điều gì xảy ra khi một người dùng sau này có thêm thông tin xác thực cho phép họ truy cập dữ liệu?  
## Đề xuất giải pháp mới
### Hệ thống mã hóa hồ sơ y tế điện của bệnh nhân dựa trên thuộc tính CP-ABE(Ciphertext-Policy Attribute-Based) 
Trong hệ thống ABE cơ bản này, có một cơ quan quản lý công bố các tham số công khai( dùng để mã hóa) và phân phối khóa riêng cho người dùng (để giải mã). Bất kỳ ai có tham số công khai đều có thể mã hóa dữ liệu sao cho chỉ những người dùng có quyền phù hợp mới có thể khôi phục dữ liệu.  
**Kiểm soát truy cập dựa trên vai trò: ABE với Chính sách trên Bản mã (CP-ABE)**      
+ Trong hệ thống CP-ABE, **thuộc tính gắn với người dùng**, còn **chính sách gắn với bản mã.**    
+ Một người dùng có thể giải mã bản mã **nếu và chỉ nếu** thuộc tính của họ thỏa mãn chính sách  
**Ví dụ:**  
+ Alice có các thuộc tính: **"nữ", "y tá", "tầng 3", "chuyên khoa hô hấp".**
+ Bob mã hóa hồ sơ bệnh án của một bệnh nhân với chính sách:  
**("bác sĩ" HOẶC "y tá") VÀ ("tầng 3" HOẶC "tầng 4").**  
+ Alice có thể mở hồ sơ này.  
  
Hệ thống này hoạt động tốt khi các chính sách mã hóa được biết trước, ví dụ: báo cáo kỹ thuật, tài liệu nhân sự, hồ sơ y tế.  
Điều cần phòng tránh ở  thống này là khả năng **chống tấn công thông đồng (collusion attack):** Một yếu tố cốt lõi của hệ thống này là bảo mật chống lại tấn công thông đồng hoặc kẻ tấn công có nhiều khóa. Đảm bảo rằng một nhóm người dùng thông đồng không thể truy cập dữ liệu vượt quá phạm vi quyền hạn riêng của từng người.  
**Ví dụ:**  
Giả sử chính sách truy cập vào hồ sơ y tế điện tử của bệnh nhân V là **(“Bác sĩ” AND “Khoa răng hàm mặt”)**  
Kẻ tấn công bằng cách nào đó có secret key của hai nhân viên y tế bệnh viện có chứa thuộc tính như sau:  
+ **(“Bác sĩ” AND “ Khoa hồi sức cấp cứu”)**  
+ **(“Y tá” AND “Khoa răng hàm mặt”)**
Kẻ tấn công sẽ tìm cách gộp các thuộc tính từ hai key này lại với nhau và hoàn toàn dựa vào key đã gộp thuộc tính lại và giải mã được hồ sơ y tế điện tử của bệnh nhân
## Triển khai hệ thống thật tế
![Anh1](img/Anh1.png)    
**Attribute Authority:** Nhiệm vụ là nơi tạo secret key của người dùng dựa trên thuộc tính dựa trên khóa mk(master key) và bộ chính sách chung mà bệnh viện quy định(Ví dụ bệnh viện có 1 khoa, 1 phòng admin và 1 phòng tài chính có các thuộc tính sau: “Bác sĩ”, “Y tá”, “Khoa răng hàm mặt”, “Bộ phận quản trị EHR” và “Giám đốc bệnh viện”). Các thuộc tính này có thể ánh xạ sang số học để tạo public key như:  
| Vai Trò | Ánh xạ |
|-----------|-----------|
| Bác sĩ | 1 |
| Y Tá | 2 |
| Bộ phận quản trị EHR | 11 |
| Khoa răng hàm mặt | 12 |
| Giám đốc bệnh viện | 100 |  
  
Khóa của dùng sẽ được tạo khi người dùng đăng nhập thành công. Người dùng sẽ lấy thuộc tính của mình thông qua EHR Server. EHR Server xác thực đăng nhập thành công truy xuất database của bệnh viện lấy thông tin thuộc của người dùng rồi gửi lại cho người dùng. Người dùng sẽ gửi những thuộc tính này đến Attribute Authority để tạo khóa riêng.  
**EHR server:** EHR server là nơi người dùng cho phép truy xuất hồ sơ y tế của bệnh nhân. EHR server sẽ là người trung gian lấy, lưu thông tin từ database cho người dùng. Hệ thống này sẽ không từ chối bất kỳ truy cập vào bất cứ dữ liệu EHR nào mà sẽ cho phép truy cập tất cả các file đó. Bởi vì các dữ liệu này đã được mã hóa bằng AES-256 muốn đọc được thì phải giải mã nó ra. Khi người dùng muốn đọc thông tin hồ sơ của bệnh nhân có ID X. EHR sẽ truy xuất database lấy dữ liệu liên quan đến bệnh nhân rồi gửi lại cho người dùng kèm theo khóa AES đã được mã hóa bằng ABE.  
**Người dùng:** Người dùng sẽ đăng nhập bằng một phần mềm do bệnh viện cung cấp. Phần mềm này sẽ là giao diện để người dùng có thể giải mã và mã hóa dữ liệu EHR. Phần mềm này sẽ chứa các thuật toán giải mã ABE dùng để giải mã khóa AES-256 sau đó khóa này dùng để giải mã dữ liệu EHR.  
Các chức năng người dùng có thể sử dụng:  
Sau khi đăng nhập bằng tài khoản do bệnh viện cấp, phần mềm này sẽ gửi yêu cầu đến EHR để lấy thuộc tính người dùng. Sau khi có  thuộc tính phần mềm sẽ gửi đến Attribute Authority  để tạo khóa riêng.  
Chức năng đọc dữ liệu y tế của bệnh nhân: Người dùng sẽ gửi ID bệnh nhân mong muốn xem lên EHR server để server gửi dữ liệu liên quan của bệnh nhân này lại cho người dùng. Sau khi nhận dữ liệu người dùng sẽ dùng secret key đã được cấp để giải mã khóa AES-256, rồi dùng khóa đó giải mã dữ liệu.  
Chức năng tải dữ liệu y tế của bệnh nhân lên server: Người dùng sau khi nhập hết thông tin bệnh nhân tại phần mềm do bệnh viện cấp sẽ dùng AES-256 để mã hóa khóa của AES-256 sẽ random mỗi lần mã hóa. Sau khi mã hóa dữ liệu thì khóa AES random này sẽ được mã hóa bằng khóa công khai ABE. Sau đó người dùng gửi dữ liệu này lên EHR server.  
## Công nghệ sử dụng 
**Attribute Authority:** Thư viện charm-crypto    
**EHR server:**  Nodejs, Mongdb  
**Người dùng:**  python  
## Dự án đã làm được  
Hiện tại nhóm đã triển khai thành công hệ thống mã hóa hồ sơ y tế điện của bệnh nhân dựa trên thuộc tính CP-ABE. Có giao diện cho người dùng, người dùng có thể mã hóa đữ liệu y tế lên database của bệnh viện và giải mã thành công bằng cách gửi thuộc tính tới AA để tạo khóa riêng để giải mã.  
**Khó khăn**  
Thư viện hiện tại charm-crypto đã bị outdate nên không có các chuẩn mới để tạo khóa an toàn như EC 128 bit và 256 bit  
Thư viện hiện tại không có cơ chế chống thông đồng nghĩa là các kẻ tấn công có thể lợi dụng lỗ hổng này để bẻ khóa  
## Hướng đi trong tương lai  
Nhóm sẽ cố gắng cải thiện những vấn đề đang gặp phải như các chuẩn chưa đạt yêu cầu và chưa chống được tấn công thông đồng.  
Giải quyết những vấn đề đó bằng cách sử dụng thư có hỗ trợ chuẩn mới và cơ chế chống thông đồng như thư viện openABE(hiện tại thư viện này cũng đã ngừng cập nhật nhưng vẫn còn nhiều triển vọng để khai thác)  
