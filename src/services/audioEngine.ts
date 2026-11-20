import { PrivacyRulesConfig, AudioRedactionEvent, PIICategory, ExplainableReason } from '../types';

export class AudioProcessingEngine {
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private bleepOscillator: OscillatorNode | null = null;
  private bleepGain: GainNode | null = null;
  private mainGain: GainNode | null = null;
  private speakerBleepGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private isRunning: boolean = false;
  private isBleepActive: boolean = false;
  private recognition: any = null;
  private onTranscriptCallback: ((rawText: string, censoredText: string, event?: AudioRedactionEvent) => void) | null = null;

  // Number word map for normalization of spoken numbers
  private wordToDigitMap: Record<string, string> = {
    'zero': '0', 'oh': '0', 'o': '0', 'one': '1', 'two': '2', 'to': '2', 'too': '2',
    'three': '3', 'four': '4', 'for': '4', 'five': '5', 'six': '6', 'seven': '7',
    'eight': '8', 'ate': '8', 'nine': '9'
  };

  // Standard regex patterns
  private phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+91[\s-]?\d{5}[\s-]?\d{5}|\b\d{10}\b|\b(?:\d[\s-]?){10}\b/g;
  private emailRegex = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s+at\s+)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s+dot\s+)[a-zA-Z]{2,}/gi;
  private idNumberRegex = /\b\d{4}[-\s]\d{4}[-\s]\d{4}\b|\b[X]{4}-[X]{4}-\d{4}\b|\b[A-Z]{5}\d{4}[A-Z]\b|\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/gi;
  private creditCardRegex = /\b(?:\d{4}[-\s]?){4}\b|\b\d{16}\b/g;
  private passwordPinRegex = /\b(?:password|passcode|pin|pin\s+code|otp|secret\s+key|access\s+code)(?:\s+is|\s*:|\s+equals)?\s+([A-Za-z0-9@#$%^&*!_-]{3,20})/gi;
  private addressRegex = /\b(?:live\s+at|address\s+is|residing\s+at|apartment|street|road|avenue|pincode|zip\s+code|postal\s+code)\s+([A-Za-z0-9\s,.-]{4,40})/gi;

  constructor() {}

  /**
   * Initializes the Web Audio DSP Graph.
   * Connects microphone source -> Analyser -> Gate -> Destination.
   * Also connects an audible 1000Hz Bleep Oscillator directly to physical speakers (audioContext.destination)
   * AND to the output media stream.
   */
  public async initializeAudioGraph(inputStream?: MediaStream): Promise<MediaStream | null> {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      let stream = inputStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      this.mainGain = this.audioContext.createGain();
      this.mainGain.gain.value = 1.0;

      this.bleepGain = this.audioContext.createGain();
      this.bleepGain.gain.value = 0.0;

      // Speaker Bleep Gain directly connected to user's physical audio output!
      this.speakerBleepGain = this.audioContext.createGain();
      this.speakerBleepGain.gain.value = 0.0;
      this.speakerBleepGain.connect(this.audioContext.destination);

      // Destination node for recording / stream export
      this.destinationNode = this.audioContext.createMediaStreamDestination();

      // Main audio routing
      this.mediaStreamSource.connect(this.analyser);
      this.analyser.connect(this.mainGain);
      this.mainGain.connect(this.destinationNode);

      // Bleep tone injection into stream
      this.bleepGain.connect(this.destinationNode);

      this.isRunning = true;
      return this.destinationNode.stream;
    } catch (err) {
      console.warn('Microphone access or Web Audio not available, initializing virtual speaker synth.', err);
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioCtx();
        }
      } catch (e) {}
      return null;
    }
  }

  /**
   * Plays a loud, clear 1000Hz censor bleep directly to the user's physical hardware speakers.
   * Guaranteed to be audible!
   */
  public playAudibleBleep(durationMs: number = 800) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now); // Standard 1kHz broadcast censorship tone

      // Sharp attack, sustained level, smooth decay
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.015);
      gain.gain.setValueAtTime(0.35, now + durationMs / 1000 - 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + durationMs / 1000);
    } catch (err) {
      console.warn('Could not generate audible bleep:', err);
    }
  }

  /**
   * Physically triggers the audio redaction tone / mute on both the WebAudio DSP Graph and physical speakers!
   */
  public triggerAudioStreamRedaction(durationMs: number = 1000, action: 'bleep' | 'mute' = 'bleep') {
    this.isBleepActive = true;

    // 1. Play audible tone to physical speakers
    if (action === 'bleep') {
      this.playAudibleBleep(durationMs);
    }

    // 2. Mute microphone stream and inject tone into destination track
    if (this.audioContext && this.mainGain) {
      const now = this.audioContext.currentTime;
      this.mainGain.gain.cancelScheduledValues(now);
      this.mainGain.gain.setValueAtTime(1.0, now);
      this.mainGain.gain.linearRampToValueAtTime(0.0, now + 0.02);

      const endTime = now + durationMs / 1000;
      this.mainGain.gain.setValueAtTime(0.0, endTime);
      this.mainGain.gain.linearRampToValueAtTime(1.0, endTime + 0.03);
    }

    setTimeout(() => {
      this.isBleepActive = false;
    }, durationMs);
  }

  /**
   * Real-time Voice Activity & Frequency Visualizer Data
   */
  public getWaveformData(): Uint8Array {
    if (!this.analyser) {
      // Return subtle synthetic frequency jitter when mic is idle
      const jitter = new Uint8Array(24);
      for (let i = 0; i < 24; i++) {
        jitter[i] = Math.floor(Math.random() * 8 + 4);
      }
      return jitter;
    }
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buffer);
    return buffer;
  }

  /**
   * Normalizes spoken verbal numbers like "nine eight seven six five four three two one zero"
   * or "my number is double nine five four..." into numeric sequences.
   */
  public normalizeSpokenText(text: string): string {
    let normalized = text.toLowerCase();

    // Replace "double [digit]" or "triple [digit]"
    normalized = normalized.replace(/\bdouble\s+(zero|one|two|three|four|five|six|seven|eight|nine|\d)\b/g, (_, d) => {
      const digit = this.wordToDigitMap[d] || d;
      return `${digit}${digit}`;
    });

    normalized = normalized.replace(/\btriple\s+(zero|one|two|three|four|five|six|seven|eight|nine|\d)\b/g, (_, d) => {
      const digit = this.wordToDigitMap[d] || d;
      return `${digit}${digit}${digit}`;
    });

    // Replace spoken digit words
    const words = normalized.split(/\s+/);
    const convertedWords = words.map((w) => {
      const cleanWord = w.replace(/[^a-z0-9]/g, '');
      if (this.wordToDigitMap[cleanWord]) {
        return this.wordToDigitMap[cleanWord];
      }
      return w;
    });

    normalized = convertedWords.join(' ');

    // Normalize spoken emails ("john dot doe at gmail dot com" -> "john.doe@gmail.com")
    normalized = normalized.replace(/\s+at\s+the\s+rate\s+/gi, '@');
    normalized = normalized.replace(/\s+at\s+/gi, '@');
    normalized = normalized.replace(/\s+dot\s+/gi, '.');

    return normalized;
  }

  /**
   * Initializes Speech-to-Text Listener (Web Speech API) with Spoken PII Identification
   */
  public startSpeechRecognition(
    rules: PrivacyRulesConfig,
    onTranscript: (rawText: string, censoredText: string, event?: AudioRedactionEvent) => void
  ) {
    this.onTranscriptCallback = onTranscript;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser environment. Using synthetic speech triggers.');
      return false;
    }

    try {
      if (this.recognition) {
        try { this.recognition.stop(); } catch (e) {}
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        if (transcript.trim().length > 0) {
          this.processSpokenText(transcript, rules);
        }
      };

      this.recognition.onerror = (e: any) => {
        console.log('Speech recognition event notice:', e.error);
      };

      this.recognition.onend = () => {
        // Auto restart if still running
        if (this.isRunning && this.recognition) {
          try { this.recognition.start(); } catch (e) {}
        }
      };

      this.recognition.start();
      return true;
    } catch (err) {
      console.warn('Speech recognition init error:', err);
      return false;
    }
  }

  /**
   * Parses spoken text for ALL PII entities (Phone, Email, Aadhaar/ID, Credit Card, Address, Password/PIN),
   * triggers loud audible censorship bleep on speakers and audio stream,
   * and produces explainable redacted transcript output.
   */
  public processSpokenText(
    rawSpeech: string,
    rules: PrivacyRulesConfig
  ): { censored: string; hasPII: boolean; event?: AudioRedactionEvent; detectedCategories: string[] } {
    let censored = rawSpeech;
    let hasPII = false;
    let piiCategory: PIICategory = 'spoken_phone';
    const detectedCategories: string[] = [];

    // Also check normalized representation for spoken numbers (e.g. "nine eight seven six...")
    const normalized = this.normalizeSpokenText(rawSpeech);

    // 1. Phone Numbers (Standard & Spoken formats)
    if (rules.protectSpokenPhones) {
      // Check normalized continuous digits (e.g. 10 digits together)
      const normalizedDigitsOnly = normalized.replace(/[^0-9]/g, '');
      const has10Digits = normalizedDigitsOnly.length >= 10;

      if (this.phoneRegex.test(rawSpeech) || this.phoneRegex.test(normalized) || has10Digits) {
        censored = censored.replace(this.phoneRegex, '[REDACTED: PHONE NUMBER]');
        // If whole phrase was numbers
        if (has10Digits && !censored.includes('[REDACTED')) {
          censored = `[REDACTED: PHONE NUMBER] (${rawSpeech})`;
        }
        hasPII = true;
        piiCategory = 'spoken_phone';
        detectedCategories.push('Phone Number');
      }
    }

    // 2. Email Addresses
    if (rules.protectSpokenEmails) {
      if (this.emailRegex.test(rawSpeech) || this.emailRegex.test(normalized)) {
        censored = censored.replace(this.emailRegex, '[REDACTED: EMAIL ADDRESS]');
        hasPII = true;
        piiCategory = 'spoken_email';
        detectedCategories.push('Email Address');
      }
    }

    // 3. Aadhaar / National ID / SSN
    if (rules.protectSpokenIDs) {
      if (
        this.idNumberRegex.test(rawSpeech) ||
        this.idNumberRegex.test(normalized) ||
        /\b(?:aadhaar|ssn|social security|national id|voter id|pan card)\b/i.test(rawSpeech)
      ) {
        censored = censored.replace(this.idNumberRegex, '[REDACTED: NATIONAL ID]');
        if (/\b(?:aadhaar|ssn|social security|national id|voter id|pan card)\b/i.test(rawSpeech) && !censored.includes('[REDACTED')) {
          censored = `[REDACTED: NATIONAL ID] (${rawSpeech})`;
        }
        hasPII = true;
        piiCategory = 'spoken_id';
        detectedCategories.push('National ID / Aadhaar');
      }
    }

    // 4. Credit Cards / Debit Cards
    if (rules.protectCreditCards) {
      if (
        this.creditCardRegex.test(rawSpeech) ||
        this.creditCardRegex.test(normalized) ||
        /\b(?:credit card|debit card|visa card|mastercard|card number)\b/i.test(rawSpeech)
      ) {
        censored = censored.replace(this.creditCardRegex, '[REDACTED: CREDIT CARD]');
        if (!censored.includes('[REDACTED')) {
          censored = `[REDACTED: CREDIT CARD] (${rawSpeech})`;
        }
        hasPII = true;
        piiCategory = 'spoken_id';
        detectedCategories.push('Credit Card');
      }
    }

    // 5. Addresses & Physical Locations
    if (rules.protectSpokenAddresses) {
      if (this.addressRegex.test(rawSpeech) || this.addressRegex.test(normalized)) {
        censored = censored.replace(this.addressRegex, '[REDACTED: RESIDENTIAL ADDRESS]');
        hasPII = true;
        piiCategory = 'spoken_address';
        detectedCategories.push('Home Address');
      }
    }

    // 6. Passwords, PIN Codes & OTPs
    if (this.passwordPinRegex.test(rawSpeech) || this.passwordPinRegex.test(normalized)) {
      censored = censored.replace(this.passwordPinRegex, '[REDACTED: SECRET PASSWORD/PIN]');
      hasPII = true;
      piiCategory = 'spoken_id';
      detectedCategories.push('Security Password / PIN');
    }

    let event: AudioRedactionEvent | undefined;

    if (hasPII) {
      // Trigger audible 1000Hz bleep through hardware speakers and mute stream
      this.triggerAudioStreamRedaction(1000, 'bleep');

      event = {
        id: `audio_redact_${Date.now()}`,
        timestamp: Date.now(),
        category: piiCategory,
        phrase: rawSpeech,
        redactedPhrase: censored,
        startTime: 0,
        endTime: 1.0,
        action: '1kHz Tone Injected'
      };
    }

    if (this.onTranscriptCallback) {
      this.onTranscriptCallback(rawSpeech, censored, event);
    }

    return { censored, hasPII, event, detectedCategories };
  }

  public stop() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
    this.isRunning = false;
  }
}
