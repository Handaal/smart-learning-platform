import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken:   string | null;
  refreshToken:  string | null;
  learnerId:     string | null;
  participantId: string | null;
  cohort:        'experimental' | 'control' | null;
  role:          'learner' | 'research_admin' | null;
  isActive:      boolean | null;
  groupLabel:    string | null;
  groupEmotionTrackingEnabled: boolean | null;
  emotionTrackingOverride: boolean | null;
  emotionTrackingEnabled: boolean | null;
  isVerified:    boolean;

  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser:   (user: Partial<AuthState>) => void;
  verifyAdmin: () => void;
  logout:    () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken:   null,
      refreshToken:  null,
      learnerId:     null,
      participantId: null,
      cohort:        null,
      role:          null,
      isActive:      null,
      groupLabel:    null,
      groupEmotionTrackingEnabled: null,
      emotionTrackingOverride: null,
      emotionTrackingEnabled: null,
      isVerified:    false,

      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set(user),

      verifyAdmin: () => set({ isVerified: true }),

      logout: () =>
        set({
          accessToken: null, refreshToken: null,
          learnerId: null, participantId: null,
          cohort: null, role: null,
          isActive: null,
          groupLabel: null,
          groupEmotionTrackingEnabled: null,
          emotionTrackingOverride: null,
          emotionTrackingEnabled: null,
          isVerified: false,
        }),
    }),
    {
      name:    'step-auth',
      partialize: (state) => ({
        accessToken:   state.accessToken,
        refreshToken:  state.refreshToken,
        learnerId:     state.learnerId,
        participantId: state.participantId,
        cohort:        state.cohort,
        role:          state.role,
        isActive:      state.isActive,
        groupLabel:    state.groupLabel,
        groupEmotionTrackingEnabled: state.groupEmotionTrackingEnabled,
        emotionTrackingOverride: state.emotionTrackingOverride,
        emotionTrackingEnabled: state.emotionTrackingEnabled,
        isVerified:    state.isVerified,
      }),
    }
  )
);
