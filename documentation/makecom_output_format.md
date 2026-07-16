<!-- SYNOPSIS: Markdown doc — Makecom Output Format. -->

{
  "scenarioId": "abc123",
  "name": "Sample Scenario",
  "description": "This is a sample Make.com scenario.",
  "modules": [
    {
      "moduleId": "mod001",
      "moduleName": "HTTP Request",
      "moduleType": "HTTP",
      "parameters": {
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    }
  ],
  "connections": [
    {
      "sourceModuleId": "mod001",
      "targetModuleId": "mod002",
      "connectionType": "direct"
    }
  ]
}
