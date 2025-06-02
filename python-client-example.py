#!/usr/bin/env python3
# filepath: d:\EHR_Database\python-client-example.py

import requests
import json
from hashlib import sha3_256

class EHR_API_Client:
    def __init__(self, base_url="http://localhost:5000/api"):
        self.base_url = base_url
        self.token = None
        self.user_info = None
    
    def login(self, username, password):
        """
        Đăng nhập vào hệ thống API và lấy token xác thực
        Mật khẩu được băm bởi phía server, không phải phía client
        """
        try:
            response = requests.post(f"{self.base_url}/users/login", json={
                "username": username,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["token"]
                self.user_info = data["user"]
                print(f"Đăng nhập thành công! Xin chào {self.user_info['fullName'] or username}")
                return True
            else:
                print(f"Đăng nhập thất bại: {response.json().get('message', 'Unknown error')}")
                return False
        except Exception as e:
            print(f"Lỗi khi đăng nhập: {str(e)}")
            return False
    
    def get_headers(self):
        """Trả về headers cần thiết cho API requests"""
        if not self.token:
            return {}
        return {"Authorization": f"Bearer {self.token}"}
    
    def get_patients(self):
        """Lấy danh sách tất cả các bệnh nhân"""
        try:
            response = requests.get(
                f"{self.base_url}/patients", 
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Không thể lấy danh sách bệnh nhân: {response.json().get('message', 'Unknown error')}")
                return None
        except Exception as e:
            print(f"Lỗi khi lấy danh sách bệnh nhân: {str(e)}")
            return None
    
    def get_patient(self, patient_id):
        """Lấy thông tin chi tiết của một bệnh nhân"""
        try:
            response = requests.get(
                f"{self.base_url}/patients/{patient_id}", 
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Không thể lấy thông tin bệnh nhân: {response.json().get('message', 'Unknown error')}")
                return None
        except Exception as e:
            print(f"Lỗi khi lấy thông tin bệnh nhân: {str(e)}")
            return None
    
    def create_patient(self, patient_data):
        """Tạo bệnh nhân mới"""
        try:
            response = requests.post(
                f"{self.base_url}/patients", 
                headers=self.get_headers(),
                json=patient_data
            )
            
            if response.status_code == 201:
                return response.json()
            else:
                print(f"Không thể tạo bệnh nhân mới: {response.json().get('message', 'Unknown error')}")
                return None
        except Exception as e:
            print(f"Lỗi khi tạo bệnh nhân mới: {str(e)}")
            return None
    
    def update_patient(self, patient_id, patient_data):
        """Cập nhật thông tin bệnh nhân"""
        try:
            response = requests.put(
                f"{self.base_url}/patients/{patient_id}", 
                headers=self.get_headers(),
                json=patient_data
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Không thể cập nhật thông tin bệnh nhân: {response.json().get('message', 'Unknown error')}")
                return None
        except Exception as e:
            print(f"Lỗi khi cập nhật thông tin bệnh nhân: {str(e)}")
            return None
    
    def delete_patient(self, patient_id):
        """Xóa bệnh nhân"""
        try:
            response = requests.delete(
                f"{self.base_url}/patients/{patient_id}", 
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Không thể xóa bệnh nhân: {response.json().get('message', 'Unknown error')}")
                return None
        except Exception as e:
            print(f"Lỗi khi xóa bệnh nhân: {str(e)}")
            return None
    

 
    
    def forgot_password(self, email):
        """Gửi yêu cầu đặt lại mật khẩu"""
        try:
            response = requests.post(
                f"{self.base_url}/users/forgot-password", 
                json={"email": email}
            )
            
            if response.status_code == 200:
                print(response.json().get('message'))
                return True
            else:
                print(f"Lỗi: {response.json().get('message', 'Unknown error')}")
                return False
        except Exception as e:
            print(f"Lỗi khi gửi yêu cầu đặt lại mật khẩu: {str(e)}")
            return False
    
    def check_reset_token(self, token, user_id):
        """Kiểm tra tính hợp lệ của token đặt lại mật khẩu"""
        try:
            response = requests.get(
                f"{self.base_url}/users/reset-password/check-token?token={token}&id={user_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('valid', False)
            else:
                print(f"Token không hợp lệ: {response.json().get('message', 'Unknown error')}")
                return False
        except Exception as e:
            print(f"Lỗi khi kiểm tra token: {str(e)}")
            return False
    
    def reset_password(self, token, user_id, new_password):
        """Đặt lại mật khẩu với token"""
        try:
            response = requests.post(
                f"{self.base_url}/users/reset-password", 
                json={
                    "token": token,
                    "id": user_id,
                    "newPassword": new_password
                }
            )
            
            if response.status_code == 200:
                print(response.json().get('message'))
                return True
            else:
                print(f"Không thể đặt lại mật khẩu: {response.json().get('message', 'Unknown error')}")
                return False
        except Exception as e:
            print(f"Lỗi khi đặt lại mật khẩu: {str(e)}")
            return False

# Ví dụ sử dụng
def main():
    client = EHR_API_Client()
    
    # Hiển thị tài liệu API
    print("EHR API Client")
    
    # Đăng nhập
    username = input("Tên đăng nhập: ")
    password = input("Mật khẩu: ")
    
    if client.login(username, password):
        while True:
            print("\n--- MENU ---")
            print("1. Xem danh sách bệnh nhân")
            print("2. Xem chi tiết bệnh nhân")
            print("3. Thêm bệnh nhân mới")
            print("4. Cập nhật thông tin bệnh nhân")
            print("5. Xóa bệnh nhân")
            print("6. Đặt lại mật khẩu")
            print("7. Thoát")
            
            choice = input("\nLựa chọn của bạn: ")
            
            if choice == "1":
                patients = client.get_patients()
                if patients:
                    print("\nDanh sách bệnh nhân:")
                    for i, patient in enumerate(patients):
                        print(f"{i+1}. {patient.get('HoTen', 'Không có tên')} - ID: {patient.get('ID_BenhNhan', 'N/A')}")
            
            elif choice == "2":
                patient_id = input("Nhập ID bệnh nhân: ")
                patient = client.get_patient(patient_id)
                if patient:
                    print("\nThông tin chi tiết bệnh nhân:")
                    print(json.dumps(patient, indent=2, ensure_ascii=False))
            elif choice == "3":
                print("\nNhập thông tin bệnh nhân mới:")
                patient_data = {
                    "ID_BenhNhan": input("ID Bệnh Nhân: "),
                    "HoTen": input("Họ Tên: "),
                    "GioiTinh": input("Giới Tính (Nam/Nữ/Khác): "),
                    "NgaySinh": input("Ngày Sinh (YYYY-MM-DD): "),
                    "Tuoi": int(input("Tuổi: ")),
                    "DiaChi": input("Địa Chỉ: "),
                    "ThongTinLienLac": input("Thông Tin Liên Lạc: "),
                    "TienSuBenh": input("Tiền Sử Bệnh: "),
                    "CanNang": float(input("Cân Nặng (kg): ") or "0") or None,
                    "ChieuCao": float(input("Chiều Cao (cm): ") or "0") or None,
                    "NhomMau": input("Nhóm Máu (A/B/AB/O): "),
                    "DonThuoc": input("Đơn Thuốc: "),
                    "DiUng": input("Dị Ứng: "),
                    "ChiTietBenh": input("Chi Tiết Bệnh: ")
                }
                result = client.create_patient(patient_data)
                if result:
                    print(f"Đã thêm bệnh nhân mới thành công với ID: {result.get('ID_BenhNhan')}")
            elif choice == "4":
                patient_id = input("Nhập ID bệnh nhân cần cập nhật: ")
                print("\nNhập thông tin cần cập nhật (để trống nếu không muốn cập nhật):")
                update_data = {}
                
                ho_ten = input("Họ Tên: ")
                if ho_ten:
                    update_data["HoTen"] = ho_ten
                
                gioi_tinh = input("Giới Tính (Nam/Nữ/Khác): ")
                if gioi_tinh:
                    update_data["GioiTinh"] = gioi_tinh
                    
                ngay_sinh = input("Ngày Sinh (YYYY-MM-DD): ")
                if ngay_sinh:
                    update_data["NgaySinh"] = ngay_sinh
                    
                tuoi = input("Tuổi: ")
                if tuoi:
                    update_data["Tuoi"] = int(tuoi)
                
                dia_chi = input("Địa Chỉ: ")
                if dia_chi:
                    update_data["DiaChi"] = dia_chi
                    
                thong_tin_lien_lac = input("Thông Tin Liên Lạc: ")
                if thong_tin_lien_lac:
                    update_data["ThongTinLienLac"] = thong_tin_lien_lac
                    
                tien_su_benh = input("Tiền Sử Bệnh: ")
                if tien_su_benh:
                    update_data["TienSuBenh"] = tien_su_benh
                    
                can_nang = input("Cân Nặng (kg): ")
                if can_nang:
                    update_data["CanNang"] = float(can_nang)
                    
                chieu_cao = input("Chiều Cao (cm): ")
                if chieu_cao:
                    update_data["ChieuCao"] = float(chieu_cao)
                    
                nhom_mau = input("Nhóm Máu (A/B/AB/O): ")
                if nhom_mau:
                    update_data["NhomMau"] = nhom_mau
                    
                don_thuoc = input("Đơn Thuốc: ")
                if don_thuoc:
                    update_data["DonThuoc"] = don_thuoc
                    
                di_ung = input("Dị Ứng: ")
                if di_ung:
                    update_data["DiUng"] = di_ung
                    
                chi_tiet_benh = input("Chi Tiết Bệnh: ")
                if chi_tiet_benh:
                    update_data["ChiTietBenh"] = chi_tiet_benh
                
                if update_data:
                    result = client.update_patient(patient_id, update_data)
                    if result:
                        print("Cập nhật thông tin bệnh nhân thành công!")
                else:
                    print("Không có thông tin nào được cập nhật.")
            
            elif choice == "5":
                patient_id = input("Nhập ID bệnh nhân cần xóa: ")
                confirm = input(f"Bạn có chắc chắn muốn xóa bệnh nhân có ID {patient_id}? (y/n): ")
                
                if confirm.lower() == 'y':
                    result = client.delete_patient(patient_id)
                    if result:
                        print("Xóa bệnh nhân thành công!")
            
            elif choice == "6":
                email = input("Nhập email của bạn: ")
                if client.forgot_password(email):
                    print("Vui lòng kiểm tra email của bạn để đặt lại mật khẩu.")
            
            elif choice == "7":
                print("Tạm biệt!")
                break
            
            else:
                print("Lựa chọn không hợp lệ. Vui lòng thử lại.")

if __name__ == "__main__":
    main()
