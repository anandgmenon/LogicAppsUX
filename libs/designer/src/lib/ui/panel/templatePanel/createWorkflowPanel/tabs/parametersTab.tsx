import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayParameters } from '../../../../templates/parameters/displayParameters';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';

export const ParametersPanel: React.FC = () => {
  return <DisplayParameters />;
};

export const parametersTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isCreating, disabled, shouldClearDetails, previousTabId, hasError, onClosePanel, showCloseButton = true }: CreateWorkflowTabProps
): TemplateTabProps => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS,
  disabled,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'xi2tn6',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'You can edit parameters here or in designer.',
    id: 'oxCSqB',
    description: 'An accessibility label that describes the objective of parameters tab',
  }),
  tabStatusIcon: hasError ? 'error' : undefined,
  content: <ParametersPanel />,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Next',
          id: '0UfxUM',
          description: 'Button text for moving to the next tab in the create workflow panel',
        }),
        appearance: 'primary',
        onClick: () => {
          dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE));
        },
      },
      {
        type: 'navigation',
        text: previousTabId
          ? intl.formatMessage({
              defaultMessage: 'Previous',
              id: 'Yua/4o',
              description: 'Button text for moving to the previous tab in the create workflow panel',
            })
          : intl.formatMessage({
              defaultMessage: 'Close',
              id: 'FTrMxN',
              description: 'Button text for closing the panel',
            }),
        onClick: () => {
          if (previousTabId) {
            dispatch(selectPanelTab(previousTabId));
          } else {
            dispatch(closePanel());

            if (shouldClearDetails) {
              dispatch(clearTemplateDetails());
            }

            onClosePanel?.();
          }
        },
        disabled: (!previousTabId && !showCloseButton) || isCreating,
      },
    ],
  },
});
