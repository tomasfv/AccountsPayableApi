import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'accounts_payable_secret_token_123456', {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any
  });
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password, fullName, role } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      email,
      password,
      fullName,
      role
    });

    const userResponse = user.toJSON();
    delete userResponse.password; // Exclude password from response

    res.status(201).json({
      success: true,
      token: generateToken(user.id),
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide an email and password' });
    }

    const user = await User.unscoped().findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      token: generateToken(user.id),
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt']
    });
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

