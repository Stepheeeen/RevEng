import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Executes a python scraper script and returns a promise that resolves when it finishes.
 */
function runPythonScraper(scriptName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[ScraperRunner] Starting ${scriptName}...`);
    
    // Path to the scraper script inside the project-trinity/scrapers directory
    const scriptPath = path.resolve(__dirname, '../../../../scrapers', scriptName);
    
    const fs = require('fs');
    const venvPythonPath = path.resolve(__dirname, '../../../../scrapers/venv/bin/python');
    const pythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python3';
    
    const pythonProcess = spawn(pythonExecutable, [scriptPath], {
      env: process.env, // Pass environment variables including MONGODB_URI
      stdio: 'inherit' // Pipe output to the Node.js stdout/stderr so we can see it in server logs
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`[ScraperRunner] ${scriptName} completed successfully.`);
        resolve();
      } else {
        console.error(`[ScraperRunner] ${scriptName} exited with code ${code}`);
        reject(new Error(`Scraper ${scriptName} failed with exit code ${code}`));
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`[ScraperRunner] Failed to start ${scriptName}:`, err);
      reject(err);
    });
  });
}

/**
 * Runs the full scraping pipeline:
 * 1. Hiring Scraper (Finds companies hiring developers)
 * 2. Tech Analyzer (Scans the newly found companies for vulnerabilities)
 */
export async function runScrapingPipeline() {
  console.log('[ScraperRunner] Initiating full scraping pipeline...');
  try {
    // 1. Find new companies showing hiring pain
    await runPythonScraper('hiring_scraper.py');
    
    // 2. Scan those companies (and any others missing tech scans) for legacy tech vulnerabilities
    await runPythonScraper('tech_analyzer.py');
    
    console.log('[ScraperRunner] Full scraping pipeline completed successfully.');
  } catch (err) {
    console.error('[ScraperRunner] Pipeline encountered an error:', err);
  }
}

/**
 * Registers the cron job to run daily at 2:00 AM.
 * This ensures signals are populated before the Outbound CRM Router runs at 8:00 AM.
 */
export function registerScraperCron() {
  cron.schedule('0 2 * * *', () => {
    console.log('--- Triggering Nightly Scraper Pipeline (2:00 AM) ---');
    runScrapingPipeline();
  });
  console.log('Nightly Scraper Pipeline Cron Worker registered successfully (Daily 2:00 AM schedule).');
}
