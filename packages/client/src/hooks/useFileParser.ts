import { useState, useCallback } from 'react';
import type { ParseResult, FileType, Slide } from '@html-studio/shared';
import { getLayoutMeta } from '@html-studio/shared';
import { parseMarkdown } from '../lib/parser/markdown';
import { parseTxt } from '../lib/parser/txt';
import { parsePdf } from '../lib/parser/pdf';
import { parseDocx } from '../lib/parser/docx';

let nextId = 0;
function nanoid() {
  return `s${Date.now().toString(36)}${(nextId++).toString(36)}`;
}

function detectFileType(file: File): FileType | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'txt') return 'txt';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  return null;
}

interface UseFileParserReturn {
  parseResult: ParseResult | null;
  parsing: boolean;
  error: string | null;
  parseFile: (file: File) => Promise<ParseResult | null>;
  reset: () => void;
}

export function useFileParser(): UseFileParserReturn {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(async (file: File): Promise<ParseResult | null> => {
    setParsing(true);
    setError(null);

    try {
      const fileType = detectFileType(file);
      if (!fileType) {
        throw new Error(`不支持的文件格式: ${file.name}`);
      }

      if (file.size > 20 * 1024 * 1024) {
        throw new Error('文件大小超过 20MB 限制');
      }

      let rawSlides: Slide[];

      switch (fileType) {
        case 'markdown': {
          const text = await file.text();
          rawSlides = parseMarkdown(text);
          break;
        }
        case 'txt': {
          const text = await file.text();
          rawSlides = parseTxt(text);
          break;
        }
        case 'pdf': {
          const buffer = await file.arrayBuffer();
          rawSlides = await parsePdf(buffer);
          break;
        }
        case 'docx': {
          const buffer = await file.arrayBuffer();
          rawSlides = await parseDocx(buffer);
          break;
        }
      }

      const title = file.name.replace(/\.[^.]+$/, '');
      const result: ParseResult = { slides: rawSlides, title, fileType };
      setParseResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '解析失败';
      setError(message);
      return null;
    } finally {
      setParsing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setParseResult(null);
    setError(null);
  }, []);

  return { parseResult, parsing, error, parseFile, reset };
}