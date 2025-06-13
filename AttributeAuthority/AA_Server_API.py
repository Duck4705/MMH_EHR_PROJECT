from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import json
import uuid
import base64
import traceback 

# Add the current directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the real ABE implementation
try:
    from ABE_Module import ABECore
    print("Successfully imported ABE_Module")
except ImportError as e:
    print(f"Failed to import ABE_Module: {e}")
    print("Make sure Charm-Crypto is installed and ABE_Module.py exists")
    sys.exit(1)

app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Initialize ABE system
try:
    abe = ABECore()
    
    # Test the system
    test_result, test_message = abe.test_system()
    if test_result:
        print("ABE system test passed")
    else:
        print(f"ABE system test failed: {test_message}")
    
    print("ABE Core initialized successfully")
except Exception as e:
    print(f"Error initializing ABE Core: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Directory to store user keys
KEYS_DIR = os.path.join(os.path.dirname(__file__), 'keys', 'users')
os.makedirs(KEYS_DIR, exist_ok=True)

# Store attribute-policy mappings
CONFIG_DIR = os.path.join(os.path.dirname(__file__), 'config')
os.makedirs(CONFIG_DIR, exist_ok=True)

POLICIES_FILE = os.path.join(CONFIG_DIR, 'policies.json')
USER_ATTRIBUTES_FILE = os.path.join(CONFIG_DIR, 'user_attributes.json')

# Load existing policies or create empty dict
if os.path.exists(POLICIES_FILE):
    with open(POLICIES_FILE, 'r') as f:
        policies = json.load(f)
else:
    policies = {
        "default_admin": {
            "name": "default_admin",
            "access_policy": "ROLE:ADMIN",
            "description": "Default ADMIN access policy"
        }
    }
    with open(POLICIES_FILE, 'w') as f:
        json.dump(policies, f, indent=2)

# Store user attributes and their generated keys
if os.path.exists(USER_ATTRIBUTES_FILE):
    with open(USER_ATTRIBUTES_FILE, 'r') as f:
        user_data = json.load(f)
else:
    user_data = {}
    with open(USER_ATTRIBUTES_FILE, 'w') as f:
        json.dump(user_data, f, indent=2)

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "online", "message": "Attribute Authority server is running"}), 200

# Get public key
@app.route('/api/abe/public-key', methods=['GET'])
def get_public_key():
    """Get ABE public key"""
    try:
        public_key = abe.serialize_key(abe.pk)
        return jsonify({'publicKey': public_key}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Policy management
@app.route('/api/policy', methods=['POST'])
def register_policy():
    """Register a new access policy"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Support both formats from EHR server
        policy_name = data.get('policyName') or data.get('policy_name')
        access_policy = data.get('accessPolicy') or data.get('access_policy')
        description = data.get('description', '')
        
        if not policy_name or not access_policy:
            return jsonify({"error": "Missing required fields: policyName and accessPolicy"}), 400
        
        # Use provided policy name as ID
        policy_id = policy_name
        
        # Store the policy
        policies[policy_id] = {
            "name": policy_name,
            "access_policy": access_policy,
            "description": description
        }
        
        # Save policies to file
        with open(POLICIES_FILE, 'w') as f:
            json.dump(policies, f, indent=2)
        
        return jsonify({
            "message": "Policy registered successfully", 
            "policy_id": policy_id
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/policies', methods=['GET'])
def get_policies():
    """Get all registered policies"""
    return jsonify(policies), 200

@app.route('/api/policy/<policy_id>', methods=['GET'])
def get_policy(policy_id):
    """Get a specific policy by ID"""
    if policy_id not in policies:
        return jsonify({"error": "Policy not found"}), 404
    
    return jsonify(policies[policy_id]), 200

# User management
@app.route('/api/user/register', methods=['POST'])
def register_user_attributes():
    """Register a user with their attributes"""
    try:
        data = request.get_json()
        
        if not data or 'user_id' not in data or 'attributes' not in data:
            return jsonify({"error": "Missing required fields: user_id and attributes"}), 400
        
        user_id = data['user_id']
        attributes = data['attributes']
        
        if not isinstance(attributes, list):
            return jsonify({"error": "Attributes must be a list"}), 400
        
        # Generate user key with ABE
        user_key = abe.generate_user_key(attributes)
        if not user_key:
            return jsonify({"error": "Failed to generate user key"}), 500
        
        # Serialize the key for storage
        user_key_serialized = abe.serialize_key(user_key)
        if not user_key_serialized:
            return jsonify({"error": "Failed to serialize user key"}), 500
        
        # Store user data
        user_data[user_id] = {
            "attributes": attributes,
            "key": user_key_serialized
        }
        
        # Save to file
        with open(USER_ATTRIBUTES_FILE, 'w') as f:
            json.dump(user_data, f, indent=2)
        
        return jsonify({
            "message": "User registered successfully",
            "user_id": user_id,
            "attributes": attributes
        }), 201
        
    except Exception as e:
        print(f"Error in register_user_attributes: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/<user_id>/key', methods=['GET'])
def get_user_key(user_id):
    """Get a user's key based on their stored attributes"""
    if user_id not in user_data:
        return jsonify({"error": "User not found"}), 404
    
    try:
        user_info = user_data[user_id]
        
        return jsonify({
            "user_id": user_id,
            "attributes": user_info["attributes"],
            "private_key": user_info["key"]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/<user_id>/attributes', methods=['GET'])
def get_user_attributes(user_id):
    """Get user's attributes"""
    if user_id not in user_data:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "user_id": user_id,
        "attributes": user_data[user_id]["attributes"]
    }), 200

# Encryption/Decryption
@app.route('/api/encrypt', methods=['POST'])
def encrypt_data():
    """Encrypt data with a specified policy"""
    try:
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({"error": "Missing required field: data"}), 400
        
        # Support both policy_id and policy_expression
        policy_id = data.get('policyId') or data.get('policy_id')
        policy_expression = data.get('policy_expression')
        
        if policy_id:
            if policy_id not in policies:
                return jsonify({"error": "Policy not found"}), 404
            access_policy = policies[policy_id]['access_policy']
        elif policy_expression:
            access_policy = policy_expression
        else:
            return jsonify({"error": "Either policyId or policy_expression is required"}), 400
        
        # Encrypt the data
        plaintext = json.dumps(data['data']).encode('utf-8')
        ciphertext = abe.encrypt_data(plaintext, access_policy)
        
        if not ciphertext:
            return jsonify({"error": "Encryption failed - invalid policy or system error"}), 500
        
        ciphertext_serialized = abe.serialize_ciphertext(ciphertext)
        
        if not ciphertext_serialized:
            return jsonify({"error": "Failed to serialize ciphertext"}), 500
        
        return jsonify({
            "message": "Data encrypted successfully",
            "ciphertext": ciphertext_serialized,
            "policy": access_policy
        }), 200
        
    except Exception as e:
        print(f"Error in encrypt_data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/decrypt', methods=['POST'])
def decrypt_data():
    """Decrypt data with a user's key"""
    try:
        data = request.get_json()
        
        if not data or 'ciphertext' not in data or 'user_key' not in data:
            return jsonify({"error": "Missing required fields: ciphertext and user_key"}), 400
        
        # Deserialize the ciphertext and key
        ciphertext = abe.deserialize_ciphertext(data['ciphertext'])
        user_key = abe.deserialize_key(data['user_key'])
        
        if not ciphertext:
            return jsonify({
                "success": False,
                "error": "Failed to deserialize ciphertext"
            }), 400
        
        if not user_key:
            return jsonify({
                "success": False,
                "error": "Failed to deserialize user key"
            }), 400
        
        # Decrypt the data
        decrypted = abe.decrypt_data(ciphertext, user_key)
        
        if decrypted is None:
            return jsonify({
                "success": False,
                "error": "Decryption failed. User does not have required attributes."
            }), 403
        
        # Parse the decrypted data
        try:
            decrypted_data = json.loads(decrypted.decode('utf-8'))
        except:
            decrypted_data = {"raw": decrypted.decode('utf-8')}
        
        return jsonify({
            "success": True,
            "message": "Decryption successful",
            "plaintext": decrypted_data
        }), 200
        
    except Exception as e:
        print(f"Error in decrypt_data: {e}")
        traceback.print_exc()  # Now this should work
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/check-access', methods=['POST'])
def check_access():
    """Check if user attributes satisfy a policy"""
    try:
        data = request.get_json()
        
        if not data or 'policy_expression' not in data or 'user_attributes' not in data:
            return jsonify({"error": "Missing required fields"}), 400
        
        policy_expression = data['policy_expression']
        user_attrs = data['user_attributes']
        
        # Use ABE's policy evaluation
        access_granted = abe.evaluate_policy(policy_expression, user_attrs)
        
        return jsonify({
            "access_granted": access_granted,
            "policy": policy_expression,
            "user_attributes": user_attrs
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Test endpoints
@app.route('/api/test/create-admin-user', methods=['POST'])
def create_test_admin_user():
    """Create a test admin user for development"""
    user_id = "test_admin"
    attributes = ["ROLE:ADMIN", "DEPT:GENERAL"]
    
    # Generate user key
    user_key = abe.generate_user_key(attributes)
    if not user_key:
        return jsonify({"error": "Failed to generate admin user key"}), 500
    
    user_key_serialized = abe.serialize_key(user_key)
    if not user_key_serialized:
        return jsonify({"error": "Failed to serialize admin user key"}), 500
    
    user_data[user_id] = {
        "attributes": attributes,
        "key": user_key_serialized
    }
    
    with open(USER_ATTRIBUTES_FILE, 'w') as f:
        json.dump(user_data, f, indent=2)
    
    return jsonify({
        "message": "Test admin user created",
        "user_id": user_id,
        "attributes": attributes
    }), 201

def run_server(host='0.0.0.0', port=5001):
    """Run the AA server"""
    print(f"Starting Attribute Authority Server on {host}:{port}")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  GET  /api/abe/public-key - Get public key")
    print("  POST /api/policy - Register policy")
    print("  GET  /api/policies - Get all policies")
    print("  POST /api/user/register - Register user")
    print("  GET  /api/user/<id>/key - Get user key")
    print("  POST /api/encrypt - Encrypt data")
    print("  POST /api/decrypt - Decrypt data")
    print("  POST /api/check-access - Check access")
    
    app.run(host=host, port=port, debug=True)

if __name__ == '__main__':
    run_server()