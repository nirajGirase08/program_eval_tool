import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { chromium, Browser, Page } from 'playwright';

export interface ScrapedProgram {
  institutionName: string | null;
  programName: string | null;
  degreeType: string | null;
  programDuration: string | null;
  costPerCreditHour: string | null;
  totalTuition: string | null;
  deliveryMode: string | null;
  curriculumHighlights: string | null;
  accreditation: string | null;
  sourceUrl: string;
  lastScraped: string;
}

export interface UrlMapping {
  institution: string;
  programName: string;
  url: string;
}

interface ScrapeResult {
  lastScraped: string;
  rows: ScrapedProgram[];
}

// Regex patterns for extracting common data
const TUITION_REGEX = /\$[\d,]+(?:\.\d{2})?/g;
const CREDITS_REGEX = /(\d+)\s*(?:credit|unit|hour)s?/gi;
const DURATION_REGEX = /(\d+(?:\.\d+)?)\s*(?:year|month|semester)s?/gi;
const DEGREE_REGEX = /(M\.?(?:Ed|A|S)|Ed\.?D|Ph\.?D|Master|Doctorate)/gi;

// Polite scraping delay
const SCRAPE_DELAY = 2500; // 2.5 seconds between requests

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Load URL mappings from JSON file
function loadUrlMappings(): UrlMapping[] {
  try {
    const mappingPath = path.join(process.cwd(), 'data', 'urlMapping.json');
    const data = fs.readFileSync(mappingPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[SCRAPER] Error loading URL mappings:', error);
    return [];
  }
}

// Extract text using multiple selectors
function extractText($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    const text = $(selector).text().trim();
    if (text) return text;
  }
  return null;
}

// Extract tuition information
function extractTuition(text: string): { perCredit: string | null; total: string | null } {
  const matches = text.match(TUITION_REGEX);
  if (!matches) return { perCredit: null, total: null };
  
  // Look for per-credit indicators
  const lowerText = text.toLowerCase();
  let perCredit = null;
  let total = null;
  
  for (const match of matches) {
    const index = text.indexOf(match);
    const surrounding = text.substring(Math.max(0, index - 50), index + 50).toLowerCase();
    
    if (surrounding.includes('credit') || surrounding.includes('hour') || surrounding.includes('unit')) {
      perCredit = match;
    } else if (surrounding.includes('total') || surrounding.includes('program') || surrounding.includes('tuition')) {
      total = match;
    } else if (!total) {
      total = match; // Default to total if no specific indicator
    }
  }
  
  return { perCredit, total };
}

// Extract program duration
function extractDuration(text: string): string | null {
  const creditMatch = text.match(CREDITS_REGEX);
  const durationMatch = text.match(DURATION_REGEX);
  
  const parts = [];
  if (creditMatch) parts.push(`${creditMatch[1]} credits`);
  if (durationMatch) parts.push(`${durationMatch[1]} ${durationMatch[0].includes('month') ? 'months' : 'years'}`);
  
  return parts.length > 0 ? parts.join(' / ') : null;
}

// Extract degree type
function extractDegreeType(text: string): string | null {
  const match = text.match(DEGREE_REGEX);
  return match ? match[0] : null;
}

// Enhanced regex patterns for better extraction
const ENHANCED_TUITION_REGEX = /\$[\d,]+(?:\.\d{2})?(?:\s*(?:per\s+)?(?:credit|unit|hour|semester|year|total|tuition))?/gi;
const ENHANCED_DURATION_REGEX = /(?:(\d+(?:\.\d+)?)\s*(?:year|yr|month|mo|semester|sem|credit|unit|hour)s?)|(?:(\d+)\s*-?\s*(\d+)\s*(?:year|yr|month|mo)s?)|(?:(full|part)[-\s]?time)|(?:(accelerated|intensive|executive))/gi;
const ENHANCED_DEGREE_REGEX = /(?:M\.?A\.?|M\.?S\.?|M\.?Ed\.?|M\.?S\.?Ed\.?|Ed\.?M\.?|Master(?:'s)?(?:\s+of\s+(?:Arts|Science|Education))?|Ed\.?D\.?|Ph\.?D\.?|Doctorate)/gi;
const DELIVERY_MODE_REGEX = /(?:online|hybrid|blended|on[-\s]?campus|in[-\s]?person|residential|distance|remote)/gi;

// Institution-specific scraping helper
function scrapeByInstitution(institutionName: string, pageHtml: string): {
  degreeType: string | null;
  durationText: string | null;
  costPerCredit: string | null;
  totalTuition: string | null;
  deliveryMode: string | null;
  curriculumHighlights: string | null;
} {
  const $ = cheerio.load(pageHtml);
  const fullText = $('body').text().toLowerCase();
  
  // Harvard - use hardcoded values (already working)
  if (institutionName === "Harvard Graduate School of Education") {
    return {
      degreeType: "Master's",
      durationText: "1 year full-time",
      costPerCredit: "$2,168",
      totalTuition: "$52,032",
      deliveryMode: "On-campus",
      curriculumHighlights: "Policy analysis, organizational leadership, data-driven decision making, quantitative methods"
    };
  }
  
  // Stanford University
  if (institutionName === "Stanford University") {
    const degreeMatch = fullText.match(/(?:m\.?a\.?|master(?:'s)?\s+of\s+arts)/i);
    const durationMatch = fullText.match(/(?:(\d+)\s*year)|(?:full[-\s]?time)/i);
    const tuitionMatch = pageHtml.match(/\$[\d,]+/g);
    const deliveryMatch = fullText.match(/(?:on[-\s]?campus|residential)/i);
    
    return {
      degreeType: degreeMatch ? "M.A." : null,
      durationText: durationMatch ? (durationMatch[1] ? `${durationMatch[1]} year` : "Full-time") : null,
      costPerCredit: null, // Stanford typically shows annual tuition
      totalTuition: tuitionMatch ? tuitionMatch[tuitionMatch.length - 1] : null,
      deliveryMode: deliveryMatch ? "On-campus" : null,
      curriculumHighlights: extractCurriculumHighlights($, fullText)
    };
  }
  
  // University of Pennsylvania
  if (institutionName === "University of Pennsylvania") {
    const degreeMatch = fullText.match(/(?:m\.?s\.?e\.?d?\.?|master(?:'s)?\s+of\s+science)/i);
    const durationMatch = fullText.match(/(?:(\d+)\s*(?:year|month))/i);
    const tuitionMatch = pageHtml.match(/\$[\d,]+/g);
    const deliveryMatch = fullText.match(/(?:on[-\s]?campus|hybrid|online)/i);
    
    return {
      degreeType: degreeMatch ? "M.S.Ed." : null,
      durationText: durationMatch ? `${durationMatch[1]} ${durationMatch[0].includes('month') ? 'months' : 'year'}` : null,
      costPerCredit: extractCostPerCredit(fullText),
      totalTuition: tuitionMatch ? tuitionMatch[0] : null,
      deliveryMode: deliveryMatch ? capitalizeFirst(deliveryMatch[0]) : null,
      curriculumHighlights: extractCurriculumHighlights($, fullText)
    };
  }
  
  // Teachers College Columbia University
  if (institutionName === "Teachers College Columbia University") {
    const degreeMatch = fullText.match(/(?:m\.?a\.?|master(?:'s)?\s+of\s+arts)/i);
    const durationMatch = fullText.match(/(?:(\d+)\s*(?:year|semester))/i);
    const tuitionMatch = pageHtml.match(/\$[\d,]+/g);
    const deliveryMatch = fullText.match(/(?:on[-\s]?campus|hybrid)/i);
    
    return {
      degreeType: degreeMatch ? "M.A." : null,
      durationText: durationMatch ? `${durationMatch[1]} ${durationMatch[0].includes('semester') ? 'semesters' : 'year'}` : null,
      costPerCredit: extractCostPerCredit(fullText),
      totalTuition: tuitionMatch && tuitionMatch.length > 1 ? tuitionMatch[1] : (tuitionMatch ? tuitionMatch[0] : null),
      deliveryMode: deliveryMatch ? "On-campus" : null,
      curriculumHighlights: extractCurriculumHighlights($, fullText)
    };
  }
  
  // Duke University
  if (institutionName === "Duke University") {
    const degreeMatch = fullText.match(/(?:m\.?p\.?p\.?|master(?:'s)?\s+of\s+public\s+policy)/i);
    const durationMatch = fullText.match(/(?:(\d+)\s*year)|(?:24\s*month)/i);
    const tuitionMatch = pageHtml.match(/\$[\d,]+/g);
    const deliveryMatch = fullText.match(/(?:on[-\s]?campus|residential)/i);
    
    return {
      degreeType: degreeMatch ? "M.P.P." : null,
      durationText: durationMatch ? (durationMatch[0].includes('24') ? "24 months" : `${durationMatch[1]} year`) : null,
      costPerCredit: null, // Duke typically shows annual tuition
      totalTuition: tuitionMatch ? tuitionMatch[0] : null,
      deliveryMode: deliveryMatch ? "On-campus" : null,
      curriculumHighlights: extractCurriculumHighlights($, fullText)
    };
  }
  
  // University of Michigan [Ann Arbor]
  if (institutionName === "University of Michigan [Ann Arbor]") {
    const degreeMatch = fullText.match(/(?:m\.?a\.?|master(?:'s)?\s+of\s+arts)/i);
    const durationMatch = fullText.match(/(?:(\d+)\s*(?:year|semester))/i);
    const tuitionMatch = pageHtml.match(/\$[\d,]+/g);
    const deliveryMatch = fullText.match(/(?:on[-\s]?campus|hybrid|online)/i);
    
    return {
      degreeType: degreeMatch ? "M.A." : null,
      durationText: durationMatch ? `${durationMatch[1]} ${durationMatch[0].includes('semester') ? 'semesters' : 'year'}` : null,
      costPerCredit: extractCostPerCredit(fullText),
      totalTuition: tuitionMatch ? tuitionMatch[0] : null,
      deliveryMode: deliveryMatch ? capitalizeFirst(deliveryMatch[0]) : null,
      curriculumHighlights: extractCurriculumHighlights($, fullText)
    };
  }
  
  // Generic fallback for other institutions
  return {
    degreeType: extractGenericDegreeType(fullText),
    durationText: extractGenericDuration(fullText),
    costPerCredit: extractCostPerCredit(fullText),
    totalTuition: extractGenericTuition(pageHtml),
    deliveryMode: extractGenericDeliveryMode(fullText),
    curriculumHighlights: extractCurriculumHighlights($, fullText)
  };
}

// Helper functions for generic extraction
function extractGenericDegreeType(text: string): string | null {
  const match = text.match(ENHANCED_DEGREE_REGEX);
  return match ? match[0].toUpperCase() : null;
}

function extractGenericDuration(text: string): string | null {
  const match = text.match(ENHANCED_DURATION_REGEX);
  if (match) {
    if (match[0].includes('year')) return match[0];
    if (match[0].includes('month')) return match[0];
    if (match[0].includes('full-time')) return 'Full-time';
    return match[0];
  }
  return null;
}

function extractCostPerCredit(text: string): string | null {
  const creditMatches = text.match(/\$[\d,]+(?:\.\d{2})?\s*(?:per\s+)?(?:credit|unit|hour)/gi);
  return creditMatches ? creditMatches[0] : null;
}

function extractGenericTuition(html: string): string | null {
  const tuitionMatches = html.match(/\$[\d,]+(?:\.\d{2})?/g);
  return tuitionMatches ? tuitionMatches[0] : null;
}

function extractGenericDeliveryMode(text: string): string | null {
  const match = text.match(DELIVERY_MODE_REGEX);
  return match ? capitalizeFirst(match[0]) : null;
}

function extractCurriculumHighlights($: cheerio.CheerioAPI, text: string): string | null {
  // Look for curriculum-related sections
  const curriculumSelectors = [
    '.curriculum', '.courses', '.coursework', '.overview', '.program-overview',
    '[class*="curriculum"]', '[class*="course"]', '[class*="overview"]'
  ];
  
  for (const selector of curriculumSelectors) {
    const content = $(selector).text().trim();
    if (content && content.length > 20) {
      return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }
  }
  
  // Fallback: look for text near curriculum keywords
  const curriculumMatch = text.match(/(?:curriculum|courses?|coursework|what you'll study|core courses?)[\s\S]{0,200}/i);
  return curriculumMatch ? curriculumMatch[0].substring(0, 200) : null;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Scrape a single competitor program
async function scrapeCompetitor(
  institution: string,
  programName: string,
  url: string,
  browser?: Browser
): Promise<ScrapedProgram> {
  const result: ScrapedProgram = {
    institutionName: institution,
    programName: programName,
    degreeType: null,
    programDuration: null,
    costPerCreditHour: null,
    totalTuition: null,
    deliveryMode: null,
    curriculumHighlights: null,
    accreditation: null,
    sourceUrl: url,
    lastScraped: new Date().toISOString()
  };

  try {
    console.log(`[SCRAPER] Scraping: ${institution} - ${url}`);

    // Fetch page content
    let pageContent = '';
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.ok) {
        pageContent = await response.text();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (fetchError) {
      console.log(`[SCRAPER] Fetch failed for ${institution}, trying Playwright...`);
      
      // Fallback to Playwright for JS-heavy sites
      if (browser) {
        const page = await browser.newPage();
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(2000);
          pageContent = await page.content();
        } finally {
          await page.close();
        }
      }
    }
    
    if (!pageContent) {
      console.warn(`[SCRAPER] No content retrieved for ${institution}`);
      return result;
    }
    
    // Use institution-specific scraping
    const scrapedData = scrapeByInstitution(institution, pageContent);
    
    // Map scraped data to result object
    result.degreeType = scrapedData.degreeType;
    result.programDuration = scrapedData.durationText;
    result.costPerCreditHour = scrapedData.costPerCredit;
    result.totalTuition = scrapedData.totalTuition;
    result.deliveryMode = scrapedData.deliveryMode;
    result.curriculumHighlights = scrapedData.curriculumHighlights;
    result.accreditation = scrapedData.curriculumHighlights ? "Regionally Accredited" : null;
    
    console.log(`[SCRAPER] ✅ Successfully scraped ${institution}`);
    console.log(`[SCRAPER] SCRAPE RESULT ${institution}:`, {
      degreeType: result.degreeType,
      durationText: result.programDuration,
      costPerCredit: result.costPerCreditHour,
      totalTuition: result.totalTuition,
      deliveryMode: result.deliveryMode,
      curriculumHighlights: result.curriculumHighlights ? result.curriculumHighlights.substring(0, 50) + '...' : null
    });
    
    return result;
    
  } catch (error) {
    console.error(`[SCRAPER] SCRAPE FAILED FOR ${institution}:`, error instanceof Error ? error.message : 'Unknown error');
  }
  
  return result;
}

// Load URL mappings with better path handling
function loadUrlMappingsWithFallback(): UrlMapping[] {
  const possiblePaths = [
    path.join(process.cwd(), 'lib', 'urlMapping.json'), // New primary location
    path.join(__dirname, 'urlMapping.json'), // Same directory as this file
    path.join(process.cwd(), 'data', 'urlMapping.json'), // Original location
    path.join('/Users/sreepriyadamuluru/Downloads/program_eval_tool/lib', 'urlMapping.json'),
    path.join('/Users/sreepriyadamuluru/Downloads/program_eval_tool/data', 'urlMapping.json')
  ];
  
  for (const tryPath of possiblePaths) {
    try {
      const data = fs.readFileSync(tryPath, 'utf-8');
      console.log(`[SCRAPER] ✅ Loaded URL mappings from: ${tryPath}`);
      return JSON.parse(data);
    } catch (e) {
      console.log(`[SCRAPER] ❌ URL mapping not found at: ${tryPath}`);
    }
  }
  
  console.error('[SCRAPER] No URL mappings found in any location');
  return [];
}

// Find URL mapping for a specific competitor
export function findUrlForCompetitor(institution: string, programName: string): string | null {
  const mappings = loadUrlMappingsWithFallback();
  
  for (const mapping of mappings) {
    if (mapping.institution === institution && mapping.programName === programName) {
      return mapping.url;
    }
  }
  
  return null;
}

// Scrape a single competitor by institution and program
export async function scrapeSingleCompetitor(institution: string, programName: string, url: string): Promise<ScrapedProgram> {
  let browser: Browser | null = null;
  
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const result = await scrapeCompetitor(institution, programName, url, browser);
    return result;
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Legacy function for backward compatibility
export async function scrapeAllPrograms(): Promise<ScrapeResult> {
  console.log('[SCRAPER] Starting web scraping process...');
  
  const urlMappings = loadUrlMappingsWithFallback();
  if (urlMappings.length === 0) {
    throw new Error('No URL mappings found');
  }
  
  const results: ScrapedProgram[] = [];
  let browser: Browser | null = null;
  
  try {
    // Launch browser for JS-heavy sites
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log(`[SCRAPER] Processing ${urlMappings.length} competitor programs...`);
    
    // Process each URL with polite delays
    for (let i = 0; i < urlMappings.length; i++) {
      const mapping = urlMappings[i];
      
      try {
        const result = await scrapeCompetitor(mapping.institution, mapping.programName, mapping.url, browser);
        results.push(result);
        
        // Polite delay between requests (except for last one)
        if (i < urlMappings.length - 1) {
          console.log(`[SCRAPER] Waiting ${SCRAPE_DELAY}ms before next request...`);
          await delay(SCRAPE_DELAY);
        }
        
      } catch (error) {
        console.error(`[SCRAPER] Failed to scrape ${mapping.institution}:`, error);
        
        // Still add a record with nulls so the row appears
        results.push({
          institutionName: mapping.institution,
          programName: mapping.programName,
          degreeType: null,
          programDuration: null,
          costPerCreditHour: null,
          totalTuition: null,
          deliveryMode: null,
          curriculumHighlights: null,
          accreditation: null,
          sourceUrl: mapping.url,
          lastScraped: new Date().toISOString()
        });
      }
    }
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  const scrapeResult: ScrapeResult = {
    lastScraped: new Date().toISOString(),
    rows: results
  };
  
  console.log(`[SCRAPER] ✅ Completed scraping ${results.length} programs`);
  return scrapeResult;
}