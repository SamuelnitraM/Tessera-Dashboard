import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAIN_PAGE_ID } from '@shared/dashboard'
import { usePageName } from '../hooks/usePageName'
import { useDashboardStore } from '../stores/dashboard'
import { useNavigationStore } from '../stores/navigation'
import { usePageDialogsStore } from '../stores/pageDialogs'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Dialog } from './ui/Dialog'
import styles from './ui/Dialog.module.css'

/** Renommer ou supprimer une page (depuis le clic droit ou le ✕ du menu latéral). */
export function PageDialogs(): React.JSX.Element | null {
  const dialog = usePageDialogsStore((state) => state.dialog)
  const page = useDashboardStore((state) =>
    state.dashboard.pages.find((candidate) => candidate.id === dialog?.pageId)
  )
  if (!dialog || !page) return null
  return dialog.kind === 'rename' ? (
    <RenameDialog key={page.id} pageId={page.id} name={page.name} />
  ) : (
    <DeleteDialog pageId={page.id} />
  )
}

function RenameDialog({ pageId, name }: { pageId: string; name: string }): React.JSX.Element {
  const { t } = useTranslation()
  const close = usePageDialogsStore((state) => state.close)
  const renamePage = useDashboardStore((state) => state.renamePage)
  const page = useDashboardStore((state) => state.dashboard.pages.find((p) => p.id === pageId)!)
  const placeholder = usePageName(page)
  const [value, setValue] = useState(name)

  const submit = (event: React.FormEvent): void => {
    event.preventDefault()
    renamePage(pageId, value.trim())
    close()
  }

  return (
    <Dialog title={t('nav.renamePage')} open onClose={close}>
      <form onSubmit={submit}>
        <input
          className={styles.input}
          value={value}
          placeholder={placeholder}
          maxLength={60}
          aria-label={t('pages.name')}
          autoFocus
          onChange={(event) => setValue(event.target.value)}
        />
        <div className={styles.actions}>
          <Button onClick={close}>{t('nav.cancel')}</Button>
          <Button type="submit" variant="primary">
            {t('nav.rename')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function DeleteDialog({ pageId }: { pageId: string }): React.JSX.Element {
  const { t } = useTranslation()
  const close = usePageDialogsStore((state) => state.close)
  const deletePage = useDashboardStore((state) => state.deletePage)
  const page = useDashboardStore((state) => state.dashboard.pages.find((p) => p.id === pageId)!)
  const name = usePageName(page)
  const view = useNavigationStore((state) => state.view)
  const navigate = useNavigationStore((state) => state.navigate)

  return (
    <ConfirmDialog
      open
      title={t('nav.deletePageTitle', { name })}
      message={t('nav.deletePageMessage')}
      onClose={close}
      actions={[
        { label: t('nav.cancel'), onClick: close },
        {
          label: t('pages.delete'),
          variant: 'danger',
          onClick: () => {
            deletePage(pageId)
            // La page affichée disparaît : retour à l'accueil
            if (view.type === 'page' && view.pageId === pageId) {
              navigate({ type: 'page', pageId: MAIN_PAGE_ID })
            }
            close()
          }
        }
      ]}
    />
  )
}
