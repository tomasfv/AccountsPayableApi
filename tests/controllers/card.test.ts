import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindAll, mockCreate, mockFindByPk, mockFindOne } = vi.hoisted(() => ({
  mockFindAll: vi.fn(),
  mockCreate: vi.fn(),
  mockFindByPk: vi.fn(),
  mockFindOne: vi.fn(),
}))

vi.mock('../../src/models/Card', () => ({
  default: {
    findAll: mockFindAll,
    create: mockCreate,
    findByPk: mockFindByPk,
    findOne: mockFindOne,
  },
}))

import { getCards, createCard, updateCard, deleteCard } from '../../src/controllers/cardController'

function mockReqRes(overrides: Record<string, any> = {}) {
  const req: any = { user: { id: 'user-1' }, params: {}, body: {}, ...overrides }
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() }
  const next = vi.fn()
  return { req, res, next }
}

describe('getCards', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns cards for the authenticated user', async () => {
    const fakeCards = [{ id: '1', type: 'Debit', lastFourDigits: '1234' }]
    mockFindAll.mockResolvedValue(fakeCards)
    const { req, res, next } = mockReqRes()

    await getCards(req, res, next)

    expect(mockFindAll).toHaveBeenCalledWith({ where: { createdById: 'user-1' } })
    expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeCards })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns empty array when user has no cards', async () => {
    mockFindAll.mockResolvedValue([])
    const { req, res, next } = mockReqRes()

    await getCards(req, res, next)

    expect(mockFindAll).toHaveBeenCalledWith({ where: { createdById: 'user-1' } })
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] })
  })
})

describe('createCard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates a card successfully and returns 201', async () => {
    const fakeCard = { id: '1', type: 'Debit', cardholderName: 'Test', lastFourDigits: '1234' }
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue(fakeCard)
    const { req, res, next } = mockReqRes({
      body: { type: 'Debit', cardholderName: 'Test', cardNumber: '4111111111111234', expiryMonth: '12', expiryYear: '28', cvv: '123' },
    })

    await createCard(req, res, next)

    expect(mockFindOne).toHaveBeenCalledWith({ where: { createdById: 'user-1', type: 'Debit' } })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ type: 'Debit', cardholderName: 'Test', lastFourDigits: '1234' }))
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeCard })
  })

  it('rejects if a required field is missing', async () => {
    const { req, res, next } = mockReqRes({ body: { type: 'Debit' } })

    await createCard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'All fields are required' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('rejects if type is not Debit or Credit', async () => {
    const { req, res, next } = mockReqRes({
      body: { type: 'Visa', cardholderName: 'T', cardNumber: '1234', expiryMonth: '12', expiryYear: '28', cvv: '123' },
    })

    await createCard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Card type must be Debit or Credit' })
  })

  it('rejects if user already has a card of that type', async () => {
    mockFindOne.mockResolvedValue({ id: 'existing' })
    const { req, res, next } = mockReqRes({
      body: { type: 'Debit', cardholderName: 'T', cardNumber: '1234567890123456', expiryMonth: '12', expiryYear: '28', cvv: '123' },
    })

    await createCard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'You already have a Debit card' })
  })

  it('rejects invalid card number (no 4 trailing digits)', async () => {
    mockFindOne.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({
      body: { type: 'Debit', cardholderName: 'T', cardNumber: 'abc', expiryMonth: '12', expiryYear: '28', cvv: '123' },
    })

    await createCard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid card number' })
  })
})

describe('updateCard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('updates own card successfully', async () => {
    const card = { id: '1', createdById: 'user-1', save: vi.fn() }
    mockFindByPk.mockResolvedValue(card)
    const { req, res, next } = mockReqRes({
      params: { id: '1' },
      body: { cardholderName: 'New Name', expiryMonth: '06' },
    })

    await updateCard(req, res, next)

    expect(mockFindByPk).toHaveBeenCalledWith('1')
    expect(card.cardholderName).toBe('New Name')
    expect(card.expiryMonth).toBe('06')
    expect(card.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ success: true, data: card })
  })

  it('returns 404 if card does not exist', async () => {
    mockFindByPk.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({ params: { id: '999' }, body: { cardholderName: 'X' } })

    await updateCard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Card not found' })
  })

  it('returns 403 if not the owner', async () => {
    const card = { id: '1', createdById: 'other-user' }
    mockFindByPk.mockResolvedValue(card)
    const { req, res, next } = mockReqRes({ params: { id: '1' }, body: { cardholderName: 'X' } })

    await updateCard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized' })
  })
})

describe('deleteCard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('deletes own card successfully', async () => {
    const card = { id: '1', createdById: 'user-1', destroy: vi.fn() }
    mockFindByPk.mockResolvedValue(card)
    const { req, res, next } = mockReqRes({ params: { id: '1' } })

    await deleteCard(req, res, next)

    expect(mockFindByPk).toHaveBeenCalledWith('1')
    expect(card.destroy).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Card deleted successfully' })
  })

  it('returns 404 if card does not exist', async () => {
    mockFindByPk.mockResolvedValue(null)
    const { req, res, next } = mockReqRes({ params: { id: '999' } })

    await deleteCard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Card not found' })
  })

  it('returns 403 if not the owner', async () => {
    const card = { id: '1', createdById: 'other-user', destroy: vi.fn() }
    mockFindByPk.mockResolvedValue(card)
    const { req, res, next } = mockReqRes({ params: { id: '1' } })

    await deleteCard(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized' })
  })
})
