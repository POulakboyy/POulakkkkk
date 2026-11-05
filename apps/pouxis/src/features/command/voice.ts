import { useCallback, useEffect, useRef, useState } from 'react';
import type { Locale } from '@pouxis/core';
import { transcriptToText } from './capture.ts';

/**
 * Voice capture through the Web Speech API (`SpeechRecognition`, prefixed in WebKit). The
 * transcript is cleaned and split into actions by the engine (`nlp.cleanTranscript` /
 * `nlp.splitActions`) before reaching the composer. Where the API is missing the button is
 * simply not shown.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative | undefined;
}
export interface RecognitionEventLike {
  resultIndex: number;
  results: { readonly length: number; [index: number]: RecognitionResult | undefined };
}

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export type RecognitionCtor = new () => RecognitionLike;

export function recognitionCtor(scope: object = globalThis): RecognitionCtor | null {
  const s = scope as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return s.SpeechRecognition ?? s.webkitSpeechRecognition ?? null;
}

const LANG: Record<Locale, string> = { fr: 'fr-FR', en: 'en-US' };

export type DictationStatus = 'idle' | 'listening' | 'denied' | 'failed';

/** Final and interim text of a result list, in order. */
export function readResults(e: RecognitionEventLike): { final: string; interim: string } {
  let final = '';
  let interim = '';
  for (let i = 0; i < e.results.length; i++) {
    const result = e.results[i];
    const text = result?.[0]?.transcript ?? '';
    if (result?.isFinal) final += text;
    else interim += text;
  }
  return { final: final.trim(), interim: interim.trim() };
}

export interface DictationOptions {
  locale: Locale;
  /** Called once dictation ends, with one line per action. */
  onText: (text: string) => void;
  ctor?: RecognitionCtor | null;
}

export function useDictation({ locale, onText, ctor = recognitionCtor() }: DictationOptions) {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [interim, setInterim] = useState('');
  const recognition = useRef<RecognitionLike | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const stop = useCallback(() => recognition.current?.stop(), []);

  const start = useCallback(() => {
    if (!ctor || recognition.current) return;
    const r = new ctor();
    r.lang = LANG[locale];
    r.continuous = true;
    r.interimResults = true;
    let transcript = '';
    let problem: DictationStatus | null = null;
    r.onresult = (e) => {
      const { final, interim: live } = readResults(e);
      transcript = final;
      setInterim(live === '' ? final : `${final} ${live}`.trim());
    };
    r.onerror = (e) => {
      problem =
        e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'failed';
      // `no-speech` and `aborted` are not problems worth reporting.
      if (e.error === 'no-speech' || e.error === 'aborted') problem = null;
    };
    r.onend = () => {
      recognition.current = null;
      setInterim('');
      setStatus(problem ?? 'idle');
      if (transcript !== '') onTextRef.current(transcriptToText(transcript, locale));
    };
    recognition.current = r;
    setStatus('listening');
    try {
      r.start();
    } catch {
      recognition.current = null;
      setStatus('failed');
    }
  }, [ctor, locale]);

  useEffect(() => () => recognition.current?.abort(), []);

  return { supported: ctor !== null, status, interim, start, stop };
}
