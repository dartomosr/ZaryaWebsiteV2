import './access-unavailable.css';

/** @param {{ appName: string }} props */
export function AccessUnavailablePage({ appName }) {
  return (
    <main className="access-unavailable">
      <p className="access-unavailable__label">ЗАРЯ / {appName}</p>
      <h1>Доступ пока недоступен</h1>
      <p className="access-unavailable__notice">
        Проверка серверной сессии ещё не подключена. Защищённый интерфейс не
        отображается.
      </p>
    </main>
  );
}
