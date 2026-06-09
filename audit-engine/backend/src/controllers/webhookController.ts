import { Request, Response } from 'express';
import { getMongoDb } from '../utils/db';

/**
 * Handles incoming webhooks from Zoho CRM when a Lead or Deal status changes.
 * Expected payload: { domain?: string, email?: string, status: string }
 */
export async function zohoWebhookHandler(req: Request, res: Response): Promise<void> {
  const { domain, email, status } = req.body;

  if (!domain && !email) {
    res.status(400).json({ error: 'Must provide domain or email' });
    return;
  }

  if (!status) {
    res.status(400).json({ error: 'Must provide status' });
    return;
  }

  // We are only interested in successful conversions for ROI tracking
  const successStatuses = ['Closed Won', 'Converted', 'Won', 'Closed'];
  const isSuccess = successStatuses.some(s => status.toLowerCase().includes(s.toLowerCase()));

  if (!isSuccess) {
    res.status(200).json({ message: `Status '${status}' is not a conversion status. Ignored.` });
    return;
  }

  try {
    const db = await getMongoDb();
    
    // Find the company ID based on domain or email
    let companyId = null;

    if (domain) {
      const company = await db.collection('companies').findOne({ domain });
      if (company) {
        companyId = company._id;
      }
    }

    if (!companyId && email) {
      const lead = await db.collection('leads').findOne({ email });
      if (lead) {
        companyId = lead.company_id;
      }
    }

    if (!companyId) {
      res.status(404).json({ error: 'Could not find a matching company or lead for the provided domain/email.' });
      return;
    }

    // Update ROI status in outbound signals
    const updateResult = await db.collection('outbound_signals').updateMany(
      { company_id: companyId },
      { 
        $set: { 
          roi_status: 'CLOSED_WON',
          revenue_generated: true,
          roi_updated_at: new Date()
        } 
      }
    );

    // Update lead record directly
    await db.collection('leads').updateMany(
      { company_id: companyId },
      {
        $set: {
          status: 'CLOSED_WON',
          updated_at: new Date()
        }
      }
    );

    console.log(`ROI Tracked! Marked ${updateResult.modifiedCount} signals for company ${companyId} as CLOSED_WON.`);
    
    res.status(200).json({ 
      success: true, 
      message: `ROI tracking updated for company.`,
      signalsUpdated: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
