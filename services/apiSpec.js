/*
- SYNOPSIS: Service module — ApiSpec.
 */
export const getApiSpec = () => {
    return {
        endpoints: [
            {
                path: '/artists',
                method: 'GET',
                description: 'Retrieve a list of artists',
                response: {
                    200: {
                        description: 'A list of artists',
                        body: [
                            {
                                id: 'string',
                                name: 'string',
                                genre: 'string'
                            }
                        ]
                    }
                }
            },
            {
                path: '/artists',
                method: 'POST',
                description: 'Create a new artist',
                request: {
                    body: {
                        name: 'string',
                        genre: 'string'
                    }
                },
                response: {
                    201: {
                        description: 'Artist created successfully',
                        body: {
                            id: 'string',
                            name: 'string',
                            genre: 'string'
                        }
                    }
                }
            },
            {
                path: '/artists/{id}',
                method: 'GET',
                description: 'Retrieve a specific artist by ID',
                parameters: {
                    id: 'string'
                },
                response: {
                    200: {
                        description: 'Details of the artist',
                        body: {
                            id: 'string',
                            name: 'string',
                            genre: 'string'
                        }
                    }
                }
            },
            {
                path: '/artists/{id}',
                method: 'PUT',
                description: 'Update an existing artist',
                parameters: {
                    id: 'string'
                },
                request: {
                    body: {
                        name: 'string',
                        genre: 'string'
                    }
                },
                response: {
                    200: {
                        description: 'Artist updated successfully',
                        body: {
                            id: 'string',
                            name: 'string',
                            genre: 'string'
                        }
                    }
                }
            },
            {
                path: '/artists/{id}',
                method: 'DELETE',
                description: 'Delete an artist',
                parameters: {
                    id: 'string'
                },
                response: {
                    204: {
                        description: 'Artist deleted successfully'
                    }
                }
            }
        ]
    };
};