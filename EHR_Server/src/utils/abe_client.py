import requests
import json
import sys
import os

# Add the ABE module path
abe_module_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'AttributeAuthority')
if abe_module_path not in sys.path:
    sys.path.append(abe_module_path)

try:
    from ABE_Module import ABECore
except ImportError as e:
    print(f"Warning: Could not import ABE_Module: {e}")
    ABECore = None

class ABEClient:
    """ABE Client for EHR server to handle encryption/decryption"""
    
    def __init__(self, aa_server_url="http://localhost:5001"):
        self.aa_server_url = aa_server_url
        self.abe_core = None
        self.public_key = None
        
        # Initialize ABE core for encryption/decryption
        if ABECore:
            try:
                self.abe_core = ABECore()
                print("ABE Client initialized with local ABE core")
            except Exception as e:
                print(f"Warning: Could not initialize local ABE core: {e}")
        
        # Get public key from AA server
        self._fetch_public_key()
    
    def _fetch_public_key(self):
        """Fetch public key from AA server"""
        try:
            response = requests.get(f"{self.aa_server_url}/api/abe/public-key")
            if response.status_code == 200:
                self.public_key = response.json()['publicKey']
                print("Public key fetched from AA server")
            else:
                print(f"Failed to fetch public key: {response.status_code}")
        except Exception as e:
            print(f"Error fetching public key: {e}")
    
    def register_user_with_aa(self, user_id, attributes):
        """Register a user with the AA server"""
        try:
            data = {
                "user_id": user_id,
                "attributes": attributes
            }
            response = requests.post(f"{self.aa_server_url}/api/user/register", json=data)
            return response.status_code == 201, response.json()
        except Exception as e:
            return False, {"error": str(e)}
    
    def get_user_key_from_aa(self, user_id):
        """Get user's private key from AA server"""
        try:
            response = requests.get(f"{self.aa_server_url}/api/user/{user_id}/key")
            if response.status_code == 200:
                return True, response.json()
            else:
                return False, response.json()
        except Exception as e:
            return False, {"error": str(e)}
    
    def check_access_with_aa(self, policy_expression, user_attributes):
        """Check if user can access a policy via AA server"""
        try:
            data = {
                "policy_expression": policy_expression,
                "user_attributes": user_attributes
            }
            response = requests.post(f"{self.aa_server_url}/api/check-access", json=data)
            if response.status_code == 200:
                return response.json()['access_granted']
            return False
        except Exception as e:
            print(f"Error checking access: {e}")
            return False
    
    def encrypt_aes_key(self, aes_key, access_policy):
        """Encrypt AES key with ABE policy (EHR server responsibility)"""
        if not self.abe_core:
            return None, "ABE core not available"
        
        try:
            # Prepare data for encryption
            key_data = {"aesKey": aes_key}
            plaintext = json.dumps(key_data).encode('utf-8')
            
            # Encrypt with the policy
            ciphertext = self.abe_core.encrypt_data(plaintext, access_policy)
            if not ciphertext:
                return None, "Encryption failed"
            
            # Serialize for storage
            serialized_ct = self.abe_core.serialize_ciphertext(ciphertext)
            if not serialized_ct:
                return None, "Failed to serialize ciphertext"
            
            return serialized_ct, None
            
        except Exception as e:
            return None, str(e)
    
    def decrypt_aes_key(self, encrypted_aes_key, user_id):
        """Decrypt AES key using user's ABE key (EHR server responsibility)"""
        if not self.abe_core:
            return None, "ABE core not available"
        
        try:
            # Get user's private key from AA server
            success, key_data = self.get_user_key_from_aa(user_id)
            if not success:
                return None, "Failed to get user key"
            
            user_private_key = key_data['private_key']
            
            # Deserialize the ciphertext and user key
            ciphertext = self.abe_core.deserialize_ciphertext(encrypted_aes_key)
            user_key = self.abe_core.deserialize_key(user_private_key)
            
            if not ciphertext or not user_key:
                return None, "Failed to deserialize keys"
            
            # Decrypt the AES key
            decrypted = self.abe_core.decrypt_data(ciphertext, user_key)
            if not decrypted:
                return None, "Access denied - insufficient attributes"
            
            # Parse the decrypted data
            key_data = json.loads(decrypted.decode('utf-8'))
            return key_data['aesKey'], None
            
        except Exception as e:
            return None, str(e)
    
    def register_policy_with_aa(self, policy_name, access_policy, description=""):
        """Register a policy with the AA server"""
        try:
            data = {
                "policyName": policy_name,
                "accessPolicy": access_policy,
                "description": description
            }
            response = requests.post(f"{self.aa_server_url}/api/policy", json=data)
            return response.status_code == 201, response.json()
        except Exception as e:
            return False, {"error": str(e)}

# Global ABE client instance
abe_client = ABEClient()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Missing arguments"}))
        sys.exit(1)
    
    action = sys.argv[1]
    data = json.loads(sys.argv[2])
    
    client = ABEClient()
    
    try:
        if action == "register_user":
            success, result = client.register_user_with_aa(data['user_id'], data['attributes'])
            print(json.dumps({"success": success, "result": result}))
        
        elif action == "encrypt_aes_key":
            encrypted_key, error = client.encrypt_aes_key(data['aes_key'], data['access_policy'])
            if encrypted_key:
                print(json.dumps({"success": True, "encrypted_aes_key": encrypted_key}))
            else:
                print(json.dumps({"success": False, "error": error}))
        
        elif action == "decrypt_aes_key":
            aes_key, error = client.decrypt_aes_key(data['encrypted_aes_key'], data['user_id'])
            if aes_key:
                print(json.dumps({"success": True, "aes_key": aes_key}))
            else:
                print(json.dumps({"success": False, "error": error}))
        
        elif action == "register_policy":
            success, result = client.register_policy_with_aa(
                data['policy_name'], 
                data['access_policy'], 
                data.get('description', '')
            )
            print(json.dumps({"success": success, "result": result}))
        
        elif action == "check_access":
            access_granted = client.check_access_with_aa(
                data['policy_expression'], 
                data['user_attributes']
            )
            print(json.dumps({"success": True, "access_granted": access_granted}))
        
        else:
            print(json.dumps({"success": False, "error": "Unknown action"}))
    
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))