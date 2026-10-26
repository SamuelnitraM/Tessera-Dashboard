import { useTranslation } from 'react-i18next'
import { addProposedBlock, useBlockProposalStore } from '../../stores/notifications'
import { ConfirmDialog } from '../ui/ConfirmDialog'

/**
 * Clic sur une notification dont la source n'a de bloc sur aucune page : propose d'en ajouter
 * un sur la page affichée (ou d'ouvrir l'application dans un onglet).
 */
export function BlockProposalDialog(): React.JSX.Element {
  const { t } = useTranslation()
  const proposal = useBlockProposalStore((state) => state.proposal)
  const close = (): void => useBlockProposalStore.setState({ proposal: null })
  const name = proposal?.name ?? ''

  return (
    <ConfirmDialog
      open={proposal !== null}
      title={t('notifications.proposal.title', { name })}
      message={t('notifications.proposal.message', { name })}
      onClose={close}
      actions={[
        { label: t('notifications.proposal.cancel'), onClick: close },
        ...(proposal?.openTab
          ? [
              {
                label: t('notifications.proposal.openTab'),
                onClick: () => {
                  close()
                  proposal.openTab?.()
                }
              }
            ]
          : []),
        {
          label: t('notifications.proposal.add'),
          variant: 'primary' as const,
          onClick: () => proposal && addProposedBlock(proposal)
        }
      ]}
    />
  )
}
