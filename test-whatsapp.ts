import { sendWhatsAppMessage } from "./src/lib/maytapi";
import { formatDate } from "./src/lib/dateUtils";
import path from "path";
// import dotenv from "dotenv";
// dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function test() {
  const testNumber = "7217685179";
  const formattedDate = formatDate(new Date().toISOString());
  const message = `🔔 *Delegation - New Task Assigned*\n\n*Title:* Test message\n*Priority:* High\n*Due Date:* ${formattedDate}\n*Assigned By:* SAHIL SIR\n\n*Description:* System Integration Test`;

  console.log(`Sending refined test message to ${testNumber}...`);
  const result = await sendWhatsAppMessage(testNumber, message);

  if (result.success) {
    console.log("✅ Refined test message sent successfully!");
  } else {
    console.error("❌ Failed to send test message:", result.error);
  }
}

test();
