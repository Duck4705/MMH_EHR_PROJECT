import requests
import json
import base64
import hashlib
import secrets
import sys
import os
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

# Add ABE module path
abe_module_path = os.path.join(os.path.dirname(__file__), '..', 'AttributeAuthority')
if abe_module_path not in sys.path:
    sys.path.append(abe_module_path)

try:
    from ABE_Module import ABECore
    abe_available = True
    print("ABE module loaded successfully")
except ImportError as e:
    print(f"Warning: ABE module not available: {e}")
    abe_available = False

class ABEClient:
    def __init__(self):
        self.aa_server_url = "http://localhost:5001"
        self.ehr_server_url = "http://localhost:5000"
        self.token = None
        self.user_info = None
        self.abe_core = None
        
        if abe_available:
            try:
                self.abe_core = ABECore()
                print("ABE Core initialized")
            except Exception as e:
                print(f"ABE Core init error: {e}")
    
    def set_auth_token(self, token, user_info):
        """Set authentication token and user info"""
        self.token = token
        self.user_info = user_info
        print(f"ABE Client: Token set for user {user_info.get('username', 'unknown')}")
    
    def get_headers(self):
        """Get headers with authentication token"""
        if self.token:
            return {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        return {"Content-Type": "application/json"}
    
    def register_user_with_aa(self, user_id, role, department=None):
        """Register user with AA server"""
        try:
            if not self.token:
                return False, "No authentication token"
            
            headers = self.get_headers()
            
            response = requests.post(
                f"{self.ehr_server_url}/api/abe/register-current-user",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return True, result
            else:
                error_msg = response.json().get("message", f"HTTP {response.status_code}")
                return False, error_msg
                
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def register_current_user_with_aa(self):
        """Register current user with AA server via EHR server"""
        try:
            if not self.token or not self.user_info:
                return False, "Missing authentication token or user info"
            
            print(f"🔧 Registering user with AA server...")
            
            response = requests.post(
                f"{self.ehr_server_url}/api/abe/register-current-user",
                headers=self.get_headers(),
                timeout=30
            )
            
            print(f"📡 AA registration response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ User registered with attributes: {result.get('attributes', [])}")
                return True, result
            else:
                error_msg = response.json().get("message", f"HTTP {response.status_code}")
                return False, error_msg
                
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def encrypt_aes_key_for_patient(self, aes_key, access_policy):
        """Encrypt AES key with access policy for patient data"""
        try:
            data = {
                "aes_key": aes_key,
                "policy": access_policy
            }
            
            print(f"🔐 Encrypting AES key with policy: {access_policy}")
            
            response = requests.post(
                f"{self.ehr_server_url}/api/abe/encrypt-aes-key",
                json=data,
                headers=self.get_headers(),
                timeout=30
            )
            
            print(f"📡 EHR server response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                return True, result.get("encrypted_key")
            else:
                error_msg = response.json().get("message", f"HTTP {response.status_code}")
                return False, error_msg
                
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def decrypt_aes_key_for_patient(self, encrypted_aes_key, user_id):
        """Decrypt AES key for patient data access"""
        try:
            data = {
                "encrypted_key": encrypted_aes_key,
                "user_id": user_id
            }
            
            print(f"🔓 Decrypting AES key for user: {user_id}")
            
            response = requests.post(
                f"{self.ehr_server_url}/api/abe/decrypt-aes-key",
                json=data,
                headers=self.get_headers(),
                timeout=30
            )
            
            print(f"📡 Decrypt response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                return True, result.get("decrypted_key")
            else:
                error_msg = response.json().get("message", f"HTTP {response.status_code}")
                return False, error_msg
                
        except Exception as e:
            return False, f"Error: {str(e)}"

    def decrypt_patient_data(self, patient_data):
        """Decrypt patient data for viewing"""
        try:
            if not self.token or not self.user_info:
                return False, "Missing authentication token or user info"
            
            user_id = self.user_info.get('user_id') or self.user_info.get('id')
            encrypted_aes_key = patient_data.get('encrypted_aes_key')
            
            if not encrypted_aes_key:
                return False, "No encrypted AES key found"
            
            print(f"🔓 Attempting to decrypt AES key for user: {user_id}")
            
            # Decrypt the AES key using ABE
            success, aes_key = self.decrypt_aes_key_for_patient(encrypted_aes_key, user_id)
            
            if not success:
                return False, f"Failed to decrypt AES key: {aes_key}"
            
            if aes_key:
                # Now decrypt the patient data fields
                decrypted_data = self.decrypt_patient_fields(patient_data, aes_key)
                return True, decrypted_data
            else:
                return False, "Failed to get decrypted AES key"
                
        except Exception as e:
            return False, f"Error: {str(e)}"

    def decrypt_patient_fields(self, patient_data, aes_key):
        """Decrypt individual patient data fields"""
        try:
            decrypted_data = patient_data.copy()
            
            # List of encrypted fields
            encrypted_fields = [
                'NgaySinh', 'DiaChi', 'ThongTinLienLac', 'TienSuBenh',
                'Tuoi', 'CanNang', 'ChieuCao', 'NhomMau', 'DonThuoc',
                'DiUng', 'ChiTietBenh', 'GioiTinh'
            ]
            
            for field in encrypted_fields:
                if field in patient_data and patient_data[field]:
                    try:
                        encrypted_value = patient_data[field]
                        decrypted_value = self.aes_decrypt(encrypted_value, aes_key)
                        decrypted_data[field] = decrypted_value
                    except Exception as field_error:
                        print(f"❌ Error decrypting field {field}: {field_error}")
                        decrypted_data[field] = f"[Lỗi giải mã: {field}]"
            
            return decrypted_data
            
        except Exception as e:
            print(f"❌ Error in decrypt_patient_fields: {e}")
            return patient_data

    def aes_decrypt(self, encrypted_text, key):
        """Decrypt AES encrypted text using AES-256-GCM (secure mode)"""
        try:
            # Handle mock key for testing
            if key == 'bW9ja19kZWNyeXB0ZWRfYWVzX2tleQ==':
                return f"[MOCK DECRYPTED: {encrypted_text[:50]}...]"
            
            # Handle different key formats and ensure correct length
            if isinstance(key, str):
                # Remove any whitespace
                key = key.strip()
                
                # If key is base64 encoded
                try:
                    aes_key = base64.b64decode(key)
                    # Ensure exactly 32 bytes for AES-256
                    if len(aes_key) > 32:
                        aes_key = aes_key[:32]  # Truncate to 32 bytes
                    elif len(aes_key) < 32:
                        aes_key = aes_key.ljust(32, b'\x00')  # Pad to 32 bytes
                except:
                    # If key is hex encoded
                    try:
                        # Remove any non-hex characters
                        hex_key = ''.join(c for c in key if c in '0123456789abcdefABCDEF')
                        
                        # Ensure exactly 64 hex characters (32 bytes)
                        if len(hex_key) > 64:
                            hex_key = hex_key[:64]  # Truncate to 64 hex chars
                        elif len(hex_key) < 64:
                            hex_key = hex_key.ljust(64, '0')  # Pad to 64 hex chars
                        
                        aes_key = bytes.fromhex(hex_key)
                        print(f"🔑 Using hex key: {hex_key[:16]}... (length: {len(aes_key)} bytes)")
                    except:
                        # If key is plain text, hash it to get 32 bytes
                        aes_key = hashlib.sha256(key.encode('utf-8')).digest()
                        print(f"🔑 Hashed text key to 32 bytes")
            else:
                aes_key = key
                # Ensure exactly 32 bytes
                if len(aes_key) > 32:
                    aes_key = aes_key[:32]
                elif len(aes_key) < 32:
                    aes_key = aes_key.ljust(32, b'\x00')
            
            print(f"🔑 Final AES key length: {len(aes_key)} bytes")
            
            # Handle different encrypted text formats for GCM
            try:
                # Try GCM format first: base64(nonce + tag + encrypted_data)
                if ':' in encrypted_text and len(encrypted_text.split(':')) == 3:
                    # Format: nonce_hex:tag_hex:encrypted_hex (GCM format)
                    nonce_hex, tag_hex, encrypted_hex = encrypted_text.split(':', 2)
                    nonce = bytes.fromhex(nonce_hex)
                    tag = bytes.fromhex(tag_hex)
                    encrypted_data = bytes.fromhex(encrypted_hex)
                    
                    print(f"🔐 Using GCM format: nonce={len(nonce)}, tag={len(tag)}, data={len(encrypted_data)}")
                    
                    # Decrypt using GCM
                    cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
                    decrypted = cipher.decrypt_and_verify(encrypted_data, tag)
                    
                elif len(encrypted_text) > 100:  # Likely base64 GCM format
                    # Format: base64(nonce[12] + tag[16] + encrypted_data)
                    combined = base64.b64decode(encrypted_text)
                    nonce = combined[:12]  # GCM nonce is 12 bytes
                    tag = combined[12:28]  # GCM tag is 16 bytes
                    encrypted_data = combined[28:]
                    
                    print(f"🔐 Using base64 GCM format: nonce={len(nonce)}, tag={len(tag)}, data={len(encrypted_data)}")
                    
                    # Decrypt using GCM
                    cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
                    decrypted = cipher.decrypt_and_verify(encrypted_data, tag)
                    
                else:
                    # Fallback to CBC for backward compatibility (legacy data)
                    print("⚠️ Using fallback CBC mode for legacy data")
                    if ':' in encrypted_text:
                        # Format: iv_hex:encrypted_hex
                        iv_hex, encrypted_hex = encrypted_text.split(':', 1)
                        iv = bytes.fromhex(iv_hex)
                        encrypted_data = bytes.fromhex(encrypted_hex)
                    else:
                        # Format: base64(iv + encrypted_data)
                        combined = base64.b64decode(encrypted_text)
                        iv = combined[:16]
                        encrypted_data = combined[16:]
                    
                    # Create cipher and decrypt
                    cipher = AES.new(aes_key, AES.MODE_CBC, iv)
                    decrypted = unpad(cipher.decrypt(encrypted_data), AES.block_size)
                
            except Exception as decrypt_error:
                print(f"❌ GCM decryption failed, trying CBC: {decrypt_error}")
                # Fallback to CBC
                if ':' in encrypted_text:
                    iv_hex, encrypted_hex = encrypted_text.split(':', 1)
                    iv = bytes.fromhex(iv_hex)
                    encrypted_data = bytes.fromhex(encrypted_hex)
                else:
                    combined = base64.b64decode(encrypted_text)
                    iv = combined[:16]
                    encrypted_data = combined[16:]
                
                cipher = AES.new(aes_key, AES.MODE_CBC, iv)
                decrypted = unpad(cipher.decrypt(encrypted_data), AES.block_size)
            
            result = decrypted.decode('utf-8')
            print(f"✅ Successfully decrypted: {result[:50]}...")
            return result
            
        except Exception as e:
            print(f"❌ AES decrypt error: {e}")
            print(f"❌ Key: {key[:32] if isinstance(key, str) else 'bytes'}...")
            print(f"❌ Encrypted text: {encrypted_text[:100]}...")
            return "[Lỗi giải mã]"

    def aes_encrypt_gcm(self, plaintext, key):
        """Encrypt using AES-256-GCM (secure mode)"""
        try:
            # Ensure 32-byte key
            if isinstance(key, str):
                if len(key) == 64:  # hex string
                    aes_key = bytes.fromhex(key)
                else:
                    aes_key = hashlib.sha256(key.encode('utf-8')).digest()
            else:
                aes_key = key[:32] if len(key) > 32 else key.ljust(32, b'\x00')
            
            # Generate random nonce (12 bytes for GCM)
            nonce = secrets.token_bytes(12)
            
            # Create cipher and encrypt
            cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
            encrypted_data, tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))
            
            # Combine nonce + tag + encrypted_data and encode as base64
            combined = nonce + tag + encrypted_data
            return base64.b64encode(combined).decode('utf-8')
            
        except Exception as e:
            print(f"❌ AES-GCM encrypt error: {e}")
            raise

    def check_user_access(self, policy_expression, user_attributes):
        """Check if user has access based on policy"""
        try:
            if 'ROLE:ADMIN' in user_attributes:
                return True
            
            for attr in user_attributes:
                if attr in policy_expression:
                    return True
            
            return False
        except Exception as e:
            print(f"Error checking access: {e}")
            return False

# Global instance
abe_client = ABEClient()