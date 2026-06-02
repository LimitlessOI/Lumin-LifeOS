# Command Center V2 Blueprint Proof: g905-100 - Initial Command Definition & Registration

This proof addresses the foundational step of defining a `Command` entity within the Command Center V2 system and establishing a mechanism for its registration. This is a prerequisite for any command execution or management functionality.

---

### Blueprint Note: Initial Command Definition & Registration

1.  **Exact missing implementation or proof gap:**
    The core data model for a `Command` entity is not yet defined or persisted. There is no API endpoint or service layer to register new command definitions within the system. This gap prevents the system from knowing what commands are available to be executed or managed.

2.  **Smallest safe build slice to close it:**
    Implement the `Command` data model and create a basic API endpoint (`POST /commands`) to allow for the registration of new command definitions. This slice focuses solely on the *definition* and *persistence* of commands, without involving their execution.

3.  **Exact safe-scope files to touch first:**
    *   `migrations/001_create_commands_table.js`: Database migration to create the `commands` table.
    *   `src/models/command.js`: Mongoose/Sequelize/ORM model definition for the `Command` entity.
    *   `src/services/commandService.js`: Service