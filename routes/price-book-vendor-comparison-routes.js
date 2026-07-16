/**
 * SYNOPSIS: HTTP route module — Price Book Vendor Comparison Routes.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
[
  {
    "op": "replace",
    "path": "/router/0/path",
    "value": "/vendor-comparison/enhanced"
  },
  {
    "op": "add",
    "path": "/router/0/params/0",
    "value": "comparisonType"
  },
  {
    "op": "replace",
    "path": "/router/0/handler/0/body/0/declarations/0/init/properties/0",
    "value": "includeHistoricalData"
  },
  {
    "op": "replace",
    "path": "/router/0/handler/0/body/0/declarations/0/init/properties/1",
    "value": "comparisonFilters"
  },
  {
    "op": "replace",
    "path": "/router/0/handler/0/body/2/test/right/value",
    "value": "true"
  },
  {
    "op": "replace",
    "path": "/router/0/handler/0/body/2/consequent/body/0/declarations/0/init/callee/property/name",
    "value": "withHistoricalData"
  },
  {
    "op": "replace",
    "path": "/router/0/handler/0/body/3/test/right/value",
    "value": "comparisonFilters"
  },
  {
    "op": "replace",
    "path": "/router/0/handler/0/body/3/consequent/body/0/declarations/0/init/callee/property/name",
    "value": "applyComparisonFilters"
  },
  {
    "op": "replace",
    "path": "/function/getVendorComparisonData/body/0/return/elements/0/properties/1/key/name",
    "value": "currentPrice"
  },
  {
    "op": "add",
    "path": "/function/getVendorComparisonData/body/0/return/elements/0/properties/2",
    "value": {
      "type": "Property",
      "key": {
        "type": "Identifier",
        "name": "historicalPrices"
      },
      "value": {
        "type": "ArrayExpression",
        "elements": [
          {
            "type": "Literal",
            "value": 90
          },
          {
            "type": "Literal",
            "value": 95
          }
        ]
      },
      "kind": "init"
    }
  },
  {
    "op": "replace",
    "path": "/function/getVendorComparisonData/body/0/return/elements/1/properties/1/key/name",
    "value": "currentPrice"
  },
  {
    "op": "add",
    "path": "/function/getVendorComparisonData/body/0/return/elements/1/properties/2",
    "value": {
      "type": "Property",
      "key": {
        "type": "Identifier",
        "name": "historicalPrices"
      },
      "value": {
        "type": "ArrayExpression",
        "elements": [
          {
            "type": "Literal",
            "value": 140
          },
          {
            "type": "Literal",
            "value": 145
          }
        ]
      },
      "kind": "init"
    }
  },
  {
    "op": "replace",
    "path": "/function/getExplanationForItem/name",
    "value": "withHistoricalData"
  },
  {
    "op": "replace",
    "path": "/function/getExplanationForItem/body/0/return/template/expressions/0/property/name",
    "value": "currentPrice"
  },
  {
    "op": "add",
    "path": "/function/getExplanationForItem/body/0/return/template/expressions/1",
    "value": {
      "type": "MemberExpression",
      "object": {
        "type": "Identifier",
        "name": "item"
      },
      "property": {
        "type": "Identifier",
        "name": "historicalPrices"
      },
      "computed": false,
      "optional": false
    }
  },
  {
    "op": "replace",
    "path": "/function/matchesCriteria/name",
    "value": "applyComparisonFilters"
  },
  {
    "op": "replace",
    "path": "/function/matchesCriteria/params/1",
    "value": "filters"
  },
  {
    "op": "replace",
    "path": "/function/matchesCriteria/body/0/return/left/property/name",
    "value": "currentPrice"
  },
  {
    "op": "replace",
    "path": "/function/matchesCriteria/body/0/return/right/name",
    "value": "filters"
  },
  {
    "op": "add",
    "path": "/exports/0",
    "value": {
      "type": "ExportNamedDeclaration",
      "declaration": {
        "type": "FunctionDeclaration",
        "id": {
          "type": "Identifier",
          "name": "registerPriceBookVendorComparisonRoutes"
        },
        "params": [
          {
            "type": "Identifier",
            "name": "router"
          }
        ],
        "body": {
          "type": "BlockStatement",
          "body": [
            {
              "type": "ExpressionStatement",
              "expression": {
                "type": "CallExpression",
                "callee": {
                  "type": "MemberExpression",
                  "object": {
                    "type": "Identifier",
                    "name": "router"
                  },
                  "property": {
                    "type": "Identifier",
                    "name": "get"
                  },
                  "computed": false,
                  "optional": false
                },
                "arguments": [
                  {
                    "type": "Literal",
                    "value": "/vendor-comparison/enhanced"
                  },
                  {
                    "type": "ArrowFunctionExpression",
                    "id": null,
                    "params": [
                      {
                        "type": "Identifier",
                        "name": "req"
                      },
                      {
                        "type": "Identifier",
                        "name": "res"
                      }
                    ],
                    "body": {
                      "type": "BlockStatement",
                      "body": [
                        {
                          "type": "VariableDeclaration",
                          "declarations": [
                            {
                              "type": "VariableDeclarator",
                              "id": {
                                "type": "ObjectPattern",
                                "properties": [
                                  {
                                    "type": "Property",
                                    "key": {
                                      "type": "Identifier",
                                      "name": "includeHistoricalData"
                                    },
                                    "value": {
                                      "type": "Identifier",
                                      "name": "includeHistoricalData"
                                    },
                                    "computed": false,
                                    "kind": "init",
                                    "method": false
                                  },
                                  {
                                    "type": "Property",
                                    "key": {
                                      "type": "Identifier",
                                      "name": "comparisonFilters"
                                    },
                                    "value": {
                                      "type": "Identifier",
                                      "name": "comparisonFilters"
                                    },
                                    "computed": false,
                                    "kind": "init",
                                    "method": false
                                  }
                                ]
                              },
                              "init": {
                                "type": "MemberExpression",
                                "object": {
                                  "type": "Identifier",
                                  "name": "req"
                                },
                                "property": {
                                  "type": "Identifier",
                                  "name": "query"
                                },
                                "computed": false,
                                "optional": false
                              }
                            }
                          ],
                          "kind": "const"
                        },
                        {
                          "type": "VariableDeclaration",
                          "declarations": [
                            {
                              "type": "VariableDeclarator",
                              "id": {
                                "type": "Identifier",
                                "name": "data"
                              },
                              "init": {
                                "type": "CallExpression",
                                "callee": {
                                  "type": "Identifier",
                                  "name": "getVendorComparisonData"
                                },
                                "arguments": [],
                                "optional": false
                              }
                            }
                          ],
                          "kind": "let"
                        },
                        {
                          "type": "IfStatement",
                          "test": {
                            "type": "BinaryExpression",
                            "operator": "===",
                            "left": {
                              "type": "Identifier",
                              "name": "includeHistoricalData"
                            },
                            "right": {
                              "type": "Literal",
                              "value": "true"
                            }
                          },
                          "consequent": {
                            "type": "BlockStatement",
                            "body": [
                              {
                                "type": "VariableDeclaration",
                                "declarations": [
                                  {
                                    "type": "VariableDeclarator",
                                    "id": {
                                      "type": "Identifier",
                                      "name": "data"
                                    },
                                    "init": {
                                      "type": "CallExpression",
                                      "callee": {
                                        "type": "MemberExpression",
                                        "object": {
                                          "type": "Identifier",
                                          "name": "data"
                                        },
                                        "property": {
                                          "type": "Identifier",
                                          "name": "withHistoricalData"
                                        },
                                        "computed": false,
                                        "optional": false
                                      },
                                      "arguments": [],
                                      "optional": false
                                    }
                                  }
                                ],
                                "kind": "let"
                              }
                            ]
                          },
                          "alternate": null
                        },
                        {
                          "type": "IfStatement",
                          "test": {
                            "type": "Identifier",
                            "name": "comparisonFilters"
                          },
                          "consequent": {
                            "type": "BlockStatement",
                            "body": [
                              {
                                "type": "VariableDeclaration",
                                "declarations": [
                                  {
                                    "type": "VariableDeclarator",
                                    "id": {
                                      "type": "Identifier",
                                      "name": "data"
                                    },
                                    "init": {
                                      "type": "CallExpression",
                                      "callee": {
                                        "type": "MemberExpression",
                                        "object": {
                                          "type": "Identifier",
                                          "name": "data"
                                        },
                                        "property": {
                                          "type": "Identifier",
                                          "name": "applyComparisonFilters"
                                        },
                                        "computed": false,
                                        "optional": false
                                      },
                                      "arguments": [
                                        {
                                          "type": "Identifier",
                                          "name": "comparisonFilters"
                                        }
                                      ],
                                      "optional": false
                                    }
                                  }
                                ],
                                "kind": "let"
                              }
                            ]
                          },
                          "alternate": null
                        },
                        {
                          "type": "ExpressionStatement",
                          "expression": {
                            "type": "CallExpression",
                            "callee": {
                              "type": "MemberExpression",
                              "object": {
                                "type": "Identifier",
                                "name": "res"
                              },
                              "property": {
                                "type": "Identifier",
                                "name": "json"
                              },
                              "computed": false,
                              "optional": false
                            },
                            "arguments": [
                              {
                                "type": "Identifier",
                                "name": "data"
                              }
                            ],
                            "optional": false
                          }
                        }
                      ]
                    },
                    "generator": false,
                    "async": false
                  }
                ],
                "optional": false
              }
            }
          ]
        },
        "generator": false,
        "async": false
      }
    }
  }
]
