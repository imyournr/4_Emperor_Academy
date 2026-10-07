import React, { useState, useEffect, useRef } from "react";
import { Question, UserAttempt, ChallengeConfig } from "../types";
import {
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Square,
  User,
  BookmarkCheck,
  Award,
  Flag,
  Edit3,
  Save
} from "lucide-react";

interface SpeakerPreset {
  id: string;
  name: string;
  emoji: string;
  lang: string;
  gender: 'female' | 'male';
  pitch: number;
  rate: number;
}

const SPEAKERS: SpeakerPreset[] = [
  { id: "child-f", name: "เด็กผู้หญิง (Young Girl)", emoji: "👧", lang: "en-US", gender: "female", pitch: 1.10, rate: 0.86 },
  { id: "child-m", name: "เด็กผู้ชาย (Young Boy)", emoji: "👦", lang: "en-US", gender: "male", pitch: 1.05, rate: 0.86 },
  { id: "teen-f", name: "หญิงวัยรุ่น (Teen Girl)", emoji: "👩‍🦰", lang: "en-US", gender: "female", pitch: 1.02, rate: 0.84 },
  { id: "teen-m", name: "ชายวัยรุ่น (Teen Boy)", emoji: "🧑", lang: "en-US", gender: "male", pitch: 0.98, rate: 0.84 },
  { id: "adult-f", name: "หญิงผู้ใหญ่ (Adult Female)", emoji: "👩", lang: "en-US", gender: "female", pitch: 0.94, rate: 0.82 },
  { id: "adult-m", name: "ชายผู้ใหญ่ (Adult Male)", emoji: "👨", lang: "en-US", gender: "male", pitch: 0.90, rate: 0.82 },
  { id: "elder-f", name: "คุณยาย (Elderly Female)", emoji: "👵", lang: "en-US", gender: "female", pitch: 0.86, rate: 0.80 },
  { id: "elder-m", name: "คุณตา (Elderly Male)", emoji: "👴", lang: "en-US", gender: "male", pitch: 0.82, rate: 0.80 },
];

const getDisplayQuestionText = (text: string, isListening?: boolean, category?: string) => {
  const isListeningQuestion = isListening || 
                              category?.toLowerCase().includes("listening") || 
                              category?.toLowerCase().includes("conversation") || 
                              category?.toLowerCase().includes("audio");

  if (!isListeningQuestion) {
    return text;
  }
  
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  // Find lines that represent the actual question.
  // A question line usually starts with "Question:", "Q:", "Choose", "What", "How", "Why", "Which", "Where", "Who", "Select", "Complete", etc.
  const questionLines = lines.filter(line => {
    const lower = line.toLowerCase();
    
    // Explicit question cues
    if (lower.startsWith("question:") || lower.startsWith("q:") || lower.startsWith("choose") || lower.startsWith("select") || lower.startsWith("complete")) {
      return true;
    }
    
    // Check if it's a speaker dialogue line
    const isSpeakerLine = /^[A-Za-z0-9\s\-\_\(\)]+[:\-]/i.test(line) && !lower.startsWith("question:") && !lower.startsWith("q:");
    if (isSpeakerLine) {
      return false; // Filter out speaker dialogue!
    }
    
    // Check if it's bracketed context like [Conversation]
    if (line.startsWith("[") && line.endsWith("]")) {
      return false;
    }
    
    // If it contains a question mark and is not a speaker line, it's highly likely to be the question!
    if (line.includes("?")) {
      return true;
    }
    
    return false;
  });

  if (questionLines.length > 0) {
    // Return only the question lines, but strip any "Question:" or "Q:" prefix for clean rendering!
    return questionLines.map(line => line.replace(/^(question|q)[:\-]\s*/gi, "")).join("\n").trim();
  }

  // Fallback: If we couldn't find a line matching the question rules, we'll filter out speaker lines aggressively
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) return false;
    if (/^(transcript|audio|listening|script|passage)\s*:/i.test(trimmed)) return false;
    
    const isQuestionPrefix = /^(question|q)[:\-]/i.test(trimmed);
    const isSpeaker = !isQuestionPrefix && /^[A-Za-z0-9\s\-\_\(\)]+[:\-]/i.test(trimmed);
    if (isSpeaker) return false;
    
    return true;
  });

  const cleanedText = filteredLines.join("\n").trim();
  if (!cleanedText) {
    return "ฟังคลิปเสียงจำลองสถานการณ์ แล้วเลือกคำตอบข้อสอบที่ถูกต้องที่สุด (Listen to the audio to answer the question)";
  }
  return cleanedText;
};

export const renderFormattedQuestionText = (text: string, category?: string) => {
  const isErrorId = category?.toLowerCase().includes("error") || 
                    /\([a-dA-D1-4]\)/.test(text) ||
                    /\[[a-dA-D1-4]\]/.test(text) ||
                    text.includes("(1)") || text.includes("(2)") || text.includes("(3)") || text.includes("(4)");

  if (!isErrorId) {
    return <span className="whitespace-pre-line leading-relaxed">{text}</span>;
  }

  // Find all markers and their positions
  const markerRegex = /(\([a-dA-D1-4]\)|\[[a-dA-D1-4]\])/gi;
  const markers: { text: string; index: number; length: number }[] = [];
  let mMatch;
  while ((mMatch = markerRegex.exec(text)) !== null) {
    markers.push({
      text: mMatch[1],
      index: mMatch.index,
      length: mMatch[1].length
    });
  }

  if (markers.length === 0) {
    return <span className="whitespace-pre-line leading-relaxed">{text}</span>;
  }

  // Split into segments
  const segments: string[] = [];
  let lastIdx = 0;
  for (const m of markers) {
    segments.push(text.substring(lastIdx, m.index));
    lastIdx = m.index + m.length;
  }
  segments.push(text.substring(lastIdx)); // final segment after last marker

  // Determine if Prefix or Postfix style
  // We check Segment 0 (before first marker)
  const segment0Clean = segments[0]
    .replace(/identify the grammatical error:?/gi, "")
    .replace(/choose the incorrect part:?/gi, "")
    .replace(/error identification:?/gi, "")
    .trim();
  
  // If segment0Clean is substantial, it's Postfix style
  const isPostfix = segment0Clean.length > 3;

  const parts: React.ReactNode[] = [];

  // Helper to render a piece of text that should be parsed for underlines
  const renderUnderlinedSegment = (segmentText: string, markerLabel: string, keyPrefix: string) => {
    // Check for explicit underscores _word_
    if (segmentText.includes("_")) {
      const subParts: React.ReactNode[] = [];
      const subRegex = /_([^_]+)_/g;
      let subLastIdx = 0;
      let subMatch;
      let subKey = 0;
      while ((subMatch = subRegex.exec(segmentText)) !== null) {
        if (subMatch.index > subLastIdx) {
          subParts.push(<span key={`norm-${keyPrefix}-${subKey++}`}>{segmentText.substring(subLastIdx, subMatch.index)}</span>);
        }
        subParts.push(
          <span
            key={`err-${keyPrefix}-${subKey++}`}
            className="inline-flex flex-col items-center mx-1 pb-1 px-1 bg-indigo-50/50 border border-indigo-100 rounded-lg text-indigo-950 font-bold"
          >
            <span className="underline decoration-indigo-500 decoration-2 underline-offset-4 px-1.5">{subMatch[1].trim()}</span>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-100/70 rounded px-1.5 py-0.25 mt-0.5 min-w-4 text-center">
              {markerLabel.toUpperCase()}
            </span>
          </span>
        );
        subLastIdx = subRegex.lastIndex;
      }
      if (subLastIdx < segmentText.length) {
        subParts.push(<span key={`norm-end-${keyPrefix}`}>{segmentText.substring(subLastIdx)}</span>);
      }
      return <>{subParts}</>;
    }

    // No underscores: split at first natural punctuation separator: comma, period, semicolon, question, exclamation, or newline
    const separatorRegex = /([\s]*[,;\.\?!\n][\s]*)/;
    const splitMatch = segmentText.match(separatorRegex);

    if (splitMatch && splitMatch.index !== undefined) {
      const underlinedPart = segmentText.substring(0, splitMatch.index);
      const remainingPart = segmentText.substring(splitMatch.index);

      return (
        <>
          {underlinedPart.trim() ? (
            <span
              className="inline-flex flex-col items-center mx-1 pb-1 px-1 bg-indigo-50/50 border border-indigo-100 rounded-lg text-indigo-950 font-bold"
            >
              <span className="underline decoration-indigo-500 decoration-2 underline-offset-4 px-1.5">{underlinedPart.trim()}</span>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-100/70 rounded px-1.5 py-0.25 mt-0.5 min-w-4 text-center">
                {markerLabel.toUpperCase()}
              </span>
            </span>
          ) : null}
          <span>{remainingPart}</span>
        </>
      );
    } else {
      // Entire segment is underlined
      return (
        <span
          className="inline-flex flex-col items-center mx-1 pb-1 px-1 bg-indigo-50/50 border border-indigo-100 rounded-lg text-indigo-950 font-bold"
        >
          <span className="underline decoration-indigo-500 decoration-2 underline-offset-4 px-1.5">{segmentText.trim()}</span>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-100/70 rounded px-1.5 py-0.25 mt-0.5 min-w-4 text-center">
            {markerLabel.toUpperCase()}
          </span>
        </span>
      );
    }
  };

  if (isPostfix) {
    // Postfix layout: Segment i belongs to Marker i
    // Segment 0 contains both the introductory instructions and the actual first option sentence part.
    // Let's split Segment 0 into [intro] and [sentence part].
    let introText = "";
    let sentencePart = segments[0];

    // Split at last newline or colon if present
    const lastNewline = segments[0].lastIndexOf("\n");
    const lastColon = segments[0].lastIndexOf(":");
    const splitPoint = Math.max(lastNewline, lastColon);

    if (splitPoint !== -1) {
      introText = segments[0].substring(0, splitPoint + 1);
      sentencePart = segments[0].substring(splitPoint + 1);
    }

    if (introText) {
      parts.push(<span key="intro" className="text-slate-400 font-medium block mb-1 text-[11px] uppercase tracking-wider">{introText}</span>);
    }

    // Now loop over each marker and its corresponding segment
    for (let i = 0; i < markers.length; i++) {
      const activeSegment = i === 0 ? sentencePart : segments[i];
      const marker = markers[i];
      const cleanLabel = marker.text.replace(/[\(\)\[\]\s]/g, "");

      parts.push(<React.Fragment key={`postfix-${i}`}>{renderUnderlinedSegment(activeSegment, cleanLabel, `post-${i}`)}</React.Fragment>);
    }

    // Append any trailing text after the last marker
    if (segments[markers.length]) {
      parts.push(<span key="trailing">{segments[markers.length]}</span>);
    }

  } else {
    // Prefix layout: Segment i+1 belongs to Marker i
    // Segment 0 is just the intro/instructions
    if (segments[0].trim()) {
      parts.push(<span key="intro-prefix" className="text-slate-400 font-medium block mb-1 text-[11px] uppercase tracking-wider">{segments[0]}</span>);
    }

    for (let i = 0; i < markers.length; i++) {
      const activeSegment = segments[i + 1] || "";
      const marker = markers[i];
      const cleanLabel = marker.text.replace(/[\(\)\[\]\s]/g, "");

      parts.push(<React.Fragment key={`prefix-${i}`}>{renderUnderlinedSegment(activeSegment, cleanLabel, `pre-${i}`)}</React.Fragment>);
    }
  }

  return <span className="leading-relaxed whitespace-pre-line">{parts}</span>;
};

const getAudioKey = (q: Question | undefined): string => {
  if (!q) return "";
  const transcript = (q.listeningTranscript || "").trim();
  if (transcript) {
    return transcript.toLowerCase().replace(/\s+/g, " ");
  }
  return q.id;
};

interface QuizEngineProps {
  userId: string;
  questions: Question[];
  challengeConfig: ChallengeConfig;
  onFinishQuiz: (attempts: UserAttempt[]) => void;
  onClose: () => void;
  isAdmin?: boolean;
  onUpdateQuestion?: (qId: string, updatedFields: Partial<Question>) => void;
}

export default function QuizEngine({
  userId,
  questions,
  challengeConfig,
  onFinishQuiz,
  onClose,
  isAdmin = false,
  onUpdateQuestion
}: QuizEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(challengeConfig.timeLimitPerQuestion);
  const [sessionAttempts, setSessionAttempts] = useState<UserAttempt[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // AI Explain State
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  // Text-To-Speech (TTS) Listening Mode States
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("adult-f");
  const [speechSpeedMultiplier, setSpeechSpeedMultiplier] = useState<number>(0.85);
  const [showListeningTranscript, setShowListeningTranscript] = useState(false);
  const [playAttempts, setPlayAttempts] = useState<Record<string, number>>({});

  // Real-time Admin Question Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editFormText, setEditFormText] = useState("");
  const [editFormOptions, setEditFormOptions] = useState<string[]>(["", "", "", ""]);
  const [editFormCorrectIndex, setEditFormCorrectIndex] = useState(0);
  const [editFormExplanation, setEditFormExplanation] = useState("");
  const [editFormCategory, setEditFormCategory] = useState("");
  const [editFormExamSet, setEditFormExamSet] = useState("");
  const [editFormListeningTranscript, setEditFormListeningTranscript] = useState("");
  const [editFormIsListening, setEditFormIsListening] = useState(false);

  // Load and cache all TTS voices
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      updateVoices();
      if (window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      } else {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
      return () => {
        if (window.speechSynthesis.removeEventListener) {
          window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
        }
      };
    }
  }, []);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevQuestionRef = useRef<Question | null>(null);
  const currentQuestion = questions[currentIndex];

  // Reset states for each new question
  useEffect(() => {
    setSelectedOption(null);
    setIsSubmitted(false);
    setAiExplanation("");
    setAiError("");
    
    const currentQ = questions[currentIndex];
    if (currentQ) {
      setEditFormText(currentQ.text || "");
      setEditFormOptions(currentQ.options || ["", "", "", ""]);
      setEditFormCorrectIndex(currentQ.correctIndex !== undefined ? currentQ.correctIndex : 0);
      setEditFormExplanation(currentQ.explanation || "");
      setEditFormCategory(currentQ.category || "");
      setEditFormExamSet(currentQ.examSet || "");
      setEditFormListeningTranscript(currentQ.listeningTranscript || "");
      setEditFormIsListening(!!currentQ.isListening);
    }
    setIsEditing(false);

    // Check if the new question shares the same audio key as the previous question
    const prevQ = prevQuestionRef.current;
    
    const prevKey = prevQ ? getAudioKey(prevQ) : "";
    const currentKey = currentQ ? getAudioKey(currentQ) : "";

    // If different audio key, cancel the ongoing speech and reset playing state
    if (prevKey !== currentKey) {
      setIsPlayingSpeech(false);
      setShowListeningTranscript(false);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      // If it shares the same audio key, keep it playing seamlessly!
      // This allows continuous listening without interrupting the student
    }

    // Update the ref to the current question for the next transition
    prevQuestionRef.current = currentQ;

    setTimeRemaining(challengeConfig.timeLimitPerQuestion);

    // Set up timer if Challenge Mode is enabled
    if (challengeConfig.enabled && challengeConfig.timeLimitPerQuestion > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Cancel speech when leaving/unmounting
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentIndex, challengeConfig]);

  const existingAttempt = sessionAttempts.find((a) => a.questionId === currentQuestion?.id);
  const currentSelectedOption = existingAttempt ? existingAttempt.selectedIndex : selectedOption;
  const currentIsSubmitted = existingAttempt ? true : isSubmitted;

  // If user runs out of time
  const handleTimeOut = () => {
    setSelectedOption(-1); // timed out
    setIsSubmitted(true);
    recordAttempt(-1, false);
  };

  const handleOptionSelect = (optIndex: number) => {
    if (currentIsSubmitted) return; // Prevent double submit
    setSelectedOption(optIndex);
    setIsSubmitted(true);

    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = optIndex === currentQuestion.correctIndex;
    recordAttempt(optIndex, isCorrect);
  };

  const recordAttempt = (selectedIndex: number, isCorrect: boolean) => {
    const attempt: UserAttempt = {
      id: `attempt_${Date.now()}_${currentIndex}`,
      userId,
      questionId: currentQuestion.id,
      category: currentQuestion.category,
      selectedIndex,
      isCorrect,
      timestamp: Date.now(),
      timeSpent: challengeConfig.timeLimitPerQuestion - timeRemaining,
      isFlagged: flaggedQuestions[currentQuestion.id] || false
    };
    setSessionAttempts((prev) => [...prev, attempt]);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleFinish = () => {
    onFinishQuiz(sessionAttempts);
  };

  const getVoiceForSpeaker = (speakerId: string, gender: 'female' | 'male') => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voicesList = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const enVoices = voicesList.filter(v => v.lang.toLowerCase().startsWith("en") || v.lang.toLowerCase().includes("us") || v.lang.toLowerCase().includes("uk") || v.lang.toLowerCase().includes("gb"));
    if (enVoices.length === 0) return null;

    const lowerGender = gender.toLowerCase();
    
    // Explicit list of keywords for female vs male classification
    const femaleKeywords = ["female", "woman", "girl", "miss", "ms", "mrs", "zira", "samantha", "karen", "hazel", "moira", "tessa", "susan", "fiona", "veena", "heera", "clara", "victoria", "kathy", "princess", "siri"];
    const maleKeywords = ["male", "man", "boy", "guy", "sir", "mr", "david", "daniel", "ravi", "george", "mark", "richard", "rishi", "fred", "alex", "oliver"];

    // Partition English voices into male and female pools based on name keywords
    const femalePool = enVoices.filter(v => {
      const name = v.name.toLowerCase();
      if (name.includes("female")) return true;
      if (name.includes("male")) return false;
      return femaleKeywords.some(k => name.includes(k)) && !maleKeywords.some(k => name.includes(k));
    });

    const malePool = enVoices.filter(v => {
      const name = v.name.toLowerCase();
      if (name.includes("male")) return true;
      if (name.includes("female")) return false;
      return maleKeywords.some(k => name.includes(k)) || name.includes("david") || name.includes("daniel");
    });

    // Select pool based on request gender. Fallback if requested pool is empty.
    let pool = lowerGender === "female" ? femalePool : malePool;
    if (pool.length === 0) {
      // If female requested but pool empty, use remaining voices that are not classified as male
      if (lowerGender === "female") {
        pool = enVoices.filter(v => !malePool.includes(v));
      } else {
        pool = enVoices.filter(v => !femalePool.includes(v));
      }
    }
    if (pool.length === 0) {
      pool = enVoices; // ultimate fallback
    }

    // Custom mappings for child, teen, elder within the pool to provide distinct audio personas
    const isChild = speakerId.includes("child");
    const isElder = speakerId.includes("elder");
    const isTeen = speakerId.includes("teen");

    if (isChild) {
      const childMatch = pool.find(v => v.name.toLowerCase().includes("junior") || v.name.toLowerCase().includes("toy") || v.name.toLowerCase().includes("child") || v.name.toLowerCase().includes("kid"));
      if (childMatch) return childMatch;
    }
    
    if (isElder) {
      const elderMatch = pool.find(v => v.name.toLowerCase().includes("hazel") || v.name.toLowerCase().includes("susan") || v.name.toLowerCase().includes("george") || v.name.toLowerCase().includes("grand"));
      if (elderMatch) return elderMatch;
    }

    if (isTeen) {
      const teenMatch = pool.find(v => v.name.toLowerCase().includes("moira") || v.name.toLowerCase().includes("karen") || v.name.toLowerCase().includes("daniel") || v.name.toLowerCase().includes("clara"));
      if (teenMatch) return teenMatch;
    }

    // Determine deterministic voice slot index for this speaker to avoid same-gender duplicates
    const speakerIndex = SPEAKERS.findIndex(s => s.id === speakerId);
    const selectedVoice = pool[speakerIndex >= 0 ? (speakerIndex % pool.length) : 0];
    return selectedVoice || enVoices[0];
  };

  const isGenuineSpeaker = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    
    const len = trimmed.length;
    if (len > 12) return false; // speaker labels are short
    
    const lower = trimmed.toLowerCase();
    
    // Skip common non-speaker words
    if (lower.startsWith("question") || 
        lower.startsWith("note") || 
        lower.startsWith("direction") || 
        lower.startsWith("audio") || 
        lower.startsWith("transcript") || 
        lower.startsWith("passage") || 
        lower.startsWith("step") || 
        lower.startsWith("page") || 
        lower.startsWith("ex") || 
        lower.startsWith("http")) {
      return false;
    }
    
    // If it's purely digits, it's likely a list item like "1:" or a time, not a speaker
    if (/^\d+$/.test(trimmed)) return false;
    
    // If it contains spaces, make sure it's not a sentence fragment
    if (trimmed.includes(" ")) {
      // genuine names with spaces: "Speaker 1", "Old Man", "Young Girl", "Mr. Smith", "Ms. Lisa"
      const allowedPatterns = /^(speaker\s+\d+|[a-zA-Z\.\s]+)$/i;
      if (!allowedPatterns.test(trimmed)) return false;
    }
    
    return true;
  };

  const parseDialogue = (text: string): { text: string; speaker: SpeakerPreset }[] => {
    const queue: { text: string; speaker: SpeakerPreset }[] = [];

    let femalePreset = SPEAKERS.find(s => s.id === "adult-f") || SPEAKERS[4];
    let malePreset = SPEAKERS.find(s => s.id === "adult-m") || SPEAKERS[5];
    let girlPreset = SPEAKERS.find(s => s.id === "teen-f") || SPEAKERS[2];
    let boyPreset = SPEAKERS.find(s => s.id === "teen-m") || SPEAKERS[3];
    let elderFemalePreset = SPEAKERS.find(s => s.id === "elder-f") || SPEAKERS[6];
    let elderMalePreset = SPEAKERS.find(s => s.id === "elder-m") || SPEAKERS[7];

    const isChild = selectedSpeaker.includes("child");
    const isTeen = selectedSpeaker.includes("teen");
    const isElder = selectedSpeaker.includes("elder");

    if (isChild) {
      femalePreset = SPEAKERS.find(s => s.id === "child-f") || femalePreset;
      malePreset = SPEAKERS.find(s => s.id === "child-m") || malePreset;
      girlPreset = femalePreset;
      boyPreset = malePreset;
      elderFemalePreset = femalePreset;
      elderMalePreset = malePreset;
    } else if (isTeen) {
      femalePreset = SPEAKERS.find(s => s.id === "teen-f") || femalePreset;
      malePreset = SPEAKERS.find(s => s.id === "teen-m") || malePreset;
      girlPreset = femalePreset;
      boyPreset = malePreset;
      elderFemalePreset = femalePreset;
      elderMalePreset = malePreset;
    } else if (isElder) {
      femalePreset = SPEAKERS.find(s => s.id === "elder-f") || femalePreset;
      malePreset = SPEAKERS.find(s => s.id === "elder-m") || malePreset;
      girlPreset = femalePreset;
      boyPreset = malePreset;
      elderFemalePreset = femalePreset;
      elderMalePreset = malePreset;
    }

    let lastGenderUsed: "female" | "male" = "female";

    // Split the text into lines first
    const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);

    lines.forEach((line) => {
      // Find all speaker cues in the line to handle both inline and multi-line formats (e.g. "W: ... M: ...")
      const cueRegex = /\b(woman|man|teacher|student|speaker\s*\d+|speaker\s*[a-z]|boy|girl|doctor|nurse|clerk|officer|w|m|f|g|a|b|c|x|y)[:\-]\s*/gi;
      
      let match;
      const matches: { index: number; name: string; fullMatchLen: number }[] = [];
      while ((match = cueRegex.exec(line)) !== null) {
        if (isGenuineSpeaker(match[1])) {
          matches.push({
            index: match.index,
            name: match[1],
            fullMatchLen: match[0].length
          });
        }
      }

      if (matches.length > 0) {
        // We have speaker cues in this line! Split the line by these match indices.
        for (let i = 0; i < matches.length; i++) {
          const currentMatch = matches[i];
          const nextMatch = matches[i + 1];
          const startIndex = currentMatch.index + currentMatch.fullMatchLen;
          const endIndex = nextMatch ? nextMatch.index : line.length;
          const speechContent = line.substring(startIndex, endIndex).trim();

          if (speechContent.length === 0) continue;

          // Strip any residual trailing speaker symbols/cues
          let cleanedContent = speechContent.replace(/\s+\b(?:woman|man|teacher|student|speaker\s*\d+|speaker\s*[a-z]|boy|girl|doctor|nurse|clerk|officer|w|m|f|g|a|b|c|x|y)[:\-]\s*$/gi, "").trim();

          if (!cleanedContent) continue;

          const speakerName = currentMatch.name.trim().toLowerCase();
          let selected: SpeakerPreset = femalePreset;

          // Advanced gender & speaker profile mapping
          if (speakerName === "w" || speakerName === "f" || /^w\d+$/.test(speakerName) || /^f\d+$/.test(speakerName) || 
              speakerName.includes("woman") || speakerName.includes("lady") || speakerName.includes("girl") || 
              speakerName.includes("female") || speakerName.includes("mother") || speakerName.includes("wife") || 
              speakerName.includes("daughter") || speakerName.includes("sister") || speakerName.includes("she") || 
              speakerName.includes("ms") || speakerName.includes("mrs") || speakerName.includes("grandma") || 
              speakerName.includes("grandmother")) {
            selected = (speakerName.includes("girl") || speakerName.includes("daughter")) ? girlPreset : femalePreset;
            lastGenderUsed = "female";
          } else if (speakerName === "m" || speakerName === "g" || /^m\d+$/.test(speakerName) || /^g\d+$/.test(speakerName) || 
                     speakerName.includes("man") || speakerName.includes("boy") || speakerName.includes("gentleman") || 
                     speakerName.includes("male") || speakerName.includes("father") || speakerName.includes("husband") || 
                     speakerName.includes("son") || speakerName.includes("brother") || speakerName.includes("he") || 
                     speakerName.includes("mr") || speakerName.includes("grandpa") || speakerName.includes("grandfather")) {
            selected = (speakerName.includes("boy") || speakerName.includes("son")) ? boyPreset : malePreset;
            lastGenderUsed = "male";
          } else if (speakerName === "a" || speakerName === "1" || speakerName === "speaker 1" || speakerName === "speaker a") {
            selected = femalePreset;
            lastGenderUsed = "female";
          } else if (speakerName === "b" || speakerName === "2" || speakerName === "speaker 2" || speakerName === "speaker b") {
            selected = malePreset;
            lastGenderUsed = "male";
          } else {
            // General mapping for custom names or occupations
            const maleKeywords = ["doctor", "teacher", "clerk", "officer", "manager", "driver", "smith", "john", "michael", "robert", "james"];
            const femaleKeywords = ["nurse", "receptionist", "secretary", "hostess", "clerk", "lisa", "mary", "jane", "sarah"];
            
            let maleScore = 0;
            let femaleScore = 0;
            maleKeywords.forEach(k => { if (speakerName.includes(k)) maleScore++; });
            femaleKeywords.forEach(k => { if (speakerName.includes(k)) femaleScore++; });
            
            if (maleScore > femaleScore) {
              selected = malePreset;
              lastGenderUsed = "male";
            } else if (femaleScore > maleScore) {
              selected = femalePreset;
              lastGenderUsed = "female";
            } else {
              if (lastGenderUsed === "female") {
                selected = malePreset;
                lastGenderUsed = "male";
              } else {
                selected = femalePreset;
                lastGenderUsed = "female";
              }
            }
          }

          queue.push({ text: cleanedContent, speaker: selected });
        }
      } else {
        // Line doesn't have a matching speaker prefix - use currently selected speaker or female default
        const selected = SPEAKERS.find((s) => s.id === selectedSpeaker) || femalePreset;
        queue.push({ text: line, speaker: selected });
      }
    });

    return queue;
  };

  const handlePlaySpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("ขออภัย เบราว์เซอร์ของคุณไม่รองรับฟีเจอร์ Text-to-Speech สำหรับข้อสอบ Listening");
      return;
    }

    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
      return;
    }

    const currentAudioKey = getAudioKey(currentQuestion);
    const currentAttempts = playAttempts[currentAudioKey] || 0;
    if (currentAttempts >= 2) {
      alert("คุณใช้สิทธิ์ในการฟังเสียงโจทย์ข้อนี้ครบ 2 ครั้งแล้ว!");
      return;
    }

    const textToSpeak = currentQuestion.listeningTranscript || currentQuestion.text;
    if (!textToSpeak || !textToSpeak.trim()) return;

    // Robust check if content contains any genuine speaker label in its lines
    const lines = textToSpeak.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const hasSpeakers = lines.some(line => {
      const match = line.match(/^([A-Za-z0-9\s\-\_\.\(\)]+)[:\-]\s*(.*)$/);
      return match ? isGenuineSpeaker(match[1]) : false;
    });

    // Increment play attempt count
    setPlayAttempts(prev => ({
      ...prev,
      [currentAudioKey]: currentAttempts + 1
    }));

    setIsPlayingSpeech(true);
    window.speechSynthesis.cancel();

    if (hasSpeakers) {
      const queue = parseDialogue(textToSpeak);
      if (queue.length === 0) {
        setIsPlayingSpeech(false);
        return;
      }

      let index = 0;
      const speakNext = () => {
        if (index >= queue.length) {
          setIsPlayingSpeech(false);
          return;
        }

        const item = queue[index];
        const utterance = new SpeechSynthesisUtterance(item.text);
        const voice = getVoiceForSpeaker(item.speaker.id, item.speaker.gender);
        if (voice) {
          utterance.voice = voice;
        }
        utterance.lang = "en-US";
        utterance.pitch = item.speaker.pitch;
        utterance.rate = item.speaker.rate * speechSpeedMultiplier;

        utterance.onend = () => {
          index++;
          // Stagger pause slightly for natural conversation flow
          setTimeout(() => {
            speakNext();
          }, 300);
        };
        utterance.onerror = () => {
          index++;
          speakNext();
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    } else {
      // Monologue / Single voice: Automatically detect best voice gender based on text content!
      let cleanedText = textToSpeak;
      
      // Remove starting or inline speaker label cues like "Woman: ", "W: ", "Speaker 1: " from the text to speak
      cleanedText = cleanedText.replace(/^\s*\b(woman|man|teacher|student|speaker\s*\d+|speaker\s*[a-z]|boy|girl|doctor|nurse|clerk|officer|w|m|f|g|a|b|c|x|y)[:\-]\s*/gi, "").trim();
      cleanedText = cleanedText.replace(/\n\s*\b(woman|man|teacher|student|speaker\s*\d+|speaker\s*[a-z]|boy|girl|doctor|nurse|clerk|officer|w|m|f|g|a|b|c|x|y)[:\-]\s*/gi, "\n").trim();

      let detectedGender: "female" | "male" = "female"; // default to female voice
      const maleKeywords = ["man", "father", "husband", "son", "brother", "grandpa", "uncle", "boy", "mr.", "david", "john", "michael", "robert", "james"];
      const femaleKeywords = ["woman", "mother", "wife", "daughter", "sister", "grandma", "aunt", "girl", "ms.", "mrs.", "mary", "lisa", "jane", "sarah"];
      
      const lowerText = cleanedText.toLowerCase();
      let maleScore = 0;
      let femaleScore = 0;
      
      maleKeywords.forEach(k => { if (lowerText.includes(k)) maleScore++; });
      femaleKeywords.forEach(k => { if (lowerText.includes(k)) femaleScore++; });
      
      if (maleScore > femaleScore) {
        detectedGender = "male";
      }
      
      // Respect user selected speaker choice 100% with absolute priority!
      const speaker = SPEAKERS.find((s) => s.id === selectedSpeaker) || SPEAKERS[4];
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      const voice = getVoiceForSpeaker(speaker.id, speaker.gender);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.lang = "en-US";
      utterance.pitch = speaker.pitch;
      utterance.rate = speaker.rate * speechSpeedMultiplier;

      utterance.onend = () => {
        setIsPlayingSpeech(false);
      };
      utterance.onerror = () => {
        setIsPlayingSpeech(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Generate Gemini AI Extended Explanation
  const generateAIExplanation = async () => {
    if (!currentQuestion) return;
    setIsGeneratingAI(true);
    setAiExplanation("");
    setAiError("");

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: currentQuestion.text,
          choices: currentQuestion.options,
          correctAnswer: `${String.fromCharCode(97 + currentQuestion.correctIndex)}) ${currentQuestion.options[currentQuestion.correctIndex]}`,
          currentExplanation: currentQuestion.explanation
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      }

      setAiExplanation(data.explanation);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "ไม่สามารถดึงข้อมูลเฉลยพิเศษจาก AI ในขณะนี้ได้";
      if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
        msg = "ขณะนี้ระบบ Gemini AI มีผู้ใช้งานหนาแน่นสูงชั่วคราว กรุณากดใหม่อีกครั้งใน 1-2 นาทีครับ";
      }
      setAiError(msg);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm max-w-lg mx-auto">
        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="font-display font-semibold text-slate-800 text-lg">ไม่พบคำถามที่จะทำการทดสอบ</h3>
        <p className="text-sm text-slate-500 mt-2">
          กรุณาเลือกหมวดหมู่อื่น หรือนำเข้าไฟล์ข้อสอบในเมนู "Import ไฟล์" เพื่อเติมข้อสอบเข้าสู่คลัง
        </p>
        <button onClick={onClose} className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-all">
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  // Summary View
  if (showSummary) {
    const totalCount = questions.length;
    const correctCount = sessionAttempts.filter((a) => a.isCorrect).length;
    const scorePercent = Math.round((correctCount / totalCount) * 100);

    // Analyze performance per category in this session
    const categorySessionStats: Record<string, { total: number; correct: number }> = {};
    sessionAttempts.forEach((attempt) => {
      const q = questions.find((ques) => ques.id === attempt.questionId);
      if (q) {
        if (!categorySessionStats[q.category]) {
          categorySessionStats[q.category] = { total: 0, correct: 0 };
        }
        categorySessionStats[q.category].total += 1;
        if (attempt.isCorrect) {
          categorySessionStats[q.category].correct += 1;
        }
      }
    });

    const categoryAccuracies = Object.entries(categorySessionStats).map(([cat, stat]) => ({
      category: cat,
      accuracy: Math.round((stat.correct / stat.total) * 100),
      total: stat.total
    }));

    const sortedCats = [...categoryAccuracies].sort((a, b) => b.accuracy - a.accuracy);
    const bestTopic = sortedCats.length > 0 ? sortedCats[0] : null;
    const weakestTopic = sortedCats.length > 0 ? sortedCats[sortedCats.length - 1] : null;

    // Retrieve specific recommendation sets
    const recommendationSets = weakestTopic
      ? Array.from(new Set(
          questions
            .filter((q) => q.category === weakestTopic.category && q.examSet)
            .map((q) => q.examSet)
        )).slice(0, 3)
      : [];

    const fallbackRecommendations = weakestTopic 
      ? [`${weakestTopic.category} Practice Set 1`, `${weakestTopic.category} Practice Set 2`, `${weakestTopic.category} TGAT Prep 67`]
      : ["General Grammar Drill v1", "Academic Vocab List A", "TGAT Standard Mock"];

    const finalRecs = recommendationSets.length > 0 ? recommendationSets : fallbackRecommendations;

    // Filter flagged questions for review
    const flaggedList = questions.filter((q) => flaggedQuestions[q.id]);

    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-8 max-w-2xl mx-auto shadow-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-slate-900">ส่งข้อสอบเรียบร้อยแล้ว!</h2>
          <p className="text-xs text-slate-500">รายงานวิเคราะห์ทักษะเชิงลึกจากกิจกรรมการสอบล่าสุดของคุณ</p>
        </div>

        {/* Big Score Badge */}
        <div className="py-6 bg-slate-50 border border-slate-150 rounded-2xl max-w-md mx-auto text-center space-y-1">
          <div className="text-4xl font-black font-mono text-indigo-600">{scorePercent}%</div>
          <div className="text-xs font-bold text-slate-700">
            คะแนนสอบสะสม: {correctCount} / {totalCount} ข้อ
          </div>
          <div className="text-[10px] text-slate-400">
            (ตอบถูกต้องทั้งหมด {correctCount} ข้อ, ตอบผิด {totalCount - correctCount} ข้อ)
          </div>
        </div>

        {/* 📊 Category Performance Insights (Point 10) */}
        {sortedCats.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-display font-extrabold text-slate-850 text-xs uppercase tracking-wider text-left border-b border-slate-100 pb-2">
              📊 การวิเคราะห์ผลวิทยฐานะตามหมวดหมู่ข้อสอบ
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bestTopic && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-left space-y-1">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">🌟 หัวข้อที่ทำได้ดีที่สุด (Best Topic)</span>
                  <span className="font-bold text-slate-850 text-sm block truncate">{bestTopic.category}</span>
                  <span className="text-xs font-extrabold text-emerald-600 font-mono">{bestTopic.accuracy}% Accuracy</span>
                </div>
              )}

              {weakestTopic && (
                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-left space-y-1">
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">⚠️ หัวข้อที่ควรปรับปรุง (Weakest Topic)</span>
                  <span className="font-bold text-slate-850 text-sm block truncate">{weakestTopic.category}</span>
                  <span className="text-xs font-extrabold text-rose-600 font-mono">{weakestTopic.accuracy}% Accuracy</span>
                </div>
              )}
            </div>

            {/* Dynamic Recommendations based on weakest category */}
            {weakestTopic && (
              <div className="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-2xl text-left space-y-2">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">🚀 แหล่งเรียนรู้อุดรอยรั่วแนะนำตามสถิตินี้</span>
                <p className="text-xs text-slate-600">
                  ระบบวิเคราะห์ว่าคุณควรเสริมฐานข้อมูลในหัวข้อ <strong>"{weakestTopic.category}"</strong> ด้วยการฝึกฝนจากชุดข้อสอบเหล่านี้:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {finalRecs.map((set, sIdx) => (
                    <span key={sIdx} className="text-[11px] font-bold bg-white text-indigo-600 border border-indigo-150 px-2.5 py-1 rounded-xl shadow-xs">
                      📖 {set}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🚩 Flagged Questions Review block (Point 9) */}
        {flaggedList.length > 0 ? (
          <div className="space-y-3 text-left">
            <h3 className="font-display font-extrabold text-slate-850 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              🚩 ข้อที่คุณปักธงทบทวนไว้สำหรับการติวเข้ม ({flaggedList.length} ข้อ)
            </h3>
            <p className="text-xs text-slate-500">ระบบคัดกรองเฉพาะข้อสอบที่คุณทำเครื่องหมายไว้ ให้คุณตรวจสอบเฉลยและทำความเข้าใจจุดตัดของหลักภาษาก่อนบันทึกคะแนน</p>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {flaggedList.map((q, fIdx) => {
                const attempt = sessionAttempts.find((a) => a.questionId === q.id);
                return (
                  <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">ข้อที่ปักธง #{fIdx + 1}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        attempt?.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {attempt?.isCorrect ? "คุณตอบถูก" : "คุณตอบผิด"}
                      </span>
                    </div>
                    
                    <p className="font-bold text-slate-800 leading-relaxed whitespace-pre-line">{q.text}</p>
                    
                    <div className="bg-white border border-slate-150 p-3 rounded-xl space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ตัวเลือกที่ถูกต้อง:</p>
                      <p className="text-slate-800 font-semibold text-[11px]">
                        🟢 {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic border-t border-slate-100 pt-1.5 mt-1.5">
                        💡 เฉลย: {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 leading-relaxed">
            ไม่มีข้อสอบที่ปักธงทบทวน (Flagged for Review) ในการสอบรอบนี้
          </div>
        )}

        <div className="space-y-3 pt-4">
          <p className="text-xs text-slate-600 px-4 leading-relaxed italic text-center">
            {scorePercent >= 80
              ? "🌟 ยอดเยี่ยมมาก! คุณมีความเข้าใจในบทเรียนนี้อย่างสมบูรณ์แบบ รักษาความแม่นยำนี้ไว้นะครับ!"
              : scorePercent >= 50
              ? "👍 ทำดีมากครับ! มีความรู้อยู่ในเกณฑ์ดีเลย หากย้อนกลับไปทำข้อที่ผิดซ้ำสองในเมนู 'My Mistakes' จะเก่งขึ้นอีกรวดเร็วมาก!"
              : "💪 อย่าพึ่งท้อนะ! ทุกความผิดพลาดคือโอกาสในการเรียนรู้ แนะนำให้กดแอดข้อที่ผิดเข้าMistakes Bank เพื่อกลับมาทวนได้ตลอดเวลา"}
          </p>

          <button
            onClick={handleFinish}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-indigo-100 cursor-pointer"
          >
            บันทึกผลคะแนนและกลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Quiz Progress & Exit */}
      <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm("ต้องการย้อนกลับหน้าแรกใช่หรือไม่? คะแนนที่ทำไปแล้วในรอบนี้จะไม่ถูกบันทึก")) {
                onClose();
              }
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-bold text-xs shrink-0"
            title="ย้อนกลับหน้าแรก"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>กลับหน้าหลัก</span>
          </button>
          <div>
            <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">
              {currentQuestion.category} {(currentQuestion.examSet && `• ${currentQuestion.examSet}`)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ข้อที่ {currentIndex + 1} จากทั้งหมด {questions.length} ข้อ
            </span>
          </div>
        </div>

        {/* Timer UI if enabled */}
        {challengeConfig.enabled && challengeConfig.timeLimitPerQuestion > 0 && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border font-mono text-xs font-bold transition-colors ${
              timeRemaining <= 5
                ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeRemaining}s</span>
          </div>
        )}

        <button
          onClick={() => {
            if (confirm("ต้องการออกจากการฝึกทำข้อสอบใช่หรือไม่? คะแนนที่ทำไปแล้วในรอบนี้จะไม่ถูกบันทึก")) {
              onClose();
            }
          }}
          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>ออกจากการสอบ</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* ระบบเลขข้อเเบบคลิกกระโดดได้ (Quick Jump Grid) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">
            สารบัญข้อสอบ (คลิกเพื่อข้ามข้อได้ทันที)
          </span>
          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
            ความคืบหน้า: {sessionAttempts.length} / {questions.length} ข้อที่ตอบแล้ว
          </span>
        </div>
        
        {/* Scrollable Question Number Buttons */}
        <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto p-0.5">
          {questions.map((_, idx) => {
            const attempt = sessionAttempts.find((a) => a.questionId === questions[idx].id);
            const isActive = idx === currentIndex;
            
            let badgeStyle = "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700";
            if (isActive) {
              badgeStyle = "bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm ring-2 ring-indigo-500/20";
            } else if (attempt) {
              if (attempt.isCorrect) {
                badgeStyle = "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600";
              } else {
                badgeStyle = "bg-rose-500 text-white border-rose-500 hover:bg-rose-600";
              }
            }

            const isQuestionFlagged = flaggedQuestions[questions[idx].id] || false;

            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-8 h-8 rounded-lg border text-xs font-bold font-mono transition-all flex items-center justify-center shrink-0 cursor-pointer ${badgeStyle}`}
                title={`ข้อที่ ${idx + 1}${isQuestionFlagged ? " (ปักธงทบทวนแล้ว)" : ""}`}
              >
                <span>{idx + 1}</span>
                {isQuestionFlagged && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-rose-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm border border-white">
                    🚩
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ERGONOMIC NAVIGATION #1 (TOP NAVIGATION ROW) */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 disabled:cursor-not-allowed font-bold text-xs rounded-lg transition-all flex items-center gap-1 border border-slate-200/60 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>ข้อก่อนหน้า</span>
        </button>

        <span className="text-xs font-bold font-mono text-slate-500">
          ข้อที่ {currentIndex + 1} / {questions.length}
        </span>

        <button
          onClick={handleNext}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
        >
          <span>{currentIndex === questions.length - 1 ? "ดูคะแนนรวม" : "ข้อถัดไป / ข้าม"}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
        {isEditing ? (
          <div className="space-y-4 text-xs text-left animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5 text-indigo-600 font-extrabold text-sm">
                <Edit3 className="w-4 h-4" />
                <span>แผงแก้ไขข้อสอบเรียลไทม์ (Real-time Question Editor)</span>
              </div>
              <span className="text-[10px] text-slate-400">ID: {currentQuestion.id}</span>
            </div>

            {/* Hint for Error ID */}
            {currentQuestion.category?.toLowerCase().includes("error") && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] leading-relaxed text-indigo-950 font-medium">
                <strong>💡 คำแนะนำสำหรับ Error Identification:</strong> กรุณาใส่เครื่องหมาย <code>_</code> ครอบคำ/วลีที่ต้องการให้ขีดเส้นใต้ เช่น <code>The news (1) _were_ (2) very disappointing (3).</code> ระบบจะจัดการขีดเส้นใต้และจัดช่องตัวเลือกให้อย่างสวยงามและแม่นยำที่สุดโดยอัตโนมัติ
              </div>
            )}

            {/* Question Text */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-750">เนื้อหาโจทย์ข้อสอบ (Question Text):</label>
              <textarea
                value={editFormText}
                onChange={(e) => setEditFormText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              <label className="block font-bold text-slate-750">ตัวเลือกและกำหนดคำตอบที่ถูกต้อง (Choices & Answer Key):</label>
              <div className="space-y-2">
                {editFormOptions.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2 bg-slate-50/50 p-2 border border-slate-150 rounded-xl">
                    <input
                      type="radio"
                      name="editCorrectAnswer"
                      checked={editFormCorrectIndex === oIdx}
                      onChange={() => setEditFormCorrectIndex(oIdx)}
                      className="cursor-pointer"
                    />
                    <span className="font-bold text-indigo-600 text-[11px]">ตัวเลือก {String.fromCharCode(65 + oIdx)}:</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const updated = [...editFormOptions];
                        updated[oIdx] = e.target.value;
                        setEditFormOptions(updated);
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      placeholder={`ข้อ ${String.fromCharCode(65 + oIdx)}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Thai Explanation */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-750">คำอธิบายเฉลยภาษาไทย (Thai Explanation):</label>
              <textarea
                value={editFormExplanation}
                onChange={(e) => setEditFormExplanation(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl font-medium text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="วิเคราะห์เหตุผลและโครงสร้างไวยากรณ์..."
              />
            </div>

            {/* Category and ExamSet */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-750">หมวดหมู่ (Category):</label>
                <input
                  type="text"
                  value={editFormCategory}
                  onChange={(e) => setEditFormCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-750">ชุดข้อสอบ (Exam Set):</label>
                <input
                  type="text"
                  value={editFormExamSet}
                  onChange={(e) => setEditFormExamSet(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-255 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Listening Section Config */}
            <div className="bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/50 space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="editIsListening"
                  checked={editFormIsListening}
                  onChange={(e) => setEditFormIsListening(e.target.checked)}
                  className="cursor-pointer"
                />
                <label htmlFor="editIsListening" className="font-bold text-slate-750 cursor-pointer text-xs">
                  โจทย์ข้อนี้เป็น Listening (มีเสียงพูดจำลอง)
                </label>
              </div>

              {editFormIsListening && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-bold text-indigo-700">พิมพ์สคริปต์พูดโต้ตอบ (Spoken Transcript):</span>
                  <textarea
                    value={editFormListeningTranscript}
                    onChange={(e) => setEditFormListeningTranscript(e.target.value)}
                    rows={3}
                    placeholder="W: Hello!\nM: Hi there..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Save / Cancel Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateQuestion) {
                    onUpdateQuestion(currentQuestion.id, {
                      text: editFormText,
                      options: editFormOptions,
                      correctIndex: editFormCorrectIndex,
                      explanation: editFormExplanation,
                      category: editFormCategory,
                      examSet: editFormExamSet,
                      listeningTranscript: editFormListeningTranscript,
                      isListening: editFormIsListening
                    });
                  }
                  setIsEditing(false);
                }}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกการแก้ไข (Save)</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {currentQuestion.category}
                  </span>
                  {currentQuestion.examSet && (
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {currentQuestion.examSet}
                    </span>
                  )}
                  {currentQuestion.tags?.map((tag) => (
                    <span key={tag} className="text-[10px] bg-slate-100/80 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>แก้ไขโจทย์เรียลไทม์</span>
                    </button>
                  )}

                  {/* Mark for Review Toggle */}
                  <button
                    onClick={() => {
                      const qId = currentQuestion.id;
                      setFlaggedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      flaggedQuestions[currentQuestion.id]
                        ? "bg-rose-50 text-rose-600 border-rose-200 shadow-sm"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                    title="ปักธงข้อสอบนี้เพื่อกลับมาทวนหลังส่งกระดาษคำตอบ"
                  >
                    <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentQuestion.id] ? "fill-rose-500 text-rose-600 animate-bounce" : "text-slate-400"}`} />
                    <span>{flaggedQuestions[currentQuestion.id] ? "ปักธงทบทวนแล้ว" : "ปักธงทบทวน (Mark)"}</span>
                  </button>
                </div>
              </div>

              {/* Listening Comprehension Audio Widget */}
              {currentQuestion.isListening && (() => {
                const currentAudioKey = getAudioKey(currentQuestion);
                const attemptsLeft = Math.max(0, 2 - (playAttempts[currentAudioKey] || 0));
                return (
                  <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden my-3">
                    {/* Background Accent Wave Decorative Elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                          <Volume2 className="w-5 h-5" />
                        </span>
                        <div>
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">🎧 ระบบจำลองเสียงข้อสอบ (TTS Simulated Engine)</h5>
                          <p className="text-[10px] text-slate-400">สิทธิ์กดฟังรอบละ 2 ครั้งเพื่อความโปร่งใสแบบการสอบจริง</p>
                        </div>
                      </div>

                      {/* Play Attempts and Status indicators */}
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border shadow-2xs ${
                          attemptsLeft === 2 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : attemptsLeft === 1 
                              ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse" 
                              : "bg-rose-50 border-rose-200 text-rose-700"
                        }`}>
                          <span>สิทธิ์ฟังคงเหลือ: {attemptsLeft} / 2 ครั้ง</span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs">
                          <span className={`w-2 h-2 rounded-full ${isPlayingSpeech ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                          <span className={isPlayingSpeech ? "text-emerald-700 font-mono" : "text-slate-500"}>
                            {isPlayingSpeech ? "กำลังเล่นเสียง..." : "รอเล่นเสียง"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Play/Stop controls and waveform */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/80 p-3 rounded-xl border border-slate-200/50">
                      <button
                        type="button"
                        disabled={attemptsLeft === 0 && !isPlayingSpeech}
                        onClick={handlePlaySpeech}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
                          isPlayingSpeech
                            ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                            : attemptsLeft === 0
                              ? "bg-slate-300 text-slate-500 border-slate-300"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"
                        }`}
                      >
                        {isPlayingSpeech ? (
                          <>
                            <VolumeX className="w-4 h-4" />
                            <span>หยุดเล่นเสียง (Stop)</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>{attemptsLeft === 0 ? "สิทธิ์หมดแล้ว" : "ฟังเสียงโจทย์ (Listen Audio)"}</span>
                          </>
                        )}
                      </button>

                      {/* Animated CSS Waveform */}
                      <div className="flex-1 flex items-center justify-center gap-1 px-3 h-8 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 overflow-hidden">
                        {isPlayingSpeech ? (
                          <div className="flex items-end gap-1 h-5">
                            <span className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: "45%" }} />
                            <span className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: "85%", animationDelay: "150ms" }} />
                            <span className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: "100%", animationDelay: "300ms" }} />
                            <span className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: "65%", animationDelay: "450ms" }} />
                            <span className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: "35%", animationDelay: "100ms" }} />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            {attemptsLeft === 0 ? "คุณได้ใช้สิทธิ์การฟังครบ 2 ครั้งสำหรับข้อสอบข้อนี้แล้ว" : "กดปุ่มเพื่อเริ่มจำลองเสียงฟังข้อสอบ"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Speech Configuration Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-slate-200/50 pt-3.5">
                      {/* Speaker selection */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">👩‍🎤 ผู้พูดหลักสำรอง (Default Speaker)</label>
                        <select
                          value={selectedSpeaker}
                          onChange={(e) => setSelectedSpeaker(e.target.value)}
                          className="w-full bg-white border border-slate-250 hover:border-slate-350 px-2 py-1.5 rounded-lg text-slate-700 font-medium text-xs focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                          {SPEAKERS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.emoji} {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Speech speed selection */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">⚡ ความเร็วเสียงพูด (Speech Speed)</label>
                        <div className="flex items-center gap-1">
                          {[
                            { label: "ช้าสุด", val: 0.70 },
                            { label: "ปานกลาง", val: 0.85 },
                            { label: "ปกติ", val: 1.00 },
                            { label: "เร็ว", val: 1.15 }
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setSpeechSpeedMultiplier(opt.val)}
                              className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                speechSpeedMultiplier === opt.val
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                              }`}
                            >
                              {opt.val === 0.85 ? "⭐️ 0.85x" : `${opt.val}x`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reveal script after submission for learning */}
                    {currentIsSubmitted && (currentQuestion.listeningTranscript || currentQuestion.text) && (
                      <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-xl p-3.5 space-y-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setShowListeningTranscript(!showListeningTranscript)}
                          className="flex items-center justify-between w-full text-[11px] font-bold text-indigo-700 outline-none cursor-pointer"
                        >
                          <span>📜 เฉลยสคริปต์พูด (Show Audio Transcript)</span>
                          <span className="text-xs">{showListeningTranscript ? "▲ ซ่อนสคริปต์" : "▼ ดูสคริปต์"}</span>
                        </button>
                        {showListeningTranscript && (
                          <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-indigo-100/40 leading-relaxed font-mono whitespace-pre-line text-left">
                            {currentQuestion.listeningTranscript || currentQuestion.text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed text-left py-2">
                {renderFormattedQuestionText(getDisplayQuestionText(currentQuestion.text, currentQuestion.isListening, currentQuestion.category), currentQuestion.category)}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option, idx) => {
                const isCorrectOption = idx === currentQuestion.correctIndex;
                const isSelectedOption = idx === currentSelectedOption;

                let optionStyle = "border-slate-200 hover:bg-slate-50 hover:border-slate-300";
                let stateIcon = null;

                if (currentIsSubmitted) {
                  if (isCorrectOption) {
                    optionStyle = "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold";
                    stateIcon = <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
                  } else if (isSelectedOption) {
                    optionStyle = "bg-rose-50 border-rose-300 text-rose-800";
                    stateIcon = <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
                  } else {
                    optionStyle = "border-slate-100 opacity-60";
                  }
                } else if (isSelectedOption) {
                  // Highlight selected option before submission
                  optionStyle = "bg-indigo-50/50 border-indigo-400 text-indigo-950 font-medium shadow-2xs ring-1 ring-indigo-500/10";
                }

                return (
                  <button
                    key={idx}
                    disabled={currentIsSubmitted}
                    onClick={() => handleOptionSelect(idx)}
                    className={`w-full p-4 rounded-xl border text-left text-sm transition-all duration-200 flex items-center justify-between gap-3 ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          currentIsSubmitted && isCorrectOption
                            ? "bg-emerald-500 text-white"
                            : currentIsSubmitted && isSelectedOption
                            ? "bg-rose-500 text-white"
                            : isSelectedOption
                            ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-slate-700 text-sm font-medium">{option}</span>
                    </div>
                    {stateIcon}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Explanations & AI Coaching */}
      {currentIsSubmitted && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-bold text-slate-800 text-sm">เฉลยข้อสอบอย่างละเอียด</h4>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {currentQuestion.explanation}
          </p>

          {/* AI Explain Block */}
          {aiExplanation ? (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 space-y-3 animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>เฉลยอธิบายเพิ่มเติมแบบกระชับ โดย AI ครูสอนภาษา</span>
              </div>
              <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-normal">
                {aiExplanation}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                onClick={generateAIExplanation}
                disabled={isGeneratingAI}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-200 disabled:to-slate-200 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm shadow-indigo-100"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingAI ? "กำลังให้ AI แต่งเฉลยพิเศษ..." : "🤖 อธิบายเพิ่มด้วย AI"}
              </button>
              {aiError && <span className="text-xs text-rose-500">{aiError}</span>}
              {!isGeneratingAI && !aiExplanation && (
                <span className="text-[10px] text-slate-400">กดปุ่มสีม่วงเพื่อให้ AI ช่วยวิเคราะห์โครงสร้างภาษาเพิ่มในคลิกเดียว</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ERGONOMIC NAVIGATION #2 (STICKY BOTTOM NAVIGATION BAR - ALWAYS WITHIN REACH) */}
      <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-indigo-100 shadow-[0_-8px_30px_rgba(79,70,229,0.12)] flex items-center justify-between gap-3 animate-fade-in mt-6">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 disabled:cursor-not-allowed font-bold text-xs rounded-xl transition-all flex items-center gap-1 border border-slate-200/60 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>ข้อก่อนหน้า</span>
        </button>

        <span className="text-xs font-bold font-mono text-slate-500">
          ข้อที่ {currentIndex + 1} จาก {questions.length}
        </span>

        <button
          onClick={handleNext}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 hover:scale-[1.01]"
        >
          <span>{currentIndex === questions.length - 1 ? "ดูคะแนนรวม" : "ข้อถัดไป / ข้าม"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
