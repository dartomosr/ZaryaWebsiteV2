import {
  LOAD_ERROR,
  NewsCard,
  useNewsFeed,
} from '../../../entities/news/index.js';

export default function HomePage() {
  const { items, loading, error, loadMore } = useNewsFeed(3);

  return (
    <main id="content">
      <section className="hero">
        <div className="container hero__layout">
          <div className="hero__copy">
            <p className="eyebrow">Официальный сайт игры</p>
            <h1 aria-label="ЗАРЯ: Марш Революции">
              <span className="hero__title">ЗАРЯ</span>
              <span className="hero__subtitle">Марш Революции</span>
            </h1>
            <p className="lead">
              Новости проекта и материалы об игре в одном месте.
            </p>
            <a
              className="button"
              href="/news"
            >
              Читать новости <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div
            className="hero-map"
            aria-hidden="true"
          >
            <div className="hero-map__orbit" />
            <div className="hero-map__orbit hero-map__orbit--inner" />
            <span className="hero-map__mark">З</span>
            <span className="hero-map__cross hero-map__cross--one">+</span>
            <span className="hero-map__cross hero-map__cross--two">+</span>
            <span className="hero-map__caption">ЗАРЯ / МАРШ РЕВОЛЮЦИИ</span>
          </div>
        </div>
      </section>

      <section
        className="container home-section"
        aria-labelledby="about-title"
      >
        <p className="eyebrow">О проекте</p>
        <div className="section-heading">
          <h2 id="about-title">ЗАРЯ: Марш Революции</h2>
          <p>
            Сайт находится в разработке. Следить за публикациями проекта можно в
            разделе новостей.
          </p>
        </div>
      </section>

      <section
        className="container home-section"
        aria-labelledby="latest-title"
        aria-busy={loading}
      >
        <div className="section-heading section-heading--news">
          <div>
            <p className="eyebrow">Журнал проекта</p>
            <h2 id="latest-title">Последние новости</h2>
          </div>
          <a
            className="text-link"
            href="/news"
          >
            Все новости <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="news-grid news-grid--preview">
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
              onClick={loadMore}
            >
              Повторить попытку
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
