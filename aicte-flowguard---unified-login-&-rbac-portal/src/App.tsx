/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { UserProfile, UserRole } from './types/auth.ts';
import { Header } from './components/Header.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { ForgotPasswordModal } from './components/ForgotPasswordModal.tsx';
import { WorkspaceSelectorModal } from './components/WorkspaceSelectorModal.tsx';
import { RbacProbeModal } from './components/RbacProbeModal.tsx';
import { DashboardShell } from './components/dashboards/DashboardShell.tsx';

// Role Dashboards
import { InstitutionPortal } from './components/dashboards/InstitutionPortal.tsx';
import { ScrutinyDashboard } from './components/dashboards/ScrutinyDashboard.tsx';
import { RegionalDashboard } from './components/dashboards/RegionalDashboard.tsx';
import { EvcWorkspace } from './components/dashboards/EvcWorkspaces.tsx';
import { QuasiJudicialWorkspace } from './components/dashboards/QuasiJudicialWorkspaces.tsx';
import { AuthorityDashboard } from './components/dashboards/AuthorityDashboard.tsx';
import { ComplianceDashboard } from './components/dashboards/ComplianceDashboard.tsx';
import { BureauDashboard } from './components/dashboards/BureauDashboard.tsx';
import { AdminDashboard } from './components/dashboards/AdminDashboard.tsx';
import { AuditGovernanceDashboard } from './components/dashboards/AuditGovernanceDashboard.tsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);

  // Modals
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isWorkspaceSelectorOpen, setIsWorkspaceSelectorOpen] = useState(false);
  const [isRbacProbeOpen, setIsRbacProbeOpen] = useState(false);

  // Autofill support
  const [loginIdPrefill, setLoginIdPrefill] = useState('');
  const [passwordPrefill, setPasswordPrefill] = useState('');

  // 1. Initial Session Check on Mount
  useEffect(() => {
    const checkCurrentSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch {
        // Not signed in
      } finally {
        setIsInitializing(false);
      }
    };
    checkCurrentSession();
  }, []);

  // 2. Login Handler
  const handleLogin = async (loginId: string, password: string, rememberMe: boolean) => {
    setIsLoginLoading(true);
    setLoginError(null);
    setIsLockedOut(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password, rememberMe }),
      });

      const data = await res.json();

      if (res.status === 429 || data.isLockedOut) {
        setIsLockedOut(true);
        setLockoutMinutes(data.remainingMinutes || 15);
        setLoginError(data.message || 'Account temporarily locked due to multiple failed attempts.');
        return;
      }

      if (!res.ok || !data.success) {
        setLoginError(data.message || 'Invalid User ID or Password. Please check your credentials.');
        return;
      }

      // Successful login
      const user = data.session.user as UserProfile;
      setCurrentUser(user);

      if (data.requiresWorkspaceSelection) {
        setIsWorkspaceSelectorOpen(true);
      }
    } catch {
      setLoginError('Unable to connect to AICTE FlowGuard authentication service.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  // 3. Logout Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      //
    } finally {
      setCurrentUser(null);
      setIsWorkspaceSelectorOpen(false);
      setLoginError(null);
    }
  };

  // 4. Role / Workspace Switcher
  const handleSelectRole = async (newRole: UserRole) => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Role change denied by server.');
        return;
      }

      setCurrentUser((prev) => (prev ? { ...prev, activeRole: newRole } : null));
      setIsWorkspaceSelectorOpen(false);
    } catch {
      alert('Failed to switch workspace.');
    }
  };


  if (isInitializing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <div className="text-xs text-neutral-400 font-mono">
            Loading AICTE FlowGuard...
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate role-specific dashboard when authenticated
  const renderActiveDashboard = () => {
    if (!currentUser) return null;
    const activeRole = currentUser.activeRole || currentUser.roles[0];

    switch (activeRole) {
      case 'INSTITUTION_APPLICANT':
        return <InstitutionPortal user={currentUser} />;
      case 'SCRUTINY_OFFICIAL':
        return <ScrutinyDashboard user={currentUser} />;
      case 'REGIONAL_OFFICER':
        return <RegionalDashboard user={currentUser} />;
      case 'EVC_COORDINATOR':
      case 'EVC_MEMBER':
        return <EvcWorkspace user={currentUser} />;
      case 'SHC_MEMBER':
      case 'SAC_MEMBER':
        return <QuasiJudicialWorkspace user={currentUser} />;
      case 'COMPETENT_AUTHORITY':
        return <AuthorityDashboard user={currentUser} />;
      case 'COMPLIANCE_OFFICIAL':
        return <ComplianceDashboard user={currentUser} />;
      case 'BUREAU_OFFICER':
        return <BureauDashboard user={currentUser} />;
      case 'SYSTEM_ADMIN':
        return <AdminDashboard user={currentUser} />;
      case 'RULES_AUDIT_OFFICER':
        return <AuditGovernanceDashboard user={currentUser} />;
      default:
        return (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
            <h3 className="text-base font-bold text-slate-900">Workspace Unavailable</h3>
            <p className="text-xs text-slate-600">
              No UI module registered for role '{activeRole}'. Contact AICTE IT Administration.
            </p>
          </div>
        );
    }
  };

  // If not authenticated, render pure neat and professional dark login page without extra components
  if (!currentUser) {
    return (
      <>
        <LoginPage
          onLogin={handleLogin}
          isLoading={isLoginLoading}
          errorMessage={loginError}
          isLockedOut={isLockedOut}
          remainingMinutes={lockoutMinutes}
          initialLoginId={loginIdPrefill}
          initialPassword={passwordPrefill}
          onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
        />

        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />
      </>
    );
  }

  // If authenticated as INSTITUTION_APPLICANT, render direct integrated portal matching the requested layout
  const activeRole = currentUser.activeRole || currentUser.roles[0];
  if (activeRole === 'INSTITUTION_APPLICANT') {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
        <InstitutionPortal
          user={currentUser}
          onLogout={handleLogout}
          onOpenWorkspaceSelector={() => setIsWorkspaceSelectorOpen(true)}
          onOpenRbacProbe={() => setIsRbacProbeOpen(true)}
        />

        <WorkspaceSelectorModal
          user={currentUser}
          isOpen={isWorkspaceSelectorOpen}
          onClose={() => setIsWorkspaceSelectorOpen(false)}
          onSelectRole={handleSelectRole}
        />

        <RbacProbeModal
          user={currentUser}
          isOpen={isRbacProbeOpen}
          onClose={() => setIsRbacProbeOpen(false)}
        />
      </div>
    );
  }

  // Other official administrative roles render with clean official Header and Dashboard Shell
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header
        user={currentUser}
        onLogout={handleLogout}
        onOpenWorkspaceSelector={() => setIsWorkspaceSelectorOpen(true)}
        onOpenRbacProbe={() => setIsRbacProbeOpen(true)}
      />

      <DashboardShell
        user={currentUser}
        onLogout={handleLogout}
        onOpenWorkspaceSelector={() => setIsWorkspaceSelectorOpen(true)}
        onOpenRbacProbe={() => setIsRbacProbeOpen(true)}
      >
        {renderActiveDashboard()}
      </DashboardShell>

      <WorkspaceSelectorModal
        user={currentUser}
        isOpen={isWorkspaceSelectorOpen}
        onClose={() => setIsWorkspaceSelectorOpen(false)}
        onSelectRole={handleSelectRole}
      />

      <RbacProbeModal
        user={currentUser}
        isOpen={isRbacProbeOpen}
        onClose={() => setIsRbacProbeOpen(false)}
      />
    </div>
  );
}
