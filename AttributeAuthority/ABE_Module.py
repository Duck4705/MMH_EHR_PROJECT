from charm.toolbox.pairinggroup import PairingGroup
from charm.schemes.abenc.abenc_bsw07 import CPabe_BSW07
from charm.adapters.abenc_adapt_hybrid import HybridABEnc
from charm.core.engine.util import objectToBytes, bytesToObject
import json
import base64
import os
import pickle
import re

class ABECore:
    def __init__(self):
        """Initialize the ABE system with CP-ABE BSW07 scheme"""
        try:
            self.group = PairingGroup('SS512', secparam=80)
            self.cpabe = CPabe_BSW07(self.group)
            self.hybrid = HybridABEnc(self.cpabe, self.group)
            
            # Setup system keys
            self.pk, self.mk = self.hybrid.setup()
            
            # Store keys directory
            self.keys_dir = os.path.join(os.path.dirname(__file__), 'keys')
            os.makedirs(self.keys_dir, exist_ok=True)
            
            # Hospital departments and roles (exactly like working code)
            self.departments = ['CARDIOLOGY', 'NEUROLOGY', 'ONCOLOGY', 'PEDIATRICS', 'EMERGENCY', 'GENERAL']
            self.roles = ['DOCTOR', 'NURSE', 'ADMIN', 'RESEARCHER', 'CHIEF']
            
            # Save master keys
            self._save_master_keys()
            
            print("ABE Core initialized successfully with CP-ABE BSW07")
            
        except Exception as e:
            print(f"Error initializing ABE Core: {e}")
            raise e
    
    def _save_master_keys(self):
        """Save master keys to disk"""
        try:
            pk_file = os.path.join(self.keys_dir, 'public_key.pk')
            mk_file = os.path.join(self.keys_dir, 'master_key.pk')
            
            with open(pk_file, 'wb') as f:
                pickle.dump(objectToBytes(self.pk, self.group), f)
            
            with open(mk_file, 'wb') as f:
                pickle.dump(objectToBytes(self.mk, self.group), f)
                
        except Exception as e:
            print(f"Error saving master keys: {e}")
    
    def _load_master_keys(self):
        """Load master keys from disk"""
        try:
            pk_file = os.path.join(self.keys_dir, 'public_key.pk')
            mk_file = os.path.join(self.keys_dir, 'master_key.pk')
            
            if os.path.exists(pk_file) and os.path.exists(mk_file):
                with open(pk_file, 'rb') as f:
                    self.pk = bytesToObject(pickle.load(f), self.group)
                
                with open(mk_file, 'rb') as f:
                    self.mk = bytesToObject(pickle.load(f), self.group)
                
                return True
        except Exception as e:
            print(f"Error loading master keys: {e}")
        
        return False
    
    def get_public_key(self):
        """Get the public key"""
        return self.pk
    
    def serialize_key(self, key):
        """Serialize a key for storage/transmission"""
        try:
            serialized = objectToBytes(key, self.group)
            return base64.b64encode(serialized).decode('utf-8')
        except Exception as e:
            print(f"Error serializing key: {e}")
            return None
    
    def deserialize_key(self, serialized_key):
        """Deserialize a key from storage/transmission"""
        try:
            key_bytes = base64.b64decode(serialized_key.encode('utf-8'))
            return bytesToObject(key_bytes, self.group)
        except Exception as e:
            print(f"Error deserializing key: {e}")
            return None
    
    def _convert_attributes_to_abe_format(self, attributes):
        """Convert attributes from API format to CP-ABE format (like working code)"""
        abe_attributes = []
        for attr in attributes:
            # Remove the ROLE: or DEPT: prefix and use just the value
            if ':' in attr:
                parts = attr.split(':')
                if len(parts) == 2:
                    category, value = parts
                    # Use just the value part (ADMIN, DOCTOR, CARDIOLOGY, etc.)
                    abe_attributes.append(value.upper())
            else:
                # Use as-is if no colon
                abe_attributes.append(attr.upper())
        
        return abe_attributes
    
    def _convert_policy_to_abe_format(self, policy):
        """Convert policy from API format to CP-ABE format"""
        # Start with the original policy
        abe_policy = policy.upper()
        
        # Remove ROLE: and DEPT: prefixes from policy
        abe_policy = abe_policy.replace('ROLE:', '')
        abe_policy = abe_policy.replace('DEPT:', '')
        
        # Keep AND/OR lowercase for CP-ABE
        abe_policy = abe_policy.replace(' AND ', ' and ')
        abe_policy = abe_policy.replace(' OR ', ' or ')
        
        return abe_policy
    
    def generate_user_key(self, attributes):
        """Generate a user key with given attributes (like working code)"""
        try:
            if not isinstance(attributes, list):
                attributes = [attributes]
            
            # Convert attributes to ABE format
            abe_attributes = self._convert_attributes_to_abe_format(attributes)
            
            print(f"Generating key for attributes: {attributes} -> ABE format: {abe_attributes}")
            
            if not abe_attributes:
                print("No valid ABE attributes found")
                return None
            
            # Use the same method as working code
            user_key = self.hybrid.keygen(self.pk, self.mk, abe_attributes)
            return user_key
            
        except Exception as e:
            print(f"Error generating user key: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def encrypt_data(self, data, access_policy):
        """Encrypt data with the given access policy (like working code)"""
        try:
            # Ensure data is bytes
            if isinstance(data, str):
                data = data.encode('utf-8')
            elif not isinstance(data, bytes):
                data = str(data).encode('utf-8')
            
            # Convert policy to ABE format
            abe_policy = self._convert_policy_to_abe_format(access_policy)
            
            print(f"Encrypting with policy: {access_policy} -> ABE format: {abe_policy}")
            
            # Use the same method as working code
            ciphertext = self.hybrid.encrypt(self.pk, data, abe_policy)
            
            if ciphertext is None:
                print("Encryption returned None")
                return None
            
            print("Encryption successful")
            return ciphertext
            
        except Exception as e:
            print(f"Error encrypting data: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def decrypt_data(self, ciphertext, user_key):
        """Decrypt data with the user's key (like working code)"""
        try:
            print("Attempting decryption...")
            
            if ciphertext is None:
                print("Ciphertext is None")
                return None
            
            if user_key is None:
                print("User key is None")
                return None
            
            # Use the same method as working code
            decrypted = self.hybrid.decrypt(self.pk, user_key, ciphertext)
            
            if decrypted is not None:
                print("Decryption successful!")
                return decrypted
            else:
                print("Decryption returned None - access denied")
                return None
            
        except Exception as e:
            print(f"Error decrypting data: {e}")
            import traceback
            traceback.print.exc()
            return None
    
    def serialize_ciphertext(self, ciphertext):
        """Serialize ciphertext for storage/transmission (like working code)"""
        try:
            if ciphertext is None:
                print("Cannot serialize None ciphertext")
                return None
            
            # Use the same method as working code
            serialized = objectToBytes(ciphertext, self.group)
            return base64.b64encode(serialized).decode('utf-8')
            
        except Exception as e:
            print(f"Error serializing ciphertext: {e}")
            import traceback
            traceback.print.exc()
            return None
    
    def deserialize_ciphertext(self, serialized_ct):
        """Deserialize ciphertext from storage/transmission (like working code)"""
        try:
            if not serialized_ct:
                print("Cannot deserialize empty ciphertext")
                return None
            
            # Use the same method as working code
            ct_bytes = base64.b64decode(serialized_ct.encode('utf-8'))
            return bytesToObject(ct_bytes, self.group)
            
        except Exception as e:
            print(f"Error deserializing ciphertext: {e}")
            import traceback
            traceback.print.exc()
            return None
    
    def _normalize_policy(self, policy):
        """Normalize access policy for consistency"""
        # Convert to uppercase and ensure proper format
        policy = policy.upper()
        
        # Replace common variations
        policy = policy.replace(' AND ', ' and ')
        policy = policy.replace(' OR ', ' or ')
        policy = policy.replace('&&', ' and ')
        policy = policy.replace('||', ' or ')
        
        return policy
    
    def evaluate_policy(self, policy_expression, user_attributes):
        """
        Evaluate if user attributes satisfy the policy
        This is a simplified version - the actual evaluation happens during decryption
        """
        try:
            # Convert both to ABE format for comparison
            abe_policy = self._convert_policy_to_abe_format(policy_expression)
            abe_attributes = self._convert_attributes_to_abe_format(user_attributes)
            
            print(f"Evaluating policy: {policy_expression} -> {abe_policy}")
            print(f"User attributes: {user_attributes} -> {abe_attributes}")
            
            # Check if user has ADMIN role (ADMIN can access everything)
            if "ADMIN" in abe_attributes:
                return True
            
            # Simple policy evaluation for common cases
            if " and " in abe_policy.lower():
                # All conditions must be met
                conditions = abe_policy.lower().split(" and ")
                for condition in conditions:
                    condition = condition.strip().upper()
                    if condition not in abe_attributes:
                        return False
                return True
            
            elif " or " in abe_policy.lower():
                # Any condition can be met
                conditions = abe_policy.lower().split(" or ")
                for condition in conditions:
                    condition = condition.strip().upper()
                    if condition in abe_attributes:
                        return True
                return False
            
            else:
                # Single condition
                return abe_policy.upper() in abe_attributes
        
        except Exception as e:
            print(f"Policy evaluation error: {e}")
            return False
    
    def test_system(self):
        """Test the ABE system exactly like the working code"""
        try:
            # Test data with simple policy (like working code)
            test_data = {"aesKey": "test_key_12345"}
            test_policy = "ADMIN"  # Simple policy like working code
            test_attributes = ["ADMIN"]  # Matching attributes like working code
            
            print(f"Testing with policy: {test_policy}")
            print(f"Testing with attributes: {test_attributes}")
            
            # Generate user key
            user_key = self.hybrid.keygen(self.pk, self.mk, test_attributes)
            if not user_key:
                return False, "Failed to generate user key"
            
            # Encrypt data
            ciphertext = self.hybrid.encrypt(self.pk, json.dumps(test_data).encode('utf-8'), test_policy)
            if not ciphertext:
                return False, "Failed to encrypt data"
            
            # Decrypt data
            decrypted = self.hybrid.decrypt(self.pk, user_key, ciphertext)
            if not decrypted:
                return False, "Failed to decrypt data"
            
            # Verify data
            try:
                decrypted_data = json.loads(decrypted.decode('utf-8'))
                if decrypted_data != test_data:
                    return False, "Decrypted data doesn't match original"
            except Exception as e:
                return False, f"Failed to parse decrypted data: {e}"
            
            print("ABE system test successful!")
            return True, "ABE system test successful"
            
        except Exception as e:
            print(f"ABE system test error: {e}")
            import traceback
            traceback.print.exc()
            return False, f"ABE system test failed: {e}"

# For backward compatibility
class EHRAccessSystem(ABECore):
    """Alias for backward compatibility"""
    pass