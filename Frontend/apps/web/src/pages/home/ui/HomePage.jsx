import { Link } from 'react-router';
import {
  LOAD_ERROR,
  NewsCard,
  useLatestNews,
} from '../../../entities/news/index.js';
import heroArt from '../assets/zarya-hero-flag.png';
import WorldMachineTerminal from './WorldMachineTerminal.jsx';
import './home-page.css';

export default function HomePage() {
  const { items, loading, error, retry } = useLatestNews();

  return (
    <main
      id="content"
      className="home-page"
      tabIndex={-1}
    >
      <div className="home-hero">
        <img
          className="home-hero__art"
          src={heroArt}
          width="1024"
          height="572"
          alt=""
          fetchPriority="high"
        />
        <div className="container">
          <h1
            className="home-hero__heading"
            aria-label="ЗАРЯ: Марш Революции"
          >
            <span className="home-hero__title">ЗАРЯ</span>
            <span className="home-hero__subtitle">Марш Революции</span>
          </h1>
          <p className="home-hero__description">
            Пошаговая сюжетная стратегия в альтернативном мире. Возьмите на себя
            роль лидера отряда и проведите его через сложные события революции
          </p>
        </div>
      </div>

      <WorldMachineTerminal />

      <section
        className="container home-news"
        aria-labelledby="latest-title"
        aria-busy={loading}
      >
        <div className="home-news__heading">
          <h2 id="latest-title">Последние новости</h2>
          <Link
            className="home-news__link"
            to="/news"
          >
            Все новости
          </Link>
        </div>
        <div className="news-grid">
          {items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
            />
          ))}
        </div>
        {loading && (
          <p
            className="state-message"
            role="status"
          >
            Загрузка новостей…
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="state-message">Опубликованных новостей пока нет.</p>
        )}
        {error && (
          <div className="state-message state-message--error">
            <p role="alert">{LOAD_ERROR}</p>
            <button
              className="button button--outline"
              onClick={retry}
            >
              Повторить попытку
            </button>
          </div>
        )}
      </section>

      <section
        className="home-about"
        aria-labelledby="about-title"
      >
        <div className="container home-about__inner">
          <div>
            <h2 id="about-title">О проекте</h2>
            <p>
              Это официальный сайт игры «ЗАРЯ: Марш Революции». Сайт находится в
              разработке. Следить за публикациями проекта можно в разделе
              новостей.
            </p>
          </div>
          <Link
            className="button zarya-button"
            to="/news"
          >
            Читать новости
          </Link>
        </div>
      </section>
    </main>
  );
}
