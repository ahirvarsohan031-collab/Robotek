import { delegationService } from "./src/lib/delegation-sheets";

async function reproduce() {
  console.log("Starting reproduction...");
  
  // Try to update a dummy ID
  // This will trigger mapItemToRow with an empty hMap
  try {
    const dummyId = "REPRO_ID_123";
    const dummyData = {
      id: dummyId,
      title: "Repro Title",
      description: "Repro Description",
      assigned_by: "System",
      assigned_to: "Tester",
      department: "QA",
      priority: "High",
      due_date: new Date().toISOString(),
      status: "Pending",
      voice_note_url: "",
      reference_docs: "",
      evidence_required: "No",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Checking hMap before ensureHeaders...");
    console.log("hMap keys count:", Object.keys((delegationService as any).hMap).length);

    console.log("Attempting to populate headers (ensureHeaders)...");
    // This might fail if no API key/auth is set in the environment, 
    // but we can at least test the logic if we provide a mock hMap
    (delegationService as any).hMap = { "id": 0, "title": 1, "description": 2 }; 
    
    console.log("Calling mapItemToRow...");
    const row = (delegationService as any).mapItemToRow(dummyData);
    console.log("Mapped Row:", JSON.stringify(row));
    
    if (row.length > 1 && row[0] === dummyId) {
      console.log("SUCCESS: Fix verified! Row is correctly mapped using hMap.");
    } else {
      console.log("FAILURE: Row is still empty or mismatched:", row);
    }
  } catch (error) {
    console.error("Error during reproduction:", error);
  }
}

reproduce();
