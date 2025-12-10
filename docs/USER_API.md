# User API Documentation

## Endpoints

### POST /signup
Registers a new user.

- **Request Body:**
  - `username`: string, required
  - `password`: string, required
  - `email`: string, required

### POST /login
Authenticates a user.

- **Request Body:**
  - `username`: string, required
  - `password`: string, required

### GET /profile
Retrieves the user's profile. Requires authentication.

- **Headers:**
  - `Authorization`: Bearer token

## Examples

### Signup
```http
POST /signup
Content-Type: application/json

{
  "username": "exampleuser",
  "password": "securepassword",
  "email": "user@example.com"
}
```

### Login
```http
POST /login
Content-Type: application/json

{
  "username": "exampleuser",
  "password": "securepassword"
}
```

### Get Profile
```http
GET /profile
Authorization: Bearer <token>
```