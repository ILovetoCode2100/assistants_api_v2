import os
from openai import OpenAI

# Initialize the OpenAI client
# Note: Set your API key in the environment variable OPENAI_API_KEY
client = OpenAI()

def create_assistant(name, instructions, model="gpt-4-turbo-preview", tools=None):
    """
    Create a new assistant.
    
    Args:
        name (str): The name of the assistant
        instructions (str): Instructions for the assistant
        model (str): The model to use, defaults to gpt-4-turbo-preview
        tools (list): Optional list of tools the assistant can use
        
    Returns:
        The created assistant object
    """
    if tools is None:
        tools = []
        
    assistant = client.beta.assistants.create(
        name=name,
        instructions=instructions,
        model=model,
        tools=tools
    )
    
    print(f"Created assistant: {assistant.id}")
    return assistant

def create_thread():
    """
    Create a new thread for conversations.
    
    Returns:
        The created thread object
    """
    thread = client.beta.threads.create()
    print(f"Created thread: {thread.id}")
    return thread

def add_message_to_thread(thread_id, content, role="user"):
    """
    Add a message to a thread.
    
    Args:
        thread_id (str): The ID of the thread
        content (str): The message content
        role (str): The role of the message sender (user)
        
    Returns:
        The created message object
    """
    message = client.beta.threads.messages.create(
        thread_id=thread_id,
        role=role,
        content=content
    )
    
    return message

def run_assistant(assistant_id, thread_id, instructions=None):
    """
    Run the assistant on a thread.
    
    Args:
        assistant_id (str): The ID of the assistant
        thread_id (str): The ID of the thread
        instructions (str): Optional instructions for this specific run
        
    Returns:
        The run object
    """
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id,
        instructions=instructions
    )
    
    return run

def get_run_status(thread_id, run_id):
    """
    Get the status of a run.
    
    Args:
        thread_id (str): The ID of the thread
        run_id (str): The ID of the run
        
    Returns:
        The run object
    """
    run = client.beta.threads.runs.retrieve(
        thread_id=thread_id,
        run_id=run_id
    )
    
    return run

def get_messages(thread_id):
    """
    Get all messages from a thread.
    
    Args:
        thread_id (str): The ID of the thread
        
    Returns:
        List of message objects
    """
    messages = client.beta.threads.messages.list(
        thread_id=thread_id
    )
    
    return messages

if __name__ == "__main__":
    # Example usage
    print("OpenAI Assistants API v2 Example")
    print("Please set your OPENAI_API_KEY environment variable before running")