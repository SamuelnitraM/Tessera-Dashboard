import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import styles from './WidgetFrame.module.css'

interface WidgetErrorBoundaryProps {
  children: ReactNode
}

interface WidgetErrorBoundaryState {
  error: Error | null
}

/**
 * Isole les erreurs d'un widget : s'il plante, seul son cadre affiche un message,
 * le reste de l'app continue de fonctionner. (React impose une classe pour ce mécanisme.)
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[widget] Erreur dans un widget :', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <WidgetError
          message={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }): ReactNode {
  const { t } = useTranslation()
  return (
    <div className={styles.placeholder} role="alert">
      <TriangleAlert size={20} aria-hidden />
      <span>{t('widgets.error')}</span>
      <span className={styles.errorDetail}>{message}</span>
      <Button variant="ghost" className="no-drag" onClick={onRetry}>
        {t('widgets.retry')}
      </Button>
    </div>
  )
}
