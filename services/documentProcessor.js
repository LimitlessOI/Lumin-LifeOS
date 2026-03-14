/**
 * Document Processor — extracts text from PDF buffers via pdf-parse and
 * tokenizes/stems the result using the natural NLP library.
 *
 * Dependencies: pdf-parse, natural (NlpManager)
 * Exports: DocumentProcessor (class via module.exports)
 */
const pdfParse = require('pdf-parse');
const { NlpManager } = require('natural');

class DocumentProcessor {
  constructor() {
    this.nlpManager = new NlpManager({ languages: ['en'] });
  }

  async processDocument(buffer) {
    try {
      const text = await pdfParse(buffer);
      return this.analyzeText(text.text);
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error('Document processing failed');
    }
  }

  analyzeText(text) {
    // Example NLP analysis
    const tokens = this.nlpManager.tokenizeAndStem(text);
    // Further NLP processing can be added here
    return { tokens };
  }
}

module.exports = DocumentProcessor;