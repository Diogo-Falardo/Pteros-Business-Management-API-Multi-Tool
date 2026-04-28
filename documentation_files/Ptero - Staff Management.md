# Ptero Staff Management Overview

In Pteros, the concept of **Staff Management** replaces traditional "User Management" to better reflect the business context and the roles users play within each ptero (business entity).

## Why "Staff Management"?

Every user in the system is created with the intention of either:

- Creating a new ptero (becoming an owner), or
- Joining an existing ptero (becoming part of its staff).

As a result, all users are inherently staff members of at least one ptero. This approach emphasizes that users are not just generic accounts, but active participants in one or more business entities, each with specific roles and permissions.

---

## How Staff Management Works

**Staff Members:**  
Any user who is part of a ptero is considered a staff member. This includes owners, managers, and viewers.

**Roles and Permissions:**  
Each staff member is assigned a role (such as Owner, Staff Manager, Product Manager, or Viewer). Roles define what actions a staff member can perform within the ptero.

**Role Configuration:**  
Roles and their permissions can be configured only by the ptero owner or by staff members who have been granted the necessary permissions by the owner (e.g., a Staff Manager).

**Default Roles:**  
The system provides default roles like "Owner" (full control), "Viewer" (no permissions), and "Staff Manager" (can manage roles and permissions). Additional custom roles can be created as needed.

---

## Key Points

- Users are always associated with a business context—they are staff, not just generic users.
- Staff management allows for fine-grained control over what each member can do within a ptero.
- Only those with the appropriate permissions (typically the owner or a delegated manager) can modify roles and permissions.

---

## Summary

The shift from "User Management" to "Staff Management" reflects the reality that every user is a staff member of a business entity, with roles and permissions tailored to their responsibilities within that context.

---

## Users

- Users can be created and deleted.
- Users can log in.

## User and Ptero Interaction

- Users can create pteros and automatically become the owner.
- Only the current owner can transfer ownership of a ptero.
- Pteros can be deleted by their owner.
- The only way to join a ptero is via an invite link, which assigns the "Viewer" role (no permissions).

## Ptero Staff Actions

A staff member with the appropriate role and permissions can:

- View the list of other staff members in the same ptero.
- Add new members to the staff list.
- Create new roles.
- Add or remove permissions from a role.
- Update the ptero.

## Permissions

Permissions define actions that users can perform:

1. Update ptero information
2. Add ptero staff members
3. Remove ptero staff members
4. Create new ptero roles
5. Delete ptero roles
6. Update ptero role permissions
7. Add Pre Defined Roles

## Invite Links

- When a user joins via an invite link, they are automatically added as a staff member with the "Viewer" role.
- The "Viewer" role has no permissions:
  - Cannot perform any actions within the ptero.
  - Cannot be deleted.

## List of Pre-defined roles

Staff - Manager : {

1. Create New Ptero Roles
2. Add Pre Defined Roles
3. Update ptero role permission
4. Delete ptero roles
5. Add Ptero Staff Member
6. Remove Ptero Staff Member
   }
