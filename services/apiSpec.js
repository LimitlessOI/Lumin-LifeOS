/**
 * SYNOPSIS: Service module — ApiSpec.
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */
[
    {
        "old_string": "export const getApiSpec = () => {",
        "new_string": "export const getApiSpec = () => {"
    },
    {
        "old_string": "endpoints: [",
        "new_string": "endpoints: [\n            {\n                path: '/kids',\n                method: 'GET',\n                description: 'Retrieve a list of kids',\n                response: {\n                    200: {\n                        description: 'A list of kids',\n                        body: [\n                            {\n                                id: 'string',\n                                name: 'string',\n                                age: 'number'\n                            }\n                        ]\n                    }\n                }\n            },\n            {\n                path: '/kids',\n                method: 'POST',\n                description: 'Create a new kid entry',\n                request: {\n                    body: {\n                        name: 'string',\n                        age: 'number'\n                    }\n                },\n                response: {\n                    201: {\n                        description: 'Kid entry created successfully',\n                        body: {\n                            id: 'string',\n                            name: 'string',\n                            age: 'number'\n                        }\n                    }\n                }\n            },\n            {\n                path: '/kids/{id}',\n                method: 'GET',\n                description: 'Retrieve a specific kid by ID',\n                parameters: {\n                    id: 'string'\n                },\n                response: {\n                    200: {\n                        description: 'Details of the kid',\n                        body: {\n                            id: 'string',\n                            name: 'string',\n                            age: 'number'\n                        }\n                    }\n                }\n            },\n            {\n                path: '/kids/{id}',\n                method: 'PUT',\n                description: 'Update an existing kid',\n                parameters: {\n                    id: 'string'\n                },\n                request: {\n                    body: {\n                        name: 'string',\n                        age: 'number'\n                    }\n                },\n                response: {\n                    200: {\n                        description: 'Kid updated successfully',\n                        body: {\n                            id: 'string',\n                            name: 'string',\n                            age: 'number'\n                        }\n                    }\n                }\n            },\n            {\n                path: '/kids/{id}',\n                method: 'DELETE',\n                description: 'Delete a kid entry',\n                parameters: {\n                    id: 'string'\n                },\n                response: {\n                    204: {\n                        description: 'Kid entry deleted successfully'\n                    }\n                }\n            }"
    },
    {
        "old_string": "};",
        "new_string": "};\n\nexport { getApiSpec as getAPIEndpoints };"
    }
]
