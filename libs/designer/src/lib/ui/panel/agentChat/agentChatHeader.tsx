import { Button, Subtitle2 } from '@fluentui/react-components';
import {
  ArrowClockwise16Filled,
  ArrowClockwise16Regular,
  bundleIcon,
  ChevronDoubleRight16Filled,
  ChevronDoubleRight16Regular,
  Stop16Filled,
  Stop16Regular,
} from '@fluentui/react-icons';
import { useIsDarkMode } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

interface AgentChatHeaderProps {
  title: string;
  showStopButton?: boolean;
  onToggleCollapse: () => void;
  onRefreshChat: () => void;
  onStopChat: () => void;
}

// Agent chat icons
const StopIcon = bundleIcon(Stop16Filled, Stop16Regular);
const RefreshIcon = bundleIcon(ArrowClockwise16Filled, ArrowClockwise16Regular);
const CollapseIcon = bundleIcon(ChevronDoubleRight16Filled, ChevronDoubleRight16Regular);

export const AgentChatHeader = ({ title, onToggleCollapse, onRefreshChat, onStopChat, showStopButton }: AgentChatHeaderProps) => {
  const intl = useIntl();
  const isDarkMode = useIsDarkMode();

  const intlText = useMemo(
    () => ({
      COLLAPSE_BUTTON_ARIA_LABEL: intl.formatMessage({
        defaultMessage: 'Collapse',
        id: '0RcjSp',
        description: 'Aria label for collapse button',
      }),
      COLLAPSE_BUTTON_TITLE: intl.formatMessage({
        defaultMessage: 'Collapse chat panel',
        id: 'AlWFOS',
        description: 'Collapse button title',
      }),
      REFRESH_BUTTON_ARIA_LABEL: intl.formatMessage({
        defaultMessage: 'Refresh',
        id: 'ddnfTx',
        description: 'Aria label for refresh button',
      }),
      REFRESH_BUTTON_TITLE: intl.formatMessage({
        defaultMessage: 'Refresh chat',
        id: 'oyW9J4',
        description: 'Refresh button title',
      }),
      STOP_BUTTON_ARIA_LABEL: intl.formatMessage({
        defaultMessage: 'Stop',
        id: 'BIG5Dz',
        description: 'Aria label for stop button',
      }),
      STOP_BUTTON_TITLE: intl.formatMessage({
        defaultMessage: 'Stop chat',
        id: 'KwYMAL',
        description: 'Refresh button title',
      }),
    }),
    [intl]
  );

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`,
      }}
    >
      <Subtitle2 style={{ marginLeft: '10px' }}>{title}</Subtitle2>
      <div className="msla-agent-chat-header-buttons">
        {showStopButton && (
          <Button
            id="msla-agent-chat-header-stop"
            appearance="subtle"
            icon={<StopIcon />}
            aria-label={intlText.STOP_BUTTON_ARIA_LABEL}
            onClick={onStopChat}
            data-automation-id="msla-agent-chat-header-stop"
            title={intlText.STOP_BUTTON_TITLE}
          />
        )}
        <Button
          id="msla-agent-chat-header-refresh"
          appearance="subtle"
          icon={<RefreshIcon />}
          aria-label={intlText.REFRESH_BUTTON_ARIA_LABEL}
          onClick={onRefreshChat}
          data-automation-id="msla-agent-chat-header-refresh"
          title={intlText.REFRESH_BUTTON_TITLE}
        />
        <Button
          id="msla-agent-chat-header-collapse"
          appearance="subtle"
          icon={<CollapseIcon />}
          aria-label={intlText.COLLAPSE_BUTTON_ARIA_LABEL}
          onClick={onToggleCollapse}
          data-automation-id="msla-agent-chat-header-collapse"
          title={intlText.COLLAPSE_BUTTON_TITLE}
        />
      </div>
    </div>
  );
};
