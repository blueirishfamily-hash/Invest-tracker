import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThumbsUp, ThumbsDown, Minus, ExternalLink, Calendar, Newspaper } from "lucide-react";
import type { NewsArticle, Holding } from "@shared/schema";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSentimentIcon(sentiment: "positive" | "negative" | "neutral") {
  switch (sentiment) {
    case "positive":
      return <ThumbsUp className="h-4 w-4" />;
    case "negative":
      return <ThumbsDown className="h-4 w-4" />;
    default:
      return <Minus className="h-4 w-4" />;
  }
}

function getSentimentColor(sentiment: "positive" | "negative" | "neutral") {
  switch (sentiment) {
    case "positive":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "negative":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid={`news-card-${article.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2 line-clamp-2">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors flex items-center gap-2"
              >
                {article.title}
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(article.publishedAt)}</span>
              <span>•</span>
              <span>{article.source}</span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`flex items-center gap-1 ${getSentimentColor(article.sentiment)}`}
          >
            {getSentimentIcon(article.sentiment)}
            <span className="capitalize">{article.sentiment}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {article.description}
        </p>
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Relevance</p>
            <p className="text-sm">{article.relevanceSummary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {article.relatedTicker && (
              <Badge variant="secondary" className="font-mono">
                {article.relatedTicker}
              </Badge>
            )}
            {article.relatedSector && (
              <Badge variant="outline">{article.relatedSector}</Badge>
            )}
            {article.relatedIndustry && (
              <Badge variant="outline">{article.relatedIndustry}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-2" />
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
          <div className="h-20 w-full bg-muted animate-pulse rounded mt-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function NewsTab() {
  const [selectedCompany, setSelectedCompany] = useState<string>("All");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("All");
  const [selectedSector, setSelectedSector] = useState<string>("All");

  const { data: holdings } = useQuery<Holding[]>({
    queryKey: ["/api/holdings"],
  });

  const { data: articles, isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news"],
  });

  // Extract unique companies, industries, and sectors from holdings
  const companies = useMemo(() => {
    if (!holdings) return [];
    const unique = new Set(holdings.map(h => h.ticker).filter(Boolean));
    return Array.from(unique).sort();
  }, [holdings]);

  const industries = useMemo(() => {
    if (!holdings) return [];
    const unique = new Set(holdings.map(h => h.industry).filter(Boolean));
    return Array.from(unique).sort();
  }, [holdings]);

  const sectors = useMemo(() => {
    if (!holdings) return [];
    const unique = new Set(holdings.map(h => h.sector).filter(Boolean));
    return Array.from(unique).sort();
  }, [holdings]);

  // Filter articles based on selected filters
  const filteredArticles = useMemo(() => {
    if (!articles) return [];

    return articles.filter((article) => {
      const companyMatch = selectedCompany === "All" || article.relatedTicker === selectedCompany;
      const industryMatch = selectedIndustry === "All" || article.relatedIndustry === selectedIndustry;
      const sectorMatch = selectedSector === "All" || article.relatedSector === selectedSector;

      return companyMatch && industryMatch && sectorMatch;
    });
  }, [articles, selectedCompany, selectedIndustry, selectedSector]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="company-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Company:
          </label>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger id="company-select" className="w-[150px]">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {companies.map((ticker) => (
                <SelectItem key={ticker} value={ticker}>
                  {ticker}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="industry-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Industry:
          </label>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger id="industry-select" className="w-[200px]">
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sector-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Sector:
          </label>
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger id="sector-select" className="w-[180px]">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="news-loading">
          {[...Array(6)].map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredArticles && filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="news-grid">
          {filteredArticles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <Card data-testid="news-empty">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Newspaper className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No News Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              News articles will appear here once they become available for your portfolio holdings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
