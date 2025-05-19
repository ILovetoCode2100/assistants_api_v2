import os
import time
import json
from openai import OpenAI
from typing import List, Dict, Any

# Read environment variables
api_key = os.environ.get("OPENAI_API_KEY")

# Use explicit assistant ID
assistant_id = "asst_GJrILaZUxl5n30c3MkHYRvce"

# Initialize client
client = OpenAI(api_key=api_key)

def validate_virtuoso_steps(steps: List[Dict[str, Any]]) -> bool:
    """
    Validate that the Virtuoso steps JSON has the correct structure.
    
    Args:
        steps: List of Virtuoso step objects
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(steps, list):
        print("ERROR: Steps is not a list")
        return False
        
    for i, step in enumerate(steps):
        # Check required top-level fields
        if not all(field in step for field in ["checkpointId", "stepIndex", "parsedStep"]):
            print(f"ERROR: Step {i} is missing required fields")
            return False
            
        # Check step index matches array position
        if step["stepIndex"] != i:
            print(f"WARNING: Step {i} has stepIndex {step['stepIndex']}")
            
        # Check parsedStep fields
        parsed_step = step["parsedStep"]
        if not all(field in parsed_step for field in ["action", "target", "meta"]):
            print(f"ERROR: Step {i} parsedStep is missing required fields")
            return False
            
        # Check action-specific requirements
        action = parsed_step["action"]
        if action in ["CLICK", "WRITE", "ASSERT_EXISTS", "ASSERT_EQUALS"]:
            if "element" not in parsed_step:
                print(f"ERROR: Step {i} with action {action} is missing 'element' field")
                return False
                
            element = parsed_step["element"]
            if not all(field in element for field in ["id", "target"]):
                print(f"ERROR: Step {i} element is missing required fields")
                return False
                
            if "selectors" not in element["target"]:
                print(f"ERROR: Step {i} element target is missing selectors")
                return False
                
    print("All steps validated successfully!")
    return True

def read_file_content(file_path):
    """Read the content of a file"""
    with open(file_path, 'r') as file:
        return file.read()

def convert_selenium_to_virtuoso():
    """Convert a Selenium test script to Virtuoso test steps"""
    # Read the test file content
    file_path = "/Users/marklovelady/Documents/GitHub/my-assets/_sample_tests/Test_Rocketshop.py"
    file_content = read_file_content(file_path)
    
    # Create a new thread
    thread = client.beta.threads.create()
    print(f"Created thread: {thread.id}")
    
    # Add a message to the thread requesting Virtuoso conversion
    message = client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=f"Convert this Selenium test script to Virtuoso test steps following the Selenium to Virtuoso Converter format:\n\n```python\n{file_content}\n```"
    )
    print(f"Added message to thread")
    
    # Run the assistant
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant_id
    )
    print(f"Started run: {run.id}")
    
    # Poll for the completion of the run
    while True:
        run_status = client.beta.threads.runs.retrieve(
            thread_id=thread.id,
            run_id=run.id
        )
        print(f"Run status: {run_status.status}")
        
        if run_status.status == 'completed':
            break
        elif run_status.status == 'failed':
            print(f"Run failed with error: {run_status.last_error}")
            return
        
        # Wait a bit before polling again
        time.sleep(2)
    
    # Get the assistant's response
    messages = client.beta.threads.messages.list(
        thread_id=thread.id
    )
    
    # Get and process the latest assistant response
    assistant_messages = [msg for msg in messages.data if msg.role == "assistant"]
    if assistant_messages:
        latest_message = assistant_messages[0]
        
        print("\nReceived response from assistant")
        
        # Extract the response text
        response_text = ""
        for content_part in latest_message.content:
            if content_part.type == 'text':
                response_text += content_part.text.value
        
        # Try to parse the JSON response
        try:
            # Find JSON content in the response (it might be wrapped in markdown code blocks)
            json_start = response_text.find('[')
            json_end = response_text.rfind(']') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_content = response_text[json_start:json_end]
                virtuoso_steps = json.loads(json_content)
                
                # Validate the steps
                is_valid = validate_virtuoso_steps(virtuoso_steps)
                
                if is_valid:
                    # Save to a file
                    output_file_path = "/Users/marklovelady/Documents/GitHub/assistants_api_v2/virtuoso_steps.json"
                    with open(output_file_path, 'w') as f:
                        json.dump(virtuoso_steps, f, indent=2)
                    
                    print(f"Conversion successful! Virtuoso steps saved to {output_file_path}")
                    print(f"Total steps converted: {len(virtuoso_steps)}")
                else:
                    print("Validation failed. The steps were not saved.")
            else:
                print("Could not extract JSON content from response")
                print("Response content:")
                print(response_text)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response: {e}")
            print("Response content:")
            print(response_text)
    else:
        print("No response from assistant yet.")

if __name__ == "__main__":
    convert_selenium_to_virtuoso()