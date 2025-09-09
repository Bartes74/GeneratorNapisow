# External Transcription Service Integration

## Overview

This implementation allows the Subtitle Generator application to use an external transcription service that is compatible with the OpenAI API specification. **Local Whisper transcription has been removed** - only external services are now supported.

## Implementation Details

### 1. Environment Variables

The following environment variables control the transcription behavior:

- `TRANSCRIPTION_API_URL` - The base URL of the external transcription service API
- `TRANSCRIPTION_API_KEY` - The API key for authenticating with the external service
- `TRANSCRIPTION_MODEL` - The model name to use for transcription (default: "whisper-large-v3")

### 2. Configuration Requirement

The application now **requires** the external transcription service to be configured:

- Both `TRANSCRIPTION_API_URL` and `TRANSCRIPTION_API_KEY` must be set
- The application will fail to start if these are not provided

### 3. Implementation in transcription.py

The [transcription.py](file:///Users/bartek/Developer/GeneratorNapisow/backend/app/transcription.py) file has been simplified to support only external services:

1. **External Service Integration**:
   - Uses `transcribe_audio_with_external_service()` function
   - Makes HTTP requests to the external API
   - Follows OpenAI's audio transcription API specification
   - Handles authentication with Bearer tokens
   - Converts response format to match expected output

2. **Removed Local Whisper Integration**:
   - Removed `transcribe_audio_with_local_whisper()` function
   - Removed conditional import of Whisper library
   - Simplified codebase by removing local processing

3. **Unified Interface**:
   - Single `transcribe_audio()` function that uses the external service
   - Transparent to the rest of the application

### 4. API Compatibility

The external service integration follows the OpenAI API specification:

- Endpoint: `POST {TRANSCRIPTION_API_URL}/audio/transcriptions`
- Authentication: Bearer token in Authorization header
- File upload: multipart/form-data
- Parameters: model name and optional language code
- Response format: JSON with text and optional segments

## Usage Examples

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  backend:
    # ... other configuration
    environment:
      - TRANSCRIPTION_API_URL=https://api.openai.com/v1
      - TRANSCRIPTION_API_KEY=your-api-key-here
      - TRANSCRIPTION_MODEL=whisper-1
```

### Environment Variables

```bash
export TRANSCRIPTION_API_URL=https://api.openai.com/v1
export TRANSCRIPTION_API_KEY=your-api-key-here
export TRANSCRIPTION_MODEL=whisper-1
```

## Supported Services

This implementation is compatible with any service that follows the OpenAI audio transcription API specification, including:

1. OpenAI Whisper API
2. Azure OpenAI Service
3. Other compatible third-party services

## Benefits

1. **Simplified Architecture**: No need to maintain local Whisper models
2. **Reduced Resource Usage**: No need for large model files or GPU resources
3. **Flexibility**: Choose from various external services
4. **Scalability**: External services can handle larger workloads
5. **Cost-effectiveness**: Pay only for what you use
6. **Performance**: Cloud services may offer faster processing
7. **Model Updates**: External services keep models up-to-date

## Security Considerations

- Keep API keys secure and never commit them to version control
- Use environment variables or secure secret management systems
- Consider the privacy implications of sending audio data to external services
- Ensure the external service complies with your data protection requirements

## Testing

The implementation has been designed to be transparent to the rest of the application. The existing API endpoints and data formats remain unchanged, ensuring compatibility with the frontend and any other clients.