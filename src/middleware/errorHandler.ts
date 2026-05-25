import { Request, Response, NextFunction } from 'express';
import { BaseError as SequelizeBaseError, ValidationError as SequelizeValidationError } from 'sequelize';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err instanceof SequelizeValidationError) {
    statusCode = 400;
    message = err.errors.map((e: any) => e.message).join(', ');
  } else if (err instanceof SequelizeBaseError) {
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

export default errorHandler;
