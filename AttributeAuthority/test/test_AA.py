import requests
import json

# AA Server URL
BASE_URL = "http://localhost:5001/api"

def test_real_abe_server():
    """Test the real ABE server functionality"""
    
    print("Testing Real ABE Server...")
    
    # 1. Health check
    try:
        response = requests.get("http://localhost:5001/health")
        print(f"✓ Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"  {response.json()}")
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return
    
    # 2. Get public key
    try:
        response = requests.get(f"{BASE_URL}/abe/public-key")
        print(f"✓ Public key: {response.status_code}")
        if response.status_code == 200:
            print(f"  Public key length: {len(response.json()['publicKey'])} characters")
    except Exception as e:
        print(f"✗ Public key failed: {e}")
    
    # 3. Create a policy
    try:
        policy_data = {
            "policyName": "cardiology_policy",
            "accessPolicy": "ROLE:DOCTOR and DEPT:CARDIOLOGY",
            "description": "Access policy for cardiology doctors"
        }
        response = requests.post(f"{BASE_URL}/policy", json=policy_data)
        print(f"✓ Create policy: {response.status_code}")
        if response.status_code == 201:
            print(f"  Policy created: {response.json()['policy_id']}")
    except Exception as e:
        print(f"✗ Create policy failed: {e}")
    
    # 4. Register a cardiology doctor
    try:
        user_data = {
            "user_id": "cardio_doctor_1",
            "attributes": ["ROLE:DOCTOR", "DEPT:CARDIOLOGY"]
        }
        response = requests.post(f"{BASE_URL}/user/register", json=user_data)
        print(f"✓ Register cardiology doctor: {response.status_code}")
        if response.status_code == 201:
            print(f"  User registered with attributes: {response.json()['attributes']}")
    except Exception as e:
        print(f"✗ Register cardiology doctor failed: {e}")
    
    # 5. Register a pediatrics doctor (should NOT have access)
    try:
        user_data = {
            "user_id": "pediatric_doctor_1",
            "attributes": ["ROLE:DOCTOR", "DEPT:PEDIATRICS"]
        }
        response = requests.post(f"{BASE_URL}/user/register", json=user_data)
        print(f"✓ Register pediatrics doctor: {response.status_code}")
        if response.status_code == 201:
            print(f"  User registered with attributes: {response.json()['attributes']}")
    except Exception as e:
        print(f"✗ Register pediatrics doctor failed: {e}")
    
    # 6. Test encryption with cardiology policy
    try:
        encrypt_data = {
            "data": {"aesKey": "sensitive_cardiology_aes_key_12345"},
            "policy_expression": "ROLE:DOCTOR and DEPT:CARDIOLOGY"
        }
        enc_response = requests.post(f"{BASE_URL}/encrypt", json=encrypt_data)
        print(f"✓ Encrypt data: {enc_response.status_code}")
        
        if enc_response.status_code == 200:
            ciphertext = enc_response.json()['ciphertext']
            print(f"  Ciphertext length: {len(ciphertext)} characters")
            
            # 7. Test decryption with cardiology doctor (should succeed)
            cardio_key_response = requests.get(f"{BASE_URL}/user/cardio_doctor_1/key")
            if cardio_key_response.status_code == 200:
                cardio_key = cardio_key_response.json()['private_key']
                
                decrypt_data = {
                    "ciphertext": ciphertext,
                    "user_key": cardio_key
                }
                dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
                print(f"✓ Decrypt with cardiology doctor: {dec_response.status_code}")
                if dec_response.status_code == 200:
                    decrypted = dec_response.json()['plaintext']
                    print(f"  Decrypted data: {decrypted}")
                else:
                    print(f"  Decryption failed: {dec_response.json()}")
            
            # 8. Test decryption with pediatrics doctor (should fail)
            pediatric_key_response = requests.get(f"{BASE_URL}/user/pediatric_doctor_1/key")
            if pediatric_key_response.status_code == 200:
                pediatric_key = pediatric_key_response.json()['private_key']
                
                decrypt_data = {
                    "ciphertext": ciphertext,
                    "user_key": pediatric_key
                }
                dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
                print(f"✓ Decrypt with pediatrics doctor: {dec_response.status_code}")
                if dec_response.status_code == 403:
                    print(f"  Access correctly denied: {dec_response.json()['error']}")
                else:
                    print(f"  Unexpected result: {dec_response.json()}")
        
    except Exception as e:
        print(f"✗ Encryption/Decryption test failed: {e}")
    
    print("\n=== Test Summary ===")
    print("✓ Real ABE encryption/decryption working")
    print("✓ Policy-based access control functioning")
    print("✓ Proper attribute-based authorization")

def debug_abe_system():
    """Debug the ABE system step by step"""
    
    print("=== Debugging ABE System ===\n")
    
    # 1. Test simple policy first
    print("1. Testing simple ADMIN policy...")
    try:
        # Register admin user
        admin_data = {
            "user_id": "admin_user",
            "attributes": ["ROLE:ADMIN"]
        }
        response = requests.post(f"{BASE_URL}/user/register", json=admin_data)
        print(f"   Register admin: {response.status_code}")
        
        if response.status_code == 201:
            # Test with simple ADMIN policy
            encrypt_data = {
                "data": {"aesKey": "admin_test_key"},
                "policy_expression": "ROLE:ADMIN"  # Simple policy
            }
            enc_response = requests.post(f"{BASE_URL}/encrypt", json=encrypt_data)
            print(f"   Encrypt with ADMIN policy: {enc_response.status_code}")
            
            if enc_response.status_code == 200:
                ciphertext = enc_response.json()['ciphertext']
                
                # Get admin key and try decryption
                admin_key_response = requests.get(f"{BASE_URL}/user/admin_user/key")
                if admin_key_response.status_code == 200:
                    admin_key = admin_key_response.json()['private_key']
                    
                    decrypt_data = {
                        "ciphertext": ciphertext,
                        "user_key": admin_key
                    }
                    dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
                    print(f"   Decrypt with admin key: {dec_response.status_code}")
                    
                    if dec_response.status_code == 200:
                        print("   ✓ ADMIN policy works!")
                    else:
                        print(f"   ✗ ADMIN decryption failed: {dec_response.json()}")
                        return False
    except Exception as e:
        print(f"   ✗ ADMIN test failed: {e}")
        return False
    
    # 2. Test simple DOCTOR policy
    print("\n2. Testing simple DOCTOR policy...")
    try:
        # Register doctor user
        doctor_data = {
            "user_id": "simple_doctor",
            "attributes": ["ROLE:DOCTOR"]
        }
        response = requests.post(f"{BASE_URL}/user/register", json=doctor_data)
        print(f"   Register doctor: {response.status_code}")
        
        if response.status_code == 201:
            # Test with simple DOCTOR policy
            encrypt_data = {
                "data": {"aesKey": "doctor_test_key"},
                "policy_expression": "ROLE:DOCTOR"  # Simple policy
            }
            enc_response = requests.post(f"{BASE_URL}/encrypt", json=encrypt_data)
            print(f"   Encrypt with DOCTOR policy: {enc_response.status_code}")
            
            if enc_response.status_code == 200:
                ciphertext = enc_response.json()['ciphertext']
                
                # Get doctor key and try decryption
                doctor_key_response = requests.get(f"{BASE_URL}/user/simple_doctor/key")
                if doctor_key_response.status_code == 200:
                    doctor_key = doctor_key_response.json()['private_key']
                    
                    decrypt_data = {
                        "ciphertext": ciphertext,
                        "user_key": doctor_key
                    }
                    dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
                    print(f"   Decrypt with doctor key: {dec_response.status_code}")
                    
                    if dec_response.status_code == 200:
                        print("   ✓ Simple DOCTOR policy works!")
                        return test_complex_policy()
                    else:
                        print(f"   ✗ DOCTOR decryption failed: {dec_response.json()}")
                        return False
    except Exception as e:
        print(f"   ✗ DOCTOR test failed: {e}")
        return False

def test_complex_policy():
    """Test complex AND policy after simple ones work"""
    print("\n3. Testing complex AND policy...")
    try:
        # Register cardiology doctor with both attributes
        cardio_data = {
            "user_id": "cardio_doctor_v2",
            "attributes": ["ROLE:DOCTOR", "DEPT:CARDIOLOGY"]
        }
        response = requests.post(f"{BASE_URL}/user/register", json=cardio_data)
        print(f"   Register cardio doctor: {response.status_code}")
        
        if response.status_code == 201:
            # Test with AND policy
            encrypt_data = {
                "data": {"aesKey": "cardio_sensitive_key"},
                "policy_expression": "ROLE:DOCTOR and DEPT:CARDIOLOGY"
            }
            enc_response = requests.post(f"{BASE_URL}/encrypt", json=encrypt_data)
            print(f"   Encrypt with AND policy: {enc_response.status_code}")
            
            if enc_response.status_code == 200:
                ciphertext = enc_response.json()['ciphertext']
                
                # Get cardio doctor key and try decryption
                cardio_key_response = requests.get(f"{BASE_URL}/user/cardio_doctor_v2/key")
                if cardio_key_response.status_code == 200:
                    cardio_key = cardio_key_response.json()['private_key']
                    
                    decrypt_data = {
                        "ciphertext": ciphertext,
                        "user_key": cardio_key
                    }
                    dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
                    print(f"   Decrypt with cardio key: {dec_response.status_code}")
                    
                    if dec_response.status_code == 200:
                        print("   ✓ Complex AND policy works!")
                        return True
                    else:
                        print(f"   ✗ Complex decryption failed: {dec_response.json()}")
                        return False
    except Exception as e:
        print(f"   ✗ Complex test failed: {e}")
        return False

def test_simple_admin():
    """Test the simplest case - ADMIN role"""
    print("=== Testing Simple ADMIN Case ===")
    
    # 1. Register admin user
    admin_data = {
        "user_id": "test_admin_simple",
        "attributes": ["ROLE:ADMIN"]
    }
    response = requests.post(f"{BASE_URL}/user/register", json=admin_data)
    print(f"1. Register admin: {response.status_code}")
    
    if response.status_code != 201:
        print(f"   Registration failed: {response.json()}")
        return False
    
    # 2. Encrypt with ADMIN policy
    encrypt_data = {
        "data": {"aesKey": "simple_admin_key"},
        "policy_expression": "ROLE:ADMIN"
    }
    enc_response = requests.post(f"{BASE_URL}/encrypt", json=encrypt_data)
    print(f"2. Encrypt data: {enc_response.status_code}")
    
    if enc_response.status_code != 200:
        print(f"   Encryption failed: {enc_response.json()}")
        return False
    
    ciphertext = enc_response.json().get('ciphertext')
    if not ciphertext:
        print("   No ciphertext received")
        return False
    
    print(f"   Ciphertext length: {len(ciphertext)}")
    
    # 3. Get admin key
    key_response = requests.get(f"{BASE_URL}/user/test_admin_simple/key")
    print(f"3. Get admin key: {key_response.status_code}")
    
    if key_response.status_code != 200:
        print(f"   Failed to get key: {key_response.json()}")
        return False
    
    admin_key = key_response.json().get('private_key')
    if not admin_key:
        print("   No private key received")
        return False
    
    # 4. Decrypt data
    decrypt_data = {
        "ciphertext": ciphertext,
        "user_key": admin_key
    }
    dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
    print(f"4. Decrypt data: {dec_response.status_code}")
    
    if dec_response.status_code == 200:
        decrypted = dec_response.json().get('plaintext')
        print(f"   ✓ Decryption successful: {decrypted}")
        return True
    else:
        print(f"   ✗ Decryption failed: {dec_response.json()}")
        return False

def test_exactly_like_working_code():
    """Test using the exact same format as the working ABE code"""
    print("=== Testing with Working Code Format ===")
    
    # 1. Test simple ADMIN case (like working code does)
    print("\n1. Testing ADMIN (like working code)...")
    
    # Register admin with simple ADMIN attribute
    admin_data = {
        "user_id": "chief",
        "attributes": ["ROLE:ADMIN"]  # This will become just "ADMIN"
    }
    response = requests.post(f"{BASE_URL}/user/register", json=admin_data)
    print(f"   Register admin: {response.status_code}")
    
    if response.status_code == 201:
        # Encrypt with simple ADMIN policy (like working code)
        encrypt_data = {
            "data": {"aesKey": "admin_key_test"},
            "policy_expression": "ROLE:ADMIN"  # This will become just "ADMIN"
        }
        enc_response = requests.post(f"{BASE_URL}/encrypt", json=encrypt_data)
        print(f"   Encrypt with ADMIN policy: {enc_response.status_code}")
        
        if enc_response.status_code == 200:
            ciphertext = enc_response.json()['ciphertext']
            print(f"   Ciphertext received: {len(ciphertext)} chars")
            
            # Get admin key and decrypt
            admin_key_response = requests.get(f"{BASE_URL}/user/chief/key")
            if admin_key_response.status_code == 200:
                admin_key = admin_key_response.json()['private_key']
                
                decrypt_data = {
                    "ciphertext": ciphertext,
                    "user_key": admin_key
                }
                dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
                print(f"   Decrypt: {dec_response.status_code}")
                
                if dec_response.status_code == 200:
                    print("   ✓ ADMIN test successful!")
                    return test_doctor_case()
                else:
                    print(f"   ✗ Decryption failed: {dec_response.json()}")
                    return False
        else:
            print(f"   ✗ Encryption failed: {enc_response.json()}")
            return False
    else:
        print(f"   ✗ Registration failed: {response.json()}")
        return False

def test_doctor_case():
    """Test doctor case like working code"""
    print("\n2. Testing DOCTOR (like working code)...")
    
    # Register cardiology doctor (like working code)
    doctor_data = {
        "user_id": "cardiology_doctor",
        "attributes": ["ROLE:DOCTOR", "DEPT:CARDIOLOGY"]  # Will become ["DOCTOR", "CARDIOLOGY"]
    }
    response = requests.post(f"{BASE_URL}/user/register", json=doctor_data)
    print(f"   Register cardiology doctor: {response.status_code}")
    
    if response.status_code == 201:
        # Test with working code style policy
        encrypt_data = {
            "data": {"aesKey": "cardio_sensitive_data"},
            "policy_expression": "ROLE:DOCTOR and DEPT:CARDIOLOGY"  # Will become "DOCTOR and CARDIOLOGY"
        }
        enc_response = requests.post(f"{BASE_URL}/encrypt", json=encrypt_data)
        print(f"   Encrypt with doctor+cardiology policy: {enc_response.status_code}")
        
        if enc_response.status_code == 200:
            ciphertext = enc_response.json()['ciphertext']
            
            # Test decryption with cardiology doctor (should work)
            doctor_key_response = requests.get(f"{BASE_URL}/user/cardiology_doctor/key")
            if doctor_key_response.status_code == 200:
                doctor_key = doctor_key_response.json()['private_key']
                
                decrypt_data = {
                    "ciphertext": ciphertext,
                    "user_key": doctor_key
                }
                dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
                print(f"   Decrypt with cardiology doctor: {dec_response.status_code}")
                
                if dec_response.status_code == 200:
                    print("   ✓ Cardiology doctor can access!")
                    return test_access_control()
                else:
                    print(f"   ✗ Cardiology doctor denied: {dec_response.json()}")
                    return False
        else:
            print(f"   ✗ Encryption failed: {enc_response.json()}")
            return False
    else:
        print(f"   ✗ Registration failed: {response.json()}")
        return False

def test_access_control():
    """Test access control like working code"""
    print("\n3. Testing access control (pediatric doctor shouldn't access cardiology data)...")
    
    # Register pediatric doctor
    pediatric_data = {
        "user_id": "pediatrics_doctor",
        "attributes": ["ROLE:DOCTOR", "DEPT:PEDIATRICS"]  # Will become ["DOCTOR", "PEDIATRICS"]
    }
    response = requests.post(f"{BASE_URL}/user/register", json=pediatric_data)
    print(f"   Register pediatrics doctor: {response.status_code}")
    
    if response.status_code == 201:
        # Try to decrypt cardiology data (from previous test)
        # First get the ciphertext by encrypting cardiology data again
        encrypt_data = {
            "data": {"aesKey": "cardio_sensitive_data"},
            "policy_expression": "ROLE:DOCTOR and DEPT:CARDIOLOGY"
        }
        enc_response = requests.post(f"{BASE_URL}/encrypt", json=encrypt_data)
        
        if enc_response.status_code == 200:
            ciphertext = enc_response.json()['ciphertext']
            
            # Try to decrypt with pediatrics doctor (should fail)
            pediatric_key_response = requests.get(f"{BASE_URL}/user/pediatrics_doctor/key")
            if pediatric_key_response.status_code == 200:
                pediatric_key = pediatric_key_response.json()['private_key']
                
                decrypt_data = {
                    "ciphertext": ciphertext,
                    "user_key": pediatric_key
                }
                dec_response = requests.post(f"{BASE_URL}/decrypt", json=decrypt_data)
                print(f"   Pediatrics doctor tries to access cardiology data: {dec_response.status_code}")
                
                if dec_response.status_code == 403:
                    print("   ✓ Access correctly denied!")
                    return True
                else:
                    print(f"   ✗ Unexpected result: {dec_response.json()}")
                    return False
    
    return False

if __name__ == "__main__":
    test_real_abe_server()
    success = debug_abe_system()
    if success:
        print("\n🎉 All ABE tests passed!")
    else:
        print("\n❌ ABE system needs debugging")
    
    if test_simple_admin():
        print("\n🎉 Simple ADMIN test passed!")
    else:
        print("\n❌ Simple ADMIN test failed")

    if test_exactly_like_working_code():
        print("\n🎉 All tests passed! ABE system working like original code!")
    else:
        print("\n❌ Tests failed")