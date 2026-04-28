import { NextFunction, Request, Response } from 'express'
import { FilterQuery, Types } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'
import escapeRegExp from '../utils/escapeRegExp'

// TODO: Добавить guard admin
// eslint-disable-next-line max-len
// Get GET /customers?page=2&limit=5&sort=totalAmount&order=desc&registrationDateFrom=2023-01-01&registrationDateTo=2023-12-31&lastOrderDateFrom=2023-01-01&lastOrderDateTo=2023-12-31&totalAmountFrom=100&totalAmountTo=1000&orderCountFrom=1&orderCountTo=10
export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortField = 'createdAt',
            sortOrder = 'desc',
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
            search,
        } = req.query

        // Защита от NoSQL-инъекций в query: все параметры должны быть
        // строками или отсутствовать.
        const stringOrUndefined = (v: unknown): boolean =>
            v === undefined || typeof v === 'string'
        if (
            !stringOrUndefined(sortField) ||
            !stringOrUndefined(sortOrder) ||
            !stringOrUndefined(registrationDateFrom) ||
            !stringOrUndefined(registrationDateTo) ||
            !stringOrUndefined(lastOrderDateFrom) ||
            !stringOrUndefined(lastOrderDateTo) ||
            !stringOrUndefined(totalAmountFrom) ||
            !stringOrUndefined(totalAmountTo) ||
            !stringOrUndefined(orderCountFrom) ||
            !stringOrUndefined(orderCountTo) ||
            !stringOrUndefined(search)
        ) {
            return next(new BadRequestError('Не валидные параметры запроса'))
        }

        const filters: FilterQuery<Partial<IUser>> = {}

        if (registrationDateFrom) {
            filters.createdAt = {
                ...filters.createdAt,
                $gte: new Date(registrationDateFrom as string),
            }
        }

        if (registrationDateTo) {
            const endOfDay = new Date(registrationDateTo as string)
            endOfDay.setHours(23, 59, 59, 999)
            filters.createdAt = {
                ...filters.createdAt,
                $lte: endOfDay,
            }
        }

        if (lastOrderDateFrom) {
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $gte: new Date(lastOrderDateFrom as string),
            }
        }

        if (lastOrderDateTo) {
            const endOfDay = new Date(lastOrderDateTo as string)
            endOfDay.setHours(23, 59, 59, 999)
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $lte: endOfDay,
            }
        }

        if (totalAmountFrom) {
            filters.totalAmount = {
                ...filters.totalAmount,
                $gte: Number(totalAmountFrom),
            }
        }

        if (totalAmountTo) {
            filters.totalAmount = {
                ...filters.totalAmount,
                $lte: Number(totalAmountTo),
            }
        }

        if (orderCountFrom) {
            filters.orderCount = {
                ...filters.orderCount,
                $gte: Number(orderCountFrom),
            }
        }

        if (orderCountTo) {
            filters.orderCount = {
                ...filters.orderCount,
                $lte: Number(orderCountTo),
            }
        }

        if (typeof search === 'string' && search.length > 0) {
            const safeSearch = escapeRegExp(search.slice(0, 100))
            const searchRegex = new RegExp(safeSearch, 'i')
            const orders = await Order.find(
                {
                    $or: [{ deliveryAddress: searchRegex }],
                },
                '_id'
            )

            const orderIds = orders.map((order) => order._id)

            filters.$or = [
                { name: searchRegex },
                { lastOrder: { $in: orderIds } },
            ]
        }

        const allowedSortFields = new Set([
            'createdAt',
            'name',
            'totalAmount',
            'orderCount',
            'lastOrderDate',
        ])
        const safeSortField =
            typeof sortField === 'string' && allowedSortFields.has(sortField)
                ? sortField
                : 'createdAt'
        const safeSortOrder = sortOrder === 'asc' ? 1 : -1
        const safePage = Math.max(1, Math.min(Number(page) || 1, 10000))
        const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 10))

        const options = {
            sort: { [safeSortField]: safeSortOrder } as { [key: string]: 1 | -1 },
            skip: (safePage - 1) * safeLimit,
            limit: safeLimit,
        }

        const users = await User.find(filters, null, options).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: {
                    path: 'products',
                },
            },
            {
                path: 'lastOrder',
                populate: {
                    path: 'customer',
                },
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / safeLimit)

        res.status(200).json({
            customers: users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage: safePage,
                pageSize: safeLimit,
            },
        })
    } catch (error) {
        next(error)
    }
}

const validateCustomerId = (rawId: unknown): Types.ObjectId | null => {
    if (typeof rawId !== 'string' || !Types.ObjectId.isValid(rawId)) {
        return null
    }
    return new Types.ObjectId(rawId)
}

// Get /customers/:id
export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = validateCustomerId(req.params.id)
        if (!id) {
            return next(new BadRequestError('Передан не валидный id'))
        }
        const user = await User.findById(id).populate(['orders', 'lastOrder'])
        return res.status(200).json(user)
    } catch (error) {
        return next(error)
    }
}

// Patch /customers/:id
export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = validateCustomerId(req.params.id)
        if (!id) {
            return next(new BadRequestError('Передан не валидный id'))
        }
        // Whitelist обновляемых полей, чтобы избежать mass assignment
        // (например, изменение roles, password, tokens через тело запроса)
        const allowedFields = ['name', 'email', 'phone'] as const
        const update: Partial<Pick<IUser, (typeof allowedFields)[number]>> = {}
        allowedFields.forEach((field) => {
            const value = (req.body as Record<string, unknown>)[field]
            if (typeof value === 'string') {
                update[field] = value
            }
        })

        const updatedUser = await User.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true,
        })
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )
            .populate(['orders', 'lastOrder'])
        return res.status(200).json(updatedUser)
    } catch (error) {
        return next(error)
    }
}

// Delete /customers/:id
export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = validateCustomerId(req.params.id)
        if (!id) {
            return next(new BadRequestError('Передан не валидный id'))
        }
        const deletedUser = await User.findByIdAndDelete(id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        return res.status(200).json(deletedUser)
    } catch (error) {
        return next(error)
    }
}
