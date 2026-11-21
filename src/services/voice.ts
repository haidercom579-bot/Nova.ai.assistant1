/**
 * Speech Recognition, Audio Recording (for Gemini Transcription), and Speech Synthesis Service for NOVA
 */

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface AudioRecordingResult {
  audioBase64: string;
  mimeType: string;
}

export interface AudioRecorderHandlers {
  onStart?: () => void;
  onError?: (error: string) => void;
}

class VoiceService {
  private recognition: any = null;
  private isRecognizing: boolean = false;
  private intentionalRecognitionStop: boolean = false;

  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private recordingMimeType: string = 'audio/webm';
  private recordingStopResolver: ((result: AudioRecordingResult | null) => void) | null = null;

  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activeSpeakingId: string | null = null;
  private onSpeakingChangeCallbacks: Set<(id: string | null) => void> = new Set();

  private getSpeechRecognitionClass(): any {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }

  public isSpeechRecognitionSupported(): boolean {
    return Boolean(this.getSpeechRecognitionClass());
  }

  public isAudioRecordingSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getPreferredAudioMimeType(): string {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return 'audio/webm';
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  // --- Browser Speech Recognition (Web Speech API) ---

  public startListening(handlers: SpeechRecognitionHandlers): boolean {
    const SpeechRecognitionClass = this.getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      handlers.onError?.('not-supported');
      return false;
    }

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      handlers.onError?.('insecure-context');
      return false;
    }

    this.cleanupRecognitionInstance();

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
      this.recognition = recognition;
      this.intentionalRecognitionStop = false;

      recognition.onstart = () => {
        if (this.recognition !== recognition) return;
        this.isRecognizing = true;
        handlers.onStart?.();
      };

      recognition.onresult = (event: any) => {
        if (this.recognition !== recognition) return;
        let finalTranscript = '';
        let interimTranscript = '';

        // Accumulate all results in the current session so earlier phrases are preserved
        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          const segment = item?.[0]?.transcript || '';
          if (item.isFinal) {
            finalTranscript += segment;
          } else {
            interimTranscript += segment;
          }
        }

        const combined = `${finalTranscript}${interimTranscript}`.trim();
        const latestIsFinal = Boolean(
          event.results.length > 0 && event.results[event.results.length - 1]?.isFinal
        );
        handlers.onResult?.(combined, latestIsFinal);
      };

      recognition.onerror = (event: any) => {
        if (this.recognition !== recognition) return;
        const error = String(event?.error || 'speech_recognition_error');
        this.isRecognizing = false;

        if (this.intentionalRecognitionStop && error === 'aborted') {
          return;
        }
        handlers.onError?.(error);
      };

      recognition.onend = () => {
        if (this.recognition !== recognition) return;
        this.isRecognizing = false;
        const wasIntentional = this.intentionalRecognitionStop;
        this.recognition = null;
        this.intentionalRecognitionStop = false;
        if (!wasIntentional) {
          handlers.onEnd?.();
        }
      };

      try {
        recognition.start();
        this.isRecognizing = true;
        return true;
      } catch (startErr: any) {
        const message = String(startErr?.message || '');
        if (message.includes('already started')) {
          this.isRecognizing = true;
          handlers.onStart?.();
          return true;
        }
        this.isRecognizing = false;
        this.recognition = null;
        handlers.onError?.(
          startErr?.name === 'NotAllowedError'
            ? 'not-allowed'
            : startErr?.name === 'InvalidStateError'
            ? 'aborted'
            : message || 'start-failed'
        );
        return false;
      }
    } catch (e: any) {
      this.isRecognizing = false;
      this.recognition = null;
      handlers.onError?.(e?.message || 'Could not access microphone');
      return false;
    }
  }

  public stopListening(): void {
    this.intentionalRecognitionStop = true;
    this.cleanupRecognitionInstance();
  }

  private cleanupRecognitionInstance(): void {
    const current = this.recognition;
    if (current) {
      current.onstart = null;
      current.onresult = null;
      current.onerror = null;
      current.onend = null;
      try {
        current.stop();
      } catch {
        try {
          current.abort();
        } catch {
          // ignore
        }
      }
      this.recognition = null;
    }
    this.isRecognizing = false;
  }

  public getIsListening(): boolean {
    return this.isRecognizing;
  }

  // --- Microphone Recording Engine (for Gemini /api/transcribe) ---

  private async acquireMicrophoneStream(): Promise<MediaStream> {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      const err: any = new Error('Microphone requires HTTPS or localhost.');
      err.name = 'InsecureContextError';
      throw err;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const err: any = new Error('Microphone API unavailable in this browser.');
      err.name = 'NotSupportedError';
      throw err;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (constraintErr: any) {
      const name = String(constraintErr?.name || '');
      // Do not retry if the user explicitly blocked permission
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw constraintErr;
      }
      // Retry with universal bare audio constraint for headsets/virtual mics/webviews
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  }

  public async startRecording(handlers?: AudioRecorderHandlers): Promise<boolean> {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      handlers?.onError?.('insecure-context');
      return false;
    }
    if (!this.isAudioRecordingSupported()) {
      handlers?.onError?.('not-supported');
      return false;
    }

    this.cancelRecording();

    try {
      const stream = await this.acquireMicrophoneStream();
      this.mediaStream = stream;
      this.recordedChunks = [];

      const mimeType = this.getPreferredAudioMimeType();
      this.recordingMimeType = mimeType.split(';')[0] || 'audio/webm';

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        recorder = new MediaRecorder(stream);
        this.recordingMimeType = (recorder.mimeType || 'audio/webm').split(';')[0];
      }

      this.mediaRecorder = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        this.releaseMediaStream();
        if (this.recordingStopResolver) {
          const resolve = this.recordingStopResolver;
          this.recordingStopResolver = null;
          resolve(null);
        }
        handlers?.onError?.('audio-capture');
      };

      recorder.onstop = async () => {
        const chunks = [...this.recordedChunks];
        const mime = this.recordingMimeType;
        this.recordedChunks = [];
        this.mediaRecorder = null;
        this.releaseMediaStream();

        const resolver = this.recordingStopResolver;
        this.recordingStopResolver = null;

        if (!resolver) return;
        if (chunks.length === 0) {
          resolver(null);
          return;
        }

        try {
          const blob = new Blob(chunks, { type: mime });
          if (blob.size < 64) {
            resolver(null);
            return;
          }
          const audioBase64 = await this.blobToBase64(blob);
          resolver({ audioBase64, mimeType: mime });
        } catch {
          resolver(null);
        }
      };

      recorder.start(250);
      handlers?.onStart?.();
      return true;
    } catch (err: any) {
      this.releaseMediaStream();
      const errName = String(err?.name || '');
      const errMsg = String(err?.message || '');
      if (errName === 'InsecureContextError') {
        handlers?.onError?.('insecure-context');
      } else if (errName === 'NotSupportedError') {
        handlers?.onError?.('not-supported');
      } else if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('denied') ||
        errMsg.toLowerCase().includes('not allowed')
      ) {
        handlers?.onError?.('not-allowed');
      } else if (
        errName === 'NotFoundError' ||
        errName === 'DevicesNotFoundError' ||
        errName === 'NotReadableError' ||
        errName === 'AbortError'
      ) {
        handlers?.onError?.('audio-capture');
      } else {
        handlers?.onError?.(errMsg || 'audio-capture');
      }
      return false;
    }
  }

  public stopRecording(): Promise<AudioRecordingResult | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      this.releaseMediaStream();
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled && this.recordingStopResolver) {
          settled = true;
          this.recordingStopResolver = null;
          this.releaseMediaStream();
          resolve(null);
        }
      }, 2500);

      this.recordingStopResolver = (result) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(result);
      };

      try {
        if (this.mediaRecorder?.state === 'recording') {
          try {
            this.mediaRecorder.requestData();
          } catch {
            // Some browsers throw on requestData right before stop; ignore
          }
        }
        this.mediaRecorder?.stop();
      } catch {
        settled = true;
        window.clearTimeout(timeout);
        this.recordingStopResolver = null;
        this.releaseMediaStream();
        resolve(null);
      }
    });
  }

  public cancelRecording(): void {
    this.recordingStopResolver = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.onstop = null;
        this.mediaRecorder.onerror = null;
        this.mediaRecorder.ondataavailable = null;
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.releaseMediaStream();
  }

  private releaseMediaStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || '');
        const commaIndex = result.indexOf(',');
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      };
      reader.onerror = () => reject(new Error('Failed to encode audio'));
      reader.readAsDataURL(blob);
    });
  }

  // --- Speech Synthesis (Text to Speech) ---

  public speak(
    text: string,
    messageId: string,
    onEnd?: () => void,
    rate: number = 1.0,
    pitch: number = 1.0
  ): void {
    if (!this.isSpeechSynthesisSupported()) {
      onEnd?.();
      return;
    }

    this.stopSpeaking();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code snippet omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~#>-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = rate;
      utterance.pitch = pitch;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Google') ||
              v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel'))
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      let finished = false;
      const finishSpeech = () => {
        if (finished) return;
        finished = true;
        if (this.currentUtterance === utterance) {
          this.activeSpeakingId = null;
          this.currentUtterance = null;
          this.notifySpeakingChange();
        }
        onEnd?.();
      };

      this.activeSpeakingId = messageId;
      this.currentUtterance = utterance;
      this.notifySpeakingChange();

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      window.speechSynthesis.speak(utterance);
    } catch {
      this.activeSpeakingId = null;
      this.currentUtterance = null;
      this.notifySpeakingChange();
      onEnd?.();
    }
  }

  public stopSpeaking(): void {
    if (this.isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.activeSpeakingId = null;
    this.currentUtterance = null;
    this.notifySpeakingChange();
  }

  public getActiveSpeakingId(): string | null {
    return this.activeSpeakingId;
  }

  public isSpeaking(messageId?: string): boolean {
    if (!this.isSpeechSynthesisSupported()) return false;
    if (messageId) {
      return this.activeSpeakingId === messageId && window.speechSynthesis.speaking;
    }
    return window.speechSynthesis.speaking;
  }

  public subscribeToSpeakingChange(callback: (id: string | null) => void): () => void {
    this.onSpeakingChangeCallbacks.add(callback);
    return () => {
      this.onSpeakingChangeCallbacks.delete(callback);
    };
  }

  private notifySpeakingChange(): void {
    this.onSpeakingChangeCallbacks.forEach((cb) => cb(this.activeSpeakingId));
  }
}

export const voiceService = new VoiceService();
