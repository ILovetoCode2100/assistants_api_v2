# Selenium to Virtuoso Converter (Node.js)

This Node.js application converts Selenium test scripts to Virtuoso test steps using the OpenAI Assistants API.

## Features

- Connects to OpenAI Assistants API
- Converts Selenium test scripts (Python, Java, etc.) to Virtuoso test steps
- Generates JSON in the proper Virtuoso API format
- Validates the structure of the generated JSON
- Saves the output to a file

## Prerequisites

- Node.js 16+ 
- npm or yarn
- OpenAI API key
- OpenAI Assistant ID (configured for Selenium to Virtuoso conversion)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ILovetoCode2100/assistants_api_v2.git
cd assistants_api_v2/nodejs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the project root with the following variables:
```
OPENAI_API_KEY=your_openai_api_key
OPENAI_ASSISTANT_ID=your_assistant_id
```

## Usage

### Basic Usage

Run the converter with a default file path:

```bash
node index.js
```

Or specify a custom Selenium test file:

```bash
node index.js /path/to/your/selenium/test.py
```

### As a Module

You can also use this as a module in your own Node.js applications:

```javascript
import { convertSeleniumToVirtuoso } from './index.js';

async function main() {
  const filePath = '/path/to/selenium/test.py';
  const virtuosoSteps = await convertSeleniumToVirtuoso(filePath);
  
  if (virtuosoSteps) {
    console.log(`Successfully converted ${virtuosoSteps.length} steps`);
  }
}

main().catch(console.error);
```

## Output

The converter generates a `virtuoso_steps.json` file containing an array of Virtuoso test steps in the required format:

```json
[
  {
    "checkpointId": 1656998,
    "stepIndex": 0,
    "parsedStep": {
      "action": "NAVIGATE",
      "target": {
        "selectors": []
      },
      "value": "https://example.com",
      "meta": {
        "kind": "NAVIGATE",
        "type": "URL",
        "useNewTab": false
      },
      "optional": false,
      "ignoreOutcome": false,
      "skip": false
    }
  },
  // Additional steps...
]
```

## Validation

The converter includes a validation function that checks the structure of the generated JSON to ensure it follows the Virtuoso API schema requirements.