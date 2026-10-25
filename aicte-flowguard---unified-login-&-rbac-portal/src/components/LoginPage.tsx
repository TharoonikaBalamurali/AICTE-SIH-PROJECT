/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (loginId: string, password: string, rememberMe: boolean) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  isLockedOut?: boolean;
  remainingMinutes?: number;
  initialLoginId?: string;
  initialPassword?: string;
  onOpenForgotPassword?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  isLoading,
  errorMessage,
  isLockedOut = false,
  remainingMinutes = 0,
  initialLoginId = '',
  initialPassword = '',
  onOpenForgotPassword,
}) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('aicte_remembered_login_id');
    if (saved) {
      setLoginId(saved);
    }
  }, []);

  useEffect(() => {
    if (initialLoginId) setLoginId(initialLoginId);
    if (initialPassword) setPassword(initialPassword);
  }, [initialLoginId, initialPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = loginId.trim();
    if (!trimmed) {
      setValidationError('Please enter your assigned User ID.');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    localStorage.setItem('aicte_remembered_login_id', trimmed);
    await onLogin(trimmed, password, true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12 selection:bg-neutral-800 selection:text-white">
      <div className="w-full max-w-[460px] mx-auto flex flex-col items-center">
        
        {/* Shield Checkmark Icon */}
        <div className="mb-4">
          <div className="w-10 h-10 rounded-full border border-neutral-700/80 bg-neutral-900/50 flex items-center justify-center text-white shadow-inner">
            <ShieldCheck className="w-5 h-5 text-white stroke-[2]" />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2 text-center">
          AICTE FlowGuard
        </h1>
        <p className="text-sm text-neutral-400 mb-8 text-center font-normal">
          Unified Approval Workflow & Compliance Management Portal
        </p>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
          
          {/* Error feedback */}
          {(errorMessage || validationError) && (
            <div
              role="alert"
              className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                {validationError || errorMessage}
                {isLockedOut && (
                  <span className="block mt-1 font-semibold text-red-200">
                    Account locked. Retry in {remainingMinutes || 15} minute(s).
                  </span>
                )}
              </div>
            </div>
          )}

          {/* User ID Field */}
          <div className="space-y-2">
            <label
              htmlFor="user-id"
              className="block text-sm font-medium text-neutral-200"
            >
              User ID
            </label>
            <input
              id="user-id"
              type="text"
              required
              disabled={isLoading || isLockedOut}
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Enter your assigned User ID or Email"
              className="w-full px-4 py-3 bg-[#0d0d0d] border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 font-mono focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-200"
              >
                Password
              </label>
              {onOpenForgotPassword && (
                <button
                  type="button"
                  onClick={onOpenForgotPassword}
                  className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading || isLockedOut}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-11 bg-[#0d0d0d] border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isLockedOut}
              className="w-full py-3 px-4 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
