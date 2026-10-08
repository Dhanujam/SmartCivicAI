import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  User,
  MapPin,
  Camera,
  Upload,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Mic,
  MicOff,
  Navigation,
  Crosshair,
  Shield,
  ShieldCheck,
  Phone,
  RotateCcw,
  Sliders,
  HelpCircle,
  Info,
  Check,
} from 'lucide-react';
import { api } from '../services/api';

// Popular civic issue quick templates for instant reporting
const QUICK_PRESETS = [
  {
    id: 'pothole',
    label: 'Road Hazard / Pothole',
    icon: '🕳️',
    text: 'Large, dangerous pothole on the main carriageway causing vehicle damage and sudden swerving. Urgent repair required to prevent two-wheeler accidents.',
  },
  {
    id: 'waste',
    label: 'Garbage Overflow',
    icon: '🗑️',
    text: 'Public garbage dumpsters overflowing onto the sidewalk for over 3 days. Creating severe foul odor, health hazards, and attracting stray animals.',
  },
  {
    id: 'streetlight',
    label: 'Streetlight Outage',
    icon: '💡',
    text: 'Cluster of municipal streetlights non-operational, leaving the pedestrian footpath and road pitch dark at night, posing safety and crime risks.',
  },
  {
    id: 'water',
    label: 'Water Pipe Burst',
    icon: '🚰',
    text: 'Main drinking water distribution pipeline ruptured. Clean drinking water continuously flooding the street and causing severe water supply disruption.',
  },
  {
    id: 'drainage',
    label: 'Open Drain / Sewage',
    icon: '🌊',
    text: 'Stormwater drainage blocked with heavy silt and sewage overflowing onto the public street. Open inspection chamber missing cover lid.',
  },
  {
    id: 'safety',
    label: 'Electric Hazard',
    icon: '⚠️',
    text: 'Damaged electrical junction box with exposed live wires hanging near public walkway. Immediate municipal danger to pedestrians.',
  },
];

export default function ComplaintForm({ onSuccess }) {
  // Form fields matching backend FastAPI endpoint
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  // File input refs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (transcript) {
          setDescription((prev) => {
            const clean = prev.trim();
            return clean ? `${clean} ${transcript}` : transcript;
          });
          if (error) setError(null);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition warning:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [error]);

  // Toggle Voice Dictation
  const toggleSpeechRecognition = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition start failed:', err);
        setIsListening(false);
      }
    }
  };

  // Quick Preset Selection
  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setDescription(preset.text);
    if (error) setError(null);
    setDescriptionTouched(true);
  };

  // Image validation and handling
  const handleProcessImage = (file) => {
    if (!file) return;

    // Validate size (10MB limit as enforced by backend)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('Selected image exceeds the 10MB limit. Please upload a smaller image.');
      return;
    }

    // Validate MIME types and common extensions
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
    ];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];

    if (!allowedTypes.includes(file.type.toLowerCase()) && !allowedExts.includes(extension)) {
      setError(
        'Unsupported file format. Please upload an image in JPEG, PNG, WEBP, GIF, or HEIC format.'
      );
      return;
    }

    setError(null);
    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    handleProcessImage(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleProcessImage(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Real-time HTML5 Geolocation detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Acquiring high-accuracy GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);

        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracy(accuracy);
        setLocationStatus(`GPS Locked: ${lat}, ${lng} (±${accuracy}m accuracy)`);
        setIsLocating(false);

        // Optional reverse geocoding via OpenStreetMap Nominatim if address is empty
        if (!locationAddress.trim()) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
              {
                headers: { 'Accept-Language': 'en' },
                signal: controller.signal,
              }
            );
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                // Shorten or format address
                setLocationAddress(data.display_name);
              }
            }
          } catch (err) {
            // Reverse geocode is best-effort; silent ignore
          }
        }
      },
      (geoError) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve location.';
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            msg = 'Location access permission was denied. Please check browser settings.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            msg = 'Location information is currently unavailable.';
            break;
          case geoError.TIMEOUT:
            msg = 'Location request timed out. Please try again.';
            break;
          default:
            msg = 'Error acquiring GPS coordinates.';
        }
        setLocationStatus(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const handleClearLocation = () => {
    setLatitude(null);
    setLongitude(null);
    setGpsAccuracy(null);
    setLocationStatus(null);
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setDescriptionTouched(true);

    const cleanDescription = description.trim();
    if (!cleanDescription) {
      setError('Please provide a description of the civic problem before submitting.');
      descriptionInputRef.current?.focus();
      return;
    }

    if (cleanDescription.length < 5) {
      setError('Please provide at least a few words describing the issue for accurate AI triage.');
      descriptionInputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep('Uploading report & photographic evidence to civic triage portal...');

    // Assemble FormData conforming strictly to FastAPI backend contract
    const formData = new FormData();
    formData.append('description', cleanDescription);

    // Citizen Name handling
    if (isAnonymous) {
      formData.append('citizen_name', 'Anonymous');
    } else if (citizenName.trim()) {
      formData.append('citizen_name', citizenName.trim());
    } else {
      formData.append('citizen_name', 'Anonymous');
    }

    // Citizen Contact
    if (!isAnonymous && citizenContact.trim()) {
      formData.append('citizen_contact', citizenContact.trim());
    }

    // Location Address
    if (locationAddress.trim()) {
      formData.append('location_address', locationAddress.trim());
    }

    // GPS Latitude and Longitude
    if (latitude !== null && latitude !== '' && !isNaN(Number(latitude))) {
      formData.append('latitude', Number(latitude).toString());
    }
    if (longitude !== null && longitude !== '' && !isNaN(Number(longitude))) {
      formData.append('longitude', Number(longitude).toString());
    }

    // Photographic Evidence
    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    // Dynamic step messages during async triage
    const stepTimer1 = setTimeout(() => {
      setLoadingStep('Google Gemini Multimodal AI analyzing issue severity and visual damage...');
    }, 1800);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('Calculating 0-100 priority score and routing to municipal department...');
    }, 3800);

    const stepTimer3 = setTimeout(() => {
      setLoadingStep('Formulating actionable resolution steps for civic field engineers...');
    }, 5800);

    try {
      const result = await api.submitComplaint(formData);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setLoadingStep('Triage completed successfully!');
      onSuccess(result);
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      console.error('Complaint submission error:', err);

      const serverDetail = err.response?.data?.detail;
      let errorMsg =
        'Failed to submit complaint. Please check your backend connection.';

      if (typeof serverDetail === 'string') {
        errorMsg = serverDetail;
      } else if (Array.isArray(serverDetail)) {
        errorMsg = serverDetail.map((d) => d.msg || JSON.stringify(d)).join(', ');
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg =
          'Cannot reach the backend server (FastAPI at http://localhost:8000). Please ensure python run.py is executing.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Reset entire form
  const handleResetForm = () => {
    setDescription('');
    setCitizenName('');
    setCitizenContact('');
    setIsAnonymous(false);
    setLocationAddress('');
    setLatitude(null);
    setLongitude(null);
    setGpsAccuracy(null);
    setLocationStatus(null);
    setSelectedImage(null);
    setImagePreview(null);
    setError(null);
    setDescriptionTouched(false);
    setActivePreset(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-sky-500/80 to-transparent blur-sm" />

        {/* Portal Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Citizen Civic Reporting Portal
            </div>

            {/* Reset Form Button */}
            <button
              type="button"
              onClick={handleResetForm}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 text-xs transition border border-slate-700/60 disabled:opacity-40"
              title="Reset all form fields"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Report a Civic Issue
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Report road hazards, sanitation backlogs, water leaks, or public safety issues.
            Google Gemini Multimodal AI evaluates severity, calculates an urgency score, routes
            the issue, and produces actionable municipal resolution steps.
          </p>
        </div>

        {/* Quick Issue Category Presets */}
        <div className="mb-7">
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Quick Issue Starters <span className="text-slate-500 font-normal">(Click to pre-fill)</span>
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  disabled={loading}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition disabled:opacity-50 ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-500/60 text-sky-200 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="text-sm select-none">{preset.icon}</span>
                  <span className="truncate font-medium">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Submission Notice</p>
              <p className="mt-0.5 text-rose-300/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 p-1"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Complaint Description (Mandatory Heart of the Report) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="complaint_description"
                className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Problem Description <span className="text-rose-400 font-bold">*</span>
              </label>

              <div className="flex items-center gap-3">
                {/* Voice Dictation (Speech to Text) */}
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    disabled={loading}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      isListening
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-sky-300 hover:border-sky-500/40'
                    }`}
                    title={
                      isListening
                        ? 'Stop listening'
                        : 'Speak your complaint using microphone'
                    }
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3 h-3 text-rose-400" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3 text-sky-400" />
                        <span>Dictate</span>
                      </>
                    )}
                  </button>
                )}

                <span className="text-[11px] text-slate-500 font-mono">
                  {description.length} chars
                </span>
              </div>
            </div>

            <div className="relative">
              <textarea
                ref={descriptionInputRef}
                id="complaint_description"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (error) setError(null);
                }}
                onBlur={() => setDescriptionTouched(true)}
                disabled={loading}
                placeholder="Describe the issue in detail (e.g., location landmarks, severity, physical dimensions of pothole, flooding extent, how long it has persisted)..."
                aria-required="true"
                aria-invalid={descriptionTouched && !description.trim()}
                className={`w-full px-4 py-3 rounded-xl bg-slate-900/80 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition disabled:opacity-50 resize-y min-h-[120px] ${
                  descriptionTouched && !description.trim()
                    ? 'border-rose-500/80 focus:ring-rose-500/30'
                    : 'border-slate-700/80 focus:ring-sky-500/40 focus:border-sky-500'
                }`}
              />

              {description.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setDescription('');
                    setActivePreset(null);
                  }}
                  disabled={loading}
                  className="absolute bottom-3 right-3 text-slate-500 hover:text-slate-300 text-xs p-1 bg-slate-800/80 rounded-md border border-slate-700/50"
                  title="Clear description text"
                >
                  Clear
                </button>
              )}
            </div>

            {descriptionTouched && !description.trim() && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Problem description is required so Google Gemini can triage the complaint.
              </p>
            )}

            {isListening && (
              <div className="mt-1.5 p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Microphone active: Speak naturally. Your words will appear above...</span>
              </div>
            )}
          </div>

          {/* Photographic Evidence (Multimodal AI Vision Support) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                Photographic Evidence{' '}
                <span className="text-slate-500 font-normal">(Recommended for Gemini Vision)</span>
              </label>

              {/* Mobile Direct Camera Capture trigger */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition"
              >
                <Camera className="w-3 h-3" />
                Take Photo
              </button>
            </div>

            {!selectedImage ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-slate-700 hover:border-sky-500/60 bg-slate-900/40 hover:bg-slate-900/70'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-sky-500/20 text-slate-400 group-hover:text-sky-400 flex items-center justify-center mx-auto mb-3 transition">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition">
                  Click or drag and drop photo evidence here
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports JPEG, PNG, WEBP, GIF, HEIC (Up to 10MB)
                </p>
                <p className="text-[10px] text-emerald-400/90 mt-2 flex items-center justify-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3" />
                  Gemini multimodal vision triage analyzes visual severity directly
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-md">
                {imagePreview && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 flex-shrink-0 bg-black">
                    <img
                      src={imagePreview}
                      alt="Uploaded civic evidence preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white truncate">
                      {selectedImage.name}
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold flex items-center gap-1 flex-shrink-0">
                      <Sparkles className="w-2.5 h-2.5" />
                      Vision Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatFileSize(selectedImage.size)} • {selectedImage.type || 'Image'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={loading}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition border border-slate-700"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/jpg"
              onChange={handleImageChange}
              className="hidden"
            />
            {/* Direct Camera capture for mobile/tablets */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Location & GPS Section */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="location_address"
                  className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Civic Location / Landmark Address{' '}
                  <span className="text-slate-500 font-normal">(Optional)</span>
                </label>

                {/* Detect GPS Button */}
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={loading || isLocating}
                  className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium transition disabled:opacity-50"
                  title="Fetch current coordinates via device GPS"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Locating...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3" />
                      Detect GPS Location
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  id="location_address"
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., Near City Hospital Gate 2, Cross Road 5, Sector 12"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition disabled:opacity-50"
                />
              </div>
            </div>

            {/* GPS Status and Coordinate Badges */}
            {(latitude !== null || locationStatus) && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <span className="text-slate-300">
                    {locationStatus || `GPS: ${latitude}, ${longitude}`}
                  </span>
                  {gpsAccuracy && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      ±{gpsAccuracy}m
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualCoords(!showManualCoords)}
                    className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <Sliders className="w-3 h-3" />
                    {showManualCoords ? 'Hide coordinates' : 'Fine-tune coordinates'}
                  </button>
                  {latitude !== null && (
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-slate-400 hover:text-rose-400 p-0.5"
                      title="Clear GPS"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Optional Manual GPS Coordinates fields */}
            {showManualCoords && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 animate-fadeIn">
                <div>
                  <label htmlFor="latitude" className="block text-[11px] text-slate-400 mb-1">
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    value={latitude ?? ''}
                    onChange={(e) =>
                      setLatitude(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    placeholder="e.g. 28.6139"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className="block text-[11px] text-slate-400 mb-1">
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    value={longitude ?? ''}
                    onChange={(e) =>
                      setLongitude(e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    placeholder="e.g. 77.2090"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Citizen Details & Confidentiality Toggle */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/90 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Citizen Information & Privacy
                </span>
              </div>

              {/* Anonymous Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-500/40 focus:ring-offset-slate-950 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-300">
                  File Anonymously
                </span>
              </label>
            </div>

            {isAnonymous ? (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>
                  Anonymous mode active. Your name and contact details will not be recorded.
                  The complaint will be cataloged under municipal public registry.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                {/* Citizen Full Name */}
                <div>
                  <label
                    htmlFor="citizen_name"
                    className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-sky-400" />
                    Full Name <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="citizen_name"
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    disabled={loading}
                    placeholder="e.g., Alex Johnson"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition disabled:opacity-50"
                  />
                </div>

                {/* Citizen Contact (Phone / Email) */}
                <div>
                  <label
                    htmlFor="citizen_contact"
                    className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    Phone or Email <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="citizen_contact"
                    type="text"
                    value={citizenContact}
                    onChange={(e) => setCitizenContact(e.target.value)}
                    disabled={loading}
                    placeholder="e.g., +1 555-0199 or alex@email.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 transition disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Used exclusively for municipal resolution SMS/email notifications.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button & Progress Indicator */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 hover:via-indigo-500 hover:to-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-sky-500/25 transition cursor-pointer flex items-center justify-center gap-2 transform active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span className="tracking-wide">Executing Gemini AI Triage...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-sky-200" />
                  <span>Submit Complaint for AI Triage & Resolution</span>
                </>
              )}
            </button>

            {/* Dynamic Step-by-Step AI Progress Indicator */}
            {loading && loadingStep && (
              <div className="mt-4 p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-300 text-xs flex items-center justify-center gap-2 animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span className="font-medium">{loadingStep}</span>
              </div>
            )}
          </div>

          {/* Bottom Security / Trust Footer */}
          <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Cybersecurity Shield Active • AI Prompt Firewall • DPDP PII Protection
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Gemini Multimodal AI (HN-AI-02)
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
