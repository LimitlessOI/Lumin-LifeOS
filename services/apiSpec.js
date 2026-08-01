/**
 * SYNOPSIS: Provides API specification for the kids-os platform.
 * @ssot docs/products/kids-os/PRODUCT_HOME.md
 */
export async function getAPIEndpoints(deps, payload) {
    const { pool, logger } = deps; // pool and logger are available but not used in this specific spec function
    // The payload is not directly used for generating the static API specification
    // but the function signature must match the expected service pattern.

    try {
        // This function is intended to return a static API specification
        // and does not require database interaction for its primary purpose.
        // The structure below defines the API endpoints for kids-os.
        return {
            endpoints: [
                {
                    path: '/api/spec/kids-os/children',
                    method: 'GET',
                    description: 'Retrieve a list of children associated with the parent user.',
                    response: {
                        200: {
                            description: 'A list of children.',
                            body: [
                                {
                                    id: 'string (UUID)',
                                    parent_user_id: 'string (UUID)',
                                    grade_level: 'string',
                                    learning_style: 'string',
                                    engagement_profile: 'string',
                                    interests: 'string[]',
                                    flags: 'string[]',
                                    welfare: 'string',
                                    created_at: 'string (ISO 8601)',
                                    updated_at: 'string (ISO 8601)'
                                }
                            ]
                        },
                        400: {
                            description: 'Invalid request format or missing parent_user_id (if applicable).'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/children',
                    method: 'POST',
                    description: 'Create a new child entry for the parent user.',
                    request: {
                        body: {
                            parent_user_id: 'string (UUID)',
                            grade_level: 'string',
                            learning_style: 'string',
                            engagement_profile: 'string',
                            interests: 'string[]',
                            flags: 'string[]',
                            welfare: 'string'
                        }
                    },
                    response: {
                        201: {
                            description: 'Child entry created successfully.',
                            body: {
                                id: 'string (UUID)',
                                parent_user_id: 'string (UUID)',
                                grade_level: 'string',
                                learning_style: 'string',
                                engagement_profile: 'string',
                                interests: 'string[]',
                                flags: 'string[]',
                                welfare: 'string',
                                created_at: 'string (ISO 8601)',
                                updated_at: 'string (ISO 8601)'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/children/{id}',
                    method: 'GET',
                    description: 'Retrieve a specific child by ID.',
                    parameters: {
                        id: 'string (UUID)'
                    },
                    response: {
                        200: {
                            description: 'Details of the child.',
                            body: {
                                id: 'string (UUID)',
                                parent_user_id: 'string (UUID)',
                                grade_level: 'string',
                                learning_style: 'string',
                                engagement_profile: 'string',
                                interests: 'string[]',
                                flags: 'string[]',
                                welfare: 'string',
                                created_at: 'string (ISO 8601)',
                                updated_at: 'string (ISO 8601)'
                            }
                        },
                        404: {
                            description: 'Child not found or not accessible by the current user.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/children/{id}',
                    method: 'PUT',
                    description: 'Update an existing child entry.',
                    parameters: {
                        id: 'string (UUID)'
                    },
                    request: {
                        body: {
                            grade_level: 'string (optional)',
                            learning_style: 'string (optional)',
                            engagement_profile: 'string (optional)',
                            interests: 'string[] (optional)',
                            flags: 'string[] (optional)',
                            welfare: 'string (optional)'
                        }
                    },
                    response: {
                        200: {
                            description: 'Child updated successfully.',
                            body: {
                                id: 'string (UUID)',
                                parent_user_id: 'string (UUID)',
                                grade_level: 'string',
                                learning_style: 'string',
                                engagement_profile: 'string',
                                interests: 'string[]',
                                flags: 'string[]',
                                welfare: 'string',
                                created_at: 'string (ISO 8601)',
                                updated_at: 'string (ISO 8601)'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        404: {
                            description: 'Child not found or not accessible by the current user.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/children/{id}',
                    method: 'DELETE',
                    description: 'Delete a child entry.',
                    parameters: {
                        id: 'string (UUID)'
                    },
                    response: {
                        204: {
                            description: 'Child entry deleted successfully.'
                        },
                        404: {
                            description: 'Child not found or not accessible by the current user.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/wins',
                    method: 'POST',
                    description: 'Log a win for a child.',
                    request: {
                        body: {
                            child_id: 'string (UUID)',
                            domain: 'string (e.g., math, music, social, creative)',
                            math: 'boolean (optional)',
                            music: 'boolean (optional)',
                            social: 'boolean (optional)',
                            creative: 'boolean (optional)',
                            etc: 'string (optional)', // For other domains
                            evidence: 'string (optional)',
                            logged_by: 'string (e.g., parent, teacher, AI)',
                            teacher: 'string (optional)',
                            parent: 'string (optional)'
                        }
                    },
                    response: {
                        201: {
                            description: 'Win logged successfully.',
                            body: {
                                id: 'string (UUID)',
                                child_id: 'string (UUID)',
                                domain: 'string',
                                math: 'boolean',
                                music: 'boolean',
                                social: 'boolean',
                                creative: 'boolean',
                                etc: 'string',
                                evidence: 'string',
                                logged_by: 'string',
                                teacher: 'string',
                                parent: 'string'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/wins/{child_id}',
                    method: 'GET',
                    description: 'Retrieve wins for a specific child.',
                    parameters: {
                        child_id: 'string (UUID)'
                    },
                    response: {
                        200: {
                            description: 'A list of wins for the child.',
                            body: [
                                {
                                    id: 'string (UUID)',
                                    child_id: 'string (UUID)',
                                    domain: 'string',
                                    math: 'boolean',
                                    music: 'boolean',
                                    social: 'boolean',
                                    creative: 'boolean',
                                    etc: 'string',
                                    evidence: 'string',
                                    logged_by: 'string',
                                    teacher: 'string',
                                    parent: 'string'
                                }
                            ]
                        },
                        404: {
                            description: 'Child not found or no wins recorded.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/learning-profiles/{child_id}',
                    method: 'GET',
                    description: 'Retrieve the current learning profile for a specific child.',
                    parameters: {
                        child_id: 'string (UUID)'
                    },
                    response: {
                        200: {
                            description: 'The current learning profile of the child.',
                            body: {
                                id: 'string (UUID)',
                                child_id: 'string (UUID)',
                                love_of_learning_score: 'number',
                                the: 'string', // This column name seems incomplete/vague in schema. Using as-is.
                                confidence_baseline: 'number',
                                growth_edge: 'string',
                                ai_synthesis: 'string',
                                is_current: 'boolean',
                                created_at: 'string (ISO 8601)'
                            }
                        },
                        404: {
                            description: 'Child not found or no current learning profile.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/learning-profiles',
                    method: 'POST',
                    description: 'Create a new learning profile for a child.',
                    request: {
                        body: {
                            child_id: 'string (UUID)',
                            love_of_learning_score: 'number',
                            the: 'string',
                            confidence_baseline: 'number',
                            growth_edge: 'string',
                            ai_synthesis: 'string',
                            is_current: 'boolean'
                        }
                    },
                    response: {
                        201: {
                            description: 'Learning profile created successfully.',
                            body: {
                                id: 'string (UUID)',
                                child_id: 'string (UUID)',
                                love_of_learning_score: 'number',
                                the: 'string',
                                confidence_baseline: 'number',
                                growth_edge: 'string',
                                ai_synthesis: 'string',
                                is_current: 'boolean',
                                created_at: 'string (ISO 8601)'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/sessions',
                    method: 'POST',
                    description: 'Log a session for a child.',
                    request: {
                        body: {
                            child_id: 'string (UUID)',
                            session_type: 'string',
                            domain: 'string',
                            duration_minutes: 'number',
                            engagement_level: 'string',
                            notes: 'string (optional)',
                            started_at: 'string (ISO 8601)'
                        }
                    },
                    response: {
                        201: {
                            description: 'Session logged successfully.',
                            body: {
                                id: 'string (UUID)',
                                child_id: 'string (UUID)',
                                session_type: 'string',
                                domain: 'string',
                                duration_minutes: 'number',
                                engagement_level: 'string',
                                notes: 'string',
                                started_at: 'string (ISO 8601)',
                                ended_at: 'string (ISO 8601)'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/sessions/{child_id}',
                    method: 'GET',
                    description: 'Retrieve sessions for a specific child.',
                    parameters: {
                        child_id: 'string (UUID)'
                    },
                    response: {
                        200: {
                            description: 'A list of sessions for the child.',
                            body: [
                                {
                                    id: 'string (UUID)',
                                    child_id: 'string (UUID)',
                                    session_type: 'string',
                                    domain: 'string',
                                    duration_minutes: 'number',
                                    engagement_level: 'string',
                                    notes: 'string',
                                    started_at: 'string (ISO 8601)',
                                    ended_at: 'string (ISO 8601)'
                                }
                            ]
                        },
                        404: {
                            description: 'Child not found or no sessions recorded.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/integrity-log',
                    method: 'POST',
                    description: 'Log an integrity action for a child.',
                    request: {
                        body: {
                            child_id: 'string (UUID)',
                            action_type: 'string',
                            points: 'number',
                            description: 'string (optional)',
                            logged_by: 'string (e.g., parent, teacher, AI)',
                            occurred_at: 'string (ISO 8601)'
                        }
                    },
                    response: {
                        201: {
                            description: 'Integrity action logged successfully.',
                            body: {
                                id: 'string (UUID)',
                                child_id: 'string (UUID)',
                                action_type: 'string',
                                points: 'number',
                                description: 'string',
                                logged_by: 'string',
                                occurred_at: 'string (ISO 8601)'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/integrity-log/{child_id}',
                    method: 'GET',
                    description: 'Retrieve integrity log entries for a specific child.',
                    parameters: {
                        child_id: 'string (UUID)'
                    },
                    response: {
                        200: {
                            description: 'A list of integrity log entries for the child.',
                            body: [
                                {
                                    id: 'string (UUID)',
                                    child_id: 'string (UUID)',
                                    action_type: 'string',
                                    points: 'number',
                                    description: 'string',
                                    logged_by: 'string',
                                    occurred_at: 'string (ISO 8601)'
                                }
                            ]
                        },
                        404: {
                            description: 'Child not found or no integrity log entries.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/welfare-flags',
                    method: 'POST',
                    description: 'Create a new welfare flag for a child.',
                    request: {
                        body: {
                            child_id: 'string (UUID)',
                            flag_type: 'string',
                            severity: 'string (e.g., low, medium, high)',
                            evidence: 'string (optional)',
                            routed_to: 'string (optional)'
                        }
                    },
                    response: {
                        201: {
                            description: 'Welfare flag created successfully.',
                            body: {
                                id: 'string (UUID)',
                                child_id: 'string (UUID)',
                                flag_type: 'string',
                                severity: 'string',
                                evidence: 'string',
                                resolved: 'boolean',
                                routed_to: 'string',
                                resolved_at: 'string (ISO 8601) (nullable)'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/welfare-flags/{child_id}',
                    method: 'GET',
                    description: 'Retrieve welfare flags for a specific child.',
                    parameters: {
                        child_id: 'string (UUID)'
                    },
                    response: {
                        200: {
                            description: 'A list of welfare flags for the child.',
                            body: [
                                {
                                    id: 'string (UUID)',
                                    child_id: 'string (UUID)',
                                    flag_type: 'string',
                                    severity: 'string',
                                    evidence: 'string',
                                    resolved: 'boolean',
                                    routed_to: 'string',
                                    resolved_at: 'string (ISO 8601) (nullable)'
                                }
                            ]
                        },
                        404: {
                            description: 'Child not found or no welfare flags.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/welfare-flags/{id}',
                    method: 'PUT',
                    description: 'Update an existing welfare flag (e.g., resolve it).',
                    parameters: {
                        id: 'string (UUID)'
                    },
                    request: {
                        body: {
                            resolved: 'boolean (optional)',
                            routed_to: 'string (optional)'
                        }
                    },
                    response: {
                        200: {
                            description: 'Welfare flag updated successfully.',
                            body: {
                                id: 'string (UUID)',
                                child_id: 'string (UUID)',
                                flag_type: 'string',
                                severity: 'string',
                                evidence: 'string',
                                resolved: 'boolean',
                                routed_to: 'string',
                                resolved_at: 'string (ISO 8601) (nullable)'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        404: {
                            description: 'Welfare flag not found or not accessible.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/future-projections',
                    method: 'POST',
                    description: 'Create a new future projection for a child.',
                    request: {
                        body: {
                            child_id: 'string (UUID)',
                            domain: 'string',
                            horizon_days: 'number',
                            commitment_level: 'string',
                            projection: 'string',
                            narrative: 'string (optional)'
                        }
                    },
                    response: {
                        201: {
                            description: 'Future projection created successfully.',
                            body: {
                                id: 'string (UUID)',
                                child_id: 'string (UUID)',
                                domain: 'string',
                                horizon_days: 'number',
                                commitment_level: 'string',
                                projection: 'string',
                                narrative: 'string',
                                projected: 'string (ISO 8601)'
                            }
                        },
                        400: {
                            description: 'Invalid input data.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                },
                {
                    path: '/api/spec/kids-os/future-projections/{child_id}',
                    method: 'GET',
                    description: 'Retrieve future projections for a specific child.',
                    parameters: {
                        child_id: 'string (UUID)'
                    },
                    response: {
                        200: {
                            description: 'A list of future projections for the child.',
                            body: [
                                {
                                    id: 'string (UUID)',
                                    child_id: 'string (UUID)',
                                    domain: 'string',
                                    horizon_days: 'number',
                                    commitment_level: 'string',
                                    projection: 'string',
                                    narrative: 'string',
                                    projected: 'string (ISO 8601)'
                                }
                            ]
                        },
                        404: {
                            description: 'Child not found or no future projections.'
                        },
                        401: {
                            description: 'Unauthorized access.'
                        }
                    }
                }
            ]
        };
    } catch (error) {
        logger.error({ error }, 'Error generating API specification for kids-os');
        throw new Error('Failed to retrieve API specification');
    }
}