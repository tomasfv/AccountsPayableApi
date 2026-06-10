import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockBillFindAll,
  mockBillFindByPk,
  mockBillCreate,
  mockVendorFindByPk,
} = vi.hoisted(() => ({
  mockBillFindAll: vi.fn(),
  mockBillFindByPk: vi.fn(),
  mockBillCreate: vi.fn(),
  mockVendorFindByPk: vi.fn(),
}))

vi.mock('../../src/models', () => ({
  Bill: {
    findAll: mockBillFindAll,
    findByPk: mockBillFindByPk,
    create: mockBillCreate,
  },
  Vendor: { findByPk: mockVendorFindByPk },
  User: { findByPk: vi.fn() },
  Payment: { findAll: vi.fn() },
}))

import { getAllBills, getBillById, createBill, deleteBill } from '../../src/controllers/billController'

function mockReqRes(overrides: Record<string, any> = {}) {
  const req: any = { user: { id: 'user-1' }, params: {}, body: {}, query: {}, ...overrides }
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  const next = vi.fn()
  return { req, res, next }
}

describe('getAllBills', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns bills with includes and count', async () => {
    const bills = [{ id: '1', invoiceNumber: 'INV-001' }]
    mockBillFindAll.mockResolvedValue(bills)
    const { req, res, next } = mockReqRes()

    await getAllBills(req, res, next)

    expect(mockBillFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['dueDate', 'ASC']] }),
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, count: 1, data: bills })
    expect(next).not.toHaveBeenCalled()
  })

  it('filters by status query param', async () => {
    mockBillFindAll.mockResolvedValue([])
    const { req, res, next } = mockReqRes({ query: { status: 'Pending Approval' } })

    await getAllBills(req, res, next)

    expect(mockBillFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'Pending Approval' } }),
    )
  })

  it('returns empty array when no bills exist', async () => {
    mockBillFindAll.mockResolvedValue([])
    const { req, res, next } = mockReqRes()

    await getAllBills(req, res, next)

    expect(res.json).toHaveBeenCalledWith({ success: true, count: 0, data: [] })
  })
})

describe('getBillById', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns bill by id', async () => {
    const bill = { id: '1', invoiceNumber: 'INV-001' }
    mockBillFindByPk.mockResolvedValue(bill)
    const { req, res, next } = mockReqRes({ params: { id: '1' } })

    await getBillById(req, res, next)

    expect(mockBillFindByPk).toHaveBeenCalledWith('1', expect.any(Object))
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: bill })
  })

  it('returns 404 if bill does not exist', async () => {
    mockBillFindByPk.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({ params: { id: '999' } })

    await getBillById(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Bill not found' })
  })
})

describe('createBill', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates bill with Pending Approval status', async () => {
    const vendor = { id: 'v1', name: 'Test Vendor' }
    mockVendorFindByPk.mockResolvedValue(vendor)
    const newBill = { id: 'b1', vendorId: 'v1', status: 'Pending Approval', amount: '1000' }
    mockBillCreate.mockResolvedValue(newBill)
    mockBillFindByPk.mockResolvedValue(newBill)
    const { req, res, next } = mockReqRes({
      body: { vendorId: 'v1', amount: '1000', invoiceNumber: 'INV-001', dueDate: '2026-07-01' },
    })

    await createBill(req, res, next)

    expect(mockVendorFindByPk).toHaveBeenCalledWith('v1')
    expect(mockBillCreate).toHaveBeenCalledWith({
      vendorId: 'v1',
      amount: '1000',
      invoiceNumber: 'INV-001',
      dueDate: '2026-07-01',
      fileUrl: null,
      createdById: 'user-1',
      status: 'Pending Approval',
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: newBill })
  })

  it('returns 404 if vendor does not exist', async () => {
    mockVendorFindByPk.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({
      body: { vendorId: 'invalid', amount: '1000', invoiceNumber: 'INV-001', dueDate: '2026-07-01' },
    })

    await createBill(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Vendor not found' })
    expect(mockBillCreate).not.toHaveBeenCalled()
  })

  it('assigns fileUrl when a file is uploaded', async () => {
    const vendor = { id: 'v1' }
    mockVendorFindByPk.mockResolvedValue(vendor)
    const newBill = { id: 'b1', fileUrl: '/uploads/test.pdf' }
    mockBillCreate.mockResolvedValue(newBill)
    mockBillFindByPk.mockResolvedValue(newBill)
    const { req, res, next } = mockReqRes({
      body: { vendorId: 'v1', amount: '500', invoiceNumber: 'INV-002', dueDate: '2026-08-01' },
      file: { filename: 'test.pdf' },
    })

    await createBill(req, res, next)

    expect(mockBillCreate).toHaveBeenCalledWith(
      expect.objectContaining({ fileUrl: '/uploads/test.pdf' }),
    )
  })
})

describe('deleteBill', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('deletes bill when status is Draft', async () => {
    const bill = { id: '1', get: vi.fn().mockReturnValue('Draft'), destroy: vi.fn() }
    mockBillFindByPk.mockResolvedValue(bill)
    const { req, res, next } = mockReqRes({ params: { id: '1' } })

    await deleteBill(req, res, next)

    expect(mockBillFindByPk).toHaveBeenCalledWith('1')
    expect(bill.destroy).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Bill deleted successfully' })
  })

  it('deletes bill when status is Rejected', async () => {
    const bill = { id: '1', get: vi.fn().mockReturnValue('Rejected'), destroy: vi.fn() }
    mockBillFindByPk.mockResolvedValue(bill)
    const { req, res, next } = mockReqRes({ params: { id: '1' } })

    await deleteBill(req, res, next)

    expect(bill.destroy).toHaveBeenCalled()
  })

  it('rejects delete when status is not Draft or Rejected', async () => {
    const bill = { id: '1', get: vi.fn().mockReturnValue('Approved'), destroy: vi.fn() }
    mockBillFindByPk.mockResolvedValue(bill)
    const { req, res, next } = mockReqRes({ params: { id: '1' } })

    await deleteBill(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Bill status is "Approved", it cannot be deleted.',
    })
    expect(bill.destroy).not.toHaveBeenCalled()
  })

  it('returns 404 if bill does not exist', async () => {
    mockBillFindByPk.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({ params: { id: '999' } })

    await deleteBill(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Bill not found' })
  })
})
