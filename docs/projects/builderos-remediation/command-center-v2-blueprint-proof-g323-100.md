# Blueprint Proof: Command Center V2 - Middleware Integration (G323-100)

This document serves as a proof-closing blueprint note for the Command Center V2 platform, specifically addressing the integration of Command Middleware.

---

## Blueprint Note: Middleware Integration

**1. Exact Missing Implementation or Proof Gap:**

The initial build slice for Command Center V2 established core interfaces, the `CommandBus`, and `CommandHandlerRegistry` but explicitly deferred the implementation and integration of `CommandMiddlewareStack` and `ICommandMiddleware` into the `CommandBus`'s dispatch mechanism. The gap is the functional implementation of the middleware stack and its seamless integration into the `CommandBus`'s command processing pipeline, allowing for pre- and post-handler execution logic.

**2. Smallest Safe Build Slice to Close It:**

Implement the `CommandMiddlewareStack` class and integrate it into the `CommandBus`. This slice focuses on:
*   Defining the `CommandMiddlewareStack` class with `use(middleware: ICommandMiddleware)` and `execute(command: ICommand, handler: ICommandHandler<ICommand, ICommandResult>): Promise<ICommandResult>` methods.
*   Modifying the `CommandBus` constructor to accept an instance of `CommandMiddlewareStack`.
*   Updating the `CommandBus.dispatch` method to wrap the `CommandHandler` execution with the `CommandMiddlewareStack.execute` method, ensuring middleware is applied.

**3. Exact Safe-Scope Files to Touch First:**

*   `src/core/command-bus/command-middleware-stack.ts` (New file: Implement `CommandMiddlewareStack` class and export `ICommandMiddlewareStack` if not already in `interfaces.ts`).
*   `src/core/command-bus/command-bus.ts` (Modify: Update constructor, `dispatch` method, and imports).
*   `src/core/command-bus/interfaces.ts` (Verify/Add: Ensure `ICommandMiddleware` and `ICommandMiddlewareStack` are correctly defined).
*   `src/core/command-bus/command-bus.test.ts` (New/Modify: Add unit tests for middleware integration).
*   `src/core/command-bus/command-middleware-stack.test.ts` (New: Add unit tests for `CommandMiddlewareStack` functionality).

**4. Verifier/Runtime Checks:**

*   **Unit Test (`command-middleware-stack.test.ts`):**
    *   Verify `CommandMiddlewareStack.use()` correctly adds middleware to the internal stack.
    *   Verify `CommandMiddlewareStack.execute()` invokes middleware in the correct order (FIFO) around a mock handler.
    *   Verify middleware can modify the command before handler execution.
    *   Verify middleware can modify the result after handler execution.
*   **Unit Test (`command-bus.test.ts`):**
    *   Instantiate `CommandBus` with a mock `CommandHandlerRegistry` and a mock `CommandMiddlewareStack`.
    *   Dispatch a command and assert that the `CommandMiddlewareStack.execute` method was called with the correct command and handler.
    *   Verify that a simple end-to-end test with a real handler and a mock middleware confirms middleware execution.
*   **Integration Test (e.g., `src/app/command-center.test.ts` or a dedicated integration test):**
    *   Set up a full `CommandBus` instance with a registered handler and at least one functional middleware (e.g., a logging middleware or a validation middleware).
    *   Dispatch a command and verify the observable side effects of the middleware (e.g., log output, modified command/result data).

**5. Stop Conditions if Runtime Truth Disagrees:**

*   `CommandMiddlewareStack.execute()` does not invoke middleware functions or invokes them out of order.
*   `CommandBus.dispatch()` does not call `CommandMiddlewareStack.execute()` or passes incorrect arguments.
*   Middleware functions are unable