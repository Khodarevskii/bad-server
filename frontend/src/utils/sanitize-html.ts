import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li']

export function sanitizeUserHtml(input: unknown): string {
    if (typeof input !== 'string') return ''
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS,
        ALLOWED_ATTR: [],
        FORBID_ATTR: ['style', 'on*'],
    })
}
