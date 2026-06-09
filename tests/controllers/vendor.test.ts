import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindAll, mockCreate, mockFindByPk } = vi.hoisted(() => ({
  mockFindAll: vi.fn(),
  mockCreate: vi.fn(),
  mockFindByPk: vi.fn(),
}))

vi.mock('../../src/models', () => ({
  Vendor: {
    findAll: mockFindAll,
    create: mockCreate,
    findByPk: mockFindByPk,
  },
}))

import { getAllVendors, getVendorById, createVendor, updateVendor } from '../../src/controllers/vendorController'

function mockReqRes(overrides: Record<string, any> = {}) {
  const req: any = { params: {}, body: {}, ...overrides }
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  const next = vi.fn()
  return { req, res, next }
}

describe('getAllVendors', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns all vendors ordered by name', async () => {
    const vendors = [{ id: '1', name: 'Alpha' }, { id: '2', name: 'Beta' }]
    mockFindAll.mockResolvedValue(vendors)
    const { req, res, next } = mockReqRes()

    await getAllVendors(req, res, next)

    expect(mockFindAll).toHaveBeenCalledWith({ order: [['name', 'ASC']] })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, count: 2, data: vendors })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns empty array when no vendors exist', async () => {
    mockFindAll.mockResolvedValue([])
    const { req, res, next } = mockReqRes()

    await getAllVendors(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ success: true, count: 0, data: [] })
  })
})

describe('getVendorById', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns vendor by id', async () => {
    const vendor = { id: '1', name: 'Test Vendor', email: 'test@vendor.com' }
    mockFindByPk.mockResolvedValue(vendor)
    const { req, res, next } = mockReqRes({ params: { id: '1' } })

    await getVendorById(req, res, next)

    expect(mockFindByPk).toHaveBeenCalledWith('1')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: vendor })
  })

  it('returns 404 if vendor does not exist', async () => {
    mockFindByPk.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({ params: { id: '999' } })

    await getVendorById(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Vendor not found' })
  })
})

describe('createVendor', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates vendor with req.body and returns 201', async () => {
    const vendor = { id: '1', name: 'New Vendor', email: 'new@vendor.com' }
    mockCreate.mockResolvedValue(vendor)
    const { req, res, next } = mockReqRes({
      body: { name: 'New Vendor', email: 'new@vendor.com' },
    })

    await createVendor(req, res, next)

    expect(mockCreate).toHaveBeenCalledWith(req.body)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: vendor })
  })
})

describe('updateVendor', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('updates existing vendor', async () => {
    const vendor = { id: '1', name: 'Old', email: 'old@vendor.com', update: vi.fn() }
    mockFindByPk.mockResolvedValue(vendor)
    const { req, res, next } = mockReqRes({
      params: { id: '1' },
      body: { name: 'Updated Name' },
    })

    await updateVendor(req, res, next)

    expect(mockFindByPk).toHaveBeenCalledWith('1')
    expect(vendor.update).toHaveBeenCalledWith(req.body)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: vendor })
  })

  it('returns 404 if vendor does not exist', async () => {
    mockFindByPk.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({ params: { id: '999' }, body: { name: 'X' } })

    await updateVendor(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Vendor not found' })
  })
})
