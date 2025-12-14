```markdown
# Consultant API Documentation

## Endpoints

### GET /consultants
- **Description**: Retrieve a list of consultants.
- **Response**: 
  - `200 OK`: Returns an array of consultants.

### POST /consultants
- **Description**: Create a new consultant.
- **Parameters**:
  - `name` (string): Consultant's name.
  - `email` (string): Consultant's email.
  - `phone` (string, optional): Consultant's phone number.
  - `expertise` (string, optional): Area of expertise.
- **Response**:
  - `201 Created`: Returns the created consultant data.
  - `400 Bad Request`: Validation errors.

### PUT /consultants/:id
- **Description**: Update an existing consultant.
- **Parameters**:
  - `id` (int): Consultant ID.
  - Other parameters as in POST.
- **Response**:
  - `200 OK`: Returns the updated consultant data.
  - `404 Not Found`: Consultant not found.

### DELETE /consultants/:id
- **Description**: Delete a consultant.
- **Parameters**:
  - `id` (int): Consultant ID.
- **Response**:
  - `204 No Content`: Successfully deleted.
  - `404 Not Found`: Consultant not found.
```