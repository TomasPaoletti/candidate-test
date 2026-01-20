export interface SearchResult {
  content: string;
  courseId: string;
  score: number;
  metadata?: {
    pageNumber?: number;
    section?: string;
  };
}
