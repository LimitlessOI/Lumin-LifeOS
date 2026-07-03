'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { apiGet, apiPost } from '@/lib/api';

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
import type { 
  ProgressResponse, 
  DailyLogResponse,
  PerfectDayStartResponse,
  PerfectDaySetupRequest,
  PerfectDaySetupResponse,
  ThreeImportantRequest,
  DayReviewRequest,
  DayReviewResponse,
  GetCommitmentsResponse,
  GetMomentsResponse,
  CreateSimulationResponse,
  StartSimulationResponse,
  RequestMediationResponse,
  ProcessMediationResponse,
  GetGoalsResponse,
  AnalyticsResponse,
  ProgressionResponse,
  GetCalendarEventsResponse
} from '@/lib/types';

interface OverlayState {
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed: boolean;
  isLocked: boolean;
  isDocked: 'left' | 'right' | 'top' | 'bottom' | null;
  isPinned: boolean; // For hover-peek mode
}

const STORAGE_KEY = 'always-on-overlay-state';
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;
const COLLAPSED_WIDTH = 60;
const COLLAPSED_HEIGHT = 40;
const SNAP_THRESHOLD = 50; // pixels from edge to snap

export default function AlwaysOnOverlay({ agentId }: { agentId: number }) {
  const [state, setState] = useState<OverlayState>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      x: window.innerWidth - DEFAULT_WIDTH - 20,
      y: 20,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      isCollapsed: false,
      isLocked: false,
      isDocked: null,
      isPinned: false,
    };
  });

  const [activeTab, setActiveTab] = useState<string>('today');
  const [progress, setProgress] = useState<ProgressResponse['progress'] | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLogResponse | null>(null);
  const [perfectDayRoutine, setPerfectDayRoutine] = useState<PerfectDayStartResponse | null>(null);
  const [perfectDaySetup, setPerfectDaySetup] = useState<any>(null);
  const [perfectDayCurrentStep, setPerfectDayCurrentStep] = useState<number>(0);
  const [perfectDayCompletedSteps, setPerfectDayCompletedSteps] = useState<Set<number>>(new Set());
  const [threeImportantThings, setThreeImportantThings] = useState<string[]>(['', '', '']);
  const [threeImportantCompleted, setThreeImportantCompleted] = useState<Set<number>>(new Set());
  const [reviewGrade, setReviewGrade] = useState<'great' | 'good' | 'poor' | ''>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<any>(null);
  const [perfectDayMode, setPerfectDayMode] = useState<'setup' | 'routine' | 'three-important' | 'review'>('setup');
  const [wakeUpTime, setWakeUpTime] = useState<string>('06:00');
  const [isSubmittingSetup, setIsSubmittingSetup] = useState(false);
  const [commitments, setCommitments] = useState<GetCommitmentsResponse | null>(null);
  const [moments, setMoments] = useState<GetMomentsResponse | null>(null);
  const [recordingConsent, setRecordingConsent] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moments-consent');
      return saved === 'true';
    }
    return false;
  });
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [momentFilter, setMomentFilter] = useState<'all' | 'winning_moment' | 'coaching_moment' | 'breakthrough'>('all');
  const [manualMomentType, setManualMomentType] = useState<'winning_moment' | 'coaching_moment' | 'breakthrough'>('winning_moment');
  const [manualMomentContext, setManualMomentContext] = useState<string>('');
  const [coachInput, setCoachInput] = useState<string>('');
  const [coachMessages, setCoachMessages] = useState<Array<{ role: 'user' | 'coach'; text: string; timestamp: Date }>>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [simulations, setSimulations] = useState<CreateSimulationResponse[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<StartSimulationResponse | null>(null);
  const [currentSimulationId, setCurrentSimulationId] = useState<number | null>(null);
  const [coachingStepIndex, setCoachingStepIndex] = useState<number>(0);
  const [talkLessTimer, setTalkLessTimer] = useState<number>(0); // seconds
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [talkLessInterval, setTalkLessInterval] = useState<NodeJS.Timeout | null>(null);
  const [mediations, setMediations] = useState<RequestMediationResponse[]>([]);
  const [goals, setGoals] = useState<GetGoalsResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [progression, setProgression] = useState<ProgressionResponse | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<GetCalendarEventsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load progress data and daily log
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load progress
        const progressData = await apiGet<ProgressResponse>(`/api/v1/boldtrail/progress/${agentId}`);
        if (progressData.ok && progressData.progress) {
          setProgress(progressData.progress);
        }

        // Load today's daily log (if endpoint exists)
        try {
          const today = new Date().toISOString().split('T')[0];
          // Note: This endpoint may need to be created - using perfect-day/review as reference
          // For now, we'll try to get it or use defaults
        } catch (logError) {
          // Daily log endpoint may not exist yet, use defaults
          console.warn('Daily log not available:', logError);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [agentId]);

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Handle drag stop - check for edge snapping
  const handleDragStop = useCallback((_e: MouseEvent | TouchEvent, d: { x: number; y: number }) => {
    if (state.isLocked) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let newDocked: 'left' | 'right' | 'top' | 'bottom' | null = null;
    let newX = d.x;
    let newY = d.y;

    // Check left edge
    if (d.x <= SNAP_THRESHOLD) {
      newDocked = 'left';
      newX = 0;
    }
    // Check right edge
    else if (d.x + state.width >= windowWidth - SNAP_THRESHOLD) {
      newDocked = 'right';
      newX = windowWidth - state.width;
    }
    // Check top edge
    if (d.y <= SNAP_THRESHOLD) {
      newDocked = 'top';
      newY = 0;
    }
    // Check bottom edge
    else if (d.y + state.height >= windowHeight - SNAP_THRESHOLD) {
      newDocked = 'bottom';
      newY = windowHeight - state.height;
    }

    setState(prev => ({
      ...prev,
      x: newX,
      y: newY,
      isDocked: newDocked,
    }));
  }, [state.isLocked, state.width, state.height]);

  // Handle resize stop
  const handleResizeStop = useCallback((_e: MouseEvent | TouchEvent, _direction: string, ref: HTMLElement) => {
    setState(prev => ({
      ...prev,
      width: ref.offsetWidth,
      height: ref.offsetHeight,
    }));
  }, []);

  // Toggle collapsed
  const toggleCollapsed = useCallback(() => {
    setState(prev => ({
      ...prev,
      isCollapsed: !prev.isCollapsed,
      width: prev.isCollapsed ? DEFAULT_WIDTH : COLLAPSED_WIDTH,
      height: prev.isCollapsed ? DEFAULT_HEIGHT : COLLAPSED_HEIGHT,
    }));
  }, []);

  // Toggle locked
  const toggleLocked = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLocked: !prev.isLocked,
    }));
  }, []);

  // Handle hover for peek mode
  const handleMouseEnter = useCallback(() => {
    if (state.isCollapsed && !state.isPinned) {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      // Show expanded on hover
      setState(prev => ({
        ...prev,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
      }));
    }
  }, [state.isCollapsed, state.isPinned, hoverTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (state.isCollapsed && !state.isPinned) {
      // Auto-close after delay
      const timeout = setTimeout(() => {
        setState(prev => ({
          ...prev,
          width: COLLAPSED_WIDTH,
          height: COLLAPSED_HEIGHT,
        }));
      }, 500);
      setHoverTimeout(timeout);
    }
  }, [state.isCollapsed, state.isPinned]);

  // Toggle pinned (for hover-peek)
  const togglePinned = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPinned: !prev.isPinned,
    }));
  }, []);

  // Talk less timer effect
  useEffect(() => {
    if (activeSimulation && !talkLessInterval) {
      const interval = setInterval(() => {
        setTalkLessTimer(prev => prev + 1);
      }, 1000);
      setTalkLessInterval(interval);
    } else if (!activeSimulation && talkLessInterval) {
      clearInterval(talkLessInterval);
      setTalkLessInterval(null);
    }
    
    return () => {
      if (talkLessInterval) {
        clearInterval(talkLessInterval);
      }
    };
  }, [activeSimulation]);

  // Recording reset timer effect (for moments tab)
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      // Check if 1 hour has passed, auto-reset
      const checkReset = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime.getTime();
        const oneHour = 60 * 60 * 1000;
        if (elapsed >= oneHour) {
          // Reset recording window
          setIsRecording(false);
          setRecordingStartTime(null);
          // Optionally restart automatically
        }
      }, 1000);
      return () => clearInterval(checkReset);
    }
  }, [isRecording, recordingStartTime]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setCoachInput(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          alert('Speech recognition error: ' + event.error);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, []);

  // Load tab-specific data
  useEffect(() => {
    const loadTabData = async () => {
      if (activeTab === 'today') {
        // Load today's data - would need endpoint
        // For now, use progress data
      } else if (activeTab === 'perfect-day') {
        // Check if setup exists, load routine if available
        // For now, we'll check when rendering
      } else if (activeTab === 'commitments') {
        try {
          const data = await apiGet<GetCommitmentsResponse>(
            `/api/v1/boldtrail/commitments/${agentId}`
          );
          if (data.ok) setCommitments(data);
        } catch (error) {
          console.error('Failed to load commitments:', error);
        }
      } else if (activeTab === 'moments') {
        try {
          const data = await apiGet<GetMomentsResponse>(
            `/api/v1/boldtrail/moments/${agentId}/playback`
          );
          if (data.ok) setMoments(data);
        } catch (error) {
          console.error('Failed to load moments:', error);
        }
        // Also check recording status if consent is given
        if (recordingConsent && isRecording && recordingStartTime) {
          // Timer for reset countdown (handled in render)
        }
      } else if (activeTab === 'progress') {
        // Already loaded in main useEffect
      } else if (activeTab === 'call-coach') {
        // Simulations would be loaded on demand
      } else if (activeTab === 'mediation') {
        // Mediations would be loaded on demand
      }
    };

    loadTabData();
  }, [activeTab, agentId]);

  // Render tab content
  const renderTabContent = () => {
    if (isLoading && activeTab === 'today') {
      return <div className="text-center py-4 text-slate-400">Loading...</div>;
    }

    switch (activeTab) {
      case 'today':
        return renderTodayTab();
      case 'perfect-day':
        return renderPerfectDayTab();
      case 'commitments':
        return renderCommitmentsTab();
      case 'call-coach':
        return renderCallCoachTab();
      case 'moments':
        return renderMomentsTab();
      case 'mediation':
        return renderMediationTab();
      case 'progress':
        return renderProgressTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return <div>Unknown tab</div>;
    }
  };

  // Tab renderers
  const renderTodayTab = () => {
    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-purple-300 mb-3">Today's Overview</div>
        
        {/* Day Score */}
        <div className="bg-slate-800/50 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-300">Today Score:</span>
            <span className="font-semibold text-green-300 text-lg">
              {todayScore || 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Integrity Score:</span>
            <span className="font-semibold text-blue-300">
              {integrityScore || 'N/A'}%
            </span>
          </div>
        </div>

        {/* Three Most Important */}
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-slate-300 text-xs mb-2">3 Most Important Today:</div>
          <div className="text-slate-400 text-xs">
            {/* Would load from daily log */}
            Set in Perfect Day tab
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-slate-400 text-xs">Goal Progress</div>
            <div className="text-purple-300 font-semibold">{Math.round(overallGoalProgress)}%</div>
          </div>
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-slate-400 text-xs">Open Escrows</div>
            <div className="text-yellow-300 font-semibold">{openEscrows}</div>
          </div>
        </div>

        {/* Next Action */}
        <div className="bg-purple-900/20 rounded p-2 border border-purple-500/30">
          <div className="text-purple-200 text-xs font-medium">Next Action:</div>
          <div className="text-purple-100 text-xs mt-1">{nextAction}</div>
        </div>
      </div>
    );
  };

  const renderPerfectDayTab = () => {
    // Mode selector buttons
    const modeButtons = (
      <div className="flex gap-1 mb-3 border-b border-slate-700 pb-2">
        {['setup', 'routine', 'three-important', 'review'].map((mode) => (
          <button
            key={mode}
            onClick={() => setPerfectDayMode(mode as any)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              perfectDayMode === mode
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {mode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>
    );

    // Render based on mode
    switch (perfectDayMode) {
      case 'setup':
        return renderPerfectDaySetup(modeButtons);
      case 'routine':
        return renderPerfectDayRoutine(modeButtons);
      case 'three-important':
        return renderThreeImportantThings(modeButtons);
      case 'review':
        return renderEndOfDayReview(modeButtons);
      default:
        return <div>Unknown mode</div>;
    }
  };

  const renderPerfectDaySetup = (modeButtons: JSX.Element) => {
    return (
      <div className="space-y-3">
        {modeButtons}
        <div className="text-sm font-semibold text-purple-300 mb-3">Perfect Day Setup</div>
        
        {perfectDaySetup && perfectDaySetup.wake_up_cost_analysis ? (
          <div className="space-y-3">
            <div className="bg-green-900/20 border border-green-500/30 rounded p-2">
              <div className="text-green-300 text-xs font-medium mb-1">✓ Setup Complete</div>
              <div className="text-slate-300 text-xs">Wake-up: {perfectDaySetup.perfect_day.wake_up_time}</div>
            </div>
            
            {perfectDaySetup.wake_up_cost_analysis && (
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-slate-300 text-xs font-medium mb-2">Cost Analysis</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hours Lost:</span>
                    <span className={`font-semibold ${
                      perfectDaySetup.wake_up_cost_analysis.impact === 'high' ? 'text-red-400' :
                      perfectDaySetup.wake_up_cost_analysis.impact === 'medium' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {perfectDaySetup.wake_up_cost_analysis.hours_lost}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Impact:</span>
                    <span className={`font-semibold capitalize ${
                      perfectDaySetup.wake_up_cost_analysis.impact === 'high' ? 'text-red-400' :
                      perfectDaySetup.wake_up_cost_analysis.impact === 'medium' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {perfectDaySetup.wake_up_cost_analysis.impact}
                    </span>
                  </div>
                  {perfectDaySetup.wake_up_cost_analysis.recommendation && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <div className="text-slate-300 text-xs">{perfectDaySetup.wake_up_cost_analysis.recommendation}</div>
                    </div>
                  )}
                  {perfectDaySetup.wake_up_cost_analysis.estimated_goal_reduction && (
                    <div className="text-yellow-400 text-xs mt-1">
                      ⚠️ {perfectDaySetup.wake_up_cost_analysis.estimated_goal_reduction}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={() => setPerfectDayMode('routine')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-xs font-medium"
            >
              Start Routine →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded p-2">
              <label className="text-slate-300 text-xs font-medium mb-1 block">Wake-Up Time</label>
              <input
                type="time"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
                className="w-full bg-slate-700 text-white px-2 py-1 rounded text-xs"
              />
            </div>
            
            <button
              onClick={async () => {
                setIsSubmittingSetup(true);
                try {
                  const data = await apiPost<PerfectDaySetupResponse>(
                    '/api/v1/boldtrail/perfect-day/setup',
                    {
                      agent_id: agentId,
                      wake_up_time: wakeUpTime,
                      goal_reading_time: 5,
                      visualization_time: 10
                    } as PerfectDaySetupRequest
                  );
                  if (data.ok) {
                    setPerfectDaySetup(data);
                  }
                } catch (error) {
                  console.error('Failed to setup perfect day:', error);
                } finally {
                  setIsSubmittingSetup(false);
                }
              }}
              disabled={isSubmittingSetup}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded text-xs font-medium"
            >
              {isSubmittingSetup ? 'Setting up...' : 'Save Setup'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPerfectDayRoutine = (modeButtons: JSX.Element) => {
    const steps = [
      { id: 0, name: 'Goal Reading', key: 'step_1_goal_reading' },
      { id: 1, name: 'Visualize Day', key: 'step_2_visualize_day' },
      { id: 2, name: 'Visualize Life', key: 'step_3_visualize_life' },
      { id: 3, name: 'Inspire', key: 'step_4_inspiring_content' },
      { id: 4, name: 'Train', key: 'step_5_training' },
      { id: 5, name: 'Execute', key: 'step_6_practice_overlay' }
    ];

    const progressPercent = (perfectDayCompletedSteps.size / steps.length) * 100;

    if (!perfectDayRoutine) {
      return (
        <div className="space-y-3">
          {modeButtons}
          <div className="text-sm font-semibold text-purple-300 mb-3">Perfect Day Routine</div>
          <button
            onClick={async () => {
              try {
                const data = await apiPost<PerfectDayStartResponse>(
                  '/api/v1/boldtrail/perfect-day/start',
                  { agent_id: agentId }
                );
                if (data.ok) {
                  setPerfectDayRoutine(data);
                  setPerfectDayCurrentStep(0);
                  setPerfectDayCompletedSteps(new Set());
                }
              } catch (error) {
                console.error('Failed to start perfect day:', error);
              }
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-xs font-medium"
          >
            Start Perfect Day Routine
          </button>
        </div>
      );
    }

    const currentStepData = perfectDayRoutine.routine[steps[perfectDayCurrentStep].key as keyof typeof perfectDayRoutine.routine];

    return (
      <div className="space-y-3">
        {modeButtons}
        <div className="text-sm font-semibold text-purple-300 mb-3">Perfect Day Routine</div>
        
        {/* Progress Bar */}
        <div className="bg-slate-800/50 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-300 text-xs">Progress</span>
            <span className="text-purple-300 text-xs font-semibold">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Resume Button */}
        {perfectDayCompletedSteps.size > 0 && perfectDayCompletedSteps.size < steps.length && (
          <button
            onClick={() => {
              // Find first incomplete step
              const nextStep = steps.findIndex((_, idx) => !perfectDayCompletedSteps.has(idx));
              if (nextStep !== -1) setPerfectDayCurrentStep(nextStep);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-xs font-medium"
          >
            Resume at Step {steps.findIndex((_, idx) => !perfectDayCompletedSteps.has(idx)) + 1}
          </button>
        )}

        {/* Current Step */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-200 text-xs font-semibold">
              Step {perfectDayCurrentStep + 1}: {steps[perfectDayCurrentStep].name}
            </span>
            {perfectDayCompletedSteps.has(perfectDayCurrentStep) && (
              <span className="text-green-400 text-xs">✓ Complete</span>
            )}
          </div>
          
          {/* Step Content */}
          {perfectDayCurrentStep === 0 && currentStepData && typeof currentStepData === 'object' && 'goals' in currentStepData && (
            <div className="space-y-2">
              <div className="text-slate-300 text-xs mb-2">Read your goals:</div>
              {(currentStepData as any).goals.map((goal: any, idx: number) => (
                <div key={idx} className="bg-slate-800/50 rounded p-1.5 text-xs">
                  <div className="text-slate-200 font-medium">{goal.name}</div>
                  <div className="text-slate-400">Progress: {goal.progress}</div>
                </div>
              ))}
            </div>
          )}
          
          {perfectDayCurrentStep === 1 && currentStepData && typeof currentStepData === 'object' && 'prompts' in currentStepData && (
            <div className="space-y-2">
              <div className="text-slate-300 text-xs font-medium mb-1">Visualize Your Day</div>
              <div className="text-slate-400 text-xs">{(currentStepData as any).prompts.prompt}</div>
              <div className="text-slate-500 text-xs mt-1">
                Duration: {(currentStepData as any).duration_minutes} min
              </div>
            </div>
          )}
          
          {perfectDayCurrentStep === 2 && currentStepData && typeof currentStepData === 'object' && 'prompts' in currentStepData && (
            <div className="space-y-2">
              <div className="text-slate-300 text-xs font-medium mb-1">Visualize Your Life</div>
              <div className="text-slate-400 text-xs">{(currentStepData as any).prompts.prompt}</div>
              {(currentStepData as any).prompts.dream_house && (
                <div className="text-slate-300 text-xs mt-1">🏠 {(currentStepData as any).prompts.dream_house}</div>
              )}
              {(currentStepData as any).prompts.dream_vacation && (
                <div className="text-slate-300 text-xs">✈️ {(currentStepData as any).prompts.dream_vacation}</div>
              )}
            </div>
          )}
          
          {perfectDayCurrentStep === 3 && currentStepData && typeof currentStepData === 'object' && 'title' in currentStepData && (
            <div className="space-y-2">
              <div className="text-slate-300 text-xs font-medium mb-1">Inspiring Content</div>
              <div className="text-slate-200 text-xs">{(currentStepData as any).title}</div>
              {(currentStepData as any).url && (
                <a
                  href={(currentStepData as any).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 text-xs hover:underline"
                >
                  Watch/Read →
                </a>
              )}
            </div>
          )}
          
          {perfectDayCurrentStep === 4 && currentStepData && typeof currentStepData === 'object' && 'description' in currentStepData && (
            <div className="space-y-2">
              <div className="text-slate-300 text-xs font-medium mb-1">Training</div>
              <div className="text-slate-400 text-xs">{(currentStepData as any).description}</div>
              <div className="text-slate-500 text-xs">Type: {(currentStepData as any).type}</div>
            </div>
          )}
          
          {perfectDayCurrentStep === 5 && currentStepData && 'description' in currentStepData && (
            <div className="space-y-2">
              <div className="text-slate-300 text-xs font-medium mb-1">Practice Overlay</div>
              <div className="text-slate-400 text-xs">{(currentStepData as any).description}</div>
            </div>
          )}

          {/* Complete Button */}
          {!perfectDayCompletedSteps.has(perfectDayCurrentStep) && (
            <button
              onClick={() => {
                const newCompleted = new Set(perfectDayCompletedSteps);
                newCompleted.add(perfectDayCurrentStep);
                setPerfectDayCompletedSteps(newCompleted);
                
                // Auto-advance to next step
                if (perfectDayCurrentStep < steps.length - 1) {
                  setPerfectDayCurrentStep(perfectDayCurrentStep + 1);
                } else {
                  // All steps complete, go to three important
                  setPerfectDayMode('three-important');
                }
              }}
              className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-xs font-medium"
            >
              ✓ Complete Step
            </button>
          )}
        </div>

        {/* Step Navigation */}
        <div className="flex gap-1 overflow-x-auto">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setPerfectDayCurrentStep(step.id)}
              className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                perfectDayCurrentStep === step.id
                  ? 'bg-purple-600 text-white'
                  : perfectDayCompletedSteps.has(step.id)
                  ? 'bg-green-700/50 text-green-300'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {step.id + 1}. {step.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderThreeImportantThings = (modeButtons: JSX.Element) => {
    const hasAllThree = threeImportantThings.every(t => t.trim() !== '');

    return (
      <div className="space-y-3">
        {modeButtons}
        <div className="text-sm font-semibold text-purple-300 mb-3">3 Most Important Today</div>
        
        <div className="space-y-2">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="bg-slate-800/50 rounded p-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={threeImportantCompleted.has(idx)}
                  onChange={(e) => {
                    const newCompleted = new Set(threeImportantCompleted);
                    if (e.target.checked) {
                      newCompleted.add(idx);
                    } else {
                      newCompleted.delete(idx);
                    }
                    setThreeImportantCompleted(newCompleted);
                  }}
                  className="mt-1"
                  disabled={!threeImportantThings[idx]?.trim()}
                />
                <input
                  type="text"
                  value={threeImportantThings[idx]}
                  onChange={(e) => {
                    const newThings = [...threeImportantThings];
                    newThings[idx] = e.target.value;
                    setThreeImportantThings(newThings);
                  }}
                  placeholder={`Important thing ${idx + 1}...`}
                  className="flex-1 bg-slate-700 text-white px-2 py-1 rounded text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={async () => {
            try {
              const data = await apiPost<{ ok: boolean }>(
                '/api/v1/boldtrail/perfect-day/three-important',
                {
                  agent_id: agentId,
                  three_things: threeImportantThings.filter(t => t.trim() !== '')
                } as ThreeImportantRequest
              );
              if (data.ok) {
                // Show success feedback
                alert('Saved!');
              }
            } catch (error) {
              console.error('Failed to save three important things:', error);
            }
          }}
          disabled={!hasAllThree}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded text-xs font-medium"
        >
          Save Three Things
        </button>

        {threeImportantCompleted.size > 0 && (
          <div className="bg-green-900/20 border border-green-500/30 rounded p-2">
            <div className="text-green-300 text-xs">
              ✓ {threeImportantCompleted.size} of 3 completed
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEndOfDayReview = (modeButtons: JSX.Element) => {
    return (
      <div className="space-y-3">
        {modeButtons}
        <div className="text-sm font-semibold text-purple-300 mb-3">End of Day Review</div>
        
        {reviewSubmitted ? (
          <div className="space-y-3">
            <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
              <div className="text-green-300 text-xs font-medium mb-2">✓ Review Submitted</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Day Score:</span>
                  <span className="text-green-300 font-semibold">{reviewSubmitted.day_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">System Score:</span>
                  <span className="text-purple-300 font-semibold">{reviewSubmitted.system_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Integrity Score:</span>
                  <span className="text-blue-300 font-semibold">{reviewSubmitted.integrity_score}%</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setReviewSubmitted(null);
                setReviewGrade('');
                setReviewNotes('');
              }}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded text-xs font-medium"
            >
              Submit Another Review
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-800/50 rounded p-2">
              <label className="text-slate-300 text-xs font-medium mb-1 block">Grade Your Day</label>
              <select
                value={reviewGrade}
                onChange={(e) => setReviewGrade(e.target.value as any)}
                className="w-full bg-slate-700 text-white px-2 py-1 rounded text-xs"
              >
                <option value="">Select grade...</option>
                <option value="great">Great</option>
                <option value="good">Good</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div className="bg-slate-800/50 rounded p-2">
              <label className="text-slate-300 text-xs font-medium mb-1 block">Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="How did your day go? What went well? What could improve?"
                rows={4}
                className="w-full bg-slate-700 text-white px-2 py-1 rounded text-xs resize-none"
              />
            </div>

            <button
              onClick={async () => {
                try {
                  const data = await apiPost<DayReviewResponse>(
                    '/api/v1/boldtrail/perfect-day/review',
                    {
                      agent_id: agentId,
                      day_grade: reviewGrade || undefined,
                      notes: reviewNotes || undefined,
                      three_most_important_completed: threeImportantThings
                        .map((t, idx) => threeImportantCompleted.has(idx) ? t : null)
                        .filter((t): t is string => t !== null)
                    } as DayReviewRequest
                  );
                  if (data.ok) {
                    setReviewSubmitted({
                      day_score: data.day_score,
                      system_score: data.system_score,
                      integrity_score: data.integrity_score
                    });
                  }
                } catch (error) {
                  console.error('Failed to submit review:', error);
                }
              }}
              disabled={!reviewGrade}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded text-xs font-medium"
            >
              Submit Review
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCommitmentsTab = () => {
    if (!commitments) {
      return <div className="text-slate-400 text-xs">Loading commitments...</div>;
    }

    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-purple-300 mb-3">Goal Commitments</div>
        
        {commitments.commitments && commitments.commitments.length > 0 ? (
          commitments.commitments.map((commitment) => (
            <div key={commitment.id} className="bg-slate-800/50 rounded p-2">
              <div className="text-slate-200 text-xs font-medium mb-1">
                {commitment.goal_name}
              </div>
              <div className="text-slate-400 text-xs mb-1">
                {commitment.commitment_description}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`${commitment.status === 'active' ? 'text-green-400' : 'text-slate-500'}`}>
                  {commitment.status}
                </span>
                {commitment.penalty_type && (
                  <span className="text-red-400">Penalty: {commitment.penalty_type}</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-slate-400 text-xs">No commitments yet</div>
        )}
      </div>
    );
  };

  const renderCallCoachTab = () => {
    // Get current close and questions from active simulation
    const currentClose = activeSimulation?.guidance?.closes?.[0] || null;
    const questions = activeSimulation?.guidance?.questions || { must_ask: [], should_ask: [], could_ask: [] };
    const scriptSteps = activeSimulation?.guidance?.script?.steps || [];
    const currentStep = scriptSteps[coachingStepIndex] || null;

    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-purple-300 mb-3">Call Coach</div>

        {/* A) Script / Close Card */}
        {currentClose && (
          <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
            <div className="text-purple-200 text-xs font-semibold mb-2">Close: {currentClose.name || 'A/B Close'}</div>
            <div className="text-slate-200 text-xs bg-slate-800/50 rounded p-2 italic">
              "{typeof currentClose === 'object' ? currentClose.script : currentClose}"
            </div>
          </div>
        )}

        {/* B) Question Stack */}
        {(questions.must_ask?.length > 0 || questions.should_ask?.length > 0 || questions.could_ask?.length > 0) && (
          <div className="bg-slate-800/50 rounded p-2 space-y-2">
            <div className="text-slate-300 text-xs font-medium mb-2">Questions to Ask</div>
            
            {questions.must_ask && questions.must_ask.length > 0 && (
              <div>
                <div className="text-red-300 text-xs font-semibold mb-1">MUST ASK:</div>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-300 ml-2">
                  {questions.must_ask.map((q: any, idx: number) => (
                    <li key={idx}>{typeof q === 'string' ? q : q.question || q}</li>
                  ))}
                </ul>
              </div>
            )}

            {questions.should_ask && questions.should_ask.length > 0 && (
              <div className="mt-2">
                <div className="text-yellow-300 text-xs font-semibold mb-1">SHOULD ASK:</div>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-300 ml-2">
                  {questions.should_ask.map((q: any, idx: number) => (
                    <li key={idx}>{typeof q === 'string' ? q : q.question || q}</li>
                  ))}
                </ul>
              </div>
            )}

            {questions.could_ask && questions.could_ask.length > 0 && (
              <div className="mt-2">
                <div className="text-blue-300 text-xs font-semibold mb-1">COULD ASK:</div>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-300 ml-2">
                  {questions.could_ask.map((q: any, idx: number) => (
                    <li key={idx}>{typeof q === 'string' ? q : q.question || q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* C) Simulation */}
        <div className="bg-slate-800/50 rounded p-2 space-y-2">
          <div className="text-slate-300 text-xs font-medium mb-2">Simulation</div>
          
          {!activeSimulation ? (
            <div className="space-y-2">
              <button
                onClick={async () => {
                  try {
                    const data = await apiPost<CreateSimulationResponse>(
                      '/api/v1/boldtrail/simulations',
                      {
                        agent_id: agentId,
                        simulation_type: 'practice',
                        scenario_description: 'Practice call with guidance'
                      }
                    );
                    if (data.ok && data.simulation) {
                      setSimulations(prev => [...prev, data]);
                      setCurrentSimulationId(data.simulation.id);
                    }
                  } catch (error) {
                    console.error('Failed to create simulation:', error);
                  }
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-xs font-medium"
              >
                Create Simulation
              </button>

              {simulations.length > 0 && (
                <div className="space-y-1">
                  <div className="text-slate-400 text-xs">Or start existing:</div>
                  {simulations.map((sim) => (
                    <button
                      key={sim.simulation.id}
                      onClick={async () => {
                        try {
                          const data = await apiPost<StartSimulationResponse>(
                            `/api/v1/boldtrail/simulations/${sim.simulation.id}/start`,
                            { agent_id: agentId }
                          );
                          if (data.ok) {
                            setActiveSimulation(data);
                            setCurrentSimulationId(sim.simulation.id);
                            setCoachingStepIndex(0);
                            setTalkLessTimer(0);
                            setQuestionCount(0);
                            startTalkLessTimer();
                          }
                        } catch (error) {
                          console.error('Failed to start simulation:', error);
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-xs"
                    >
                      Start Simulation #{sim.simulation.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Step-by-step coaching prompts */}
              {scriptSteps.length > 0 && currentStep && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-purple-200 text-xs font-semibold">
                      Step {coachingStepIndex + 1} of {scriptSteps.length}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {Math.round((coachingStepIndex / scriptSteps.length) * 100)}%
                    </span>
                  </div>
                  <div className="text-slate-200 text-xs mt-2">
                    {typeof currentStep === 'string' ? currentStep : currentStep.prompt || currentStep.description || JSON.stringify(currentStep)}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {coachingStepIndex > 0 && (
                      <button
                        onClick={() => setCoachingStepIndex(prev => prev - 1)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-1 px-2 rounded text-xs"
                      >
                        ← Previous
                      </button>
                    )}
                    {coachingStepIndex < scriptSteps.length - 1 && (
                      <button
                        onClick={() => setCoachingStepIndex(prev => prev + 1)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-1 px-2 rounded text-xs"
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveSimulation(null);
                    setCoachingStepIndex(0);
                    setTalkLessTimer(0);
                    setQuestionCount(0);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded text-xs"
                >
                  End Simulation
                </button>
                <button
                  onClick={() => {
                    setQuestionCount(prev => prev + 1);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 px-3 rounded text-xs"
                >
                  ✓ Asked Question
                </button>
              </div>
            </div>
          )}
        </div>

        {/* D) "Talk less / Ask more" reminder meter */}
        {activeSimulation && (
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-slate-300 text-xs font-medium mb-2">Talk Less / Ask More</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-700/50 rounded p-2">
                <div className="text-slate-400 text-xs mb-1">Timer</div>
                <div className="text-purple-300 text-lg font-semibold">
                  {Math.floor(talkLessTimer / 60)}:{(talkLessTimer % 60).toString().padStart(2, '0')}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded p-2">
                <div className="text-slate-400 text-xs mb-1">Questions Asked</div>
                <div className="text-green-300 text-lg font-semibold">{questionCount}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {questionCount > 0 && talkLessTimer > 0 ? (
                <span className="text-yellow-300">
                  Avg: {Math.round(talkLessTimer / questionCount)}s per question
                </span>
              ) : (
                <span>Keep asking questions!</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMomentsTab = () => {
    // Calculate time until reset (1 hour = 3600 seconds)
    const resetIntervalSeconds = 3600;
    const elapsedSeconds = recordingStartTime 
      ? Math.floor((Date.now() - recordingStartTime.getTime()) / 1000)
      : 0;
    const timeUntilReset = Math.max(0, resetIntervalSeconds - elapsedSeconds);
    const minutesUntilReset = Math.floor(timeUntilReset / 60);
    const secondsUntilReset = timeUntilReset % 60;

    // Filter moments
    const filteredMoments = moments?.moments?.filter(m => 
      momentFilter === 'all' || m.moment_type === momentFilter
    ) || [];

    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-purple-300 mb-3">Meaningful Moments</div>

        {/* A) Consent Gate */}
        <div className="bg-slate-800/50 rounded p-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="consent-toggle"
              checked={recordingConsent}
              onChange={(e) => {
                const newConsent = e.target.checked;
                setRecordingConsent(newConsent);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('moments-consent', String(newConsent));
                }
                // If unchecking, stop recording
                if (!newConsent && isRecording) {
                  setIsRecording(false);
                  setRecordingStartTime(null);
                }
              }}
              className="w-4 h-4"
            />
            <label htmlFor="consent-toggle" className="text-slate-300 text-xs cursor-pointer">
              I consent to recording meaningful moments
            </label>
          </div>
          {recordingConsent && (
            <div className="mt-2 text-xs text-slate-400">
              Your moments will be recorded and can be played back when you need motivation.
            </div>
          )}
        </div>

        {/* B) Controls */}
        {recordingConsent && (
          <div className="bg-slate-800/50 rounded p-2 space-y-2">
            <div className="text-slate-300 text-xs font-medium mb-2">Recording Controls</div>
            
            {/* Start Recording Window */}
            <div className="space-y-2">
              {!isRecording ? (
                <button
                  onClick={async () => {
                    try {
                      const data = await apiPost<{ ok: boolean; message: string; reset_interval_minutes: number }>(
                        '/api/v1/boldtrail/moments/start-recording',
                        {
                          agent_id: agentId,
                          consent: true,
                          reset_interval_minutes: 60
                        }
                      );
                      if (data.ok) {
                        setIsRecording(true);
                        setRecordingStartTime(new Date());
                      }
                    } catch (error) {
                      console.error('Failed to start recording:', error);
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-xs font-medium"
                >
                  Start Recording Window
                </button>
              ) : (
                <div className="bg-green-900/20 border border-green-500/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-green-300 text-xs font-medium">Recording Active</span>
                    <span className="text-green-400 text-xs">
                      Resets in: {minutesUntilReset}:{secondsUntilReset.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    Auto-detecting winning and coaching moments...
                  </div>
                  <button
                    onClick={() => {
                      setIsRecording(false);
                      setRecordingStartTime(null);
                    }}
                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded text-xs"
                  >
                    Stop Recording
                  </button>
                </div>
              )}
            </div>

            {/* Manual Save Moment */}
            <div className="border-t border-slate-700 pt-2 mt-2">
              <div className="text-slate-300 text-xs font-medium mb-2">Manual Capture</div>
              <div className="space-y-2">
                <select
                  value={manualMomentType}
                  onChange={(e) => setManualMomentType(e.target.value as any)}
                  className="w-full bg-slate-700 text-white px-2 py-1 rounded text-xs"
                >
                  <option value="winning_moment">🏆 Winning Moment</option>
                  <option value="coaching_moment">📚 Coaching Moment</option>
                  <option value="breakthrough">💡 Breakthrough</option>
                </select>
                <textarea
                  value={manualMomentContext}
                  onChange={(e) => setManualMomentContext(e.target.value)}
                  placeholder="What happened? Why is this meaningful?"
                  rows={3}
                  className="w-full bg-slate-700 text-white px-2 py-1 rounded text-xs resize-none"
                />
                <button
                  onClick={async () => {
                    if (!manualMomentContext.trim()) {
                      alert('Please enter context for this moment');
                      return;
                    }
                    try {
                      // NOTE: This endpoint doesn't exist yet - needs to be created
                      // For now, we'll try to call it and note the error
                      const data = await apiPost<{ ok: boolean; moment?: any; error?: string }>(
                        '/api/v1/boldtrail/moments/capture',
                        {
                          agent_id: agentId,
                          moment_type: manualMomentType,
                          context: manualMomentContext,
                          transcript: '',
                          tags: []
                        }
                      );
                      if (data.ok) {
                        setManualMomentContext('');
                        setManualMomentType('winning_moment');
                        // Reload moments
                        try {
                          const momentsData = await apiGet<GetMomentsResponse>(
                            `/api/v1/boldtrail/moments/${agentId}/playback`
                          );
                          if (momentsData.ok) setMoments(momentsData);
                        } catch (error) {
                          console.error('Failed to reload moments:', error);
                        }
                        alert('Moment saved!');
                      } else {
                        alert(data.error || 'Failed to save moment');
                      }
                    } catch (error: any) {
                      console.error('Failed to save moment:', error);
                      // If endpoint doesn't exist, show helpful message
                      if (error.status === 404 || error.message?.includes('404')) {
                        alert('Save moment endpoint not yet implemented. Please use auto-detection or contact support.');
                      } else {
                        alert('Failed to save moment. Please try again.');
                      }
                    }
                  }}
                  disabled={!manualMomentContext.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded text-xs font-medium"
                >
                  Save Moment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* C) Playback List with Filters */}
        <div className="bg-slate-800/50 rounded p-2 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-slate-300 text-xs font-medium">Playback</div>
            <select
              value={momentFilter}
              onChange={(e) => setMomentFilter(e.target.value as any)}
              className="bg-slate-700 text-white px-2 py-1 rounded text-xs"
            >
              <option value="all">All Types</option>
              <option value="winning_moment">🏆 Winning</option>
              <option value="coaching_moment">📚 Coaching</option>
              <option value="breakthrough">💡 Breakthrough</option>
            </select>
          </div>

          {filteredMoments.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredMoments.map((moment) => (
                <div key={moment.id} className="bg-slate-700/50 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-200 text-xs font-medium">
                      {moment.moment_type === 'winning_moment' ? '🏆' : 
                       moment.moment_type === 'coaching_moment' ? '📚' : '💡'} 
                      {moment.moment_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {new Date(moment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {moment.context && (
                    <div className="text-slate-400 text-xs mb-1">{moment.context}</div>
                  )}
                  {moment.transcript && (
                    <div className="text-slate-500 text-xs italic mb-1">
                      "{moment.transcript.substring(0, 100)}..."
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-slate-500 text-xs">
                      Played {moment.playback_count} time{moment.playback_count !== 1 ? 's' : ''}
                    </span>
                    {moment.recording_url && (
                      <button
                        onClick={() => {
                          // Open recording URL in new tab or play audio
                          window.open(moment.recording_url, '_blank');
                        }}
                        className="text-purple-400 hover:text-purple-300 text-xs"
                      >
                        ▶ Play
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 text-xs text-center py-4">
              {momentFilter === 'all' 
                ? 'No moments captured yet' 
                : `No ${momentFilter.replace('_', ' ')} moments yet`}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMediationTab = () => {
    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-purple-300 mb-3">Relationship Mediation</div>
        
        <button
          onClick={async () => {
            // Would open mediation request form
            console.log('Request mediation');
          }}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-xs font-medium"
        >
          Request Mediation
        </button>

        <div className="text-slate-400 text-xs mt-3">
          Get help resolving conflicts with spouse, children, customers, or business partners.
        </div>
      </div>
    );
  };

  const renderProgressTab = () => {
    if (!progress) {
      return <div className="text-slate-400 text-xs">Loading progress...</div>;
    }

    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-purple-300 mb-3">Progress Overview</div>
        
        {/* Goals */}
        {progress.goals && progress.goals.length > 0 && (
          <div className="space-y-2">
            <div className="text-slate-300 text-xs font-medium">Goals:</div>
            {progress.goals.map((goal) => (
              <div key={goal.goal_id} className="bg-slate-800/50 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-200 text-xs">{goal.goal_name}</span>
                  <span className="text-purple-300 text-xs font-semibold">
                    {goal.progress_percent}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{ width: `${goal.progress_percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activities */}
        {progress.activities && progress.activities.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-slate-300 text-xs font-medium">Activities:</div>
            {progress.activities.map((activity, idx) => (
              <div key={idx} className="bg-slate-800/50 rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-xs capitalize">{activity.activity_type}</span>
                  <span className="text-green-300 text-xs">
                    {activity.success_rate}% success
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Handle coach input submit
  const handleCoachSubmit = async () => {
    if (!coachInput.trim()) return;

    const userMessage = coachInput.trim();
    setCoachInput('');
    
    // Add user message to chat
    const newUserMessage = {
      role: 'user' as const,
      text: userMessage,
      timestamp: new Date()
    };
    setCoachMessages(prev => [...prev, newUserMessage]);

    // Log locally
    console.log('[Coach] User:', userMessage);
    if (typeof window !== 'undefined') {
      const chatLog = JSON.parse(localStorage.getItem('coach-chat-log') || '[]');
      chatLog.push({ ...newUserMessage, agentId });
      localStorage.setItem('coach-chat-log', JSON.stringify(chatLog.slice(-50))); // Keep last 50
    }

    try {
      // Try coach endpoint first, fallback to general chat
      let response;
      try {
        response = await apiPost<{
          ok: boolean;
          replyText?: string;
          confidence?: number;
          suggestedActions?: string[];
          error?: string;
        }>(
          '/api/coach/chat',
          {
            text: userMessage,
            context: {
              agentId,
              currentTab: activeTab,
              timestamp: new Date().toISOString()
            }
          }
        );
      } catch (error: any) {
        // If coach endpoint doesn't exist, try general chat
        if (error.status === 404) {
          console.log('[Coach] Coach endpoint not found, using general chat');
          response = await apiPost<{ message?: string; response?: string; error?: string }>(
            '/api/v1/chat',
            {
              message: userMessage,
              member: 'ollama_llama'
            }
          );
          // Transform response to coach format
          response = {
            ok: true,
            replyText: response.message || response.response || 'No response',
            confidence: 0.8,
            suggestedActions: []
          };
        } else {
          throw error;
        }
      }

      if (response.ok && response.replyText) {
        const coachMessage = {
          role: 'coach' as const,
          text: response.replyText,
          timestamp: new Date()
        };
        setCoachMessages(prev => [...prev, coachMessage]);

        // Log response
        console.log('[Coach] Reply:', response.replyText);
        if (typeof window !== 'undefined') {
          const chatLog = JSON.parse(localStorage.getItem('coach-chat-log') || '[]');
          chatLog.push({ ...coachMessage, agentId });
          localStorage.setItem('coach-chat-log', JSON.stringify(chatLog.slice(-50)));
        }

        // Check if user wants to play WHY (meaningful moment)
        if (userMessage.toLowerCase().includes('play my why') || userMessage.toLowerCase().includes("i'm discouraged")) {
          // Trigger meaningful moments playback
          try {
            const momentsData = await apiGet<GetMomentsResponse>(
              `/api/v1/boldtrail/moments/${agentId}/playback?moment_type=winning_moment`
            );
            if (momentsData.ok && momentsData.moments && momentsData.moments.length > 0) {
              // Show moments in response or trigger playback
              console.log('[Coach] Found', momentsData.moments.length, 'winning moments');
            }
          } catch (error) {
            console.error('Failed to load moments:', error);
          }
        }
      } else {
        throw new Error(response.error || 'No response from coach');
      }
    } catch (error: any) {
      console.error('[Coach] Error:', error);
      const errorMessage = {
        role: 'coach' as const,
        text: `Error: ${error.message || 'Failed to get response. Please try again.'}`,
        timestamp: new Date()
      };
      setCoachMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle voice input
  const handleVoiceInput = async () => {
    if (isListening || isRecordingAudio) {
      // Stop recording
      if (recognition) {
        recognition.stop();
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      setIsListening(false);
      setIsRecordingAudio(false);
      return;
    }

    // Try Web Speech API first
    if (recognition) {
      try {
        setIsListening(true);
        recognition.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
        // Fallback to MediaRecorder
        startAudioRecording();
      }
    } else {
      // Fallback to MediaRecorder
      startAudioRecording();
    }
  };

  // Fallback: Record audio with MediaRecorder
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        // Try to upload for transcription
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('agent_id', agentId.toString());

          const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
          const COMMAND_KEY = process.env.NEXT_PUBLIC_COMMAND_KEY || '';
          const response = await fetch(`${API_BASE_URL}/api/coach/transcribe`, {
            method: 'POST',
            headers: {
              'x-command-key': COMMAND_KEY
            },
            body: formData
          });

          if (response.ok) {
            const data = await response.json();
            if (data.transcript) {
              setCoachInput(prev => prev + (prev ? ' ' : '') + data.transcript);
            }
          } else {
            throw new Error('Transcription endpoint not available');
          }
        } catch (error) {
          console.error('Transcription failed:', error);
          alert('Voice transcription not configured. Please type your message instead.');
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingAudio(true);
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      alert('Microphone access denied or not available. Please type your message.');
    }
  };

  const renderSettingsTab = () => {
    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-purple-300 mb-3">Settings</div>
        
        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-slate-300 text-xs mb-2">Perfect Day Setup</div>
          <button
            onClick={async () => {
              // Would open setup form
              console.log('Setup perfect day');
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded text-xs"
          >
            Configure Perfect Day
          </button>
        </div>

        <div className="bg-slate-800/50 rounded p-2">
          <div className="text-slate-300 text-xs mb-2">Auto-Recording</div>
          <div className="text-slate-400 text-xs">
            Enable/disable automatic call recording
          </div>
        </div>
      </div>
    );
  };

  // Calculate metrics
  const overallGoalProgress = progress?.goals.length
    ? progress.goals.reduce((sum, g) => sum + parseFloat(g.progress_percent), 0) / progress.goals.length
    : 0;

  const todayScore = dailyLog?.day_score || dailyLog?.system_score || 0;
  const integrityScore = dailyLog?.integrity_score || 0;
  const openEscrows = progress?.open_escrows || progress?.deals?.current || 0;

  const nextAction = progress?.goals.find(g => parseFloat(g.progress_percent) < 100)
    ? `Complete: ${progress?.goals.find(g => parseFloat(g.progress_percent) < 100)?.goal_name}`
    : 'All goals on track!';

  // Collapsed view (edge tab) - only show if truly collapsed
  if (state.isCollapsed && state.width <= COLLAPSED_WIDTH + 10) {
    return (
      <Rnd
        size={{ width: COLLAPSED_WIDTH, height: COLLAPSED_HEIGHT }}
        position={{ x: state.x, y: state.y }}
        onDragStop={handleDragStop}
        disableResizing={state.isLocked}
        enableResizing={!state.isLocked}
        bounds="window"
        style={{ zIndex: 9999 }}
      >
        <div
          ref={overlayRef}
          className="bg-purple-600/90 backdrop-blur-sm rounded-lg border border-purple-400/50 shadow-2xl cursor-move"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="p-2 text-white text-xs font-semibold text-center">
            {Math.round(overallGoalProgress)}%
          </div>
        </div>
      </Rnd>
    );
  }

  // Expanded view
  return (
    <Rnd
      size={{ width: state.width, height: state.height }}
      position={{ x: state.x, y: state.y }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      disableResizing={state.isLocked}
      enableResizing={!state.isLocked}
      minWidth={COLLAPSED_WIDTH}
      minHeight={COLLAPSED_HEIGHT}
      bounds="window"
      style={{ zIndex: 9999 }}
    >
      <div
        ref={overlayRef}
        className="bg-slate-900/95 backdrop-blur-md rounded-lg border border-purple-500/30 shadow-2xl flex flex-col"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Title Bar - Draggable */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-purple-600/80 rounded-t-lg cursor-move border-b border-purple-400/30"
          style={{ cursor: state.isLocked ? 'default' : 'move' }}
        >
          <div className="flex items-center gap-2 text-white text-sm font-semibold">
            <span>🎯 LifeOS</span>
            {state.isDocked && (
              <span className="text-xs opacity-75">({state.isDocked})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={togglePinned}
              className="p-1 hover:bg-purple-500/50 rounded text-white text-xs"
              title={state.isPinned ? 'Unpin' : 'Pin'}
            >
              {state.isPinned ? '📌' : '📍'}
            </button>
            <button
              onClick={toggleLocked}
              className="p-1 hover:bg-purple-500/50 rounded text-white text-xs"
              title={state.isLocked ? 'Unlock' : 'Lock'}
            >
              {state.isLocked ? '🔒' : '🔓'}
            </button>
            <button
              onClick={toggleCollapsed}
              className="p-1 hover:bg-purple-500/50 rounded text-white text-xs"
              title="Collapse"
            >
              ➖
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/50 overflow-x-auto">
          {['today', 'perfect-day', 'commitments', 'call-coach', 'moments', 'mediation', 'progress', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-400 text-purple-300 bg-purple-900/20'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-3 text-white text-xs overflow-auto">
          {renderTabContent()}
          
          {/* Coach Chat History (if messages exist) */}
          {coachMessages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-slate-300 text-xs font-medium mb-2">Recent Coach Chat</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {coachMessages.slice(-3).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs ${
                      msg.role === 'user'
                        ? 'bg-purple-900/20 text-purple-200 ml-4'
                        : 'bg-slate-800/50 text-slate-300 mr-4'
                    }`}
                  >
                    <div className="font-medium mb-0.5">
                      {msg.role === 'user' ? 'You' : 'Coach'}:
                    </div>
                    <div>{msg.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coach Input - Always Visible at Bottom */}
        <div className="border-t border-slate-700 bg-slate-800/50 p-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCoachSubmit();
                  }
                }}
                placeholder="Ask your coach: 'What's my next move?' or 'I'm discouraged, play my WHY'"
                className="w-full bg-slate-700 text-white px-3 py-2 rounded text-xs pr-10"
              />
              <button
                onClick={handleVoiceInput}
                disabled={isListening || isRecordingAudio}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                  isListening || isRecordingAudio
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                }`}
                title={isListening || isRecordingAudio ? 'Stop recording' : 'Voice input'}
              >
                🎤
              </button>
            </div>
            <button
              onClick={handleCoachSubmit}
              disabled={!coachInput.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-xs font-medium"
            >
              Send
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-500 text-center">
            AI Coach • Not impersonating any person • Responses are AI-generated
          </div>
        </div>
      </div>
    </Rnd>
  );
}
