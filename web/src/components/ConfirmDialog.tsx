/**
 * A yes/no confirmation, used before anything destructive.
 * Mirrors the iOS delete alert, which always names the item being removed so
 * you can't delete the wrong thing by accident.
 */

import { useI18n } from '../i18n'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n()

  return (
    <div className="overlay" onClick={onCancel} role="presentation">
      <div
        className="dialog dialog--narrow"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">{title}</h2>
        <p className="dialog__message">{message}</p>
        <div className="dialog__buttons">
          <button type="button" className="button" onClick={onCancel}>
            {t('action.cancel')}
          </button>
          <button type="button" className="button button--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
