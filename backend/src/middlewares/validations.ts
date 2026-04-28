import { Joi, celebrate } from 'celebrate'
import { Types } from 'mongoose'

// Безопасное регулярное выражение для телефона:
// допускает необязательный плюс в начале, цифры/пробелы/дефисы/скобки.
// Без вложенных квантификаторов, чтобы исключить катастрофический backtracking.
export const phoneRegExp = /^\+?[\d\s\-()]{5,20}$/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

// валидация id
export const validateOrderBody = celebrate({
    body: Joi.object().keys({
        items: Joi.array()
            .max(100)
            .items(
                Joi.string().custom((value, helpers) => {
                    if (Types.ObjectId.isValid(value)) {
                        return value
                    }
                    return helpers.message({ custom: 'Невалидный id' })
                })
            )
            .messages({
                'array.empty': 'Не указаны товары',
                'array.max': 'Слишком много товаров в заказе',
            }),
        payment: Joi.string()
            .valid(...Object.values(PaymentType))
            .required()
            .messages({
                'string.valid':
                    'Указано не валидное значение для способа оплаты, возможные значения - "card", "online"',
                'string.empty': 'Не указан способ оплаты',
            }),
        email: Joi.string().max(254).email().required().messages({
            'string.empty': 'Не указан email',
        }),
        phone: Joi.string()
            .max(20)
            .required()
            .pattern(phoneRegExp)
            .messages({
                'string.empty': 'Не указан телефон',
                'string.pattern.base': 'Не валидный формат телефона',
            }),
        address: Joi.string().min(5).max(200).required().messages({
            'string.empty': 'Не указан адрес',
        }),
        total: Joi.number().min(0).max(1_000_000).required().messages({
            'string.empty': 'Не указана сумма заказа',
        }),
        comment: Joi.string().max(1000).optional().allow(''),
    }),
})

// валидация товара.
// name и link - обязательные поля, name - от 2 до 30 символов, link - валидный url
export const validateProductBody = celebrate({
    body: Joi.object().keys({
        title: Joi.string().required().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
            'string.empty': 'Поле "title" должно быть заполнено',
        }),
        image: Joi.object().keys({
            fileName: Joi.string().max(255).required(),
            originalName: Joi.string().max(255).required(),
        }),
        category: Joi.string().max(60).required().messages({
            'string.empty': 'Поле "category" должно быть заполнено',
        }),
        description: Joi.string().max(2000).required().messages({
            'string.empty': 'Поле "description" должно быть заполнено',
        }),
        price: Joi.number().min(0).max(1_000_000).allow(null),
    }),
})

export const validateProductUpdateBody = celebrate({
    body: Joi.object().keys({
        title: Joi.string().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
        }),
        image: Joi.object().keys({
            fileName: Joi.string().max(255).required(),
            originalName: Joi.string().max(255).required(),
        }),
        category: Joi.string().max(60),
        description: Joi.string().max(2000),
        price: Joi.number().min(0).max(1_000_000).allow(null),
    }),
})

export const validateObjId = celebrate({
    params: Joi.object().keys({
        productId: Joi.string()
            .required()
            .custom((value, helpers) => {
                if (Types.ObjectId.isValid(value)) {
                    return value
                }
                return helpers.message({ any: 'Невалидный id' })
            }),
    }),
})

export const validateUserBody = celebrate({
    body: Joi.object().keys({
        name: Joi.string().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
        }),
        password: Joi.string().min(6).max(128).required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
        }),
        email: Joi.string()
            .max(254)
            .required()
            .email()
            .message('Поле "email" должно быть валидным email-адресом')
            .messages({
                'string.empty': 'Поле "email" должно быть заполнено',
            }),
    }),
})

export const validateAuthentication = celebrate({
    body: Joi.object().keys({
        email: Joi.string()
            .max(254)
            .required()
            .email()
            .message('Поле "email" должно быть валидным email-адресом')
            .messages({
                'string.required': 'Поле "email" должно быть заполнено',
            }),
        password: Joi.string().max(128).required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
        }),
    }),
})

export const validateUpdateUser = celebrate({
    body: Joi.object()
        .keys({
            name: Joi.string().min(2).max(30),
            email: Joi.string().max(254).email(),
            phone: Joi.string().max(20).pattern(phoneRegExp),
        })
        .min(1),
})

export const validateOrderUpdate = celebrate({
    body: Joi.object().keys({
        status: Joi.string()
            .valid('cancelled', 'completed', 'new', 'delivering')
            .required(),
    }),
    params: Joi.object().keys({
        orderNumber: Joi.alternatives().try(
            Joi.number().integer().min(0),
            Joi.string().pattern(/^\d+$/)
        ),
    }),
})

export const validateCustomerId = celebrate({
    params: Joi.object().keys({
        id: Joi.string()
            .required()
            .custom((value, helpers) => {
                if (Types.ObjectId.isValid(value)) {
                    return value
                }
                return helpers.message({ any: 'Невалидный id' })
            }),
    }),
})
