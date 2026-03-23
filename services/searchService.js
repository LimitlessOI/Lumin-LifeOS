/**
 * Search Service — provides a rate-limited, safety-filtered web search against
 * DuckDuckGo (or a configurable SEARCH_API_URL), blocking queries that match
 * sensitive patterns (passwords, keys, SQL destructive ops, etc.).
 *
 * Dependencies: axios, crypto, process.env.SEARCH_API_URL, process.env.SEARCH_DAILY_LIMIT
 * Exports: SearchService (class), default singleton instance
 * @ssot docs/projects/AMENDMENT_15_BUSINESS_TOOLS.md
 */
import axios from "axios";
import crypto from "crypto";

const DEFAULT_DAILY_LIMIT = Number(process.env.SEARCH_DAILY_LIMIT || "100");

const BLOCKED_PATTERNS = [
  /passw(or)?d/i,
  /credit.?card/i,
  /ssn|social.?security/i,
  /private.?key/i,
  /api.?key/i,
  /\.env/i,
  /<[^>]*>/,
  /script|javascript/i,
  /delete|drop|truncate/i,
  /config/i,
  /admin/i,
];

class SearchService {
  constructor() {
    this.baseUrl = process.env.SEARCH_API_URL || "https://api.duckduckgo.com/";
    this.searchHistory = [];
    this.dailyLimit = DEFAULT_DAILY_LIMIT;
  }

  isSafeQuery(query) {
    if (typeof query !== "string") return false;
    const matches = BLOCKED_PATTERNS.filter((pattern) => pattern.test(query));
    if (matches.length > 0) {
      console.log("SEARCH BLOCKED:", query, matches.map((r) => r.source));
    }
    return matches.length === 0;
  }

  async safeSearch(query, context, requester) {
    if (!this.isSafeQuery(query)) {
      throw new Error("Query contains unsafe content");
    }

    if (this.getTodaySearches() >= this.dailyLimit) {
      throw new Error("Daily search limit reached");
    }

    const searchId = crypto.randomBytes(16).toString("hex");
    const entry = {
      id: searchId,
      query,
      context,
      requester,
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    this.searchHistory.push(entry);

    try {
      const results = await this.performSearch(query);
      entry.status = "completed";
      entry.resultCount = results.length;
      return {
        searchId,
        query,
        results,
        timestamp: new Date().toISOString(),
        remainingSearches: this.dailyLimit - this.getTodaySearches(),
      };
    } catch (error) {
      entry.status = "failed";
      entry.error = error.message;
      throw error;
    }
  }

  async performSearch(query) {
    const enabled =
      Object.prototype.hasOwnProperty.call(process.env, "SEARCH_ENABLED")
        ? process.env.SEARCH_ENABLED !== "false"
        : true;
    if (!enabled) {
      throw new Error("SEARCH_DISABLED");
    }

    const response = await axios.get(this.baseUrl, {
      params: {
        q: query,
        format: "json",
        no_html: 1,
        no_redirect: 1,
        skip_disambig: 1,
      },
      timeout: Number(process.env.SEARCH_TIMEOUT || "10000"),
    });
    return this.sanitizeResults(response.data);
  }

  sanitizeResults(data) {
    const results = [];
    if (data.AbstractText) {
      results.push({
        type: "abstract",
        content: this.sanitizeText(data.AbstractText),
        source: "DuckDuckGo",
      });
    }

    if (Array.isArray(data.Results)) {
      data.Results.slice(0, 5).forEach((result) => {
        if (!result || typeof result.Text !== "string") return;
        results.push({
          type: "result",
          content: this.sanitizeText(result.Text),
          source: result.FirstURL || "DuckDuckGo",
          link: result.FirstURL || null,
        });
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 5).forEach((topic) => {
        const text =
          typeof topic.Text === "string"
            ? topic.Text
            : typeof topic.Result === "string"
            ? topic.Result
            : typeof topic.Name === "string"
            ? topic.Name
            : null;
        if (!text) return;

        results.push({
          type: "related_topic",
          content: this.sanitizeText(text),
          source: topic.FirstURL || "DuckDuckGo",
          link: topic.FirstURL || null,
        });
      });
    }

    return results.slice(0, 10);
  }

  sanitizeText(text) {
    return String(text || "")
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .trim();
  }

  getTodaySearches() {
    const today = new Date().toISOString().split("T")[0];
    return this.searchHistory.filter(
      (entry) => entry.timestamp.startsWith(today) && entry.status === "completed"
    ).length;
  }

  getSearchHistory() {
    return [...this.searchHistory].reverse();
  }

  clearHistory() {
    this.searchHistory = [];
  }
}

export default new SearchService();
