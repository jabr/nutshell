---
name: nutshell
description: Use nutshell to get the gist of large text inputs (files, logs, URLs, docs, man pages) when you need a general understanding rather than searching for specific patterns. Ideal for exploring unfamiliar docs, understanding error logs, or getting context quickly. Use INSTEAD of reading entire files when you just need the gist.
license: MIT
compatibility: opencode
metadata:
  category: analysis
  tools: bash
---

## What I Do

I provide a way to quickly understand large text inputs using LLM summarization. Use me when:

- **Exploring documentation**: Get the gist of man pages, API docs, or guides without reading every word
- **Analyzing logs**: Understand what went wrong from lengthy log output
- **Exploring unfamiliar code**: Get oriented in large files before diving deep
- **Processing command output**: Make sense of verbose CLI output

## When to Use Me vs Other Tools

| Use nutshell when... | Use other tools when... |
|---------------------|------------------------|
| You need the **gist** of something | You need a **specific string** |
| Exploring unfamiliar territory | You know exactly what you're looking for |
| Understanding structure/concepts | Extracting precise values or line numbers |
| Reading docs, man pages, guides | Searching for a specific pattern |
| Need only key insights | Need exhaustive detail |

## How to Use Me

### Summarize a file or command output

```bash
man git-rebase | nutshell summarize:agent
curl -s https://example.com/api-docs | nutshell summarize:agent "focus on authentication"
```

### With specific focus

```bash
cat error.log | nutshell summarize:agent "identify root causes"
```

### Fetch and summarize a URL

```bash
nutshell fetch:agent https://example.com/lengthy-docs "extract key configuration options"
```

## Example Use Cases

### Understanding a large log file

```bash
journalctl -u myservice --since "1 hour ago" | nutshell summarize:agent "identify errors and their likely causes"
```

### Getting the gist of a large code file

```bash
cat src/legacy_module.py | nutshell summarize:agent "explain the architecture and key functions"
```

### Understanding documentation

```bash
nutshell fetch:agent https://docs.example.com/api-reference "extract authentication requirements"
```

## When NOT to Use Me

Don't use me when:
- You need to find a specific string or pattern (use `grep` instead)
- You need exact line numbers or precise locations
- The input is small enough to read directly
- You need to make edits based on specific code patterns
