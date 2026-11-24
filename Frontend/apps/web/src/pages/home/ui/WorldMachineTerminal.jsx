import { useRef } from 'react';
import './world-machine-terminal.css';

export default function WorldMachineTerminal() {
  const dialogRef = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));

  return (
    <>
      <button
        ref={triggerRef}
        className="world-machine-terminal"
        type="button"
        aria-haspopup="dialog"
        aria-labelledby="world-machine-action"
        aria-describedby="world-machine-description"
        onClick={() => dialogRef.current?.showModal()}
      >
        <span
          className="world-machine-terminal__engraving"
          aria-hidden="true"
        >
          ЗАРЯ
        </span>
        <span className="world-machine-terminal__screen">
          <span className="world-machine-terminal__readout">
            <span
              id="world-machine-description"
              className="world-machine-terminal__description"
            >
              Сеттинг, стороны конфликта и устройство мира
            </span>
            <span
              className="world-machine-terminal__status"
              aria-hidden="true"
            >
              <span className="world-machine-terminal__status-idle">
                &gt; СТАТУС: ОЖИДАНИЕ_
              </span>
              <span className="world-machine-terminal__status-ready">
                &gt; СТАТУС: ДОСТУП ОТКРЫТ_
              </span>
            </span>
          </span>
          <span
            id="world-machine-action"
            className="world-machine-terminal__action"
          >
            Открыть терминал
            <span
              className="world-machine-terminal__arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="world-machine-dialog"
        aria-labelledby="world-machine-title"
        onClose={() => triggerRef.current?.focus({ preventScroll: true })}
      >
        <div className="world-machine-dialog__inner">
          <header className="world-machine-dialog__header">
            <h2 id="world-machine-title">Мировая Машина</h2>
            <form method="dialog">
              <button className="button button--outline">Закрыть</button>
            </form>
          </header>
          <section
            className="world-machine-dialog__content"
            aria-labelledby="world-machine-game-title"
          >
            <h3 id="world-machine-game-title">ЗАРЯ: Марш Революции</h3>
            <p>Здесь появится подробное описание игры.</p>
          </section>
        </div>
      </dialog>
    </>
  );
}
