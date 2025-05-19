import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set assistant ID from environment variable
const assistantId = process.env.OPENAI_ASSISTANT_ID;

/**
 * Read file content
 * @param {string} filePath - Path to the file
 * @returns {string} - File content
 */
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error);
    throw error;
  }
}

/**
 * Validate the Virtuoso steps JSON structure
 * @param {Array} steps - Array of Virtuoso step objects
 * @returns {boolean} - True if valid, false otherwise
 */
function validateVirtuosoSteps(steps) {
  if (!Array.isArray(steps)) {
    console.error("ERROR: Steps is not an array");
    return false;
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Check required top-level fields
    if (!step.checkpointId || !('stepIndex' in step) || !step.parsedStep) {
      console.error(`ERROR: Step ${i} is missing required fields`);
      return false;
    }
    
    // Check step index matches array position
    if (step.stepIndex !== i) {
      console.warn(`WARNING: Step ${i} has stepIndex ${step.stepIndex}`);
    }
    
    // Check parsedStep fields
    const parsedStep = step.parsedStep;
    if (!parsedStep.action || !parsedStep.target || !parsedStep.meta) {
      console.error(`ERROR: Step ${i} parsedStep is missing required fields`);
      return false;
    }
    
    // Check action-specific requirements
    const action = parsedStep.action;
    if (["CLICK", "WRITE", "ASSERT_EXISTS", "ASSERT_EQUALS"].includes(action)) {
      if (!parsedStep.element) {
        console.error(`ERROR: Step ${i} with action ${action} is missing 'element' field`);
        return false;
      }
      
      const element = parsedStep.element;
      if (!element.id || !element.target) {
        console.error(`ERROR: Step ${i} element is missing required fields`);
        return false;
      }
      
      if (!element.target.selectors) {
        console.error(`ERROR: Step ${i} element target is missing selectors`);
        return false;
      }
    }
  }
  
  console.log("All steps validated successfully!");
  return true;
}

/**
 * Convert Selenium test script to Virtuoso test steps
 * @param {string} filePath - Path to the Selenium test script file
 * @returns {Promise<Array>} - Array of Virtuoso test steps
 */
async function convertSeleniumToVirtuoso(filePath) {
  // Read the test file content
  const fileContent = readFileContent(filePath);
  
  console.log(`Converting file: ${filePath}`);
  
  // Create a new thread
  const thread = await client.beta.threads.create();
  console.log(`Created thread: ${thread.id}`);
  
  // Add a message to the thread requesting Virtuoso conversion
  await client.beta.threads.messages.create({
    thread_id: thread.id,
    role: "user",
    content: `Convert this Selenium test script to Virtuoso test steps following the Selenium to Virtuoso Converter format:\n\n\`\`\`python\n${fileContent}\n\`\`\``,
  });
  console.log(`Added message to thread`);
  
  // Run the assistant
  const run = await client.beta.threads.runs.create({
    thread_id: thread.id,
    assistant_id: assistantId,
  });
  console.log(`Started run: ${run.id}`);
  
  // Poll for the completion of the run
  let runStatus = await client.beta.threads.runs.retrieve(
    thread.id,
    run.id
  );
  
  while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
    console.log(`Run status: ${runStatus.status}`);
    
    // Wait a bit before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    runStatus = await client.beta.threads.runs.retrieve(
      thread.id,
      run.id
    );
  }
  
  console.log(`Run status: ${runStatus.status}`);
  
  if (runStatus.status === 'failed') {
    console.error(`Run failed with error: ${runStatus.last_error}`);
    return null;
  }
  
  // Get the assistant's response
  const messages = await client.beta.threads.messages.list({
    thread_id: thread.id,
  });
  
  // Get and process the latest assistant response
  const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
  
  if (assistantMessages.length > 0) {
    const latestMessage = assistantMessages[0];
    console.log(`\nReceived response from assistant`);
    
    // Extract the response text
    let responseText = "";
    for (const contentPart of latestMessage.content) {
      if (contentPart.type === 'text') {
        responseText += contentPart.text.value;
      }
    }
    
    try {
      // Find JSON content in the response (it might be wrapped in markdown code blocks)
      const jsonStart = responseText.indexOf('[');
      const jsonEnd = responseText.lastIndexOf(']') + 1;
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonContent = responseText.substring(jsonStart, jsonEnd);
        const virtuosoSteps = JSON.parse(jsonContent);
        
        // Validate the steps
        const isValid = validateVirtuosoSteps(virtuosoSteps);
        
        if (isValid) {
          const outputFilePath = path.join(__dirname, 'virtuoso_steps.json');
          fs.writeFileSync(outputFilePath, JSON.stringify(virtuosoSteps, null, 2));
          
          console.log(`Conversion successful! Virtuoso steps saved to ${outputFilePath}`);
          console.log(`Total steps converted: ${virtuosoSteps.length}`);
          
          return virtuosoSteps;
        } else {
          console.error("Validation failed. The steps were not saved.");
          return null;
        }
      } else {
        console.error("Could not extract JSON content from response");
        console.error("Response content:");
        console.error(responseText);
        return null;
      }
    } catch (error) {
      console.error(`Error parsing JSON response: ${error}`);
      console.error("Response content:");
      console.error(responseText);
      return null;
    }
  } else {
    console.error("No response from assistant yet.");
    return null;
  }
}

// Main execution if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Get the file path from arguments or use default
  const defaultFilePath = path.resolve(__dirname, '..', 'my-assets', '_sample_tests', 'Test_Rocketshop.py');
  const targetFilePath = process.argv[2] || defaultFilePath;
  
  // Resolve the file path if it's provided as an argument
  const resolvedFilePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultFilePath;
  
  console.log(`Converting file: ${resolvedFilePath}`);
  
  // Convert the Selenium test to Virtuoso steps
  convertSeleniumToVirtuoso(resolvedFilePath)
    .then(() => {
      console.log('Conversion process complete');
    })
    .catch(error => {
      console.error('Error during conversion:', error);
      process.exit(1);
    });
}

// Export for usage in other modules
export { convertSeleniumToVirtuoso, validateVirtuosoSteps };