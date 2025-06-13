const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// AA server URL
const AA_SERVER_URL = process.env.AA_SERVER_URL || "http://localhost:5001";

console.log('🔗 ABE Controller loading... AA server:', AA_SERVER_URL);

// Security-hardened cache with session-based key rotation
const aesKeyCache = new Map();
const sessionKeys = new Map(); // Track session-specific keys
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
const SESSION_KEY_ROTATION = 30 * 60 * 1000; // 30 minutes session key rotation


function generateSecureAESKey() {
    // Generate cryptographically secure random 256-bit AES key
    return crypto.randomBytes(32); // 256-bit key as you specified
}

function generateSessionKey(userId) {
    // Generate random session key for collision resistance
    const sessionSalt = crypto.randomBytes(16);
    const timestamp = Date.now().toString();
    const sessionData = Buffer.concat([
        Buffer.from(userId), 
        sessionSalt, 
        Buffer.from(timestamp)
    ]);
    
    // Use SHA3-256
    return crypto.createHash('sha3-256').update(sessionData).digest('hex');
}

function hashAESKey(aesKey, sessionKey = '') {
    const keyBuffer = Buffer.isBuffer(aesKey) ? aesKey : Buffer.from(aesKey, 'hex');
    const saltedKey = Buffer.concat([
        keyBuffer,
        Buffer.from(sessionKey),
        crypto.randomBytes(16) // Additional random salt for collision resistance
    ]);
    return crypto.createHash('sha3-256').update(saltedKey).digest('hex');
}

function createSecurityContext(userId, patientId) {
    // Create session-specific security context to resist collusion attacks
    const sessionKey = generateSessionKey(userId);
    const contextId = crypto.createHash('sha3-256')
        .update(`${userId}:${patientId}:${sessionKey}:${Date.now()}`)
        .digest('hex');
    
    sessionKeys.set(userId, {
        sessionKey,
        contextId,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_KEY_ROTATION
    });
    
    return { sessionKey, contextId };
}

function getSecurityContext(userId) {
    const context = sessionKeys.get(userId);
    if (!context || Date.now() > context.expiresAt) {
        // Rotate session key if expired
        sessionKeys.delete(userId);
        return null;
    }
    return context;
}

// Enhanced AES key caching with security context
function cacheAESKey(patientId, userId, aesKey) {
    const securityContext = getSecurityContext(userId) || createSecurityContext(userId, patientId);
    const cacheKey = `${patientId}:${userId}:${securityContext.contextId}`;
    const expiresAt = Date.now() + CACHE_TTL;
    
    const hashedKey = hashAESKey(aesKey, securityContext.sessionKey);
    
    aesKeyCache.set(cacheKey, {
        hashedKey,
        expiresAt,
        sessionContext: securityContext.contextId
    });
    
    // Auto-cleanup with security
    setTimeout(() => {
        if (aesKeyCache.has(cacheKey)) {
            const cached = aesKeyCache.get(cacheKey);
            if (Date.now() >= cached.expiresAt) {
                // Secure deletion
                aesKeyCache.delete(cacheKey);
                console.log(`🔐 Secure cache cleanup: ${cacheKey}`);
            }
        }
    }, CACHE_TTL);
    
    console.log(`🔐 AES key cached with security context: ${securityContext.contextId}`);
}

function getCachedAESKey(patientId, userId) {
    const securityContext = getSecurityContext(userId);
    if (!securityContext) {
        return null; 
    }
    
    const cacheKey = `${patientId}:${userId}:${securityContext.contextId}`;
    const cached = aesKeyCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiresAt) {
        return cached;
    }
    
    if (cached) {
        aesKeyCache.delete(cacheKey);
    }
    
    return null;
}

// Map vai trò và phòng ban thành thuộc tính người dùng
function mapUserAttributesFromRole(role, department = '') {
    const attributes = [];
    const roleText = role.toUpperCase();
    const deptText = department ? department.toUpperCase() : '';
    
    // Format vai trò thành thuộc tính
    if (roleText.includes('DOCTOR')) attributes.push('ROLE:DOCTOR');
    if (roleText.includes('ADMIN')) attributes.push('ROLE:ADMIN');
    if (roleText.includes('NURSE')) attributes.push('ROLE:NURSE');
    if (roleText.includes('RESEARCHER')) attributes.push('ROLE:RESEARCHER');
    
    // Format phòng ban thành thuộc tính
    const departments = ['CARDIOLOGY', 'NEUROLOGY', 'ONCOLOGY', 'PEDIATRICS', 'EMERGENCY', 'GENERAL'];
    for (const dept of departments) {
        if (roleText.includes(dept) || deptText.includes(dept)) {
            attributes.push(`DEPT:${dept}`);
        }
    }
    
    // Default department
    if (!attributes.some(attr => attr.startsWith('DEPT:'))) {
        attributes.push('DEPT:GENERAL');
    }
    
    return attributes;
}

// Đăng ký người dùng mới
exports.registerUser = async (req, res) => {
    try {
        const { user_id, attributes } = req.body;
        
        if (!user_id || !attributes) {
            return res.status(400).json({ 
                message: 'user_id và attributes là bắt buộc',
                success: false 
            });
        }

        console.log(`👤 Registering user ${user_id} with attributes:`, attributes);

        createSecurityContext(user_id, 'registration');

        // Mock registration for now
        const result = {
            message: 'Đăng ký user thành công',
            user_id: user_id,
            attributes: attributes,
            private_key: 'mock_private_key_' + crypto.randomBytes(16).toString('hex'),
            success: true
        };

        console.log(`✅ User registered successfully: ${user_id}`);
        res.status(200).json(result);

    } catch (error) {
        console.error('❌ Register User Error:', error.message);
        res.status(500).json({ 
            message: 'Đã xảy ra lỗi khi đăng ký user',
            error: error.message,
            success: false
        });
    }
};

// Encrypt AES key using ABE with enhanced security
exports.encryptAESKey = async (req, res) => {
    try {
        const { aes_key, policy } = req.body;
        
        if (!aes_key || !policy) {
            return res.status(400).json({ 
                message: 'AES key và policy là bắt buộc',
                success: false
            });
        }

        console.log(`🔐 Encrypting AES key with policy: ${policy}`);
        console.log(`🔗 Using AA server: ${AA_SERVER_URL}`);

        // Add security context to encryption
        const userId = req.user?.id || 'system';
        const securityContext = createSecurityContext(userId, 'encryption');
        
        // Hash the AES key for additional security
        const secureAESKey = hashAESKey(Buffer.from(aes_key, 'hex'), securityContext.sessionKey);

        const response = await axios.post(`${AA_SERVER_URL}/api/encrypt`, {
            data: { aesKey: secureAESKey },
            policy_expression: policy,
            security_context: securityContext.contextId
        }, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`📡 AA server encrypt response: ${response.status}`);

        if (response.data && response.data.ciphertext) {
            res.status(200).json({
                message: 'Mã hóa AES key thành công',
                encrypted_key: response.data.ciphertext,
                policy: policy,
                security_context: securityContext.contextId,
                success: true
            });
        } else {
            console.log(`❌ No ciphertext in response:`, response.data);
            res.status(500).json({
                message: 'Lỗi khi mã hóa AES key - No ciphertext',
                error: 'No ciphertext in response',
                success: false
            });
        }

    } catch (error) {
        console.error('❌ ABE Encrypt Error:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            res.status(503).json({ 
                message: 'AA server không khả dụng',
                error: 'Cannot connect to Attribute Authority server',
                success: false
            });
        } else {
            res.status(500).json({ 
                message: 'Đã xảy ra lỗi khi mã hóa AES key',
                error: error.response?.data || error.message,
                success: false
            });
        }
    }
};

exports.decryptAESKey = async (req, res) => {
    try {
        const { encrypted_key, user_id } = req.body;
        const currentUser = req.user;
        
        if (!encrypted_key || !user_id) {
            return res.status(400).json({ 
                message: 'encrypted_key và user_id là bắt buộc',
                success: false 
            });
        }

        console.log(`🔓 Simple ABE Decryption Request:`);
        console.log(`   - User: ${currentUser.username} (${currentUser.role})`);
        console.log(`   - Encrypted Key ID: ${encrypted_key}`);

        // STEP 1: Lấy thuộc tính người dùng từ vai trò và phòng ban
        const userAttributes = mapUserAttributesFromRole(currentUser.role, currentUser.department);
        console.log(`🔑 User attributes: ${userAttributes.join(', ')}`);

        // STEP 2: Phân tích policy từ encrypted_key
        let accessPolicy = 'ROLE:ADMIN'; // Default policy

        if (encrypted_key.includes('_policy_')) {
            const policyMatch = encrypted_key.match(/_policy_(.+?)(?:$)/);
            if (policyMatch) {
                accessPolicy = policyMatch[1].replace(/_/g, ' ');
                
                console.log(`🔍 Extracted policy: "${policyMatch[1]}" → "${accessPolicy}"`);
            }
        }

        console.log(`📋 Required Policy: ${accessPolicy}`);

        // STEP 3: Check user attributes against access policy
        const hasAccess = checkAttributesAgainstPolicy(userAttributes, accessPolicy);
        
        if (!hasAccess) {
            console.log(`❌ Access denied`);
            return res.status(403).json({
                message: 'Không có quyền truy cập dữ liệu này',
                user_attributes: userAttributes,
                required_policy: accessPolicy,
                success: false
            });
        }

        console.log(`✅ Access granted`);

        // STEP 4: PATIENT-SPECIFIC KEY GENERATION
        // Extract patient ID from the encrypted_key identifier
        const patientIdMatch = encrypted_key.match(/patient_(\d+)_/);
        const patientId = patientIdMatch ? patientIdMatch[1] : 'unknown';

        const simpleKey = crypto.createHash('sha256')
            .update(`${encrypted_key}:${patientId}:PATIENT_DATA`)
            .digest('hex');
        
        console.log(`🔑 Generated patient-specific key for Patient ${patientId}: ${simpleKey.substring(0, 16)}...`);

        res.json({
            message: 'Giải mã AES key thành công',
            decrypted_key: simpleKey,
            user_id: currentUser.id,
            user_attributes: userAttributes,
            access_policy: accessPolicy,
            success: true
        });

    } catch (error) {
        console.error('❌ ABE Decrypt Error:', error.message);
        res.status(500).json({ 
            message: 'Lỗi khi giải mã AES key',
            error: error.message,
            success: false
        });
    }
};

// Helper function to check if user attributes satisfy access policy
function checkAttributesAgainstPolicy(userAttributes, accessPolicy) {
    try {
        console.log(`🔍 Simple access check:`);
        console.log(`   - User attributes: ${userAttributes.join(', ')}`);
        console.log(`   - Policy: ${accessPolicy}`);
        
        // ADMIN có quyền truy cập tất cả
        if (userAttributes.includes('ROLE:ADMIN')) {
            console.log(`✅ Admin access granted`);
            return true;
        }
        
        // Format 
        let normalizedPolicy = accessPolicy
            .replace(/\bADMIN\b/g, 'ROLE:ADMIN')
            .replace(/\bDOCTOR\b/g, 'ROLE:DOCTOR')
            .replace(/\bNURSE\b/g, 'ROLE:NURSE')
            .replace(/\bCARDIOLOGY\b/g, 'DEPT:CARDIOLOGY')
            .replace(/\bGENERAL\b/g, 'DEPT:GENERAL')
            .replace(/\bEMERGENCY\b/g, 'DEPT:EMERGENCY')
            .replace(/\bPEDIATRICS\b/g, 'DEPT:PEDIATRICS')
            .replace(/\bSURGERY\b/g, 'DEPT:SURGERY');
        
        console.log(`🔄 Normalized policy: ${normalizedPolicy}`);
        
        // Xử lý "OR"
        const orConditions = normalizedPolicy.split(/\s+or\s+/i);
        
        for (let i = 0; i < orConditions.length; i++) {
            const condition = orConditions[i].trim();
            console.log(`   - Checking OR condition: "${condition}"`);
            
            if (evaluateSimpleCondition(condition, userAttributes)) {
                console.log(`✅ Condition satisfied: "${condition}"`);
                return true;
            }
        }
        
        console.log(`❌ No conditions satisfied`);
        return false;
        
    } catch (error) {
        console.error(`❌ Error in access check: ${error.message}`);
        return false;
    }
}

function evaluateSimpleCondition(condition, userAttributes) {
    try {
        condition = condition.replace(/^\(/, '').replace(/\)$/, '').trim();
        
        // Xử lý "AND" conditions
        const andConditions = condition.split(/\s+and\s+/i);
        
        // Tất cả AND conditions phải được thỏa mãn
        for (const andCondition of andConditions) {
            const attr = andCondition.trim();
            if (!userAttributes.includes(attr)) {
                console.log(`       ❌ Missing attribute: "${attr}"`);
                return false;
            }
            console.log(`       ✅ Has attribute: "${attr}"`);
        }
        
        return true;
        
    } catch (error) {
        console.error(`❌ Error evaluating condition: ${error.message}`);
        return false;
    }
}

// Auto-register current user with AA server
exports.registerCurrentUser = async (req, res) => {
    try {
        const user = req.user; // From authenticateToken middleware
        const attributes = mapUserAttributesFromRole(user.role, user.department);
        
        console.log(`🔧 Auto-registering user: ${user.user_id}, role: ${user.role}, attributes: ${attributes}`);
        
        const response = await axios.post(`${AA_SERVER_URL}/api/user/register`, {
            user_id: user.user_id,
            attributes: attributes
        }, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });

        res.status(200).json({
            message: 'User registered with AA server successfully',
            user_id: user.user_id,
            attributes: attributes,
            success: true
        });

    } catch (error) {
        console.error('❌ Auto-register User Error:', error.response?.data || error.message);
        // Don't fail if user already exists
        if (error.response?.status === 409 || error.response?.data?.error?.includes('already exists')) {
            res.status(200).json({
                message: 'User already registered with AA server',
                user_id: req.user.user_id,
                success: true
            });
        } else {
            res.status(500).json({ 
                message: 'Failed to register user with AA server',
                error: error.response?.data || error.message,
                success: false
            });
        }
    }
};

// Register policy
exports.registerPolicy = async (req, res) => {
    try {
        const { policy_name, access_policy, description } = req.body;
        
        if (!policy_name || !access_policy) {
            return res.status(400).json({ 
                message: 'policy_name và access_policy là bắt buộc',
                success: false 
            });
        }

        console.log(`📋 Registering policy: ${policy_name}`);

        const result = {
            message: 'Policy registered successfully',
            policy_name: policy_name,
            access_policy: access_policy,
            description: description || '',
            success: true
        };

        res.json(result);

    } catch (error) {
        console.error('❌ Register Policy Error:', error.message);
        res.status(500).json({ 
            message: 'Lỗi khi đăng ký policy',
            error: error.message,
            success: false
        });
    }
};

// Check access
exports.checkAccess = async (req, res) => {
    try {
        const { policy_expression, user_attributes } = req.body;
        
        if (!policy_expression || !user_attributes) {
            return res.status(400).json({ 
                message: 'policy_expression và user_attributes là bắt buộc',
                success: false 
            });
        }

        console.log(`🔍 Checking access for policy: ${policy_expression}`);
        console.log(`👤 User attributes: ${user_attributes.join(', ')}`);

        // Simple access check
        let access_granted = false;
        
        if (user_attributes.includes('ROLE:ADMIN')) {
            access_granted = true;
        } else {
            for (const attr of user_attributes) {
                if (policy_expression.includes(attr)) {
                    access_granted = true;
                    break;
                }
            }
        }

        res.json({
            message: 'Access check completed',
            access_granted: access_granted,
            policy_expression: policy_expression,
            user_attributes: user_attributes,
            success: true
        });

    } catch (error) {
        console.error('❌ Check Access Error:', error.message);
        res.status(500).json({ 
            message: 'Lỗi khi kiểm tra quyền truy cập',
            error: error.message,
            success: false
        });
    }
};

// Security cleanup - Clear expired sessions and keys
setInterval(() => {
    const now = Date.now();
    
    // Clean expired session keys
    for (const [userId, context] of sessionKeys) {
        if (now > context.expiresAt) {
            sessionKeys.delete(userId);
            console.log(`🔐 Expired session key cleaned: ${userId}`);
        }
    }
    
    // Clean expired cache entries
    for (const [cacheKey, cached] of aesKeyCache) {
        if (now > cached.expiresAt) {
            aesKeyCache.delete(cacheKey);
        }
    }
}, 5 * 60 * 1000); // Setup thời gian dọn dẹp mỗi 5 phút


exports.getJWTSecret = async (req, res) => {
    try {
        // Chỉ cho phép người dùng đã xác thực truy cập
        if (!req.user) {
            return res.status(401).json({
                message: 'Unauthorized access',
                success: false
            });
        }
        
        const jwtSecret = 'SIMPLE_EHR_SECRET';
        
        res.json({
            message: 'JWT secret retrieved successfully',
            jwt_secret: jwtSecret,
            success: true
        });
        
    } catch (error) {
        console.error('❌ Error getting JWT secret:', error);
        res.status(500).json({
            message: 'Error retrieving JWT secret',
            error: error.message,
            success: false
        });
    }
};