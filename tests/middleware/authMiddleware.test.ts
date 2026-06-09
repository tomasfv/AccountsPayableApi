import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUserFindByPk, mockJwtVerify } = vi.hoisted(() => ({
  mockUserFindByPk: vi.fn(),
  mockJwtVerify: vi.fn(),
}))

vi.mock('../../src/models/User', () => ({
  default: { findByPk: mockUserFindByPk },
}))

vi.mock('jsonwebtoken', () => ({
  default: { verify: mockJwtVerify, sign: vi.fn() },
}))

import { protect, authorize } from '../../src/middleware/authMiddleware'

function mockReqRes(overrides: Record<string, any> = {}) {
  const req: any = { headers: {}, ...overrides }
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  const next = vi.fn()
  return { req, res, next }
}

describe('protect', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 when no token is provided', async () => {
    const { req, res, next } = mockReqRes({ headers: {} })

    await protect(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized, no token provided' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', async () => {
    mockJwtVerify.mockImplementation(() => { throw new Error('jwt error') })
    const { req, res, next } = mockReqRes({
      headers: { authorization: 'Bearer bad-token' },
    })

    await protect(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized, token failed' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when user is not found in DB', async () => {
    mockJwtVerify.mockReturnValue({ id: 'nonexistent' })
    mockUserFindByPk.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({
      headers: { authorization: 'Bearer valid-token' },
    })

    await protect(req, res, next)

    expect(mockUserFindByPk).toHaveBeenCalledWith('nonexistent')
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized, user not found' })
  })

  it('calls next() when token is valid and user exists', async () => {
    const fakeUser = { id: 'user-1', role: 'Admin', email: 'admin@test.com' }
    mockJwtVerify.mockReturnValue({ id: 'user-1' })
    mockUserFindByPk.mockResolvedValue(fakeUser)
    const { req, res, next } = mockReqRes({
      headers: { authorization: 'Bearer valid-token' },
    })

    await protect(req, res, next)

    expect(req.user).toEqual(fakeUser)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('authorize', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls next() when role matches', () => {
    const middleware = authorize('Admin')
    const { req, res, next } = mockReqRes({ user: { role: 'Admin' } })

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 when role does not match', () => {
    const middleware = authorize('Admin')
    const { req, res, next } = mockReqRes({ user: { role: 'Submitter' } })

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User role 'Submitter' is not authorized to access this route",
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when there is no user on req', () => {
    const middleware = authorize('Admin')
    const { req, res, next } = mockReqRes({ user: undefined })

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('accepts multiple roles', () => {
    const middleware = authorize('Admin', 'Approver')
    const { req, res, next } = mockReqRes({ user: { role: 'Approver' } })

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
