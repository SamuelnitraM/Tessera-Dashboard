import { useState } from 'react'
import { ConfirmDialog, usePluginTranslation } from '@tessera/plugin-sdk'

interface Question {
  title: string
  message: string
  confirm: string
  danger: boolean
  run: () => void
}

/** Confirmation avant une action irréversible : `ask(...)`, et `dialog` à afficher. */
export function useConfirm(): {
  dialog: React.JSX.Element
  ask: (question: Omit<Question, 'danger'> & { danger?: boolean }) => void
} {
  const t = usePluginTranslation()
  const [question, setQuestion] = useState<Question | null>(null)
  return {
    ask: (next) => setQuestion({ danger: true, ...next }),
    dialog: (
      <ConfirmDialog
        open={question !== null}
        title={question?.title ?? ''}
        message={question?.message ?? ''}
        onClose={() => setQuestion(null)}
        actions={[
          { label: t('cancel'), onClick: () => setQuestion(null) },
          {
            label: question?.confirm ?? '',
            variant: question?.danger ? 'danger' : 'primary',
            onClick: () => {
              question?.run()
              setQuestion(null)
            }
          }
        ]}
      />
    )
  }
}
