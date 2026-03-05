import type { Request, Response } from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const openApiSpecHttpHandler = async (
  _: Request,
  res: Response,
): Promise<void> => {
  /*
      #swagger.ignore = true
    */
  const candidates = [
    resolve(process.cwd(), 'src/spec.json'),
    resolve(process.cwd(), 'spec.json'),
  ]
  const found = candidates.find((x) => existsSync(x))

  if (found === undefined) {
    res.status(404).json({
      errors: ['OpenAPI spec not found. Run "pnpm run doc" first.'],
    })
    return
  }

  res.sendFile(found)
}

export { openApiSpecHttpHandler }
