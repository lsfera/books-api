import swaggerAutogen from 'swagger-autogen'
import { readFile, writeFile } from 'node:fs/promises'

const doc = {
  info: {
    version: process.env.npm_package_version,
    title: process.env.npm_package_name,
    description: 'books stock helper',
  },
  servers: [
    {
      url: process.env.SWAGGER_SERVER_URL ?? '/',
    },
  ],
  components: {
    schemas: {
      registerWebHook: {
        $url: 'http://localhost:3001',
      },
      placeOrder: {
        $purchaser: 'Benjamin C. Pierce',
        $bookIds: ['ABC', '123'],
      },
      recordDelivery: {
        $supplier: 'Benjamin C. Pierce',
        $bookIds: ['ABC', '123'],
      },
      findBooks: {
        $books: [
          {
            $title: 'Types and Programming Languages',
            $isbn: '0262162091',
            $conditions: 'new',
            $authors: ['Benjamin C. Pierce'],
            $categories: ['programming', 'computer', 'science'],
          },
        ],
      },
      findBook: {
        $title: 'Types and Programming Languages',
        $isbn: '0262162091',
        $conditions: 'new',
        $authors: ['Benjamin C. Pierce'],
        $categories: ['programming', 'computer', 'science'],
      },
      saveBook: {
        $title: 'Types and Programming Languages',
        $isbn: '0262162091',
        $conditions: 'new',
        $authors: ['Benjamin C. Pierce'],
        $categories: ['programming', 'computer', 'science'],
      },
      bookAvailability: {
        $count: 4,
      },
    },
  },
}

const outputFile = './src/spec.json'
const endpointsFiles = ['./src/app.ts']

const requiredErrorResponses = {
  403: { description: 'Validation/already exists error' },
  404: { description: 'Resource not found' },
  500: { description: 'Internal server error' },
}

const requiredOperationDocs: Record<
  string,
  Record<
    string,
    {
      summary?: string
      description?: string
      operationId?: string
      requestBody?: {
        required: boolean
        content: Record<string, { schema: { $ref: string } }>
      }
      responses?: Record<string, unknown>
    }
  >
> = {
  '/books': {
    get: {
      summary: 'List all books.',
      description: 'List all books.',
      operationId: 'find_books',
      responses: {
        200: {
          description: '',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/findBooks',
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Insert a book.',
      description: 'Insert a book.',
      operationId: 'save_book',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/saveBook',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Book added',
          content: {},
        },
      },
    },
  },
  '/books/{bookId}': {
    get: {
      summary: 'Get a book.',
      description: 'Get a book.',
      operationId: 'find_book',
      responses: {
        200: {
          description: '',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/findBook',
              },
            },
          },
        },
      },
    },
  },
  '/books/{bookId}/availability': {
    get: {
      summary: 'Retrieve book availability.',
      description: 'Retrieve book availability.',
      operationId: 'book_availability',
      responses: {
        200: {
          description: '',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/bookAvailability',
              },
            },
          },
        },
      },
    },
  },
  '/orders': {
    post: {
      summary: 'Order placement.',
      description: 'Incoming orders cause the stock quantity to decrease.',
      operationId: 'place_order',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/placeOrder',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Order placed',
          content: {},
        },
      },
    },
  },
  '/deliveries': {
    post: {
      summary: 'Delivery recording.',
      description: 'Deliveries increase the stock.',
      operationId: 'record_delivery',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/recordDelivery',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Delivery recorded',
          content: {},
        },
      },
    },
  },
  '/webhooks': {
    post: {
      summary: 'Webhook registration.',
      description:
        'Webhooks are the mechanism through which it is possible to subscribe to notifications regarding books that go out of stock.',
      operationId: 'register_webhook',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/registerWebHook',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Webhook registered',
          content: {},
        },
      },
    },
  },
}

const mergeMissingOperationDocs = async (): Promise<void> => {
  const content = await readFile(outputFile, 'utf-8')
  const spec = JSON.parse(content) as {
    paths?: Record<
      string,
      Record<
        string,
        {
          summary?: string
          description?: string
          operationId?: string
          requestBody?: {
            required: boolean
            content: Record<string, { schema: { $ref: string } }>
          }
          responses?: Record<string, unknown>
        }
      >
    >
  }

  for (const [path, methods] of Object.entries(requiredOperationDocs)) {
    for (const [method, requiredDoc] of Object.entries(methods)) {
      const op = spec.paths?.[path]?.[method]
      if (op === undefined) continue

      op.summary = requiredDoc.summary
      op.description = requiredDoc.description
      op.operationId = requiredDoc.operationId
      op.requestBody = requiredDoc.requestBody

      op.responses = {
        ...(op.responses ?? {}),
        ...(requiredDoc.responses ?? {}),
        403: op.responses?.['403'] ?? requiredErrorResponses[403],
        404: op.responses?.['404'] ?? requiredErrorResponses[404],
        500: op.responses?.['500'] ?? requiredErrorResponses[500],
      }
    }
  }

  await writeFile(outputFile, `${JSON.stringify(spec, null, 2)}\n`, 'utf-8')
}

const main = async (): Promise<void> => {
  await swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc)
  await mergeMissingOperationDocs()
}

main()
