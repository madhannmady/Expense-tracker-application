import { useState, useRef, useCallback } from 'react';
import { processVoice } from '../services/api';

/**
 * useVoiceRecorder
 * Handles MediaRecorder, audio level monitoring, silence detection,
 * and sending audio to the backend for voice CRUD processing.
 */
export function useVoiceRecorder({ pageType, pageContext, onActionComplete }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const maxDurationTimerRef = useRef(null);
  const hasSpeechRef = useRef(false);

  const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  /** Clean up all audio resources */
  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  /** Send recorded audio to backend */
  const processAudio = useCallback(async (audioBlob) => {
    setIsProcessing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('pageType', pageType);
      formData.append('context', JSON.stringify(pageContext || {}));

      const { data } = await processVoice(formData);
      setTranscript(data.transcript || '');

      if (onActionComplete) {
        onActionComplete(data.transcript, data.actions || []);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 429 ? 'Rate limited — please wait a moment.' : 'Voice processing failed.');
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [pageType, pageContext, onActionComplete]);

  /** Monitor audio level + silence detection */
  const startAnalysis = useCallback((stream, onStop) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    hasSpeechRef.current = false;

    const SILENCE_THRESHOLD = 10;
    const SILENCE_DURATION = 2500; // 2.5s of silence auto-stops

    const loop = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const level = Math.min(avg / 60, 1);
      setAudioLevel(level);

      const isSilent = avg < SILENCE_THRESHOLD;

      if (!isSilent) {
        hasSpeechRef.current = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (hasSpeechRef.current && !silenceTimerRef.current) {
        // Start silence timer after speech was detected
        silenceTimerRef.current = setTimeout(() => {
          onStop();
        }, SILENCE_DURATION);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    cleanup();
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser.');
      return;
    }
    setError('');
    setTranscript('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // Pick the best supported MIME type
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        '',
      ].find((m) => !m || MediaRecorder.isTypeSupported(m)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        if (blob.size < 1000) {
          setError('Recording too short. Please try again.');
          return;
        }
        await processAudio(blob);
      };

      recorder.start(250); // collect chunks every 250ms
      setIsListening(true);

      // Auto-stop after 1 minute of recording regardless of speech
      maxDurationTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 60000);

      startAnalysis(stream, stopRecording);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow mic access and try again.');
      } else {
        setError('Could not start recording. Check microphone.');
      }
      cleanup();
    }
  }, [isSupported, processAudio, startAnalysis, stopRecording, cleanup]);

  const toggle = useCallback(() => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isListening, startRecording, stopRecording]);

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    audioLevel,
    isSupported,
    toggle,
    stopRecording,
  };
}
