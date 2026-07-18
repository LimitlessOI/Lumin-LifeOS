/**
 * SYNOPSIS: services/detailedAPISpecification.js
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
// services/detailedAPISpecification.js

export const getDetailedAPISpecification = () => {
  return {
    title: "Music Talent Studio API",
    version: "1.0.0",
    endpoints: [
      {
        path: "/artists",
        method: "GET",
        description: "Retrieve a list of all artists",
        responses: {
          200: {
            description: "A list of artists",
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  genre: { type: "string" },
                  bio: { type: "string" }
                }
              }
            }
          }
        }
      },
      {
        path: "/artists/{id}",
        method: "GET",
        description: "Retrieve details of a specific artist",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "ID of the artist",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          200: {
            description: "Artist details",
            schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                genre: { type: "string" },
                bio: { type: "string" },
                albums: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      releaseDate: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        path: "/albums",
        method: "GET",
        description: "Retrieve a list of all albums",
        responses: {
          200: {
            description: "A list of albums",
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  artistId: { type: "string" },
                  releaseDate: { type: "string" }
                }
              }
            }
          }
        }
      },
      {
        path: "/albums/{id}",
        method: "GET",
        description: "Retrieve details of a specific album",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "ID of the album",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          200: {
            description: "Album details",
            schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                artistId: { type: "string" },
                releaseDate: { type: "string" },
                tracks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      duration: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]
  };
};
