// ES Module User controller
import { prisma } from '../lib/prisma.js';
import {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser
} from '../models/user.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 🔐 Register new user
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, password: hashedPassword });

    // Strip password
    const { password: _, ...safeUser } = user;
    res.status(201).json({ message: 'User registered successfully', user: safeUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// 🔐 Login user
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Strip password
    const { password: _, ...safeUser } = user;
    res.json({ message: 'Login successful', token, user: safeUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// 🟢 CRUD Handlers
export async function createUserHandler(req, res) {
  try {
    const user = await createUser(req.body);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getUserHandler(req, res) {
  try {
    const user = await getUserById(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getUsersHandler(req, res) {
  try {
    const users = await getAllUsers();
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateUserHandler(req, res) {
  try {
    const user = await updateUser(parseInt(req.params.id), req.body);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteUserHandler(req, res) {
  try {
    await deleteUser(parseInt(req.params.id));
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// 📅 Update Google tokens (OAuth callback)
export const updateGoogleTokens = async (req, res) => {
  try {
    const { id } = req.params;
    const { googleAccessToken, googleRefreshToken, googleTokenExpiry } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        googleAccessToken,
        googleRefreshToken,
        googleTokenExpiry: googleTokenExpiry ? new Date(googleTokenExpiry) : null
      }
    });

    const { password: _, ...safeUser } = updatedUser;
    res.json({ message: 'Google tokens updated successfully', user: safeUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 📅 Disconnect Google Calendar
export const disconnectGoogleCalendar = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null
      }
    });

    const { password: _, ...safeUser } = updatedUser;
    res.json({ message: 'Google Calendar disconnected successfully', user: safeUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
