import { AccessUnavailablePage } from '@zarya/ui';

// Не подключать защищённые экраны до готовности API сессии.
export default function App() {
  return <AccessUnavailablePage appName="CMS" />;
}
