## Folder (structure) Organization

/src
	/core
		/admin
		/middlewares
		/utils
	/modules
		/health
		/pteros
		/users
	/db
index.ts

# API Architecture

The API is built on the Bun runtime, a high-performance JavaScript environment compatible with the Node.js API.  
It utilizes Hono, a lightweight and fast web application framework.  
API documentation is generated using OpenAPI and Scalar.  
LogLayer is used for application logging.  
The database is PostgreSQL, with secure connections managed by Drizzle ORM.

---

## Middlewares

### error.ts

Exports a `catchError` function intended for use at the end of try-catch blocks.  
Parameters:

- `error`: The caught error.
- `logError`: For logging the error.
- `exception status`: Defaults to "500".
- `exception error message`: Defaults to "Internal Server Error".

### logger.ts

Handles the configuration of LogLayer.

### validators.ts

**Validator functions and their capabilities:**

- **validateUUID:**
  - Validates generic UUIDs.

- **validateEmail:**
  - Checks if an email is already in use.
  - Verifies if an email exists.

- **validatePtero:**
  - Checks if a user exists.
  - Checks if a ptero exists.
  - Verifies if a user is a staff member.
  - Validates if a user has the required permission.
