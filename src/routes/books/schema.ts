import { Schema, model } from 'mongoose'
import type { Book } from './model.js'
import type { Timestamp } from '../../model.js'

// Define before first use
export const ALL_CONDITIONS = ['new', 'used', 'refurbished'] as const
export type BookCondition = (typeof ALL_CONDITIONS)[number]

const BookSchema = new Schema<Book & Timestamp>({
  title: {
    type: String,
    required: true,
  },
  isbn: {
    type: String,
    required: true,
  },
  conditions: {
    type: String,
    required: true,
    enum: ALL_CONDITIONS,
  },
  authors: [
    {
      type: String,
    },
  ],
  categories: [
    {
      type: String,
    },
  ],
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
})

const BookModel = model<Book & Timestamp>('Book', BookSchema)

export { BookSchema, BookModel }
