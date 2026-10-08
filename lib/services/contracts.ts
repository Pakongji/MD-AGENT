export interface SalesService {
  getMetrics(): Promise<unknown[]>;
}

export interface InventoryService {
  getInventory(): Promise<unknown[]>;
  createPurchaseOrder(inventoryId: string, quantity: number): Promise<void>;
}

export interface TrendService {
  getKeywordTrend(): Promise<unknown[]>;
  getSearchVolume(): Promise<unknown[]>;
  getDemographics(): Promise<unknown[]>;
  getRelatedKeywords(): Promise<unknown[]>;
}

export interface NewsService {
  getRecommendedArticles(): Promise<unknown[]>;
}

export interface CompetitorService {
  getEvents(): Promise<unknown[]>;
}

export interface CalendarService {
  getEvents(): Promise<unknown[]>;
}

export interface AIService {
  planTasks(input: string): Promise<unknown>;
  answer(question: string, page: string): Promise<unknown>;
}
