# News Article Validation Plan

Add validation checks to ensure all news articles are real and not hallucinations before displaying them to users.

## Problem Statement

Currently, news articles are generated as mock data with fake URLs (example.com). We need to add validation to:
- Verify articles are from legitimate sources
- Check that URLs are real and accessible
- Validate article content is not AI-generated hallucinations
- Filter out fake or suspicious articles

## Changes Required

### 1. Create News Article Validation Module

**File: `server/news-validator.ts` (New)**

Create a validation module that checks:
- **URL Validation**: Verify URL is accessible and returns valid content
- **Domain Legitimacy**: Check domain is from known news sources (whitelist approach)
- **Content Validation**: 
  - Verify article actually exists at URL
  - Check for placeholder/generic content
  - Validate title matches content
  - Check for minimum content length
- **Metadata Validation**:
  - Verify published date is reasonable
  - Check source is legitimate
  - Validate article structure (title, description, etc.)
- **Hallucination Detection**:
  - Check for common AI-generated patterns
  - Verify content is not generic/placeholder text
  - Cross-reference with known fact-checking services (optional)

**Validation Function:**
```typescript
interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100 confidence score
  reasons: string[]; // Reasons for validation failure/success
  warnings: string[]; // Non-blocking warnings
}

async function validateNewsArticle(article: NewsArticle): Promise<ValidationResult>
```

### 2. Update News Article Schema

**File: `shared/schema.ts`**

Add validation fields to news article schema:
- `isValidated`: boolean - whether article passed validation
- `validationScore`: number - confidence score (0-100)
- `validationTimestamp`: string - when validation was performed
- `validationWarnings`: string[] - optional warnings

### 3. Update Storage Method

**File: `server/storage.ts`**

Modify `getNewsArticles()` to:
- Validate each article before adding to results
- Filter out articles that fail validation (isValid: false)
- Store validation results with articles
- Log validation failures for debugging

### 4. Add Domain Whitelist

**File: `server/news-validator.ts`**

Create whitelist of legitimate news domains:
- Major financial news sources (Bloomberg, Reuters, WSJ, CNBC, etc.)
- Trusted general news sources
- Allow configuration via environment variables

### 5. URL Accessibility Check

**File: `server/news-validator.ts`**

Implement URL validation:
- Attempt HEAD request to verify URL exists
- Check HTTP status code (200-299 = valid)
- Verify content-type is HTML/text
- Handle redirects appropriately
- Timeout after reasonable period (5-10 seconds)

### 6. Content Validation

**File: `server/news-validator.ts`**

Implement content checks:
- Fetch article page (if URL is accessible)
- Parse HTML to extract actual content
- Verify title appears in page content
- Check for minimum content length (e.g., 200 characters)
- Look for common placeholder patterns
- Verify published date is present and reasonable

### 7. Hallucination Detection

**File: `server/news-validator.ts`**

Implement basic hallucination detection:
- Check for generic/placeholder text patterns
- Verify article content is specific (not too generic)
- Check for AI-generated content patterns (optional, using heuristics)
- Validate source credibility

## Implementation Strategy

### Phase 1: Basic Validation (Required)
- URL accessibility check
- Domain whitelist validation
- Basic content structure validation
- Filter invalid articles

### Phase 2: Enhanced Validation (Recommended)
- Content fetching and parsing
- Title-content consistency check
- Published date validation
- Source credibility check

### Phase 3: Advanced Validation (Optional)
- Integration with fact-checking APIs
- Cross-reference with news aggregators
- Content similarity checks to detect duplicates
- AI-generated content detection

## Validation Rules

**Must Pass (Blocking):**
1. URL must be from whitelisted domain OR pass domain legitimacy check
2. URL must be accessible (HTTP 200-299)
3. Article must have valid title, description, and URL
4. Published date must be valid and reasonable

**Should Pass (Warning):**
1. Content should be substantial (not placeholder)
2. Title should match article content
3. Source should be recognizable/legitimate
4. Article should not be duplicate of existing articles

## Files to Create/Modify

1. **`server/news-validator.ts`** - New validation module
2. **`shared/schema.ts`** - Add validation fields to NewsArticle schema
3. **`server/storage.ts`** - Update getNewsArticles() to validate articles
4. **`.env`** - Optional: Add NEWS_DOMAIN_WHITELIST configuration

## Error Handling

- If validation fails for an article, log the reason but don't crash
- Return only validated articles to frontend
- Optionally show validation status in UI (badge/indicator)
- Cache validation results to avoid re-validating same articles

## Performance Considerations

- Validation should be async and non-blocking
- Cache validation results (e.g., 1 hour TTL)
- Use timeouts for URL checks (5-10 seconds max)
- Batch validation where possible
- Consider background validation job for better UX

## Testing

- Test with real news URLs
- Test with fake/example.com URLs (should be filtered)
- Test with inaccessible URLs
- Test with articles from non-whitelisted domains
- Test validation caching
- Test timeout handling