import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import { MergedCompetitor } from './dataMerger';

export interface OutputResult {
  success: boolean;
  jsonPath?: string;
  csvPath?: string;
  error?: string;
}

export async function writeOutputFiles(mergedData: MergedCompetitor[]): Promise<OutputResult> {
  console.log('[OUTPUT] Writing merged data to files...');
  
  try {
    // Try to find the correct data directory
    const possibleDataDirs = [
      path.join(process.cwd(), 'data'),
      path.join('/Users/sreepriyadamuluru/Downloads/program_eval_tool/data'),
      path.join(__dirname, '..', '..', 'data')
    ];
    
    let dataDir = '';
    for (const tryDir of possibleDataDirs) {
      if (fs.existsSync(tryDir)) {
        dataDir = tryDir;
        console.log('[OUTPUT] ✅ Using data directory:', dataDir);
        break;
      }
    }
    
    if (!dataDir) {
      // Use the first path and create directory
      dataDir = possibleDataDirs[0];
      console.log('[OUTPUT] Creating data directory:', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(dataDir, `external_competitors_${timestamp}.json`);
    const csvPath = path.join(dataDir, `external_competitors_${timestamp}.csv`);
    const latestJsonPath = path.join(dataDir, 'external_competitors_latest.json');
    const latestCsvPath = path.join(dataDir, 'external_competitors_latest.csv');
    
    // Prepare JSON output with metadata
    const jsonOutput = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRecords: mergedData.length,
        recordsWithScrapedData: mergedData.filter(r => r.lastScraped).length,
        description: 'Merged competitor data combining internal analytics with scraped program information'
      },
      competitors: mergedData
    };
    
    // Write timestamped JSON file
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), 'utf-8');
    console.log(`[OUTPUT] ✅ JSON written to: ${jsonPath}`);
    
    // Write latest JSON file (overwrite)
    fs.writeFileSync(latestJsonPath, JSON.stringify(jsonOutput, null, 2), 'utf-8');
    console.log(`[OUTPUT] ✅ Latest JSON written to: ${latestJsonPath}`);
    
    // Prepare CSV headers and data
    const csvHeaders = [
      'Program',
      'cip_codes_used', 
      'Institution',
      'app_percentile',
      'admissibility_percentile', 
      'win_percentile',
      'overall_percentile',
      'degreeType',
      'programDuration',
      'costPerCreditHour', 
      'totalTuition',
      'deliveryMode',
      'curriculumHighlights',
      'accreditation',
      'sourceUrl',
      'lastScraped'
    ];
    
    // Convert data to CSV format
    const csvData = mergedData.map(competitor => [
      competitor.Program,
      competitor.cip_codes_used,
      competitor.Institution, 
      competitor.app_percentile,
      competitor.admissibility_percentile,
      competitor.win_percentile,
      competitor.overall_percentile,
      competitor.degreeType || '',
      competitor.programDuration || '',
      competitor.costPerCreditHour || '',
      competitor.totalTuition || '',
      competitor.deliveryMode || '', 
      competitor.curriculumHighlights || '',
      competitor.accreditation || '',
      competitor.sourceUrl || '',
      competitor.lastScraped || ''
    ]);
    
    const csvContent = stringify([csvHeaders, ...csvData], {
      quoted: true,
      delimiter: ','
    });
    
    // Write timestamped CSV file
    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`[OUTPUT] ✅ CSV written to: ${csvPath}`);
    
    // Write latest CSV file (overwrite)
    fs.writeFileSync(latestCsvPath, csvContent, 'utf-8');
    console.log(`[OUTPUT] ✅ Latest CSV written to: ${latestCsvPath}`);
    
    return {
      success: true,
      jsonPath: jsonPath,
      csvPath: csvPath
    };
    
  } catch (error) {
    console.error('[OUTPUT] Error writing output files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function getLatestOutputPaths(): { jsonPath: string; csvPath: string } {
  const dataDir = path.join(process.cwd(), 'data');
  return {
    jsonPath: path.join(dataDir, 'external_competitors_latest.json'),
    csvPath: path.join(dataDir, 'external_competitors_latest.csv')
  };
}