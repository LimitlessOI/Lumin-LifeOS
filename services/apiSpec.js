/**
 * SYNOPSIS: Service module — ApiSpec.
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */
export const getApiSpec = () => {
    return {
        endpoints: [
            {
                path: '/kids',
                method: 'GET',
                description: 'Retrieve a list of kids',
                response: {
                    200: {
                        description: 'A list of kids',
                        body: [
                            {
                                id: 'string',
                                name: 'string',
                                age: 'number'
                            }
                        ]
                    },
                    400: {
                        description: 'Invalid request format'
                    }
                }
            },
            {
                path: '/kids',
                method: 'POST',
                description: 'Create a new kid entry',
                request: {
                    body: {
                        name: 'string',
                        age: 'number'
                    }
                },
                response: {
                    201: {
                        description: 'Kid entry created successfully',
                        body: {
                            id: 'string',
                            name: 'string',
                            age: 'number'
                        }
                    },
                    400: {
                        description: 'Invalid input data'
                    }
                }
            },
            {
                path: '/kids/{id}',
                method: 'GET',
                description: 'Retrieve a specific kid by ID',
                parameters: {
                    id: 'string'
                },
                response: {
                    200: {
                        description: 'Details of the kid',
                        body: {
                            id: 'string',
                            name: 'string',
                            age: 'number'
                        }
                    },
                    404: {
                        description: 'Kid not found'
                    }
                }
            },
            {
                path: '/kids/{id}',
                method: 'PUT',
                description: 'Update an existing kid',
                parameters: {
                    id: 'string'
                },
                request: {
                    body: {
                        name: 'string',
                        age: 'number'
                    }
                },
                response: {
                    200: {
                        description: 'Kid updated successfully',
                        body: {
                            id: 'string',
                            name: 'string',
                            age: 'number'
                        }
                    },
                    400: {
                        description: 'Invalid input data'
                    },
                    404: {
                        description: 'Kid not found'
                    }
                }
            },
            {
                path: '/kids/{id}',
                method: 'DELETE',
                description: 'Delete a kid entry',
                parameters: {
                    id: 'string'
                },
                response: {
                    204: {
                        description: 'Kid entry deleted successfully'
                    },
                    404: {
                        description: 'Kid not found'
                    }
                }
            }
        ]
    };
};

export { getApiSpec as getAPIEndpoints };
