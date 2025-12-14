```markdown
# Clients API

## Endpoints

### GET /clients

Retrieve all clients.

**Response:**
- `200 OK`: An array of clients.

### POST /clients

Create a new client.

**Request Body:**
- `name` (string): Required.
- `email` (string): Required, must be a valid email.
- `phone` (string): Optional.

**Response:**
- `201 Created`: The newly created client.

### PUT /clients/:id

Update an existing client.

**Request Body:**
- `name` (string): Optional.
- `email` (string): Optional, must be a valid email.
- `phone` (string): Optional.

**Response:**
- `200 OK`: The updated client.

### DELETE /clients/:id

Delete a client.

**Response:**
- `204 No Content`: Successfully deleted.

## Example Requests and Responses

...

```