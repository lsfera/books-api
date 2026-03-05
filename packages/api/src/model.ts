import { Errors } from 'io-ts'

type ErrorCode = 'not_found' | 'generic_error' | 'already_exists' | 'validation'

type AppError =
  | { errors: Array<{ code: ErrorCode; message?: string }> }
  | { code: ErrorCode; message?: string }

type Timestamp = {
  createdAt: Date
  updatedAt: Date
}

const genericError = (message?: string): AppError => ({
  code: 'generic_error',
  message: message,
})
const notFoundError = (message?: string): AppError => ({
  code: 'not_found',
  message: message,
})
const alreadyExistsError = (message?: string): AppError => ({
  code: 'already_exists',
  message: message,
})
const flattenValidationErrors = (errors: Errors): AppError => ({
  errors: errors.map((e) => {
    const path = e.context.map(({ key }) => key).join('.')
    return {
      code: 'validation',
      message: `field '${path}': ${e.message}`,
    }
  }),
})

export {
  AppError,
  ErrorCode,
  Timestamp,
  genericError,
  notFoundError,
  alreadyExistsError,
  flattenValidationErrors,
}
