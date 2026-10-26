import { useLayoutEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  LoaderCircle,
  Paperclip,
  Quote,
  Send,
  Underline,
  X,
  type LucideIcon
} from 'lucide-react'
import {
  Button,
  formatAddress,
  mailErrorMessage,
  parseAddressList,
  useLanguage,
  useMail,
  usePluginTranslation,
  type MailAccount,
  type MailDraft,
  type MailMessage,
  type MailUpload
} from '@tessera/plugin-sdk'
import {
  addressList,
  escapeHtml,
  formatSize,
  longDate,
  messageBodyHtml,
  prefixedSubject,
  senderName
} from './format'
import { MailBody } from './MailBody'
import { sanitizeMailHtml } from './sanitize'
import type { ComposeMode } from './MailReader'
import styles from './MailWidget.module.css'

export interface ComposeRequest {
  mode: ComposeMode | 'new'
  message?: MailMessage
}

interface MailComposerProps {
  account: MailAccount
  request: ComposeRequest
  onClose: (sent: boolean) => void
  /** Reçoit une fonction qui dit si le mail a du contenu (avant de quitter l'écriture). */
  hasContentRef?: React.RefObject<(() => boolean) | null>
}

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

/** Champs de départ : destinataires, objet et texte cité selon le mode. */
function initialDraft(
  request: ComposeRequest,
  account: MailAccount,
  t: (key: string, values?: Record<string, unknown>) => string,
  language: string
): { to: string; cc: string; subject: string; quote: string } {
  const { mode, message } = request
  if (mode === 'new' || !message) return { to: '', cc: '', subject: '', quote: '' }
  const original = sanitizeMailHtml(messageBodyHtml(message)).body

  if (mode === 'forward') {
    const header = [
      `<p>${escapeHtml(t('composer.forwardHeader'))}<br>`,
      `${escapeHtml(t('composer.from'))} : ${escapeHtml(formatAddress(message.from))}<br>`,
      `${escapeHtml(t('composer.date'))} : ${escapeHtml(longDate(message.date, language as 'fr'))}<br>`,
      `${escapeHtml(t('composer.subject'))} : ${escapeHtml(message.subject)}<br>`,
      `${escapeHtml(t('composer.to'))} : ${escapeHtml(addressList(message.to))}</p>`
    ].join('')
    return {
      to: '',
      cc: '',
      subject: prefixedSubject(t('composer.forwardPrefix'), message.subject),
      quote: `<div>${header}${original}</div>`
    }
  }

  const target = message.replyTo[0] ?? message.from
  const others =
    mode === 'replyAll'
      ? message.to.filter(
          (item) => !same(item.address, account.address) && !same(item.address, target.address)
        )
      : []
  const cc =
    mode === 'replyAll' ? message.cc.filter((item) => !same(item.address, account.address)) : []
  const header = t('composer.quoteHeader', {
    date: longDate(message.date, language as 'fr'),
    from: senderName(message.from)
  })
  return {
    to: [target, ...others].map(formatAddress).join(', '),
    cc: cc.map(formatAddress).join(', '),
    subject: prefixedSubject(t('composer.replyPrefix'), message.subject),
    quote: `<div><p>${escapeHtml(header)}</p><blockquote>${original}</blockquote></div>`
  }
}

/** Texte brut d'un HTML (version texte du mail envoyé). */
function htmlToText(html: string, quoted: boolean): string {
  // Les fins de blocs deviennent des retours à la ligne (pas de mise en page hors écran)
  const lines = html.replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '$&\n')
  const text = (new DOMParser().parseFromString(lines, 'text/html').body.textContent ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return quoted
    ? text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    : text
}

/** Nouveau mail, réponse ou transfert. */
export function MailComposer({
  account,
  request,
  onClose,
  hasContentRef
}: MailComposerProps): React.JSX.Element {
  const t = usePluginTranslation()
  const language = useLanguage()
  const mail = useMail()
  const initial = useMemo(
    () => initialDraft(request, account, t, language),
    // Calculé une fois, à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [to, setTo] = useState(initial.to)
  const [cc, setCc] = useState(initial.cc)
  const [bcc, setBcc] = useState('')
  const [showCopies, setShowCopies] = useState(initial.cc !== '')
  const [subject, setSubject] = useState(initial.subject)
  const [uploads, setUploads] = useState<MailUpload[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: t('composer.placeholder') })
    ],
    autofocus: request.mode === 'new' ? false : 'start'
  })

  // Contenu saisi (destinataires, objet, texte, pièces jointes) : quitter demande confirmation
  useLayoutEffect(() => {
    if (!hasContentRef) return
    hasContentRef.current = () =>
      to !== initial.to ||
      cc !== initial.cc ||
      bcc !== '' ||
      subject !== initial.subject ||
      uploads.length > 0 ||
      !editor.isEmpty
    return () => {
      hasContentRef.current = null
    }
  })

  const attach = async (): Promise<void> => {
    try {
      const picked = await mail.pickUploads()
      setUploads((current) => [...current, ...picked])
    } catch (failure) {
      setError(mailErrorMessage(failure))
    }
  }

  const send = async (): Promise<void> => {
    setError(null)
    const lists = [to, cc, bcc].map(parseAddressList)
    if (lists.some((list) => list === null)) return setError(t('composer.invalidRecipients'))
    if (lists.every((list) => list!.length === 0)) return setError(t('composer.noRecipient'))
    const own = editor.isEmpty ? '' : editor.getHTML()
    const message = request.message
    const draft: MailDraft = {
      to,
      cc,
      bcc,
      subject,
      html: `${own}${initial.quote}`,
      text: [
        editor.getText().trim(),
        initial.quote && htmlToText(initial.quote, request.mode !== 'forward')
      ]
        .filter(Boolean)
        .join('\n\n'),
      attachments: uploads,
      ...(message && request.mode !== 'forward'
        ? {
            replyTo: {
              messageId: message.messageId,
              references: message.references,
              threadId: message.threadId
            }
          }
        : {}),
      ...(message && request.mode === 'forward' ? { forwardFrom: message.id } : {})
    }
    setSending(true)
    try {
      await mail.send(account.id, draft)
      onClose(true)
    } catch (failure) {
      setError(mailErrorMessage(failure))
      setSending(false)
    }
  }

  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    extra?: React.ReactNode
  ) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        className={styles.fieldInput}
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      {extra}
    </label>
  )

  return (
    <div className={styles.composer}>
      {field(
        t('composer.to'),
        to,
        setTo,
        !showCopies && (
          <button type="button" className={styles.link} onClick={() => setShowCopies(true)}>
            {t('composer.showBcc')}
          </button>
        )
      )}
      {showCopies && field(t('composer.cc'), cc, setCc)}
      {showCopies && field(t('composer.bcc'), bcc, setBcc)}
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t('composer.subject')}</span>
        <input
          className={styles.fieldInput}
          value={subject}
          maxLength={500}
          onChange={(event) => setSubject(event.target.value)}
        />
      </label>

      <Toolbar editor={editor} />
      <div className={styles.editorArea}>
        <EditorContent editor={editor} className={styles.editor} />
        {initial.quote && (
          <MailBody
            className={styles.quote}
            html={initial.quote}
            text=""
            remote={false}
            onLink={(url) => void mail.openLink(url)}
          />
        )}
      </div>

      {(uploads.length > 0 ||
        (request.mode === 'forward' && (request.message?.attachments.length ?? 0) > 0)) && (
        <div className={styles.attachments}>
          {request.mode === 'forward' && (request.message?.attachments.length ?? 0) > 0 && (
            <span className={styles.notice}>{t('composer.forwardedAttachments')}</span>
          )}
          {uploads.map((upload) => (
            <span key={upload.id} className={styles.attachment}>
              <Paperclip size={13} aria-hidden />
              <span className={styles.attachmentName}>{upload.filename}</span>
              <span className={styles.attachmentSize}>{formatSize(upload.size, language)}</span>
              <button
                type="button"
                className={styles.attachmentRemove}
                aria-label={t('composer.removeAttachment', { name: upload.filename })}
                onClick={() => setUploads((current) => current.filter((item) => item !== upload))}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.composerActions}>
        <Button icon={Paperclip} onClick={() => void attach()} disabled={sending}>
          {t('composer.attach')}
        </Button>
        <span className={styles.toolbarSpacer} />
        <Button onClick={() => onClose(false)} disabled={sending}>
          {t('composer.cancel')}
        </Button>
        <Button
          variant="primary"
          icon={sending ? undefined : Send}
          onClick={() => void send()}
          disabled={sending}
        >
          {sending && <LoaderCircle className={styles.spin} size={15} aria-hidden />}
          {sending ? t('composer.sending') : t('composer.send')}
        </Button>
      </div>
    </div>
  )
}

interface ToolbarButton {
  key: string
  icon: LucideIcon
  isActive: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const BUTTONS: ToolbarButton[] = [
  {
    key: 'bold',
    icon: Bold,
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run()
  },
  {
    key: 'italic',
    icon: Italic,
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run()
  },
  {
    key: 'underline',
    icon: Underline,
    isActive: (e) => e.isActive('underline'),
    run: (e) => e.chain().focus().toggleUnderline().run()
  },
  {
    key: 'bulletList',
    icon: List,
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run()
  },
  {
    key: 'orderedList',
    icon: ListOrdered,
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run()
  },
  {
    key: 'quote',
    icon: Quote,
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run()
  }
]

/** Mise en forme : gras, italique, souligné, listes, citation, lien. */
function Toolbar({ editor }: { editor: Editor }): React.JSX.Element {
  const t = usePluginTranslation()
  const [linking, setLinking] = useState<string | null>(null)
  const active = useEditorState({
    editor,
    selector: ({ editor: current }): Record<string, boolean> => ({
      ...Object.fromEntries(BUTTONS.map((button) => [button.key, button.isActive(current)])),
      link: current.isActive('link')
    })
  })

  const applyLink = (): void => {
    const url = (linking ?? '').trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!url) chain.unsetLink().run()
    else chain.setLink({ href: /^(https?:|mailto:)/i.test(url) ? url : `https://${url}` }).run()
    setLinking(null)
  }

  return (
    <div className={styles.formatBar} role="toolbar">
      {BUTTONS.map((button) => (
        <button
          key={button.key}
          type="button"
          className={styles.formatButton}
          aria-pressed={active[button.key]}
          title={t(`toolbar.${button.key}`)}
          aria-label={t(`toolbar.${button.key}`)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => button.run(editor)}
        >
          <button.icon size={15} aria-hidden />
        </button>
      ))}
      <button
        type="button"
        className={styles.formatButton}
        aria-pressed={active.link}
        title={t('toolbar.link')}
        aria-label={t('toolbar.link')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          setLinking(linking === null ? (editor.getAttributes('link').href ?? '') : null)
        }
      >
        <Link size={15} aria-hidden />
      </button>
      {linking !== null && (
        <input
          className={styles.linkInput}
          value={linking}
          autoFocus
          placeholder={t('toolbar.linkPrompt')}
          onChange={(event) => setLinking(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyLink()
            if (event.key === 'Escape') setLinking(null)
          }}
          onBlur={applyLink}
        />
      )}
    </div>
  )
}
