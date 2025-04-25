import cron from 'node-cron'
import { SetRemindersToCustomers } from '../controllers/customerController.js';

cron.schedule("0 9 * * *", () => {
    SetRemindersToCustomers();
    console.log("Job completed");
}, {
    scheduled: true,
    timezone: "Asia/Colombo"
});