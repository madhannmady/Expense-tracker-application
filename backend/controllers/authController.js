const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const getSupabase = require('../config/supabase');

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const { data: existingUser, error: checkError } = await getSupabase()
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();

    if (checkError) {
      console.error('User check error:', checkError);
      return res.status(500).json({ message: 'Database error while checking username' });
    }

    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error: insertError } = await getSupabase()
      .from('users')
      .insert([{ username: username.trim(), password: hashedPassword }])
      .select('id, username')
      .single();

    if (insertError) {
      console.error('User insert error:', insertError);
      return res.status(500).json({ message: `Registration failed: ${insertError.message}` });
    }

    if (!user) {
      return res.status(500).json({ message: 'Registration failed: user not returned from database' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Registration failed. Please try again.' });
  }
};

// @desc    Login with username/password
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find the user
    const { data: user, error } = await getSupabase()
      .from('users')
      .select('id, username, password')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
  });
};

module.exports = { register, login, getMe };
