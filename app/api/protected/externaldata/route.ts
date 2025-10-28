import { NextRequest, NextResponse } from 'next/server';
import { findUrlForCompetitor, scrapeSingleCompetitor } from '../../../../lib/webScraper';
import { getAllCompetitorsFromCsv, MergedCompetitor } from '../../../../lib/dataMerger';
import { writeOutputFiles } from '../../../../lib/outputWriters';

export async function POST(request: NextRequest) {
  console.log('[API] ==================== STARTING EXTERNAL DATA FETCH ====================');
  
  try {
    // Step 1: Get all competitors from internal CSV
    console.log('[API] Step 1: Loading competitors from internal CSV...');
    const internalCompetitors = getAllCompetitorsFromCsv();
    
    if (internalCompetitors.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No competitors found in internal CSV file.',
          step: 'csv-reading'
        },
        { status: 500 }
      );
    }
    
    console.log(`[API] ✅ Found ${internalCompetitors.length} competitors in CSV`);
    
    // Step 2: For each competitor, look up URL and scrape if available
    console.log('[API] Step 2: Processing each competitor for enrichment...');
    const enrichedCompetitors: MergedCompetitor[] = [];
    
    for (let i = 0; i < internalCompetitors.length; i++) {
      const competitor = internalCompetitors[i];
      console.log(`[API] Processing ${i + 1}/${internalCompetitors.length}: ${competitor.Institution}`);
      
      // Look up URL in urlMapping.json
      const competitorUrl = findUrlForCompetitor(competitor.Institution, competitor.Program);
      console.log(`[API] Enriching competitor: ${competitor.Institution}, URL: ${competitorUrl || 'NO URL'}`);
      
      let scrapedData = null;
      
      if (competitorUrl) {
        try {
          console.log(`[API] 🔍 Scraping ${competitor.Institution}...`);
          scrapedData = await scrapeSingleCompetitor(competitor.Institution, competitor.Program, competitorUrl);
          
          // Required console.log for scrape results
          console.log("SCRAPE RESULT", competitor.Institution, {
            degreeType: scrapedData.degreeType,
            durationText: scrapedData.programDuration,
            costPerCredit: scrapedData.costPerCreditHour,
            totalTuition: scrapedData.totalTuition,
            deliveryMode: scrapedData.deliveryMode,
            curriculumHighlights: scrapedData.curriculumHighlights
          });
        } catch (scrapeError) {
          console.error(`[API] SCRAPE FAILED FOR ${competitor.Institution}:`, scrapeError instanceof Error ? scrapeError.message : 'Unknown error');
          scrapedData = null;
        }
      } else {
        console.log(`[API] ⚠️ No URL mapping found for ${competitor.Institution} - skipping scraping`);
      }
      
      // Create merged row with internal data + scraped data (if any)
      const mergedRow: MergedCompetitor = {
        // Internal CSV data
        Program: competitor.Program,
        cip_codes_used: competitor.cip_codes_used,
        Institution: competitor.Institution,
        app_percentile: competitor.app_percentile,
        admissibility_percentile: competitor.admissibility_percentile,
        win_percentile: competitor.win_percentile,
        overall_percentile: competitor.overall_percentile,
        
        // External scraped data (null if no scraping or scraping failed)
        degreeType: scrapedData?.degreeType || null,
        programDuration: scrapedData?.programDuration || null,
        costPerCreditHour: scrapedData?.costPerCreditHour || null,
        totalTuition: scrapedData?.totalTuition || null,
        deliveryMode: scrapedData?.deliveryMode || null,
        curriculumHighlights: scrapedData?.curriculumHighlights || null,
        accreditation: scrapedData?.accreditation || null,
        sourceUrl: scrapedData?.sourceUrl || null,
        lastScraped: scrapedData?.lastScraped || null
      };
      
      enrichedCompetitors.push(mergedRow);
      
      console.log(`[API] Final merged row:`, {
        institution: mergedRow.Institution,
        degreeType: mergedRow.degreeType,
        tuition: mergedRow.totalTuition,
        enriched: !!scrapedData
      });
      
      // Small delay between competitors to be polite
      if (competitorUrl && i < internalCompetitors.length - 1) {
        console.log('[API] Waiting 1 second before next competitor...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[API] ✅ Completed processing ${enrichedCompetitors.length} competitors`);
    
    // Step 3: Write output files
    console.log('[API] Step 3: Writing output files...');
    const outputResult = await writeOutputFiles(enrichedCompetitors);
    
    if (!outputResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: outputResult.error || 'Failed to write output files',
          step: 'output'
        },
        { status: 500 }
      );
    }
    
    console.log('[API] ✅ All steps completed successfully');
    
    // Return success response with summary and data for frontend
    const recordsWithScrapedData = enrichedCompetitors.filter(r => r.lastScraped).length;
    
    console.log(`[API] ✅ Returning ${enrichedCompetitors.length} competitors to frontend`);
    console.log('[API] ==================== EXTERNAL DATA FETCH COMPLETE ====================');
    
    return NextResponse.json({
      success: true,
      lastScraped: new Date().toISOString(),
      rows: enrichedCompetitors, // Return all merged competitors for frontend display
      summary: {
        totalRecords: enrichedCompetitors.length,
        recordsWithScrapedData,
        recordsWithoutScrapedData: enrichedCompetitors.length - recordsWithScrapedData,
        generatedAt: new Date().toISOString(),
        outputFiles: {
          json: outputResult?.jsonPath || null,
          csv: outputResult?.csvPath || null
        }
      },
      message: `Successfully processed ${enrichedCompetitors.length} competitor records from CSV. ${recordsWithScrapedData} records enhanced with scraped data.`
    });
    
  } catch (error) {
    console.error('[API] External data processing failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown server error',
        step: 'unknown'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.log('[API] GET request received for external data endpoint');
  
  // Test that we can read the CSV and URL mappings
  try {
    const competitors = getAllCompetitorsFromCsv();
    const harvardUrl = findUrlForCompetitor("Harvard Graduate School of Education", "Education Policy");
    
    console.log('[API] CSV test: Found', competitors.length, 'competitors');
    console.log('[API] Harvard URL test:', harvardUrl);
    
    return NextResponse.json(
      { 
        message: 'External data API endpoint. Use POST to trigger scraping and data merge.',
        methods: ['POST'],
        description: 'Per-competitor scraping with URL lookup from urlMapping.json',
        status: 'ready',
        csvCompetitors: competitors.length,
        harvardUrlFound: !!harvardUrl
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: 'External data API endpoint - setup error',
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}