import { describe, it, expect, vi, beforeEach } from 'vitest'
import errorHandler from '../../src/middleware/errorHandler'
import { ValidationError as SequelizeValidationError, BaseError as SequelizeBaseError } from 'sequelize'

class MockSequelizeError extends SequelizeBaseError {
  constructor(message: string) {
    super(message)
  }
}

function mockReqRes() {
  const req: any = {}
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  const next = vi.fn()
  return { req, res, next }
}

describe('errorHandler', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 400 for SequelizeValidationError', () => {
    const err = new SequelizeValidationError('Validation failed', [
      { message: 'Name is required' } as any,
      { message: 'Email must be valid' } as any,
    ])
    const { req, res, next } = mockReqRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Name is required, Email must be valid' },
    })
  })

  it('returns 400 for generic SequelizeBaseError', () => {
    const err = new MockSequelizeError('Database connection failed')
    const { req, res, next } = mockReqRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Database connection failed' },
    })
  })

  it('returns 500 for generic errors', () => {
    const err = new Error('Something went wrong')
    const { req, res, next } = mockReqRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Something went wrong' },
    })
  })

  it('includes stack trace in development', () => {
    const orig = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const err = new Error('dev error')
    const { req, res, next } = mockReqRes()

    errorHandler(err, req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ stack: expect.any(String) }),
      }),
    )
    process.env.NODE_ENV = orig
  })

  it('hides stack trace in production', () => {
    const orig = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const err = new Error('prod error')
    const { req, res, next } = mockReqRes()

    errorHandler(err, req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'prod error' },
    })
    process.env.NODE_ENV = orig
  })
})
