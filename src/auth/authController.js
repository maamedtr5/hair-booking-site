// src/controllers/authController.js

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

// Validate email format
const isValidEmail = (email) =>
  typeof email === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Validate password strength
const isStrongPassword = (password) =>
  typeof password === 'string' &&
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

// Remove password before sending response
const sanitizeUser = (user) => {
  if (!user) return null;

  const { password: _password, ...safeUser } = user;
  return safeUser;
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d',
    }
  );
};


// ======================
// REGISTER
// ======================
export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
    } = req.body;


    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: 'Name is required and must be at least 2 characters long.',
      });
    }


    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format.',
      });
    }


    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
      });
    }


    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });


    if (existingUser) {
      return res.status(409).json({
        error: 'Email already exists. Please use another email.',
      });
    }


    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
      },
    });


    const token = generateToken(user);


    res.status(201).json({
      user: sanitizeUser(user),
      token,
    });


  } catch (error) {

    console.error('Register error:', error);


    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Email already exists.',
      });
    }


    res.status(500).json({
      error: 'Registration failed.',
    });
  }
};



// ======================
// LOGIN
// ======================
export const login = async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;


    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required.',
      });
    }


    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });


    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }


    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );


    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }


    const token = generateToken(user);


    res.status(200).json({
      token,
      user: sanitizeUser(user),
    });


  } catch (error) {

    console.error('Login error:', error);


    res.status(500).json({
      error: 'Login failed.',
    });
  }
};