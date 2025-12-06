# 📚 Knowledge Base & File Upload System

## Overview

The Knowledge Base system allows you to upload files containing:
- **Business ideas** - All your revenue generation concepts
- **Context** - Background information about your business
- **Security plans** - Quantum-proof security strategies
- **Historical records** - How the system was created (without code chains)
- **Future thoughts** - Long-term vision and plans

The system automatically:
- **Indexes content** for fast search
- **Injects context** into AI prompts automatically
- **Categorizes files** for easy retrieval
- **Tracks business ideas** separately

## File Upload

### Endpoint
```
POST /api/v1/knowledge/upload
```

### Request Body
```json
{
  "filename": "my-business-ideas.txt",
  "content": "Full text content of the file...",
  "category": "business-ideas",
  "tags": ["revenue", "saas", "ai"],
  "description": "My top 20 business ideas for 2025",
  "businessIdea": true,
  "securityRelated": false,
  "historical": false
}
```

### Categories
- `business-ideas` - Revenue generation concepts
- `context` - General contextual information
- `security` - Security strategies
- `income-generation` - Ways to make money
- `future-thoughts` - Long-term vision
- `quantum-proof` - Quantum computer security

## Search Knowledge Base

### Endpoint
```
GET /api/v1/knowledge/search?q=revenue&category=business-ideas&limit=10
```

### Query Parameters
- `q` - Search query (required)
- `category` - Filter by category
- `tags` - Comma-separated tags
- `businessIdeasOnly` - Only business ideas
- `limit` - Max results (default: 50)

## Get Business Ideas

### Endpoint
```
GET /api/v1/knowledge/business-ideas
```

Returns all files marked as business ideas.

## Get Security Documents

### Endpoint
```
GET /api/v1/knowledge/security
```

Returns all security-related documents.

## Automatic Context Injection

When you make AI calls, the system automatically:
1. Searches knowledge base for relevant context
2. Injects top 5 matching files into the prompt
3. Provides full context without you explaining

This means:
- ✅ No need to repeat business ideas
- ✅ System understands your full vision
- ✅ Context-aware responses
- ✅ Historical knowledge preserved

## File Cleanup

### Endpoint
```
POST /api/v1/system/analyze-cleanup
```

Analyzes codebase and identifies:
- **Unused files** - Not imported by any entry point
- **Redundant files** - Duplicates, old versions, backups
- **Single-letter files** - Likely scratch/test files

### Response
```json
{
  "ok": true,
  "unused": [
    {
      "file": "old_file.js",
      "reason": "Not imported by any entry point"
    }
  ],
  "redundant": [
    {
      "file": "file_old.js",
      "reason": "Old/backup version",
      "keep": "file.js"
    }
  ],
  "summary": {
    "totalUnused": 15,
    "totalRedundant": 8,
    "canDelete": 23
  }
}
```

## Storage Structure

Files are stored in:
```
knowledge/
  ├── business-ideas/
  ├── context/
  ├── historical/
  ├── security/
  ├── income-generation/
  ├── future-thoughts/
  ├── quantum-proof/
  └── uploads/
```

## Database Schema

### knowledge_base_files
- `file_id` - Unique identifier
- `filename` - Original filename
- `file_path` - Storage path
- `category` - File category
- `tags` - JSON array of tags
- `description` - File description
- `business_idea` - Boolean flag
- `security_related` - Boolean flag
- `historical` - Boolean flag
- `keywords` - Extracted keywords
- `search_vector` - Full-text search index
- `created_at` - Upload timestamp
- `updated_at` - Last update

## Best Practices

1. **Upload business ideas separately** - Mark `businessIdea: true`
2. **Use descriptive tags** - Helps with search
3. **Add descriptions** - Makes files easier to find
4. **Keep historical records** - But remove code chains/blocks
5. **Upload security plans** - Mark `securityRelated: true`

## Example Usage

```javascript
// Upload business idea
const response = await fetch('/api/v1/knowledge/upload', {
  method: 'POST',
  headers: {
    'x-command-key': 'your-key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    filename: 'revenue-ideas-2025.md',
    content: '# My Business Ideas\n\n1. AI Cost Reduction Service...',
    category: 'business-ideas',
    tags: ['revenue', 'saas', 'ai'],
    description: 'Top revenue ideas for 2025',
    businessIdea: true,
  }),
});

// Search for context
const search = await fetch('/api/v1/knowledge/search?q=revenue&businessIdeasOnly=true', {
  headers: { 'x-command-key': 'your-key' },
});
```

## Integration with AI Calls

The system automatically injects relevant context into all AI prompts. You don't need to do anything - just upload your files and the system will use them!
