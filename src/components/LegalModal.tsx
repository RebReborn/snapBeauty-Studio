import React, { useState } from 'react';
import { X, Shield, FileText, Scale } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy' | 'aup';
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'aup'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="w-full max-w-3xl bg-studio-dark border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Legal Information</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-white/5 bg-white/2">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'terms' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            Terms & Conditions
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'privacy' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Shield className="h-4 w-4" />
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('aup')}
            className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'aup' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Scale className="h-4 w-4" />
            Acceptable Use
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-300 space-y-4 custom-scrollbar bg-studio-darker/50">
          
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-4">Terms and Conditions</h3>
              <p>Welcome to SnapBeauty Studio. These Terms of Service ("Terms") govern your access to and use of our web application.</p>
              
              <h4 className="text-white font-bold mt-6">1. Acceptance of Terms</h4>
              <p>By accessing or using SnapBeauty Studio, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use the service.</p>
              
              <h4 className="text-white font-bold mt-6">2. Description of Service</h4>
              <p>SnapBeauty Studio provides AI-powered real-time video beauty enhancements running entirely in your browser. We provide tools for digital makeup, skin retouching, color grading, and video rendering.</p>
              
              <h4 className="text-white font-bold mt-6">3. User Accounts</h4>
              <p>To use the Studio, you must register for an account using a valid email address or Google Sign-In. You are responsible for safeguarding your password and for all activities that occur under your account.</p>
              
              <h4 className="text-white font-bold mt-6">4. Intellectual Property</h4>
              <p>All videos, presets, and content you generate using SnapBeauty Studio remain your intellectual property. However, by publishing a custom preset to the Global Marketplace, you grant us and our users a perpetual, royalty-free license to use and remix that preset.</p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-4">Privacy Policy</h3>
              <p>Your privacy is critically important to us. SnapBeauty Studio was architected from the ground up to protect your biometric data.</p>
              
              <h4 className="text-white font-bold mt-6">1. Local Processing</h4>
              <p><strong>We do NOT upload your videos or your face to our servers.</strong> All AI face tracking, semantic segmentation, rendering, and exporting occurs 100% locally on your device's GPU and CPU. We cannot see, store, or analyze your face.</p>
              
              <h4 className="text-white font-bold mt-6">2. Data We Collect</h4>
              <p>To provide the service, we collect basic authentication data (email address and display name) via Google Firebase. We also store any Custom Presets that you explicitly save to your account in our cloud database.</p>
              
              <h4 className="text-white font-bold mt-6">3. Third-Party Services</h4>
              <p>We use Google's MediaPipe for on-device AI inference and Firebase for authentication and cloud storage. By using the app, you acknowledge that authentication and database interactions are governed by Google's privacy policies.</p>
            </div>
          )}

          {activeTab === 'aup' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-4">Acceptable Use Policy (AUP)</h3>
              <p>This Acceptable Use Policy outlines the rules regarding the usage of SnapBeauty Studio and its Global Marketplace.</p>
              
              <h4 className="text-white font-bold mt-6">1. Marketplace Contributions</h4>
              <p>When publishing presets to the Global Marketplace, you agree to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide accurate names and descriptions for your presets.</li>
                <li>Not use offensive, hateful, or derogatory language in preset names.</li>
                <li>Not attempt to inject malicious payloads into the preset configuration objects.</li>
              </ul>
              
              <h4 className="text-white font-bold mt-6">2. Prohibited Conduct</h4>
              <p>You may not use SnapBeauty Studio to generate, edit, or distribute content that is illegal, defamatory, or infringes on the rights of others. Even though processing is done locally, we reserve the right to terminate accounts found violating these terms in their public usage of the app.</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;
