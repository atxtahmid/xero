import axios from "axios";

import config from "../config/index.js";
import logger from "./logger.js";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESULTS = 5;

class TavilyService {
  /**
   * Whether web search is even possible right now — TAVILY_API_KEY is
   * optional in config/index.ts, so a guild can have `searchEnabled: true`
   * in the DB while the bot process itself has no key configured. Callers
   * should check this before assuming search will actually run.
   */
  isConfigured(): boolean {
    return !!config.tavily.apiKey;
  }

  /**
   * Runs a web search. Returns an empty array (never throws) on any
   * failure — a failed search should degrade the AI response to "no
   * extra context", not break the whole /chat command.
   */
  async search(query: string): Promise<TavilySearchResult[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await axios.post(
        TAVILY_ENDPOINT,
        {
          api_key: config.tavily.apiKey,
          query,
          search_depth: "basic",
          max_results: MAX_RESULTS,
          include_answer: false,
        },
        {
          timeout: REQUEST_TIMEOUT_MS,
        },
      );

      const results = response.data?.results;

      if (!Array.isArray(results)) {
        return [];
      }

      return results
        .filter(
          (r: unknown): r is TavilySearchResult =>
            !!r &&
            typeof (r as TavilySearchResult).title === "string" &&
            typeof (r as TavilySearchResult).url === "string" &&
            typeof (r as TavilySearchResult).content === "string",
        )
        .slice(0, MAX_RESULTS);
    } catch (error) {
      logger.warn("[Tavily Service] Search failed", error);
      return [];
    }
  }
}

export default new TavilyService();
