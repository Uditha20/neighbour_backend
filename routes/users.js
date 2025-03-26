import express from 'express';
import multer from 'multer';
import path from 'path';
import User from '../model/User.js';

const router = express.Router();

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// @route   POST /api/users/register
// @desc    Register a new user with NIC photo upload
// @access  Public
router.post('/register', upload.single('nicPhoto'), async (req, res) => {
  const { name, email, password, phone, address, nic } = req.body;
  const nicPhoto = req.file?.path;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      phone,
      address,
      nic,
      nicPhoto
    });

    // Save user to database
    await user.save();

    res.status(201).json({ 
      message: 'Registration successful! You can now log in.',
      userId: user._id 
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Return user data
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      nic: user.nic,
      nicPhoto: user.nicPhoto
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// @route   GET /api/users
// @desc    Get all users

router.get('/getUser', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
}
)

// @route   GET /api/users/:id

router.get('/getUser/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
}
)

// @route   PUT /api/users/:id
// @desc    Update user details
// @access  Private
router.put('/updateUser/:id', async (req, res) => {
  const { name, email, phone, address, nic } = req.body;

  try {
    
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

   
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.nic = nic || user.nic;

   
    await user.save();

    res.json({ message: 'User details updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// @route   DELETE /api/users/:id
// @desc    Delete user


router.delete('/deleteUser/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});



export default router;
