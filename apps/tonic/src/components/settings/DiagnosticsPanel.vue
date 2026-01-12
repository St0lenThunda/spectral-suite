<script setup lang="ts">
/**
 * DiagnosticsPanel.vue
 * Audio Health Dashboard for the global Settings view.
 *
 * Shows live input level, status indicators for common issues,
 * and quick-fix buttons to resolve problems.
 */
import { useInputDiagnostics } from '@spectralsuite/core';

const {
  isMicGranted,
  isContextRunning,
  isVolumeDetected,
  isGateTooHigh,
  isProModeActive,
  inputLevel,
  activeIssues,
  overallHealth,
  applyQuickFix,
} = useInputDiagnostics();

/**
 * Helper to get health indicator color class.
 */
const healthColor = {
  good: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
};

const healthLabel = {
  good: 'All Systems Normal',
  warning: 'Potential Issues',
  error: 'Critical Issues',
};
</script>

<template>
  <div class="w-full space-y-8">

    <!-- Overall Health Banner -->
    <div
      class="p-6 rounded-2xl border flex items-center gap-4"
      :class="{
        'bg-emerald-500/10 border-emerald-500/30': overallHealth === 'good',
        'bg-amber-500/10 border-amber-500/30': overallHealth === 'warning',
        'bg-rose-500/10 border-rose-500/30': overallHealth === 'error',
      }"
    >
      <div
        class="w-4 h-4 rounded-full animate-pulse"
        :class="healthColor[overallHealth]"
      ></div>
      <div>
        <h3
          class="text-sm font-black uppercase tracking-widest"
          :class="{
            'text-emerald-400': overallHealth === 'good',
            'text-amber-400': overallHealth === 'warning',
            'text-rose-400': overallHealth === 'error',
          }"
        >{{ healthLabel[overallHealth] }}</h3>
        <p class="text-xs text-slate-500 mt-0.5">
          {{ activeIssues.length === 0 ? 'Audio input is working correctly.' : `${activeIssues.length} issue(s) detected.` }}
        </p>
      </div>
    </div>

    <!-- Live Input Level Meter -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label class="text-xs font-bold uppercase tracking-widest text-slate-500">Input Level</label>
        <span class="text-xs font-mono text-sky-400">{{ inputLevel }}%</span>
      </div>
      <div class="h-3 bg-slate-900 rounded-full overflow-hidden border border-white/5">
        <div
          class="h-full transition-all duration-100"
          :class="{
            'bg-gradient-to-r from-emerald-500 to-sky-500': inputLevel > 20,
            'bg-amber-500': inputLevel > 5 && inputLevel <= 20,
            'bg-rose-500': inputLevel <= 5,
          }"
          :style="{ width: inputLevel + '%' }"
        ></div>
      </div>
      <p class="text-[10px] text-slate-500 mt-1">Live microphone input volume.</p>
    </div>

    <!-- Status Checks -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <!-- Mic Permission -->
      <div class="p-4 rounded-xl bg-white/5 border border-white/5">
        <div class="flex items-center gap-2 mb-1">
          <div
            class="w-2 h-2 rounded-full"
            :class="isMicGranted ? 'bg-emerald-500' : 'bg-rose-500'"
          ></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Mic Access</span>
        </div>
        <p class="text-xs text-white font-bold">{{ isMicGranted ? 'Granted' : 'Denied' }}</p>
      </div>

      <!-- Context State -->
      <div class="p-4 rounded-xl bg-white/5 border border-white/5">
        <div class="flex items-center gap-2 mb-1">
          <div
            class="w-2 h-2 rounded-full"
            :class="isContextRunning ? 'bg-emerald-500' : 'bg-amber-500'"
          ></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Engine</span>
        </div>
        <p class="text-xs text-white font-bold">{{ isContextRunning ? 'Running' : 'Suspended' }}</p>
      </div>

      <!-- Volume Detection -->
      <div class="p-4 rounded-xl bg-white/5 border border-white/5">
        <div class="flex items-center gap-2 mb-1">
          <div
            class="w-2 h-2 rounded-full"
            :class="isVolumeDetected ? 'bg-emerald-500' : 'bg-rose-500'"
          ></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Signal</span>
        </div>
        <p class="text-xs text-white font-bold">{{ isVolumeDetected ? 'Detected' : 'None' }}</p>
      </div>

      <!-- Gate Status -->
      <div class="p-4 rounded-xl bg-white/5 border border-white/5">
        <div class="flex items-center gap-2 mb-1">
          <div
            class="w-2 h-2 rounded-full"
            :class="!isGateTooHigh ? 'bg-emerald-500' : 'bg-amber-500'"
          ></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Gate</span>
        </div>
        <p class="text-xs text-white font-bold">{{ isGateTooHigh ? 'Blocking' : 'Open' }}</p>
      </div>

      <!-- Pro Mode -->
      <div class="p-4 rounded-xl bg-white/5 border border-white/5">
        <div class="flex items-center gap-2 mb-1">
          <div
            class="w-2 h-2 rounded-full"
            :class="isProModeActive ? 'bg-amber-500' : 'bg-slate-600'"
          ></div>
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Pro Mode</span>
        </div>
        <p class="text-xs text-white font-bold">{{ isProModeActive ? 'Enabled' : 'Disabled' }}</p>
      </div>
    </div>

    <!-- Active Issues (Always Visible) -->
    <div class="space-y-3">
      <h4
        class="text-xs font-black uppercase tracking-widest"
        :class="activeIssues.length > 0 ? 'text-rose-400' : 'text-slate-500'"
      >Active Issues</h4>

      <!-- No Issues State -->
      <div
        v-if=" activeIssues.length === 0 "
        class="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex items-center gap-3"
      >
        <div class="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓
        </div>
        <p class="text-sm text-emerald-400 font-medium">No active issues detected.</p>
      </div>

      <!-- Issue List -->
      <div
        v-for="issue in activeIssues"
        :key="issue.id"
        class="p-4 rounded-xl border flex items-start justify-between gap-4"
        :class="{
          'bg-rose-500/10 border-rose-500/30': issue.severity === 'error',
          'bg-amber-500/10 border-amber-500/30': issue.severity === 'warning',
        }"
      >
        <div>
          <p
            class="text-sm font-bold"
            :class="issue.severity === 'error' ? 'text-rose-400' : 'text-amber-400'"
          >{{ issue.message }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ issue.action }}</p>
        </div>
        <button
          v-if="issue.quickFix"
          @click="applyQuickFix(issue.quickFix)"
          class="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          :class="{
            'bg-rose-500 hover:bg-rose-400 text-white': issue.severity === 'error',
            'bg-amber-500 hover:bg-amber-400 text-black': issue.severity === 'warning',
          }"
        >
          Fix
        </button>
      </div>
    </div>

  </div>
</template>
