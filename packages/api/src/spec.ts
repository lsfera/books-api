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
      saveWebHookMessage: {
        $type: 'out_of_stock',
        $book: {
          $id: '507f1f77bcf86cd799439011',
          $url: 'http://localhost:3001/books/507f1f77bcf86cd799439011',
        },
      },
      findWebHookMessages: {
        $messages: [
          {
            $type: 'out_of_stock',
            $book: {
              $id: '507f1f77bcf86cd799439011',
              $url: 'http://localhost:3001/books/507f1f77bcf86cd799439011',
            },
            $receivedAt: '2026-03-05T16:00:00.000Z',
          },
        ],
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
            $id: '507f1f77bcf86cd799439011',
            $title: 'Types and Programming Languages',
            $isbn: '0262162091',
            $conditions: 'new',
            $authors: ['Benjamin C. Pierce'],
            $categories: ['programming', 'computer', 'science'],
          },
        ],
      },
      findBook: {
        $id: '507f1f77bcf86cd799439011',
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
      parameters?: Array<{
        name: string
        in: string
        required: boolean
        schema: { type: string }
        description?: string
      }>
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
      description:
        'List all books. Supports optional filtering by title, author, and isbn query params.',
      operationId: 'find_books',
      parameters: [
        {
          name: 'title',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filter books by title (case-insensitive contains).',
        },
        {
          name: 'author',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description:
            'Filter books by author name against the authors list (case-insensitive contains).',
        },
        {
          name: 'isbn',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Filter books by ISBN (case-insensitive contains).',
        },
      ],
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
  '/webhook-messages': {
    get: {
      summary: 'List webhook notification messages.',
      description: 'Returns the latest received webhook notification payloads.',
      operationId: 'find_webhook_messages',
      responses: {
        200: {
          description: '',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/findWebHookMessages',
              },
            },
          },
        },
      },
    },
    post: {
      summary: 'Receive webhook notification message.',
      description:
        'Receives webhook notification payloads and stores recent messages for inspection.',
      operationId: 'save_webhook_message',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/saveWebHookMessage',
            },
          },
        },
      },
      responses: {
        202: {
          description: 'Webhook message accepted',
          content: {},
        },
      },
    },
  },
  '/webhook-messages/stream': {
    get: {
      summary: 'Stream webhook notification messages.',
      description:
        'Streams newly received webhook notification payloads using Server-Sent Events (SSE).',
      operationId: 'stream_webhook_messages',
      responses: {
        200: {
          description: 'SSE stream opened',
          content: {
            'text/event-stream': {
              schema: {
                type: 'string',
              },
            },
          },
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
          parameters?: Array<{
            name: string
            in: string
            required: boolean
            schema: { type: string }
            description?: string
          }>
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
      op.parameters = requiredDoc.parameters
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
