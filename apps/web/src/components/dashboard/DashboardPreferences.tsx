import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Moon, Sun } from 'lucide-react';
import styled from 'styled-components';
import { api } from '../../services/api';

interface Preferences {
  notifications: boolean;
  theme: 'light' | 'dark';
  language: 'es' | 'en';
}

interface DashboardPreferencesProps {
  studentId: string;
  preferences: Preferences;
}

export function DashboardPreferences({
  studentId,
  preferences,
}: DashboardPreferencesProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newPreferences: Partial<Preferences>) =>
      api.updatePreferences(studentId, newPreferences),

    onMutate: async (newPreferences) => {
      await queryClient.cancelQueries({
        queryKey: ['dashboard', studentId],
      });

      const previousDashboard = queryClient.getQueryData<any>([
        'dashboard',
        studentId,
      ]);

      queryClient.setQueryData(['dashboard', studentId], (prev: any) => {
        if (!prev) return prev;

        return {
          ...prev,
          student: {
            ...prev.student,
            preferences: {
              ...prev.student.preferences,
              ...newPreferences,
            },
          },
        };
      });

      return { previousDashboard };
    },

    onError: (_error, _vars, context) => {
      if (context?.previousDashboard) {
        queryClient.setQueryData(
          ['dashboard', studentId],
          context.previousDashboard,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard', studentId],
      });
    },
  });

  const { mutate, isPending } = mutation;

  const toggleNotifications = () => {
    if (isPending) return;
    mutate({
      notifications: !preferences.notifications,
    });
  };

  const toggleTheme = () => {
    if (isPending) return;
    mutate({
      theme: preferences.theme === 'dark' ? 'light' : 'dark',
    });
  };

  const toggleLanguage = () => {
    if (isPending) return;
    mutate({
      language: preferences.language === 'es' ? 'en' : 'es',
    });
  };

  return (
    <Wrapper>
      <IconButton
        onClick={toggleNotifications}
        aria-label='Toggle notifications'
        disabled={isPending}
        $disabled={isPending}
      >
        {preferences.notifications ? <Bell /> : <BellOff />}
      </IconButton>

      <IconButton
        onClick={toggleTheme}
        aria-label='Toggle theme'
        disabled={isPending}
        $disabled={isPending}
      >
        {preferences.theme === 'dark' ? <Moon /> : <Sun />}
      </IconButton>

      <IconButton
        onClick={toggleLanguage}
        aria-label='Change language'
        disabled={isPending}
        $disabled={isPending}
      >
        <LangText>{preferences.language.toUpperCase()}</LangText>
      </IconButton>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  display: flex;
  gap: var(--spacing-sm);
`;

const IconButton = styled.button<{ $disabled?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: ${({ $disabled }) =>
      $disabled ? 'var(--color-surface)' : 'var(--color-background)'};
    color: ${({ $disabled }) =>
      $disabled ? 'var(--color-text-secondary)' : 'var(--color-primary)'};
  }

  &:active {
    transform: ${({ $disabled }) => ($disabled ? 'none' : 'scale(0.95)')};
  }
`;

const LangText = styled.span`
  font-size: 10px;
  margin-left: 2px;
  font-weight: 600;
`;
