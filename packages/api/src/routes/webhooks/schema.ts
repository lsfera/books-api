import { Timestamp } from 'model.js'
import { Schema, model } from 'mongoose'
import { WebHook } from './model.js'

const WebHookSchema = new Schema<WebHook & Timestamp>({
  url: {
    type: String,
    required: true,
    index: {
      unique: true,
    },
  },
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
})

const WebHookModel = model<typeof WebHookSchema>('WebHook', WebHookSchema)

export { WebHookSchema, WebHookModel }
