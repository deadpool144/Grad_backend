import re

def format_for_frontend(text: str) -> str:
    """
    Formatically clean and format LLM output for the frontend chat view.
    Ensures headings, list alignments, bold text, and paragraph spacings
    render beautifully in the small chat bubble.
    """
    if not text:
        return ""
    
    # 1. Adjust Heading Sizes:
    # Large headers (# and ##) can look overly large in chat bubbles.
    # We downgrade them to ### and #### so the text size matches better.
    text = re.sub(r'^#\s+(.*)$', r'### \1', text, flags=re.MULTILINE)
    text = re.sub(r'^##\s+(.*)$', r'### \1', text, flags=re.MULTILINE)
    
    # 2. Consistent list item margins and indentation:
    # Ensure list bullets have a space after them and start on new lines.
    # Format '* **Title**: description' or '- **Title**: description' nicely.
    text = re.sub(r'^\s*[\*\-]\s*\*\*(.*?)\*\*:', r'- **\1**:', text, flags=re.MULTILINE)
    
    # 3. Clean up multiple empty lines to keep height compact in chat bubbles.
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 4. Strip leading/trailing whitespaces.
    return text.strip()
