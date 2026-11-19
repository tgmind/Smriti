import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  ArrowRight,
  WifiOff,
  Lock,
  ShieldAlert
} from 'lucide-react';
import saraswatiImg from '../assets/saraswati.webp';
import { googleDriveService } from '../services/googleDrive';
import { syncStudentProfileWithSupabase } from '../services/supabase';
import { toastService } from '../services/toastService';
import { ToastContainer } from './ui/ToastContainer';
import { SacredMandala } from './ui/SacredMandala';

export interface AuthScreenProps {
  onAuthenticated: () => void;
  onExploreGuest: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onExploreGuest
}) => {
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('smriti_blocked_user') === 'true';
      }
    } catch {
      return false;
    }
    return false;
  });
  const [blockedReason, setBlockedReason] = useState<string>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return (
          localStorage.getItem('smriti_blocked_reason') ||
          'Your student account has been suspended by the administrator.'
        );
      }
    } catch {
      // Ignore
    }
    return 'Your student account has been suspended by the administrator.';
  });

  // Check locally cached block status on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('smriti_blocked_user') === 'true') {
        setIsBlocked(true);
        setBlockedReason(
          localStorage.getItem('smriti_blocked_reason') ||
          'Your student account has been suspended by the administrator.'
        );
      }
    } catch {
      // Ignore
    }
  }, []);

  // Lock body/window scrolling when AuthScreen is displayed so mobile browsers never scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      // 1. Authorize Google Identity Services with minimal drive.file + profile scopes
      await googleDriveService.authorize();
      const profile = googleDriveService.getUserProfile();

      // 2. Synchronize student profile with Supabase & enforce admin blocking
      if (profile?.email) {
        try {
          const status = await syncStudentProfileWithSupabase(profile);
          if (status.isBlocked) {
            setIsBlocked(true);
            setBlockedReason(
              status.blockedReason ||
              'Your student account has been suspended by the administrator.'
            );
            return;
          }
        } catch (supaErr) {
          console.warn('[AuthScreen] Supabase verification note (proceeding offline):', supaErr);
        }
      }

      // 3. Ensure dedicated 'My Drive/Smriti' folder hierarchy exists
      await googleDriveService.ensureSmritiFolderHierarchy();

      // Clear guest flag upon successful Google authentication
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smriti_guest_mode');
      }

      onAuthenticated();
    } catch (err: any) {
      console.error('[AuthScreen] Google Sign-In error:', err);
      const errorMessage = err?.message || 'Google authentication was not completed. Please try again.';
      // Display as an unobtrusive, floating pop-up toast without disturbing UI layout
      toastService.danger(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smriti_guest_mode', 'true');
    }
    onExploreGuest();
  };

  if (isBlocked) {
    return (
      <div className="fixed inset-0 w-full h-full h-[100dvh] max-h-[100dvh] bg-[#FAF5EE] text-[#2C2623] flex flex-col justify-center items-center p-6 select-none font-sans z-50">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 border border-rose-200 shadow-2xl flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="size-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Suspended</h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {blockedReason || 'Your student account has been suspended by the administrator.'}
            </p>
          </div>
          <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 text-left space-y-1">
            <span className="font-semibold block text-slate-800">Need Help?</span>
            <p>If you believe this suspension is in error, please reach out to your administrator or teacher with your registered email.</p>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('smriti_blocked_user');
                localStorage.removeItem('smriti_blocked_reason');
                googleDriveService.disconnect();
              } catch {
                // Ignore
              }
              setIsBlocked(false);
            }}
            className="w-full py-2.5 px-4 rounded-full bg-[#241F3B] hover:bg-[#302A4E] text-white text-xs font-semibold transition-all cursor-pointer shadow-md active:scale-95"
          >
            Switch Google Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full h-[100dvh] max-h-[100dvh] bg-[#FAF5EE] text-[#2C2623] flex flex-col justify-between items-center py-[clamp(0.6rem,1.8vh,1.25rem)] px-3 xs:px-4 sm:px-6 select-none overflow-hidden overscroll-none font-sans [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-none">
      {/* Floating Pop-Up Notification Toast: Fixed overlay with zero UI flow displacement */}
      <ToastContainer position="top" />

      {/* Organic Warm Sand Curved Wave (Reference Aesthetic) */}
      <div className="absolute top-0 left-0 w-full h-[55%] pointer-events-none overflow-hidden" aria-hidden="true">
        <svg
          viewBox="0 0 400 320"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-50,-30 C120,-10 180,60 190,140 C200,230 110,290 -40,310 Z"
            fill="#EFE5D7"
            opacity="0.9"
          />
          <path
            d="M-30,-20 C100,0 150,50 160,120 C170,200 90,260 -20,280 Z"
            fill="#E8DCBE"
            opacity="0.35"
          />
        </svg>
      </div>

      {/* Gentle Celestial Background Aura Washes */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[380px] h-[240px] rounded-full bg-gradient-to-b from-amber-300/30 via-orange-200/20 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-tl from-amber-200/25 via-orange-100/15 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Ambient Celestial Glimmers in Background */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden text-amber-600/35" aria-hidden="true">
        <span className="absolute top-[14%] left-[8%] text-xs">✦</span>
        <span className="absolute top-[20%] right-[10%] text-sm">✦</span>
        <span className="absolute top-[48%] left-[6%] text-[10px]">✦</span>
        <span className="absolute top-[68%] right-[8%] text-xs">✦</span>
        <span className="absolute top-[78%] left-[10%] text-[9px]">✦</span>
      </div>

      {/* Responsive Central Column: Max-width bounded, fluid height */}
      <div className="w-full max-w-sm sm:max-w-md h-full flex flex-col justify-between items-center relative z-10">
        
        {/* UNIFIED CORE CONTENT STACK: Fluid, Proportional Gaps (Zero Awkward Flex Deserts) */}
        <div className="w-full flex flex-col items-center text-center my-auto gap-[clamp(0.4rem,1.3vh,0.85rem)]">
          {/* Brand Header with Reverent Golden Accents */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] font-bold tracking-wide text-[#7A6F66] shrink-0">
            <span className="text-[#D96B43] text-[11px] sm:text-xs select-none">✦</span>
            <span className="text-[#1C1613] font-serif font-bold tracking-wider text-sm sm:text-base">Smriti</span>
            <span className="text-[#D96B43] font-bold text-sm sm:text-base">.</span>
            <span className="text-[#6B5E55] font-medium text-xs sm:text-sm">The Vedic Memory</span>
            <span className="text-[#D96B43] text-[11px] sm:text-xs select-none">✦</span>
          </div>

          {/* Maa Saraswati Ji Art with Sacred Vedic Mandala Halo (Enlarged Responsive Scale) */}
          <div className="relative flex items-center justify-center shrink-0">
            {/* Ambient warm aura wash */}
            <div className="absolute -inset-8 sm:-inset-10 rounded-full bg-gradient-to-b from-amber-400/22 via-orange-300/14 to-transparent blur-2xl sm:blur-3xl pointer-events-none" />

            {/* Sacred Vedic Mandala Halo: Neatly Proportioned with Zero Text Interference */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none scale-[1.22] sm:scale-[1.26]">
              <SacredMandala className="w-full h-full" />
            </div>

            {/* Maa Saraswati Ji Art: Enlarged Proportional Scaling Minimizing Empty Voids */}
            <img
              src={saraswatiImg}
              alt="Maa Saraswati — Goddess of Wisdom, Learning and Memory"
              className="relative z-10 w-[clamp(125px,27.5vh,248px)] h-[clamp(125px,27.5vh,248px)] object-contain select-none pointer-events-none transition-transform duration-300"
              loading="eager"
              fetchPriority="high"
              width={248}
              height={248}
            />
          </div>

          {/* Headline & Philosophy Narrative */}
          <div className="space-y-0.5 sm:space-y-1 max-w-xs sm:max-w-sm mx-auto shrink-0">
            <h1 className="text-[clamp(1.05rem,2.3vh,1.35rem)] font-bold tracking-tight text-[#1C1613] leading-snug">
              Etch any knowledge into permanent memory.
            </h1>
            <p className="text-[clamp(0.65rem,1.3vh,0.76rem)] text-[#6B5E55] leading-relaxed font-medium">
              Vedas teach us that deep memory (<span className="text-[#D96B43] font-semibold">Smriti</span>) is forged through attentive listening (<span className="text-[#2C2623] font-semibold">Sravana</span>) and repetitive reflection (<span className="text-[#2C2623] font-semibold">Manana</span>). This is the foundation of Smriti App.
            </p>
          </div>

          {/* Preserved Shloka & Meaning: Distinct Warm Card Vignette with Breathing Space */}
          <div className="relative w-full max-w-xs sm:max-w-sm mx-auto text-center shrink-0">
            <div className="relative py-[clamp(0.4rem,1vh,0.7rem)] px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-[#FDF9F2] border border-[#EADBCA] shadow-[0_2px_10px_rgba(44,38,35,0.02)] flex flex-col items-center justify-center gap-0.5 transition-all">
              {/* Sacred Shloka with Golden Glimmer Accents */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[clamp(0.75rem,1.6vh,0.88rem)] font-bold text-[#1C1613] tracking-wide leading-tight">
                <span className="text-[#D96B43] text-[10px] sm:text-xs select-none">✦</span>
                <span className="font-serif tracking-wide">"अभ्यासाद् धार्यते विद्या"</span>
                <span className="text-[#D96B43] text-[10px] sm:text-xs select-none">✦</span>
              </div>

              {/* Clear, Prominent, Legible Meaning */}
              <p className="text-[clamp(0.62rem,1.25vh,0.72rem)] text-[#6B5E55] font-medium leading-snug max-w-[280px] mx-auto">
                Knowledge is preserved through consistent practice and repetition.
              </p>
            </div>
          </div>

          {/* 4-Stage Oral Learning Path (Color-Coded Micro Cards) */}
          <div className="w-full bg-white rounded-xl sm:rounded-2xl border border-[#EFE8DF] shadow-[0_2px_10px_rgba(44,38,35,0.03)] p-1 sm:p-1.5 shrink-0">
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-center">
              {/* 1. Listen (श्रवण) - Warm Amber Pastel */}
              <div className="py-[clamp(0.25rem,0.7vh,0.45rem)] px-1 bg-[#FFF8F0] border border-[#FED7AA]/70 rounded-lg sm:rounded-xl transition-all">
                <p className="text-[clamp(0.65rem,1.35vh,0.75rem)] font-bold text-[#9A3412]">श्रवण</p>
                <p className="text-[clamp(0.5rem,1vh,0.58rem)] font-bold text-[#C2410C] uppercase tracking-wider">Listen</p>
              </div>

              {/* 2. Loop (आवर्तन) - Warm Terracotta/Orange Pastel */}
              <div className="py-[clamp(0.25rem,0.7vh,0.45rem)] px-1 bg-[#FFF2EB] border border-[#FFD9CA]/70 rounded-lg sm:rounded-xl transition-all">
                <p className="text-[clamp(0.65rem,1.35vh,0.75rem)] font-bold text-[#9A3412]">आवर्तन</p>
                <p className="text-[clamp(0.5rem,1vh,0.58rem)] font-bold text-[#EA580C] uppercase tracking-wider">Loop</p>
              </div>

              {/* 3. Reflect (मनन) - Contemplative Purple Pastel */}
              <div className="py-[clamp(0.25rem,0.7vh,0.45rem)] px-1 bg-[#F6F3FF] border border-[#DDD6FE]/70 rounded-lg sm:rounded-xl transition-all">
                <p className="text-[clamp(0.65rem,1.35vh,0.75rem)] font-bold text-[#581C87]">मनन</p>
                <p className="text-[clamp(0.5rem,1vh,0.58rem)] font-bold text-[#7C3AED] uppercase tracking-wider">Reflect</p>
              </div>

              {/* 4. Master (स्मृति) - Luminous Emerald Pastel */}
              <div className="py-[clamp(0.25rem,0.7vh,0.45rem)] px-1 bg-[#F0FBF5] border border-[#B4E5CE]/70 rounded-lg sm:rounded-xl transition-all">
                <p className="text-[clamp(0.65rem,1.35vh,0.75rem)] font-bold text-[#1B6E4A]">स्मृति</p>
                <p className="text-[clamp(0.5rem,1vh,0.58rem)] font-bold text-[#238259] uppercase tracking-wider">Master</p>
              </div>
            </div>
          </div>

          {/* 2 Core Value Cards (Google Drive & Security) */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 w-full text-left shrink-0">
            {/* Card 1: Google Drive */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-[#EFE8DF] shadow-[0_2px_10px_rgba(44,38,35,0.03)] p-[clamp(0.45rem,1.1vh,0.75rem)] flex items-start gap-2 sm:gap-2.5">
              <div className="size-6 sm:size-7 rounded-lg sm:rounded-xl bg-[#FAF2EB] flex items-center justify-center shrink-0 text-[#D96B43] mt-0.5">
                <HardDrive size={13} />
              </div>
              <div className="min-w-0">
                <p className="text-[clamp(0.68rem,1.35vh,0.76rem)] font-bold text-[#1C1613] leading-tight">Personal Google Drive</p>
                <p className="text-[clamp(0.56rem,1.1vh,0.62rem)] text-[#6B5E55] mt-0.5 leading-snug">
                  Raw audio stays in your own Drive. Zero platform storage fees.
                </p>
              </div>
            </div>

            {/* Card 2: 100% Private & Safe */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-[#EFE8DF] shadow-[0_2px_10px_rgba(44,38,35,0.03)] p-[clamp(0.45rem,1.1vh,0.75rem)] flex items-start gap-2 sm:gap-2.5">
              <div className="size-6 sm:size-7 rounded-lg sm:rounded-xl bg-[#EEF8F3] flex items-center justify-center shrink-0 text-[#1B6E4A] mt-0.5">
                <Lock size={13} />
              </div>
              <div className="min-w-0">
                <p className="text-[clamp(0.68rem,1.35vh,0.76rem)] font-bold text-[#1C1613] leading-tight">100% Private &amp; Safe</p>
                <p className="text-[clamp(0.56rem,1.1vh,0.62rem)] text-[#6B5E55] mt-0.5 leading-snug">
                  Smriti only accesses its own folder via strict <span className="font-mono text-[8px] sm:text-[8.5px] font-bold text-[#1B6E4A] bg-[#E1F3EA] px-1 py-0.2 rounded">drive.file</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PREMIUM ACTION UNIT AT THE VERY BOTTOM: Google Login Button & Guest Mode */}
        <footer className="w-full shrink-0 flex flex-col items-center gap-1 sm:gap-1.5 mt-auto pt-[clamp(0.4rem,1.2vh,0.85rem)]">
          {/* Primary Action Button (Midnight Indigo with Circular Arrow Right) */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-[clamp(2.75rem,5.4vh,3.25rem)] pl-4 sm:pl-5 pr-2 sm:pr-2.5 rounded-full bg-[#241F3B] hover:bg-[#302A4E] text-white font-semibold text-xs sm:text-[13px] flex items-center justify-between transition-all duration-200 active:scale-[0.985] cursor-pointer disabled:opacity-50 shadow-[0_6px_20px_rgba(36,31,59,0.22)]"
          >
            {loading ? (
              <div className="flex items-center gap-2 pl-2">
                <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Connecting to Google Drive...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="size-6 sm:size-6.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                    <svg className="size-3.5 sm:size-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <span className="tracking-wide">Continue with Google</span>
                </div>
                <div className="size-7 sm:size-7.5 rounded-full bg-white flex items-center justify-center text-[#241F3B] shadow-xs">
                  <ArrowRight size={13.5} className="stroke-[2.5]" />
                </div>
              </>
            )}
          </button>

          {/* Secondary Guest Login */}
          <button
            onClick={handleGuestMode}
            className="w-full py-1 px-3 rounded-full text-[clamp(0.64rem,1.25vh,0.75rem)] font-medium text-[#7A6F66] hover:text-[#1C1613] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <WifiOff size={11.5} className="text-[#8E7E73]" />
            <span>Explore as Guest (Offline Storage Only)</span>
            <ArrowRight size={11.5} className="text-[#8E7E73]" />
          </button>
        </footer>
      </div>
    </div>
  );
};
