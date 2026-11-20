/**
 * 100% Synthetic and Compliant Demo Datasets for Evaluator Demonstrations.
 * All phone numbers, emails, ID numbers, and license plates are strictly fictitious test fixtures.
 */

export interface SyntheticScenario {
  id: string;
  name: string;
  category: 'face_whitelist' | 'id_ocr_pii' | 'license_plate' | 'audio_spoken_pii';
  title: string;
  description: string;
  badge: string;
  defaultVideoUrl?: string;
  mockDetections: Array<{
    category: 'face' | 'license_plate' | 'id_document' | 'sensitive_text' | 'phone_number' | 'email_address' | 'aadhaar_id';
    label: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rawText?: string;
    isWhitelisted?: boolean;
    ruleMatched: string;
    detail: string;
    metric: string;
    engine: 'Client Rule-Based Parser' | 'Backend YOLOv8-Face' | 'Backend YOLOv8-Plate' | 'Backend EasyOCR + Regex' | 'Client Face Matcher';
  }>;
  syntheticDocumentText?: {
    header: string;
    lines: Array<{
      text: string;
      isSensitive: boolean;
      piiType?: string;
      ruleMatched?: string;
    }>;
  };
  sampleAudioPhrases: Array<{
    speaker: string;
    rawSpeech: string;
    censoredSpeech: string;
    piiType: 'PHONE' | 'EMAIL' | 'ID_NUM' | 'ADDRESS' | 'CREDIT_CARD' | 'PASSWORD';
    startTime: number;
    endTime: number;
    ruleMatched: string;
  }>;
}

export const INITIAL_FACE_WHITELIST: any[] = [];

export const SYNTHETIC_SCENARIOS: SyntheticScenario[] = [
  {
    id: 'scenario_faces',
    name: 'Face Privacy & Whitelist',
    category: 'face_whitelist',
    title: 'Scenario 1: Face Anonymization & Host Whitelist',
    description: 'Demonstrates real-time face boundary detection. The registered Host remains visible while background/unauthorized faces are heavily blurred, pixelated, or cyber-shielded.',
    badge: 'Computer Vision',
    mockDetections: [
      {
        category: 'face',
        label: 'Host (Nikhil) - Whitelisted',
        confidence: 0.96,
        x: 0.16,
        y: 0.16,
        width: 0.32,
        height: 0.58,
        isWhitelisted: true,
        ruleMatched: 'Euclidean distance = 0.28 < threshold 0.65',
        detail: 'Recognized as Host (Nikhil). Privacy bypass active — face remains clear.',
        metric: 'Cosine Similarity: 0.89',
        engine: 'Client Face Matcher'
      },
      {
        category: 'face',
        label: 'Stranger Face (Unauthorized)',
        confidence: 0.94,
        x: 0.56,
        y: 0.18,
        width: 0.32,
        height: 0.56,
        isWhitelisted: false,
        ruleMatched: 'Face detected not matching any whitelisted profile',
        detail: 'Unregistered face in background. Privacy mask engaged with zero latency.',
        metric: 'Embedding Distance: 0.81 (Unmatched)',
        engine: 'Client Face Matcher'
      }
    ],
    sampleAudioPhrases: []
  },
  {
    id: 'scenario_ocr_id',
    name: 'Document OCR & Targeted PII',
    category: 'id_ocr_pii',
    title: 'Scenario 2: ID Document OCR & Selective PII Masking',
    description: '3-stage pipeline: Detects document, extracts text lines via OCR, identifies sensitive PII (Aadhaar, Phone, Email, Credit Card) and masks only those bounding boxes while keeping benign text visible.',
    badge: 'OCR + NLP Shield',
    syntheticDocumentText: {
      header: 'SYNTHETIC GOVERNMENT ID CARD (TEST SAMPLE)',
      lines: [
        { text: 'GOVERNMENT OF TESTLAND', isSensitive: false },
        { text: 'Holder: Rohan Sharma', isSensitive: false },
        { text: 'Role: Authorized Software Evaluator', isSensitive: false },
        { text: 'Aadhaar / ID No: XXXX-XXXX-9012', isSensitive: true, piiType: 'AADHAAR_ID', ruleMatched: 'Matched Pattern ^\\d{4}-\\d{4}-\\d{4}$' },
        { text: 'Emergency Phone: +91 98765 43210', isSensitive: true, piiType: 'PHONE_NUMBER', ruleMatched: 'Matched Phone Regex ^\\+?[1-9]\\d{9,12}$' },
        { text: 'Official Email: demo.user@example.test', isSensitive: true, piiType: 'EMAIL_ADDRESS', ruleMatched: 'Matched Email RFC 5322 regex' },
        { text: 'Security Pin: 4821', isSensitive: true, piiType: 'PASSWORD', ruleMatched: 'Matched Security PIN code' },
        { text: 'Card Validity: 2026 - 2030 (Valid)', isSensitive: false }
      ]
    },
    mockDetections: [
      {
        category: 'aadhaar_id',
        label: 'Aadhaar / ID Number',
        confidence: 0.98,
        x: 0.25,
        y: 0.40,
        width: 0.50,
        height: 0.07,
        rawText: 'XXXX-XXXX-9012',
        ruleMatched: 'Synthetic UIDAI Aadhaar 12-digit Format Pattern',
        detail: 'Classified as National Identification Number. Sensitive region targeted.',
        metric: 'NER Probability: 98.6%',
        engine: 'Client Rule-Based Parser'
      },
      {
        category: 'phone_number',
        label: 'Phone Number',
        confidence: 0.95,
        x: 0.25,
        y: 0.49,
        width: 0.48,
        height: 0.07,
        rawText: '+91 98765 43210',
        ruleMatched: 'E.164 International / National Phone Regex',
        detail: 'Classified as Personally Identifiable Contact Number.',
        metric: 'Regex Confidence: 95.2%',
        engine: 'Client Rule-Based Parser'
      },
      {
        category: 'email_address',
        label: 'Email Address',
        confidence: 0.97,
        x: 0.25,
        y: 0.58,
        width: 0.50,
        height: 0.07,
        rawText: 'demo.user@example.test',
        ruleMatched: 'Email Domain Pattern [a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}',
        detail: 'Classified as Personal Electronic Mail Identifier.',
        metric: 'Regex Match: 97.4%',
        engine: 'Client Rule-Based Parser'
      }
    ],
    sampleAudioPhrases: []
  },
  {
    id: 'scenario_plate',
    name: 'Vehicle License Plate Shield',
    category: 'license_plate',
    title: 'Scenario 3: Automated License Plate Anonymization',
    description: 'YOLOv8-Plate detector localizes motor vehicle registration numbers and masks them with temporal Kalman tracking to prevent roadside identity tracking.',
    badge: 'Edge YOLOv8',
    mockDetections: [
      {
        category: 'license_plate',
        label: 'License Plate: DL 01 AB 1234',
        confidence: 0.96,
        x: 0.36,
        y: 0.58,
        width: 0.28,
        height: 0.14,
        rawText: 'DL 01 AB 1234',
        ruleMatched: 'Standard HSRP Motor Vehicle Registration Plate',
        detail: 'Vehicle registration number localized and masked.',
        metric: 'YOLOv8-Plate IoU: 0.91',
        engine: 'Backend YOLOv8-Plate'
      }
    ],
    sampleAudioPhrases: []
  },
  {
    id: 'scenario_audio',
    name: 'Multimodal Audio Shield (All PII)',
    category: 'audio_spoken_pii',
    title: 'Scenario 4: Real-Time Spoken PII Redaction & 1kHz Bleep',
    description: 'Silero VAD + Speech Recognition + Regex/NLP classifier monitors speech in real-time. Verbal disclosures of phone numbers, emails, addresses, passwords, or IDs trigger an immediate 1000Hz censorship bleep on physical speakers and mute the output track.',
    badge: 'Speech & Audio DSP',
    mockDetections: [],
    sampleAudioPhrases: [
      {
        speaker: 'Stream Host',
        rawSpeech: 'My direct phone number is +91 98765 43210 for account verification.',
        censoredSpeech: 'My direct phone number is [REDACTED: PHONE NUMBER] for account verification.',
        piiType: 'PHONE',
        startTime: 0.5,
        endTime: 2.1,
        ruleMatched: 'E.164 Phone Number Entity'
      },
      {
        speaker: 'Stream Guest',
        rawSpeech: 'You can email me at alex.morgan@corporate.org with the contract.',
        censoredSpeech: 'You can email me at [REDACTED: EMAIL ADDRESS] with the contract.',
        piiType: 'EMAIL',
        startTime: 3.2,
        endTime: 4.8,
        ruleMatched: 'RFC 5322 Email Entity'
      }
    ]
  }
];
