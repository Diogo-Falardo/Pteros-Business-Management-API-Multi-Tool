# Pteros — Business Management API Multi‑Tool

Pteros is a modular API designed to manage any type of business entity (“pteros”).  
A ptero can be a store, manufacturer, organization, workspace, or any structure that needs a unified management layer.

The goal is simple: provide a clean, scalable backend foundation for user management, inventory, operations, and internal tooling.

## Core Concepts

### Pteros

A “ptero” represents a business unit.  
Each ptero can have:

- users
- roles
- inventory
- operations
- custom modules

The system is flexible enough to support different business models without rewriting the backend.

### API‑First

##### **Api is fully documentend using Scalar and OpenApi**

Pteros exposes a consistent API for:

- authentication & user management: **(not yet implemented)**
  - My Recommendation to the day we implement:
    1. Use Clerk or 0Auth: **why?**
       - fast and easy
    2. Create our own authentication method using **jwt**
- role & permission control
- inventory management
- business operations
- custom extensions

## Tech Stack

- **Bun** — runtime
- **Hono** — API framework
- **Drizzle ORM** — schema & migrations
- **PostgreSQL** — database

## Status

Early development.  
Schema, migrations, and core API structure are being defined.

### Middlewares

#### Error

- **CatchError** Middleware is mainly used to catch try catch errors inside server methods.

#### Validators

- Generic Validators.
- **validatePtero** Middleware is used to validate any sort of ptero before executing server methods.

### User Management

#### Database Shema for user management

![alt text](/documentation_files/image.png)

#### New roles logic

##### There are two base roles: Owner and Viewer

1. Owner has all permissions - hiearchy of 1
2. Viewer has zero permissions - hiearchy of 0

Other roles created by ptero owners or staff members
Will **always start on two** and after it user can swith positions with another role

- Owner and viewer will never change

## License

MIT
