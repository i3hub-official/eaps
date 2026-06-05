import cron from 'node-cron';
import { expireApiKeys } from './expire-api-keys';

// Register all cron jobs
export function startCronJobs() {
  // Every minute
  cron.schedule('* * * * *', expireApiKeys);
  
  console.log('Cron jobs started');
}