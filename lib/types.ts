export type CsvRow = {
  Program: string;
  cip_codes_used: string;
  Institution: string;
  app_percentile: string;          // "94%" (we’ll strip % in API)
  admissibility_percentile: string;
  win_percentile: string;
  overall_percentile: string;
};

export type CleanRow = {
  Program: string;
  cip_codes_used: string;
  Institution: string;
  appPercentile: number;
  admissibilityPercentile: number;
  winPercentile: number;
  overallPercentile: number;
};
