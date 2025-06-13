// After successful login, process user attributes for ABE
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // ...existing login code...
        
        // Create token
        const token = createToken(user._id, user.role);
        
        // Process user role for ABE attributes
        const attributes = [];
        
        // Parse the role string into separate attributes
        const roleText = user.role.toUpperCase();
        
        // Check for role components
        if (roleText.includes('DOCTOR')) {
            attributes.push('ROLE:DOCTOR');
        }
        if (roleText.includes('ADMIN')) {
            attributes.push('ROLE:ADMIN');
        }
        if (roleText.includes('NURSE')) {
            attributes.push('ROLE:NURSE');
        }
        
        // Check for department components
        if (roleText.includes('CARDIOLOGY')) {
            attributes.push('DEPT:CARDIOLOGY');
        }
        if (roleText.includes('NEUROLOGY')) {
            attributes.push('DEPT:NEUROLOGY');
        }
        if (roleText.includes('PEDIATRICS')) {
            attributes.push('DEPT:PEDIATRICS');
        }
        if (roleText.includes('ONCOLOGY')) {
            attributes.push('DEPT:ONCOLOGY');
        }
        if (roleText.includes('EMERGENCY')) {
            attributes.push('DEPT:EMERGENCY');
        }
        
        // Register with AA server
        try {
            await axios.post(`${process.env.AA_SERVER_URL || 'http://localhost:5001'}/user/register`, {
                user_id: user._id.toString(),
                attributes: attributes
            });
            
            console.log(`Registered user ${user._id} with attributes: ${attributes.join(', ')}`);
        } catch (aaError) {
            console.error('Failed to register user attributes:', aaError.message);
            // Continue anyway - we don't want login to fail if AA server is down
        }
        
        // Return token and user data with attributes
        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    role: user.role,
                    fullName: user.fullName,
                    attributes: attributes, // Include attributes in response
                }
            }
        });
    } catch (error) {
        // ...error handling...
    }
};