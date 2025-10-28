import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ScrapedProgram } from './webScraper';

export interface InternalCompetitor {
  Program: string;
  cip_codes_used: string;
  Institution: string;
  app_percentile: string;
  admissibility_percentile: string;
  win_percentile: string;
  overall_percentile: string;
}

export interface MergedCompetitor extends InternalCompetitor {
  degreeType: string | null;
  programDuration: string | null;
  costPerCreditHour: string | null;
  totalTuition: string | null;
  deliveryMode: string | null;
  curriculumHighlights: string | null;
  accreditation: string | null;
  sourceUrl: string | null;
  lastScraped: string | null;
}

function loadInternalCsv(): InternalCompetitor[] {
  try {
    // Try multiple possible paths for the CSV file
    const possiblePaths = [
      path.join(process.cwd(), 'data', 'pilot_competitor_list.csv'),
      path.join('/Users/sreepriyadamuluru/Downloads/program_eval_tool/data', 'pilot_competitor_list.csv'),
      path.join(__dirname, '..', '..', 'data', 'pilot_competitor_list.csv')
    ];
    
    let csvPath = '';
    let csvContent = '';
    
    for (const tryPath of possiblePaths) {
      console.log('[MERGER] Trying CSV path:', tryPath);
      try {
        csvContent = fs.readFileSync(tryPath, 'utf-8');
        csvPath = tryPath;
        console.log('[MERGER] ✅ Found CSV at:', csvPath);
        break;
      } catch (e) {
        console.log('[MERGER] ❌ Not found at:', tryPath);
      }
    }
    
    if (!csvContent) {
      throw new Error('Could not find pilot_competitor_list.csv in any expected location');
    }
    
    console.log('[MERGER] CSV file loaded, size:', csvContent.length, 'chars');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log('[MERGER] Parsed CSV records:', records.length);
    const filteredRecords = records.filter((record: any) => record.Institution && record.Institution.trim());
    console.log('[MERGER] Filtered records with institutions:', filteredRecords.length);
    
    return filteredRecords;
  } catch (error) {
    console.error('[MERGER] Error loading internal CSV:', error);
    return [];
  }
}

function normalizeInstitutionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\[.*?\]/g, '') // Remove brackets like [Ann Arbor]
    .replace(/university/g, 'univ')
    .replace(/graduate school of education/g, 'gse')
    .replace(/teachers college/g, 'tc')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchingScrapedData(
  internalRow: InternalCompetitor, 
  scrapedData: ScrapedProgram[]
): ScrapedProgram | null {
  const normalizedInternal = normalizeInstitutionName(internalRow.Institution);
  
  for (const scraped of scrapedData) {
    if (!scraped.institutionName) continue;
    
    const normalizedScraped = normalizeInstitutionName(scraped.institutionName);
    
    // Check for exact match or partial match
    if (normalizedScraped === normalizedInternal || 
        normalizedInternal.includes(normalizedScraped) ||
        normalizedScraped.includes(normalizedInternal)) {
      
      // Also check program name similarity for better matching
      const internalProgram = internalRow.Program.toLowerCase();
      const scrapedProgram = (scraped.programName || '').toLowerCase();
      
      if (internalProgram.includes('education policy') && scrapedProgram.includes('education policy') ||
          internalProgram.includes('higher education') && scrapedProgram.includes('higher education') ||
          internalProgram === scrapedProgram) {
        return scraped;
      }
    }
  }
  
  return null;
}

export function getAllCompetitorsFromCsv(): InternalCompetitor[] {
  return loadInternalCsv();
}

export function mergeData(scrapedData: ScrapedProgram[]): MergedCompetitor[] {
  console.log('[MERGER] ==================== STARTING MERGE ====================');
  console.log('[MERGER] Starting data merge process...');
  
  const internalData = loadInternalCsv();
  console.log(`[MERGER] ✅ Loaded ${internalData.length} internal competitors from CSV`);
  console.log(`[MERGER] ✅ Received ${scrapedData.length} scraped programs`);
  
  if (internalData.length === 0) {
    console.error('[MERGER] ❌ NO INTERNAL DATA LOADED - this will result in empty results');
    return [];
  }
  
  const mergedResults: MergedCompetitor[] = [];
  
  // Process EVERY competitor from the internal CSV
  for (let i = 0; i < internalData.length; i++) {
    const internalRow = internalData[i];
    console.log(`[MERGER] Processing ${i + 1}/${internalData.length}: ${internalRow.Institution}`);
    
    const matchingScraped = findMatchingScrapedData(internalRow, scrapedData);
    
    const merged: MergedCompetitor = {
      // Internal data fields (from CSV)
      Program: internalRow.Program,
      cip_codes_used: internalRow.cip_codes_used,
      Institution: internalRow.Institution,
      app_percentile: internalRow.app_percentile,
      admissibility_percentile: internalRow.admissibility_percentile,
      win_percentile: internalRow.win_percentile,
      overall_percentile: internalRow.overall_percentile,
      
      // External scraped data fields (null if no URL mapping or scraping failed)
      degreeType: matchingScraped?.degreeType || null,
      programDuration: matchingScraped?.programDuration || null,
      costPerCreditHour: matchingScraped?.costPerCreditHour || null,
      totalTuition: matchingScraped?.totalTuition || null,
      deliveryMode: matchingScraped?.deliveryMode || null,
      curriculumHighlights: matchingScraped?.curriculumHighlights || null,
      accreditation: matchingScraped?.accreditation || null,
      sourceUrl: matchingScraped?.sourceUrl || null,
      lastScraped: matchingScraped?.lastScraped || null
    };
    
    mergedResults.push(merged);
  }
  
  console.log(`[MERGER] ✅ Completed merge: ${mergedResults.length} total records (all CSV competitors included)`);
  console.log('[MERGER] ==================== MERGE COMPLETE ====================');
  return mergedResults;
}